// app.js

console.log('App initialization environment successfully loaded.');

// Example: Initialize your game logic from game.js
// document.addEventListener('DOMContentLoaded', () => {
//    Game.init(); 
// });

// Example: Register the Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker Registered'));
}
