/* =============================================================
   SW.JS · "Service worker": hace que la app funcione sin internet
   -------------------------------------------------------------
   La primera vez que abres la app con conexión, este archivo
   guarda una copia de todos los archivos en el móvil (la "caché").
   Después, aunque no haya internet, la app se abre desde esa copia.

   IMPORTANTE: cada vez que cambies archivos de la app, sube el
   número de VERSION. Así los móviles descargan la versión nueva.
   ============================================================= */

const VERSION = 'tranvia-v6';

// Archivos que forman la app (el "esqueleto")
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/ui.js',
  './js/db.js',
  './js/graficos.js',
  './js/ejercicios.js',
  './js/datos-ejemplo.js',
  './js/app.js',
  './js/vistas/inicio.js',
  './js/vistas/plantilla.js',
  './js/vistas/entrenos.js',
  './js/vistas/partidos.js',
  './js/vistas/pizarra.js',
  './js/vistas/evolucion.js',
  './js/asistente.js',
  './js/ia.js',
  './js/vistas/asistente.js',
  './js/vistas/ajustes.js',
  './js/nube.js',
  './assets/icons/escudo-512.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
];

// 1. INSTALAR: guardamos los archivos en la caché
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

// 2. ACTIVAR: borramos las cachés de versiones antiguas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

// 3. PEDIR ARCHIVOS: primero intentamos internet (para tener siempre lo último)
//    y si no hay conexión, usamos la copia guardada.
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);

  // Tipografías de Google: usamos la copia guardada y la actualizamos en segundo plano
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    evento.respondWith(
      caches.open(VERSION + '-fuentes').then(async (cache) => {
        const guardada = await cache.match(peticion);
        const red = fetch(peticion).then((r) => { cache.put(peticion, r.clone()); return r; }).catch(() => guardada);
        return guardada || red;
      })
    );
    return;
  }

  // Solo gestionamos archivos de nuestra propia web
  if (url.origin !== location.origin) return;

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        // Actualizamos la copia guardada con la versión recién descargada
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(async () => {
        // Sin conexión: tiramos de la copia
        const guardada = await caches.match(peticion, { ignoreSearch: true });
        return guardada || (peticion.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      })
  );
});
