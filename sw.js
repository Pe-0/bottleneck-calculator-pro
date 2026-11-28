/* Service worker: cache-first for the app's own static assets so the
 * tool works offline. Data is bundled in the JS files, so the whole
 * calculator keeps working without a connection. */
var CACHE = "bcp-v20261127r";
var ASSETS = [
  "./",
  "index.html",
  "css/styles.css?v=20261127r",
  "js/data/hardware.js?v=20261127r",
  "js/data/benchmarks.js?v=20261127r",
  "js/data/prices.js?v=20261127r",
  "js/data/games.js?v=20261127r",
  "js/data/compat.js?v=20261127r",
  "js/data/components.js?v=20261127r",
  "js/data/cooling-cases.js?v=20261127r",
  "js/data/storage.js?v=20261127r",
  "js/data/software.js?v=20261127r",
  "js/data/monitors.js?v=20261127r",
  "js/engine.js?v=20261127r",
  "js/app.js?v=20261127r",
  "js/assistant.js?v=20261127r",
  "js/compare.js?v=20261127r",
  "js/upgrade.js?v=20261127r",
  "js/power.js?v=20261127r",
  "js/library.js?v=20261127r",
  "js/monitors.js?v=20261127r",
  "js/prices-live.js?v=20261127r",
  "js/review.js?v=20261127r",
  "js/hub.js?v=20261127r",
  "js/budget.js?v=20261127r",
  "js/lab.js?v=20261127r",
  "js/search.js?v=20261127r",
  "js/qr.js?v=20261127r",
  "js/reports.js?v=20261127r",
  "js/alerts.js?v=20261127r",
  "js/advisor.js?v=20261127r",
  "js/charts.js?v=20261127r",
  "js/smart.js?v=20261127r",
  "js/data.js?v=20261127r",
  "js/builds.js?v=20261127r",
  "js/ux.js?v=20261127r",
  "js/data/prices-live.js?v=20261127r",
  "js/dashboard.js?v=20261127r",
  "js/personal.js?v=20261127r",
  "js/auth.js?v=20261127r",
  "js/community.js?v=20261127r",
  "js/analytics.js?v=20261127r",
  "js/export.js?v=20261127r",
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
