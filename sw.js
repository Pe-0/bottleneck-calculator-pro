/* Service worker: cache-first for the app's own static assets so the
 * tool works offline. Data is bundled in the JS files, so the whole
 * calculator keeps working without a connection. */
var CACHE = "bcp-v20261125d";
var ASSETS = [
  "./",
  "index.html",
  "css/styles.css?v=20261125d",
  "js/data/hardware.js?v=20261125d",
  "js/data/benchmarks.js?v=20261125d",
  "js/data/prices.js?v=20261125d",
  "js/data/games.js?v=20261125d",
  "js/data/compat.js?v=20261125d",
  "js/data/components.js?v=20261125d",
  "js/data/cooling-cases.js?v=20261125d",
  "js/data/storage.js?v=20261125d",
  "js/data/software.js?v=20261125d",
  "js/data/monitors.js?v=20261125d",
  "js/engine.js?v=20261125d",
  "js/app.js?v=20261125d",
  "js/assistant.js?v=20261125d",
  "js/compare.js?v=20261125d",
  "js/upgrade.js?v=20261125d",
  "js/power.js?v=20261125d",
  "js/library.js?v=20261125d",
  "js/monitors.js?v=20261125d",
  "js/dashboard.js?v=20261125d",
  "js/personal.js?v=20261125d",
  "js/export.js?v=20261125d",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Only handle same-origin requests; let the network handle the rest
  // (fonts, AI API calls).
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok && url.pathname.indexOf("/bottleneck-calculator-pro/") === 0) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      });
    })
  );
});
