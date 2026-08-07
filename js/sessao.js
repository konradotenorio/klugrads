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
  //
  // Confere a sessão CONTRA O SERVIDOR, não contra o armazenamento local.
  // Ler só o localStorage deixava o app abrir offline: o token continua
  // lá, o conteúdo em cache também, e nenhum aparelho e derrubado porque
  // ninguém consegue avisar o outro. Na prática, uma conta rodava em
  // quantos aparelhos quisesse, bastando desligar a internet.
  //
  // Devolve a sessão, ou um dos motivos: 'sessao' (não autenticado) ou
  // 'offline' (sem como verificar — e sem verificar, não entra).
  function exigir() {
    return valida().then(function (s) {
      if (!s) { paraLogin('sessao'); return null; }
      return fetch(CFG.SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access_token },
        cache: 'no-store'
      }).then(function (r) {
        if (r.status === 401 || r.status === 403) { paraLogin('sessao'); return null; }
        if (!r.ok) return { erro: 'offline' };
        return r.json().then(function (u) { s.user = u; salvar(s); return s; });
      }).catch(function () {
        // Sem rede: não dá para saber se a assinatura vale nem se outro
        // aparelho assumiu. Na dúvida, não libera — mas também não
        // desloga, para a pessoa voltar sem redigitar senha.
        return { erro: 'offline' };
      });
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

  /* ===================== um aparelho por vez ===================== */

  var CHAVE_APARELHO = 'klugrads_aparelho';
  var INTERVALO_MS = 30000;
  var timer = null;

  // Identifica o APARELHO, não a pessoa. Sobrevive ao logout de propósito:
  // é o mesmo aparelho voltando, e trocar o id a cada login faria o
  // "Continuar aqui" derrubar a si mesmo.
  function aparelhoId() {
    try {
      var v = localStorage.getItem(CHAVE_APARELHO);
      if (!v) {
        v = 'ap-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
        localStorage.setItem(CHAVE_APARELHO, v);
      }
      return v;
    } catch (e) {
      return 'ap-efemero';   // modo privado: vale só para esta aba
    }
  }

  function descricaoAparelho() {
    var ua = navigator.userAgent || '';
    var tipo = /iphone|ipad|ipod|android/i.test(ua) ? 'celular' : 'computador';
    var so = /iphone|ipad|ipod/i.test(ua) ? 'iOS'
           : /android/i.test(ua) ? 'Android'
           : /mac/i.test(ua) ? 'macOS'
           : /windows/i.test(ua) ? 'Windows' : 'outro';
    return { tipo: tipo, so: so, em: new Date().toISOString() };
  }

  function rpc(nome, corpo) {
    return valida().then(function (s) {
      if (!s) return null;
      return fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/' + nome, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CFG.SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + s.access_token
        },
        body: JSON.stringify(corpo)
      }).then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    });
  }

  // Toma a sessão para este aparelho, encerrando a de qualquer outro.
  function assumirAparelho() {
    return rpc('assumir_sessao', {
      p_device_id: aparelhoId(),
      p_device_info: descricaoAparelho()
    });
  }

  function estadoAparelho() {
    return rpc('estado_sessao', { p_device_id: aparelhoId() });
  }

  /* ---------- aviso de conta aberta em outro aparelho ---------- */

  function mostrarAvisoTomada() {
    if (document.getElementById('klug-tomada')) return;   // já está na tela

    var box = document.createElement('div');
    box.id = 'klug-tomada';
    box.setAttribute('role', 'alertdialog');
    box.innerHTML =
      '<div class="kt-fundo"></div>' +
      '<div class="kt-caixa">' +
        '<div class="kt-titulo">Sua conta foi aberta em outro aparelho</div>' +
        '<div class="kt-texto">O KlugRads funciona em um aparelho por vez. ' +
        'Para continuar usando aqui, é só tocar no botão abaixo — e aí o outro ' +
        'aparelho é que vai pedir para voltar.</div>' +
        '<button class="kt-btn kt-primario" id="kt-continuar" type="button">Continuar neste aparelho</button>' +
        '<button class="kt-btn kt-secundario" id="kt-sair" type="button">Sair da conta</button>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '#klug-tomada{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;}' +
      '#klug-tomada .kt-fundo{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(3px);}' +
      '#klug-tomada .kt-caixa{position:relative;max-width:380px;width:100%;background:var(--sf,#161c23);' +
        'border:1px solid var(--line,#28323d);border-radius:18px;padding:24px;text-align:center;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.5);}' +
      '#klug-tomada .kt-titulo{font-size:17px;font-weight:750;color:var(--tx,#e9eef3);margin-bottom:10px;}' +
      '#klug-tomada .kt-texto{font-size:14px;line-height:1.55;color:var(--dim,#8b98a5);margin-bottom:20px;}' +
      '#klug-tomada .kt-btn{display:block;width:100%;font:inherit;font-weight:700;font-size:15px;' +
        'border-radius:12px;padding:13px;border:1px solid transparent;cursor:pointer;}' +
      '#klug-tomada .kt-primario{background:var(--accent,#15b8a6);color:var(--accentInk,#04221f);}' +
      '#klug-tomada .kt-secundario{background:transparent;color:var(--dim,#8b98a5);' +
        'border-color:var(--line,#28323d);margin-top:9px;}';

    document.head.appendChild(css);
    document.body.appendChild(box);

    document.getElementById('kt-continuar').addEventListener('click', function () {
      var b = document.getElementById('kt-continuar');
      b.disabled = true; b.textContent = 'Retomando…';
      assumirAparelho().then(function (id) {
        if (!id) { b.disabled = false; b.textContent = 'Continuar neste aparelho'; return; }
        box.remove();
        // Recarrega para o conteúdo vir de novo com a sessão retomada.
        window.location.reload();
      });
    });

    document.getElementById('kt-sair').addEventListener('click', function () { sair(); });
  }

  // Quantas verificações seguidas podem falhar antes de bloquear a tela.
  // Não pode ser 0: um soluço de rede derrubaria quem está trabalhando.
  // Não pode ser alto: cada tentativa é meio minuto usando o app sem
  // ninguém conseguir confirmar nada.
  var FALHAS_ATE_BLOQUEAR = 2;
  var falhasSeguidas = 0;
  var aoPerderContato = null;

  function conferirAparelho() {
    return estadoAparelho().then(function (estado) {
      // null = não deu para falar com o servidor. Isso NÃO é "está tudo
      // bem": é justamente o estado em que o app fica cego. Sem confirmar,
      // não dá para saber se a assinatura vale nem se outro aparelho
      // assumiu — e era assim que dava para usar a mesma conta em vários
      // aparelhos ao mesmo tempo, bastando ficar offline depois de abrir.
      if (estado === null) {
        falhasSeguidas++;
        if (falhasSeguidas >= FALHAS_ATE_BLOQUEAR && typeof aoPerderContato === 'function') {
          aoPerderContato();
        }
        return null;
      }
      falhasSeguidas = 0;
      if (estado === 'derrubada') mostrarAvisoTomada();
      // 'inexistente' acontece logo após o login, antes do primeiro
      // assumir_sessao — não é motivo para alarme.
      return estado;
    });
  }

  // Confere de tempos em tempos e sempre que a aba volta ao primeiro plano:
  // o caso típico é largar o computador, usar o celular e voltar. Sem o
  // gancho de foco, a pessoa mexeria numa tela que já não vale.
  function vigiarAparelho(quandoPerderContato) {
    if (typeof quandoPerderContato === 'function') aoPerderContato = quandoPerderContato;
    if (timer) return;
    timer = setInterval(conferirAparelho, INTERVALO_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) conferirAparelho();
    });
    window.addEventListener('online', conferirAparelho);
  }

  return {
    ler: ler, salvar: salvar, limpar: limpar,
    valida: valida, exigir: exigir, sair: sair, paraLogin: paraLogin,
    aparelhoId: aparelhoId,
    assumirAparelho: assumirAparelho,
    estadoAparelho: estadoAparelho,
    conferirAparelho: conferirAparelho,
    vigiarAparelho: vigiarAparelho
  };
})();
