// VMS PWA Service Worker — dev app-shell
const VERSION = 'v26';
const CACHE_NAME = `vms-cache-${VERSION}`;
console.log(`[SW] Boot ${VERSION}`);


// Keep this list conservative for dev; we'll grow it later as needed
const PRECACHE_URLS = [
    "/",                        // app shell entry
    "/offline-test-page.html",  // friendly offline page
    "/manifest.webmanifest",
    "/favicon.png",
    "/_framework/blazor.webassembly.js",
    "/_content/MudBlazor/MudBlazor.min.css",
    "/_content/MudBlazor/MudBlazor.min.js",
    "/app.css",
    "/VMS.styles.css"
];

// FETCH: navigations (SPA) + static assets only (no APIs)
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    if (url.pathname === "/manifest.webmanifest") {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const hit = await cache.match("/manifest.webmanifest");
            if (hit) return hit;
            try {
                const res = await fetch(req);
                if (res && res.ok) cache.put("/manifest.webmanifest", res.clone()).catch(() => { });
                return res;
            } catch {
                // As a last resort, return a tiny valid manifest so the console stays clean
                const fallback = { name: "VMS", short_name: "VMS", start_url: "/", display: "standalone" };
                return new Response(JSON.stringify(fallback), {
                    status: 200,
                    headers: { "Content-Type": "application/manifest+json" }
                });
            }
        })());
        return;
    }

    // 1) SPA navigations — race network vs. cached shell (instant fallback)
    if (req.mode === "navigate") {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);

            // if preload is available, it wins
            try {
                const preload = await event.preloadResponse;
                if (preload) return preload;
            } catch { }

            // network request (will win if it completes quickly)
            const netPromise = (async () => {
                const res = await fetch(req);
                if (res && res.ok) return res;
                throw new Error("net not ok");
            })();

            // timeout -> serve cached shell to avoid spinner
            const timeoutPromise = new Promise(async (resolve) => {
                setTimeout(async () => resolve(await cache.match("/")), 1200);
            });

            // try network vs timeout; fall back to shell/offline
            try {
                const winner = await Promise.race([netPromise, timeoutPromise]);
                if (winner) return winner;
                const shell = await cache.match("/");
                return shell || new Response("Offline", { status: 503 });
            } catch {
                const shell = await cache.match("/");
                return shell || new Response("Offline", { status: 503 });
            }
        })());
        return;
    }


    // 2) Static asset predicate (same-origin + file-like paths)
    const isSameOrigin = url.origin === self.location.origin;
    const isStatic =
        isSameOrigin && (
            url.pathname.startsWith("/_framework/") ||
            url.pathname.startsWith("/_content/") ||
            /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2|wasm|json|map)$/i.test(url.pathname)
        );

    if (req.method === "GET" && isStatic) {
        // network-first for freshness; fallback to cache for offline
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const res = await fetch(req);
                if (res && res.ok) {
                    cache.put(req, res.clone()).catch(() => { });
                    return res;
                }
                // bad response -> try cache
                const hit = await cache.match(req);
                if (hit) return hit;
                return res; // will surface the server error
            } catch {
                const hit = await cache.match(req);
                return hit || new Response("", { status: 504 });
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
        try {
            const bootReq = new Request("/_framework/blazor.boot.json", { cache: "reload" });
            const bootResp = await fetch(bootReq);
            if (bootResp.ok) {
                const boot = await bootResp.json();
                const toCache = new Set();

                const addDict = (dict) => {
                    if (!dict) return;
                    for (const name of Object.keys(dict)) toCache.add(`/_framework/${name}`);
                };

                addDict(boot.resources?.runtime);
                addDict(boot.resources?.assembly);
                addDict(boot.resources?.pdb);
                addDict(boot.resources?.icu);
                addDict(boot.resources?.wasmNative);
                addDict(boot.resources?.runtimeAssets);

                const sats = boot.resources?.satelliteResources;
                if (sats) for (const culture of Object.keys(sats)) addDict(sats[culture]);

                for (const fwUrl of toCache) {
                    try {
                        const resp = await fetch(new Request(fwUrl, { cache: "reload" }));
                        if (resp && resp.ok) {
                            await cache.put(fwUrl, resp.clone());
                            console.log("[SW] precached framework:", fwUrl);
                        } else {
                            console.warn("[SW] skip (not ok):", fwUrl, resp?.status, resp?.statusText);
                        }
                    } catch (err) {
                        console.warn("[SW] failed framework fetch:", fwUrl, err?.message || err);
                    }
                }
            } else {
                console.warn("[SW] blazor.boot.json not OK:", bootResp.status, bootResp.statusText);
            }
        } catch (e) {
            console.warn("[SW] could not precache boot manifest:", e?.message || e);
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
