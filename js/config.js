/* =========================================================================
   KlugRads — configuração pública do cliente.
   ---------------------------------------------------------------------------
   MODO ESTÁTICO (relançamento set/2026): o app é ABERTO e GRATUITO, sem
   login e sem backend. O conteúdo (74 itens) é embutido em js/seed.js
   (window.SEED). Não há Supabase, OAuth nem 2FA — nada que possa travar.

   FASE 2 (quando quiser conteúdo editável pelo painel + login): defina
   STATIC_MODE:false e USE_SUPABASE:true e preencha SUPABASE_URL/ANON_KEY
   de um projeto novo. As chaves abaixo ficam só como lembrete e não têm
   efeito enquanto STATIC_MODE for true.
   ========================================================================= */
window.CONFIG = {
  STATIC_MODE: true,     // app aberto, conteúdo de js/seed.js, sem backend
  USE_SUPABASE: false,   // sem chamadas ao Supabase no modo estático

  // Guardado para a fase 2 (login + conteúdo editável). Sem efeito agora.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  TABLE: 'referencias',
  UM_APARELHO_POR_VEZ: false,

  // Formulário Críticas e Sugestões. Vazio = abre o app de e-mail (mailto)
  // para klugrads@gmail.com. Para envio AUTOMÁTICO por e-mail, crie uma chave
  // grátis em web3forms.com (informando klugrads@gmail.com) e cole aqui.
  WEB3FORMS_KEY: ''
};
