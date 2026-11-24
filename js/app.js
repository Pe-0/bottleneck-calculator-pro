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
    moboId: null,
    ramId: null,
    psuId: "psu-750g",
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
  function cpuPriceText(id) { var p = BCP.prices.cpu[id]; return p ? fmtUsd(p) : "—"; }
  function gpuPriceText(id) { var p = BCP.prices.gpu[id]; return p ? fmtUsd(p) : "—"; }

  function fillComponentSelect(el, items, currentId) {
    el.innerHTML = "";
    items.forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id;
      o.textContent = it.name;
      el.appendChild(o);
    });
    var valid = items.some(function (it) { return it.id === currentId; });
    el.value = valid ? currentId : (items[0] ? items[0].id : "");
    return el.value;
  }

  function syncComponentPickers() {
    var cpu = hw(BCP.cpus.items, state.cpuId);
    var mobos = BCP.motherboards.items.filter(function (m) { return m.socket === cpu.socket; });
    state.moboId = fillComponentSelect($("#moboSelect"), mobos, state.moboId);
    var mobo = hw(BCP.motherboards.items, state.moboId);
    var kits = BCP.memoryKits.items.filter(function (k) { return !mobo || k.type === mobo.ramType; });
    state.ramId = fillComponentSelect($("#ramSelect"), kits, state.ramId);
    fillComponentSelect($("#psuSelect"), BCP.psus.items, state.psuId);
    state.psuId = $("#psuSelect").value;
  }

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
    var mobo0 = hw(BCP.motherboards.items, state.moboId);
    var ram0 = hw(BCP.memoryKits.items, state.ramId);
    var psu0 = hw(BCP.psus.items, state.psuId);
    eng.partCompatibility(cpu, gpu, mobo0, ram0, psu0, state.workload, bn).forEach(function (w) {
      var li = document.createElement("li");
      li.className = "warn " + w.level;
      li.textContent = w.text;
      warnBox.appendChild(li);
    });

    // Build summary
    var mobo = hw(BCP.motherboards.items, state.moboId);
    var ram = hw(BCP.memoryKits.items, state.ramId);
    var psu = hw(BCP.psus.items, state.psuId);
    var cpuPrice = BCP.prices.cpu[state.cpuId];
    var gpuPrice = BCP.prices.gpu[state.gpuId];
    $("#sumCpuName").textContent = cpu.name;
    $("#sumGpuName").textContent = gpu.name;
    $("#sumCpuSpecs").textContent = specLineCpu(cpu);
    $("#sumGpuSpecs").textContent = specLineGpu(gpu);
    $("#sumCpuPrice").textContent = cpuPrice ? fmtUsd(cpuPrice) : "—";
    $("#sumGpuPrice").textContent = gpuPrice ? fmtUsd(gpuPrice) : "—";
    if (mobo) {
      $("#sumMoboName").textContent = mobo.name;
      $("#sumMoboSpecs").textContent = mobo.socket + " · " + mobo.chipset + " · " + mobo.formFactor + " · " + mobo.ramType;
      $("#sumMoboPrice").textContent = fmtUsd(mobo.priceUSD);
    }
    if (ram) {
      $("#sumRamName").textContent = ram.name;
      $("#sumRamSpecs").textContent = ram.type + "-" + ram.speedMTs + " CL" + ram.casLatency;
      $("#sumRamPrice").textContent = fmtUsd(ram.priceUSD);
    }
    var recPsu = eng.recommendedPsuW(cpu.tdpW, gpu.tdpW);
    if (psu) {
      $("#sumPsuName").textContent = psu.name;
      $("#sumPsuSpecs").textContent = psu.efficiency + " · " + psu.modular + " modular" + (psu.atx31 ? " · ATX 3.x" : "");
      $("#sumPsuPrice").textContent = fmtUsd(psu.priceUSD);
    }
    var parts = [cpuPrice, gpuPrice, mobo && mobo.priceUSD, ram && ram.priceUSD, psu && psu.priceUSD];
    var total = 0, missing = false;
    parts.forEach(function (p) { if (p) { total += p; } else { missing = true; } });
    $("#sumTotal").textContent = missing && total === 0 ? "—" : fmtUsd(total) + (missing ? "+" : "");
    $("#sumPsu").textContent = recPsu + "W";
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
    cpuSel.addEventListener("change", function () { state.cpuId = cpuSel.value; syncComponentPickers(); render(); });
    gpuSel.addEventListener("change", function () { state.gpuId = gpuSel.value; render(); });
    syncComponentPickers();
    $("#moboSelect").addEventListener("change", function () { state.moboId = this.value; syncComponentPickers(); render(); });
    $("#ramSelect").addEventListener("change", function () { state.ramId = this.value; render(); });
    $("#psuSelect").addEventListener("change", function () { state.psuId = this.value; render(); });
    bindSegmented("resSeg", "res");
    bindSegmented("wlSeg", "workload");

    $("#genBtn").addEventListener("click", function () {
      var budget = parseInt($("#budgetSelect").value, 10);
      var builds = eng.generateBuilds(budget, state.workload, state.res, 3);
      var box = $("#genResults");
      box.innerHTML = "";
      if (!builds.length) {
        var p = document.createElement("p");
        p.className = "muted";
        p.textContent = "No fully-priced build fits this budget yet - try a higher budget.";
        box.appendChild(p);
        return;
      }
      builds.forEach(function (b) {
        var card = document.createElement("div");
        card.className = "gen-card";
        var rows = [
          [b.cpu.name, cpuPriceText(b.cpu.id)],
          [b.gpu.name, gpuPriceText(b.gpu.id)],
          [b.mobo.name, fmtUsd(b.mobo.priceUSD)],
          [b.ram.name, fmtUsd(b.ram.priceUSD)],
          [b.psu.name, fmtUsd(b.psu.priceUSD)]
        ].map(function (r) { return "<li><span></span><span>" + r[1] + "</span></li>"; });
        card.innerHTML =
          "<h4></h4>" +
          '<div class="gen-meta"></div>' +
          "<ul>" + rows.join("") + "</ul>" +
          '<button class="gen-load" type="button">Load this build</button>';
        card.querySelector("h4").textContent = b.cpu.name + " + " + b.gpu.name;
        var lis = card.querySelectorAll("li span:first-child");
        [b.cpu.name, b.gpu.name, b.mobo.name, b.ram.name, b.psu.name].forEach(function (n, i) { lis[i].textContent = n; });
        card.querySelector(".gen-meta").innerHTML =
          'Total <span class="gen-total"></span> · bottleneck ' + b.pct + "% (" + b.limiter + "-limited) at " + resLabel() + " · " + eng.WORKLOADS[state.workload].label;
        card.querySelector(".gen-total").textContent = fmtUsd(b.total);
        card.querySelector(".gen-load").addEventListener("click", function () {
          state.cpuId = b.cpu.id; state.gpuId = b.gpu.id;
          state.moboId = b.mobo.id; state.ramId = b.ram.id; state.psuId = b.psu.id;
          $("#cpuSelect").value = state.cpuId;
          $("#gpuSelect").value = state.gpuId;
          syncComponentPickers();
          state.moboId = b.mobo.id; state.ramId = b.ram.id;
          $("#moboSelect").value = b.mobo.id; $("#ramSelect").value = b.ram.id; $("#psuSelect").value = b.psu.id;
          render();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        box.appendChild(card);
      });
    });

    $("#dataNote").textContent =
      "Bottleneck % is a model estimate. FPS are rough estimates, not measured benchmarks. Prices are snapshots, not live quotes: current-gen GPUs verified Nov 2026 (Newegg); CPUs and older cards last verified 2025-Q3 and likely higher now.";

    // Data confidence footer
    $("#dataMeta").textContent =
      "Specs " + BCP.cpus.meta.asOf + " (" + BCP.cpus.meta.confidence + " confidence) · " +
      "Benchmarks " + BCP.benchmarks.meta.asOf + " (" + BCP.benchmarks.meta.confidence + ") · " +
      "Prices " + BCP.prices.meta.asOf + " " + BCP.prices.meta.currency + " (" + BCP.prices.meta.confidence + ") · " +
      "Components " + BCP.motherboards.meta.asOf + " (curated)";
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
