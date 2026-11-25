/* ============================================================
 * HARDWARE ANALYTICS — database-wide statistics for the
 * Dashboard tab: layer sizes, socket/VRAM distributions and
 * performance-per-dollar leaders, all computed live from the
 * bundled data layers (asOf/confidence shown per layer on the
 * Data sources view). Legacy and laptop parts are excluded
 * from the leader boards, matching the rankings default.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var $ = function (sel) { return document.querySelector(sel); };
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function barRows(box, rows, valFmt) {
    box.innerHTML = "";
    if (!rows.length) { box.innerHTML = '<p class="muted">No data.</p>'; return; }
    var maxV = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    rows.forEach(function (r) {
      var div = document.createElement("div");
      div.className = "db-row";
      var w = clamp(Math.round((r.v / maxV) * 100), 3, 100);
      div.innerHTML = '<span class="db-label"></span>' +
        '<span class="fps-bar db-bar"><span class="fps-fill" style="width:' + w + '%"></span></span>' +
        '<span class="db-val"></span>';
      div.querySelector(".db-label").textContent = r.k;
      div.querySelector(".db-val").textContent = valFmt ? valFmt(r) : r.v;
      box.appendChild(div);
    });
  }

  function glance() {
    var box = $("#anGlance");
    if (!box) return;
    var layers = [
      ["CPUs", BCP.cpus], ["GPUs", BCP.gpus], ["Motherboards", BCP.motherboards],
      ["Memory kits", BCP.memoryKits], ["PSUs", BCP.psus], ["Coolers", BCP.coolers],
      ["Storage", BCP.storage], ["Games", BCP.games], ["Software", BCP.software],
      ["Monitors", BCP.monitors]
    ];
    var legacyCpus = BCP.cpus.items.filter(function (c) { return c.legacy || c.mobile; }).length;
    var legacyGpus = BCP.gpus.items.filter(function (g) { return g.legacy || g.mobile; }).length;
    box.innerHTML = "";
    layers.forEach(function (l) {
      var n = l[1] && l[1].items ? l[1].items.length : 0;
      var d = document.createElement("div");
      d.className = "pw-stat";
      d.innerHTML = "<small></small><strong></strong>";
      d.querySelector("small").textContent = l[0];
      d.querySelector("strong").textContent = n;
      box.appendChild(d);
    });
    var note = $("#anGlanceNote");
    if (note) {
      note.textContent = "Includes " + legacyCpus + " legacy/laptop CPUs and " + legacyGpus +
        " legacy/laptop GPUs (estimated scores, excluded from leader boards below). Vintage per layer: see Data sources.";
    }
  }

  function sockets() {
    var counts = {};
    BCP.cpus.items.forEach(function (c) { counts[c.socket] = (counts[c.socket] || 0) + 1; });
    var rows = Object.keys(counts).map(function (k) { return { k: k === "BGA" ? "BGA (laptop)" : k, v: counts[k] }; });
    rows.sort(function (a, b) { return b.v - a.v; });
    barRows($("#anSockets"), rows);
  }

  function vram() {
    var buckets = [
      { k: "Under 6 GB", test: function (v) { return v < 6; } },
      { k: "6-8 GB", test: function (v) { return v >= 6 && v <= 8; } },
      { k: "10-12 GB", test: function (v) { return v >= 10 && v <= 12; } },
      { k: "16 GB", test: function (v) { return v === 16; } },
      { k: "20 GB+", test: function (v) { return v >= 20; } }
    ];
    var rows = buckets.map(function (b) {
      return { k: b.k, v: BCP.gpus.items.filter(function (g) { return b.test(g.vramGB); }).length };
    });
    barRows($("#anVram"), rows);
  }

  function leaders() {
    var gpuRows = BCP.gpus.items
      .filter(function (g) { return !g.legacy && !g.mobile && BCP.prices.gpu[g.id] && BCP.benchmarks.gpu[g.id]; })
      .map(function (g) {
        return { k: g.name, v: Math.round((BCP.benchmarks.gpu[g.id] / BCP.prices.gpu[g.id]) * 100) / 100 };
      })
      .sort(function (a, b) { return b.v - a.v; })
      .slice(0, 5);
    var cpuRows = BCP.cpus.items
      .filter(function (c) { return !c.legacy && !c.mobile && BCP.prices.cpu[c.id] && BCP.benchmarks.cpu[c.id]; })
      .map(function (c) {
        return { k: c.name, v: Math.round((BCP.benchmarks.cpu[c.id].gaming / BCP.prices.cpu[c.id]) * 100) / 100 };
      })
      .sort(function (a, b) { return b.v - a.v; })
      .slice(0, 5);
    var fmt = function (r) { return r.v.toFixed(2) + " pts/$"; };
    barRows($("#anGpuLeaders"), gpuRows, fmt);
    barRows($("#anCpuLeaders"), cpuRows, fmt);
  }

  function renderAnalytics() {
    if (!BCP.cpus || !BCP.gpus) return;
    glance();
    sockets();
    vram();
    leaders();
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "dash") {
        b.addEventListener("click", renderAnalytics);
      }
    });
    // If the dashboard is already visible (deep link), render now.
    var v = $("#viewDash");
    if (v && !v.classList.contains("hidden")) renderAnalytics();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
