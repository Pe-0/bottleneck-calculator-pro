/* ============================================================
 * POWER & THERMAL — per-component power draw, PSU analysis and
 * temperature estimates for the build selected on the Calculator
 * tab. All figures are TDP-based estimates, labeled as such.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };

  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Rule-of-thumb draws for the parts without a rated TDP in the DB.
  var FIXED = {
    mobo: 40,          // chipset + VRM losses + onboard
    ramPerStick: 4,    // DDR4/DDR5 DIMM under load
    ssdNvme: 8,
    ssdSata: 4,
    coolerAir: 6,      // 1-2 fans
    coolerAio: 14      // pump + 2-3 radiator fans
  };

  function breakdown(sel) {
    var rows = [];
    rows.push({ name: sel.cpu.name, tag: "CPU", w: sel.cpu.tdpW, note: sel.cpu.tdpW + "W rated TDP" });
    rows.push({ name: sel.gpu.name, tag: "GPU", w: sel.gpu.tdpW, note: sel.gpu.tdpW + "W rated TDP (transient spikes higher)" });
    rows.push({ name: "Motherboard", tag: "board", w: FIXED.mobo, note: "typical board + VRM losses" });
    var ramW = sel.ram ? sel.ram.modules * FIXED.ramPerStick : 2 * FIXED.ramPerStick;
    rows.push({ name: sel.ram ? sel.ram.name : "Memory (assumed 2 sticks)", tag: "RAM", w: ramW, note: "~" + FIXED.ramPerStick + "W per module" });
    var ssdW = sel.storage ? (sel.storage.interface === "SATA" ? FIXED.ssdSata : FIXED.ssdNvme) : FIXED.ssdNvme;
    rows.push({ name: sel.storage ? sel.storage.name : "Storage (assumed NVMe)", tag: "SSD", w: ssdW, note: sel.storage && sel.storage.interface === "SATA" ? "SATA drive" : "NVMe under load" });
    var coolW = sel.cooler && sel.cooler.type === "AIO" ? FIXED.coolerAio : FIXED.coolerAir;
    rows.push({ name: sel.cooler ? sel.cooler.name : "Cooling (assumed air)", tag: "cooling", w: coolW, note: sel.cooler && sel.cooler.type === "AIO" ? "pump + radiator fans" : "1-2 case/CPU fans" });
    return rows;
  }

  function renderPower(sel) {
    var rows = breakdown(sel);
    var c = BCP.compat.psu;
    var totalTdp = rows.reduce(function (s, r) { return s + r.w; }, 0);
    var spike = Math.round(sel.gpu.tdpW * (c.gpuSpikeFactor - 1));
    var peak = totalTdp + spike;
    var gaming = Math.round(sel.cpu.tdpW * 0.85 + sel.gpu.tdpW * 0.9 + (totalTdp - sel.cpu.tdpW - sel.gpu.tdpW));
    var idle = Math.round(35 + (sel.cpu.tdpW + sel.gpu.tdpW) * 0.08);
    var rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW);

    var box = $("#pwBreakdown");
    box.innerHTML = "";
    var maxW = Math.max.apply(null, rows.map(function (r) { return r.w; }));
    rows.forEach(function (r) {
      var div = document.createElement("div");
      div.className = "pw-row";
      var wPct = clamp(Math.round((r.w / maxW) * 100), 3, 100);
      div.innerHTML =
        '<span class="pw-name"></span>' +
        '<span class="fps-bar pw-bar"><span class="fps-fill" style="width:' + wPct + '%"></span></span>' +
        '<span class="pw-w">' + r.w + "W</span>" +
        '<span class="pw-note muted"></span>';
      div.querySelector(".pw-name").textContent = r.name;
      div.querySelector(".pw-note").textContent = r.note;
      box.appendChild(div);
    });

    var cards = [
      ["Idle draw", "~" + idle + "W"],
      ["Typical gaming draw", "~" + gaming + "W"],
      ["Peak incl. GPU transients", "~" + peak + "W"],
      ["Recommended PSU", rec + "W"]
    ];
    var statBox = $("#pwStats");
    statBox.innerHTML = "";
    cards.forEach(function (cd) {
      var d = document.createElement("div");
      d.className = "pw-stat";
      d.innerHTML = "<small></small><strong></strong>";
      d.querySelector("small").textContent = cd[0];
      d.querySelector("strong").textContent = cd[1];
      statBox.appendChild(d);
    });

    // PSU verdict
    var psu = sel.psu;
    var list = $("#pwPsuList");
    list.innerHTML = "";
    function li(level, text) {
      var el = document.createElement("li");
      el.className = "warn " + level;
      el.textContent = text;
      list.appendChild(el);
    }
    if (psu) {
      var headroom = Math.round((psu.wattageW / Math.max(peak, 1) - 1) * 100);
      if (psu.wattageW < rec) {
        li("bad", psu.name + " (" + psu.wattageW + "W) is below the recommended " + rec + "W for this pair - expect shutdowns under load.");
      } else if (headroom < 15) {
        li("warn", psu.wattageW + "W covers the estimated peak (~" + peak + "W) with only ~" + headroom + "% headroom - a step up would be quieter and safer.");
      } else {
        li("ok", psu.name + " (" + psu.wattageW + "W) leaves ~" + headroom + "% headroom over the estimated peak - good margin.");
      }
      li("info", "Efficiency: " + psu.efficiency + " · " + psu.modular + " modular. Higher 80 PLUS tiers waste less power as heat, especially around 50% load.");
      if (sel.gpu.tdpW >= 300) {
        if (psu.atx31) {
          li("ok", "ATX 3.x unit with a native 12V-2x6 cable - correct for this " + sel.gpu.tdpW + "W card.");
        } else {
          li("warn", "This GPU draws " + sel.gpu.tdpW + "W through a 12V-2x6/12VHPWR connector - prefer an ATX 3.x PSU with the native cable over adapters.");
        }
      } else {
        li("info", "Standard PCIe power connectors are fine at this GPU's " + sel.gpu.tdpW + "W draw.");
      }
    }
  }

  function renderThermal(sel) {
    var ambient = 25;
    var cooler = sel.cooler;
    var rating = cooler ? cooler.tdpRatingW : 65;
    var ratio = sel.cpu.tdpW / Math.max(rating, 1);
    var loadTemp = Math.round(clamp(ambient + ratio * 62, 35, 100));
    var idleTemp = Math.round(clamp(ambient + 8 + ratio * 4, 28, 45));

    var cls, clsText, level;
    if (loadTemp < 70)      { cls = "good"; clsText = "Comfortable";        level = "ok"; }
    else if (loadTemp < 85) { cls = "mid";  clsText = "Warm, still boosting"; level = "info"; }
    else if (loadTemp < 95) { cls = "mid";  clsText = "Boost-limited";      level = "warn"; }
    else                    { cls = "bad";  clsText = "Throttling risk";    level = "bad"; }

    $("#thCpuTemp").textContent = "~" + loadTemp + "C";
    $("#thCpuTemp").className = "th-temp " + cls;
    $("#thCpuClass").textContent = clsText + " under sustained all-core load (idle ~" + idleTemp + "C)";

    var headroom = rating - sel.cpu.tdpW;
    var bar = $("#thHeadroom");
    bar.style.width = clamp(Math.round((rating / Math.max(sel.cpu.tdpW, rating)) * 100), 5, 100) + "%";
    bar.className = "fps-fill " + (headroom >= 30 ? "" : headroom >= 0 ? "fill-mid" : "fill-bad");

    var list = $("#thList");
    list.innerHTML = "";
    function li(lv, text) {
      var el = document.createElement("li");
      el.className = "warn " + lv;
      el.textContent = text;
      list.appendChild(el);
    }
    if (cooler) {
      if (cooler.id === "cl-stock") {
        li(sel.cpu.stockCooler ? "info" : "warn",
           sel.cpu.stockCooler
             ? "The stock cooler is adequate for the " + sel.cpu.tdpW + "W " + sel.cpu.name + " at stock settings - expect higher fan noise under sustained load."
             : "The " + sel.cpu.name + " ships without a stock cooler - you need an aftermarket unit.");
      }
      if (headroom < 0) {
        li("bad", cooler.name + " is rated ~" + rating + "W against a " + sel.cpu.tdpW + "W CPU - the CPU will pull back clocks to stay within its thermal limit.");
      } else if (headroom < 30) {
        li("warn", "Cooler headroom is tight (" + rating + "W rating vs " + sel.cpu.tdpW + "W CPU) - fine for gaming, borderline for long render workloads.");
      } else {
        li("ok", cooler.name + " has ~" + headroom + "W of thermal headroom over the " + sel.cpu.tdpW + "W CPU.");
      }
    }
    var gpuTemp = Math.round(52 + sel.gpu.tdpW / 15);
    if (sel.gpu.tdpW >= 350) {
      li("warn", sel.gpu.name + " class cards run warm by design (expect ~" + gpuTemp + "C core) - keep the case intake clear.");
    } else {
      li("info", "GPU load temperature estimate: ~" + gpuTemp + "C core - within normal range for this class.");
    }
    if (sel.workload === "productivity" || sel.workload === "streaming") {
      li("info", "Sustained multi-core work keeps the CPU at full power longer than gaming - cooler quality matters more here.");
    }
  }

  /* ---------- electricity cost ---------- */
  var EC_KEY = "bcp-power-cost";
  function ecSettings() {
    var d = { gameH: 2, idleH: 6, rate: 0.17 };
    try {
      var raw = localStorage.getItem(EC_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (typeof s.gameH === "number") d.gameH = s.gameH;
        if (typeof s.idleH === "number") d.idleH = s.idleH;
        if (typeof s.rate === "number") d.rate = s.rate;
      }
    } catch (e) {}
    return d;
  }
  function ecSave(s) {
    try { localStorage.setItem(EC_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function renderCost(sel) {
    var box = $("#ecStats");
    if (!box) return;
    var rows = breakdown(sel);
    var totalTdp = rows.reduce(function (s, r) { return s + r.w; }, 0);
    var gaming = Math.round(sel.cpu.tdpW * 0.85 + sel.gpu.tdpW * 0.9 + (totalTdp - sel.cpu.tdpW - sel.gpu.tdpW));
    var idle = Math.round(35 + (sel.cpu.tdpW + sel.gpu.tdpW) * 0.08);
    var s = ecSettings();
    var gh = $("#ecGameH"), ih = $("#ecIdleH"), rt = $("#ecRate");
    if (gh && document.activeElement !== gh) gh.value = s.gameH;
    if (ih && document.activeElement !== ih) ih.value = s.idleH;
    if (rt && document.activeElement !== rt) rt.value = s.rate;
    var EFF = 0.88;
    var gameWh = (gaming / EFF) * s.gameH;
    var idleWh = (idle / EFF) * s.idleH;
    var dailyKwh = (gameWh + idleWh) / 1000;
    var dailyCost = dailyKwh * s.rate;
    var gameShare = (gameWh + idleWh) > 0 ? Math.round((gameWh / (gameWh + idleWh)) * 100) : 0;
    var cards = [
      ["Per day", "$" + dailyCost.toFixed(2) + " (" + dailyKwh.toFixed(2) + " kWh)"],
      ["Per month", "$" + (dailyCost * 30.4).toFixed(2)],
      ["Per year", "$" + (dailyCost * 365).toFixed(2)],
      ["Gaming share", gameShare + "% of the energy"]
    ];
    box.innerHTML = "";
    cards.forEach(function (cd) {
      var d = document.createElement("div");
      d.className = "pw-stat";
      d.innerHTML = "<small></small><strong></strong>";
      d.querySelector("small").textContent = cd[0];
      d.querySelector("strong").textContent = cd[1];
      box.appendChild(d);
    });
  }

  function renderAll() {
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    $("#pwBuildLine").textContent = sel.cpu.name + " + " + sel.gpu.name + (sel.cooler ? " · " + sel.cooler.name : "") + (sel.psu ? " · " + sel.psu.name : "");
    renderPower(sel);
    renderThermal(sel);
    renderCost(sel);
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "power") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          $("#viewCalc").classList.add("hidden");
          $("#viewCompare").classList.add("hidden");
          $("#viewUpgrade").classList.add("hidden");
          $("#viewPower").classList.remove("hidden");
          window.scrollTo(0, 0);
          renderAll();
        });
      } else {
        b.addEventListener("click", function () { $("#viewPower").classList.add("hidden"); });
      }
    });
    ["ecGameH", "ecIdleH", "ecRate"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", function () {
        var s = ecSettings();
        var v = parseFloat(el.value);
        if (isNaN(v) || v < 0) return;
        if (id === "ecGameH") s.gameH = Math.min(v, 24);
        if (id === "ecIdleH") s.idleH = Math.min(v, 24);
        if (id === "ecRate") s.rate = v;
        ecSave(s);
        renderCost(BCP.getSelection());
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
