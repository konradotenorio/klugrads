/* =========================================================================
   KlugRads — Idade óssea (IA) · Radiografia › Calculadoras
   ---------------------------------------------------------------------------
   Diferente das outras calculadoras, esta é uma PÁGINA própria (/idade-ossea):
   o modelo de IA roda no navegador do usuário e precisa de código e pesos que
   não devem entrar no app principal. Aqui só registramos o cartão no catálogo
   (CALCS de app.js); `href` faz o app navegar para a página (ver goCalcPage).
   Só computador — a própria página avisa quem abre no celular.
   Ferramenta educacional e de teste, sem validação clínica.
   ========================================================================= */
CALCS.push({id:'idade-ossea', modality:'rx', badge:'IO',
  title:'Idade óssea (IA)',
  desc:'Estimativa por IA no navegador · só computador · educacional e em teste',
  href:'/idade-ossea'});
