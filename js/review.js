/* ============================================================
 * BUILD REVIEW - heuristic scores for the current Calculator build:
 * efficiency, longevity, upgradeability, noise, plus risks and a decision summary.
 * Efficiency and the performance parts of longevity are percentile ranks inside
 * our own database (no invented constants). Everything is labeled as a heuristic.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function pctRank(list, v) {
    if (!list.length) return 50;
    var below = list.filter(function (x) { return x < v; }).length, eq = list.filter(function (x) { return x === v; }).length;
    return Math.round(((below + eq / 2) / list.length) * 100);
  }
  var cache = null;
  function pools() {
    if (cache) return cache;
    var g = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && BCP.benchmarks.gpu[x.id]; });
    var c = BCP.cpus.items.filter(function (x) { return !x.legacy && !x.mobile && BCP.benchmarks.cpu[x.id]; });
    cache = {
      gpuPerf: g.map(function (x) { return BCP.benchmarks.gpu[x.id]; }),
      gpuEff: g.map(function (x) { return BCP.benchmarks.gpu[x.id] / x.tdpW; }),
      cpuPerf: c.map(function (x) { return BCP.benchmarks.cpu[x.id].gaming; }),
      cpuEff: c.map(function (x) { return BCP.benchmarks.cpu[x.id].gaming / x.tdpW; })
    };
    return cache;
  }
  var PLATFORM = { "AM5": 100, "LGA1851": 85, "LGA1700": 45, "AM4": 35, "LGA1200": 15 };
  function ord(n) { var m = n % 100; if (m >= 11 && m <= 13) return n + "th"; return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"); }
  function label(s) { return s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Weak"; }
  function cls(s) { return s >= 60 ? "good" : s >= 40 ? "mid" : "bad"; }

  function compute(sel) {
    var P = pools(), cpu = sel.cpu, gpu = sel.gpu;
    var gScore = BCP.benchmarks.gpu[gpu.id], cBench = BCP.benchmarks.cpu[cpu.id];
    if (!gScore || !cBench) return null;
    var out = { scores: [], risks: [], strengths: [] };
    var gEff = pctRank(P.gpuEff, gScore / gpu.tdpW), cEff = pctRank(P.cpuEff, cBench.gaming / cpu.tdpW);
    var eff = Math.round(0.7 * gEff + 0.3 * cEff);
    out.scores.push({ id: "eff", name: "Efficiency", v: eff, why: "Performance per watt: GPU at the " + ord(gEff) + " percentile and CPU at the " + ord(cEff) + " among current parts in our database." });
    var vram = gpu.vramGB, vramS = vram >= 16 ? 100 : vram >= 12 ? 80 : vram >= 8 ? 50 : 25;
    var plat = PLATFORM[cpu.socket] != null ? PLATFORM[cpu.socket] : 10;
    var gPerf = pctRank(P.gpuPerf, gScore), cPerf = pctRank(P.cpuPerf, cBench.gaming);
    var longev = Math.round(0.4 * gPerf + 0.25 * vramS + 0.2 * cPerf + 0.15 * plat);
    out.scores.push({ id: "long", name: "Longevity", v: longev, why: "GPU speed (" + ord(gPerf) + " percentile), " + vram + " GB VRAM, CPU speed (" + cPerf + "th percentile) and the " + cpu.socket + " platform." });
    var rec = BCP.engine.recommendedPsuW(cpu.tdpW, gpu.tdpW), psuW = sel.psu ? sel.psu.wattageW : 0;
    var head = psuW ? psuW / rec : 0, headS = clamp(Math.round((head - 1) / 0.5 * 100), 0, 100);
    var ramS = sel.ram ? (sel.ram.type === "DDR5" ? 100 : 40) : (/DDR5/.test((sel.mobo && sel.mobo.ramType) || "") ? 100 : 60);
    var upg = Math.round(0.5 * plat + 0.3 * headS + 0.2 * ramS);
    out.scores.push({ id: "upg", name: "Upgradeability", v: upg, why: "Socket runway (" + cpu.socket + "), PSU headroom (" + psuW + " W vs " + rec + " W recommended) and memory generation." });
    var heat = cpu.tdpW * 0.6 + gpu.tdpW, quiet = 100 - clamp((heat - 100) / 5, 0, 70);
    var cooler = sel.cooler;
    if (cooler && cooler.id === "cl-stock" && cpu.tdpW > 65) quiet -= 15;
    if (cooler && cooler.type === "AIO") quiet -= 3;
    if (sel.psu && sel.psu.efficiency === "Bronze") quiet -= 5;
    quiet = Math.round(clamp(quiet, 5, 100));
    out.scores.push({ id: "noise", name: "Quietness", v: quiet, why: "Rough estimate from combined CPU and GPU heat output (" + cpu.tdpW + " W + " + gpu.tdpW + " W), cooler type and PSU efficiency. Not a measured dBA figure." });
    // risks
    if (psuW && head < 1.0) out.risks.push("PSU is below the recommended " + rec + " W for this CPU and GPU.");
    else if (psuW && head < 1.2) out.risks.push("PSU headroom is thin (" + Math.round((head - 1) * 100) + "% over the recommendation), which limits GPU upgrades.");
    if (cooler && cooler.tdpRatingW && cooler.tdpRatingW < cpu.tdpW) out.risks.push("Cooler is rated " + cooler.tdpRatingW + " W, below this CPU's " + cpu.tdpW + " W TDP.");
    if (vram < 8) out.risks.push("Only " + vram + " GB of VRAM: expect texture limits in newer games.");
    if (plat <= 35) out.risks.push("The " + cpu.socket + " platform is end-of-line, so there is no CPU upgrade path.");
    if (cpu.legacy || gpu.legacy) out.risks.push("Legacy part(s): prices and scores are lower-confidence estimates.");
    var bn = BCP.engine.bottleneck(cBench, gScore, sel.res, sel.workload, cpu);
    if (bn && bn.pct >= 25) out.risks.push("About " + Math.round(bn.pct) + "% " + (bn.limiter || "bottleneck") + " limit at this resolution and workload.");
    out.scores.forEach(function (s) { if (s.v >= 75) out.strengths.push(s.name.toLowerCase()); });
    return out;
  }

  var lastKey = "";
  function render() {
    var box = $("#reviewBody"); if (!box || !BCP.getSelection || !BCP.engine) return;
    var sel = BCP.getSelection(); if (!sel || !sel.cpu || !sel.gpu) return;
    var key = [sel.cpu, sel.gpu, sel.mobo, sel.ram, sel.psu, sel.cooler].map(function (x) { return x ? x.id : "-"; }).join("|") + sel.res + sel.workload;
    if (key === lastKey) return; lastKey = key;
    box.innerHTML = "";
    var r = compute(sel);
    if (!r) { box.appendChild(el("p", "muted", "No review for this combination: benchmark data is missing for one of the parts.")); return; }
    var grid = el("div", "rv-grid");
    r.scores.forEach(function (s) {
      var c = el("div", "rv-card");
      var top = el("div", "rv-top"); top.appendChild(el("strong", null, s.name)); top.appendChild(el("span", "rv-val " + cls(s.v), s.v + " · " + label(s.v)));
      c.appendChild(top);
      var bar = el("div", "rv-bar"); var fill = el("div", "rv-fill " + cls(s.v)); fill.style.width = s.v + "%"; bar.appendChild(fill); c.appendChild(bar);
      c.appendChild(el("p", "muted rv-why", s.why));
      grid.appendChild(c);
    });
    box.appendChild(grid);
    var weakest = r.scores.slice().sort(function (a, b) { return a.v - b.v; })[0];
    var sum = "Summary: " + (r.strengths.length ? "strong on " + r.strengths.join(", ") : "no standout strength") + "; weakest area is " + weakest.name.toLowerCase() + " (" + weakest.v + "). " + (r.risks.length ? r.risks.length + " risk" + (r.risks.length > 1 ? "s" : "") + " flagged below." : "No risks flagged.");
    box.appendChild(el("p", "rv-sum", sum));
    if (r.risks.length) { var ul = el("ul", "warn-list"); r.risks.forEach(function (t) { ul.appendChild(el("li", "warn", t)); }); box.appendChild(ul); }
  }
  BCP.reviewHook = render;
  document.addEventListener("DOMContentLoaded", render);
})();
