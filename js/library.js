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
  var upscaleBoost = 0; // 0 = off; otherwise GPU-term multiplier
  var genreFilter = null;
  var favs = {};
  try { favs = JSON.parse(localStorage.getItem("bcp.games.favs") || "{}"); } catch (e) { favs = {}; }
  function saveFavs() { try { localStorage.setItem("bcp.games.favs", JSON.stringify(favs)); } catch (e) {} }

  function upscaleTech(gpu) {
    if (gpu.brand === "NVIDIA" && !/^GTX/.test(gpu.name)) return "DLSS";
    if (gpu.brand === "Intel") return "XeSS";
    return "FSR"; // FSR runs on every modern GPU
  }

  function renderVr(sel) {
    var box = $("#vrVerdict");
    if (!box) return;
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var vram = sel.gpu.vramGB || 0;
    var cls, text;
    if (gpuScore >= 80 && vram >= 12) {
      cls = "good"; text = "Comfortable for demanding PC VR - high settings at 90 Hz in most titles.";
    } else if (gpuScore >= 55 && vram >= 8) {
      cls = "good"; text = "Ready for PC VR - medium to high settings; the heaviest titles may need reprojection.";
    } else if (gpuScore >= 35 && vram >= 6) {
      cls = "mid"; text = "Entry-level PC VR - expect low to medium settings and reprojection in heavy titles.";
    } else {
      cls = "bad"; text = "Not recommended for PC VR - this GPU is below the practical floor for a smooth experience.";
    }
    var cpuNote = cpuBench.gaming < 60
      ? " CPU note: sim and physics-heavy VR titles (flight sims, Bonelab-style) may be held back by this processor."
      : "";
    box.innerHTML = '<li class="warn ' + cls + '"></li>';
    box.firstChild.textContent = sel.gpu.name + ": " + text + cpuNote;
    box.className = "warn-list";
  }

  function renderChips() {
    var box = $("#gmChips");
    if (!box) return;
    var genres = [];
    Object.keys(GENRES).forEach(function (id) {
      if (genres.indexOf(GENRES[id]) === -1) genres.push(GENRES[id]);
    });
    genres.sort();
    box.innerHTML = "";
    function chip(label, val) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gm-chip" + (genreFilter === val ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", function () {
        genreFilter = val;
        renderChips();
        renderAll();
      });
      box.appendChild(b);
    }
    chip("All", null);
    if (Object.keys(favs).some(function (k) { return favs[k]; })) chip("\u2605 Favorites", "__fav");
    genres.forEach(function (g) { chip(g, g); });
  }

  function renderGames(sel) {
    var box = $("#gmList");
    box.innerHTML = "";
    var cpuBench = BCP.benchmarks.cpu[sel.cpu.id];
    var gpuScore = BCP.benchmarks.gpu[sel.gpu.id];
    var tech = upscaleTech(sel.gpu);
    $("#gmUpscaleLabel").textContent = "Upscaling (" + tech + ")";
    var items = BCP.games.items.filter(function (g) {
      if (filter && g.name.toLowerCase().indexOf(filter) === -1) return false;
      if (genreFilter === "__fav" && !favs[g.id]) return false;
      if (genreFilter && genreFilter !== "__fav" && GENRES[g.id] !== genreFilter) return false;
      return true;
    });
    items = items.slice().sort(function (a, b) { return (favs[b.id] ? 1 : 0) - (favs[a.id] ? 1 : 0); });
    if (!items.length) {
      box.innerHTML = '<p class="muted">No games match that filter.</p>';
      return;
    }
    items.forEach(function (g) {
      var native = eng.gameFps(g, cpuBench.gaming, gpuScore, sel.res, sel.workload, sel.gpu.vramGB);
      var fps = upscaleBoost > 0
        ? eng.gameFpsUpscaled(g, cpuBench.gaming, gpuScore, sel.res, sel.workload, upscaleBoost, sel.gpu.vramGB)
        : native;
      var preset = presetFor(fps);
      var cpuCls = g.cpuWeight >= 0.7 ? "CPU-sensitive" : g.cpuWeight >= 0.5 ? "Balanced" : "GPU-bound";
      var fpsRoomy = upscaleBoost > 0
        ? eng.gameFpsUpscaled(g, cpuBench.gaming, gpuScore, sel.res, sel.workload, upscaleBoost, 16)
        : eng.gameFps(g, cpuBench.gaming, gpuScore, sel.res, sel.workload, 16);
      var vramLoss = fpsRoomy > fps ? Math.round((fpsRoomy - fps) / fpsRoomy * 100) : 0;
      var card = document.createElement("div");
      card.className = "gm-card";
      card.innerHTML =
        '<div class="gm-head"><strong></strong><span class="gm-genre muted"></span><button type="button" class="gm-fav" title="Favorite"></button></div>' +
        '<div class="gm-stats">' +
          '<span class="gm-fps"><b>' + fps + "</b> fps est. at " + resLabel(sel.res) +
            (upscaleBoost > 0 && fps > native ? ' <span class="muted gm-native">(' + native + " native)</span>" : "") + "</span>" +
          '<span>preset: <b class="gm-preset ' + preset.cls + '">' + preset.name + "</b></span>" +
          '<span class="muted">' + cpuCls + "</span>" +
          (vramLoss >= 4 ? '<span class="gm-vram">VRAM-limited: ' + (sel.gpu.vramGB || 0) + " GB costs ~" + vramLoss + "% at " + resLabel(sel.res) + "</span>" : "") +
        "</div>" +
        '<div class="gm-req muted">GPU score needed: 30 fps 1080p ≥ ' + gpuScoreFor(g, 30, "p1080") +
          " · 60 fps 1080p ≥ " + gpuScoreFor(g, 60, "p1080") +
          " · 60 fps 4K ≥ " + gpuScoreFor(g, 60, "p2160") +
          (g.cap ? " · engine-capped at " + g.cap + " fps" : "") +
        "</div>";
      card.querySelector(".gm-head strong").textContent = g.name;
      card.querySelector(".gm-genre").textContent = GENRES[g.id] || "";
      var favBtn = card.querySelector(".gm-fav");
      favBtn.textContent = favs[g.id] ? "\u2605" : "\u2606";
      favBtn.classList.toggle("active", !!favs[g.id]);
      favBtn.setAttribute("aria-pressed", favs[g.id] ? "true" : "false");
      favBtn.addEventListener("click", function () {
        if (favs[g.id]) delete favs[g.id]; else favs[g.id] = true;
        saveFavs();
        renderChips();
        renderAll();
      });
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
        '<div class="gm-head"><strong></strong><span class="gm-genre muted"></span><button type="button" class="gm-fav" title="Favorite"></button></div>' +
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
    renderVr(sel);
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
    // Quick actions: views + common commands (command palette).
    [["Calculator", "calc"], ["Compare", "compare"], ["Upgrade", "upgrade"], ["Power", "power"],
     ["Games", "games"], ["Monitors", "monitors"], ["Dashboard", "dash"], ["Community", "community"]
    ].forEach(function (t) { add("Go to " + t[0], "View", function () { go(t[1]); }); });
    add("Toggle dark mode", "Action", function () { var b = document.getElementById("themeToggle"); if (b) b.click(); });
    add("Print report", "Action", function () { go("calc"); var b = document.getElementById("expPrint"); if (b) b.click(); });
    add("Save this build", "Action", function () { go("calc"); var b = document.getElementById("saveBuildBtn"); if (b) b.click(); });
    add("Account / sign in", "View", function () { var b = document.getElementById("navAuthBtn"); if (b) b.click(); });
    add("Data sources & methodology", "View", function () { var l = document.getElementById("dataLink"); if (l) l.click(); });
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
          d.setAttribute("data-i", "1");
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
      selIdx = -1;
    });
    input.addEventListener("blur", function () { setTimeout(function () { dd.classList.add("hidden"); }, 150); });

    // Keyboard: Ctrl/Cmd+K focuses search; arrows + Enter walk results; Esc closes.
    var selIdx = -1;
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
    input.addEventListener("keydown", function (e) {
      var items = dd.querySelectorAll(".sr-item[data-i]");
      if (e.key === "Escape") { input.value = ""; dd.classList.add("hidden"); input.blur(); return; }
      if (!items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        selIdx = e.key === "ArrowDown" ? Math.min(selIdx + 1, items.length - 1) : Math.max(selIdx - 1, 0);
        items.forEach(function (d, i) { d.classList.toggle("sr-sel", i === selIdx); });
        items[selIdx] && items[selIdx].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && selIdx >= 0 && items[selIdx]) {
        e.preventDefault();
        items[selIdx].dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      }
    });
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
    renderChips();
    $("#gmSearch").addEventListener("input", function () {
      filter = this.value.trim().toLowerCase();
      renderAll();
    });
    document.querySelectorAll("#gmUpscaleSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#gmUpscaleSeg button").forEach(function (x) { x.classList.toggle("active", x === b); });
        upscaleBoost = parseFloat(b.getAttribute("data-val"));
        renderAll();
      });
    });
    initSearch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
