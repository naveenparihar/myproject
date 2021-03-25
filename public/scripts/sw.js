// var CACHE_NAME = 'my-site-cache-v1';
// var urlsToCache = [
//   '/',
//   '/styles/main.css',
//   '/script/main.js'
// ];

self.addEventListener('install', function(event) {
  // Perform install steps
//   event.waitUntil(
//     caches.open(CACHE_NAME)
//       .then(function(cache) {
//         console.log('Opened cache');
//         return cache.addAll(urlsToCache);
//       })
//   );
console.log('SW Installed at', new Date().toLocaleTimeString())
});

self.addEventListener('activate', function(event) {
    // Perform install steps
  //   event.waitUntil(
  //     caches.open(CACHE_NAME)
  //       .then(function(cache) {
  //         console.log('Opened cache');
  //         return cache.addAll(urlsToCache);
  //       })
  //   );
  console.log('SW Activated at', new Date().toLocaleTimeString())
  });