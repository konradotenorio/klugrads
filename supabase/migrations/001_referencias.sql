-- ============================================================
-- KlugRads — Migration 001: tabela de conteúdo `referencias`
--
-- Registra em código o schema que hoje existe no projeto Supabase
-- (mcqtxelqgvwomxhslqdq). Estava só no painel: se o projeto sumisse,
-- como aconteceu com o anterior (ulmosuquzrkzsrmszexr), o schema teria
-- de ser recriado de memória.
--
-- `conteudo` guarda o item inteiro do seed como jsonb; as colunas
-- soltas (grupo, nome) existem para filtro e leitura no painel.
-- A ordem de exibição é `sort_order`, não a ordem de inserção.
-- ============================================================

create table if not exists public.referencias (
  id          text primary key,
  grupo       text,
  nome        text,
  sort_order  integer not null,
  conteudo    jsonb   not null
);

create index if not exists referencias_sort_order_idx
  on public.referencias (sort_order);

alter table public.referencias enable row level security;

-- Leitura pública — vale enquanto o app é aberto. A migration 005
-- restringe isso a assinantes autenticados.
drop policy if exists "leitura publica" on public.referencias;
create policy "leitura publica"
  on public.referencias
  for select
  to anon, authenticated
  using (true);
