/* ============================================================
 * APP — UI wiring. Depends on window.BCP data layers + engine.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;

  var PREFS_KEY = "bcp.prefs";
  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return p && typeof p === "object" ? p : {};
    } catch (e) { return {}; }
  }
  function savePrefs(patch) {
    var p = loadPrefs();
    for (var k in patch) p[k] = patch[k];
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
  }

  var state = {
    cpuId: "r7-7800x3d",
    gpuId: "rtx-4070s",
    moboId: null,
    ramId: null,
    psuId: "psu-750g",
    coolerId: "cl-pa120",
    caseId: "case-atx-value",
    storageId: "ssd-1tb-g4",
    res: "p1440",
    workload: "gaming"
  };
  (function applyPrefs() {
    var p = loadPrefs();
    if ({p1080:1,p1440:1,p2160:1}[p.res]) state.res = p.res;
    if (eng.WORKLOADS[p.workload]) state.workload = p.workload;
  })();

  var $ = function (sel) { return document.querySelector(sel); };

  function hw(map, id) {
    for (var i = 0; i < map.length; i++) if (map[i].id === id) return map[i];
    return null;
  }

  // Exposed so analysis tabs (Power & thermal, ...) work on the
  // current calculator selection instead of duplicating pickers.
  BCP.getSelection = function () {
    return {
      cpu: hw(BCP.cpus.items, state.cpuId),
      gpu: hw(BCP.gpus.items, state.gpuId),
      mobo: state.moboId === UNKNOWN ? null : hw(BCP.motherboards.items, state.moboId),
      ram: state.ramId === UNKNOWN ? null : hw(BCP.memoryKits.items, state.ramId),
      psu: hw(BCP.psus.items, state.psuId),
      cooler: hw(BCP.coolers.items, state.coolerId),
      storage: hw(BCP.storage.items, state.storageId),
      res: state.res,
      workload: state.workload
    };
  };

  // Cross-tab setter: global search jumps straight to a component.
  BCP.setSelection = function (patch) {
    if (patch.cpuId && hw(BCP.cpus.items, patch.cpuId)) state.cpuId = patch.cpuId;
    if (patch.gpuId && hw(BCP.gpus.items, patch.gpuId)) state.gpuId = patch.gpuId;
    if (patch.moboId) state.moboId = patch.moboId;
    if (patch.ramId) state.ramId = patch.ramId;
    if (patch.psuId && hw(BCP.psus.items, patch.psuId)) state.psuId = patch.psuId;
    if (patch.coolerId && hw(BCP.coolers.items, patch.coolerId)) state.coolerId = patch.coolerId;
    if (patch.storageId && hw(BCP.storage.items, patch.storageId)) state.storageId = patch.storageId;
    $("#cpuSelect").value = state.cpuId;
    $("#gpuSelect").value = state.gpuId;
    syncComponentPickers();
    render();
  };

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
  function cpuPriceText(id) { var p = BCP.prices.cpu[id]; var it = hw(BCP.cpus.items, id); return p ? fmtUsd(p) + (it && it.legacy ? " used" : "") : "—"; }
  function gpuPriceText(id) { var p = BCP.prices.gpu[id]; var it = hw(BCP.gpus.items, id); return p ? fmtUsd(p) + (it && it.legacy ? " used" : "") : "—"; }

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

  var UNKNOWN = "unknown";

  function addUnknownOption(el, label) {
    var o = document.createElement("option");
    o.value = UNKNOWN;
    o.textContent = label;
    el.appendChild(o);
  }

  function syncComponentPickers() {
    var cpu = hw(BCP.cpus.items, state.cpuId);
    var mobos = BCP.motherboards.items.filter(function (m) { return m.socket === cpu.socket; });
    var wantUnknownMobo = state.moboId === UNKNOWN;
    state.moboId = fillComponentSelect($("#moboSelect"), mobos, state.moboId);
    addUnknownOption($("#moboSelect"), "I don't know my motherboard");
    if (wantUnknownMobo) {
      $("#moboSelect").value = UNKNOWN;
      state.moboId = UNKNOWN;
    }
    var mobo = state.moboId === UNKNOWN ? null : hw(BCP.motherboards.items, state.moboId);
    var kits = BCP.memoryKits.items.filter(function (k) { return !mobo || k.type === mobo.ramType; });
    var wantUnknownRam = state.ramId === UNKNOWN;
    state.ramId = fillComponentSelect($("#ramSelect"), kits, state.ramId);
    addUnknownOption($("#ramSelect"), "I don't know my memory");
    if (wantUnknownRam) {
      $("#ramSelect").value = UNKNOWN;
      state.ramId = UNKNOWN;
    }
    fillComponentSelect($("#psuSelect"), BCP.psus.items, state.psuId);
    state.psuId = $("#psuSelect").value;
    fillComponentSelect($("#coolerSelect"), BCP.coolers.items, state.coolerId);
    state.coolerId = $("#coolerSelect").value;
    fillComponentSelect($("#storageSelect"), BCP.storage.items, state.storageId);
    state.storageId = $("#storageSelect").value;
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

    var bn = eng.bottleneck(cpuBench, gpuScore, state.res, state.workload, cpu);
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
      needEl.textContent = "Render and compute work scales across all " + cpu.threads + " threads — the multi-core score needs to be ≥ " + bn.requiredCpuScore + " to match this GPU.";
    } else if (state.workload === "streaming") {
      needEl.textContent = "At " + resLabel() + ", this GPU needs a CPU score ≥ " + bn.requiredCpuScore + " while streaming (includes core-headroom for the " + cpu.threads + "-thread CPU).";
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
    var gpuVram = (hw(BCP.gpus.items, state.gpuId) || {}).vramGB;
    var rows = games.map(function (g) {
      return { name: g.name, fps: eng.gameFps(g, cpuBench.gaming, gpuScore, state.res, state.workload, gpuVram) };
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
    var cooler0 = hw(BCP.coolers.items, state.coolerId);
    var case0 = hw(BCP.cases.items, state.caseId);
    var storage0 = hw(BCP.storage.items, state.storageId);
    eng.partCompatibility(cpu, gpu, mobo0, ram0, psu0, state.workload, bn, cooler0, case0, state.res).forEach(function (w) {
      var li = document.createElement("li");
      li.className = "warn " + w.level;
      li.textContent = w.text;
      warnBox.appendChild(li);
    });
    if (storage0) {
      if (state.workload !== "productivity" && storage0.capacityGB < 1000) {
        var sw = document.createElement("li");
        sw.className = "warn mid";
        sw.textContent = "Modern games routinely exceed 100 GB each - a 1 TB or larger drive is recommended.";
        warnBox.appendChild(sw);
      } else if (state.workload === "productivity" && storage0.capacityGB < 2000) {
        var sw2 = document.createElement("li");
        sw2.className = "warn mid";
        sw2.textContent = "Video and 3D project files grow fast - 2 TB or more is recommended for content work.";
        warnBox.appendChild(sw2);
      }
    }

    // Build summary
    var mobo = mobo0;
    var ram = ram0;
    var psu = hw(BCP.psus.items, state.psuId);
    var cpuPrice = BCP.prices.cpu[state.cpuId];
    var gpuPrice = BCP.prices.gpu[state.gpuId];
    $("#sumCpuName").textContent = cpu.name;
    $("#sumGpuName").textContent = gpu.name;
    $("#sumCpuSpecs").textContent = specLineCpu(cpu);
    $("#sumGpuSpecs").textContent = specLineGpu(gpu);
    $("#sumCpuPrice").textContent = cpuPrice ? (cpu.legacy ? "≈ " : "") + fmtUsd(cpuPrice) : "—";
    $("#sumGpuPrice").textContent = gpuPrice ? (gpu.legacy ? "≈ " : "") + fmtUsd(gpuPrice) : "—";
    var usedNote = $("#sumUsedNote");
    if (usedNote) usedNote.hidden = !(cpu.legacy || gpu.legacy);
    if (mobo) {
      $("#sumMoboName").textContent = mobo.name;
      $("#sumMoboSpecs").textContent = mobo.socket + " · " + mobo.chipset + " · " + mobo.formFactor + " · " + mobo.ramType;
      $("#sumMoboPrice").textContent = fmtUsd(mobo.priceUSD);
    } else {
      $("#sumMoboName").textContent = "Motherboard not specified";
      $("#sumMoboSpecs").textContent = "board-specific checks skipped";
      $("#sumMoboPrice").textContent = "—";
    }
    if (ram) {
      $("#sumRamName").textContent = ram.name;
      $("#sumRamSpecs").textContent = ram.type + "-" + ram.speedMTs + " CL" + ram.casLatency;
      $("#sumRamPrice").textContent = fmtUsd(ram.priceUSD);
    } else {
      $("#sumRamName").textContent = "Memory not specified";
      $("#sumRamSpecs").textContent = "memory checks skipped";
      $("#sumRamPrice").textContent = "—";
    }
    var recPsu = eng.recommendedPsuW(cpu.tdpW, gpu.tdpW);
    if (psu) {
      $("#sumPsuName").textContent = psu.name;
      $("#sumPsuSpecs").textContent = psu.efficiency + " · " + psu.modular + " modular" + (psu.atx31 ? " · ATX 3.x" : "");
      $("#sumPsuPrice").textContent = fmtUsd(psu.priceUSD);
    }
    var cooler = hw(BCP.coolers.items, state.coolerId);
    if (cooler) {
      $("#sumCoolerName").textContent = cooler.name;
      $("#sumCoolerSpecs").textContent = cooler.type === "AIO" ? "AIO · " + cooler.radiatorMM + "mm radiator" : (cooler.id === "cl-stock" ? "included with many CPUs up to 65W" : "Air · " + cooler.heightMM + "mm tall");
      $("#sumCoolerPrice").textContent = cooler.priceUSD ? fmtUsd(cooler.priceUSD) : "$0";
    }
    var storage = hw(BCP.storage.items, state.storageId);
    if (storage) {
      $("#sumStorageName").textContent = storage.name;
      $("#sumStorageSpecs").textContent = storage.interface + " · up to " + storage.readMBs.toLocaleString("en-US") + " MB/s";
      $("#sumStoragePrice").textContent = fmtUsd(storage.priceUSD);
    }
    var parts = [cpuPrice, gpuPrice, mobo && mobo.priceUSD, ram && ram.priceUSD, psu && psu.priceUSD, cooler && cooler.priceUSD, storage && storage.priceUSD];
    var total = 0, missing = false;
    parts.forEach(function (p) { if (p !== undefined && p !== null) { total += p; } else { missing = true; } });
    $("#sumTotal").textContent = missing && total === 0 ? "—" : fmtUsd(total) + (missing ? "+" : "");
    $("#sumPsu").textContent = recPsu + "W";

    // Spec sheets
    var cpuRows = [
      ["Architecture", cpu.arch || "—"],
      ["Cores / Threads", cpu.cores + " / " + cpu.threads],
      ["Base / Boost clock", (cpu.baseGHz ? cpu.baseGHz + " GHz / " : "— / ") + cpu.boostGHz + " GHz"],
      ["L3 cache", cpu.l3MB ? cpu.l3MB + " MB" : "—"],
      ["Socket", cpu.socket],
      ["TDP", cpu.tdpW + "W"],
      ["Launch year", cpu.launchYear]
    ];
    if (cpu.blurb) cpuRows.push(["Variant notes", cpu.blurb]);
    if (cpu.mobile) cpuRows.push(["Form factor", "Laptop / soldered (BGA)"]);
    var gpuRows = [
      ["Architecture", gpu.arch || "—"],
      ["VRAM", gpu.vramGB + " GB"],
      ["Length (est.)", gpu.lengthMM ? "~" + gpu.lengthMM + " mm" : "—"],
      ["TDP", gpu.tdpW + "W"],
      ["Launch year", gpu.launchYear]
    ];
    if (gpu.blurb) gpuRows.push(["Variant notes", gpu.blurb]);
    if (gpu.mobile) gpuRows.push(["Form factor", "Laptop / power-limited"]);
    function fillSpec(id, rows) {
      var el = $(id);
      el.innerHTML = "";
      rows.forEach(function (r) {
        var d = document.createElement("div");
        d.className = "spec-row";
        var k = document.createElement("span"); k.textContent = r[0];
        var v = document.createElement("span"); v.textContent = String(r[1]);
        d.appendChild(k); d.appendChild(v);
        el.appendChild(d);
      });
    }
    fillSpec("#cpuSpecSheet", cpuRows);
    fillSpec("#gpuSpecSheet", gpuRows);

    // Context snapshot for the AI assistant panel
    BCP.assistantContext = {
      cpu: cpu.name,
      gpu: gpu.name,
      motherboard: mobo0 ? mobo0.name : "not specified",
      memory: ram0 ? ram0.name : "not specified",
      psu: psu ? psu.name : "not specified",
      cooler: cooler ? cooler.name : "not specified",
      storage: storage ? storage.name : "not specified",
      resolution: resLabel(),
      workload: eng.WORKLOADS[state.workload].label,
      bottleneckPct: bn.pct,
      limiter: bn.limiter,
      totalPrice: $("#sumTotal").textContent,
      advice: Array.prototype.map.call(warnBox.children, function (li) { return li.textContent; })
    };
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
      savePrefs(key === "res" ? { res: state.res } : { workload: state.workload });
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
    $("#coolerSelect").addEventListener("change", function () { state.coolerId = this.value; render(); });
    $("#storageSelect").addEventListener("change", function () { state.storageId = this.value; render(); });

    // Shareable build link: encode the full build in the URL hash.
    $("#shareBtn").addEventListener("click", function () {
      var code = [state.cpuId, state.gpuId, state.moboId, state.ramId, state.psuId,
                  state.coolerId, state.caseId, state.storageId, state.res, state.workload].join(",");
      var url = location.origin + location.pathname + "#b=" + code;
      var done = function () {
        $("#shareBtn").textContent = "Link copied";
        setTimeout(function () { $("#shareBtn").textContent = "Copy build link"; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
      } else {
        prompt("Copy this link:", url);
      }
    });

    // Restore a shared build from a #b= code (URL hash or saved builds).
    function applyBuildCode(code) {
      var parts0 = code.split(",");
      if (parts0.length !== 10) return false;
      state.cpuId = parts0[0]; state.gpuId = parts0[1]; state.moboId = parts0[2];
      state.ramId = parts0[3]; state.psuId = parts0[4]; state.coolerId = parts0[5];
      state.caseId = parts0[6]; state.storageId = parts0[7];
      if ({p1080:1,p1440:1,p2160:1}[parts0[8]]) state.res = parts0[8];
      if (eng.WORKLOADS[parts0[9]]) state.workload = parts0[9];
      document.querySelectorAll("#resSeg button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.val === state.res);
      });
      document.querySelectorAll("#wlSeg button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.val === state.workload);
      });
      cpuSel.value = state.cpuId;
      gpuSel.value = state.gpuId;
      syncComponentPickers();
      render();
      return true;
    }
    BCP.applyBuildCode = applyBuildCode;
    BCP.currentBuildCode = function () {
      return [state.cpuId, state.gpuId, state.moboId, state.ramId, state.psuId,
              state.coolerId, state.caseId, state.storageId, state.res, state.workload].join(",");
    };
    if (location.hash.indexOf("#b=") === 0) applyBuildCode(location.hash.slice(3));
    bindSegmented("resSeg", "res");
    bindSegmented("wlSeg", "workload");

    (function () {
      var p = loadPrefs();
      var bsel = $("#budgetSelect");
      if (p.budget && bsel && bsel.querySelector('option[value="' + p.budget + '"]')) bsel.value = p.budget;
      if (bsel) bsel.addEventListener("change", function () { savePrefs({ budget: this.value }); });
    })();
    // Reflect stored res/workload prefs on the segmented controls.
    document.querySelectorAll("#resSeg button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.val === state.res);
    });
    document.querySelectorAll("#wlSeg button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.val === state.workload);
    });
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
          [b.psu.name, fmtUsd(b.psu.priceUSD)],
          [b.cooler.name, b.cooler.priceUSD ? fmtUsd(b.cooler.priceUSD) : "$0"],
          [b.storage.name, fmtUsd(b.storage.priceUSD)]
        ].map(function (r) { return "<li><span></span><span>" + r[1] + "</span></li>"; });
        card.innerHTML =
          "<h4></h4>" +
          '<div class="gen-meta"></div>' +
          "<ul>" + rows.join("") + "</ul>" +
          '<button class="gen-load" type="button">Load this build</button>';
        card.querySelector("h4").textContent = b.cpu.name + " + " + b.gpu.name;
        var lis = card.querySelectorAll("li span:first-child");
        [b.cpu.name, b.gpu.name, b.mobo.name, b.ram.name, b.psu.name, b.cooler.name, b.storage.name].forEach(function (n, i) { lis[i].textContent = n; });
        card.querySelector(".gen-meta").innerHTML =
          'Total <span class="gen-total"></span> · bottleneck ' + b.pct + "% (" + b.limiter + "-limited) at " + resLabel() + " · " + eng.WORKLOADS[state.workload].label;
        card.querySelector(".gen-total").textContent = fmtUsd(b.total);
        card.querySelector(".gen-load").addEventListener("click", function () {
          state.cpuId = b.cpu.id; state.gpuId = b.gpu.id;
          state.moboId = b.mobo.id; state.ramId = b.ram.id; state.psuId = b.psu.id;
          state.coolerId = b.cooler.id; state.storageId = b.storage.id;
          $("#coolerSelect").value = b.cooler.id; $("#storageSelect").value = b.storage.id;
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
