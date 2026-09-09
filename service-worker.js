const CACHE_NAME = 'pduam-routine-v6';

const APP_SHELL = [
  './',
  './index.html',
  './notices.html',
  './curriculum.html',
  './exam.html',
  './github-files.js',
  './manifest.json',
  './rusa.jpg',
  './rusa-192.png',
  './rusa-512.png',
  './cl-form.pdf'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Add files individually (not cache.addAll) so one missing/renamed
      // file — like a notice PDF that hasn't been uploaded yet — doesn't
      // block the whole offline cache from being set up.
      return Promise.all(
        APP_SHELL.map(function(url) {
          return cache.add(url).catch(function(error) {
            console.warn('Could not precache', url, error);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // Live routine data (Google Sheets) and notices (GitHub API/files):
  // try the network first so content stays fresh, but fall back to the
  // last successful copy if offline.
  if (
    url.indexOf('docs.google.com') !== -1 ||
    url.indexOf('api.github.com') !== -1 ||
    url.indexOf('raw.githubusercontent.com') !== -1
  ) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
    return;
  }

  // App shell (HTML/CSS/JS/icons): serve from cache first, network as backup.
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
