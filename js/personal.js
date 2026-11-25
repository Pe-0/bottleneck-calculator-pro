/* ============================================================
 * PERSONAL — light/dark theme toggle (persisted) and saved
 * builds (localStorage). Everything stays on the device.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var $ = function (sel) { return document.querySelector(sel); };
  var THEME_KEY = "bcp-theme";
  var BUILDS_KEY = "bcp-saved-builds";

  /* ---------- theme ---------- */
  function applyTheme(t) {
    document.body.setAttribute("data-theme", t);
    var btn = $("#themeToggle");
    if (btn) btn.textContent = t === "light" ? "Dark mode" : "Light mode";
    btn && btn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved === "dark" ? "dark" : "light");
    var btn = $("#themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- build history (auto, last 10) ---------- */
  var HIST_KEY = "bcp.build-history";
  function readHist() {
    try {
      var raw = localStorage.getItem(HIST_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function histName(code) {
    var p = code.split(",");
    var cpu = null, gpu = null;
    (BCP.cpus.items || []).forEach(function (c) { if (c.id === p[0]) cpu = c.name; });
    (BCP.gpus.items || []).forEach(function (g) { if (g.id === p[1]) gpu = g.name; });
    var res = { p1080: "1080p", p1440: "1440p", p2160: "4K" }[p[8]] || "";
    return (cpu || "?") + " + " + (gpu || "?") + (res ? " · " + res : "");
  }
  function recordHist() {
    if (!BCP.currentBuildCode) return;
    var code = BCP.currentBuildCode();
    var list = readHist();
    if (list.length && list[0].code === code) return;
    list = list.filter(function (e) { return e.code !== code; });
    list.unshift({ code: code, ts: Date.now() });
    if (list.length > 10) list.length = 10;
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch (e) {}
    renderHist();
  }
  function renderHist() {
    var box = document.querySelector("#buildHistory");
    if (!box) return;
    var list = readHist();
    box.innerHTML = "";
    if (!list.length) return;
    var title = document.createElement("h3");
    title.className = "sb-cloud-title";
    title.textContent = "Recent builds";
    box.appendChild(title);
    list.forEach(function (e) {
      var row = document.createElement("div");
      row.className = "saved-row";
      row.innerHTML = '<span class="saved-name"></span>' +
        '<span class="saved-actions"><button type="button" class="gen-load saved-load">Load</button></span>';
      row.querySelector(".saved-name").textContent = histName(e.code);
      row.querySelector(".saved-load").addEventListener("click", function () {
        if (BCP.applyBuildCode && BCP.applyBuildCode(e.code)) renderHist();
      });
      box.appendChild(row);
    });
  }
  var histTimer = null;
  function armHist() {
    // Any calculator interaction may change the build; record after a beat.
    ["change", "click"].forEach(function (evt) {
      document.getElementById("viewCalc").addEventListener(evt, function () {
        clearTimeout(histTimer);
        histTimer = setTimeout(recordHist, 1200);
      });
    });
    recordHist();
  }

  /* ---------- saved builds ---------- */
  function readBuilds() {
    try {
      var raw = localStorage.getItem(BUILDS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function writeBuilds(list) {
    try { localStorage.setItem(BUILDS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function renderBuilds() {
    var box = $("#savedBuilds");
    if (!box) return;
    var list = readBuilds();
    box.innerHTML = "";
    if (!list.length) {
      box.innerHTML = '<p class="muted cmp-note">No saved builds yet. Saved builds live only in this browser.</p>';
      return;
    }
    list.forEach(function (b, i) {
      var row = document.createElement("div");
      row.className = "saved-row";
      row.innerHTML = '<span class="saved-name"></span>' +
        '<span class="saved-actions"><button type="button" class="gen-load saved-load">Load</button>' +
        '<button type="button" class="gen-load saved-del">Delete</button></span>';
      row.querySelector(".saved-name").textContent = b.name;
      row.querySelector(".saved-load").addEventListener("click", function () {
        if (BCP.applyBuildCode && BCP.applyBuildCode(b.code)) {
          try { history.replaceState(null, "", "#b=" + b.code); } catch (e) {}
          document.querySelector('.tab-btn[data-view="calc"]').click();
        }
      });
      row.querySelector(".saved-del").addEventListener("click", function () {
        var l = readBuilds();
        l.splice(i, 1);
        writeBuilds(l);
        renderBuilds();
      });
      box.appendChild(row);
    });
  }

  function saveCurrent() {
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    var code = BCP.currentBuildCode ? BCP.currentBuildCode() : null;
    if (!code) return;
    var name = sel.cpu.name + " + " + sel.gpu.name + " - " +
      new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    var list = readBuilds();
    list.unshift({ name: name, code: code, ts: Date.now() });
    if (list.length > 20) list = list.slice(0, 20);
    writeBuilds(list);
    renderBuilds();
    var btn = $("#saveBuildBtn");
    if (btn) {
      var old = btn.textContent;
      btn.textContent = "Saved!";
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
  }

  function init() {
    initTheme();
    var saveBtn = $("#saveBuildBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveCurrent);
    renderBuilds();
    if (document.getElementById("viewCalc")) armHist();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
