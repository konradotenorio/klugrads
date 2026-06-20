/* =========================================================================
   UltraRef — configuração pública do cliente.
   ---------------------------------------------------------------------------
   A chave abaixo é a PUBLISHABLE/ANON do Supabase: é pública por design e
   PODE ir no client/repositório. A segurança vem do Row Level Security (RLS),
   que só libera LEITURA da tabela `referencias`. NUNCA coloque aqui a
   service_role key (essa é secreta).
   ========================================================================= */
window.CONFIG = {
  SUPABASE_URL: 'https://ulmosuquzrkzsrmszexr.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_LmS-FkJRp6a2ReFp494d_Q_h6FuDAdp',
  TABLE: 'referencias',
  // Branch "completo": app usa o seed local (61 itens). A Supabase é compartilhada
  // com a produção (main, modelo antigo) — religar (true) só ao mergear e re-popular.
  USE_SUPABASE: false
};
