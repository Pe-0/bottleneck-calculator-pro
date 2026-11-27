/* ============================================================
 * CHARTS HUB - FPS and benchmark charts, build comparison chart,
 * compatibility and thermal dashboards. SVG, drawn in the browser from
 * the curated layers. All FPS/score values are estimates.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el, NS = "http://www.w3.org/2000/svg";
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var S = { cpu: ui.get("ch.cpu", ""), gpu: ui.get("ch.gpu", ""), res: ui.get("ch.res", "") };
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gsc(g) { return BCP.benchmarks.gpu[g.id]; }
  function svgEl(w, h) { var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 " + w + " " + h); s.setAttribute("class", "ch-svg"); return s; }
  function add(s, t, a, txt) { var e = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt != null) e.textContent = txt; s.appendChild(e); return e; }
  // grouped horizontal bar chart: rows [{label, vals:[n,...]}], series [{name,color}]
  function bars(P, rows, series, unit) {
    var rh = 12 * series.length + 14, W = 760, H = rows.length * rh + 40, s = svgEl(W, H), mx = 1;
    rows.forEach(function (r) { r.vals.forEach(function (v) { mx = Math.max(mx, v); }); });
    series.forEach(function (se, i) { add(s, "rect", { x: 220 + i * 150, y: 6, width: 12, height: 12, rx: 3, fill: se.color }); add(s, "text", { x: 238 + i * 150, y: 16, fill: "#5b5380", "font-size": 12 }, se.name); });
    rows.forEach(function (r, i) {
      var y = 30 + i * rh; add(s, "text", { x: 210, y: y + 9 + (series.length - 1) * 6, fill: "#2d2350", "font-size": 13, "text-anchor": "end" }, r.label);
      r.vals.forEach(function (v, j) { var w = Math.max(2, v / mx * 420); var rc = add(s, "rect", { x: 220, y: y + j * 12, width: w, height: 10, rx: 3, fill: series[j].color }); var ti = document.createElementNS(NS, "title"); ti.textContent = r.label + ": " + Math.round(v) + unit; rc.appendChild(ti); add(s, "text", { x: 226 + w, y: y + j * 12 + 9, fill: "#5b5380", "font-size": 11 }, Math.round(v) + unit); });
    });
    var wrap = el("div", "lab-scroll"); wrap.appendChild(s); P.appendChild(wrap);
  }
  function fps(sel, cpu, gpu, res) { return BCP.games.items.map(function (g) { return eng.gameFps(g, cb(cpu).gaming, gsc(gpu), res, sel.workload, gpu.vramGB); }); }
  function sec(box, t, sub) { var P = ui.panel(t, sub); box.appendChild(P); return P; }

  function perf(box) {
    var sel = BCP.getSelection(), P = sec(box, "FPS chart", "estimated, per game and resolution");
    var a = fps(sel, sel.cpu, sel.gpu, "p1080"), b = fps(sel, sel.cpu, sel.gpu, "p1440"), c = fps(sel, sel.cpu, sel.gpu, "p2160");
    var rows = BCP.games.items.map(function (g, i) { return { label: g.name, vals: [a[i], b[i], c[i]] }; });
    bars(P, rows, [{ name: "1080p", color: "#38bdf8" }, { name: "1440p", color: "#a78bfa" }, { name: "4K", color: "#e879f9" }], "");
    P.appendChild(ui.note(sel.cpu.name + " + " + sel.gpu.name + ". Engine estimates, not measured results. Hover a bar for the value."));
    var B = sec(box, "Benchmark chart", "your parts against nearby parts (100 = reference)");
    var gl = BCP.gpus.items.filter(function (x) { return !x.mobile && gsc(x); }).sort(function (x, y) { return gsc(y) - gsc(x); }), gi = gl.indexOf(sel.gpu);
    var near = gl.slice(Math.max(0, gi - 4), Math.max(0, gi - 4) + 9);
    bars(B, near.map(function (x) { return { label: x.name + (x.id === sel.gpu.id ? " (yours)" : ""), vals: [gsc(x)] }; }), [{ name: "GPU score", color: "#a78bfa" }], "");
    var cl = BCP.cpus.items.filter(function (x) { return !x.mobile && cb(x); }).sort(function (x, y) { return cb(y).gaming - cb(x).gaming; }), ci = cl.indexOf(sel.cpu), cn = cl.slice(Math.max(0, ci - 3), Math.max(0, ci - 3) + 8);
    bars(B, cn.map(function (x) { return { label: x.name + (x.id === sel.cpu.id ? " (yours)" : ""), vals: [cb(x).gaming, cb(x).productivity] }; }), [{ name: "Gaming", color: "#38bdf8" }, { name: "Multi-core", color: "#e879f9" }], "");
    B.appendChild(ui.note("Curated benchmark layer. Scores are relative: RTX 4090 = 100 GPU, 7800X3D = 100 gaming, 9950X = 100 multi-core."));
  }
  function compare(box) {
    var sel = BCP.getSelection(), P = sec(box, "Build comparison chart", "current build against a changed one"), rer = function () { box.innerHTML = ""; compare(box); };
    var cpus = BCP.cpus.items.filter(function (x) { return !x.mobile && !x.legacy && cb(x); }), gpus = BCP.gpus.items.filter(function (x) { return !x.mobile && !x.legacy && gsc(x); });
    var nc = cpus.filter(function (x) { return x.id === S.cpu; })[0] || sel.cpu, ng = gpus.filter(function (x) { return x.id === S.gpu; })[0] || sel.gpu, res = S.res || sel.res;
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Compare CPU", ui.select(cpus.map(function (x) { return [x.id, x.name]; }), nc.id, function (v) { S.cpu = v; ui.set("ch.cpu", v); rer(); })));
    f.appendChild(ui.field("Compare GPU", ui.select(gpus.map(function (x) { return [x.id, x.name]; }), ng.id, function (v) { S.gpu = v; ui.set("ch.gpu", v); rer(); })));
    f.appendChild(ui.field("Resolution", ui.select([["p1080", "1080p"], ["p1440", "1440p"], ["p2160", "4K"]], res, function (v) { S.res = v; ui.set("ch.res", v); rer(); })));
    P.appendChild(f);
    var a = fps(sel, sel.cpu, sel.gpu, res), b = fps(sel, nc, ng, res);
    bars(P, BCP.games.items.map(function (g, i) { return { label: g.name, vals: [a[i], b[i]] }; }), [{ name: "Current build", color: "#38bdf8" }, { name: "Compared build", color: "#e879f9" }], "");
    var avg = function (x) { return x.reduce(function (s, v) { return s + v; }, 0) / x.length; };
    P.appendChild(el("p", "adv-score", "Average at " + RES[res] + ": " + Math.round(avg(a)) + " fps vs " + Math.round(avg(b)) + " fps (" + (avg(b) >= avg(a) ? "+" : "") + Math.round((avg(b) / avg(a) - 1) * 100) + "%)"));
    P.appendChild(ui.note("Same RAM, storage and workload as the Calculator build. Estimates only."));
  }
  function tile(P, label, value, cls, note) { var d = el("div", "ch-tile " + cls); d.appendChild(el("small", null, label)); d.appendChild(el("strong", null, value)); d.appendChild(el("span", "muted", note)); P.appendChild(d); }
  function dash(box) {
    var sel = BCP.getSelection(), bn = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), sel.res, sel.workload, sel.cpu);
    var w = eng.partCompatibility(sel.cpu, sel.gpu, sel.mobo, sel.ram, sel.psu, sel.workload, bn, sel.cooler, sel.case_, sel.res);
    var P = sec(box, "Compatibility dashboard", "from the compatibility engine"), g = el("div", "ch-tiles"); P.appendChild(g);
    var bad = w.filter(function (x) { return x.level === "bad"; }).length, warn = w.filter(function (x) { return x.level === "warn"; }).length, info = w.filter(function (x) { return x.level === "info" || x.level === "ok"; }).length;
    tile(g, "Errors", String(bad), bad ? "bad" : "ok", bad ? "fix before buying" : "none"); tile(g, "Warnings", String(warn), warn ? "warn" : "ok", warn ? "review" : "none"); tile(g, "Notes", String(info), "info", "informational");
    tile(g, "Socket", sel.mobo ? (sel.mobo.socket === sel.cpu.socket ? "Match" : "Mismatch") : "Board not set", sel.mobo && sel.mobo.socket !== sel.cpu.socket ? "bad" : "ok", sel.cpu.socket);
    tile(g, "Memory", sel.ram && sel.mobo ? (sel.ram.type === sel.mobo.ramType ? "Match" : "Mismatch") : "n/a", sel.ram && sel.mobo && sel.ram.type !== sel.mobo.ramType ? "bad" : "ok", sel.ram ? sel.ram.type : "");
    tile(g, "GPU fit", sel.case_ && sel.gpu.lengthMM ? (sel.gpu.lengthMM <= sel.case_.maxGpuLengthMM ? "Fits" : "Too long") : "n/a", sel.case_ && sel.gpu.lengthMM > sel.case_.maxGpuLengthMM ? "bad" : "ok", sel.gpu.lengthMM ? sel.gpu.lengthMM + " mm" : "");
    var ul = el("ul", "warn-list"); w.forEach(function (x) { ul.appendChild(el("li", "warn " + x.level, x.text)); }); P.appendChild(ul);
    var T = sec(box, "Thermal dashboard", "CPU cooler headroom and system heat"), t = el("div", "ch-tiles"); T.appendChild(t);
    var head = sel.cooler.tdpRatingW - sel.cpu.tdpW, pf = BCP.powerFigures(sel);
    tile(t, "Cooler headroom", (head >= 0 ? "+" : "") + head + "W", head >= 40 ? "ok" : head >= 0 ? "warn" : "bad", sel.cooler.name);
    tile(t, "CPU heat", sel.cpu.tdpW + "W", sel.cpu.tdpW > 200 ? "warn" : "ok", sel.cpu.name); tile(t, "GPU heat", sel.gpu.tdpW + "W", sel.gpu.tdpW > 320 ? "warn" : "ok", sel.gpu.name);
    tile(t, "System heat (gaming)", "~" + pf.gaming + "W", pf.gaming > 450 ? "warn" : "ok", "wall draw estimate");
    T.appendChild(ui.note("Estimates from TDP figures. See the Advisor tab for fan and airflow planning."));
  }
  BCP.addHub({ key: "charts", label: "Charts", before: "dash", title: "See the numbers.", intro: "FPS and benchmark charts, a build-versus-build chart, and compatibility and thermal dashboards.",
    subs: [{ id: "perf", label: "FPS and benchmarks", render: perf }, { id: "cmp", label: "Build comparison", render: compare }, { id: "dash", label: "Dashboards", render: dash }] });
})();
