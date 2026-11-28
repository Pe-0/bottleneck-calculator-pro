/* ============================================================
 * REPORTS HUB - build reports (many types + custom templates), downloads
 * (HTML/print, Markdown, CSV, Excel XML), QR code, build image, social card
 * and an FPS chart image. Everything is generated in the browser from the
 * current Calculator selection; nothing is uploaded.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var S = { type: ui.get("rep.type", "build"), custom: ui.get("rep.custom", ["parts", "bottleneck", "fps"]), tpl: ui.get("rep.tpl", {}) };
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gsc(g) { return BCP.benchmarks.gpu[g.id]; }
  function price(kind, it) { if (!it) return 0; if (kind === "cpu") return BCP.prices.cpu[it.id] || 0; if (kind === "gpu") return BCP.prices.gpu[it.id] || 0; return it.priceUSD || 0; }
  var LIVE = { cpu: "cpu", gpu: "gpu", mobo: "mobo", ram: "ram", storage: "ssd", psu: "psu" };
  function partList(sel) { return [["CPU", "cpu", sel.cpu], ["GPU", "gpu", sel.gpu], ["Motherboard", "mobo", sel.mobo], ["Memory", "ram", sel.ram], ["Storage", "storage", sel.storage], ["PSU", "psu", sel.psu], ["Cooler", "cooler", sel.cooler], ["Case", "case", sel.case_]]; }
  function fpsRows(sel) { return BCP.games.items.map(function (g) { return [g.name, eng.gameFps(g, cb(sel.cpu).gaming, gsc(sel.gpu), sel.res, sel.workload, sel.gpu.vramGB)]; }).sort(function (a, b) { return b[1] - a[1]; }); }
  function usd(n) { return n ? ui.usd(n) : "-"; }

  var SECTIONS = {
    parts: { label: "Parts list", fn: function (sel) { var tot = 0, rows = partList(sel).filter(function (p) { return p[2]; }).map(function (p) { var pr = price(p[1], p[2]); tot += pr; return [p[0], p[2].name, usd(pr)]; }); rows.push(["Total (curated prices)", "", usd(tot)]); return { head: ["Part", "Name", "Price"], rows: rows }; } },
    bottleneck: { label: "Bottleneck analysis", fn: function (sel) { return { head: ["Resolution", "Limiter", "Bottleneck", "CPU score", "GPU score"], rows: ["p1080", "p1440", "p2160"].map(function (r) { var b = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), r, sel.workload, sel.cpu); return [RES[r] + (r === sel.res ? " (selected)" : ""), b.limiter, b.pct + "%", b.cpuScore, b.gpuScore]; }) }; } },
    compat: { label: "Compatibility", fn: function (sel) { var bn = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), sel.res, sel.workload, sel.cpu); var w = eng.partCompatibility(sel.cpu, sel.gpu, sel.mobo, sel.ram, sel.psu, sel.workload, bn, sel.cooler, sel.case_, sel.res); return { head: ["Level", "Finding"], rows: w.length ? w.map(function (x) { return [x.level, x.text]; }) : [["ok", "No compatibility issues found."]] }; } },
    fps: { label: "Performance (FPS)", fn: function (sel) { return { head: ["Game @ " + RES[sel.res], "Estimated FPS"], rows: fpsRows(sel).map(function (r) { return [r[0], r[1] + " fps"]; }) }; } },
    bench: { label: "Benchmark scores", fn: function (sel) { var c = cb(sel.cpu); return { head: ["Score", "Value", "Reference = 100"], rows: [["CPU gaming", Math.round(c.gaming), "7800X3D"], ["CPU multi-core", Math.round(c.productivity), "9950X"], ["GPU", Math.round(gsc(sel.gpu)), "RTX 4090"]] }; } },
    power: { label: "Power consumption", fn: function (sel) { var p = BCP.powerFigures(sel), rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW); return { head: ["Item", "Value"], rows: [["Idle draw", "~" + p.idle + "W"], ["Gaming draw", "~" + p.gaming + "W"], ["Peak draw", "~" + p.peak + "W"], ["Recommended PSU", rec + "W"], ["Selected PSU", sel.psu.wattageW + "W " + sel.psu.efficiency]] }; } },
    thermal: { label: "Thermal analysis", fn: function (sel) { var r = sel.cooler.tdpRatingW, h = r - sel.cpu.tdpW; return { head: ["Item", "Value"], rows: [["CPU TDP", sel.cpu.tdpW + "W"], ["Cooler rating", r + "W (" + sel.cooler.type + ")"], ["Headroom", h + "W"], ["Verdict", h >= 40 ? "Comfortable" : h >= 0 ? "Tight, expect louder fans" : "Undersized, CPU will throttle"], ["GPU TDP", sel.gpu.tdpW + "W"]] }; } },
    budget: { label: "Budget breakdown", fn: function (sel) { var ps = partList(sel).filter(function (p) { return p[2]; }), tot = ps.reduce(function (s, p) { return s + price(p[1], p[2]); }, 0); return { head: ["Part", "Cost", "Share"], rows: ps.map(function (p) { var v = price(p[1], p[2]); return [p[0], usd(v), tot ? Math.round(v / tot * 100) + "%" : "-"]; }) }; } },
    upgrade: { label: "Upgrade recommendations", fn: function (sel) { var cur = gsc(sel.gpu), cp = price("gpu", sel.gpu), base = fpsRows(sel).reduce(function (s, r) { return s + r[1]; }, 0) / BCP.games.items.length; var opts = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && gsc(x) > cur * 1.15 && BCP.prices.gpu[x.id]; }).map(function (x) { var m = BCP.games.items.reduce(function (s, g) { return s + eng.gameFps(g, cb(sel.cpu).gaming, gsc(x), sel.res, sel.workload, x.vramGB); }, 0) / BCP.games.items.length; return { n: x.name, d: BCP.prices.gpu[x.id] - cp, g: m - base }; }).filter(function (o) { return o.d > 0 && o.g > 3; }).sort(function (a, b) { return b.g / b.d - a.g / a.d; }).slice(0, 4); return { head: ["GPU upgrade", "Extra cost", "Avg FPS gain"], rows: opts.length ? opts.map(function (o) { return [o.n, usd(o.d), "+" + Math.round(o.g) + " fps"]; }) : [["No GPU upgrade adds a meaningful gain at this resolution", "", ""]] }; } },
    shopping: { label: "Shopping list", fn: function (sel) { var tot = 0, rows = partList(sel).filter(function (p) { return p[2]; }).map(function (p) { var pr = price(p[1], p[2]), lk = BCP.pricesLive && LIVE[p[1]] && BCP.pricesLive[LIVE[p[1]]] && BCP.pricesLive[LIVE[p[1]]][p[2].id]; if (lk) pr = Math.round(lk.week_close); tot += pr; return ["[ ]", p[2].name, usd(pr)]; }); rows.push(["", "Estimated total", usd(tot)]); return { head: ["Buy", "Item", "Est. price"], rows: rows, note: "Uses the weekly market feed price where one matches, otherwise the curated estimate. Prices are references, not offers." }; } },
    prices: { label: "Price comparison", fn: function (sel) { var rows = []; partList(sel).forEach(function (p) { if (!p[2]) return; var c = price(p[1], p[2]), lk = BCP.pricesLive && LIVE[p[1]] && BCP.pricesLive[LIVE[p[1]]] && BCP.pricesLive[LIVE[p[1]]][p[2].id]; rows.push([p[0] + ": " + p[2].name, usd(c), lk ? usd(Math.round(lk.week_close)) : "no match"]); }); return { head: ["Part", "Curated", "Weekly market floor"], rows: rows, note: "Market values are cheapest-in-stock floor prices from the weekly Pricify feed, not typical prices." }; } },
    specs: { label: "Component specs", fn: function (sel) { return { head: ["Part", "Key specs"], rows: [["CPU " + sel.cpu.name, sel.cpu.socket + ", " + sel.cpu.cores + "C/" + sel.cpu.threads + "T, " + sel.cpu.boostGHz + " GHz, " + sel.cpu.tdpW + "W"], ["GPU " + sel.gpu.name, sel.gpu.vramGB + " GB, " + sel.gpu.tdpW + "W, " + sel.gpu.arch], ["Memory", sel.ram ? sel.ram.name : "Not specified"], ["Storage", sel.storage.name], ["PSU", sel.psu.name]] }; } }
  };
  var TYPES = { build: ["PC build report", ["parts", "bottleneck", "compat", "fps", "power", "budget"]], summary: ["Build summary", ["parts", "bottleneck"]], bottleneck: ["Bottleneck analysis report", ["bottleneck"]], compat: ["Compatibility report", ["compat"]], perf: ["Performance report", ["fps", "bench"]], bench: ["Benchmark report", ["bench"]], power: ["Power consumption report", ["power"]], thermal: ["Thermal analysis report", ["thermal"]], budget: ["Budget breakdown report", ["budget"]], comparison: ["Component comparison report", ["specs", "bench"]], upgrade: ["Upgrade recommendation report", ["upgrade"]], shopping: ["Shopping list", ["shopping"]], prices: ["Price comparison report", ["prices"]], custom: ["Custom template", null] };

  function build(sel, keys) { return keys.map(function (k) { var s = SECTIONS[k].fn(sel); s.title = SECTIONS[k].label; return s; }); }
  function AR() { return !!(window.I18N && I18N.active); }
  function T(v) { return AR() && typeof v === "string" ? I18N.t(v) : v; }
  function trS(title, secs) { if (!AR()) return [title, secs]; return [T(title), secs.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; o.title = T(x.title); o.head = x.head.map(T); o.rows = x.rows.map(function (r) { return r.map(T); }); if (x.note) o.note = T(x.note); return o; })]; }
  function meta() { return T("Generated " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC. Benchmarks " + BCP.benchmarks.meta.asOf + " (" + BCP.benchmarks.meta.confidence + "), prices " + BCP.prices.meta.asOf + ". All figures are estimates, not measured results."); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function toHtml(title, secs) { var _t = trS(title, secs); title = _t[0]; secs = _t[1];
    var h = "<!doctype html><html" + (AR() ? " dir=rtl lang=ar" : "") + "><meta charset=utf-8><title>" + esc(title) + "</title><style>body{font:15px system-ui;max-width:820px;margin:32px auto;color:#1c1530}h1{color:#6d3fe0}h2{margin-top:28px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:6px 10px;text-align:"+(AR()?"right":"left")+"}th{color:#6b6590}small{color:#666}</style><h1>" + esc(title) + "</h1><small>" + esc(meta()) + "</small>";
    secs.forEach(function (s) { h += "<h2>" + esc(s.title) + "</h2><table><tr>" + s.head.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr>" + s.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>" + (s.note ? "<p><small>" + esc(s.note) + "</small></p>" : ""); });
    return h;
  }
  function toMd(title, secs) { var _t = trS(title, secs); title = _t[0]; secs = _t[1]; var m = "# " + title + "\n\n_" + meta() + "_\n"; secs.forEach(function (s) { m += "\n## " + s.title + "\n\n| " + s.head.join(" | ") + " |\n|" + s.head.map(function () { return "---"; }).join("|") + "|\n" + s.rows.map(function (r) { return "| " + r.join(" | ") + " |"; }).join("\n") + "\n" + (s.note ? "\n" + s.note + "\n" : ""); }); return m; }
  function toCsv(title, secs) { var _t = trS(title, secs); title = _t[0]; secs = _t[1]; function q(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; } var o = [[title], [meta()], []]; secs.forEach(function (s) { o.push([s.title]); o.push(s.head); s.rows.forEach(function (r) { o.push(r); }); o.push([]); }); return "\uFEFF" + o.map(function (r) { return r.map(q).join(","); }).join("\r\n"); }
  function toXls(title, secs) { var _t = trS(title, secs); title = _t[0]; secs = _t[1];
    var x = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    function cell(v) { var n = typeof v === "number" || (/^-?\d+(\.\d+)?$/.test(String(v))); return '<Cell><Data ss:Type="' + (n ? "Number" : "String") + '">' + esc(v) + "</Data></Cell>"; }
    secs.forEach(function (s, i) { x += '<Worksheet ss:Name="' + esc(s.title.replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 30) || "Sheet" + (i + 1)) + '"><Table>' + "<Row>" + s.head.map(function (h) { return '<Cell><Data ss:Type="String">' + esc(h) + "</Data></Cell>"; }).join("") + "</Row>" + s.rows.map(function (r) { return "<Row>" + r.map(cell).join("") + "</Row>"; }).join("") + "</Table></Worksheet>"; });
    return x + "</Workbook>";
  }
  function table(P, s) {
    P.appendChild(el("h3", null, s.title)); var t = el("table", "cmp-table lab-table"), h = el("tr"); s.head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    s.rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
    if (s.note) P.appendChild(ui.note(s.note));
  }

  function reports(box) {
    var sel = BCP.getSelection(), rerun = function () { box.innerHTML = ""; reports(box); };
    var P = ui.panel("Build reports", "pick a report, preview it, download it"); box.appendChild(P);
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Report", ui.select(Object.keys(TYPES).map(function (k) { return [k, TYPES[k][0]]; }), S.type, function (v) { S.type = v; ui.set("rep.type", v); rerun(); })));
    P.appendChild(f);
    var keys = S.type === "custom" ? S.custom : TYPES[S.type][1];
    if (S.type === "custom") {
      var cg = el("div", "mk-chips"); Object.keys(SECTIONS).forEach(function (k) { var c = el("button", "mk-chip" + (S.custom.indexOf(k) >= 0 ? " active" : ""), SECTIONS[k].label); c.type = "button"; c.addEventListener("click", function () { var i = S.custom.indexOf(k); if (i >= 0) S.custom.splice(i, 1); else S.custom.push(k); ui.set("rep.custom", S.custom); rerun(); }); cg.appendChild(c); }); P.appendChild(cg);
      var nm = el("input"); nm.placeholder = "Template name"; var sv = el("button", "hb-btn ghost", "Save template"); sv.type = "button"; sv.addEventListener("click", function () { if (!nm.value.trim()) return; S.tpl[nm.value.trim()] = S.custom.slice(); ui.set("rep.tpl", S.tpl); rerun(); });
      var row = el("div", "hb-form"); row.appendChild(ui.field("Save as template", nm)); row.appendChild(sv); P.appendChild(row);
      var names = Object.keys(S.tpl); if (names.length) { var tl = el("div", "mk-chips"); tl.appendChild(el("span", "muted", "Saved templates ")); names.forEach(function (n) { var c = el("button", "mk-chip", n); c.type = "button"; c.addEventListener("click", function () { S.custom = S.tpl[n].slice(); ui.set("rep.custom", S.custom); rerun(); }); tl.appendChild(c); var d = el("button", "mk-chip", "x"); d.type = "button"; d.title = "Delete " + n; d.addEventListener("click", function () { delete S.tpl[n]; ui.set("rep.tpl", S.tpl); rerun(); }); tl.appendChild(d); }); P.appendChild(tl); }
    }
    var title = TYPES[S.type][0] + " - " + sel.cpu.name + " + " + sel.gpu.name, secs = build(sel, keys.length ? keys : ["parts"]);
    var bar = el("div", "hb-form"), slug = "bcp-" + S.type;
    [["Download HTML", function () { ui.download(slug + ".html", toHtml(title, secs), "text/html"); }], ["Print / PDF", function () { var w = window.open("", "_blank"); if (!w) { alert("Allow pop-ups to print."); return; } w.document.write(toHtml(title, secs)); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300); }],
      ["Markdown", function () { ui.download(slug + ".md", toMd(title, secs), "text/markdown"); }], ["CSV", function () { ui.download(slug + ".csv", toCsv(title, secs), "text/csv;charset=utf-8"); }], ["Excel (.xls)", function () { ui.download(slug + ".xls", toXls(title, secs), "application/vnd.ms-excel"); }]].forEach(function (b) { var x = el("button", "hb-btn", b[0]); x.type = "button"; x.addEventListener("click", b[1]); bar.appendChild(x); });
    P.appendChild(bar); P.appendChild(ui.note("Excel export is an XML spreadsheet that opens in Excel, LibreOffice and Google Sheets, one sheet per section. Reports are built in your browser from the Calculator build."));
    var V = ui.panel(TYPES[S.type][0], "preview"); box.appendChild(V);
    secs.forEach(function (s) { table(V, s); }); V.appendChild(ui.note(meta()));
  }

  /* ---------- Share: QR, images ---------- */
  var BG = "#140d26", ACC = "#a78bfa", PINK = "#e879f9", TXT = "#f3eefe", MUT = "#a79fc4";
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d"); var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#1a1033"); g.addColorStop(1, "#0f0a1e"); x.fillStyle = g; x.fillRect(0, 0, w, h); return [c, x]; }
  function qrDraw(x, text, px, py, size) { var m = BCP.qr(text); if (!m) return false; var q = 2, n = m.length + q * 2, s = Math.floor(size / n); x.fillStyle = "#fff"; x.fillRect(px, py, n * s, n * s); x.fillStyle = "#140d26"; m.forEach(function (r, i) { r.forEach(function (v, j) { if (v) x.fillRect(px + (j + q) * s, py + (i + q) * s, s, s); }); }); return n * s; }
  function totals(sel) { return partList(sel).reduce(function (s, p) { return s + (p[2] ? price(p[1], p[2]) : 0); }, 0); }
  function buildCard(sel, social) {
    var cv = canvas(1200, 630), c = cv[0], x = cv[1], fr = fpsRows(sel), avg = Math.round(fr.reduce(function (s, r) { return s + r[1]; }, 0) / fr.length), bn = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), sel.res, sel.workload, sel.cpu);
    x.fillStyle = ACC; x.font = "700 22px system-ui,sans-serif"; x.fillText("BOTTLENECK CALCULATOR PRO", 60, 70);
    x.fillStyle = TXT; x.font = "800 " + (social ? 58 : 44) + "px system-ui,sans-serif"; x.fillText(social ? avg + " FPS avg at " + RES[sel.res] : "My build", 60, social ? 150 : 135);
    x.font = "600 30px system-ui,sans-serif"; var y = social ? 215 : 195;
    [["CPU", sel.cpu.name], ["GPU", sel.gpu.name], ["RAM", sel.ram ? sel.ram.name.slice(0, 34) : "-"], ["Storage", sel.storage.name.slice(0, 34)], ["PSU", sel.psu.name]].forEach(function (r) { x.fillStyle = MUT; x.font = "600 22px system-ui,sans-serif"; x.fillText(r[0], 60, y); x.fillStyle = TXT; x.font = "600 28px system-ui,sans-serif"; x.fillText(r[1], 190, y); y += 52; });
    var st = [[avg + " fps", "avg " + RES[sel.res]], [bn.pct + "%", bn.limiter === "balanced" ? "balanced" : bn.limiter + " bottleneck"], [ui.usd(totals(sel)), "est. cost"]];
    st.forEach(function (s, i) { var px = 60 + i * 250, py = 470; x.fillStyle = "#231745"; x.fillRect(px, py, 230, 100); x.fillStyle = PINK; x.font = "800 40px system-ui,sans-serif"; x.fillText(s[0], px + 18, py + 52); x.fillStyle = MUT; x.font = "500 20px system-ui,sans-serif"; x.fillText(s[1], px + 18, py + 84); });
    var url = BCP.buildLink(); if (BCP.qr(url)) { qrDraw(x, url, 900, 300, 250); x.fillStyle = MUT; x.font = "500 18px system-ui,sans-serif"; x.fillText("Scan to open this build", 920, 585); }
    x.fillStyle = MUT; x.font = "500 16px system-ui,sans-serif"; x.fillText("Estimates, not measured results. bcalc.mooo.com", 60, 612);
    return c;
  }
  function chart(sel) {
    var fr = fpsRows(sel), cv = canvas(1200, 120 + fr.length * 34), c = cv[0], x = cv[1], mx = fr[0][1];
    x.fillStyle = TXT; x.font = "800 28px system-ui,sans-serif"; x.fillText("Estimated FPS at " + RES[sel.res], 40, 46); x.fillStyle = MUT; x.font = "600 20px system-ui,sans-serif"; x.fillText(sel.cpu.name + " + " + sel.gpu.name, 40, 74);
    fr.forEach(function (r, i) { var y = 90 + i * 34, w = Math.max(4, r[1] / mx * 700); x.fillStyle = MUT; x.font = "500 18px system-ui,sans-serif"; x.fillText(r[0], 40, y + 18); var g = x.createLinearGradient(330, 0, 330 + w, 0); g.addColorStop(0, "#8b5cf6"); g.addColorStop(1, PINK); x.fillStyle = g; x.fillRect(330, y, w, 22); x.fillStyle = TXT; x.font = "700 18px system-ui,sans-serif"; x.fillText(r[1] + " fps", 340 + w, y + 18); });
    x.fillStyle = MUT; x.font = "500 15px system-ui,sans-serif"; x.fillText("Engine estimates, not measured results. Bottleneck Calculator Pro", 40, c.height - 18);
    return c;
  }
  function dl(c, name) { var a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function share(box) {
    var sel = BCP.getSelection(), url = BCP.buildLink(), P = ui.panel("Build QR code", "scan to open this exact build"); box.appendChild(P);
    var q = document.createElement("canvas"); q.width = q.height = 280; var qx = q.getContext("2d"); qx.fillStyle = "#fff"; qx.fillRect(0, 0, 280, 280);
    if (BCP.qr(url)) { qrDraw(qx, url, 0, 0, 280); q.className = "rp-qr"; P.appendChild(q); var b = el("button", "hb-btn", "Download QR (PNG)"); b.type = "button"; b.addEventListener("click", function () { dl(q, "bcp-build-qr.png"); }); P.appendChild(b); }
    else P.appendChild(el("p", "muted", "This build link is too long for a QR code."));
    P.appendChild(ui.note("The code holds the shareable build link (" + url.length + " characters). It opens the Calculator with these parts selected.")); var ln = el("code", "rp-link", url); P.appendChild(ln);
    [["Build image", "A 1200x630 card with parts, FPS, bottleneck, cost and a QR code.", false, "bcp-build.png"], ["Social media card", "Headline FPS card sized for link previews and posts.", true, "bcp-social.png"]].forEach(function (d) {
      var C = ui.panel(d[0], d[1]); box.appendChild(C); var c = buildCard(sel, d[2]); c.className = "rp-img"; C.appendChild(c);
      var b2 = el("button", "hb-btn", "Download PNG"); b2.type = "button"; b2.addEventListener("click", function () { dl(c, d[3]); }); C.appendChild(b2);
    });
    var F = ui.panel("Performance chart", "estimated FPS per game, as an image"); box.appendChild(F); var ch = chart(sel); ch.className = "rp-img"; F.appendChild(ch);
    var b3 = el("button", "hb-btn", "Download chart PNG"); b3.type = "button"; b3.addEventListener("click", function () { dl(ch, "bcp-fps-chart.png"); }); F.appendChild(b3);
  }
  BCP.addHub({ key: "reports", label: "Reports", before: "dash", title: "Take it with you.", intro: "Build reports in many types, custom templates, and downloads as HTML, PDF, Markdown, CSV and Excel, plus a QR code and shareable images.",
    subs: [{ id: "rep", label: "Reports", render: reports }, { id: "share", label: "QR and images", render: share }] });
})();
