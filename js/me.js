/* ============================================================
 * ME HUB - personal dashboard, recently viewed parts, favorite parts,
 * activity history, build import/duplicate, and a guided build wizard.
 * Local to this browser (localStorage). No account needed.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var KINDS = [["cpu", "Processor", function () { return BCP.cpus.items; }], ["gpu", "Graphics card", function () { return BCP.gpus.items; }], ["mobo", "Motherboard", function () { return BCP.motherboards.items; }], ["ram", "Memory", function () { return BCP.memoryKits.items; }], ["psu", "Power supply", function () { return BCP.psus.items; }], ["cooler", "Cooler", function () { return BCP.coolers.items; }], ["ssd", "Storage", function () { return BCP.storage.items; }], ["case", "Case", function () { return BCP.cases.items; }]];
  function nameOf(kind, id) { var k = KINDS.filter(function (x) { return x[0] === kind; })[0]; var it = k && k[2]().filter(function (i) { return i.id === id; })[0]; return it ? it.name : null; }
  function table(P, head, rows) { var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h); rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w); }
  function btn(txt, fn, cls) { var b = el("button", cls || "hb-btn", txt); b.type = "button"; b.addEventListener("click", fn); return b; }
  function builds() { try { var l = JSON.parse(localStorage.getItem("bcp-saved-builds") || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function setBuilds(l) { try { localStorage.setItem("bcp-saved-builds", JSON.stringify(l.slice(0, 20))); } catch (e) {} }

  /* ---- tracking: activity + recently viewed parts ---- */
  function act(msg) { var l = ui.get("me.act", []); l.unshift({ t: new Date().toISOString(), m: msg }); ui.set("me.act", l.slice(0, 40)); }
  function trackParts() {
    var ids = { cpu: "cpuSelect", gpu: "gpuSelect" }, seen = ui.get("me.recent", []);
    document.addEventListener("change", function (e) {
      var s = e.target; if (!s || s.tagName !== "SELECT" || !s.value) return;
      var kind = null; if (s.id === "cpuSelect") kind = "cpu"; else if (s.id === "gpuSelect") kind = "gpu"; else { var m = (s.id || "").match(/^(mobo|ram|psu|cooler|storage|case)/i); if (m) kind = m[1].toLowerCase() === "storage" ? "ssd" : m[1].toLowerCase(); }
      if (!kind) return; var nm = nameOf(kind, s.value); if (!nm) return;
      var l = ui.get("me.recent", []).filter(function (x) { return !(x.k === kind && x.id === s.value); }); l.unshift({ k: kind, id: s.value, t: Date.now() }); ui.set("me.recent", l.slice(0, 15)); act("Picked " + nm);
    });
    document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".tab-btn"); if (b) act("Opened the " + (b.textContent || "").trim().replace(/\s*\(\d+\)$/, "") + " tab"); var sv = e.target.closest && e.target.closest("#saveBuildBtn"); if (sv) act("Saved a build"); });
  }

  function dash(box) {
    var sel = BCP.getSelection(), P = ui.panel("Your overview", "everything stored on this device"); box.appendChild(P);
    var bl = builds(), bn = eng.bottleneck(BCP.benchmarks.cpu[sel.cpu.id], BCP.benchmarks.gpu[sel.gpu.id], sel.res, sel.workload, sel.cpu), wl = ui.get("al.watch", null), favs = ui.get("me.favs", []);
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Current build", sel.cpu.name.replace(/^(AMD|Intel) /, "") + " + " + sel.gpu.name.replace(/^(GeForce|NVIDIA|AMD|Radeon|Intel) /, ""))); st.appendChild(ui.stat("Bottleneck", bn.pct + "% " + bn.limiter)); st.appendChild(ui.stat("Saved builds", String(bl.length))); st.appendChild(ui.stat("Favorite parts", String(favs.length))); st.appendChild(ui.stat("Last backup", (ui.get("data.lastBackup", null) || "never").slice(0, 10))); P.appendChild(st);
    var fb = bl.filter(function (b) { return b.fav; });
    P.appendChild(el("h3", "an-sub", "Favorite builds")); if (!fb.length) P.appendChild(ui.note("No favorite builds. Star a saved build on the Calculator tab.")); else fb.slice(0, 5).forEach(function (b) { var r = el("div", "dh-row"); r.appendChild(el("span", null, b.name)); r.appendChild(btn("Open", function () { if (BCP.applyBuildCode(b.code)) document.querySelector('.tab-btn[data-view="calc"]').click(); })); P.appendChild(r); });
    var R = ui.panel("Recently viewed parts", "the last parts you picked"); box.appendChild(R);
    var rec = ui.get("me.recent", []); if (!rec.length) R.appendChild(ui.note("Pick parts in the Calculator and they appear here.")); else table(R, ["Part", "Type", "When", ""].slice(0, 3), rec.slice(0, 10).map(function (x) { return [nameOf(x.k, x.id) || x.id, x.k, new Date(x.t).toISOString().slice(0, 16).replace("T", " ")]; }));
    var A = ui.panel("Activity history", "your last actions in this browser"); box.appendChild(A);
    var al = ui.get("me.act", []); if (!al.length) A.appendChild(ui.note("Nothing recorded yet.")); else { var ul = el("ul", "hb-list"); al.slice(0, 15).forEach(function (a) { ul.appendChild(el("li", null, a.t.slice(5, 16).replace("T", " ") + "  " + a.m)); }); A.appendChild(ul); A.appendChild(btn("Clear activity history", function () { ui.set("me.act", []); ui.set("me.recent", []); box.innerHTML = ""; dash(box); }, "hb-btn ghost")); }
    A.appendChild(ui.note("Stored only on this device. Nothing is sent anywhere."));
  }

  function favs(box) {
    var P = ui.panel("Favorite parts", "star the parts you want to keep an eye on"); box.appendChild(P);
    var f = ui.get("me.favs", []), kind = ui.get("me.fk", "gpu");
    var row = el("div", "hb-form"); P.appendChild(row);
    row.appendChild(ui.field("Type", ui.select(KINDS.map(function (k) { return [k[0], k[1]]; }), kind, function (v) { ui.set("me.fk", v); box.innerHTML = ""; favs(box); })));
    var items = KINDS.filter(function (k) { return k[0] === kind; })[0][2](), pick = ui.select(items.map(function (i) { return [i.id, i.name]; }), items[0].id, function () {}); row.appendChild(ui.field("Part", pick));
    P.appendChild(btn("Add to favorites", function () { if (!f.some(function (x) { return x.k === kind && x.id === pick.value; })) { f.unshift({ k: kind, id: pick.value }); ui.set("me.favs", f.slice(0, 40)); act("Favorited " + nameOf(kind, pick.value)); } box.innerHTML = ""; favs(box); }));
    var L = ui.panel("Your favorites", f.length + " saved"); box.appendChild(L);
    if (!f.length) L.appendChild(ui.note("No favorites yet."));
    f.forEach(function (x, i) { var r = el("div", "dh-row"); var price = x.k === "cpu" ? BCP.prices.cpu[x.id] : x.k === "gpu" ? BCP.prices.gpu[x.id] : (KINDS.filter(function (k) { return k[0] === x.k; })[0][2]().filter(function (z) { return z.id === x.id; })[0] || {}).priceUSD; r.appendChild(el("span", null, (nameOf(x.k, x.id) || x.id) + (price ? " - " + ui.usd(price) : ""))); r.appendChild(btn("Remove", function () { f.splice(i, 1); ui.set("me.favs", f); box.innerHTML = ""; favs(box); }, "hb-btn ghost")); L.appendChild(r); });
    L.appendChild(ui.note("Prices are curated figures. For market floor prices and alerts, use the Alerts tab watchlist."));
  }

  function mybuilds(box) {
    var P = ui.panel("Import a build", "paste a share link or code"); box.appendChild(P);
    var i = el("input"); i.type = "text"; i.placeholder = "https://bcalc.mooo.com/#b=... or the code"; i.className = "sm-q"; var out = el("p", "muted");
    P.appendChild(ui.field("Share link or code", i));
    P.appendChild(btn("Import into Calculator", function () {
      var v = i.value.trim(), m = v.match(/#b=([^&\s]+)/); if (m) v = decodeURIComponent(m[1]); var p = v.split(",");
      if (p.length !== 10) { out.textContent = "That is not a build code. A code has 10 comma-separated parts."; return; }
      var bad = []; [["cpu", p[0]], ["gpu", p[1]]].forEach(function (x) { if (!nameOf(x[0], x[1])) bad.push(x[0] + " '" + x[1].slice(0, 30) + "'"); });
      if (bad.length) { out.textContent = "Unknown part(s): " + bad.join(", ") + ". The link may come from a newer or older catalog."; return; }
      if (BCP.applyBuildCode(v)) { act("Imported a build"); out.textContent = "Imported. Opening the Calculator."; document.querySelector('.tab-btn[data-view="calc"]').click(); } else out.textContent = "Could not apply that code.";
    })); P.appendChild(out);
    var D = ui.panel("Duplicate a saved build", "make a copy to tweak"); box.appendChild(D);
    var bl = builds(); if (!bl.length) D.appendChild(ui.note("No saved builds yet. Use Save this build on the Calculator tab."));
    bl.forEach(function (b) { var r = el("div", "dh-row"); r.appendChild(el("span", null, b.name)); r.appendChild(btn("Duplicate", function () { var l = builds(); l.unshift({ name: b.name + " (copy)", code: b.code, ts: Date.now(), fav: false, tags: (b.tags || []).slice(), note: b.note || "" }); setBuilds(l); act("Duplicated " + b.name); box.innerHTML = ""; mybuilds(box); })); r.appendChild(btn("Open", function () { if (BCP.applyBuildCode(b.code)) document.querySelector('.tab-btn[data-view="calc"]').click(); }, "hb-btn ghost")); D.appendChild(r); });
    D.appendChild(ui.note("The copy appears in the Calculator tab's saved builds list. The list keeps the 20 newest builds."));
    var C = ui.panel("Build completion", "how complete the current build is"); box.appendChild(C);
    var sel = BCP.getSelection(), parts = [["CPU", sel.cpu], ["GPU", sel.gpu], ["Motherboard", sel.mobo], ["Memory", sel.ram], ["Storage", sel.storage], ["PSU", sel.psu], ["Cooler", sel.cooler], ["Case", sel.case_]], have = parts.filter(function (p) { return p[1]; }).length, pct = Math.round(have / parts.length * 100);
    var bar = el("div", "an-bar"); bar.style.cssText = "height:10px;border-radius:6px;background:rgba(124,58,237,.15);overflow:hidden;margin:8px 0"; var fill = el("div"); fill.style.cssText = "height:100%;width:" + pct + "%;background:linear-gradient(90deg,#7c3aed,#d946ef)"; bar.appendChild(fill); C.appendChild(bar);
    C.appendChild(el("p", null, have + " of " + parts.length + " parts chosen (" + pct + "%)." + (have < parts.length ? " Missing: " + parts.filter(function (p) { return !p[1]; }).map(function (p) { return p[0]; }).join(", ") + "." : " Every slot is filled.")));
  }

  function wizard(box) {
    var W = ui.get("me.wiz", { step: 0, use: "gaming", res: "p1440", budget: 1300 }), rer = function () { ui.set("me.wiz", W); box.innerHTML = ""; wizard(box); };
    var P = ui.panel("Build wizard", "step " + (W.step + 1) + " of 4"); box.appendChild(P);
    function chips(opts, val, f) { var r = el("div", "mk-chips"); opts.forEach(function (o) { var b = el("button", "mk-chip" + (o[0] === val ? " on active" : ""), o[1]); b.type = "button"; b.addEventListener("click", function () { f(o[0]); }); r.appendChild(b); }); P.appendChild(r); }
    var nav = function (back, next) { var r = el("div", "dh-row"); if (back) r.appendChild(btn("Back", function () { W.step--; rer(); }, "hb-btn ghost")); if (next) r.appendChild(btn(next, function () { W.step++; rer(); })); P.appendChild(r); };
    if (W.step === 0) { P.appendChild(el("h3", "an-sub", "What will you use it for?")); chips([["gaming", "Gaming"], ["streaming", "Gaming and streaming"], ["productivity", "Creating and working"]], W.use, function (v) { W.use = v; rer(); }); nav(false, "Next"); }
    else if (W.step === 1) { P.appendChild(el("h3", "an-sub", "Which screen resolution?")); chips([["p1080", "1080p"], ["p1440", "1440p"], ["p2160", "4K"]], W.res, function (v) { W.res = v; rer(); }); nav(true, "Next"); }
    else if (W.step === 2) { P.appendChild(el("h3", "an-sub", "Budget")); chips([[700, "$700"], [1000, "$1,000"], [1300, "$1,300"], [1800, "$1,800"], [2500, "$2,500"], [4000, "$4,000"]], W.budget, function (v) { W.budget = +v; rer(); }); nav(true, "See my builds"); }
    else {
      var l = eng.generateBuilds(W.budget, W.use, W.res, 3); P.appendChild(el("h3", "an-sub", RES[W.res] + " " + W.use + " under " + ui.usd(W.budget)));
      if (!l.length) P.appendChild(ui.note("No catalog build fits. Go back and raise the budget."));
      l.forEach(function (b, k) { var d = el("div", "adv-block"); d.appendChild(el("h3", null, "Option " + (k + 1) + ": " + b.cpu.name + " + " + b.gpu.name + " - " + ui.usd(b.total))); d.appendChild(el("p", "muted", [b.mobo.name, b.ram.name, b.storage.name, b.psu.name, b.cooler.name].join(", ") + ". Bottleneck " + b.pct + "% " + b.limiter + ".")); var cur = BCP.getSelection(); d.appendChild(btn("Load in Calculator", function () { var code = [b.cpu.id, b.gpu.id, b.mobo.id, b.ram.id, b.psu.id, b.cooler.id, cur.case_ ? cur.case_.id : "", b.storage.id, W.res, W.use].join(","); if (BCP.applyBuildCode(code)) { act("Built from the wizard"); document.querySelector('.tab-btn[data-view="calc"]').click(); } }, "hb-btn ghost")); P.appendChild(d); });
      P.appendChild(ui.note("Same engine and curated prices as the Calculator. For more control use the Builds tab.")); nav(true, null); P.appendChild(btn("Start over", function () { W.step = 0; rer(); }, "hb-btn ghost"));
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    trackParts();
    BCP.addHub({ key: "me", label: "My space", before: "dash", title: "Your space.", intro: "Your overview, recently viewed and favorite parts, activity, build import and duplication, and a guided wizard. All stored on this device.",
      subs: [{ id: "dash", label: "Overview", render: dash }, { id: "favs", label: "Favorite parts", render: favs }, { id: "builds", label: "Import and copy", render: mybuilds }, { id: "wiz", label: "Build wizard", render: wizard }] });
  });
})();
