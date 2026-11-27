/* ============================================================
 * SEARCH HUB - advanced hardware search, filters, sorting, compatibility
 * filter, similar/alternative parts, history; plus derived game requirement
 * tiers and a game checker. Requirement tiers are DERIVED from the FPS model
 * (not publisher specs) and labeled that way.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var CATS = [["cpus", "CPU"], ["gpus", "GPU"], ["motherboards", "Motherboard"], ["memoryKits", "Memory"], ["storage", "Storage"], ["psus", "PSU"], ["coolers", "Cooler"], ["cases", "Case"]];
  var S = { cat: "gpus", q: "", brand: "", maxP: "", minPerf: "", sort: "perf", page: 0, compat: false, hist: ui.get("search.hist", []), cmp: [], opt: {} };
  function brandOf(n) { var m = n.match(/^(AMD|Intel|NVIDIA|GeForce|Radeon|Ryzen|Core|Arc|Corsair|Noctua|Samsung|WD|Crucial|Kingston|G\.Skill|ASUS|MSI|Gigabyte|Seasonic|Thermalright|Deepcool|NZXT|Lian Li|Fractal)/i); return m ? ({ geforce: "NVIDIA", radeon: "AMD", ryzen: "AMD", core: "Intel", arc: "Intel" }[m[1].toLowerCase()] || m[1]) : "Generic"; }
  function norm(cat, x) {
    var o = { cat: cat, id: x.id, name: x.name, raw: x, brand: x.brand || brandOf(x.name), price: 0, perf: null, year: x.launchYear || 0, specs: [] };
    if (cat === "cpus") { o.price = BCP.prices.cpu[x.id] || 0; var b = BCP.benchmarks.cpu[x.id]; o.perf = b ? b.gaming : null; o.specs = [x.socket, x.cores + "C/" + x.threads + "T", x.boostGHz + " GHz", x.tdpW + "W"]; }
    else if (cat === "gpus") { o.price = BCP.prices.gpu[x.id] || 0; o.perf = BCP.benchmarks.gpu[x.id] || null; o.specs = [x.vramGB + " GB", x.tdpW + "W", x.arch]; }
    else { o.price = x.priceUSD || 0;
      if (cat === "motherboards") o.specs = [x.socket, x.chipset, x.formFactor, x.ramType];
      if (cat === "memoryKits") { o.perf = x.speedMTs / 100; o.specs = [x.type, x.speedMTs + " MT/s", x.capacityGB + " GB", "CL" + x.casLatency]; }
      if (cat === "storage") { o.perf = x.readMBs / 100; o.specs = [x.capacityGB + " GB", x.interface, x.readMBs + " MB/s"]; }
      if (cat === "psus") { o.perf = x.wattageW / 10; o.specs = [x.wattageW + "W", x.efficiency, x.modular]; }
      if (cat === "coolers") { o.perf = x.tdpRatingW; o.specs = [x.type, x.tdpRatingW + "W rated", x.heightMM + " mm"]; }
      if (cat === "cases") o.specs = [x.fits.join("/"), "GPU " + x.maxGpuLengthMM + " mm", "cooler " + x.maxCoolerHeightMM + " mm"]; }
    return o;
  }
  function all(cat) { return BCP[cat].items.map(function (x) { return norm(cat, x); }); }
  function compatOk(o, sel) {
    var x = o.raw;
    if (o.cat === "cpus") return !sel.mobo || x.socket === sel.mobo.socket;
    if (o.cat === "motherboards") return x.socket === sel.cpu.socket;
    if (o.cat === "memoryKits") return !sel.mobo || x.type === sel.mobo.ramType;
    if (o.cat === "coolers") return x.sockets.indexOf(sel.cpu.socket) >= 0;
    if (o.cat === "cases") return (!sel.mobo || x.fits.indexOf(sel.mobo.formFactor) >= 0) && x.maxGpuLengthMM >= (sel.gpu.lengthMM || 0);
    if (o.cat === "psus") return x.wattageW >= eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW);
    return true;
  }
  function remember(q) { if (!q) return; S.hist = [q].concat(S.hist.filter(function (h) { return h !== q; })).slice(0, 10); ui.set("search.hist", S.hist); }
  function table(P, head, rows) {
    var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { var td = el(i ? "td" : "th"); if (c && c.nodeType) td.appendChild(c); else td.textContent = c; tr.appendChild(td); }); t.appendChild(tr); });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
  }

  function find(box) {
    var sel = BCP.getSelection(), rerun = function () { box.innerHTML = ""; find(box); };
    var P = ui.panel("Hardware search", "every catalog, with filters"); box.appendChild(P);
    var items = all(S.cat), f = el("div", "hb-form");
    var qi = el("input"); qi.type = "search"; qi.placeholder = "Model, brand or spec, e.g. 7800X3D"; qi.value = S.q; qi.setAttribute("list", "srchSug");
    var dl = el("datalist"); dl.id = "srchSug"; items.slice(0, 200).forEach(function (o) { var op = el("option"); op.value = o.name; dl.appendChild(op); }); P.appendChild(dl);
    qi.addEventListener("change", function () { S.q = qi.value; S.page = 0; remember(S.q); rerun(); });
    f.appendChild(ui.field("Search", qi, "Autocomplete lists this category"));
    f.appendChild(ui.field("Category", ui.select(CATS.map(function (c) { return [c[0], c[1]]; }), S.cat, function (v) { S.cat = v; S.brand = ""; S.page = 0; rerun(); })));
    var brands = {}; items.forEach(function (o) { brands[o.brand] = 1; });
    f.appendChild(ui.field("Brand", ui.select([["", "Any brand"]].concat(Object.keys(brands).sort().map(function (b) { return [b, b]; })), S.brand, function (v) { S.brand = v; rerun(); })));
    var mp = el("input"); mp.type = "number"; mp.placeholder = "No limit"; mp.value = S.maxP; mp.addEventListener("change", function () { S.maxP = mp.value; rerun(); });
    f.appendChild(ui.field("Max price (USD)", mp, "Curated price layer"));
    var pf = el("input"); pf.type = "number"; pf.placeholder = "0"; pf.value = S.minPerf; pf.addEventListener("change", function () { S.minPerf = pf.value; rerun(); });
    f.appendChild(ui.field("Min performance score", pf, "CPU gaming / GPU score; other parts use a spec index"));
    f.appendChild(ui.field("Sort by", ui.select([["perf", "Performance"], ["priceA", "Price low to high"], ["priceD", "Price high to low"], ["year", "Newest"], ["name", "Name"], ["value", "Performance per dollar"]], S.sort, function (v) { S.sort = v; rerun(); })));
    var cwrap = el("label", "hb-field"); var cc = el("input"); cc.type = "checkbox"; cc.checked = S.compat; cc.addEventListener("change", function () { S.compat = cc.checked; rerun(); });
    cwrap.appendChild(el("span", null, "Compatible with my build")); cwrap.appendChild(cc); cwrap.appendChild(el("small", "muted", "Uses the Calculator selection")); f.appendChild(cwrap);
    P.appendChild(f);
    var words = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    var res = items.filter(function (o) {
      var hay = (o.name + " " + o.brand + " " + o.specs.join(" ")).toLowerCase();
      if (words.some(function (w) { return hay.indexOf(w) < 0; })) return false;
      if (S.brand && o.brand !== S.brand) return false;
      if (S.maxP && o.price > parseFloat(S.maxP)) return false;
      if (S.minPerf && (o.perf == null || o.perf < parseFloat(S.minPerf))) return false;
      if (S.compat && !compatOk(o, sel)) return false;
      return true;
    });
    res.sort(function (a, b) {
      return S.sort === "priceA" ? a.price - b.price : S.sort === "priceD" ? b.price - a.price : S.sort === "year" ? b.year - a.year : S.sort === "name" ? a.name.localeCompare(b.name)
        : S.sort === "value" ? (b.perf && b.price ? b.perf / b.price : 0) - (a.perf && a.price ? a.perf / a.price : 0) : (b.perf || 0) - (a.perf || 0);
    });
    if (S.hist.length) { var hh = el("div", "mk-chips"); hh.appendChild(el("span", "muted", "Recent searches ")); S.hist.slice(0, 6).forEach(function (h) { var c = el("button", "mk-chip", h); c.type = "button"; c.addEventListener("click", function () { S.q = h; rerun(); }); hh.appendChild(c); });
      var clr = el("button", "mk-chip", "Clear"); clr.type = "button"; clr.addEventListener("click", function () { S.hist = []; ui.set("search.hist", []); rerun(); }); hh.appendChild(clr); P.appendChild(hh); }
    var R = ui.panel(res.length + " results", CATS.filter(function (c) { return c[0] === S.cat; })[0][1]); box.appendChild(R);
    var PS = 25, pages = Math.max(1, Math.ceil(res.length / PS)); if (S.page >= pages) S.page = 0; var shown = res.slice(S.page * PS, S.page * PS + PS);
    table(R, ["", "Name", "Specs", "Price", "Score", "Year", ""], shown.map(function (o) {
      var ck = el("input"); ck.type = "checkbox"; ck.checked = S.cmp.indexOf(o.id) >= 0; ck.addEventListener("change", function () { var i = S.cmp.indexOf(o.id); if (ck.checked && i < 0) S.cmp.push(o.id); else if (i >= 0) S.cmp.splice(i, 1); S.cmp = S.cmp.slice(-4); cmpPanel(); });
      var sim = el("button", "mk-chip", "Similar"); sim.type = "button"; sim.addEventListener("click", function () { S.opt.simId = o.id; S.opt.simCat = o.cat; rerun(); });
      return [ck, o.name, o.specs.join(" , "), o.price ? ui.usd(o.price) : "-", o.perf != null ? String(Math.round(o.perf)) : "-", o.year || "-", sim];
    }));
    if (!res.length) R.appendChild(el("p", "muted", "Nothing matches. Loosen a filter."));
    if (pages > 1) { var pg = el("div", "mk-chips"); var pv = el("button", "mk-chip", "Previous"); pv.type = "button"; pv.disabled = S.page === 0; pv.addEventListener("click", function () { S.page--; rerun(); }); var nx = el("button", "mk-chip", "Next"); nx.type = "button"; nx.disabled = S.page >= pages - 1; nx.addEventListener("click", function () { S.page++; rerun(); }); pg.appendChild(pv); pg.appendChild(el("span", "muted", "Page " + (S.page + 1) + " of " + pages + " (" + res.length + " results)")); pg.appendChild(nx); R.appendChild(pg); }
    var cmpBox = el("div"); R.appendChild(cmpBox);
    function cmpPanel() {
      cmpBox.innerHTML = ""; var pick = items.filter(function (o) { return S.cmp.indexOf(o.id) >= 0; }); if (pick.length < 2) { if (pick.length) cmpBox.appendChild(ui.note("Tick one more part to compare side by side (up to 4).")); return; }
      var hd = el("h3", null, "Side-by-side"); cmpBox.appendChild(hd);
      var rows = [["Price"].concat(pick.map(function (o) { return o.price ? ui.usd(o.price) : "-"; })), ["Score"].concat(pick.map(function (o) { return o.perf != null ? String(Math.round(o.perf)) : "-"; })), ["Score per $100"].concat(pick.map(function (o) { return o.perf && o.price ? (o.perf / o.price * 100).toFixed(1) : "-"; }))];
      var n = Math.max.apply(null, pick.map(function (o) { return o.specs.length; })); for (var i = 0; i < n; i++) rows.push(["Spec " + (i + 1)].concat(pick.map(function (o) { return o.specs[i] || "-"; })));
      table(cmpBox, [""].concat(pick.map(function (o) { return o.name; })), rows);
    }
    cmpPanel();
    if (S.opt.simId) {
      var base = items.filter(function (o) { return o.id === S.opt.simId; })[0];
      if (base) {
        var near = items.filter(function (o) { return o.id !== base.id && o.perf != null && base.perf != null; }).sort(function (a, b) { return Math.abs(a.perf - base.perf) - Math.abs(b.perf - base.perf); }).slice(0, 6);
        var A = ui.panel("Similar to " + base.name, "closest score; alternatives show price difference"); box.appendChild(A);
        if (near.length) table(A, ["Part", "Score", "Price", "vs this part"], near.map(function (o) { var d = o.price - base.price; return [o.name, String(Math.round(o.perf)), o.price ? ui.usd(o.price) : "-", (o.price && base.price) ? (d === 0 ? "same price" : (d < 0 ? ui.usd(-d) + " cheaper" : ui.usd(d) + " dearer")) : "-"]; }));
        else A.appendChild(el("p", "muted", "This category has no score to rank similarity by."));
      }
    }
    var N = ui.panel("Recently added", "newest launch years in this category"); box.appendChild(N);
    var rec = items.filter(function (o) { return o.year; }).sort(function (a, b) { return b.year - a.year; }).slice(0, 6);
    if (rec.length) table(N, ["Part", "Launch year"], rec.map(function (o) { return [o.name, String(o.year)]; })); else N.appendChild(el("p", "muted", "No launch years recorded for this category."));
    N.appendChild(ui.note("Trending searches and popularity need real usage data, which this static site does not collect. Search history stays on this device."));
  }

  /* ---------- Game requirements ---------- */
  function minGpu(g, res, fps, cpu) {
    var gp = BCP.gpus.items.filter(function (x) { return !x.mobile && BCP.benchmarks.gpu[x.id]; }).sort(function (a, b) { return (BCP.benchmarks.gpu[a.id]) - (BCP.benchmarks.gpu[b.id]); });
    for (var i = 0; i < gp.length; i++) if (eng.gameFps(g, BCP.benchmarks.cpu[cpu.id].gaming, BCP.benchmarks.gpu[gp[i].id], res, "gaming", gp[i].vramGB) >= fps) return gp[i];
    return null;
  }
  function vramNeed(g, res) { var heavy = 1 - g.cpuWeight + (g.baseFps.p1080 < 140 ? 0.3 : 0); return Math.round((res === "p2160" ? 7 : res === "p1440" ? 5 : 3) + heavy * 4); }
  function reqs(box) {
    var sel = BCP.getSelection(), P = ui.panel("Game requirements", "derived from the FPS model, not publisher specs"); box.appendChild(P);
    var ref = BCP.cpus.items.filter(function (c) { return c.id === sel.cpu.id; })[0];
    var tiers = [["Minimum", "p1080", 30], ["Recommended", "p1080", 60], ["Ultra", "p1440", 60]];
    var rows = BCP.games.items.map(function (g) {
      var cells = tiers.map(function (t) { var gp = minGpu(g, t[1], t[2], sel.cpu); return gp ? gp.name : "Beyond the catalog"; });
      var vr = vramNeed(g, "p1080"), v2 = vramNeed(g, "p1440"), v4 = vramNeed(g, "p2160");
      var ram = g.cpuWeight >= 0.8 ? 16 : g.baseFps.p1080 <= 120 ? 24 : 16;
      var cur = eng.gameFps(g, BCP.benchmarks.cpu[sel.cpu.id].gaming, BCP.benchmarks.gpu[sel.gpu.id], sel.res, sel.workload, sel.gpu.vramGB);
      var verdict = cur >= 60 && sel.res !== "p1080" ? "Ultra ready" : cur >= 60 ? "Recommended met" : cur >= 30 ? "Minimum met" : "Below minimum";
      return [g.name].concat(cells).concat([vr + " / " + v2 + " / " + v4 + " GB", ram + " GB", cur + " fps", verdict]);
    });
    table(P, ["Game", "Minimum (1080p 30 fps)", "Recommended (1080p 60)", "Ultra (1440p 60 fps)", "VRAM 1080p / 1440p / 4K", "RAM", "Your build", "Check"], rows);
    ui.note && P.appendChild(ui.note("GPU tiers are the lowest catalog GPU that reaches each frame rate in the model with your CPU. VRAM and RAM figures are rules of thumb by game weight. Check the game's store page for official requirements."));
    var C = ui.panel("Game performance comparison", "same game, other builds"); box.appendChild(C);
    var gsel = ui.select(BCP.games.items.map(function (g) { return [g.id, g.name]; }), S.opt.game || BCP.games.items[0].id, function (v) { S.opt.game = v; box.innerHTML = ""; reqs(box); });
    var f = el("div", "hb-form"); f.appendChild(ui.field("Game", gsel)); C.appendChild(f);
    var g = BCP.games.items.filter(function (x) { return x.id === gsel.value; })[0], cpuS = BCP.benchmarks.cpu[sel.cpu.id].gaming;
    var cand = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && BCP.benchmarks.gpu[x.id]; }).sort(function (a, b) { return BCP.benchmarks.gpu[b.id] - BCP.benchmarks.gpu[a.id]; });
    var pick = [cand[0], cand[Math.floor(cand.length * 0.2)], cand[Math.floor(cand.length * 0.45)], cand[Math.floor(cand.length * 0.7)], sel.gpu].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    table(C, ["GPU", "1080p", "1440p", "4K"], pick.map(function (x) { return [x.name + (x.id === sel.gpu.id ? " (your build)" : "")].concat(["p1080", "p1440", "p2160"].map(function (r) { return eng.gameFps(g, cpuS, BCP.benchmarks.gpu[x.id], r, "gaming", x.vramGB) + " fps"; })); }));
  }

  BCP.addHub({ key: "search", label: "Search", before: "dash", title: "Find any part.", intro: "Filter and sort every catalog, compare results side by side, find alternatives, and check what your build needs for each game.",
    subs: [{ id: "find", label: "Hardware search", render: find }, { id: "reqs", label: "Game requirements", render: reqs }] });
})();
