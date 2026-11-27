/* Service worker: cache-first for the app's own static assets so the
 * tool works offline. Data is bundled in the JS files, so the whole
 * calculator keeps working without a connection. */
var CACHE = "bcp-v20261127o";
var ASSETS = [
  "./",
  "index.html",
  "css/styles.css?v=20261127o",
  "js/data/hardware.js?v=20261127o",
  "js/data/benchmarks.js?v=20261127o",
  "js/data/prices.js?v=20261127o",
  "js/data/games.js?v=20261127o",
  "js/data/compat.js?v=20261127o",
  "js/data/components.js?v=20261127o",
  "js/data/cooling-cases.js?v=20261127o",
  "js/data/storage.js?v=20261127o",
  "js/data/software.js?v=20261127o",
  "js/data/monitors.js?v=20261127o",
  "js/engine.js?v=20261127o",
  "js/app.js?v=20261127o",
  "js/assistant.js?v=20261127o",
  "js/compare.js?v=20261127o",
  "js/upgrade.js?v=20261127o",
  "js/power.js?v=20261127o",
  "js/library.js?v=20261127o",
  "js/monitors.js?v=20261127o",
  "js/prices-live.js?v=20261127o",
  "js/review.js?v=20261127o",
  "js/hub.js?v=20261127o",
  "js/budget.js?v=20261127o",
  "js/lab.js?v=20261127o",
  "js/search.js?v=20261127o",
  "js/qr.js?v=20261127o",
  "js/reports.js?v=20261127o",
  "js/alerts.js?v=20261127o",
  "js/advisor.js?v=20261127o",
  "js/charts.js?v=20261127o",
  "js/smart.js?v=20261127o",
  "js/data/prices-live.js?v=20261127o",
  "js/dashboard.js?v=20261127o",
  "js/personal.js?v=20261127o",
  "js/auth.js?v=20261127o",
  "js/community.js?v=20261127o",
  "js/analytics.js?v=20261127o",
  "js/export.js?v=20261127o",
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
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (wins) {
        // A new worker means a new deploy: reload every open tab once so no
        // page keeps running stale HTML against fresh CSS/JS.
        return Promise.all(wins.map(function (w) {
          return w.navigate(w.url).catch(function () {});
        }));
      })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Only handle same-origin requests; let the network handle the rest
  // (fonts, AI API calls).
  if (url.origin !== location.origin) return;

  // Page navigations: network-first so deploys show up immediately,
  // falling back to the cached shell when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("index.html");
        });
      })
    );
    return;
  }

  // Versioned static assets (?v=...): immutable per deploy, cache-first.
  if (url.search.indexOf("v=") > -1) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
          return resp;
        });
      })
    );
    return;
  }

  // Anything else same-origin: network with cache fallback.
  e.respondWith(
    fetch(e.request).catch(function () { return caches.match(e.request); })
  );
});
