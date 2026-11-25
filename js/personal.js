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
    applyTheme(saved === "light" ? "light" : "dark");
    var btn = $("#themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
