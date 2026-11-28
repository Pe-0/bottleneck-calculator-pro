/* ============================================================
 * TOOLS HUB - display link checker, adaptive sync guide, multi-monitor
 * planner, part identifier (paste specs), QR image scan, resale value
 * rule of thumb, generation comparison and release timeline.
 * Standards figures are published link rates; resale is a heuristic.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  function table(P, head, rows) { var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h); rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w); }
  function btn(txt, fn, cls) { var b = el("button", cls || "hb-btn", txt); b.type = "button"; b.addEventListener("click", fn); return b; }
  var S = ui.get("tl.s", { mon: "m27-1440-165", w: 2560, h: 1440, hz: 165, bits: 8, m1: "m27-1440-165", m2: "m27-1440-165", m3: "" });
  function save() { ui.set("tl.s", S); }
  function mons() { return BCP.monitors.items; }

  /* effective payload rates in Gbit/s after line coding (published) */
  var LINKS = [["HDMI 2.0", 14.4], ["HDMI 2.1 (48G FRL)", 42.67], ["DisplayPort 1.4 (HBR3)", 25.92], ["DisplayPort 2.1 (UHBR13.5)", 52.22], ["DisplayPort 2.1 (UHBR20)", 77.37]];
  function need(w, h, hz, bits) { return w * h * hz * bits * 3 * 1.06 / 1e9; } // ~6% reduced-blanking overhead

  function display(box) {
    var rer = function () { save(); box.innerHTML = ""; display(box); }, P = ui.panel("Cable and port checker", "will this screen run at full speed on this connection"); box.appendChild(P);
    var f = el("div", "dh-row"); P.appendChild(f);
    f.appendChild(ui.field("Catalog monitor", ui.select([["", "Custom"]].concat(mons().map(function (m) { return [m.id, m.name]; })), S.mon, function (v) { S.mon = v; var m = mons().filter(function (x) { return x.id === v; })[0]; if (m) { var p = m.res.split(" x "); S.w = +p[0]; S.h = +p[1]; S.hz = m.refreshHz; } rer(); })));
    [["Width", "w", 640, 7680], ["Height", "h", 480, 4320], ["Refresh (Hz)", "hz", 24, 540]].forEach(function (x) { f.appendChild(ui.field(x[0], ui.number(S[x[1]], x[2], x[3], 1, function (v) { S[x[1]] = v; S.mon = ""; save(); }))); });
    f.appendChild(ui.field("Color depth", ui.select([["8", "8-bit"], ["10", "10-bit (HDR)"]], String(S.bits), function (v) { S.bits = +v; rer(); })));
    f.appendChild(btn("Check", rer));
    var n = need(S.w, S.h, S.hz, S.bits), st = el("div", "pw-stats"); st.appendChild(ui.stat("Mode", S.w + "x" + S.h + " @ " + S.hz + " Hz")); st.appendChild(ui.stat("Data needed", n.toFixed(1) + " Gbit/s")); P.appendChild(st);
    table(P, ["Connection", "Capacity", "Without compression", "With DSC (about 3:1)"], LINKS.map(function (l) { return [l[0], l[1] + " Gbit/s", n <= l[1] ? "Fits" : "Does not fit", n / 3 <= l[1] ? "Fits (needs a DSC-capable GPU and screen)" : "Does not fit"]; }));
    P.appendChild(ui.note("Needed rate = pixels x refresh x bits x 3 colors x about 6% blanking overhead. Capacities are the published payload rates after line coding. Real limits also depend on the GPU's ports, the cable's certification and monitor firmware. Run HDMI 2.1 and DP 2.1 modes only with certified cables."));
    var G = ui.panel("Adaptive sync (FreeSync / G-SYNC)", "which GPU brands support it"); box.appendChild(G);
    table(G, ["GPU brand", "Adaptive sync support", "Connection"], [["AMD Radeon", "FreeSync and FreeSync Premium over DisplayPort, and over HDMI on supported screens", "DisplayPort preferred"], ["NVIDIA GeForce", "G-SYNC Compatible works with most FreeSync screens over DisplayPort. Native G-SYNC modules need NVIDIA GPUs", "DisplayPort preferred, HDMI VRR on HDMI 2.1 screens"], ["Intel Arc", "Adaptive-Sync (VESA) support over DisplayPort", "DisplayPort"]]);
    G.appendChild(ui.note("Whether one specific monitor model is certified is not stored in this catalog, so check the monitor's spec sheet. Turn the feature on in both the monitor menu and the GPU driver."));
  }

  function multi(box) {
    var rer = function () { save(); box.innerHTML = ""; multi(box); }, sel = BCP.getSelection(), P = ui.panel("Multi-monitor planner", "up to three screens on your GPU"); box.appendChild(P);
    var f = el("div", "dh-row"); P.appendChild(f); var opts = [["", "None"]].concat(mons().map(function (m) { return [m.id, m.name]; }));
    f.appendChild(ui.field("Screen 1", ui.select(opts.slice(1), S.m1, function (v) { S.m1 = v; rer(); }))); f.appendChild(ui.field("Screen 2", ui.select(opts, S.m2, function (v) { S.m2 = v; rer(); }))); f.appendChild(ui.field("Screen 3", ui.select(opts, S.m3, function (v) { S.m3 = v; rer(); })));
    var ms = [S.m1, S.m2, S.m3].filter(Boolean).map(function (id) { return mons().filter(function (m) { return m.id === id; })[0]; }).filter(Boolean);
    var px = ms.map(function (m) { var p = m.res.split(" x "); return p[0] * p[1]; }), total = px.reduce(function (a, b) { return a + b; }, 0);
    var idle = Math.round(sel.gpu.vramGB ? Math.min(100, ms.reduce(function (s, m, i) { return s + px[i] / 8294400 * 0.45; }, 0) / sel.gpu.vramGB * 100) : 0);
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Screens", String(ms.length))); st.appendChild(ui.stat("Total pixels", (total / 1e6).toFixed(1) + " MP")); st.appendChild(ui.stat("Display outputs needed", String(ms.length))); st.appendChild(ui.stat("VRAM for the desktop", "about " + ms.reduce(function (s, m, i) { return s + px[i] / 8294400 * 0.45; }, 0).toFixed(1) + " GB")); P.appendChild(st);
    var rows = ms.map(function (m, i) { return ["Screen " + (i + 1) + ": " + m.name, m.res, m.refreshHz + " Hz", ui.usd(m.priceUSD), need.apply(null, m.res.split(" x ").map(Number).concat([m.refreshHz, 8])).toFixed(1) + " Gbit/s"]; });
    if (rows.length) table(P, ["Screen", "Resolution", "Refresh", "Price", "Link needed (8-bit)"], rows);
    var g = BCP.games.items[0], gm = ms[0], fps = gm ? eng.gameFps(g, BCP.benchmarks.cpu[sel.cpu.id].gaming, BCP.benchmarks.gpu[sel.gpu.id], gm.fpsRes, "gaming", sel.gpu.vramGB) : null;
    P.appendChild(ui.note((gm ? "Gaming on screen 1 (" + gm.fpsRes.replace("p", "") + "): " + g.name + " about " + fps + " fps on your " + sel.gpu.name + ". " : "") + "Other screens add desktop VRAM use and a little GPU load for video or browsers, not a large FPS cost. Spanning a game across all screens is a very different load: it multiplies pixels (" + (total / 1e6).toFixed(1) + " MP here versus " + (ms[0] ? (px[0] / 1e6).toFixed(1) : "0") + " MP for one). Mixed refresh rates can cause stutter on some drivers."));
    P.appendChild(ui.note("The catalog does not store how many display ports each GPU model has. Most cards have 3 to 4 outputs, so check yours. Total screen cost: " + ui.usd(ms.reduce(function (s, m) { return s + m.priceUSD; }, 0)) + " (indicative prices)."));
  }

  function norm(s) { return String(s).toLowerCase().replace(/geforce|nvidia|amd|intel|radeon|\(r\)|\(tm\)|cpu|processor|graphics|@.*$|[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function best(txt, items) {
    var T = " " + norm(txt) + " ", res = [];
    items.forEach(function (it) { var n = norm(it.name), toks = n.split(" ").filter(Boolean); if (!toks.length) return; var hit = toks.filter(function (t) { return T.indexOf(" " + t + " ") >= 0; }).length; if (hit === toks.length) res.push([it, toks.length * 10 + n.length / 100]); });
    return res.sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
  }
  function identify(box) {
    var P = ui.panel("Identify your parts", "paste what your PC reports"); box.appendChild(P);
    P.appendChild(ui.note("Paste lines from Task Manager, System Information, dxdiag or a spec sheet, for example: Processor AMD Ryzen 5 5600X and NVIDIA GeForce RTX 3070. Matching runs here in your browser; nothing is sent anywhere."));
    var ta = el("textarea"); ta.rows = 6; ta.className = "sm-q"; ta.style.width = "100%"; ta.value = ui.get("tl.paste", ""); ta.placeholder = "Processor: AMD Ryzen 5 5600X 6-Core Processor\nGraphics: NVIDIA GeForce RTX 3070"; P.appendChild(ta);
    var out = el("div"); P.appendChild(out);
    P.insertBefore(btn("Identify", function () {
      ui.set("tl.paste", ta.value); out.innerHTML = ""; var c = best(ta.value, BCP.cpus.items), g = best(ta.value, BCP.gpus.items);
      if (!c.length && !g.length) { out.appendChild(ui.note("No CPU or GPU from the catalog was recognized. Try the exact model name, such as Ryzen 5 5600X or RTX 3070.")); return; }
      var rows = []; c.forEach(function (m) { rows.push(["CPU", m[0].name]); }); g.forEach(function (m) { rows.push(["GPU", m[0].name]); }); table(out, ["Type", "Best matches (closest first)"], rows);
      if (c.length || g.length) out.appendChild(btn("Load best match in Calculator", function () { var cur = BCP.getSelection(), code = [c[0] ? c[0][0].id : cur.cpu.id, g[0] ? g[0][0].id : cur.gpu.id, cur.mobo ? cur.mobo.id : "unknown", cur.ram ? cur.ram.id : "unknown", cur.psu.id, cur.cooler.id, cur.case_ ? cur.case_.id : "", cur.storage.id, cur.res, cur.workload].join(","); if (BCP.applyBuildCode(code)) document.querySelector('.tab-btn[data-view="calc"]').click(); }, "hb-btn ghost"));
      out.appendChild(ui.note("Only CPUs and GPUs are matched, against the catalog. A part missing from the catalog will not appear. Check the match before relying on it."));
    }), out);
    var Q = ui.panel("Scan a build QR code", "from an image of a code made by this app"); box.appendChild(Q);
    var fi = el("input"); fi.type = "file"; fi.accept = "image/*"; Q.appendChild(fi); var qo = el("p", "muted"); Q.appendChild(qo);
    if (!("BarcodeDetector" in window)) qo.textContent = "Your browser cannot read QR codes from images. Paste the link on the My space tab (Import and copy) instead.";
    fi.addEventListener("change", function () {
      var f = fi.files[0]; if (!f) return; if (!("BarcodeDetector" in window)) return; var img = new Image(); img.onload = function () {
        new window.BarcodeDetector({ formats: ["qr_code"] }).detect(img).then(function (r) { if (!r.length) { qo.textContent = "No QR code found in that image."; return; } var v = r[0].rawValue, m = v.match(/#b=([^&\s]+)/); if (!m) { qo.textContent = "That QR code is not a build link."; return; } if (BCP.applyBuildCode(decodeURIComponent(m[1]))) { qo.textContent = "Build loaded."; document.querySelector('.tab-btn[data-view="calc"]').click(); } else qo.textContent = "That build link could not be applied."; }, function () { qo.textContent = "Could not read the image."; });
      }; img.src = URL.createObjectURL(f);
    });
  }

  var RET = [[0, 1], [1, 0.8], [2, 0.65], [3, 0.52], [4, 0.42], [5, 0.34], [6, 0.27], [8, 0.2]];
  function retention(age) { for (var i = RET.length - 1; i >= 0; i--) if (age >= RET[i][0]) { var a = RET[i], b = RET[i + 1]; return b ? a[1] + (b[1] - a[1]) * (age - a[0]) / (b[0] - a[0]) : a[1]; } return 1; }
  function resale(box) {
    var rer = function () { save(); box.innerHTML = ""; resale(box); }, P = ui.panel("Resale value estimator", "a rule of thumb for used parts, not market data"); box.appendChild(P);
    var sel = BCP.getSelection(), kind = S.rk || "gpu", cond = S.rc || 0.9, items = kind === "gpu" ? BCP.gpus.items : BCP.cpus.items, id = S.rid && items.some(function (x) { return x.id === S.rid; }) ? S.rid : (kind === "gpu" ? sel.gpu.id : sel.cpu.id);
    var f = el("div", "dh-row"); P.appendChild(f);
    f.appendChild(ui.field("Type", ui.select([["gpu", "Graphics card"], ["cpu", "Processor"]], kind, function (v) { S.rk = v; S.rid = ""; rer(); })));
    f.appendChild(ui.field("Part", ui.select(items.map(function (x) { return [x.id, x.name]; }), id, function (v) { S.rid = v; rer(); })));
    f.appendChild(ui.field("Condition", ui.select([["1", "Like new"], ["0.9", "Good"], ["0.75", "Worn"]], String(cond), function (v) { S.rc = +v; rer(); })));
    var it = items.filter(function (x) { return x.id === id; })[0], price = kind === "gpu" ? BCP.prices.gpu[id] : BCP.prices.cpu[id], age = Math.max(0, new Date().getFullYear() - it.launchYear);
    if (!price) { P.appendChild(ui.note("No curated price for this part, so no estimate.")); return; }
    var v = price * retention(age) * cond, st = el("div", "pw-stats"); st.appendChild(ui.stat("Curated new price", ui.usd(price))); st.appendChild(ui.stat("Age", age + " yr")); st.appendChild(ui.stat("Estimated used value", ui.usd(Math.round(v / 5) * 5) + " (range " + ui.usd(Math.round(v * 0.85 / 5) * 5) + " to " + ui.usd(Math.round(v * 1.15 / 5) * 5) + ")")); P.appendChild(st);
    P.appendChild(ui.note("Formula: curated price x age retention (80% after 1 year, about 52% after 3, 34% after 5) x condition. Retention figures are a general rule of thumb, not scraped used-market prices, and the curated price can be old for legacy parts. Crypto and shortage cycles break this rule. Check recent sold listings before selling."));
    P.appendChild(ui.note("Legacy parts carry low confidence in the catalog. Treat the range as very rough."));
  }

  function generations(box) {
    var P = ui.panel("Generation comparison", "average by architecture"); box.appendChild(P);
    function group(items, scoreOf, priceOf) { var g = {}; items.forEach(function (x) { if (x.mobile) return; var s = scoreOf(x); if (!s) return; var a = g[x.arch] = g[x.arch] || { n: 0, s: 0, p: 0, pn: 0, y: x.launchYear, w: 0 }; a.n++; a.s += s; a.y = Math.min(a.y, x.launchYear); if (x.tdpW) a.w += s / x.tdpW; var pr = priceOf(x); if (pr) { a.p += pr; a.pn++; } }); return Object.keys(g).map(function (k) { var a = g[k]; return [k, a.y, a.n, Math.round(a.s / a.n), a.pn ? ui.usd(Math.round(a.p / a.pn)) : "-", (a.w / a.n * 100).toFixed(1)]; }).sort(function (a, b) { return a[1] - b[1] || b[3] - a[3]; }); }
    P.appendChild(el("h3", "an-sub", "Graphics cards")); table(P, ["Architecture", "First year", "Models", "Avg score (4090 = 100)", "Avg curated price", "Score per 100 W"], group(BCP.gpus.items, function (x) { return BCP.benchmarks.gpu[x.id]; }, function (x) { return BCP.prices.gpu[x.id]; }));
    P.appendChild(el("h3", "an-sub", "Processors (gaming score)")); table(P, ["Architecture", "First year", "Models", "Avg gaming score (7800X3D = 100)", "Avg curated price", "Score per 100 W"], group(BCP.cpus.items, function (x) { var b = BCP.benchmarks.cpu[x.id]; return b && b.gaming; }, function (x) { return BCP.prices.cpu[x.id]; }));
    P.appendChild(ui.note("Averages mix tiers within a generation, so a generation with many low-end models averages lower. Use it to see the trend, not to rank one card."));
    var T = ui.panel("Release timeline", "by launch year, current desktop parts"); box.appendChild(T);
    var yrs = {}; BCP.gpus.items.concat(BCP.cpus.items).forEach(function (x) { if (x.mobile || x.legacy || x.launchYear < 2024) return; (yrs[x.launchYear] = yrs[x.launchYear] || []).push(x.name); });
    Object.keys(yrs).sort().reverse().forEach(function (y) { T.appendChild(el("h3", "an-sub", y + " (" + yrs[y].length + " parts)")); T.appendChild(el("p", "muted", yrs[y].join(", "))); });
    T.appendChild(ui.note("Only launch years are stored, not exact dates, and there is no data on unreleased products. This app does not carry a release calendar or rumors."));
  }

  document.addEventListener("DOMContentLoaded", function () {
    BCP.addHub({ key: "tools", label: "Tools", before: "dash", title: "Handy tools.", intro: "Check cables and ports, plan several monitors, identify your parts from pasted specs, scan a build QR code, estimate resale value and compare hardware generations.",
      subs: [{ id: "display", label: "Cables and sync", render: display }, { id: "multi", label: "Multi-monitor", render: multi }, { id: "id", label: "Identify and scan", render: identify }, { id: "resale", label: "Resale value", render: resale }, { id: "gen", label: "Generations", render: generations }] });
  });
})();
