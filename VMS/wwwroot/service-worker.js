// VMS PWA Service Worker (basic cache-first setup)
self.addEventListener("install", event => {
    console.log("Service Worker: Installed");
    event.waitUntil(
        caches.open("vms-cache-v1").then(cache => {
            return cache.addAll([
                "/",                     // root
                "/manifest.webmanifest", // manifest
                "/icons/icon-512.png"    // example asset
            ]);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener("activate", () => {
    console.log("Service Worker: Active");
});
