/* ============================================================
 * BUDGET HUB - budget allocation, remaining/over-budget, under-budget advice,
 * upgrade cost, electricity cost and total cost of ownership.
 * Prices: curated layer or the weekly market feed (user choice). Electricity
 * rate and hours are user inputs, not claims about any country's tariff.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui;
  var S = { budget: ui.get("budget.total", 1500), basis: ui.get("budget.basis", "curated"), rate: ui.get("budget.rate", 0.15), gh: ui.get("budget.gh", 3), ih: ui.get("budget.ih", 6), years: ui.get("budget.years", 3) };
  function save() { Object.keys(S).forEach(function (k) { ui.set("budget." + k, S[k]); }); }

  var SHARE = { // typical share of budget per part, by workload (guideline percentages)
    gaming:       { cpu: 18, gpu: 38, mobo: 9, ram: 7, storage: 7, psu: 8, cooler: 3, case: 5, other: 5 },
    streaming:    { cpu: 24, gpu: 30, mobo: 10, ram: 8, storage: 8, psu: 8, cooler: 4, case: 5, other: 3 },
    productivity: { cpu: 30, gpu: 20, mobo: 11, ram: 10, storage: 10, psu: 8, cooler: 4, case: 4, other: 3 }
  };
  var LABEL = { cpu: "CPU", gpu: "GPU", mobo: "Motherboard", ram: "Memory", storage: "Storage", psu: "PSU", cooler: "Cooling", case: "Case" };
  var LIVEKEY = { cpu: "cpu", gpu: "gpu", mobo: "mobo", ram: "ram", storage: "ssd", psu: "psu" };

  function price(kind, it) {
    if (!it) return 0;
    if (S.basis === "market" && BCP.pricesLive && LIVEKEY[kind]) { var r = BCP.pricesLive[LIVEKEY[kind]][it.id]; if (r) return Math.round(r.week_close); }
    if (kind === "cpu") return BCP.prices.cpu[it.id] || 0;
    if (kind === "gpu") return BCP.prices.gpu[it.id] || 0;
    return it.priceUSD || 0;
  }
  function parts(sel) {
    var o = []; ["cpu", "gpu", "mobo", "ram", "storage", "psu", "cooler", "case_"].forEach(function (k) {
      var kind = k === "case_" ? "case" : k; if (sel[k]) o.push({ kind: kind, it: sel[k], p: price(kind, sel[k]) });
    }); return o;
  }
  function buildCost(sel) { return parts(sel).reduce(function (s, x) { return s + x.p; }, 0); }
  function head(box) {
    var f = ui.el("div", "hb-form");
    f.appendChild(ui.field("Total budget (USD)", ui.number(S.budget, 300, 20000, 50, function (v) { S.budget = v; save(); box._r(); }), "Your whole build"));
    f.appendChild(ui.field("Price basis", ui.select([["curated", "Curated estimates"], ["market", "Weekly market prices"]], S.basis, function (v) { S.basis = v; save(); box._r(); }), "Market = weekly US feed where matched"));
    box.appendChild(f);
  }

  function allocation(box) {
    box._r = function () { box.innerHTML = ""; allocation(box); };
    var sel = BCP.getSelection(), P = ui.panel("Budget allocation", "current Calculator build");
    head(P); box.appendChild(P);
    var ps = parts(sel), total = ps.reduce(function (s, x) { return s + x.p; }, 0), rem = S.budget - total;
    var share = SHARE[sel.workload] || SHARE.gaming;
    var stats = ui.el("div", "pw-stats");
    stats.appendChild(ui.stat("Budget", ui.usd(S.budget)));
    stats.appendChild(ui.stat("Build cost", ui.usd(total)));
    stats.appendChild(ui.stat(rem >= 0 ? "Remaining" : "Over budget", ui.usd(Math.abs(rem)), rem >= 0 ? "hb-good" : "hb-bad"));
    stats.appendChild(ui.stat("Used", Math.round(total / S.budget * 100) + "%"));
    P.appendChild(stats);
    var warn = ui.el("ul", "warn-list");
    if (rem < 0) warn.appendChild(ui.el("li", "warn bad", "Over budget by " + ui.usd(-rem) + ". Biggest saving candidates: " + ps.slice().sort(function (a, b) { return b.p - a.p; }).slice(0, 2).map(function (x) { return LABEL[x.kind] + " (" + ui.usd(x.p) + ")"; }).join(", ") + "."));
    else if (rem > S.budget * 0.15) warn.appendChild(ui.el("li", "warn info", "Under budget by " + ui.usd(rem) + " (" + Math.round(rem / S.budget * 100) + "%). See the under-budget suggestions below."));
    else warn.appendChild(ui.el("li", "warn ok", "Within budget with " + ui.usd(rem) + " to spare."));
    P.appendChild(warn);
    var D = ui.panel("Budget distribution", "your build vs typical " + sel.workload + " split"); box.appendChild(D);
    var hdr = ui.el("div", "hb-row muted"); ["Part", "Share of budget", "Spent", "Typical"].forEach(function (t, i) { hdr.appendChild(ui.el("span", i > 1 ? "hb-num" : "", t)); }); D.appendChild(hdr);
    ps.forEach(function (x) {
      var pct = Math.round(x.p / S.budget * 100), typ = share[x.kind === "case" ? "case" : x.kind] || 0;
      var row = ui.el("div", "hb-row"); row.appendChild(ui.el("span", "hb-name", LABEL[x.kind]));
      row.appendChild(ui.bar(pct, Math.abs(pct - typ) > 12 ? "mid" : "good"));
      row.appendChild(ui.el("span", "hb-num", ui.usd(x.p) + " (" + pct + "%)")); row.appendChild(ui.el("span", "hb-num muted", typ + "% = " + ui.usd(S.budget * typ / 100)));
      D.appendChild(row);
    });
    D.appendChild(ui.note("Typical splits are common guideline percentages for each workload, not measured data. They show where a build looks lopsided."));
    // under-budget recommendations
    var R = ui.panel("Under-budget suggestions", "best use of the remaining money"); box.appendChild(R);
    var ul = ui.el("ul", "hb-list");
    if (rem <= 0) ul.appendChild(ui.el("li", null, "No spare budget. Switch the price basis or lower a part to free money."));
    else {
      var g = sel.gpu, gs = BCP.benchmarks.gpu[g.id], cur = price("gpu", g);
      var better = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && BCP.benchmarks.gpu[x.id] > gs && price("gpu", x) > 0 && price("gpu", x) - cur <= rem; })
        .sort(function (a, b) { return BCP.benchmarks.gpu[b.id] - BCP.benchmarks.gpu[a.id]; })[0];
      if (better) ul.appendChild(ui.el("li", null, "GPU: step up to " + better.name + " for " + ui.usd(price("gpu", better) - cur) + " more (score " + Math.round(BCP.benchmarks.gpu[better.id]) + " vs " + Math.round(gs) + ")."));
      var c = sel.cpu, cs = BCP.benchmarks.cpu[c.id].gaming, cc = price("cpu", c);
      var bc = BCP.cpus.items.filter(function (x) { return !x.legacy && !x.mobile && x.socket === c.socket && BCP.benchmarks.cpu[x.id] && BCP.benchmarks.cpu[x.id].gaming > cs && price("cpu", x) > 0 && price("cpu", x) - cc <= rem; })
        .sort(function (a, b) { return BCP.benchmarks.cpu[b.id].gaming - BCP.benchmarks.cpu[a.id].gaming; })[0];
      if (bc) ul.appendChild(ui.el("li", null, "CPU (same " + c.socket + " socket): " + bc.name + " for " + ui.usd(price("cpu", bc) - cc) + " more."));
      if (sel.storage && sel.storage.capacityGB < 2000) ul.appendChild(ui.el("li", null, "Storage: a 2 TB drive removes the most common later upgrade."));
      if (sel.psu && sel.psu.wattageW < BCP.engine.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW) * 1.25) ul.appendChild(ui.el("li", null, "PSU: more headroom keeps GPU upgrades possible."));
      if (!ul.children.length) ul.appendChild(ui.el("li", null, "Nothing clearly better fits the remaining " + ui.usd(rem) + ". Keep it as a buffer for price swings."));
    }
    R.appendChild(ul);
  }

  function upgradeCost(box) {
    var sel = BCP.getSelection(), P = ui.panel("Upgrade cost calculator", "what a swap costs");
    box.appendChild(P);
    var f = ui.el("div", "hb-form"), out = ui.el("div"); P.appendChild(f); P.appendChild(out);
    var gpus = BCP.gpus.items.filter(function (x) { return !x.mobile && price("gpu", x) > 0; }), cpus = BCP.cpus.items.filter(function (x) { return !x.mobile && x.socket === sel.cpu.socket && price("cpu", x) > 0; });
    var tg = sel.gpu.id, tc = sel.cpu.id, resale = ui.get("budget.resale", 50);
    function calc() {
      out.innerHTML = "";
      var g = BCP.gpus.items.filter(function (x) { return x.id === tg; })[0], c = BCP.cpus.items.filter(function (x) { return x.id === tc; })[0];
      var rows = [["GPU", sel.gpu, g, "gpu"], ["CPU", sel.cpu, c, "cpu"]], total = 0;
      var t = ui.el("table", "hb-table"); t.innerHTML = "<thead><tr><th>Part</th><th>Now</th><th>Target</th><th>New cost</th><th>Resale</th><th>Net</th></tr></thead>";
      var tb = ui.el("tbody");
      rows.forEach(function (r) {
        var np = r[1].id === r[2].id ? 0 : price(r[3], r[2]), rs = r[1].id === r[2].id ? 0 : Math.round(price(r[3], r[1]) * resale / 100), net = np - rs; total += net;
        var tr = ui.el("tr"); [r[0], r[1].name, r[2].name, ui.usd(np), "-" + ui.usd(rs), ui.usd(net)].forEach(function (x) { tr.appendChild(ui.el("td", null, x)); }); tb.appendChild(tr);
      });
      t.appendChild(tb); out.appendChild(t);
      var st = ui.el("div", "pw-stats"); st.style.marginTop = "12px"; st.appendChild(ui.stat("Net upgrade cost", ui.usd(total))); out.appendChild(st);
      var gs = BCP.benchmarks.gpu[g.id] / BCP.benchmarks.gpu[sel.gpu.id], cg = BCP.benchmarks.cpu[c.id].gaming / BCP.benchmarks.cpu[sel.cpu.id].gaming;
      out.appendChild(ui.note("Estimated change: GPU score " + (gs >= 1 ? "+" : "") + Math.round((gs - 1) * 100) + "%, CPU gaming score " + (cg >= 1 ? "+" : "") + Math.round((cg - 1) * 100) + "%. Resale uses the percentage you set; it is your assumption, not a market quote."));
    }
    f.appendChild(ui.field("Target GPU", ui.select(gpus.map(function (x) { return [x.id, x.name]; }), tg, function (v) { tg = v; calc(); })));
    f.appendChild(ui.field("Target CPU (same socket)", ui.select(cpus.map(function (x) { return [x.id, x.name]; }), tc, function (v) { tc = v; calc(); })));
    f.appendChild(ui.field("Old part resale %", ui.number(resale, 0, 100, 5, function (v) { resale = v; ui.set("budget.resale", v); calc(); }), "Share of its price you recover"));
    calc();
  }

  function electricity(box) {
    box._r = function () { box.innerHTML = ""; electricity(box); };
    var sel = BCP.getSelection(), pf = BCP.powerFigures(sel), P = ui.panel("Electricity and ownership cost", "your usage, your rate");
    var f = ui.el("div", "hb-form");
    f.appendChild(ui.field("Electricity price (USD per kWh)", ui.number(S.rate, 0.01, 2, 0.01, function (v) { S.rate = v; save(); upd(); }), "Editable: check your own bill"));
    f.appendChild(ui.field("Gaming hours per day", ui.number(S.gh, 0, 24, 0.5, function (v) { S.gh = v; save(); upd(); })));
    f.appendChild(ui.field("Idle / light hours per day", ui.number(S.ih, 0, 24, 0.5, function (v) { S.ih = v; save(); upd(); })));
    f.appendChild(ui.field("Years of ownership", ui.number(S.years, 1, 10, 1, function (v) { S.years = v; save(); upd(); })));
    P.appendChild(f); var out = ui.el("div"); P.appendChild(out); box.appendChild(P);
    function upd() {
      out.innerHTML = "";
      var gk = pf.gaming * S.gh / 1000, ik = pf.idle * S.ih / 1000, dayK = gk + ik;
      var costDay = dayK * S.rate, gCost = gk * S.rate * 365, iCost = ik * S.rate * 365, year = costDay * 365, month = year / 12;
      var st = ui.el("div", "pw-stats");
      st.appendChild(ui.stat("Gaming draw", "~" + pf.gaming + "W")); st.appendChild(ui.stat("Idle draw", "~" + pf.idle + "W"));
      st.appendChild(ui.stat("Monthly cost", ui.usd(month, 2))); st.appendChild(ui.stat("Annual cost", ui.usd(year, 2)));
      st.appendChild(ui.stat("Gaming per year", ui.usd(gCost, 2))); st.appendChild(ui.stat("Idle per year", ui.usd(iCost, 2)));
      out.appendChild(st);
      var bc = buildCost(sel), tco = bc + year * S.years;
      var T = ui.el("div", "pw-stats"); T.style.marginTop = "12px";
      T.appendChild(ui.stat("Build cost", ui.usd(bc))); T.appendChild(ui.stat("Electricity, " + S.years + " yr", ui.usd(year * S.years)));
      T.appendChild(ui.stat("Total cost of ownership", ui.usd(tco))); T.appendChild(ui.stat("Per month, all-in", ui.usd(tco / (S.years * 12))));
      out.appendChild(T);
      // power efficiency cost analysis: alternative GPUs with similar score
      var gs = BCP.benchmarks.gpu[sel.gpu.id], alts = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && x.id !== sel.gpu.id && BCP.benchmarks.gpu[x.id] && Math.abs(BCP.benchmarks.gpu[x.id] / gs - 1) <= 0.12 && x.tdpW < sel.gpu.tdpW - 20; }).slice(0, 3);
      var h = ui.el("h3", "an-sub", "Power efficiency cost analysis"); out.appendChild(h);
      if (!alts.length) out.appendChild(ui.note("No clearly more efficient GPU within 12% of this card's score."));
      else { var ul = ui.el("ul", "hb-list"); alts.forEach(function (a) {
        var saveW = (sel.gpu.tdpW - a.tdpW) * 0.9, saveY = saveW * S.gh * 365 / 1000 * S.rate;
        ul.appendChild(ui.el("li", null, a.name + ": about " + Math.round(saveW) + "W less when gaming, saving roughly " + ui.usd(saveY, 2) + " per year at your inputs (score within " + Math.round(Math.abs(BCP.benchmarks.gpu[a.id] / gs - 1) * 100) + "%)."));
      }); out.appendChild(ul); }
      out.appendChild(ui.note("Estimates use the Power tab's TDP-based gaming and idle draw figures, not measured wall power. Cost = kWh x your price."));
    }
    upd();
  }

  document.addEventListener("DOMContentLoaded", function () {
    BCP.addHub({ key: "budget", label: "Budget", before: "dash", title: "Plan the money.", intro: "Set a budget, see how your build splits it, find the best use of what is left, price an upgrade, and see what the build costs to run.",
      subs: [{ id: "alloc", label: "Budget allocation", render: allocation }, { id: "upgrade", label: "Upgrade cost", render: upgradeCost }, { id: "power", label: "Electricity & ownership", render: electricity }] });
  });
})();
