/* =========================================================================
   KlugRads — Service Worker (PWA, offline-first)
   ---------------------------------------------------------------------------
   Estratégias:
   - App shell: precache. JS/CSS/dados/manifesto: network-first (nunca JS velho com HTML novo);
     imagens/ícones: stale-while-revalidate.
   - Navegações: network-first com fallback para o index em cache (offline).
   - Ao ATUALIZAR (novo SW ativando com cache antigo presente), as abas abertas são recarregadas.
   - API do Supabase (/rest/v1): network-first; em falha, último bom cache.
   SUBA A VERSAO A CADA PUBLICACAO QUE MEXA EM JS/HTML/CSS: e a mudanca de bytes do sw.js que
   dispara a atualizacao (instala o novo cache e recarrega as abas abertas).
   ========================================================================= */
const VERSION = 'v0.100.123';
const APP_CACHE = `ultraref-app-${VERSION}`;
const DATA_CACHE = `ultraref-data-${VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/app',
  '/app.html',
  '/js/landing.js',
  '/js/sessao.js',
  '/js/i18n.js',
  '/js/config.js',
  '/js/seed.js',
  '/js/status.js',
  '/js/app.js',
  '/js/zoom.js',
  '/js/contraste.js',
  '/js/laudos-us-mascaras.js',
  '/js/laudos-frases.js',
  '/js/laudos.js',
  '/js/laudos-dmo.js',
  '/js/laudos-frases-tc.js',
  '/js/laudos-oct.js',
  '/js/laudos-auto.js',
  '/js/laudos-voz.js',
  '/js/laudos-ig.js',
  '/js/calc-fetal.js',
  '/js/calc-orads.js',
  '/js/calc-volume-gastrico.js',
  '/js/calc-boyden.js',
  '/js/calc-figo-miomas.js',
  '/js/ref-bosniak.js',
  '/js/calc-doppler-renais.js',
  '/js/calc-esteatose-rm.js',
  '/js/calc-esteatose-tc.js',
  '/js/calc-ferro-r2.js',
  '/js/calc-ferro-t2.js',
  '/js/calc-ferro-espl.js',
  '/js/calc-adrenal-tc.js',
  '/js/calc-adrenal-rm.js',
  '/js/calc-renal.js',
  '/js/calc-ccls.js',
  '/js/protocolos-tc.js',
  '/js/dxa.js',
  '/js/calc-pirads.js',
  '/js/calc-prostata-setores.js',
  '/js/prostata-esquema.js',
  '/js/calc-crads.js',
  '/js/calc-pancreatite.js',
  '/js/calc-orads-mri.js',
  '/js/calc-lung-rads.js',
  '/js/calc-fleischner.js',
  '/js/calc-idade-ossea.js',
  '/js/calc-cadrads.js',
  '/js/calc-mesa-cac.js',
  '/js/calc-pi-qual.js',
  '/js/calc-precise.js',
  '/js/calc-pi-rr.js',
  '/js/calc-trisomias.js',
  '/js/calc-preeclampsia.js',
  '/js/calc-sga.js',
  '/js/calc-gdm.js',
  '/js/calc-ptb.js',
  '/js/mapa-lesional.js',
  '/js/mapa-lesional-3d.js',
  '/js/mapa-endometriose.js',
  '/js/mapa-renal.js',
  '/js/mapa-fistula.js',
  '/img/mapa-setorial-prostata.webp',
  '/img/adrenal-incidentaloma-esr2025.webp',
  '/img/ccls-v2.webp',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Existia um cache de versão anterior? Então isto é uma ATUALIZAÇÃO (não a 1ª instalação).
    const atualizacao = keys.some((k) => k.startsWith('ultraref-app-') && k !== APP_CACHE);
    await Promise.all(keys.filter((k) => k !== APP_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Abas abertas na atualização podem estar com HTML novo + JS antigo (o SW antigo
    // entregava o JS do cache). Recarrega cada uma para ficar tudo na mesma versão.
    if (atualizacao) {
      const abas = await self.clients.matchAll({ type: 'window' });
      abas.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase (conteúdo e autenticação): sempre rede, NUNCA cache.
  //
  // Antes isto era network-first com fallback ao último cache bom, o que
  // fazia sentido quando o app era aberto e offline-first. Com o conteúdo
  // pago, guardar a resposta seria manter o acervo no aparelho depois de a
  // assinatura vencer — e responder pelo cache esconderia do app a perda
  // de acesso, que é justamente o sinal que precisa chegar até ele.
  if (url.pathname.startsWith('/rest/v1/') || url.hostname.endsWith('supabase.co')) {
    return;   // deixa passar direto para a rede, sem interceptar
  }

  // Apenas mesma origem daqui em diante.
  if (url.origin !== self.location.origin) return;

  // Navegações (HTML): network-first -> cache da própria rota -> fallback.
  // Guarda cada rota na sua própria chave: com landing (/), app (/app) e
  // login (/login) servindo HTML diferente, gravar tudo em '/index.html'
  // faria uma página sobrescrever a outra no cache.
  if (req.mode === 'navigate') {
    const fallback = url.pathname.startsWith('/app') ? '/app.html' : '/index.html';
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match(fallback)))
    );
    return;
  }

  // Código (JS/CSS/dados/manifesto): NETWORK-FIRST. O HTML novo nunca pode rodar com JS
  // velho do cache (era o stale-while-revalidate: 1ª visita após um deploy = tela quebrada).
  // O Vercel serve com max-age=0 + must-revalidate, então é um 304 barato; offline usa o cache.
  if (/\.(?:js|css|json|webmanifest)$/.test(url.pathname) || req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // Imagens e ícones: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
