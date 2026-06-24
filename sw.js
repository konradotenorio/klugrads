/* =========================================================================
   RadRef — Service Worker (PWA, offline-first)
   ---------------------------------------------------------------------------
   Estratégias:
   - App shell (HTML/JS/ícones/manifesto): precache + stale-while-revalidate.
   - Navegações: network-first com fallback para o index em cache (offline).
   - API do Supabase (/rest/v1): network-first; em falha, último bom cache.
   Suba a versão do CACHE ao publicar mudanças para forçar atualização.
   ========================================================================= */
const VERSION = 'v0.6.1';
const APP_CACHE = `ultraref-app-${VERSION}`;
const DATA_CACHE = `ultraref-data-${VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/js/config.js',
  '/js/seed.js',
  '/js/app.js',
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

  // Dados do Supabase: network-first, com fallback ao último cache bom.
  if (url.pathname.startsWith('/rest/v1/') || url.hostname.endsWith('supabase.co')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Apenas mesma origem daqui em diante.
  if (url.origin !== self.location.origin) return;

  // Navegações (HTML): network-first -> cache -> index offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
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
