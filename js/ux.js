/* ============================================================
 * UX LAYER - tooltips, contextual help + glossary, keyboard shortcuts,
 * accessibility roles, confirmation dialogs, live build chip and dashboard
 * customization. Pure client-side, no data changes.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, el = ui.el;
  function $(s) { return document.querySelector(s); }
  function $$(s) { return [].slice.call(document.querySelectorAll(s)); }

  /* ---- Tooltips: any [data-tip] element ---- */
  var TIPS = { calc: "Pick parts and see the bottleneck", compare: "Compare parts side by side", upgrade: "Check an upgrade before buying", power: "Wattage, PSU and thermals", games: "Games, software and FPS estimates", monitors: "Monitor matching and refresh rates", market: "Weekly retail prices", dash: "Charts for your build", community: "Shared builds", budget: "Budget, upgrade cost", lab: "Simulators and estimators", search: "Find any part", reports: "Reports, QR and images", alerts: "Notifications and price watch", advisor: "Upgrade and cooling advice", charts: "FPS charts and dashboards", smart: "Ask in plain words, rate, troubleshoot" };
  var tipEl = el("div", "ux-tip"); tipEl.setAttribute("role", "tooltip"); tipEl.hidden = true; document.body.appendChild(tipEl);
  function showTip(t) { var r = t.getBoundingClientRect(); tipEl.textContent = t.getAttribute("data-tip"); tipEl.hidden = false; tipEl.style.left = Math.min(window.innerWidth - tipEl.offsetWidth - 8, r.right + 8) + "px"; tipEl.style.top = Math.max(8, r.top + r.height / 2 - tipEl.offsetHeight / 2) + "px"; }
  document.addEventListener("mouseover", function (e) { var t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); else tipEl.hidden = true; });
  document.addEventListener("focusin", function (e) { var t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("focusout", function () { tipEl.hidden = true; });
  function decorate() {
    $$(".tab-btn").forEach(function (b) { var k = b.getAttribute("data-view"); if (TIPS[k] && !b.hasAttribute("data-tip")) b.setAttribute("data-tip", TIPS[k]); b.setAttribute("aria-label", b.textContent.trim() + (TIPS[k] ? ": " + TIPS[k] : "")); });
    var nav = $(".tab-nav"); if (nav) nav.setAttribute("aria-label", "Main sections");
    $$(".view").forEach(function (v) { v.setAttribute("role", "region"); });
    var gs = $("#globalSearch"); if (gs) gs.setAttribute("aria-label", "Search or command");
    $$("select, input").forEach(function (i) { if (!i.getAttribute("aria-label") && !i.id && i.closest("label")) i.setAttribute("aria-label", i.closest("label").textContent.trim().slice(0, 60)); });
  }
  decorate(); setInterval(decorate, 3000);

  /* ---- Contextual help + glossary ---- */
  var HELP = { viewCalc: "Pick a CPU, GPU and the other parts. The bottleneck percentage is how much of the faster part is wasted waiting on the slower one. Change resolution and workload to see it move.", viewCompare: "Choose a category, then at least two parts. Value rankings show performance per dollar.", viewUpgrade: "Pick your current parts and a target part. The tab estimates the gain and flags compatibility issues.", viewPower: "Estimated draw, PSU load and temperatures from TDP figures.", viewGames: "Per-game FPS estimates for the Calculator build.", viewMarket: "Weekly floor prices from a free open dataset. Not live offers.", viewDash: "Charts for the current build. Use Customize to hide or reorder panels." };
  var GLOSS = [["Bottleneck", "One part limiting another. A 20% GPU-side bottleneck means the CPU could do 20% more but waits on the GPU."], ["TDP", "Thermal design power in watts. A guide to heat and draw, not a precise power figure."], ["XMP / EXPO", "Memory profiles that run RAM at its rated speed. Enable in the BIOS."], ["Dual channel", "Two matched RAM sticks, giving about double the memory bandwidth of one."], ["1% low", "The frame rate of the slowest 1% of frames. Lower than average FPS and a better guide to smoothness."], ["VRAM", "Memory on the graphics card. Too little makes textures stutter."], ["DLSS / FSR / XeSS", "Upscalers that render at lower resolution and scale up, for more FPS."], ["Frame generation", "Inserts extra frames to raise displayed FPS. Adds some latency."], ["PSU headroom", "Spare wattage above the build's peak draw. 20 to 40% is comfortable."], ["Floor price", "The cheapest in-stock price in the weekly feed, not the typical price."]];
  var drawer = el("aside", "ux-help"); drawer.hidden = true; drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-label", "Help"); document.body.appendChild(drawer);
  function currentViewId() { var v = $$(".view:not(.hidden)")[0]; return v ? v.id : "viewCalc"; }
  function openHelp() {
    drawer.innerHTML = ""; var h = el("div", "ux-help-head"); h.appendChild(el("strong", null, "Help")); var x = el("button", "mk-chip", "Close"); x.type = "button"; x.addEventListener("click", closeHelp); h.appendChild(x); drawer.appendChild(h);
    var id = currentViewId(), hubText = id.indexOf("viewHub_") === 0 ? (TIPS[id.slice(8)] || "") + ". Use the pills at the top to switch sections. Results come from the same engine as the Calculator." : HELP[id];
    drawer.appendChild(el("h3", null, "This tab")); drawer.appendChild(el("p", null, hubText || "Use the sidebar to switch sections."));
    drawer.appendChild(el("h3", null, "Shortcuts")); var ul = el("ul", "hb-list"); ["Ctrl+K: search and commands", "?: open or close this help", "Alt+1 to Alt+9: jump to a tab", "Up and Down in the sidebar: move between tabs", "Esc: close dialogs and help"].forEach(function (t) { ul.appendChild(el("li", null, t)); }); drawer.appendChild(ul);
    drawer.appendChild(el("h3", null, "Glossary")); GLOSS.forEach(function (g) { var d = el("p"); d.appendChild(el("strong", null, g[0] + ": ")); d.appendChild(document.createTextNode(g[1])); drawer.appendChild(d); });
    drawer.appendChild(ui.note("Everything is an estimate from curated data. Check the Data sources tab for dates and confidence."));
    drawer.hidden = false; x.focus();
  }
  function closeHelp() { drawer.hidden = true; }
  var foot = $(".sidebar-foot"), hb = el("button", "theme-toggle ux-help-btn", "Help and shortcuts (?)"); hb.type = "button"; hb.addEventListener("click", function () { drawer.hidden ? openHelp() : closeHelp(); }); if (foot) foot.insertBefore(hb, foot.firstChild);

  /* ---- Keyboard ---- */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase(), typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
    if (e.key === "Escape") { closeHelp(); closeConfirm(false); return; }
    if (e.key === "?" && !typing) { e.preventDefault(); drawer.hidden ? openHelp() : closeHelp(); return; }
    if (e.altKey && /^[1-9]$/.test(e.key)) { var b = $$(".tab-btn")[+e.key - 1]; if (b) { e.preventDefault(); b.click(); b.focus(); } return; }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target.classList && e.target.classList.contains("tab-btn")) { var tabs = $$(".tab-btn"), i = tabs.indexOf(e.target), n = tabs[i + (e.key === "ArrowDown" ? 1 : -1)]; if (n) { e.preventDefault(); n.focus(); } }
  });

  /* ---- Confirmation dialogs for destructive buttons ---- */
  var modal = el("div", "ux-modal"); modal.hidden = true; modal.setAttribute("role", "alertdialog"); modal.setAttribute("aria-modal", "true"); document.body.appendChild(modal);
  var pending = null, bypass = false;
  function closeConfirm(ok) { if (modal.hidden) return; modal.hidden = true; var p = pending; pending = null; if (ok && p) { bypass = true; p.click(); bypass = false; } }
  function askConfirm(btn, label) {
    pending = btn; modal.innerHTML = ""; var box = el("div", "ux-modal-box"); box.appendChild(el("h3", null, "Are you sure?")); box.appendChild(el("p", null, "\"" + label + "\" cannot be undone from here."));
    var row = el("div", "hb-form"), no = el("button", "hb-btn ghost", "Cancel"), yes = el("button", "hb-btn", "Yes, continue"); no.type = yes.type = "button"; no.addEventListener("click", function () { closeConfirm(false); }); yes.addEventListener("click", function () { closeConfirm(true); }); row.appendChild(no); row.appendChild(yes); box.appendChild(row); modal.appendChild(box); modal.hidden = false; no.focus();
  }
  document.addEventListener("click", function (e) {
    if (bypass) return; var b = e.target.closest && e.target.closest("button"); if (!b || b.closest(".ux-modal")) return;
    var t = b.textContent.trim();
    if (/^(clear local data|clear all|delete|remove build|delete build|reset all|clear history)/i.test(t) || b.hasAttribute("data-confirm")) { e.preventDefault(); e.stopImmediatePropagation(); askConfirm(b, t); }
  }, true);

  /* ---- Live build chip (dynamic build preview) ---- */
  var chip = el("button", "ux-chip"); chip.type = "button"; chip.setAttribute("data-tip", "Your current Calculator build. Click to open it."); chip.addEventListener("click", function () { $('.tab-btn[data-view="calc"]').click(); });
  var sw = $(".search-wrap"); if (sw && sw.parentNode) sw.parentNode.insertBefore(chip, sw.nextSibling);
  function refreshChip() {
    try { var sel = BCP.getSelection(), eng = BCP.engine, bn = eng.bottleneck(BCP.benchmarks.cpu[sel.cpu.id], BCP.benchmarks.gpu[sel.gpu.id], sel.res, sel.workload, sel.cpu);
      var fp = BCP.games.items.reduce(function (s, g) { return s + eng.gameFps(g, BCP.benchmarks.cpu[sel.cpu.id].gaming, BCP.benchmarks.gpu[sel.gpu.id], sel.res, sel.workload, sel.gpu.vramGB); }, 0) / BCP.games.items.length;
      chip.innerHTML = ""; chip.appendChild(el("small", null, "Current build")); chip.appendChild(el("strong", null, sel.cpu.name.replace(/^(Ryzen|Core)\s/, "") + " + " + sel.gpu.name.replace(/^GeForce |^Radeon /, ""))); chip.appendChild(el("span", null, Math.round(fp) + " fps avg - " + bn.pct + "% " + bn.limiter)); } catch (e) {}
  }
  refreshChip(); setInterval(refreshChip, 1500);

  /* ---- Dashboard customization ---- */
  function customize() {
    var grid = $(".db-grid"); if (!grid || $("#dbCustom")) return;
    var panels = [].slice.call(grid.children).filter(function (c) { return c.querySelector("h2"); }), st = ui.get("db.cfg", { hidden: [], order: [] });
    var bar = el("section", "panel"); bar.id = "dbCustom"; var hd = el("h2", null, "Customize dashboard"); hd.appendChild(el("small", "h-sub", "show, hide and reorder panels")); bar.appendChild(hd);
    var list = el("div", "db-cust");
    function apply() { panels.forEach(function (p, i) { var name = p.querySelector("h2").firstChild.textContent.trim(); p.style.display = st.hidden.indexOf(name) >= 0 ? "none" : ""; var o = st.order.indexOf(name); p.style.order = o >= 0 ? o : 100 + i; }); }
    function draw() {
      list.innerHTML = "";
      var names = panels.map(function (p) { return p.querySelector("h2").firstChild.textContent.trim(); }).sort(function (a, b) { var ia = st.order.indexOf(a), ib = st.order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
      names.forEach(function (n, i) {
        var r = el("div", "db-cust-row"), c = el("input"); c.type = "checkbox"; c.checked = st.hidden.indexOf(n) < 0; c.setAttribute("aria-label", "Show " + n); c.addEventListener("change", function () { st.hidden = st.hidden.filter(function (x) { return x !== n; }); if (!c.checked) st.hidden.push(n); ui.set("db.cfg", st); apply(); });
        r.appendChild(c); r.appendChild(el("span", null, n));
        [["Up", -1], ["Down", 1]].forEach(function (m) { var b = el("button", "mk-chip", m[0]); b.type = "button"; b.addEventListener("click", function () { var o = names.slice(), j = i + m[1]; if (j < 0 || j >= o.length) return; var t = o[i]; o[i] = o[j]; o[j] = t; st.order = o; ui.set("db.cfg", st); apply(); draw(); }); r.appendChild(b); });
        list.appendChild(r);
      });
      var rs = el("button", "hb-btn ghost", "Reset layout"); rs.type = "button"; rs.addEventListener("click", function () { st = { hidden: [], order: [] }; ui.set("db.cfg", st); apply(); draw(); }); list.appendChild(rs);
    }
    bar.appendChild(list); grid.parentNode.insertBefore(bar, grid); draw(); apply();
  }
  customize();
})();
