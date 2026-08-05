-- ============================================================
-- KlugRads — Migration 004: sessão única por dispositivo
--
-- Regra de produto: a conta pode ser usada em um aparelho por vez.
-- Trocar de aparelho é livre e instantâneo — o que não se pode é usar
-- dois ao mesmo tempo. Isso é o que impede uma assinatura de virar
-- assinatura coletiva.
--
-- O "ping-pong" (A derruba B, B derruba A) é COMPORTAMENTO DESEJADO,
-- não bug: para uma pessoa migrando de aparelho é imperceptível, e
-- para duas pessoas dividindo conta torna o uso simultâneo inviável —
-- exatamente o efeito que se quer.
--
-- A garantia é do banco, não do app: índice único parcial. Cliente é
-- sugestão; quem impede duas sessões ativas é o Postgres.
-- ============================================================

create table if not exists public.sessoes_dispositivo (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references public.perfis(id) on delete cascade,
  device_id        text not null,
  device_info      jsonb not null default '{}',
  criada_em        timestamptz not null default now(),
  vista_em         timestamptz not null default now(),
  encerrada_em     timestamptz,
  encerrada_motivo text check (encerrada_motivo in ('outro_dispositivo', 'logout', 'expirada'))
);

comment on column public.sessoes_dispositivo.device_id is
  'Identificador gerado no cliente e guardado no armazenamento local. Não identifica a pessoa: só distingue um aparelho do outro.';
comment on column public.sessoes_dispositivo.encerrada_motivo is
  'outro_dispositivo = foi derrubada por um login novo. É esse valor que dispara o aviso na tela do aparelho derrubado.';

-- O coração da regra: no máximo uma sessão sem `encerrada_em` por usuário.
create unique index if not exists idx_sessao_dispositivo_ativa
  on public.sessoes_dispositivo (usuario_id)
  where encerrada_em is null;

create index if not exists idx_sessao_dispositivo_usuario
  on public.sessoes_dispositivo (usuario_id, criada_em desc);

-- ---------- assumir a sessão ----------
-- Chamada no login e no "Continuar aqui". Encerra a sessão de qualquer
-- outro aparelho e passa a valer neste. Idempotente: se este aparelho
-- já é o dono, só renova `vista_em`.
--
-- O FOR UPDATE no perfil serializa por usuário: sem ele, dois aparelhos
-- chamando ao mesmo tempo passariam pelo encerramento juntos e um dos
-- INSERTs morreria na violação do índice único.
create or replace function public.assumir_sessao(
  p_device_id   text,
  p_device_info jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;

  if p_device_id is null or length(trim(p_device_id)) = 0 then
    raise exception 'device_id obrigatório' using errcode = '22023';
  end if;

  perform 1 from public.perfis where id = v_uid for update;

  update public.sessoes_dispositivo
     set encerrada_em = now(),
         encerrada_motivo = 'outro_dispositivo'
   where usuario_id = v_uid
     and encerrada_em is null
     and device_id is distinct from p_device_id;

  update public.sessoes_dispositivo
     set vista_em = now(),
         device_info = coalesce(p_device_info, device_info)
   where usuario_id = v_uid
     and encerrada_em is null
     and device_id = p_device_id
  returning id into v_id;

  if v_id is null then
    insert into public.sessoes_dispositivo (usuario_id, device_id, device_info)
    values (v_uid, p_device_id, coalesce(p_device_info, '{}'::jsonb))
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- ---------- este aparelho ainda vale? ----------
-- Consultada em intervalos e ao voltar o foco. Devolve 'ativa',
-- 'derrubada' (outro aparelho assumiu) ou 'inexistente'.
create or replace function public.estado_sessao(p_device_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when s.encerrada_em is null then 'ativa'
             when s.encerrada_motivo = 'outro_dispositivo' then 'derrubada'
             else 'inexistente'
           end
      from public.sessoes_dispositivo s
     where s.usuario_id = (select auth.uid())
       and s.device_id = p_device_id
     order by s.criada_em desc
     limit 1
  ), 'inexistente');
$$;

-- ---------- encerrar (logout explícito) ----------
create or replace function public.encerrar_sessao(p_device_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sessoes_dispositivo
     set encerrada_em = now(),
         encerrada_motivo = 'logout'
   where usuario_id = (select auth.uid())
     and device_id = p_device_id
     and encerrada_em is null;
$$;

-- ---------- RLS ----------
-- Leitura das próprias sessões (para a tela mostrar de onde foi
-- acessado). Escrita só pelas funções acima, que são SECURITY DEFINER.
alter table public.sessoes_dispositivo enable row level security;

drop policy if exists "sessoes proprias: ler" on public.sessoes_dispositivo;
create policy "sessoes proprias: ler"
  on public.sessoes_dispositivo for select to authenticated
  using (usuario_id = (select auth.uid()));
