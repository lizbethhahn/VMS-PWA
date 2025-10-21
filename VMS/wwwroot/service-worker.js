// VMS PWA Service Worker — dev app-shell
const VERSION = 'v15';
const CACHE_NAME = `vms-cache-${VERSION}`;
console.log(`[SW] Boot ${VERSION}`);


// Keep this list conservative for dev; we'll grow it later as needed
const PRECACHE_URLS = [
    "/",                        // app shell entry
    "/offline-test-page.html",  // friendly offline page
    "/manifest.webmanifest",
    "/favicon.png"
];

// --- FETCH HANDLER (must be defined at top-level immediately) ---
self.addEventListener("fetch", (event) => {
    const req = event.request;

    // 1) Handle SPA navigations with network-first, then shell '/', then offline page
    if (req.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const preload = await event.preloadResponse;
                if (preload) return preload;

                const net = await fetch(req);
                if (net && net.ok) return net;
            } catch { /* offline */ }

            const cache = await caches.open(CACHE_NAME);
            const shell = await cache.match("/");
            if (shell) return shell;

            const offline = await cache.match("/offline-test-page.html");
            return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        })());
        return;
    }

    // 2) For same-origin GETs (css/js/img/etc): network-first, fall back to cache
    if (req.method === "GET" && new URL(req.url).origin === self.location.origin) {
        event.respondWith((async () => {
            try {
                const res = await fetch(req);
                // Cache a clone for future offline use
                const cache = await caches.open(CACHE_NAME);
                cache.put(req, res.clone()).catch(() => { });
                return res;
            } catch {
                const cache = await caches.open(CACHE_NAME);
                const hit = await cache.match(req);
                if (hit) return hit;
                // last resort: generic offline
                return new Response("", { status: 504 });
            }
        })());
    }
});

// --- INSTALL: precache baseline and take control ---
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        for (const url of PRECACHE_URLS) {
            try {
                const resp = await fetch(new Request(url, { cache: "reload" }));
                if (!resp || !resp.ok) throw new Error(`HTTP ${resp?.status} ${resp?.statusText}`);
                await cache.put(url, resp.clone());
                console.log("[SW] precached:", url);
            } catch (err) {
                console.error("[SW] FAILED to precache:", url, err);
            }
        }
    })());
});

// --- ACTIVATE: clean old caches, enable preload, claim clients ---
self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.map(n => (n === CACHE_NAME ? Promise.resolve() : caches.delete(n))));
        if (self.registration.navigationPreload) {
            try { await self.registration.navigationPreload.enable(); } catch { }
        }
        await self.clients.claim();
        console.log("[SW] Active");
    })());
});
