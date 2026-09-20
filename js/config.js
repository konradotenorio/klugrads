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
  // O conteúdo vem SÓ do Supabase, com o usuário autenticado e assinatura
  // vigente. Não há mais seed no cliente: db/seed.js é a fonte da verdade
  // para popular o banco, e fica fora do que a Vercel publica.
  USE_SUPABASE: true,

  // Modelo GRÁTIS (set/2026): acesso liberado a qualquer pessoa logada.
  // A trava de "um aparelho por vez" era proteção de conteúdo pago; no
  // modelo grátis vira atrito, então fica desligada. Para religar (ex.: se
  // voltar a cobrar), troque para true — e reverta a migration 007 no banco.
  UM_APARELHO_POR_VEZ: false
};
