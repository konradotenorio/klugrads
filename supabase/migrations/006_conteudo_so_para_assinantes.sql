-- ============================================================
-- KlugRads — Migration 006: o conteúdo passa a exigir assinatura
--
-- Até aqui a tabela `referencias` era de leitura pública: qualquer um
-- com a chave publishable — que está no js/config.js, à vista de todos —
-- baixava os 74 itens. Somado ao js/seed.js, que era servido aberto,
-- o acervo inteiro estava de graça na internet.
--
-- A partir daqui, ler o conteúdo exige duas coisas ao mesmo tempo:
--   1) estar autenticado, e
--   2) ter assinatura vigente (trial dentro do prazo, ativa ou VIP).
--
-- A checagem mora aqui, no banco, e não no app. Trava no cliente é
-- decoração: qualquer pessoa abre o DevTools e passa por cima. Esta,
-- não — o Postgres simplesmente não devolve as linhas.
-- ============================================================

drop policy if exists "leitura publica" on public.referencias;

create policy "leitura para assinantes"
  on public.referencias
  for select
  to authenticated
  using (public.tem_acesso((select auth.uid())));

-- Nenhuma policy para `anon`: visitante não logado não enxerga nada.
-- Nenhuma policy de INSERT/UPDATE/DELETE para ninguém: o conteúdo é
-- mantido pelo painel e pelos scripts de tools/, que usam service_role.
