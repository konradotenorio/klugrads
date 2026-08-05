-- ============================================================
-- KlugRads — Migration 003: assinaturas
--
-- O app passa a ser pago por mensalidade. A cobrança em si (gateway,
-- webhook, checkout) NÃO entra agora — esta migration só cria o lugar
-- onde o estado da assinatura vive, para o cadastro já nascer pronto
-- e não precisar de migração de dados depois.
--
-- `provedor` e `provedor_ref` ficam vazios até existir gateway; quando
-- existir, guardam de onde veio (ex.: 'stripe') e o id de lá.
--
-- Quem controla o acesso é `tem_acesso()`, usada nas policies do
-- conteúdo (migration 005). A checagem mora no banco de propósito:
-- validação no cliente é enfeite, qualquer um contorna.
-- ============================================================

do $$ begin
  create type public.status_assinatura as enum
    ('trial', 'ativa', 'inadimplente', 'cancelada', 'expirada');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.assinaturas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  status        public.status_assinatura not null default 'trial',
  inicio        timestamptz not null default now(),
  expira_em     timestamptz,
  provedor      text,
  provedor_ref  text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.assinaturas.expira_em is
  'NULL = sem prazo definido. Assinatura vale enquanto status permitir E não tiver expirado.';

-- Uma assinatura corrente por usuário. Histórico (cancelada/expirada)
-- pode acumular; o que não pode é duas vigentes ao mesmo tempo.
create unique index if not exists idx_assinatura_corrente
  on public.assinaturas (usuario_id)
  where status in ('trial', 'ativa', 'inadimplente');

drop trigger if exists assinaturas_atualizado_em on public.assinaturas;
create trigger assinaturas_atualizado_em
  before update on public.assinaturas
  for each row execute function public.tocar_atualizado_em();

-- ---------- porteiro ----------
-- 'inadimplente' NÃO dá acesso: é o estado de quem falhou o pagamento
-- e ainda não foi cancelado. Trocar isso aqui muda a régua no app todo.
create or replace function public.tem_acesso(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.assinaturas a
     where a.usuario_id = uid
       and a.status in ('trial', 'ativa')
       and (a.expira_em is null or a.expira_em > now())
  );
$$;

-- ---------- RLS: leitura do próprio estado; escrita só pelo backend ----------
-- Não há policy de INSERT/UPDATE para `authenticated` de propósito:
-- ninguém se concede assinatura pelo cliente. Isso é feito com a
-- service_role (webhook do gateway, no futuro).
alter table public.assinaturas enable row level security;

drop policy if exists "assinatura propria: ler" on public.assinaturas;
create policy "assinatura propria: ler"
  on public.assinaturas for select to authenticated
  using (usuario_id = (select auth.uid()));
