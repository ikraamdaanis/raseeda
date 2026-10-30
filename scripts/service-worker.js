// The app's service worker, so every visit after the first loads from the
// device and the editor opens offline. vite.config.ts writes it into the build
// as /sw.js, with BUILD ({ version, files }) defined above this code: files
// lists the build's scripts, styles and latin fonts.
//
// - The pages are served from the cache at once and refreshed in the
//   background, so a deploy shows from the visit after it lands.
// - Built files carry a content hash in their name, so a cached copy is always
//   right; they come from the cache and are fetched only if missing.
// - Pictures are left to the browser. Its own image cache hands a reload
//   its pictures in the first frame; one detour through the worker is enough
//   to paint the page without them first, so the invoice flashed white.
// - Everything else (icons, other fonts) comes from the cache when it's there
//   and is refreshed in the background.

const PRECACHE_PREFIX = "precache-";
const PRECACHE = PRECACHE_PREFIX + BUILD.version;
const RUNTIME = "runtime";
const LEGACY_PRECACHE_PREFIX = "billsend-precache-";
const LEGACY_RUNTIME = "billsend-runtime";
const PAGES = ["/", "/privacy", "/create"];

self.addEventListener("install", event => {
  // Where the browser supports it, pictures skip the worker altogether rather
  // than reach it and be passed on.
  if (event.addRoutes) {
    event.waitUntil(
      event
        .addRoutes({
          condition: { requestDestination: "image" },
          source: "network"
        })
        .catch(() => {})
    );
  }

  event.waitUntil(
    caches
      .open(PRECACHE)
      .then(cache => cache.addAll([...PAGES, ...BUILD.files]))
      .then(() => self.skipWaiting())
  );
});

// Keeps the previous version's files as well as this one's: a tab opened on
// the last deploy still asks for that deploy's chunks (the PDF engine loads on
// demand), and they're no longer on the server.
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      // The app was called billsend, and its caches still carry that name: its
      // last precache counts as the previous version, its runtime cache goes.
      const older = names.filter(
        name =>
          (name.startsWith(PRECACHE_PREFIX) ||
            name.startsWith(LEGACY_PRECACHE_PREFIX)) &&
          name !== PRECACHE
      );

      // caches.keys() lists caches oldest first, so the last is the previous
      // version.
      await Promise.all(
        [
          ...older.slice(0, -1),
          ...names.filter(name => name === LEGACY_RUNTIME)
        ].map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.destination === "image") return;

  if (request.mode === "navigate") {
    if (PAGES.includes(url.pathname)) event.respondWith(servePage(event, url));

    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(serveBuiltFile(request));

    return;
  }

  // Only files: anything without an extension is left to the network.
  if (/\.[a-z0-9]+$/i.test(url.pathname) && url.pathname !== "/sw.js") {
    event.respondWith(serveFile(event, request));
  }
});

async function servePage(event, url) {
  const cache = await caches.open(PRECACHE);
  const cached = await cache.match(url.pathname);
  const refresh = fetch(url.pathname).then(response => {
    if (response.ok) cache.put(url.pathname, response.clone());

    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));

    return asNavigationResponse(cached);
  }

  return refresh;
}

// A page cached from a redirect can't answer a navigation, so it is copied
// into a fresh response first.
function asNavigationResponse(response) {
  if (!response.redirected) return response;

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

async function serveBuiltFile(request) {
  const cached =
    (await caches.match(request, { cacheName: PRECACHE })) ??
    (await caches.match(request));

  if (cached) return cached;

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response.clone());
  }

  return response;
}

async function serveFile(event, request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());

    return response;
  });

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));

    return cached;
  }

  return refresh;
}
