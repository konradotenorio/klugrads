/* =========================================================================
   KlugRads — Service Worker (PWA, offline-first)
   ---------------------------------------------------------------------------
   Estratégias:
   - App shell (HTML/JS/ícones/manifesto): precache + stale-while-revalidate.
   - Navegações: network-first com fallback para o index em cache (offline).
   - API do Supabase (/rest/v1): network-first; em falha, último bom cache.
   SUBA A VERSAO A CADA PUBLICACAO QUE MEXA EM JS/HTML. Sem isso o
   stale-while-revalidate entrega o arquivo velho do cache e a correcao
   simplesmente nao chega ao usuario — inclusive correcoes de seguranca.
   ========================================================================= */
const VERSION = 'v0.14.0';
const APP_CACHE = `ultraref-app-${VERSION}`;
const DATA_CACHE = `ultraref-data-${VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/app',
  '/app.html',
  '/login',
  '/login.html',
  '/js/landing.js',
  '/js/auth.js',
  '/js/sessao.js',
  '/js/i18n.js',
  '/js/config.js',
  '/js/app.js',
  '/js/calc-fetal.js',
  '/js/calc-orads.js',
  '/js/calc-trisomias.js',
  '/js/calc-preeclampsia.js',
  '/js/calc-sga.js',
  '/js/calc-gdm.js',
  '/js/calc-ptb.js',
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
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== APP_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
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

  // Estáticos: stale-while-revalidate.
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
