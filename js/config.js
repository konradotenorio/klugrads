/* =========================================================================
   KlugRads — configuração pública do cliente.
   ---------------------------------------------------------------------------
   A chave abaixo é a PUBLISHABLE/ANON do Supabase: é pública por design e
   PODE ir no client/repositório. A segurança vem do Row Level Security (RLS),
   que só libera LEITURA da tabela `referencias`. NUNCA coloque aqui a
   service_role key (essa é secreta).
   ========================================================================= */
window.CONFIG = {
  SUPABASE_URL: 'https://mcqtxelqgvwomxhslqdq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_tKekItUKXUYVnGgZulRmSg_mXDN48fq',
  TABLE: 'referencias',
  // Supabase é a fonte editável (tabela `referencias`, 70 itens, modelo atual);
  // o seed local (js/seed.js) é o fallback offline. Edite o conteúdo no painel
  // do Supabase e ele reflete no app no próximo carregamento.
  USE_SUPABASE: true
};
