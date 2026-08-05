/* =========================================================================
   KlugRads — sessão do usuário, compartilhada entre as telas.
   -------------------------------------------------------------------------
   Guarda o token, renova quando vence, e é o porteiro de /app.

   O conteúdo é pago, então este arquivo tem uma responsabilidade que não
   existia antes: quando o acesso acaba (assinatura vencida, sessão
   tomada por outro aparelho, logout), o cache local precisa ser APAGADO.
   Sem isso, quem pagou um mês continuaria lendo tudo offline para sempre.
   ========================================================================= */
window.KlugSessao = (function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var CHAVE = 'klugrads_sessao';
  var CACHE_CONTEUDO = 'ultraref_data';

  function ler() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return (s && s.access_token) ? s : null;
    } catch (e) { return null; }
  }

  function salvar(s) {
    try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) {}
  }

  // Apaga sessão E conteúdo. Os dois juntos, sempre: deixar o conteúdo
  // para trás é entregar o produto a quem não tem mais direito.
  function limpar() {
    try {
      localStorage.removeItem(CHAVE);
      localStorage.removeItem(CACHE_CONTEUDO);
    } catch (e) {}
  }

  function expirada(s) {
    if (!s || !s.expires_at) return false;
    return (s.expires_at - 60) * 1000 < Date.now();   // 60s de folga
  }

  function renovar(s) {
    return fetch(CFG.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) {
      if (!r.ok) return null;
      return r.json().then(function (nova) {
        if (!nova || !nova.access_token) return null;
        nova.expires_at = nova.expires_at ||
          (Math.floor(Date.now() / 1000) + (nova.expires_in || 3600));
        salvar(nova);
        return nova;
      });
    }).catch(function () { return null; });
  }

  // Devolve uma sessão utilizável, renovando se preciso. null = caiu.
  function valida() {
    var s = ler();
    if (!s) return Promise.resolve(null);
    if (!expirada(s)) return Promise.resolve(s);
    if (!s.refresh_token) { limpar(); return Promise.resolve(null); }
    return renovar(s).then(function (nova) {
      if (!nova) limpar();
      return nova;
    });
  }

  function paraLogin(motivo) {
    limpar();
    var q = motivo ? ('?motivo=' + encodeURIComponent(motivo)) : '';
    window.location.replace('/login' + q);
  }

  // Porteiro de /app: chamado antes de qualquer render.
  function exigir() {
    return valida().then(function (s) {
      if (!s) { paraLogin('sessao'); return null; }
      return s;
    });
  }

  function sair() {
    var s = ler();
    if (s) {
      // Melhor esforço: se falhar, o logout local já basta para esta máquina.
      fetch(CFG.SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token }
      }).catch(function () {});
    }
    paraLogin();
  }

  return {
    ler: ler, salvar: salvar, limpar: limpar,
    valida: valida, exigir: exigir, sair: sair, paraLogin: paraLogin
  };
})();
