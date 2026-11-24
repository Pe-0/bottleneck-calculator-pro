/* ============================================================
 * APP — UI wiring. Depends on window.BCP data layers + engine.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;

  var state = {
    cpuId: "r7-7800x3d",
    gpuId: "rtx-4070s",
    res: "p1440",
    workload: "gaming"
  };

  var $ = function (sel) { return document.querySelector(sel); };

  function hw(map, id) {
    for (var i = 0; i < map.length; i++) if (map[i].id === id) return map[i];
    return null;
  }

  function fillSelect(el, items, groupBy) {
    var groups = {};
    items.forEach(function (it) {
      var g = groupBy(it);
      (groups[g] = groups[g] || []).push(it);
    });
    Object.keys(groups).sort().forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g;
      groups[g].forEach(function (it) {
        var o = document.createElement("option");
        o.value = it.id;
        o.textContent = it.name;
        og.appendChild(o);
      });
      el.appendChild(og);
    });
  }

  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }

  function specLineCpu(c) {
    return c.cores + "C/" + c.threads + "T · up to " + c.boostGHz + " GHz · " + c.socket + " · " + c.tdpW + "W";
  }
  function specLineGpu(g) {
    return g.vramGB + " GB VRAM · " + g.tdpW + "W · " + g.launchYear;
  }

  function render() {
    var cpu = hw(BCP.cpus.items, state.cpuId);
    var gpu = hw(BCP.gpus.items, state.gpuId);
    var cpuBench = BCP.benchmarks.cpu[state.cpuId];
    var gpuScore = BCP.benchmarks.gpu[state.gpuId];

    var bn = eng.bottleneck(cpuBench, gpuScore, state.res, state.workload);
    var bal = eng.balanceLabel(bn.pct, bn.limiter);

    // Gauge
    var pct = bn.pct;
    $("#gaugeValue").textContent = pct + "%";
    var arc = $("#gaugeArc");
    var maxArc = 251.2; // circumference of r=40 semicircle path used
    arc.style.strokeDashoffset = String(maxArc - (clamp(pct, 0, 100) / 100) * maxArc);
    arc.setAttribute("class", "gauge-arc " + bal.cls);
    $("#gaugeLabel").textContent = bal.label;
    $("#gaugeLabel").setAttribute("class", "gauge-label " + bal.cls);

    var limiterText = {
      cpu: "Your CPU is limiting this pair",
      gpu: "Your GPU is limiting this pair",
      balanced: "Perfectly matched"
    };
    $("#limiterNote").textContent = limiterText[bn.limiter] +
      " at " + resLabel() + " · " + eng.WORKLOADS[state.workload].label + ".";

    // Score cards
    $("#cpuScoreLabel").textContent = state.workload === "productivity" ? "CPU score (multi-core)" : "CPU score (gaming)";
    $("#cpuCeil").textContent = bn.cpuScore;
    $("#gpuCeil").textContent = bn.gpuScore;
    var needEl = $("#needNote");
    if (state.workload === "productivity") {
      needEl.textContent = "Render and compute work scales across cores — the CPU needs score ≥ " + bn.requiredCpuScore + " to match this GPU.";
    } else {
      needEl.textContent = "At " + resLabel() + ", this GPU needs a CPU score ≥ " + bn.requiredCpuScore + " to stay fully fed.";
    }

    // FPS table
    var fpsBox = $("#fpsList");
    fpsBox.innerHTML = "";
    if (state.workload === "productivity") {
      var note = document.createElement("p");
      note.className = "muted";
      note.textContent = "FPS estimates apply to gaming workloads. For productivity, compare the relative scores below.";
      fpsBox.appendChild(note);
    }
    var games = BCP.games.items.slice();
    var rows = games.map(function (g) {
      return { name: g.name, fps: eng.gameFps(g, cpuBench.gaming, gpuScore, state.res, state.workload) };
    }).sort(function (a, b) { return b.fps - a.fps; });
    var maxFps = rows[0] ? rows[0].fps : 1;
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "fps-row";
      var w = Math.max(4, Math.round((r.fps / maxFps) * 100));
      row.innerHTML =
        '<span class="fps-name"></span>' +
        '<span class="fps-bar"><span class="fps-fill" style="width:' + w + '%"></span></span>' +
        '<span class="fps-val">' + r.fps + '</span>';
      row.querySelector(".fps-name").textContent = r.name;
      fpsBox.appendChild(row);
    });

    // Compatibility
    var warnBox = $("#warnList");
    warnBox.innerHTML = "";
    eng.compatibility(cpu, gpu, bn).forEach(function (w) {
      var li = document.createElement("li");
      li.className = "warn " + w.level;
      li.textContent = w.text;
      warnBox.appendChild(li);
    });

    // Build summary
    var cpuPrice = BCP.prices.cpu[state.cpuId];
    var gpuPrice = BCP.prices.gpu[state.gpuId];
    $("#sumCpuName").textContent = cpu.name;
    $("#sumGpuName").textContent = gpu.name;
    $("#sumCpuSpecs").textContent = specLineCpu(cpu);
    $("#sumGpuSpecs").textContent = specLineGpu(gpu);
    $("#sumCpuPrice").textContent = cpuPrice ? fmtUsd(cpuPrice) : "—";
    $("#sumGpuPrice").textContent = gpuPrice ? fmtUsd(gpuPrice) : "—";
    $("#sumTotal").textContent = (cpuPrice && gpuPrice) ? fmtUsd(cpuPrice + gpuPrice) : "—";
    $("#sumPsu").textContent = eng.recommendedPsuW(cpu.tdpW, gpu.tdpW) + "W";
  }

  function resLabel() {
    return { p1080: "1080p", p1440: "1440p", p2160: "4K" }[state.res];
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function bindSegmented(containerId, key) {
    var box = document.getElementById(containerId);
    box.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-val]");
      if (!btn) return;
      state[key] = btn.getAttribute("data-val");
      box.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      render();
    });
  }

  function init() {
    var cpuSel = $("#cpuSelect"), gpuSel = $("#gpuSelect");
    fillSelect(cpuSel, BCP.cpus.items, function (c) { return c.brand + " · " + c.socket; });
    fillSelect(gpuSel, BCP.gpus.items, function (g) { return g.brand; });
    cpuSel.value = state.cpuId;
    gpuSel.value = state.gpuId;
    cpuSel.addEventListener("change", function () { state.cpuId = cpuSel.value; render(); });
    gpuSel.addEventListener("change", function () { state.gpuId = gpuSel.value; render(); });
    bindSegmented("resSeg", "res");
    bindSegmented("wlSeg", "workload");

    // Data confidence footer
    $("#dataMeta").textContent =
      "Specs " + BCP.cpus.meta.asOf + " (" + BCP.cpus.meta.confidence + " confidence) · " +
      "Benchmarks " + BCP.benchmarks.meta.asOf + " (" + BCP.benchmarks.meta.confidence + ") · " +
      "Prices " + BCP.prices.meta.asOf + " " + BCP.prices.meta.currency + " (" + BCP.prices.meta.confidence + ")";
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
