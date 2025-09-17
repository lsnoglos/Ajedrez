// sw.js (Service Worker)

const CACHE_NAME = 'ajedrez-lr-v1'; // Cambia v1 a v2, v3, etc., cada vez que actualices tus archivos

// Lista de archivos esenciales para que el juego funcione offline
const urlsToCache = [
    '/', // Esto representa el index.html
    'index.html',
    'style.css',
    'script.js',
    // IMPORTANTE: Añade aquí la ruta a TODOS tus assets (sonidos, imágenes, etc.)
    'assets/back_audio1.mp3',
    'assets/back_audio2.mp3',
    'assets/win.mp3',
    'assets/move.wav',
    'assets/hit.mp3',
    'assets/icono.png' 
];

// Evento de Instalación: Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache); // Descarga y guarda todos los archivos
            })
    );
});

// Evento Fetch: Se dispara cada vez que la página pide un archivo (CSS, JS, imagen, etc.)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si el archivo está en el caché, lo devuelve desde ahí.
                if (response) {
                    return response;
                }
                // Si no está en el caché, lo busca en internet.
                return fetch(event.request);
            })
    );
});
