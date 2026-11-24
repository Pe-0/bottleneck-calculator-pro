/* ============================================================
 * UPGRADE ADVISOR — ranked upgrade paths from the current build
 * Pure logic over the existing data layers + engine. Compares the
 * current CPU/GPU against every candidate in the database, priced
 * with platform-change costs when a CPU upgrade crosses sockets.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };

  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }
  function hw(items, id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Estimated average FPS across the game database for a pair.
  function avgFps(cpuBench, gpuScore, resKey, workloadKey) {
    var sum = 0, n = 0;
    BCP.games.items.forEach(function (g) {
      sum += eng.gameFps(g, cpuBench.gaming, gpuScore, resKey, workloadKey); n++;
    });
    return n ? sum / n : 0;
  }

  // Cheapest board + 32GB kit for a socket (platform-change cost).
  function platformCost(socket) {
    var boards = BCP.motherboards.items.filter(function (m) { return m.socket === socket; });
    if (!boards.length) return null;
    boards.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    var board = boards[0];
    var kits = BCP.memoryKits.items.filter(function (k) { return k.type === board.ramType && k.capacityGB >= 32; });
    kits.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    var kit = kits[0] || null;
    return { board: board, kit: kit, cost: board.priceUSD + (kit ? kit.priceUSD : 0) };
  }

  var upState = { cpuId: "r5-5600", gpuId: "rtx-3060", res: "p1440", workload: "gaming", budget: 0 };

  // What an upgrade buys depends on the workload: gaming/streaming
  // measure average FPS across the game DB; productivity measures
  // the multi-core (CPU) or raster (GPU) score instead.
  function metricNow() {
    var cb = BCP.benchmarks.cpu[upState.cpuId];
    var gs = BCP.benchmarks.gpu[upState.gpuId];
    if (!cb || !gs) return null;
    if (upState.workload === "productivity") return { cpu: cb.productivity, gpu: gs, unit: "pts" };
    return { fps: avgFps(cb, gs, upState.res, upState.workload), unit: "fps" };
  }

  function gpuUpgrades(benchNow) {
    var prod = upState.workload === "productivity";
    var cur = BCP.benchmarks.gpu[upState.gpuId];
    var now = metricNow();
    var out = [];
    BCP.gpus.items.forEach(function (g) {
      if (g.id === upState.gpuId) return;
      var score = BCP.benchmarks.gpu[g.id];
      var price = BCP.prices.gpu[g.id];
      if (!score || !price) return;
      var gain = prod ? score - now.gpu : avgFps(benchNow, score, upState.res, upState.workload) - now.fps;
      if (gain <= 0.5) return;
      if (upState.budget && price > upState.budget) return;
      var bn = eng.bottleneck(benchNow, score, upState.res, upState.workload, hw(BCP.cpus.items, upState.cpuId));
      var recPsu = eng.recommendedPsuW(hw(BCP.cpus.items, upState.cpuId).tdpW, g.tdpW);
      out.push({ item: g, price: price, after: prod ? score : avgFps(benchNow, score, upState.res, upState.workload),
                 gain: gain, pct: bn.pct, limiter: bn.limiter, unit: now.unit,
                 value: gain / price * 100, note: g.tdpW >= 300 ? "Needs " + recPsu + "W+ PSU and an ATX 3.x unit with native 12V-2x6" : "Recommended PSU: " + recPsu + "W" });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  function cpuUpgrades(gpuScoreNow) {
    var prod = upState.workload === "productivity";
    var now = metricNow();
    var out = [];
    var curCpu = hw(BCP.cpus.items, upState.cpuId);
    BCP.cpus.items.forEach(function (c) {
      if (c.id === upState.cpuId) return;
      var bench = BCP.benchmarks.cpu[c.id];
      var price = BCP.prices.cpu[c.id];
      if (!bench || !price) return;
      var sameSocket = c.socket === curCpu.socket;
      var plat = sameSocket ? null : platformCost(c.socket);
      if (!sameSocket && !plat) return;
      var cost = price + (plat ? plat.cost : 0);
      var gain = prod ? bench.productivity - now.cpu : avgFps(bench, gpuScoreNow, upState.res, upState.workload) - now.fps;
      if (gain <= 0.5) return;
      if (upState.budget && cost > upState.budget) return;
      var bn = eng.bottleneck(bench, gpuScoreNow, upState.res, upState.workload, c);
      out.push({ item: c, price: price, plat: plat, cost: cost,
                 after: prod ? bench.productivity : avgFps(bench, gpuScoreNow, upState.res, upState.workload),
                 gain: gain, pct: bn.pct, limiter: bn.limiter, unit: now.unit,
                 value: gain / cost * 100,
                 note: sameSocket ? "Drop-in upgrade on your " + c.socket + " board"
                                  : "Platform change: price includes " + plat.board.name + (plat.kit ? " + " + plat.kit.name : "") });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  function cardHtml(u, kind) {
    var costTxt = kind === "cpu" ? fmtUsd(u.cost) : fmtUsd(u.price);
    return { html:
      '<div class="up-card">' +
        '<div class="up-head"><strong></strong><span class="price">' + costTxt + "</span></div>" +
        '<div class="up-stats">' +
          '<span>+<b>' + Math.round(u.gain) + " " + u.unit + "</b> avg</span>" +
          '<span><b>' + Math.round(u.after) + " " + u.unit + "</b> after</span>" +
          '<span>bottleneck <b>' + u.pct + "%</b> (" + u.limiter + ")</span>" +
          '<span class="up-value"><b>' + (Math.round(u.value * 10) / 10) + "</b> " + u.unit + "/$100</span>" +
        "</div>" +
        (u.note ? '<div class="up-note muted"></div>' : "") +
      "</div>",
      name: u.item.name, note: u.note };
  }

  function render() {
    var cpu = hw(BCP.cpus.items, upState.cpuId);
    var gpu = hw(BCP.gpus.items, upState.gpuId);
    if (!cpu || !gpu) return;
    var bench = BCP.benchmarks.cpu[upState.cpuId];
    var gscore = BCP.benchmarks.gpu[upState.gpuId];

    // current state line
    var bn0 = eng.bottleneck(bench, gscore, upState.res, upState.workload, cpu);
    var now0 = metricNow();
    var nowTxt = upState.workload === "productivity"
      ? "multi-core score <b>" + now0.cpu + "</b>, GPU raster score <b>" + now0.gpu + "</b>"
      : "est. <b>" + Math.round(now0.fps) + " fps</b> average at " + { p1080: "1080p", p1440: "1440p", p2160: "4K" }[upState.res];
    $("#upCurrent").innerHTML =
      "<strong></strong> - " + nowTxt + " · " +
      eng.WORKLOADS[upState.workload].label + ", bottleneck " + bn0.pct + "% (" + bn0.limiter + "-limited).";
    $("#upCurrent strong").textContent = cpu.name + " + " + gpu.name;

    var cpuEmpty = bn0.limiter === "gpu" && upState.workload !== "productivity"
      ? "Your GPU is the current limiter - a processor upgrade alone won't raise frame rates here. Upgrade the graphics card first."
      : "No worthwhile processor upgrade in the database" + (upState.budget ? " within this budget." : ".");
    var lists = [
      { el: "#upGpuList", rows: gpuUpgrades(bench).slice(0, 6), kind: "gpu", empty: "No worthwhile graphics card upgrade in the database" + (upState.budget ? " within this budget." : ".") },
      { el: "#upCpuList", rows: cpuUpgrades(gscore).slice(0, 6), kind: "cpu", empty: cpuEmpty }
    ];
    lists.forEach(function (L) {
      var box = $(L.el);
      box.innerHTML = "";
      if (!L.rows.length) {
        box.innerHTML = '<p class="muted">' + L.empty + "</p>";
        return;
      }
      L.rows.forEach(function (u) {
        var c = cardHtml(u, L.kind);
        var div = document.createElement("div");
        div.innerHTML = c.html;
        var node = div.firstChild;
        node.querySelector(".up-head strong").textContent = u.item.name;
        var n = node.querySelector(".up-note");
        if (n) n.textContent = u.note;
        box.appendChild(node);
      });
    });
  }

  function fillSelect(sel, items, current) {
    sel.innerHTML = "";
    items.forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id; o.textContent = it.name;
      sel.appendChild(o);
    });
    sel.value = hw(items, current) ? current : (items[0] ? items[0].id : "");
    return sel.value;
  }

  function init() {
    upState.cpuId = fillSelect($("#upCpu"), BCP.cpus.items, upState.cpuId);
    upState.gpuId = fillSelect($("#upGpu"), BCP.gpus.items, upState.gpuId);
    $("#upCpu").addEventListener("change", function () { upState.cpuId = this.value; render(); });
    $("#upGpu").addEventListener("change", function () { upState.gpuId = this.value; render(); });
    document.querySelectorAll("#upResSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        upState.res = b.getAttribute("data-val");
        document.querySelectorAll("#upResSeg button").forEach(function (x) { x.classList.toggle("active", x === b); });
        render();
      });
    });
    document.querySelectorAll("#upWlSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        upState.workload = b.getAttribute("data-val");
        document.querySelectorAll("#upWlSeg button").forEach(function (x) { x.classList.toggle("active", x === b); });
        render();
      });
    });
    $("#upBudget").addEventListener("change", function () {
      upState.budget = parseInt(this.value, 10) || 0;
      render();
    });
    // hook the tab
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "upgrade") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          $("#viewCalc").classList.add("hidden");
          $("#viewCompare").classList.add("hidden");
          $("#viewUpgrade").classList.remove("hidden");
          window.scrollTo(0, 0);
          render();
        });
      } else {
        b.addEventListener("click", function () { $("#viewUpgrade").classList.add("hidden"); });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
