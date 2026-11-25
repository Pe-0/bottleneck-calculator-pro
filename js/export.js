/* ============================================================
 * EXPORT & SHARE — print/PDF report, CSV download, copy link.
 * Works off the live Calculator selection; no data leaves the
 * browser (CSV/print are generated locally).
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };
  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }
  function esc(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }

  var RES_LABEL = { p1080: "1080p", p1440: "1440p", p2160: "4K" };

  function buildRows() {
    var sel = BCP.getSelection();
    var rows = [];
    rows.push(["Bottleneck Calculator Pro - build report"]);
    rows.push(["Generated", new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC"]);
    rows.push([]);
    rows.push(["Part", "Name", "Price (USD)"]);
    function priceOf(p) { return p && typeof p.priceUSD === "number" ? p.priceUSD : ""; }
    rows.push(["CPU", sel.cpu.name, BCP.prices.cpu[sel.cpu.id] || ""]);
    rows.push(["GPU", sel.gpu.name, BCP.prices.gpu[sel.gpu.id] || ""]);
    rows.push(["Motherboard", sel.mobo ? sel.mobo.name : "Not specified", priceOf(sel.mobo)]);
    rows.push(["Memory", sel.ram ? sel.ram.name : "Not specified", priceOf(sel.ram)]);
    rows.push(["PSU", sel.psu ? sel.psu.name : "", priceOf(sel.psu)]);
    rows.push(["Cooler", sel.cooler ? sel.cooler.name : "", priceOf(sel.cooler)]);
    rows.push(["Storage", sel.storage ? sel.storage.name : "", priceOf(sel.storage)]);
    rows.push([]);

    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var bn = eng.bottleneck(cpuBench, gpuScore, sel.res, sel.workload, sel.cpu);
    rows.push(["Bottleneck", bn.pct + "% " + (bn.limiter === "balanced" ? "balanced" : bn.limiter + "-limited"),
      "at " + (RES_LABEL[sel.res] || sel.res) + " - " + eng.WORKLOADS[sel.workload].label]);
    rows.push([]);
    if (sel.workload !== "productivity") {
      rows.push(["Game", "Estimated FPS @ " + (RES_LABEL[sel.res] || sel.res)]);
      BCP.games.items.map(function (g) {
        return { name: g.name, fps: eng.gameFps(g, cpuBench.gaming, gpuScore, sel.res, sel.workload, sel.gpu && sel.gpu.vramGB) };
      }).sort(function (a, b) { return b.fps - a.fps; }).forEach(function (r) {
        rows.push([r.name, r.fps]);
      });
      rows.push([]);
    }
    rows.push(["Data as-of", "Benchmarks " + BCP.benchmarks.meta.asOf + " (" + BCP.benchmarks.meta.confidence + ")",
      "Prices " + BCP.prices.meta.asOf + " (" + BCP.prices.meta.confidence + ")"]);
    rows.push(["Note", "All FPS and bottleneck figures are engine estimates, not measured results."]);
    return rows;
  }

  function downloadCsv() {
    var csv = buildRows().map(function (r) { return r.map(esc).join(","); }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bcp-build-report.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function copyLink(btn) {
    var url = location.href;
    function done(ok) {
      var old = btn.textContent;
      btn.textContent = ok ? "Copied!" : "Copy failed";
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { done(document.execCommand("copy")); } catch (e) { done(false); }
      ta.remove();
    }
  }

  function fillPrintHeader() {
    var sel = BCP.getSelection();
    var el = $("#printHeader");
    if (!el) return;
    el.textContent = "Bottleneck Calculator Pro - " + sel.cpu.name + " + " + sel.gpu.name +
      " - generated " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function init() {
    var printBtn = $("#expPrint"), csvBtn = $("#expCsv"), linkBtn = $("#expLink");
    if (!printBtn) return;
    printBtn.addEventListener("click", function () { fillPrintHeader(); window.print(); });
    csvBtn.addEventListener("click", downloadCsv);
    linkBtn.addEventListener("click", function () { copyLink(linkBtn); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
