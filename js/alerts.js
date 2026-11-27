/* ============================================================
 * ALERTS HUB - in-app notification center, price watchlist, preferences.
 * Alerts are computed on this device from the Calculator build, the curated
 * benchmark layer and the WEEKLY price feed. There is no push, email or live
 * stock feed: the watchlist is checked whenever the app is open.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var DEF = { bottleneck: true, power: true, budget: true, bios: true, upgrade: true, recommend: true, benchmark: true, release: true, deal: true, price: true, bnThreshold: 20, psuThreshold: 80 };
  var S = { pref: Object.assign({}, DEF, ui.get("alerts.pref", {})), read: ui.get("alerts.read", {}), watch: ui.get("alerts.watch", []), cat: "all", add: { kind: "gpu", id: "", target: "" } };
  var CAT = { bottleneck: "Bottleneck", power: "Power", budget: "Budget", bios: "BIOS", upgrade: "Upgrade", recommend: "Recommendation", benchmark: "Benchmark data", release: "New hardware", deal: "Deals", price: "Price watch" };
  var KIND = { cpu: "cpus", gpu: "gpus", mobo: "motherboards", ram: "memoryKits", ssd: "storage", psu: "psus" };
  var KLAB = { cpu: "CPU", gpu: "GPU", mobo: "Motherboard", ram: "Memory", ssd: "Storage", psu: "PSU" };
  function save() { ui.set("alerts.pref", S.pref); ui.set("alerts.read", S.read); ui.set("alerts.watch", S.watch); }
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function name(kind, id) { var it = BCP[KIND[kind]].items.filter(function (x) { return x.id === id; })[0]; return it ? it.name : id; }
  function live(kind, id) { var r = BCP.pricesLive && BCP.pricesLive[kind] && BCP.pricesLive[kind][id]; return r ? Math.round(r.week_close) : null; }
  function buildTotal(sel) { var t = 0; [["cpu", sel.cpu], ["gpu", sel.gpu]].forEach(function (p) { t += BCP.prices[p[0]][p[1].id] || 0; }); ["mobo", "ram", "psu", "cooler", "storage", "case_"].forEach(function (k) { if (sel[k]) t += sel[k].priceUSD || 0; }); return t; }

  function compute() {
    var sel = BCP.getSelection(), out = [], P = S.pref, w = BCP.pricesLive && BCP.pricesLive.meta ? BCP.pricesLive.meta.week : "";
    function add(cat, level, id, title, text) { if (P[cat]) out.push({ id: cat + ":" + id, cat: cat, level: level, title: title, text: text }); }
    var bn = eng.bottleneck(cb(sel.cpu), BCP.benchmarks.gpu[sel.gpu.id], sel.res, sel.workload, sel.cpu);
    if (bn.pct >= P.bnThreshold && bn.limiter !== "balanced") add("bottleneck", bn.pct >= 35 ? "bad" : "warn", sel.cpu.id + sel.gpu.id + sel.res + sel.workload, "Bottleneck above " + P.bnThreshold + "%", sel.cpu.name + " with " + sel.gpu.name + " is " + bn.limiter.toUpperCase() + "-limited by about " + bn.pct + "% at the selected resolution.");
    var pf = BCP.powerFigures(sel), load = Math.round(pf.peak / sel.psu.wattageW * 100);
    if (load >= P.psuThreshold) add("power", load >= 100 ? "bad" : "warn", sel.psu.id + sel.cpu.id + sel.gpu.id, "PSU load at " + load + "% of peak", "Estimated peak draw ~" + pf.peak + "W against a " + sel.psu.wattageW + "W unit. Recommended: " + eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW) + "W or more.");
    var tot = buildTotal(sel), bud = ui.get("budget.total", 1500);
    if (tot > bud) add("budget", "warn", Math.round(tot) + ":" + bud, "Over budget by " + ui.usd(tot - bud), "Build costs " + ui.usd(tot) + " against a " + ui.usd(bud) + " budget (set in the Budget tab).");
    if (sel.mobo) {
      var ch = sel.mobo.chipset || "", ar = sel.cpu.arch || "";
      if (sel.cpu.socket === "AM4" && /Zen 3/.test(ar) && /A320|B350|X370/.test(ch)) add("bios", "warn", sel.mobo.id + sel.cpu.id, "BIOS update likely needed", ch + " boards usually need a BIOS update before they accept " + sel.cpu.name + ". Check the board maker's CPU support list.");
      if (sel.cpu.socket === "AM5" && /Zen 5/.test(ar) && /A620|B650|X670/.test(ch)) add("bios", "info", sel.mobo.id + sel.cpu.id, "Check the BIOS version", ch + " boards from early production may need a BIOS update for " + sel.cpu.name + ". Verify on the board maker's support page.");
    }
    var cur = BCP.benchmarks.gpu[sel.gpu.id], cp = BCP.prices.gpu[sel.gpu.id] || 0;
    var base = BCP.games.items.reduce(function (s, g) { return s + eng.gameFps(g, cb(sel.cpu).gaming, cur, sel.res, sel.workload, sel.gpu.vramGB); }, 0);
    var best = null; BCP.gpus.items.forEach(function (x) { var sc = BCP.benchmarks.gpu[x.id], pr = BCP.prices.gpu[x.id]; if (x.legacy || x.mobile || !sc || !pr || pr - cp > 300 || pr <= cp) return; var f = BCP.games.items.reduce(function (s, g) { return s + eng.gameFps(g, cb(sel.cpu).gaming, sc, sel.res, sel.workload, x.vramGB); }, 0); var gain = f / base - 1; if (gain >= 0.25 && (!best || gain > best.g)) best = { x: x, g: gain, d: pr - cp }; });
    if (best) add("upgrade", "info", sel.gpu.id + best.x.id, "GPU upgrade worth a look", best.x.name + " adds about " + Math.round(best.g * 100) + "% FPS in this model for " + ui.usd(best.d) + " more.");
    var h = eng.buildHealth(sel); if (h && h.tips.length) add("recommend", "info", h.tips[0], "Build tip", "Biggest gap in the build health score: " + h.tips[0] + ".");
    var meta = BCP.benchmarks.meta, age = Math.floor((Date.now() - new Date((meta.asOf.match(/\d{4}-\d{2}/) || ["2026-11"])[0] + "-01").getTime()) / 864e5);
    add("benchmark", age > 90 ? "warn" : "info", meta.asOf, age > 90 ? "Benchmark data is " + Math.round(age / 30) + " months old" : "Benchmark layer: " + meta.asOf, "Scores are curated estimates, not measurements. Confidence is high for current parts and low for legacy and laptop parts. Details are in the Data sources tab.");
    var fresh = BCP.gpus.items.concat(BCP.cpus.items).filter(function (x) { return x.launchYear >= 2026 && !x.mobile; }).slice(0, 3);
    if (fresh.length) add("release", "info", fresh.map(function (x) { return x.id; }).join(), "New hardware in the catalog", fresh.map(function (x) { return x.name; }).join(", ") + " launched in 2026. This list comes from the app's own catalog, not a live release feed.");
    if (BCP.pricesLive) {
      var deals = []; ["gpu", "cpu"].forEach(function (k) { var o = BCP.pricesLive[k] || {}; Object.keys(o).forEach(function (id) { var r = o[id]; if (r.launch_price && r.week_close >= 20 && r.week_close <= r.launch_price * 0.9) deals.push({ k: k, id: id, pct: Math.round((1 - r.week_close / r.launch_price) * 100), p: Math.round(r.week_close) }); }); });
      deals.sort(function (a, b) { return b.pct - a.pct; }).slice(0, 3).forEach(function (d) { add("deal", "ok", d.id + w, name(d.k, d.id) + " is " + d.pct + "% under launch price", "Cheapest in-stock price in the " + w + " feed is " + ui.usd(d.p) + ". Weekly floor price, not a live offer.");  });
      S.watch.forEach(function (wi) { var c = live(wi.kind, wi.id); if (c != null && c <= wi.target) add("price", "ok", wi.kind + wi.id + w, name(wi.kind, wi.id) + " reached your target", "Feed price " + ui.usd(c) + " is at or under your " + ui.usd(wi.target) + " target (" + w + ").");  });
    }
    return out;
  }
  function unread() { return compute().filter(function (a) { return !S.read[a.id]; }); }
  var tabBtn;
  function badge() { if (!tabBtn) return; var n = unread().length; tabBtn.textContent = n ? "Alerts (" + n + ")" : "Alerts"; }

  function center(box) {
    var rerun = function () { box.innerHTML = ""; center(box); badge(); };
    var all = compute(), shown = all.filter(function (a) { return S.cat === "all" || a.cat === S.cat; });
    var P = ui.panel("Notifications", all.filter(function (a) { return !S.read[a.id]; }).length + " unread of " + all.length); box.appendChild(P);
    var ch = el("div", "mk-chips"); [["all", "All"]].concat(Object.keys(CAT).filter(function (k) { return S.pref[k]; }).map(function (k) { return [k, CAT[k]]; })).forEach(function (c) { var b = el("button", "mk-chip" + (S.cat === c[0] ? " active" : ""), c[1]); b.type = "button"; b.addEventListener("click", function () { S.cat = c[0]; rerun(); }); ch.appendChild(b); }); P.appendChild(ch);
    var mk = el("button", "hb-btn ghost", "Mark all read"); mk.type = "button"; mk.addEventListener("click", function () { all.forEach(function (a) { S.read[a.id] = 1; }); save(); rerun(); }); P.appendChild(mk);
    var rs = el("button", "hb-btn ghost", "Reset read state"); rs.type = "button"; rs.addEventListener("click", function () { S.read = {}; save(); rerun(); }); P.appendChild(rs);
    var ul = el("ul", "warn-list al-list");
    shown.forEach(function (a) {
      var li = el("li", "warn " + a.level + (S.read[a.id] ? " al-read" : "")); var t = el("strong", null, a.title); li.appendChild(t); li.appendChild(el("span", "al-cat", CAT[a.cat])); li.appendChild(el("div", "muted", a.text));
      var b = el("button", "mk-chip", S.read[a.id] ? "Mark unread" : "Mark read"); b.type = "button"; b.addEventListener("click", function () { if (S.read[a.id]) delete S.read[a.id]; else S.read[a.id] = 1; save(); rerun(); }); li.appendChild(b); ul.appendChild(li);
    });
    if (!shown.length) ul.appendChild(el("li", "warn ok", "Nothing to flag. The build looks fine for the enabled alert types.")); P.appendChild(ul);
    P.appendChild(ui.note("Alerts update from the Calculator build whenever you open this tab. They are not pushed to your phone or email."));
  }
  function watch(box) {
    var rerun = function () { box.innerHTML = ""; watch(box); badge(); }, a = S.add;
    var P = ui.panel("Price watchlist", "targets checked against the weekly price feed"); box.appendChild(P);
    var items = Object.keys(BCP.pricesLive && BCP.pricesLive[a.kind] || {}).filter(function (id) { return BCP[KIND[a.kind]].items.some(function (x) { return x.id === id; }); }).map(function (id) { return [id, name(a.kind, id) + " (" + ui.usd(live(a.kind, id)) + ")"]; });
    if (!a.id || !items.some(function (i) { return i[0] === a.id; })) a.id = items.length ? items[0][0] : "";
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Part type", ui.select(Object.keys(KLAB).map(function (k) { return [k, KLAB[k]]; }), a.kind, function (v) { a.kind = v; a.id = ""; rerun(); })));
    f.appendChild(ui.field("Part", ui.select(items, a.id, function (v) { a.id = v; })));
    f.appendChild(ui.field("Alert at or under (USD)", ui.number(a.target || (a.id ? live(a.kind, a.id) : 0), 1, 20000, 5, function (v) { a.target = v; }), "Feed price shown in the list"));
    P.appendChild(f);
    var b = el("button", "hb-btn", "Add to watchlist"); b.type = "button"; b.addEventListener("click", function () { if (!a.id) return; var t = a.target || live(a.kind, a.id); S.watch = S.watch.filter(function (w) { return !(w.kind === a.kind && w.id === a.id); }); S.watch.push({ kind: a.kind, id: a.id, target: t }); a.target = ""; save(); rerun(); }); P.appendChild(b);
    var L = ui.panel("Watching", S.watch.length + (S.watch.length === 1 ? " part" : " parts")); box.appendChild(L);
    if (!S.watch.length) L.appendChild(el("p", "muted", "Nothing watched yet."));
    var t = el("table", "cmp-table lab-table"), hr = el("tr"); ["Part", "Target", "Feed price", "Status", ""].forEach(function (h) { hr.appendChild(el("th", null, h)); }); t.appendChild(hr);
    S.watch.forEach(function (w, i) { var c = live(w.kind, w.id), tr = el("tr"); [name(w.kind, w.id), ui.usd(w.target), c == null ? "no feed price" : ui.usd(c), c == null ? "-" : c <= w.target ? "Target reached" : ui.usd(c - w.target) + " above"].forEach(function (x, j) { tr.appendChild(el(j ? "td" : "th", null, x)); }); var td = el("td"), d = el("button", "mk-chip", "Remove"); d.type = "button"; d.addEventListener("click", function () { S.watch.splice(i, 1); save(); rerun(); }); td.appendChild(d); tr.appendChild(td); t.appendChild(tr); });
    if (S.watch.length) { var wr = el("div", "lab-scroll"); wr.appendChild(t); L.appendChild(wr); }
    var m = BCP.pricesLive && BCP.pricesLive.meta; L.appendChild(ui.note("Feed week " + (m ? m.week : "?") + ", floor prices (cheapest in stock), updated weekly. A reached target shows up in Notifications. There is no email or push alert."));
  }
  function prefs(box) {
    var rerun = function () { save(); badge(); box.innerHTML = ""; prefs(box); };
    var P = ui.panel("Notification preferences", "saved on this device"); box.appendChild(P);
    Object.keys(CAT).forEach(function (k) { var l = el("label", "al-pref"); var c = el("input"); c.type = "checkbox"; c.checked = !!S.pref[k]; c.addEventListener("change", function () { S.pref[k] = c.checked; save(); badge(); }); l.appendChild(c); l.appendChild(el("span", null, CAT[k] + " alerts")); P.appendChild(l); });
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Bottleneck alert threshold (%)", ui.number(S.pref.bnThreshold, 5, 80, 5, function (v) { S.pref.bnThreshold = v; save(); badge(); })));
    f.appendChild(ui.field("PSU load alert threshold (% of peak)", ui.number(S.pref.psuThreshold, 50, 100, 5, function (v) { S.pref.psuThreshold = v; save(); badge(); })));
    P.appendChild(f);
    var r = el("button", "hb-btn ghost", "Reset to defaults"); r.type = "button"; r.addEventListener("click", function () { S.pref = Object.assign({}, DEF); rerun(); }); P.appendChild(r);
    P.appendChild(ui.note("Email, push, restock and live-deal notifications are not available: they need a server and live retail data, which this static, zero-cost app does not have."));
  }
  var hub = BCP.addHub({ key: "alerts", label: "Alerts", before: "dash", title: "Stay informed.", intro: "Alerts for your build, a price watchlist against the weekly feed, and preferences. All computed on this device.",
    subs: [{ id: "center", label: "Notifications", render: center }, { id: "watch", label: "Price watchlist", render: watch }, { id: "prefs", label: "Preferences", render: prefs }] });
  tabBtn = document.querySelector('.tab-btn[data-view="alerts"]');
  setTimeout(badge, 300); setInterval(badge, 4000);
})();
