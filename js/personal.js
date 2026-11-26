/* ============================================================
 * PERSONAL — light/dark theme toggle (persisted), saved builds
 * with favorites/tags/notes, recent-builds history, draft
 * auto-save & recovery, and the build checklist. Everything
 * stays on the device (localStorage only).
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var $ = function (sel) { return document.querySelector(sel); };
  var THEME_KEY = "bcp-theme";
  var BUILDS_KEY = "bcp-saved-builds";
  var DRAFT_KEY = "bcp.draft";

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
  function bnBadge(code) {
    try {
      var p = code.split(",");
      var cb = BCP.benchmarks.cpu[p[0]], gs = BCP.benchmarks.gpu[p[1]];
      if (!cb || !gs || !BCP.engine) return null;
      var cpuHw = null;
      (BCP.cpus.items || []).forEach(function (c) { if (c.id === p[0]) cpuHw = c; });
      var bn = BCP.engine.bottleneck(cb, gs, p[8], p[9], cpuHw);
      var span = document.createElement("span");
      span.className = "hist-badge" + (bn.limiter === "cpu" && bn.pct >= 25 ? " hist-badge-warn" : "");
      span.textContent = bn.pct + "% " + (bn.limiter === "cpu" ? "CPU" : "GPU");
      span.title = "Estimated bottleneck for this build at its saved resolution and workload";
      return span;
    } catch (e) { return null; }
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
      var badge = bnBadge(e.code);
      if (badge) row.querySelector(".saved-name").appendChild(badge);
      row.querySelector(".saved-load").addEventListener("click", function () {
        if (BCP.applyBuildCode && BCP.applyBuildCode(e.code)) renderHist();
      });
      box.appendChild(row);
    });
  }

  /* ---------- draft auto-save & recovery ---------- */
  var dismissedDraft = null;
  function saveDraft() {
    if (!BCP.currentBuildCode) return;
    var code = BCP.currentBuildCode();
    // Do not clobber an un-recovered draft: once a draft is waiting to be
    // restored or dismissed, keep it until the user decides.
    var existing = readDraft();
    if (existing && existing.code !== code && existing.code !== dismissedDraft) {
      renderDraft();
      return;
    }
    var entry = { code: code, ts: Date.now() };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(entry)); } catch (e) {}
    renderDraft();
  }
  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      var d = raw ? JSON.parse(raw) : null;
      return d && d.code ? d : null;
    } catch (e) { return null; }
  }
  function renderDraft() {
    var box = $("#draftRestore");
    if (!box) return;
    box.innerHTML = "";
    var d = readDraft();
    if (!d || !BCP.currentBuildCode) return;
    if (d.code === BCP.currentBuildCode()) return;
    if (d.code === dismissedDraft) return;
    var bar = document.createElement("div");
    bar.className = "draft-banner";
    var when = new Date(d.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    var label = document.createElement("span");
    label.textContent = "Draft from " + when + ": " + histName(d.code);
    var actions = document.createElement("span");
    actions.className = "draft-actions";
    var restore = document.createElement("button");
    restore.type = "button";
    restore.className = "gen-btn";
    restore.textContent = "Restore draft";
    restore.addEventListener("click", function () {
      if (BCP.applyBuildCode && BCP.applyBuildCode(d.code)) {
        dismissedDraft = null;
        renderDraft();
        document.querySelector('.tab-btn[data-view="calc"]') &&
          document.querySelector('.tab-btn[data-view="calc"]').click();
      }
    });
    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "gen-load";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", function () {
      dismissedDraft = d.code;
      renderDraft();
    });
    actions.appendChild(restore);
    actions.appendChild(dismiss);
    bar.appendChild(label);
    bar.appendChild(actions);
    box.appendChild(bar);
  }

  /* ---------- saved builds: favorites, tags, notes ---------- */
  var tagFilter = null;
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
  function normTags(b) {
    if (!Array.isArray(b.tags)) b.tags = [];
    return b.tags;
  }
  function allTags(list) {
    var seen = {}, out = [];
    list.forEach(function (b) {
      normTags(b).forEach(function (t) {
        var k = t.toLowerCase();
        if (!seen[k]) { seen[k] = true; out.push(t); }
      });
    });
    return out;
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

    // Tag filter chips (only when any tags exist).
    var tags = allTags(list);
    if (tags.length) {
      var filter = document.createElement("div");
      filter.className = "saved-filter";
      var fl = document.createElement("span");
      fl.className = "muted";
      fl.style.fontSize = "0.78rem";
      fl.textContent = "Filter by tag:";
      filter.appendChild(fl);
      tags.forEach(function (t) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cmp-chip" + (tagFilter === t.toLowerCase() ? " active" : "");
        chip.textContent = t;
        chip.addEventListener("click", function () {
          tagFilter = (tagFilter === t.toLowerCase()) ? null : t.toLowerCase();
          renderBuilds();
        });
        filter.appendChild(chip);
      });
      if (tagFilter) {
        var clear = document.createElement("button");
        clear.type = "button";
        clear.className = "cmp-chip";
        clear.textContent = "Clear";
        clear.addEventListener("click", function () { tagFilter = null; renderBuilds(); });
        filter.appendChild(clear);
      }
      box.appendChild(filter);
    }

    // Favorites first, then newest.
    var shown = list.slice().sort(function (a, b) {
      if (!!b.fav !== !!a.fav) return b.fav ? 1 : -1;
      return (b.ts || 0) - (a.ts || 0);
    });
    shown.forEach(function (b) {
      if (tagFilter && normTags(b).map(function (t) { return t.toLowerCase(); }).indexOf(tagFilter) === -1) return;
      var wrap = document.createElement("div");

      var row = document.createElement("div");
      row.className = "saved-row";

      var fav = document.createElement("button");
      fav.type = "button";
      fav.className = "saved-fav" + (b.fav ? " fav-on" : "");
      fav.textContent = b.fav ? "★" : "☆";
      fav.title = b.fav ? "Unfavorite" : "Favorite";
      fav.setAttribute("aria-pressed", b.fav ? "true" : "false");
      fav.addEventListener("click", function () {
        var l = readBuilds();
        var target = l.find(function (x) { return x.code === b.code && x.ts === b.ts; });
        if (target) { target.fav = !target.fav; writeBuilds(l); renderBuilds(); }
      });

      var main = document.createElement("span");
      main.className = "saved-main";
      var name = document.createElement("span");
      name.className = "saved-name";
      name.textContent = b.name;
      main.appendChild(name);
      if (b.note) {
        var note = document.createElement("span");
        note.className = "saved-note";
        note.textContent = b.note;
        main.appendChild(note);
      }
      if (normTags(b).length) {
        var tagBox = document.createElement("span");
        tagBox.className = "saved-tags";
        b.tags.forEach(function (t) {
          var chip = document.createElement("span");
          chip.className = "saved-tag";
          chip.textContent = t;
          tagBox.appendChild(chip);
        });
        main.appendChild(tagBox);
      }

      var actions = document.createElement("span");
      actions.className = "saved-actions";
      var load = document.createElement("button");
      load.type = "button";
      load.className = "gen-load saved-load";
      load.textContent = "Load";
      load.addEventListener("click", function () {
        if (BCP.applyBuildCode && BCP.applyBuildCode(b.code)) {
          try { history.replaceState(null, "", "#b=" + b.code); } catch (e) {}
          document.querySelector('.tab-btn[data-view="calc"]').click();
        }
      });
      var noteBtn = document.createElement("button");
      noteBtn.type = "button";
      noteBtn.className = "gen-load";
      noteBtn.textContent = "Note";
      var tagBtn = document.createElement("button");
      tagBtn.type = "button";
      tagBtn.className = "gen-load";
      tagBtn.textContent = "Tags";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "gen-load saved-del";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        var l = readBuilds().filter(function (x) { return !(x.code === b.code && x.ts === b.ts); });
        writeBuilds(l);
        renderBuilds();
      });
      actions.appendChild(load);
      actions.appendChild(noteBtn);
      actions.appendChild(tagBtn);
      actions.appendChild(del);

      row.appendChild(fav);
      row.appendChild(main);
      row.appendChild(actions);
      wrap.appendChild(row);

      // Inline editors (note / tags), one open at a time per build.
      var editor = null;
      function closeEditor() {
        if (editor) { editor.remove(); editor = null; }
      }
      function openEditor(kind) {
        if (editor && editor.dataset.kind === kind) { closeEditor(); return; }
        closeEditor();
        var ed = document.createElement("div");
        ed.className = "saved-editor";
        ed.dataset.kind = kind;
        var field;
        if (kind === "note") {
          field = document.createElement("textarea");
          field.rows = 2;
          field.maxLength = 300;
          field.placeholder = "Note for this build (kept only in this browser)";
          field.value = b.note || "";
        } else {
          field = document.createElement("input");
          field.type = "text";
          field.maxLength = 120;
          field.placeholder = "Tags, comma separated (e.g. gaming, 1440p, upgrade)";
          field.value = normTags(b).join(", ");
        }
        var save = document.createElement("button");
        save.type = "button";
        save.className = "gen-btn";
        save.textContent = "Save";
        save.addEventListener("click", function () {
          var l = readBuilds();
          var target = l.find(function (x) { return x.code === b.code && x.ts === b.ts; });
          if (!target) return;
          if (kind === "note") {
            target.note = field.value.trim();
          } else {
            target.tags = field.value.split(",").map(function (s) { return s.trim(); })
              .filter(function (s, i, arr) { return s && arr.indexOf(s) === i; }).slice(0, 8);
          }
          writeBuilds(l);
          renderBuilds();
        });
        ed.appendChild(field);
        ed.appendChild(save);
        wrap.appendChild(ed);
        editor = ed;
        field.focus();
      }
      noteBtn.addEventListener("click", function () { openEditor("note"); });
      tagBtn.addEventListener("click", function () { openEditor("tags"); });

      box.appendChild(wrap);
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
    list.unshift({ name: name, code: code, ts: Date.now(), fav: false, tags: [], note: "" });
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

  /* ---------- build checklist (completeness & error summary) ---------- */
  var CHECK_SLOTS = [
    ["cpu", "CPU"], ["gpu", "Graphics card"], ["mobo", "Motherboard"],
    ["ram", "Memory"], ["psu", "Power supply"], ["cooler", "CPU cooler"],
    ["storage", "Storage"]
  ];
  var fillNote = null; // {code, text} shown until the selection changes again
  function renderChecklist() {
    var list = $("#checkList");
    var summary = $("#checkSummary");
    if (!list || !BCP.getSelection) return;
    var sel = BCP.getSelection();
    var missing = [];
    list.innerHTML = "";
    CHECK_SLOTS.forEach(function (pair) {
      var li = document.createElement("li");
      var ok = !!sel[pair[0]];
      li.className = ok ? "check-ok" : "check-miss";
      li.textContent = (ok ? "✓ " : "✗ ") + pair[1] +
        (ok && sel[pair[0]].name ? ": " + sel[pair[0]].name : ok ? ": selected" : " - not selected");
      if (!ok) missing.push(pair[1].toLowerCase());
      list.appendChild(li);
    });
    var panel = list.parentNode;
    var oldBtn = panel.querySelector("#completeBuildBtn");
    if (oldBtn) oldBtn.remove();
    var oldNote = panel.querySelector("#fillNote");
    if (oldNote) oldNote.remove();
    if (summary) {
      summary.textContent = missing.length
        ? "Build incomplete - missing: " + missing.join(", ") + ". You can still save or share it; the analysis only uses the parts you picked."
        : "Build complete. Every core slot has a part selected.";
    }
    if (missing.length && BCP.completeBuild) {
      var btn = document.createElement("button");
      btn.id = "completeBuildBtn";
      btn.type = "button";
      btn.className = "gen-btn check-complete-btn";
      btn.textContent = "Complete my build";
      btn.title = "Fill the empty slots with the cheapest compatible parts";
      btn.addEventListener("click", function () {
        var filled = BCP.completeBuild();
        if (filled && filled.length && BCP.currentBuildCode) {
          fillNote = {
            code: BCP.currentBuildCode(),
            text: "Filled in: " + filled.join("; ") +
              ". These are the cheapest compatible picks - review the advice panel before buying."
          };
        }
        renderChecklist();
      });
      panel.appendChild(btn);
    }
    if (fillNote && BCP.currentBuildCode && fillNote.code === BCP.currentBuildCode()) {
      var p = document.createElement("p");
      p.className = "muted cmp-note";
      p.id = "fillNote";
      p.textContent = fillNote.text;
      panel.appendChild(p);
    }
  }

  /* ---------- build health score ---------- */
  function renderHealth() {
    var scoreEl = $("#healthScore"), list = $("#healthList"), tips = $("#healthTips");
    if (!list || !BCP.engine || !BCP.engine.buildHealth || !BCP.getSelection) return;
    var h = BCP.engine.buildHealth(BCP.getSelection());
    if (!h) { if (scoreEl) scoreEl.textContent = "–"; list.innerHTML = ""; if (tips) tips.textContent = ""; return; }
    if (scoreEl) scoreEl.textContent = h.score;
    list.innerHTML = "";
    h.rows.forEach(function (r) {
      var li = document.createElement("li");
      var ratio = r.pts / r.max;
      li.className = ratio >= 0.8 ? "check-ok" : ratio >= 0.5 ? "check-mid" : "check-miss";
      li.textContent = (ratio >= 0.8 ? "✓ " : ratio >= 0.5 ? "• " : "✗ ") +
        r.label + " - " + r.note + " (" + r.pts + "/" + r.max + ")";
      list.appendChild(li);
    });
    if (tips) {
      tips.textContent = h.tips.length
        ? "Biggest gains first: " + h.tips.map(function (t, i) { return (i + 1) + ") " + t; }).join("  ")
        : "No weak spots in the core categories.";
    }
  }

  /* ---------- interaction wiring ---------- */
  var debounceTimer = null;
  function afterCalcInteraction() {
    recordHist();
    saveDraft();
    renderChecklist();
    renderHealth();
  }
  function armCalc() {
    ["change", "click"].forEach(function (evt) {
      document.getElementById("viewCalc").addEventListener(evt, function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(afterCalcInteraction, 1200);
      });
    });
    afterCalcInteraction();
  }

  /* ---------- my data: export & clear (everything is local) ---------- */
  function collectLocalData() {
    var data = { app: "Bottleneck Calculator Pro", exportedAt: new Date().toISOString(),
      note: "Everything Bottleneck Calculator Pro stores about you lives in this browser. This file is the complete copy.", stores: {} };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("bcp") === 0) {
        try { data.stores[k] = JSON.parse(localStorage.getItem(k)); }
        catch (e) { data.stores[k] = localStorage.getItem(k); }
      }
    }
    return data;
  }
  function exportLocalData() {
    var blob = new Blob([JSON.stringify(collectLocalData(), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bcp-my-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function clearLocalData() {
    if (!window.confirm("Delete everything Bottleneck Calculator Pro stores in this browser? Saved builds, tags, notes, history, drafts and preferences will be removed. This cannot be undone.")) return;
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("bcp") === 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
    location.reload();
  }

  function init() {
    initTheme();
    var saveBtn = $("#saveBuildBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveCurrent);
    var expBtn = $("#dataExportBtn");
    if (expBtn) expBtn.addEventListener("click", exportLocalData);
    var clrBtn = $("#dataClearBtn");
    if (clrBtn) clrBtn.addEventListener("click", clearLocalData);
    renderBuilds();
    if (document.getElementById("viewCalc")) {
      armCalc();
      // If the page opened on a shared link, do not nag about the older draft.
      if (location.hash.indexOf("#b=") === 0) {
        var d = readDraft();
        if (d) dismissedDraft = d.code;
      }
      renderDraft();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
