/* ============================================================
 * BUILDS HUB - recommended builds by tier, use case, game, software,
 * resolution and priority, with ratings, alternatives and one-click
 * load into the Calculator. Builds are assembled by the engine from the
 * curated catalog; these are recommendations, not sold prebuilt PCs.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var TIERS = [["entry", "Entry-level", 700], ["mid", "Mid-range", 1300], ["high", "High-end", 2200], ["enth", "Enthusiast", 3500], ["flag", "Flagship", 6000]];
  var USE = [["gaming", "Gaming"], ["streaming", "Streaming (game + encode)"], ["productivity", "Workstation / productivity"], ["content", "Content creation"], ["programming", "Programming"], ["ai", "AI / ML workstation"]];
  var PRIO = [["perf", "Best performance"], ["value", "Best value"], ["power", "Best power efficiency"], ["upgrade", "Best upgradeability"]];
  var S = ui.get("bd.s", { tier: "mid", use: "gaming", res: "p1440", prio: "value", budget: 0, game: "", sw: "" });
  function save() { ui.set("bd.s", S); }
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gs(g) { return BCP.benchmarks.gpu[g.id]; }
  function budgetOf() { return S.budget > 0 ? S.budget : TIERS.filter(function (t) { return t[0] === S.tier; })[0][2]; }
  function wlOf(u) { return u === "gaming" ? "gaming" : u === "streaming" ? "streaming" : "productivity"; }

  function cands(budget, use, res, floor) {
    var list = eng.generateBuilds(budget, wlOf(use), res, 120).filter(function (b) { return !floor || b.total >= budget * floor; });
    var thr = function (c) { return c.cpu.threads; };
    list.forEach(function (b) {
      b.score = b.eff;
      if (use === "content") b.score = 0.55 * cb(b.cpu).productivity + 0.45 * gs(b.gpu);
      if (use === "programming") b.score = 0.8 * cb(b.cpu).productivity + 0.1 * Math.min(100, thr(b) * 3) + 0.1 * (b.ram.capacityGB >= 32 ? 100 : 40);
      if (use === "ai") b.score = 0.7 * Math.min(100, b.gpu.vramGB * 4.2) + 0.3 * gs(b.gpu);
    });
    return list;
  }
  function rank(list, prio, use) {
    function pw(b) { return b.cpu.tdpW + b.gpu.tdpW; }
    function up(b) { var s = 0; if (/AM5|1851/.test(b.cpu.socket)) s += 50; else if (/AM4|1700/.test(b.cpu.socket)) s += 20; s += Math.min(20, (b.mobo.ramSlots || 2) * 5); s += Math.min(15, (b.psu.wattageW - eng.recommendedPsuW(b.cpu.tdpW, b.gpu.tdpW)) / 20); s += b.mobo.m2Slots >= 3 ? 10 : 4; s += b.mobo.pcie5Gpu ? 5 : 0; return s; }
    var key = { perf: function (b) { return b.score; }, value: function (b) { return b.score / b.total; }, power: function (b) { return b.score / pw(b); }, upgrade: function (b) { return up(b) * 2 + b.score * 0.5; } }[prio];
    return list.slice().sort(function (a, b) { return key(b) - key(a); });
  }
  function grade(s) { return s >= 90 ? "A" : s >= 80 ? "B" : s >= 65 ? "C" : s >= 50 ? "D" : "F"; }
  function selOf(b, res, wl) { var cur = BCP.getSelection(); return { cpu: b.cpu, gpu: b.gpu, mobo: b.mobo, ram: b.ram, psu: b.psu, cooler: b.cooler, storage: b.storage, case_: cur.case_, res: res, workload: wl }; }
  function fpsFor(b, g, res, wl) { return eng.gameFps(g, cb(b.cpu).gaming, gs(b.gpu), res, wl, b.gpu.vramGB); }
  function load(b, res, wl) { var cur = BCP.getSelection(); var code = [b.cpu.id, b.gpu.id, b.mobo.id, b.ram.id, b.psu.id, b.cooler.id, cur.case_ ? cur.case_.id : "", b.storage.id, res, wl].join(","); if (BCP.applyBuildCode) { BCP.applyBuildCode(code); var t = document.querySelector('.tab-btn[data-view="calc"]'); if (t) t.click(); } }
  function chips(P, opts, val, cb2) { var r = el("div", "mk-chips"); opts.forEach(function (o) { var b = el("button", "mk-chip" + (o[0] === val ? " on active" : ""), o[1]); b.type = "button"; b.addEventListener("click", function () { cb2(o[0]); }); r.appendChild(b); }); P.appendChild(r); }

  function card(P, b, k, ctx) {
    var wl = wlOf(S.use), res = S.res, h = eng.buildHealth(selOf(b, res, wl)), hs = h ? h.score : 0, d = el("div", "adv-block");
    d.appendChild(el("h3", null, (k === 0 ? "Top pick: " : "Option " + (k + 1) + ": ") + b.cpu.name + " + " + b.gpu.name + " - " + ui.usd(b.total)));
    d.appendChild(el("p", "muted", [b.mobo.name, b.ram.name, b.storage.name, b.psu.name, b.cooler.name].join(", ")));
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Performance", Math.round(b.score) + "/100")); st.appendChild(ui.stat("Value", Math.round(100 * (b.score / b.total) / ctx.bestVal) + "/100")); st.appendChild(ui.stat("Compatibility", grade(hs) + " (" + hs + ")")); st.appendChild(ui.stat("Bottleneck", b.pct + "% " + b.limiter)); d.appendChild(st);
    var g = S.game && BCP.games.items.filter(function (x) { return x.id === S.game; })[0];
    var line = []; if (g && wl !== "productivity") line.push(g.name + ": about " + fpsFor(b, g, res, wl) + " fps at " + RES[res]);
    var sw = S.sw && BCP.software.items.filter(function (x) { return x.id === S.sw; })[0];
    if (sw) { var ok = b.ram.capacityGB >= sw.ramGB; line.push(sw.name + ": needs about " + sw.ramGB + " GB RAM, this build has " + b.ram.capacityGB + " GB" + (ok ? "" : " (below the guidance)")); }
    if (S.use === "ai") line.push("GPU memory " + b.gpu.vramGB + " GB (the main limit for local AI models)");
    if (line.length) d.appendChild(el("p", null, line.join(". ") + "."));
    var bt = el("button", "hb-btn ghost", "Load in Calculator"); bt.type = "button"; bt.addEventListener("click", function () { load(b, res, wl); }); d.appendChild(bt); P.appendChild(d);
  }

  function recommend(box) {
    var rer = function () { save(); box.innerHTML = ""; recommend(box); }, P = ui.panel("Recommended builds", "pick a tier, use and priority"); box.appendChild(P);
    P.appendChild(el("h3", "an-sub", "Tier")); chips(P, TIERS.map(function (t) { return [t[0], t[1] + " (" + ui.usd(t[2]) + ")"]; }), S.tier, function (v) { S.tier = v; S.budget = 0; rer(); });
    P.appendChild(el("h3", "an-sub", "Use")); chips(P, USE, S.use, function (v) { S.use = v; rer(); });
    P.appendChild(el("h3", "an-sub", "Priority")); chips(P, PRIO, S.prio, function (v) { S.prio = v; rer(); });
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Resolution", ui.select([["p1080", "1080p"], ["p1440", "1440p"], ["p2160", "4K"]], S.res, function (v) { S.res = v; rer(); })));
    var bi = el("input"); bi.type = "number"; bi.min = 400; bi.max = 15000; bi.step = 50; bi.placeholder = ui.usd(budgetOf()).replace("$", ""); bi.value = S.budget || ""; bi.addEventListener("change", function () { var v = parseInt(bi.value, 10); S.budget = v > 0 ? Math.min(15000, v) : 0; rer(); }); f.appendChild(ui.field("Budget override (USD)", bi, "Leave empty to use the tier"));
    f.appendChild(ui.field("For a game", ui.select([["", "Any"]].concat(BCP.games.items.map(function (g) { return [g.id, g.name]; })), S.game, function (v) { S.game = v; rer(); })));
    f.appendChild(ui.field("For software", ui.select([["", "Any"]].concat(BCP.software.items.map(function (g) { return [g.id, g.name]; })), S.sw, function (v) { S.sw = v; rer(); })));
    P.appendChild(f);
    var budget = budgetOf(), list = cands(budget, S.use, S.res, S.budget > 0 ? 0 : 0.6); if (!list.length) list = cands(budget, S.use, S.res, 0);
    var R = ui.panel(RES[S.res] + " " + (USE.filter(function (u) { return u[0] === S.use; })[0][1]) + " builds up to " + ui.usd(budget), PRIO.filter(function (p) { return p[0] === S.prio; })[0][1].toLowerCase()); box.appendChild(R);
    if (!list.length) { R.appendChild(ui.note("No catalog build fits this tier and use. Try another tier or a budget override.")); return; }
    var bestVal = Math.max.apply(null, list.map(function (b) { return b.score / b.total; })), ctx = { bestVal: bestVal };
    var ranked = rank(list, S.prio, S.use); ranked.slice(0, 3).forEach(function (b, k) { card(R, b, k, ctx); });
    if (ranked.length > 3) {
      R.appendChild(el("h3", "an-sub", "Alternatives")); var t = el("table", "cmp-table lab-table"), h = el("tr"); ["Build", "Price", "Perf", "Bottleneck"].forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
      ranked.slice(3, 9).forEach(function (b) { var tr = el("tr"); [b.cpu.name + " + " + b.gpu.name, ui.usd(b.total), Math.round(b.score) + "/100", b.pct + "% " + b.limiter].forEach(function (x, i) { tr.appendChild(el(i ? "td" : "th", null, x)); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); R.appendChild(w);
    }
    R.appendChild(ui.note("Parts are chosen by the same engine as the Calculator from the curated catalog, priced with curated figures (see Data health for their dates). Performance is the balanced score on the benchmark scale (RTX 4090 = 100). For content, programming and AI use, the score is a labeled heuristic that weights CPU multi-core, GPU and memory. These are recommended part lists you assemble, not sold prebuilt PCs, and no store or seller is involved."));
  }

  function monthly(box) {
    var P = ui.panel("Best value by tier", "this data refresh, gaming at 1440p"); box.appendChild(P);
    var wk = BCP.pricesLive && BCP.pricesLive.meta && BCP.pricesLive.meta.week || "n/a";
    var t = el("table", "cmp-table lab-table"), h = el("tr"); ["Tier", "Build", "Price", "Perf"].forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    var hist = ui.get("bd.hist", {}), now = {};
    TIERS.forEach(function (T) {
      var l = cands(T[2], "gaming", "p1440", 0.6); if (!l.length) return; var b = rank(l, "value", "gaming")[0]; now[T[0]] = b.total;
      var tr = el("tr"); [T[1] + " (" + ui.usd(T[2]) + ")", b.cpu.name + " + " + b.gpu.name, ui.usd(b.total), Math.round(b.score) + "/100"].forEach(function (x, i) { tr.appendChild(el(i ? "td" : "th", null, x)); }); t.appendChild(tr);
    });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
    hist[wk] = now; ui.set("bd.hist", hist);
    P.appendChild(ui.note("Picked by the engine from the highest score per dollar among builds that use at least 60% of the tier budget. This is not an editor's or community choice: nobody curates it. Data week " + wk + "."));
    var P2 = ui.panel("Build price tracking", "recorded on this device each time the data week changes"); box.appendChild(P2);
    var ks = Object.keys(hist).sort(); if (ks.length < 2) P2.appendChild(ui.note("One data week recorded so far (" + ks[0] + "). Come back after the next weekly refresh to see changes. History is stored on this device only."));
    var t2 = el("table", "cmp-table lab-table"), h2 = el("tr"); h2.appendChild(el("th", null, "Tier")); ks.forEach(function (k) { h2.appendChild(el("th", null, k)); }); t2.appendChild(h2);
    TIERS.forEach(function (T) { var tr = el("tr"); tr.appendChild(el("th", null, T[1])); ks.forEach(function (k) { tr.appendChild(el("td", null, hist[k][T[0]] ? ui.usd(hist[k][T[0]]) : "-")); }); t2.appendChild(tr); }); var w2 = el("div", "lab-scroll"); w2.appendChild(t2); P2.appendChild(w2);
  }

  function byGame(box) {
    var P = ui.panel("Best builds for a game", "most FPS per dollar at your resolution"); box.appendChild(P);
    var rer = function () { save(); box.innerHTML = ""; byGame(box); };
    var f = el("div", "hb-form"); f.appendChild(ui.field("Game", ui.select(BCP.games.items.map(function (g) { return [g.id, g.name]; }), S.game || BCP.games.items[0].id, function (v) { S.game = v; rer(); })));
    f.appendChild(ui.field("Resolution", ui.select([["p1080", "1080p"], ["p1440", "1440p"], ["p2160", "4K"]], S.res, function (v) { S.res = v; rer(); })));
    f.appendChild(ui.field("Target FPS", ui.select([["60", "60"], ["90", "90"], ["120", "120"], ["144", "144"]], String(S.fps || 60), function (v) { S.fps = +v; rer(); }))); P.appendChild(f);
    var g = BCP.games.items.filter(function (x) { return x.id === (S.game || BCP.games.items[0].id); })[0], tgt = S.fps || 60, rows = [];
    TIERS.forEach(function (T) { cands(T[2], "gaming", S.res).forEach(function (b) { b.fps = fpsFor(b, g, S.res, "gaming"); b.tier = T[1]; rows.push(b); }); });
    var seen = {}; var ok = rows.filter(function (b) { return b.fps >= tgt; }).sort(function (a, b) { return a.total - b.total; }).filter(function (b) { var k = b.cpu.id + b.gpu.id; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 6);
    var R = ui.panel("Cheapest builds that reach " + tgt + " fps", g.name + " at " + RES[S.res]); box.appendChild(R);
    if (!ok.length) R.appendChild(ui.note("No catalog build up to $6,000 reaches " + tgt + " fps in this game at " + RES[S.res] + ". Try a lower target or resolution."));
    ok.forEach(function (b, k) { var d = el("div", "adv-block"); d.appendChild(el("h3", null, b.cpu.name + " + " + b.gpu.name + " - " + ui.usd(b.total))); d.appendChild(el("p", null, "About " + b.fps + " fps. " + [b.mobo.name, b.ram.name, b.psu.name].join(", ") + ".")); var bt = el("button", "hb-btn ghost", "Load in Calculator"); bt.type = "button"; bt.addEventListener("click", function () { load(b, S.res, "gaming"); }); d.appendChild(bt); R.appendChild(d); });
    R.appendChild(ui.note("FPS is the engine's estimate from the game's baseline and the benchmark scores, not a measurement. Prices are curated."));
  }

  document.addEventListener("DOMContentLoaded", function () {
    BCP.addHub({ key: "builds", label: "Builds", before: "dash", title: "Recommended builds.", intro: "Part lists picked by the engine for your tier, use, game or software, with ratings and alternatives. Load any of them into the Calculator.",
      subs: [{ id: "rec", label: "Recommended builds", render: recommend }, { id: "game", label: "By game", render: byGame }, { id: "tier", label: "Value by tier", render: monthly }] });
  });
})();
