/* =========================================================================
   Service worker — makes Notes installable and fully offline.

   The app never talks to a network at run time (state lives in localStorage
   and images are inlined as data URLs), so caching the shell is genuinely all
   it takes to make the whole app work with the radio off.

   Strategy: cache-first over a versioned precache. Bump CACHE whenever any
   shell file changes — the old cache is then dropped wholesale on activate,
   which avoids the half-old-half-new state that per-file expiry invites.
   ========================================================================= */

const CACHE = 'notes-shell-v7';

/* Relative, not root-absolute: in a service worker these resolve against the
   worker's own URL, so the app works unchanged whether it is served from a
   domain root or from a subpath like /notes/ on GitHub Pages. */
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './pwa.js',
  './manifest.webmanifest',
  './favicon.ico',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
];

const SHELL_PAGE = new URL('index.html', self.location).href;

self.addEventListener('install', (e) => {
  // No skipWaiting here on purpose: swapping the worker under a tab that is
  // mid-edit would serve it a new shell against old in-memory state. The page
  // asks for the swap instead, once the user accepts the update prompt.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Never touch anything but same-origin reads. A POST or a cross-origin call
  // going through here would be cached wrongly or break outright.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigations always resolve to the one shell page — the app has no routing,
  // and this is what lets a deep link or a manifest shortcut open offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match(SHELL_PAGE);
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch {
        return new Response('<h1>Offline</h1>', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // Everything the app loads is in the precache, so a hit is the normal path
  // and the fetch is only ever the first-run/cache-miss fallback.
  e.respondWith(caches.match(req).then((r) => r || fetch(req).catch(() => Response.error())));
});
