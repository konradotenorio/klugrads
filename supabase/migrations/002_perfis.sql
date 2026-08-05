-- ============================================================
-- KlugRads — Migration 002: perfis de usuário
--
-- Estende auth.users com os dados do cadastro. Modelado a partir do
-- LaudoZ (supabase/migrations/001_initial_schema.sql), com os nomes
-- em português para acompanhar o resto do schema (`referencias`,
-- `conteudo`). Mapeamento: name→nome, phone→telefone; cpf, crm e
-- crm_uf mantêm o nome de lá.
--
-- Decisões herdadas do LaudoZ, de propósito:
--   - CPF é obrigatório e único: é o identificador real da pessoa e
--     impede a mesma pessoa abrir várias contas.
--   - CRM é OPCIONAL e separado em número + UF. CRM sem estado não
--     identifica ninguém, e há usuários legítimos sem CRM (estudante,
--     residente, outro profissional de saúde).
--
-- O trigger só cria o perfil quando o cadastro traz nome e CPF, ou
-- seja, no fluxo e-mail/senha. Quem entra pelo Google chega sem esses
-- dados e cai na tela de completar perfil — daí o perfil é criado pelo
-- próprio app. Sem isso, o login social quebraria no NOT NULL.
-- ============================================================

create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  cpf           text unique not null,
  crm           text,
  crm_uf        text,
  telefone      text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.perfis.cpf is
  'Somente dígitos, sem máscara. Único: uma conta por pessoa.';
comment on column public.perfis.crm is
  'Opcional. Só o número; a UF vai em crm_uf.';

-- ---------- atualizado_em ----------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- ---------- criação automática no signup e-mail/senha ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.raw_user_meta_data ->> 'nome') is not null
     and (new.raw_user_meta_data ->> 'cpf') is not null then
    insert into public.perfis (id, nome, cpf, crm, crm_uf, telefone)
    values (
      new.id,
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'cpf',
      new.raw_user_meta_data ->> 'crm',
      new.raw_user_meta_data ->> 'crm_uf',
      new.raw_user_meta_data ->> 'telefone'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS: cada um enxerga e edita só o próprio perfil ----------
alter table public.perfis enable row level security;

drop policy if exists "perfil proprio: ler" on public.perfis;
create policy "perfil proprio: ler"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "perfil proprio: criar" on public.perfis;
create policy "perfil proprio: criar"
  on public.perfis for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "perfil proprio: atualizar" on public.perfis;
create policy "perfil proprio: atualizar"
  on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
