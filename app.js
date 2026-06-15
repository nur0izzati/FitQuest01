// app.js
console.log('App initialization environment successfully loaded.');

// Register the Service Worker using relative pathing
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js') // ⬅️ FIXED: Added the dot '.' for safe path routing
            .then(reg => console.log('FitQuest PWA Setup: Service Worker active!', reg.scope))
            .catch(err => console.error('FitQuest PWA Setup: Registration failed.', err));
    });
}
