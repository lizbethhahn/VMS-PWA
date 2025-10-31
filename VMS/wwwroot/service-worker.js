const VERSION = 'v42';  // Increment version to trigger an update
const CACHE_NAME = `vms-cache-${VERSION}`;
const CACHE_PREFIX = 'vms-cache-';   // for cleanup
console.log(`[SW] Boot ${VERSION}`);

self.addEventListener('install', (event) => {
    console.log(`[SW] install ${VERSION}`);
   
    event.waitUntil(
        (async () => {
            const c = await caches.open(CACHE_NAME);
            await c.addAll([
                '/manifest.webmanifest',
                '/favicon.png',
                '/icons/icon-192.png',
                '/icons/icon-512.png',
                '/offline-test-page.html',
                '/app.css',
                '/VMS.styles.css'
            ]);
            self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    console.log(`[SW] activate ${VERSION}`);
    event.waitUntil(
        (async () => {
            // Clean old caches
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            );
            await self.clients.claim(); 
        })()
    );
});

// Helpers
async function networkFirst(req) {
    try {
        const fresh = await fetch(req, { cache: 'no-store' });
        // Update cache in background
        const c = await caches.open(CACHE_NAME);
        c.put(req, fresh.clone());
        return fresh;
    } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // As a last resort for navigation requests, try the offline page
        if (req.mode === 'navigate') {
            const offline = await caches.match('/offline-test-page.html');
            if (offline) return offline;
        }
        throw new Error('NetworkFirst: no network and no cache');
    }
}

async function cacheFirst(req) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const c = await caches.open(CACHE_NAME);
    c.put(req, fresh.clone());
    return fresh;
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin) return;

    // Always prefer server for the app shell entry and boot manifest
    if (url.pathname === '/' ||
        url.pathname.endsWith('/index.html') ||
        url.pathname.endsWith('/_framework/blazor.boot.json')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Framework & critical assets → network-first to avoid SRI mismatches on new builds
    if (url.pathname.startsWith('/_framework/') ||
        url.pathname.endsWith('.dll') ||
        url.pathname.endsWith('.wasm') ||
        url.pathname.endsWith('.pdb')
    ) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Other static assets → cache-first
    if (url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.webp')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Default: try cache-first for same-origin GETs; fall back to network
    if (event.request.method === 'GET') {
        event.respondWith(cacheFirst(event.request));
    }
});
