-- ============================================================
-- KlugRads — Migration 005: trial de 30 dias e lista VIP
--
-- Toda conta nova nasce com 30 dias de teste. A exceção é a lista
-- VIP: e-mails cadastrados em `acessos_especiais` ganham o que estiver
-- definido ali — cortesia por prazo maior ou acesso vitalício.
--
-- A lista é por E-MAIL, e não por usuário, de propósito: ela precisa
-- funcionar ANTES da pessoa existir. Você inscreve o e-mail hoje; quando
-- ela se cadastrar, semana que vem, já entra com o benefício, sem
-- ninguém precisar lembrar de ir lá liberar na mão.
--
-- A assinatura é criada por gatilho em `perfis`, não em `auth.users`.
-- Motivo: quem entra pelo Google não passa pelo gatilho de auth.users
-- (chega sem CPF e cria o perfil pelo app). Pendurando em `perfis`,
-- os dois caminhos de cadastro caem na mesma regra.
-- ============================================================

create table if not exists public.acessos_especiais (
  email      text primary key,
  tipo       text not null default 'cortesia'
             check (tipo in ('vitalicio', 'cortesia')),
  dias       integer,
  nota       text,
  criado_em  timestamptz not null default now(),
  usado_em   timestamptz,
  usado_por  uuid references public.perfis(id) on delete set null
);

comment on table public.acessos_especiais is
  'Lista VIP. E-mails aqui recebem tratamento diferente do trial padrão ao se cadastrar. Editável pelo painel do Supabase.';
comment on column public.acessos_especiais.email is
  'Sempre minúsculo e sem espaços — o gatilho normaliza antes de comparar.';
comment on column public.acessos_especiais.tipo is
  'vitalicio = nunca expira. cortesia = expira em `dias` (se dias for nulo, usa o trial padrão).';
comment on column public.acessos_especiais.usado_em is
  'Preenchido quando a pessoa se cadastra. Serve para saber quem já resgatou; a linha não é apagada, para manter o histórico.';

-- Sem policy nenhuma: é lista de negócio. Ninguém lê nem escreve pelo
-- cliente — só pelo painel ou pela service_role. Com RLS ligada e zero
-- policies, o acesso via anon/authenticated fica fechado.
alter table public.acessos_especiais enable row level security;

-- ---------- trial padrão ----------
-- Em função separada para o prazo ser trocado num lugar só.
create or replace function public.dias_de_trial()
returns integer
language sql
immutable
as $$ select 30; $$;

-- ---------- criação automática da assinatura ----------
create or replace function public.criar_assinatura_inicial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text;
  v_vip    public.acessos_especiais%rowtype;
  v_status public.status_assinatura := 'trial';
  v_expira timestamptz;
begin
  select lower(trim(u.email)) into v_email
    from auth.users u where u.id = new.id;

  select * into v_vip
    from public.acessos_especiais a
   where a.email = v_email;

  if found then
    v_status := 'ativa';                       -- VIP não é teste: é acesso concedido
    if v_vip.tipo = 'vitalicio' then
      v_expira := null;                        -- null = sem prazo, para sempre
    else
      v_expira := now() + make_interval(days => coalesce(v_vip.dias, public.dias_de_trial()));
    end if;

    update public.acessos_especiais
       set usado_em = coalesce(usado_em, now()),
           usado_por = coalesce(usado_por, new.id)
     where email = v_email;
  else
    v_expira := now() + make_interval(days => public.dias_de_trial());
  end if;

  -- on conflict: se por algum motivo já houver assinatura vigente,
  -- não sobrescreve. Quem paga não pode ser rebaixado a trial.
  insert into public.assinaturas (usuario_id, status, expira_em)
  values (new.id, v_status, v_expira)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists perfis_assinatura_inicial on public.perfis;
create trigger perfis_assinatura_inicial
  after insert on public.perfis
  for each row execute function public.criar_assinatura_inicial();

-- ---------- atalho para incluir alguém na lista ----------
-- Uso no SQL Editor:
--   select vip_conceder('fulano@gmail.com', 'vitalicio', null, 'parceiro fundador');
--   select vip_conceder('ciclano@gmail.com', 'cortesia', 90, 'promo lançamento');
-- Se a pessoa JÁ tem conta, a assinatura dela é atualizada na hora.
create or replace function public.vip_conceder(
  p_email text,
  p_tipo  text default 'cortesia',
  p_dias  integer default null,
  p_nota  text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(trim(p_email));
  v_id     uuid;
  v_expira timestamptz;
begin
  insert into public.acessos_especiais (email, tipo, dias, nota)
  values (v_email, p_tipo, p_dias, p_nota)
  on conflict (email) do update
    set tipo = excluded.tipo, dias = excluded.dias, nota = excluded.nota;

  select u.id into v_id from auth.users u where lower(trim(u.email)) = v_email;
  if v_id is null then
    return 'na lista; vale quando ' || v_email || ' se cadastrar';
  end if;

  v_expira := case when p_tipo = 'vitalicio' then null
                   else now() + make_interval(days => coalesce(p_dias, public.dias_de_trial())) end;

  update public.assinaturas
     set status = 'ativa', expira_em = v_expira
   where usuario_id = v_id
     and status in ('trial', 'ativa', 'inadimplente');

  if not found then
    insert into public.assinaturas (usuario_id, status, expira_em)
    values (v_id, 'ativa', v_expira);
  end if;

  update public.acessos_especiais
     set usado_em = coalesce(usado_em, now()), usado_por = coalesce(usado_por, v_id)
   where email = v_email;

  return 'aplicado agora em ' || v_email;
end;
$$;
