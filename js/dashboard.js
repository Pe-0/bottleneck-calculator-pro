/* ============================================================
 * DASHBOARD — analytics view of the current Calculator build:
 * cost breakdown, performance radar, bottleneck by resolution,
 * power overview. All charts drawn from existing data layers.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };
  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function costBreakdown(sel) {
    var parts = [
      ["CPU", BCP.prices.cpu[sel.cpu.id]],
      ["GPU", BCP.prices.gpu[sel.gpu.id]],
      ["Motherboard", sel.mobo ? sel.mobo.priceUSD : null],
      ["Memory", sel.ram ? sel.ram.priceUSD : null],
      ["PSU", sel.psu ? sel.psu.priceUSD : null],
      ["Cooler", sel.cooler ? sel.cooler.priceUSD : null],
      ["Storage", sel.storage ? sel.storage.priceUSD : null]
    ];
    var total = parts.reduce(function (s, p) { return s + (p[1] || 0); }, 0);
    var box = $("#dbCost");
    box.innerHTML = "";
    if (!total) { box.innerHTML = '<p class="muted">No priced parts in the current selection.</p>'; return; }
    var maxP = Math.max.apply(null, parts.map(function (p) { return p[1] || 0; }));
    parts.forEach(function (p) {
      var div = document.createElement("div");
      div.className = "db-row";
      if (p[1] === null || p[1] === undefined) {
        div.innerHTML = '<span class="db-label"></span><span class="muted">—</span>';
        div.querySelector(".db-label").textContent = p[0];
      } else {
        var pct = Math.round((p[1] / total) * 100);
        var w = clamp(Math.round((p[1] / maxP) * 100), 3, 100);
        div.innerHTML = '<span class="db-label"></span>' +
          '<span class="fps-bar db-bar"><span class="fps-fill" style="width:' + w + '%"></span></span>' +
          '<span class="db-val">' + fmtUsd(p[1]) + ' · ' + pct + "%</span>";
        div.querySelector(".db-label").textContent = p[0];
      }
      box.appendChild(div);
    });
    var t = document.createElement("div");
    t.className = "db-total";
    t.innerHTML = "<span>Total</span><strong></strong>";
    t.querySelector("strong").textContent = fmtUsd(total);
    box.appendChild(t);
  }

  function radar(sel) {
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id] || { gaming: 0, productivity: 0 };
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id] || 0;
    var axes = [
      ["CPU gaming", clamp(cpuBench.gaming, 0, 120) / 1.2],
      ["CPU multi-core", clamp(cpuBench.productivity, 0, 110) / 1.1],
      ["GPU raster", clamp(gpuScore, 0, 110) / 1.1],
      ["Memory speed", sel.ram ? clamp(sel.ram.speedMTs / 7200 * 100, 0, 100) : 0],
      ["Storage speed", sel.storage ? clamp(sel.storage.readMBs / 12400 * 100, 0, 100) : 0],
      ["PSU headroom", (function () {
        if (!sel.psu) return 0;
        var rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW);
        return clamp((sel.psu.wattageW / rec - 0.8) / 0.7 * 100, 0, 100);
      })()]
    ];
    var N = axes.length, cx = 110, cy = 100, R = 72;
    function pt(i, frac) {
      var a = (Math.PI * 2 * i) / N - Math.PI / 2;
      return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac];
    }
    var svg = "";
    [0.33, 0.66, 1].forEach(function (ring) {
      var pts = [];
      for (var i = 0; i < N; i++) pts.push(pt(i, ring).join(","));
      svg += '<polygon points="' + pts.join(" ") + '" class="db-radar-ring" />';
    });
    for (var j = 0; j < N; j++) {
      var p = pt(j, 1);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" class="db-radar-axis" />';
      var lp = pt(j, 1.22);
      svg += '<text x="' + lp[0] + '" y="' + lp[1] + '" class="db-radar-label" text-anchor="middle">' + axes[j][0] + "</text>";
    }
    var vpts = axes.map(function (a, i) { return pt(i, clamp(a[1], 0, 100) / 100).join(","); });
    svg += '<polygon points="' + vpts.join(" ") + '" class="db-radar-val" />';
    $("#dbRadar").innerHTML = '<svg viewBox="0 0 220 200" class="db-radar">' + svg + "</svg>";
    if (!sel.ram || !sel.storage) {
      $("#dbRadarNote").textContent = "Unspecified parts score 0 on their axis - pick memory and storage on the Calculator tab for a full shape.";
    } else {
      $("#dbRadarNote").textContent = "";
    }
  }

  function bnByRes(sel) {
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var box = $("#dbBn");
    box.innerHTML = "";
    [["p1080", "1080p"], ["p1440", "1440p"], ["p2160", "4K"]].forEach(function (r) {
      var bn = eng.bottleneck(cpuBench, gpuScore, r[0], sel.workload, sel.cpu);
      var div = document.createElement("div");
      div.className = "db-row";
      var cls = bn.limiter === "cpu" && bn.pct >= 25 ? "fill-bad" : bn.pct >= 15 ? "fill-mid" : "";
      div.innerHTML = '<span class="db-label">' + r[1] + "</span>" +
        '<span class="fps-bar db-bar"><span class="fps-fill ' + cls + '" style="width:' + clamp(bn.pct, 3, 100) + '%"></span></span>' +
        '<span class="db-val">' + bn.pct + "% " + (bn.limiter === "balanced" ? "balanced" : bn.limiter + "-limited") + "</span>";
      box.appendChild(div);
    });
    var note = document.createElement("p");
    note.className = "muted cmp-note";
    note.textContent = "Same pair, three resolutions: the higher the resolution, the more the GPU carries the load. Workload: " + eng.WORKLOADS[sel.workload].label + ".";
    box.appendChild(note);
  }

  function powerOverview(sel) {
    var other = 40 + (sel.ram ? sel.ram.modules * 4 : 8) + (sel.storage && sel.storage.interface === "SATA" ? 4 : 8) + (sel.cooler && sel.cooler.type === "AIO" ? 14 : 6);
    var idle = Math.round(35 + (sel.cpu.tdpW + sel.gpu.tdpW) * 0.08);
    var gaming = Math.round(sel.cpu.tdpW * 0.85 + sel.gpu.tdpW * 0.9 + other);
    var peak = sel.cpu.tdpW + sel.gpu.tdpW + other + Math.round(sel.gpu.tdpW * 0.15);
    var rows = [["Idle", idle], ["Gaming", gaming], ["Peak", peak]];
    var box = $("#dbPower");
    box.innerHTML = "";
    rows.forEach(function (r) {
      var div = document.createElement("div");
      div.className = "db-row";
      div.innerHTML = '<span class="db-label">' + r[0] + "</span>" +
        '<span class="fps-bar db-bar"><span class="fps-fill" style="width:' + clamp(Math.round((r[1] / peak) * 100), 3, 100) + '%"></span></span>' +
        '<span class="db-val">~' + r[1] + "W</span>";
      box.appendChild(div);
    });
  }

  function renderAll() {
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    $("#dbBuildLine").textContent = sel.cpu.name + " + " + sel.gpu.name + " (from the Calculator tab)";
    costBreakdown(sel);
    radar(sel);
    bnByRes(sel);
    powerOverview(sel);
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "dash") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          ["viewCalc", "viewCompare", "viewUpgrade", "viewPower", "viewGames"].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.classList.add("hidden");
          });
          $("#viewDash").classList.remove("hidden");
          window.scrollTo(0, 0);
          renderAll();
        });
      } else {
        b.addEventListener("click", function () { var v = $("#viewDash"); if (v) v.classList.add("hidden"); });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
