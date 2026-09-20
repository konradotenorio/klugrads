-- ============================================================
-- KlugRads — Migration 007: acesso livre (grátis com login)
--
-- Decisão de produto (set/2026): o app passa a ser ABERTO E GRATUITO,
-- exigindo apenas cadastro/login. A estrutura de assinatura (tabelas,
-- policies, migration 003/006) FICA INTACTA, apenas dormente — para
-- voltar a cobrar depois é só reverter esta migration.
--
-- Como: `tem_acesso()` deixa de consultar a tabela `assinaturas` e passa
-- a liberar QUALQUER usuário autenticado. A policy da migration 006
-- continua valendo — só que agora todo mundo logado tem acesso, e o
-- visitante anônimo (sem auth.uid()) continua sem enxergar nada.
--
-- Para REVERTER (voltar a exigir assinatura vigente), reaplique a
-- definição original de `public.tem_acesso()` da migration 003.
-- ============================================================

create or replace function public.tem_acesso(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Grátis: basta estar autenticado (uid não-nulo). A tabela
  -- `assinaturas` permanece existindo e pode voltar a mandar quando
  -- a migration for revertida.
  select uid is not null;
$$;
