// Register the service worker (works on https and localhost)

(async () => {
    const url = `/service-worker.js?ts=${Date.now()}`;   // bust cache each load
    const reg = await navigator.serviceWorker.register(url, { scope: '/' });

    // ensure it checks for updates immediately
    try { await reg.update(); } catch { }

    console.log('SW registered:', reg.scope);
})();

