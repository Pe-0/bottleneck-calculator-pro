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
  function avgFps(cpuBench, gpuScore, resKey, workloadKey, vramGB) {
    var sum = 0, n = 0;
    BCP.games.items.forEach(function (g) {
      sum += eng.gameFps(g, cpuBench.gaming, gpuScore, resKey, workloadKey, vramGB); n++;
    });
    return n ? sum / n : 0;
  }
  function gpuVram(id) { var g = hw(BCP.gpus.items, id); return g ? g.vramGB : 0; }

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
    return { fps: avgFps(cb, gs, upState.res, upState.workload, gpuVram(upState.gpuId)), unit: "fps" };
  }

  function gpuUpgrades(benchNow) {
    var prod = upState.workload === "productivity";
    var cur = BCP.benchmarks.gpu[upState.gpuId];
    var now = metricNow();
    var out = [];
    BCP.gpus.items.forEach(function (g) {
      if (g.id === upState.gpuId || g.mobile) return;
      var score = BCP.benchmarks.gpu[g.id];
      var price = BCP.prices.gpu[g.id];
      if (!score || !price) return;
      var gain = prod ? score - now.gpu : avgFps(benchNow, score, upState.res, upState.workload, g.vramGB) - now.fps;
      if (gain <= 0.5) return;
      if (upState.budget && price > upState.budget) return;
      var bn = eng.bottleneck(benchNow, score, upState.res, upState.workload, hw(BCP.cpus.items, upState.cpuId));
      var recPsu = eng.recommendedPsuW(hw(BCP.cpus.items, upState.cpuId).tdpW, g.tdpW);
      out.push({ item: g, price: price, after: prod ? score : avgFps(benchNow, score, upState.res, upState.workload, g.vramGB),
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
      if (c.id === upState.cpuId || c.mobile) return;
      var bench = BCP.benchmarks.cpu[c.id];
      var price = BCP.prices.cpu[c.id];
      if (!bench || !price) return;
      var sameSocket = c.socket === curCpu.socket;
      if (c.legacy && !sameSocket) return;
      var plat = sameSocket ? null : platformCost(c.socket);
      if (!sameSocket && !plat) return;
      var cost = price + (plat ? plat.cost : 0);
      var gain = prod ? bench.productivity - now.cpu : avgFps(bench, gpuScoreNow, upState.res, upState.workload, gpuVram(upState.gpuId)) - now.fps;
      if (gain <= 0.5) return;
      if (upState.budget && cost > upState.budget) return;
      var bn = eng.bottleneck(bench, gpuScoreNow, upState.res, upState.workload, c);
      out.push({ item: c, price: price, plat: plat, cost: cost,
                 after: prod ? bench.productivity : avgFps(bench, gpuScoreNow, upState.res, upState.workload, gpuVram(upState.gpuId)),
                 gain: gain, pct: bn.pct, limiter: bn.limiter, unit: now.unit,
                 value: gain / cost * 100,
                 note: sameSocket ? "Drop-in upgrade on your " + c.socket + " board"
                                  : "Platform change: price includes " + plat.board.name + (plat.kit ? " + " + plat.kit.name : "") });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  // Every non-legacy desktop CPU x GPU pair at or under the current
  // pair's combined internal price, ranked by the active metric.
  function rebalance() {
    var prod = upState.workload === "productivity";
    var now = metricNow();
    if (!now) return { rows: [] };
    var pCpu = BCP.prices.cpu[upState.cpuId], pGpu = BCP.prices.gpu[upState.gpuId];
    if (!pCpu || !pGpu) return { rows: [], noPrice: true };
    var budget = pCpu + pGpu;
    var nowM = prod ? now.cpu : now.fps;
    var rows = [];
    BCP.cpus.items.forEach(function (c) {
      if (c.mobile || c.legacy) return;
      var cb = BCP.benchmarks.cpu[c.id], cp = BCP.prices.cpu[c.id];
      if (!cb || !cp) return;
      BCP.gpus.items.forEach(function (g) {
        if (g.mobile || g.legacy) return;
        if (c.id === upState.cpuId && g.id === upState.gpuId) return;
        var gs = BCP.benchmarks.gpu[g.id], gp = BCP.prices.gpu[g.id];
        if (!gs || !gp || cp + gp > budget) return;
        var metric = prod ? cb.productivity : avgFps(cb, gs, upState.res, upState.workload, g.vramGB);
        if (metric <= nowM * 1.02) return;
        var bn = eng.bottleneck(cb, gs, upState.res, upState.workload, c);
        rows.push({ cpu: c, gpu: g, total: cp + gp, metric: metric,
                    pctGain: (metric - nowM) / nowM * 100,
                    pct: bn.pct, limiter: bn.limiter, unit: now.unit });
      });
    });
    rows.sort(function (a, b) { return b.metric - a.metric; });
    return { budget: budget, rows: rows.slice(0, 3) };
  }

  // Cheapest supporting parts for the selected CPU + GPU, mirroring
  // the engine's build generator choices (no case, no peripherals).
  function selfBuildCost(cpu, gpu) {
    var pCpu = BCP.prices.cpu[cpu.id], pGpu = BCP.prices.gpu[gpu.id];
    if (!pCpu || !pGpu) return null;
    var plat = platformCost(cpu.socket);
    if (!plat) return null;
    var cooler = 0;
    if (!cpu.stockCooler) {
      var cls = BCP.coolers.items.filter(function (cl) {
        return cl.id !== "cl-stock" && cl.sockets.indexOf(cpu.socket) !== -1 && cl.tdpRatingW >= cpu.tdpW;
      });
      cls.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
      if (!cls.length) return null;
      cooler = cls[0].priceUSD;
    }
    var drives = BCP.storage.items.filter(function (d) { return d.capacityGB >= 1000 && d.interface !== "SATA"; });
    drives.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    if (!drives.length) return null;
    var rec = eng.recommendedPsuW(cpu.tdpW, gpu.tdpW);
    var needAtx31 = gpu.tdpW >= 300;
    var psus = BCP.psus.items.filter(function (p) { return p.wattageW >= rec && (!needAtx31 || p.atx31); });
    psus.sort(function (a, b) { return p.priceUSD - b.priceUSD; });
    if (!psus.length) return null;
    return { total: pCpu + pGpu + plat.cost + cooler + drives[0].priceUSD + psus[0].priceUSD };
  }

  function renderPrebuilt() {
    var box = $("#upPreList"), note = $("#upPreNote");
    if (!box) return;
    box.innerHTML = "";
    var cpu = hw(BCP.cpus.items, upState.cpuId);
    var gpu = hw(BCP.gpus.items, upState.gpuId);
    if (!cpu || !gpu) return;
    if (!upState.prePrice) {
      box.innerHTML = '<p class="muted">Enter the asking price above and hit Check.</p>';
      if (note) note.textContent = "";
      return;
    }
    var est = selfBuildCost(cpu, gpu);
    if (!est) {
      box.innerHTML = '<p class="muted">Cannot price this combination - one of the parts or its supporting components is missing from the internal price layer.</p>';
      if (note) note.textContent = "";
      return;
    }
    var ratio = upState.prePrice / est.total;
    var v;
    if (ratio <= 1.10) v = { cls: "good", text: "Strong deal - at or near the cost of the parts alone." };
    else if (ratio <= 1.25) v = { cls: "good", text: "Fair price - inside the normal prebuilt markup for assembly, warranty and a Windows license." };
    else if (ratio <= 1.50) v = { cls: "mid", text: "Pricey - well above the parts estimate. Worth negotiating or comparing other listings." };
    else v = { cls: "bad", text: "Overpriced against building it yourself on the internal price layer." };
    var alt = eng.generateBuilds(upState.prePrice, upState.workload, upState.res, 1);
    var div = document.createElement("div");
    div.innerHTML =
      '<div class="up-card">' +
        '<div class="up-head"><strong></strong><span class="price">' + fmtUsd(upState.prePrice) + "</span></div>" +
        '<div class="up-stats">' +
          '<span>parts estimate <b>' + fmtUsd(est.total) + "</b></span>" +
          '<span>markup <b>' + Math.round((ratio - 1) * 100) + "%</b></span>" +
        "</div>" +
        '<ul class="warn-list"><li class="warn ' + v.cls + '"></li></ul>' +
        (alt.length ? '<div class="up-note muted"></div>' : "") +
      "</div>";
    var node = div.firstChild;
    node.querySelector(".up-head strong").textContent = cpu.name + " + " + gpu.name + " prebuilt";
    node.querySelector(".warn li").textContent = v.text;
    var altNote = node.querySelector(".up-note");
    if (altNote) altNote.textContent = "The same budget self-built buys roughly: " + alt[0].cpu.name + " + " + alt[0].gpu.name + " (est. " + fmtUsd(alt[0].total) + " core parts, " + upState.workload + " focus).";
    box.appendChild(node);
    if (note) {
      note.textContent = "The parts estimate adds the cheapest compatible board, 32 GB kit, cooler, 1 TB NVMe and an adequately rated PSU to the CPU + GPU prices from the internal price layer (" +
        BCP.prices.meta.asOf + "). It excludes the case, peripherals and Windows. The fairness bands (fair within roughly +10-25% over parts) are a rule of thumb, not a market standard. Prebuilts vary in RAM speed, SSD quality and cooling - check the exact component list before buying.";
    }
  }

  function cardHtml(u, kind) {
    var costTxt = kind === "cpu" ? fmtUsd(u.cost) : fmtUsd(u.price);
    if (u.item.legacy) costTxt += " (used est.)";
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
    renderPrebuilt();

    var rb = rebalance();
    var optBox = $("#upOptList"), optNote = $("#upOptNote");
    if (optBox) {
      optBox.innerHTML = "";
      if (rb.noPrice) {
        optBox.innerHTML = '<p class="muted">Rebalance needs an internal price for both your current CPU and GPU; one of them is not in the price layer.</p>';
      } else if (!rb.rows.length) {
        optBox.innerHTML = '<p class="muted">No CPU + GPU pair in the database beats your split at ' + fmtUsd(rb.budget) + ' or less for this workload. Your money is already well distributed.</p>';
      } else {
        rb.rows.forEach(function (r) {
          var div = document.createElement("div");
          div.innerHTML =
            '<div class="up-card">' +
              '<div class="up-head"><strong></strong><span class="price">' + fmtUsd(r.total) + "</span></div>" +
              '<div class="up-stats">' +
                '<span>+<b>' + (Math.round(r.pctGain * 10) / 10) + "%</b> " + (upState.workload === "productivity" ? "multi-core" : "avg fps") + "</span>" +
                '<span><b>' + Math.round(r.metric) + " " + r.unit + "</b> after</span>" +
                '<span>bottleneck <b>' + r.pct + "%</b> (" + r.limiter + ")</span>" +
              "</div>" +
            "</div>";
          div.firstChild.querySelector(".up-head strong").textContent = r.cpu.name + " + " + r.gpu.name;
          optBox.appendChild(div.firstChild);
        });
      }
      if (optNote) {
        optNote.textContent = "Compares every current-generation CPU + GPU pair in the database whose combined internal price fits your pair's " +
          (rb.budget ? fmtUsd(rb.budget) : "") + " budget, ranked by the same engine metric as the upgrades above. Prices come from the internal price layer (" +
          BCP.prices.meta.asOf + ") - guidance for balancing a build, not live market prices.";
      }
    }

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
    var preGo = function () {
      upState.prePrice = parseInt($("#upPrePrice").value, 10) || 0;
      renderPrebuilt();
    };
    $("#upPreGo").addEventListener("click", preGo);
    $("#upPrePrice").addEventListener("keydown", function (e) { if (e.key === "Enter") preGo(); });

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
