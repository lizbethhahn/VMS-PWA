(async () => {
    const isSecure =
        window.isSecureContext ||
        location.protocol === 'https:' ||
        ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

    if (!('serviceWorker' in navigator) || !isSecure) return;

    // Read version from service-worker.js 
    let swVersion = 'dev';
    try {
        const swText = await fetch('/service-worker.js', { cache: 'no-store' }).then(r => r.text());
        const m = swText.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (m) swVersion = m[1];
        console.log(`[SW REG] Detected ${swVersion}`);
    } catch { /* keep 'dev' */ }

    const RELOAD_FLAG = 'sw-reloaded-once';

    window.addEventListener('load', async () => {
        const reg = await navigator.serviceWorker.register(`/service-worker.js?v=${swVersion}`, {
            updateViaCache: 'none',
            scope:'/'
        });
        try { await reg.update(); } catch { }

        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!reloaded && !sessionStorage.getItem(RELOAD_FLAG)) {
                reloaded = true;
                sessionStorage.setItem(RELOAD_FLAG, '1');
                location.reload();
            }
        });

        window.addEventListener('pageshow', () => {
            sessionStorage.removeItem(RELOAD_FLAG);
        });
    });
})();
