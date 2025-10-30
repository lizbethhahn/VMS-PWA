const VERSION = 'v33';
const CACHE_NAME = `vms-cache-${VERSION}`;
console.log(`[SW] Boot ${VERSION}`);

/** @type {string[]} */
const PRECACHE_URLS = [
    "/offline-test-page.html",
    "/favicon.png",  
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// INSTALL: precache and take control
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);          
        await cache.addAll(PRECACHE_URLS);                  
    })());
});

// ACTIVATE: clean old caches, enable preload, claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.map(n => (n === CACHE_NAME ? Promise.resolve() : caches.delete(n)))
        );
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
        await self.clients.claim();
        console.log('Service Worker: Active');
    })());
});

/** @param {FetchEvent} event */
self.addEventListener('fetch', (event) => {
    // 1) Offline fallback for favicon.ico (serve cached PNG)
    const url = new URL(event.request.url);
    if (url.pathname === '/favicon.ico') {
        event.respondWith((async () => {
            try {
                // try network first
                return await fetch(event.request);
            } catch {
                // offline: serve cached PNG as a stand-in
                const cache = await caches.open(CACHE_NAME); 
                const png = await cache.match('/favicon.png');
                if (png) {
                    const blob = await png.blob();
                    return new Response(blob, { headers: { 'Content-Type': 'image/png' } });
                }
                return Response.error();
            }
        })());
        return;
    }

    // 2) Your existing NAVIGATION handler (unchanged)
    if (event.request.mode !== 'navigate') return;

    event.respondWith((async () => {
        try {
            const preload = await event.preloadResponse;
            if (preload) return preload;
            const resp = await fetch(event.request);
            if (resp && resp.ok) return resp;
        } catch { }
        const cache = await caches.open(CACHE_NAME);
        const offline = await cache.match('/offline-test-page.html');
        return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })());
});