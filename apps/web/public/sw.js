/* Service Worker de FlotaOS — app shell instalable.
 * Estrategia:
 *   - Navegaciones (HTML): network-first → cache → /offline.html
 *   - Estáticos versionados (/_next/static, /icons, fuentes, imágenes): cache-first
 *   - Datos en vivo (API, socket.io): SIEMPRE red, nunca se cachean
 * Sube CACHE_VERSION cuando cambies esta estrategia para invalidar cachés viejas.
 */
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `flotaos-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `flotaos-assets-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Permite que la página fuerce la activación del SW nuevo.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Solo gestionamos peticiones del mismo origen.
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar datos en vivo ni infraestructura de Next dev.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return;
  }

  // Navegaciones (documento HTML): network-first con fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cacheamos respuestas válidas y no redirigidas: una página de
          // login (302) o de error no debe servirse luego como si fuera real,
          // y una respuesta redirigida rompe el fallback de navegación offline.
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Estáticos versionados: cache-first (con revalidación en segundo plano).
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
