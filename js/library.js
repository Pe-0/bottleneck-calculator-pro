/* ============================================================
 * LIBRARY — Games & software database tab + global search.
 * Games: per-game FPS estimate for the Calculator build, preset
 * suggestion, derived requirement tiers. Software: curated
 * professional workload profiles with component importance.
 * Search: header box matching every catalog + games + software.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  var GENRES = {
    cyberpunk: "Action RPG", rdr2: "Open world", hogwarts: "Action RPG", starfield: "RPG",
    eldenring: "Action RPG", bg3: "CRPG", witcher3: "RPG", forza: "Racing",
    spiderman: "Action", warzone: "Battle royale", fortnite: "Battle royale",
    apex: "Battle royale", cs2: "Competitive FPS", valorant: "Competitive FPS", minecraft: "Sandbox"
  };

  function resLabel(k) { return { p1080: "1080p", p1440: "1440p", p2160: "4K" }[k]; }

  // GPU score needed for a target fps at a resolution (GPU-bound assumption).
  function gpuScoreFor(g, fpsTarget, resKey) {
    return Math.ceil((fpsTarget / g.baseFps[resKey]) * 100);
  }
  function presetFor(fps) {
    if (fps < 35) return { name: "Low", cls: "bad" };
    if (fps < 60) return { name: "Medium", cls: "mid" };
    if (fps < 90) return { name: "High", cls: "" };
    return { name: "Ultra", cls: "good" };
  }

  var filter = "";

  function renderGames(sel) {
    var box = $("#gmList");
    box.innerHTML = "";
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var items = BCP.games.items.filter(function (g) {
      return !filter || g.name.toLowerCase().indexOf(filter) !== -1;
    });
    if (!items.length) {
      box.innerHTML = '<p class="muted">No games match that search.</p>';
      return;
    }
    items.forEach(function (g) {
      var fps = eng.gameFps(g, cpuBench.gaming, gpuScore, sel.res, sel.workload);
      var preset = presetFor(fps);
      var cpuCls = g.cpuWeight >= 0.7 ? "CPU-sensitive" : g.cpuWeight >= 0.5 ? "Balanced" : "GPU-bound";
      var card = document.createElement("div");
      card.className = "gm-card";
      card.innerHTML =
        '<div class="gm-head"><strong></strong><span class="gm-genre muted"></span></div>' +
        '<div class="gm-stats">' +
          '<span class="gm-fps"><b>' + fps + "</b> fps est. at " + resLabel(sel.res) + "</span>" +
          '<span>preset: <b class="gm-preset ' + preset.cls + '">' + preset.name + "</b></span>" +
          '<span class="muted">' + cpuCls + "</span>" +
        "</div>" +
        '<div class="gm-req muted">GPU score needed: 30 fps 1080p ≥ ' + gpuScoreFor(g, 30, "p1080") +
          " · 60 fps 1080p ≥ " + gpuScoreFor(g, 60, "p1080") +
          " · 60 fps 4K ≥ " + gpuScoreFor(g, 60, "p2160") +
          (g.cap ? " · engine-capped at " + g.cap + " fps" : "") +
        "</div>";
      card.querySelector(".gm-head strong").textContent = g.name;
      card.querySelector(".gm-genre").textContent = GENRES[g.id] || "";
      box.appendChild(card);
    });
  }

  function impBar(label, frac, colorCls) {
    var w = clamp(Math.round(frac * 100), 2, 100);
    return '<div class="sw-imp"><span class="sw-imp-label">' + label + "</span>" +
      '<span class="fps-bar sw-bar"><span class="fps-fill ' + (colorCls || "") + '" style="width:' + w + '%"></span></span></div>';
  }

  function renderSoftware(sel) {
    var box = $("#swList");
    box.innerHTML = "";
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var ramGB = sel.ram ? sel.ram.capacityGB : null;
    BCP.software.items.forEach(function (s) {
      if (filter && s.name.toLowerCase().indexOf(filter) === -1 && s.category.toLowerCase().indexOf(filter) === -1) return;
      var verdicts = [];
      if (s.gpuImp >= 0.9 && gpuScore < 55) verdicts.push({ lv: "warn", t: "Your GPU may limit this workload." });
      if (s.gpuImp >= 0.9 && sel.gpu.vramGB < 12) verdicts.push({ lv: "warn", t: "VRAM is tight for this - 12 GB or more recommended." });
      if (s.cpuImp >= 0.8 && cpuBench.productivity < 40) verdicts.push({ lv: "warn", t: "Multi-core CPU performance may limit this workload." });
      if (ramGB !== null && ramGB < s.ramGB) verdicts.push({ lv: "info", t: s.ramGB + " GB RAM recommended - you have " + ramGB + " GB selected." });
      if (!verdicts.length) verdicts.push({ lv: "ok", t: "Your current build looks well matched." });
      var card = document.createElement("div");
      card.className = "gm-card sw-card";
      card.innerHTML =
        '<div class="gm-head"><strong></strong><span class="gm-genre muted"></span></div>' +
        '<div class="sw-bars">' +
          impBar("CPU", s.cpuImp) + impBar("GPU", s.gpuImp) + impBar("RAM", Math.min(1, s.ramGB / 64), s.ramGB >= 64 ? "fill-mid" : "") +
        "</div>" +
        '<p class="sw-note muted"></p>' +
        '<ul class="warn-list sw-verdicts"></ul>';
      card.querySelector(".gm-head strong").textContent = s.name;
      card.querySelector(".gm-genre").textContent = s.category + " · " + s.ramGB + " GB RAM rec.";
      card.querySelector(".sw-note").textContent = s.note;
      var ul = card.querySelector(".sw-verdicts");
      verdicts.forEach(function (v) {
        var li = document.createElement("li");
        li.className = "warn " + v.lv;
        li.textContent = v.t;
        ul.appendChild(li);
      });
      box.appendChild(card);
    });
    if (!box.children.length) box.innerHTML = '<p class="muted">No software matches that search.</p>';
  }

  function renderAll() {
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    $("#gmBuildLine").textContent = sel.cpu.name + " + " + sel.gpu.name + " at " + resLabel(sel.res) + " · " + eng.WORKLOADS[sel.workload].label + " (from the Calculator tab)";
    renderGames(sel);
    renderSoftware(sel);
  }

  /* ---------- global search ---------- */

  function indexAll() {
    var idx = [];
    function add(name, kind, action) { idx.push({ name: name.toLowerCase(), label: name, kind: kind, action: action }); }
    BCP.cpus.items.forEach(function (c) { add(c.name, "CPU", function () { BCP.setSelection({ cpuId: c.id }); go("calc"); }); });
    BCP.gpus.items.forEach(function (g) { add(g.name, "GPU", function () { BCP.setSelection({ gpuId: g.id }); go("calc"); }); });
    BCP.motherboards.items.forEach(function (m) { add(m.name, "Motherboard", function () { BCP.setSelection({ moboId: m.id }); go("calc"); }); });
    BCP.memoryKits.items.forEach(function (k) { add(k.name, "Memory", function () { BCP.setSelection({ ramId: k.id }); go("calc"); }); });
    BCP.psus.items.forEach(function (p) { add(p.name, "PSU", function () { BCP.setSelection({ psuId: p.id }); go("calc"); }); });
    BCP.storage.items.forEach(function (s) { add(s.name, "Storage", function () { BCP.setSelection({ storageId: s.id }); go("calc"); }); });
    BCP.coolers.items.forEach(function (c) { add(c.name, "Cooler", function () { BCP.setSelection({ coolerId: c.id }); go("calc"); }); });
    BCP.games.items.forEach(function (g) { add(g.name, "Game", function () { go("games"); var inp = $("#gmSearch"); inp.value = g.name; filter = g.name.toLowerCase(); renderAll(); }); });
    BCP.software.items.forEach(function (s) { add(s.name, "Software", function () { go("games"); var inp = $("#gmSearch"); inp.value = s.name; filter = s.name.toLowerCase(); renderAll(); }); });
    return idx;
  }

  function go(view) {
    var btn = document.querySelector('.tab-btn[data-view="' + view + '"]');
    if (btn) btn.click();
  }

  function initSearch() {
    var idx = indexAll();
    var input = $("#globalSearch");
    var dd = $("#searchResults");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      dd.innerHTML = "";
      if (q.length < 2) { dd.classList.add("hidden"); return; }
      var hits = idx.filter(function (e) { return e.name.indexOf(q) !== -1; }).slice(0, 8);
      if (!hits.length) {
        dd.innerHTML = '<div class="sr-item muted">No matches</div>';
      } else {
        hits.forEach(function (h) {
          var d = document.createElement("div");
          d.className = "sr-item";
          d.innerHTML = '<span class="sr-kind"></span><span class="sr-name"></span>';
          d.querySelector(".sr-kind").textContent = h.kind;
          d.querySelector(".sr-name").textContent = h.label;
          d.addEventListener("mousedown", function (e) {
            e.preventDefault();
            input.value = "";
            dd.classList.add("hidden");
            h.action();
          });
          dd.appendChild(d);
        });
      }
      dd.classList.remove("hidden");
    });
    input.addEventListener("blur", function () { setTimeout(function () { dd.classList.add("hidden"); }, 150); });
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "games") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          ["viewCalc", "viewCompare", "viewUpgrade", "viewPower"].forEach(function (id) { document.getElementById(id).classList.add("hidden"); });
          $("#viewGames").classList.remove("hidden");
          window.scrollTo(0, 0);
          renderAll();
        });
      } else {
        b.addEventListener("click", function () { $("#viewGames").classList.add("hidden"); });
      }
    });
    $("#gmSearch").addEventListener("input", function () {
      filter = this.value.trim().toLowerCase();
      renderAll();
    });
    initSearch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
