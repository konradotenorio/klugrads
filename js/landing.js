/* =========================================================================
   KlugRads — landing pública (/).
   -------------------------------------------------------------------------
   Três decisões desta tela:

   1) Quem abriu pelo app instalado NÃO vê a landing. Vai direto para o
      produto. Isso também cobre quem instalou antes de a landing existir:
      o manifest antigo apontava start_url para "/", então essas pessoas
      caem aqui e precisam ser desviadas — senão o ícone que abria o app
      passaria a abrir uma página de vendas.

   2) O convite para instalar só aparece no celular. Em desktop, instalar
      PWA não é o que a pessoa quer: ela quer entrar e usar.

   3) Instalar funciona diferente em cada sistema, e não dá para fingir:
      - Android/Chrome: o navegador avisa (beforeinstallprompt) e dá um
        instalador de verdade.
      - iPhone/Safari: não existe esse evento. O máximo honesto é ensinar
        o caminho manual — Compartilhar > Adicionar à Tela de Início.
   ========================================================================= */
(function () {
  'use strict';

  var DESTINO_APP = '/app';

  /* ---------- 1. já está dentro do app instalado? ---------- */
  function ehStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||   // iOS
      document.referrer.startsWith('android-app://')
    );
  }

  if (ehStandalone()) {
    // replace, não href: a landing não deve ficar no histórico, senão o
    // "voltar" do app cai aqui e parece que o app deslogou.
    window.location.replace(DESTINO_APP);
    return;
  }

  /* ---------- 2. é celular? ---------- */
  function ehCelular() {
    // Coarse pointer + tela estreita. Vale mais que farejar user-agent,
    // que erra em iPad e em Android com modo desktop.
    var toqueGrosso = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var telaEstreita = window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
    return toqueGrosso && telaEstreita;
  }

  function ehIOS() {
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPadOS 13+ se declara Mac; o toque denuncia.
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  var card = document.getElementById('install-card');
  var btn = document.getElementById('install-btn');
  var texto = document.getElementById('install-texto');
  var passos = document.getElementById('install-steps');

  if (!ehCelular() || !card) return;

  card.style.display = 'block';

  /* ---------- 3a. Android/Chrome: instalador real ---------- */
  var promptAdiado = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();           // sem isso o Chrome mostra o banner dele
    promptAdiado = e;
    btn.hidden = false;
    btn.textContent = 'Instalar aplicativo';
  });

  window.addEventListener('appinstalled', function () {
    card.style.display = 'none';
  });

  btn.addEventListener('click', function () {
    if (promptAdiado) {
      promptAdiado.prompt();
      promptAdiado.userChoice.then(function (escolha) {
        if (escolha && escolha.outcome === 'accepted') card.style.display = 'none';
        promptAdiado = null;
      });
      return;
    }
    // Sem prompt disponível (iOS, ou Chrome que ainda não considerou o
    // site instalável): mostra o passo a passo em vez de um botão morto.
    mostrarPassos();
  });

  /* ---------- 3b. iPhone: instrução honesta ---------- */
  function mostrarPassos() {
    var lista = ehIOS()
      ? ['Toque em <b>Compartilhar</b> na barra do Safari',
         'Escolha <b>Adicionar à Tela de Início</b>',
         'Confirme em <b>Adicionar</b>']
      : ['Abra o menu do navegador (⋮)',
         'Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>'];

    passos.innerHTML = lista.map(function (p) { return '<li>' + p + '</li>'; }).join('');
    passos.style.display = 'block';
    btn.hidden = true;
    texto.textContent = 'Para instalar no seu aparelho:';
  }

  if (ehIOS()) {
    // No iPhone nunca vai existir prompt: já mostra o caminho, sem
    // oferecer um botão que não instala nada.
    mostrarPassos();
  }
})();
