// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Active:', reg.scope))
      .catch(err => console.log('Service Worker Crashed:', err));
  });
}

// PWA Direct Installation Banner Logic
let deferredPrompt;
const installBtn = document.getElementById('install-pwa-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';

  installBtn.addEventListener('click', () => {
    installBtn.style.display = 'none';
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') console.log('User installed game shell.');
      deferredPrompt = null;
    });
  });
});

window.addEventListener('appinstalled', () => {
  installBtn.style.display = 'none';
});
