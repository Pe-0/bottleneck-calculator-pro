/* ============================================================
 * DATA HUB - data health, integrity checks, explorer + export, local
 * import, backup and restore of local data, change tracking, and system
 * diagnostics (error log, timings, availability, self-tests).
 * Everything runs in the browser. Nothing is uploaded.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, el = ui.el;

  /* ---- error log: capture from load, keep the last 30 ---- */
  var ERR_KEY = "data.errlog";
  function logErr(kind, msg) {
    var l = ui.get(ERR_KEY, []); l.unshift({ t: new Date().toISOString(), k: kind, m: String(msg).slice(0, 240) }); ui.set(ERR_KEY, l.slice(0, 30));
  }
  window.addEventListener("error", function (e) { logErr("error", e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")); });
  window.addEventListener("unhandledrejection", function (e) { logErr("promise", e.reason && e.reason.message || e.reason); });

  var LAYERS = [
    ["cpus", "CPUs", "items"], ["gpus", "GPUs", "items"], ["motherboards", "Motherboards", "items"], ["memoryKits", "Memory kits", "items"],
    ["psus", "Power supplies", "items"], ["coolers", "Coolers", "items"], ["cases", "Cases", "items"], ["storage", "Storage", "items"],
    ["monitors", "Monitors", "items"], ["games", "Games", "items"], ["software", "Software", "items"],
    ["benchmarks", "Benchmarks", "map"], ["prices", "Curated prices", "map"], ["pricesLive", "Weekly market feed", "map"], ["compat", "Compatibility rules", "rules"]
  ];
  function metaOf(k) { var d = BCP[k]; return d && d.meta || {}; }
  function itemsOf(k) { var d = BCP[k]; return d && d.items ? d.items : []; }
  function sizeOf(k, kind) {
    var d = BCP[k]; if (!d) return 0;
    if (kind === "items") return d.items.length;
    if (k === "benchmarks") return Object.keys(d.cpu || {}).length + Object.keys(d.gpu || {}).length;
    if (k === "prices") return Object.keys(d.cpu || {}).length + Object.keys(d.gpu || {}).length;
    if (k === "pricesLive") return ["cpu", "gpu", "mobo", "ram", "ssd", "psu", "pcase"].reduce(function (s, x) { return s + Object.keys(d[x] || {}).length; }, 0);
    return Object.keys(d).filter(function (x) { return x !== "meta"; }).length;
  }
  function ageMonths(asOf) {
    var m = String(asOf || "").match(/(20\d\d)-(\d\d|Q[1-4]|W\d+)?/); if (!m) return null;
    var y = +m[1], mo = 6; if (m[2] && /^\d\d$/.test(m[2])) mo = +m[2]; else if (m[2] && m[2][0] === "Q") mo = (+m[2][1]) * 3 - 1;
    var now = new Date(); return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  }
  function newestAsOf(s) { var all = String(s || "").match(/20\d\d-(\d\d|Q[1-4])(-\d\d)?/g) || []; return all.length ? all.sort().pop() : s; }

  /* ---- checks ---- */
  function runChecks() {
    var out = [];
    function add(layer, test, ok, detail) { out.push({ layer: layer, test: test, ok: ok, detail: detail || "" }); }
    LAYERS.forEach(function (L) {
      var k = L[0], d = BCP[k];
      if (!d) { add(L[1], "Layer loaded", false, "Not present"); return; }
      var m = metaOf(k);
      add(L[1], "Has as-of date, confidence and source", !!(m.asOf || m.week || m.generated) && !!(m.confidence) && !!(m.source || m.from || m.layer), "");
      if (L[2] === "items") {
        var ids = {}, dup = [], names = {}, dn = [], missing = [], bad = [];
        d.items.forEach(function (it) {
          if (ids[it.id]) dup.push(it.id); ids[it.id] = 1;
          var nk = String(it.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""); if (names[nk]) dn.push(it.name); names[nk] = 1;
          Object.keys(it).forEach(function (f) { var v = it[f]; if (v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v))) missing.push(it.id + "." + f); else if (typeof v === "number" && v < 0) bad.push(it.id + "." + f); });
        });
        add(L[1], "No duplicate ids", !dup.length, dup.slice(0, 5).join(", "));
        add(L[1], "No duplicate names (deduplication)", !dn.length, dn.slice(0, 5).join(", "));
        add(L[1], "No empty fields (missing data)", !missing.length, missing.length + " empty: " + missing.slice(0, 5).join(", "));
        add(L[1], "No negative numbers (validation)", !bad.length, bad.slice(0, 5).join(", "));
      }
    });
    var cpuIds = {}, gpuIds = {}; itemsOf("cpus").forEach(function (c) { cpuIds[c.id] = c; }); itemsOf("gpus").forEach(function (g) { gpuIds[g.id] = g; });
    var bc = BCP.benchmarks.cpu || {}, bg = BCP.benchmarks.gpu || {}, pc = BCP.prices.cpu || {}, pg = BCP.prices.gpu || {};
    function lack(items, map) { return items.filter(function (i) { return !map[i.id]; }).map(function (i) { return i.id; }); }
    function orphan(map, ids) { return Object.keys(map).filter(function (k) { return !ids[k]; }); }
    var a = lack(itemsOf("cpus"), bc), b = lack(itemsOf("gpus"), bg), c = orphan(bc, cpuIds), d2 = orphan(bg, gpuIds), e = orphan(pc, cpuIds), f = orphan(pg, gpuIds);
    add("Cross-layer", "Every CPU has a benchmark score", !a.length, a.length + " missing: " + a.slice(0, 5).join(", "));
    add("Cross-layer", "Every GPU has a benchmark score", !b.length, b.length + " missing: " + b.slice(0, 5).join(", "));
    add("Cross-layer", "No benchmark rows for unknown parts", !(c.length + d2.length), c.concat(d2).slice(0, 5).join(", "));
    add("Cross-layer", "No curated prices for unknown parts", !(e.length + f.length), e.concat(f).slice(0, 5).join(", "));
    var noPrice = itemsOf("gpus").filter(function (g) { return !pg[g.id] && !g.legacy && !g.mobile && !(BCP.pricesLive && BCP.pricesLive.gpu && BCP.pricesLive.gpu[g.id]); }).map(function (g) { return g.id; });
    add("Cross-layer", "Current desktop GPUs have a curated or market-feed price", !noPrice.length, noPrice.length + " without: " + noPrice.slice(0, 5).join(", "));
    var socks = BCP.compat.sockets || {}, badS = itemsOf("cpus").filter(function (x) { return !socks[x.socket]; }).map(function (x) { return x.id + ":" + x.socket; });
    add("Cross-layer", "Every CPU socket has a compatibility rule", !badS.length, badS.slice(0, 5).join(", "));
    var badM = itemsOf("motherboards").filter(function (x) { return !socks[x.socket]; }).map(function (x) { return x.id; });
    add("Cross-layer", "Every motherboard socket has a compatibility rule", !badM.length, badM.slice(0, 5).join(", "));
    var live = BCP.pricesLive, wk = live && live.meta && live.meta.to ? Math.floor((Date.now() - new Date(live.meta.to).getTime()) / 864e5) : null;
    add("Weekly market feed", "Feed is less than 21 days old", wk != null && wk <= 21, wk == null ? "no date" : wk + " days since the end of week " + (live.meta.week || ""));
    return out;
  }

  /* ---- panels ---- */
  function health(box) {
    var P = ui.panel("Data health", "freshness and completeness of every data layer"); box.appendChild(P);
    var t = el("table", "cmp-table lab-table"), h = el("tr"); ["Layer", "Records", "As of", "Age", "Confidence", "Status"].forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    var stale = 0;
    LAYERS.forEach(function (L) {
      var m = metaOf(L[0]), asOf = m.asOf || (m.week ? m.week + " (" + (m.to || "") + ")" : "?"), age = ageMonths(newestAsOf(m.asOf || m.to || ""));
      var st = age == null ? "unknown" : age <= 3 ? "fresh" : age <= 9 ? "aging" : "outdated"; if (st === "outdated") stale++;
      var tr = el("tr"); [L[1], ui.num(sizeOf(L[0], L[2])), String(asOf).slice(0, 60), age == null ? "-" : age + " mo", String(m.confidence || "-").slice(0, 70), st].forEach(function (x, i) { tr.appendChild(el(i ? "td" : "th", null, x)); }); t.appendChild(tr);
    });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
    P.appendChild(ui.note("Age is measured from the newest date in each layer's as-of field to today. Aging and outdated layers keep their own confidence label in the app; they are not hidden. " + stale + " layer(s) flagged outdated."));
    var P2 = ui.panel("Integrity and validation checks", "run live against the loaded data"); box.appendChild(P2);
    var res = runChecks(), pass = res.filter(function (r) { return r.ok; }).length;
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Checks passed", pass + " / " + res.length, pass === res.length ? "ok" : "")); st.appendChild(ui.stat("Layers", String(LAYERS.length))); st.appendChild(ui.stat("Total records", ui.num(LAYERS.reduce(function (s, L) { return s + sizeOf(L[0], L[2]); }, 0)))); P2.appendChild(st);
    var t2 = el("table", "cmp-table lab-table"), h2 = el("tr"); ["", "Layer", "Check", "Detail"].forEach(function (x) { h2.appendChild(el("th", null, x)); }); t2.appendChild(h2);
    res.sort(function (a, b) { return a.ok - b.ok; }).forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", null, r.ok ? "pass" : "FAIL")); tr.appendChild(el("td", null, r.layer)); tr.appendChild(el("td", null, r.test)); tr.appendChild(el("td", null, r.detail)); t2.appendChild(tr); });
    var w2 = el("div", "lab-scroll"); w2.appendChild(t2); P2.appendChild(w2);
    P2.appendChild(ui.note("Failures here are real findings about the data set, shown rather than hidden. They are the to-do list for the next data refresh."));
  }

  function csvOf(rows) {
    if (!rows.length) return ""; var cols = []; rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    function q(v) { if (v == null) return ""; if (typeof v === "object") v = JSON.stringify(v); v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return "\uFEFF" + [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(","); })).join("\r\n");
  }
  function parseCsv(text) {
    var rows = [], row = [], cur = "", q = false;
    text = text.replace(/^\uFEFF/, "");
    for (var i = 0; i < text.length; i++) { var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else cur += ch; }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    if (!rows.length) return [];
    var head = rows.shift().map(function (s) { return s.trim(); });
    return rows.map(function (r) { var o = {}; head.forEach(function (h, i) { var v = r[i] == null ? "" : r[i].trim(); o[h] = v !== "" && !isNaN(v) ? +v : v; }); return o; });
  }
  function tableOf(P, rows, cols, limit) {
    var t = el("table", "cmp-table lab-table"), h = el("tr"); cols.forEach(function (c) { h.appendChild(el("th", null, c)); }); t.appendChild(h);
    rows.slice(0, limit).forEach(function (r) { var tr = el("tr"); cols.forEach(function (c, i) { var v = r[c]; if (v && typeof v === "object") v = JSON.stringify(v); tr.appendChild(el(i ? "td" : "th", null, v == null ? "" : String(v).slice(0, 60))); }); t.appendChild(tr); });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
  }
  function btn(txt, fn, cls) { var b = el("button", cls || "hb-btn", txt); b.type = "button"; b.addEventListener("click", fn); return b; }

  function explore(box) {
    var P = ui.panel("Data explorer", "browse and export any dataset"); box.appendChild(P);
    var sets = LAYERS.filter(function (L) { return L[2] === "items"; }), cur = ui.get("data.ds", "cpus");
    var bar = el("div", "dh-row"), body = el("div"); P.appendChild(bar); P.appendChild(body);
    var sel = ui.select(sets.map(function (L) { return [L[0], L[1] + " (" + itemsOf(L[0]).length + ")"]; }), cur, function (v) { cur = v; ui.set("data.ds", v); draw(); });
    var q = el("input"); q.type = "search"; q.placeholder = "Filter rows"; q.addEventListener("input", draw);
    bar.appendChild(ui.field("Dataset", sel)); bar.appendChild(ui.field("Filter", q));
    function rows() { var s = q.value.toLowerCase(); return itemsOf(cur).filter(function (r) { return !s || JSON.stringify(r).toLowerCase().indexOf(s) >= 0; }); }
    function draw() {
      body.innerHTML = ""; var r = rows(); if (!r.length) { body.appendChild(ui.note("No rows match.")); return; }
      var cols = Object.keys(r[0]).slice(0, 9); tableOf(body, r, cols, 30);
      var m = metaOf(cur); body.appendChild(ui.note(r.length + " rows (first 30 shown). Layer as of " + (m.asOf || "?") + ", confidence: " + (m.confidence || "?") + "."));
      var act = el("div", "dh-row");
      act.appendChild(btn("Download JSON", function () { ui.download(cur + ".json", JSON.stringify({ meta: m, items: r }, null, 1), "application/json"); }));
      act.appendChild(btn("Download CSV", function () { ui.download(cur + ".csv", csvOf(r), "text/csv;charset=utf-8"); }));
      body.appendChild(act);
    }
    draw();
    var P2 = ui.panel("Bulk export", "the whole database in one file"); box.appendChild(P2);
    P2.appendChild(ui.note("Every layer stays separate in the file, each with its own as-of date, confidence and source. The weekly market feed is CC BY 4.0, Pricify (pricify.ai)."));
    P2.appendChild(btn("Download full database (JSON)", function () {
      var o = { app: "Bottleneck Calculator Pro", exported: new Date().toISOString(), layers: {} };
      LAYERS.forEach(function (L) { o.layers[L[0]] = BCP[L[0]]; });
      ui.download("bcp-database-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(o), "application/json");
    }));

    var P3 = ui.panel("Import a CSV or JSON list", "checked here, kept in this browser only"); box.appendChild(P3);
    P3.appendChild(ui.note("Use this to check your own parts list. Rows need a name column. The file is validated and stored locally. It is not merged into the engine and never leaves your device."));
    var fi = el("input"); fi.type = "file"; fi.accept = ".csv,.json,text/csv,application/json"; P3.appendChild(fi);
    var out = el("div"); P3.appendChild(out);
    function showImports() {
      var all = ui.get("data.imports", {}); out.innerHTML = ""; var ks = Object.keys(all);
      if (ks.length) out.appendChild(el("h3", null, "Stored imports"));
      ks.forEach(function (k) { var row = el("div", "dh-row"); row.appendChild(el("span", null, k + ": " + all[k].rows.length + " rows, saved " + all[k].t.slice(0, 10))); row.appendChild(btn("Remove", function () { delete all[k]; ui.set("data.imports", all); showImports(); })); out.appendChild(row); if (all[k].rows.length) tableOf(out, all[k].rows, Object.keys(all[k].rows[0]).slice(0, 8), 8); });
    }
    fi.addEventListener("change", function () {
      var f = fi.files[0]; if (!f) return; if (f.size > 1.5e6) { out.textContent = "File is over 1.5 MB. Use a smaller list."; return; }
      var rd = new FileReader(); rd.onload = function () {
        var rowsIn, err = []; try { rowsIn = /\.json$/i.test(f.name) ? JSON.parse(rd.result) : parseCsv(String(rd.result)); } catch (e) { out.textContent = "Could not read the file: " + e.message; return; }
        if (rowsIn && !Array.isArray(rowsIn) && Array.isArray(rowsIn.items)) rowsIn = rowsIn.items;
        if (!Array.isArray(rowsIn)) { out.textContent = "Expected a list of rows (JSON array or CSV with a header)."; return; }
        var ok = rowsIn.filter(function (r) { return r && typeof r === "object" && String(r.name || "").trim(); });
        if (ok.length < rowsIn.length) err.push((rowsIn.length - ok.length) + " row(s) skipped: no name");
        var seen = {}, dups = 0; ok = ok.filter(function (r) { var k = String(r.name).toLowerCase(); if (seen[k]) { dups++; return false; } seen[k] = 1; return true; }); if (dups) err.push(dups + " duplicate name(s) dropped");
        ok = ok.slice(0, 500).map(function (r) { var o = {}; Object.keys(r).slice(0, 20).forEach(function (k) { var v = r[k]; o[String(k).slice(0, 40)] = typeof v === "string" ? v.slice(0, 200) : v; }); return o; });
        var all = ui.get("data.imports", {}); all[f.name.slice(0, 60)] = { t: new Date().toISOString(), rows: ok }; ui.set("data.imports", all);
        showImports(); out.insertBefore(ui.note("Imported " + ok.length + " valid row(s) from " + f.name + ". " + (err.join("; ") || "No problems found.")), out.firstChild);
      }; rd.readAsText(f);
    });
    showImports();
  }


  function derived(box) {
    var P = ui.panel("Derived specs", "computed from catalog data and platform rules, not scraped"); box.appendChild(P);
    var kind = ui.get("data.dk", "cpu"), rer = function () { box.innerHTML = ""; derived(box); };
    P.appendChild(ui.field("Part type", ui.select([["cpu", "Processors"], ["gpu", "Graphics cards"], ["ram", "Memory kits"], ["psu", "Power supplies"]], kind, function (v) { ui.set("data.dk", v); rer(); })));
    var q = el("input"); q.type = "search"; q.placeholder = "Filter by name"; var out = el("div"); P.appendChild(ui.field("Filter", q)); P.appendChild(out);
    var cp = BCP.compat, sk = cp.sockets || {};
    function rowsFor() {
      if (kind === "cpu") return { head: ["Processor", "Socket", "Memory it supports", "Typical memory range", "Gaming per 100 W", "Cores / threads"], rows: itemsOf("cpus").filter(function (c) { return !c.mobile; }).map(function (c) { var mg = (cp.memGuidance || {})[c.socket] || {}, b = BCP.benchmarks.cpu[c.id]; return [c.name, c.socket, (sk[c.socket] ? sk[c.socket].ram.join(" / ") : "?"), mg.low ? mg.low + " to " + mg.high + " MT/s" : "-", b ? (b.gaming / c.tdpW * 100).toFixed(0) : "-", c.cores + " / " + c.threads]; }) };
      if (kind === "gpu") return { head: ["Graphics card", "VRAM", "Board power", "Recommended PSU", "Score per 100 W", "VRAM class"], rows: itemsOf("gpus").filter(function (g) { return !g.mobile; }).map(function (g) { var sc = BCP.benchmarks.gpu[g.id]; return [g.name, g.vramGB + " GB", g.tdpW + " W", BCP.engine.recommendedPsuW(120, g.tdpW) + " W (with a 120 W CPU)", sc ? (sc / g.tdpW * 100).toFixed(1) : "-", g.vramGB >= 16 ? "high (4K, AI)" : g.vramGB >= 12 ? "good (1440p)" : g.vramGB >= 8 ? "fine (1080p)" : "low"]; }) };
      if (kind === "ram") return { head: ["Memory kit", "Type", "Speed", "Channel mode", "Per stick", "BIOS profile"], rows: itemsOf("memoryKits").map(function (k) { var base = k.type === "DDR5" ? 4800 : k.type === "DDR4" ? 2666 : 1600; return [k.name, k.type, k.speedMTs + " MT/s", k.modules === 1 ? "Single channel" : k.modules === 2 ? "Dual channel" : k.modules === 4 ? "Quad-stick (dual channel on consumer boards)" : k.modules + " sticks", Math.round(k.capacityGB / k.modules) + " GB", k.speedMTs > base ? "XMP / EXPO needed above " + base : "Runs at base speed"]; }) };
      return { head: ["Power supply", "Wattage", "Efficiency", "ATX 3.1", "Heat lost at 50% load"], rows: itemsOf("psus").map(function (p) { var e = { white: 80, bronze: 85, silver: 88, gold: 90, platinum: 92, titanium: 94 }[String(p.efficiency).toLowerCase()]; return [p.name, p.wattageW + " W", p.efficiency, p.atx31 ? "yes" : "no", e ? Math.round(p.wattageW * 0.5 / (e / 100) - p.wattageW * 0.5) + " W" : "-"]; }) };
    }
    function draw() { out.innerHTML = ""; var d = rowsFor(), s = q.value.toLowerCase(), r = d.rows.filter(function (x) { return !s || x[0].toLowerCase().indexOf(s) >= 0; }); tableOf2(out, d.head, r.slice(0, 40)); out.appendChild(ui.note(r.length + " rows" + (r.length > 40 ? " (first 40 shown, use the filter)" : "") + ". These values are calculated from stored specs and published platform rules, so they carry the same dates and confidence as their source layers. Fields the catalog does not hold (memory bus, voltages, NAND type, fan data) are not shown or guessed.")); }
    q.addEventListener("input", draw); draw();
  }
  function tableOf2(P, head, rows) { var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h); rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w); }

  function backup(box) {
    var P = ui.panel("Backup and restore", "your saved builds, settings and alerts"); box.appendChild(P);
    function mine() { var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("bcp") === 0 && k !== "bcp." + ERR_KEY) o[k] = localStorage.getItem(k); } return o; }
    var n = Object.keys(mine()).length, last = ui.get("data.lastBackup", null);
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Items stored here", String(n))); st.appendChild(ui.stat("Last backup", last ? last.slice(0, 10) : "never")); P.appendChild(st);
    P.appendChild(ui.note("Builds, settings and watchlists live only in this browser. Clearing site data or switching devices loses them, so keep a backup file. The file is plain JSON you can read."));
    var bar = el("div", "dh-row"); P.appendChild(bar);
    bar.appendChild(btn("Download backup", function () { ui.download("bcp-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ app: "bcp-backup", version: 1, created: new Date().toISOString(), keys: mine() }, null, 1), "application/json"); ui.set("data.lastBackup", new Date().toISOString()); }));
    var out = el("div"); 
    var fi = el("input"); fi.type = "file"; fi.accept = ".json,application/json"; P.appendChild(ui.field("Restore from a backup file", fi, "Replaces matching keys. Other data is left alone.")); P.appendChild(out);
    fi.addEventListener("change", function () {
      var f = fi.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () {
        var j; try { j = JSON.parse(rd.result); } catch (e) { out.textContent = "That file is not valid JSON."; return; }
        if (!j || j.app !== "bcp-backup" || !j.keys || typeof j.keys !== "object") { out.textContent = "That is not a Bottleneck Calculator backup file."; return; }
        var ks = Object.keys(j.keys).filter(function (k) { return k.indexOf("bcp") === 0 && typeof j.keys[k] === "string" && j.keys[k].length < 2e6; });
        if (!ks.length) { out.textContent = "The backup has no data."; return; }
        if (!window.confirm("Restore " + ks.length + " item(s) from this backup? Matching saved data will be replaced.")) return;
        ks.forEach(function (k) { try { localStorage.setItem(k, j.keys[k]); } catch (e) {} });
        out.textContent = "Restored " + ks.length + " item(s). Reloading..."; setTimeout(function () { location.reload(); }, 700);
      }; rd.readAsText(f);
    });
    var P2 = ui.panel("Change tracking", "what changed in the data since this browser last saw it"); box.appendChild(P2);
    var log = ui.get("data.changes", []);
    if (!log.length) P2.appendChild(ui.note("No changes recorded yet. When a data update changes a layer, it shows up here."));
    else { var ul = el("ul", "hb-list"); log.slice(0, 25).forEach(function (c) { ul.appendChild(el("li", null, c.t.slice(0, 10) + ": " + c.m)); }); P2.appendChild(ul); P2.appendChild(btn("Clear history", function () { ui.set("data.changes", []); box.innerHTML = ""; backup(box); })); }
    P2.appendChild(ui.note("History is stored on this device only. It starts from your first visit with this feature."));
  }
  function fingerprint(k, kind) { var m = metaOf(k); return { n: sizeOf(k, kind), a: String(m.asOf || m.week || ""), c: String(m.confidence || "").length }; }
  function track() {
    var snap = ui.get("data.snap", null), now = {}, log = ui.get("data.changes", []);
    LAYERS.forEach(function (L) { if (BCP[L[0]]) now[L[0]] = fingerprint(L[0], L[2]); });
    if (snap) LAYERS.forEach(function (L) { var a = snap[L[0]], b = now[L[0]]; if (!a || !b) return;
      if (a.n !== b.n) log.unshift({ t: new Date().toISOString(), m: L[1] + ": " + a.n + " -> " + b.n + " records" });
      if (a.a !== b.a) log.unshift({ t: new Date().toISOString(), m: L[1] + ": as-of " + a.a.slice(0, 30) + " -> " + b.a.slice(0, 30) }); });
    ui.set("data.snap", now); ui.set("data.changes", log.slice(0, 60));
  }

  function selfTests() {
    var T = [], E = BCP.engine;
    function t(n, f) { var ok = false, d = ""; try { var r = f(); ok = r === true || (r && r.ok); d = r && r.d || ""; } catch (e) { d = e.message; } T.push([n, ok, d]); }
    var b = BCP.benchmarks;
    t("RTX 4090 anchors the GPU scale at 100", function () { return b.gpu["rtx-4090"] === 100 || (b.gpu["rtx-4090"] && b.gpu["rtx-4090"].raster === 100) || { ok: false, d: JSON.stringify(b.gpu["rtx-4090"]).slice(0, 60) }; });
    t("7800X3D anchors CPU gaming at 100", function () { var c = b.cpu["r7-7800x3d"]; return !!c && c.gaming === 100; });
    t("9950X anchors CPU multi-core at 100", function () { var c = b.cpu["r9-9950x"]; return !!c && c.productivity === 100; });
    t("Bottleneck percent stays between 0 and 100", function () { var bad = 0; itemsOf("cpus").slice(0, 30).forEach(function (c) { itemsOf("gpus").slice(0, 30).forEach(function (g) { var r = E.bottleneck(b.cpu[c.id], b.gpu[g.id], "p1440", "gaming", c); if (!(r.pct >= 0 && r.pct <= 100)) bad++; }); }); return { ok: !bad, d: bad + " out of range" }; });
    t("A faster GPU never lowers FPS", function () { var g = BCP.games.items[0], c = b.cpu["r7-7800x3d"].gaming, a = E.gameFps(g, c, 40, "p1440", "gaming", 12), z = E.gameFps(g, c, 80, "p1440", "gaming", 12); return { ok: z >= a, d: a + " vs " + z }; });
    t("A faster CPU never lowers FPS", function () { var g = BCP.games.items[0], a = E.gameFps(g, 50, 80, "p1080", "gaming", 12), z = E.gameFps(g, 100, 80, "p1080", "gaming", 12); return { ok: z >= a, d: a + " vs " + z }; });
    t("Higher resolution never raises FPS", function () { var g = BCP.games.items[0], c = 100, a = E.gameFps(g, c, 80, "p1080", "gaming", 16), z = E.gameFps(g, c, 80, "p2160", "gaming", 16); return { ok: z <= a, d: a + " vs " + z }; });
    t("Recommended PSU grows with GPU power", function () { return E.recommendedPsuW(105, 450) > E.recommendedPsuW(105, 150); });
    t("Every game has a positive base FPS", function () { return BCP.games.items.every(function (g) { var v = g.baseFps; return typeof v === "object" ? Object.keys(v).every(function (k) { return v[k] > 0; }) : v > 0; }); });
    t("Every curated price is a positive number", function () { return Object.keys(BCP.prices.gpu).concat(Object.keys(BCP.prices.cpu)).every(function (k) { var v = BCP.prices.gpu[k] != null ? BCP.prices.gpu[k] : BCP.prices.cpu[k]; return v > 0; }); });
    t("Share links round-trip the selection", function () { return typeof BCP.buildLink !== "function" || !!BCP.buildLink(); });
    t("Cheap GPU in a 1080p CPU-bound case reads as CPU-limited or balanced", function () { var r = E.bottleneck(b.cpu["r7-7800x3d"], b.gpu["rtx-4090"], "p1080", "gaming", itemsOf("cpus").filter(function (c) { return c.id === "r7-7800x3d"; })[0]); return !!r.limiter; });
    return T;
  }

  function system(box) {
    var P = ui.panel("System status", "this browser, right now"); box.appendChild(P);
    var st = el("div", "pw-stats"); P.appendChild(st);
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    st.appendChild(ui.stat("Online", navigator.onLine ? "yes" : "no"));
    if (nav) { st.appendChild(ui.stat("Page ready", Math.round(nav.domContentLoadedEventEnd) + " ms")); st.appendChild(ui.stat("Fully loaded", nav.loadEventEnd ? Math.round(nav.loadEventEnd) + " ms" : "-")); }
    st.appendChild(ui.stat("Scripts and files", String((performance.getEntriesByType("resource") || []).length)));
    if (performance.memory) st.appendChild(ui.stat("JS memory", Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB"));
    var sw = ui.stat("Offline cache", "checking"); st.appendChild(sw);
    if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(function (r) { sw.lastChild.textContent = r && r.active ? "active" : "not active"; }); else sw.lastChild.textContent = "unsupported";
    var sg = ui.stat("Local storage", "-"); st.appendChild(sg);
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { sg.lastChild.textContent = (e.usage / 1048576).toFixed(1) + " MB used"; });
    var av = el("div", "dh-row"); P.appendChild(av); var avo = el("p", "muted"); P.appendChild(avo);
    av.appendChild(btn("Check site availability", function () { avo.textContent = "Checking..."; var t0 = performance.now(); fetch("./?hc=" + Date.now(), { cache: "no-store", method: "GET" }).then(function (r) { avo.textContent = "Site responded " + r.status + " in " + Math.round(performance.now() - t0) + " ms. Checked from this device only; it cannot see outages for other users."; }).catch(function (e) { avo.textContent = "Request failed: " + e.message; logErr("availability", e.message); }); }));
    var P2 = ui.panel("Self-tests", "the engine checks itself against known facts"); box.appendChild(P2);
    var res = selfTests(), ok = res.filter(function (r) { return r[1]; }).length;
    var s2 = el("div", "pw-stats"); s2.appendChild(ui.stat("Tests passed", ok + " / " + res.length)); P2.appendChild(s2);
    var t = el("table", "cmp-table lab-table"), h = el("tr"); ["", "Test", "Detail"].forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    res.forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", null, r[1] ? "pass" : "FAIL")); tr.appendChild(el("td", null, r[0])); tr.appendChild(el("td", null, r[2])); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P2.appendChild(w);
    P2.appendChild(ui.note("These run in your browser each time you open this page. They check the rules (anchors, monotonic behavior, ranges), not whether the benchmark numbers match reality."));
    var P3 = ui.panel("Error log", "problems this browser caught"); box.appendChild(P3);
    var log = ui.get(ERR_KEY, []);
    if (!log.length) P3.appendChild(ui.note("No errors recorded on this device."));
    else { var ul = el("ul", "hb-list"); log.forEach(function (e) { ul.appendChild(el("li", null, e.t.slice(0, 19).replace("T", " ") + " [" + e.k + "] " + e.m)); }); P3.appendChild(ul); P3.appendChild(btn("Clear log", function () { ui.set(ERR_KEY, []); box.innerHTML = ""; system(box); })); }
    P3.appendChild(ui.note("Kept locally (last 30). Nothing is sent to any server."));
    var P4 = ui.panel("Security and reliability scope", "what applies to a static site"); box.appendChild(P4);
    var rows = [["Input handling", "Text from users and files is inserted as plain text, never as HTML. Imported files are size-limited and field-limited."], ["Secrets", "No private API key is in the site. Only the public Supabase key is present."], ["HTTPS", location.protocol === "https:" ? "This page is on HTTPS." : "This page is not on HTTPS."], ["Server-side items", "Rate limiting, CSRF, password hashing, payment security, fraud detection and database transactions need a server. They do not apply to this static site and are not claimed."], ["Backups", "Local data: use the Backup tab. The data files are in the public GitHub repository history."]];
    var t4 = el("table", "cmp-table lab-table"); rows.forEach(function (r) { var tr = el("tr"); tr.appendChild(el("th", null, r[0])); tr.appendChild(el("td", null, r[1])); t4.appendChild(tr); }); var w4 = el("div", "lab-scroll"); w4.appendChild(t4); P4.appendChild(w4);
  }

  document.addEventListener("DOMContentLoaded", function () {
    try { track(); } catch (e) { logErr("track", e.message); }
    BCP.addHub({ key: "data", label: "Data", before: "dash", title: "Trust the numbers.", intro: "See how fresh and complete every data layer is, export the database, back up your saved builds, and check the engine against itself.",
      subs: [{ id: "health", label: "Data health", render: health }, { id: "explore", label: "Explorer and import", render: explore }, { id: "derived", label: "Derived specs", render: derived }, { id: "backup", label: "Backup and history", render: backup }, { id: "system", label: "System and tests", render: system }] });
  });
})();
