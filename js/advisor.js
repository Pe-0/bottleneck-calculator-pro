/* ============================================================
 * ADVISOR HUB - part upgrade advice, upgrade roadmap, future-proofing and
 * cooling / airflow planning. Rules of thumb on the curated catalog, labeled
 * as such. Prices: curated layer.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var S = { intake: ui.get("adv.intake", 2), exhaust: ui.get("adv.exhaust", 1), size: ui.get("adv.size", 120), step: ui.get("adv.step", 150) };
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gsc(g) { return BCP.benchmarks.gpu[g.id]; }
  function pr(k, it) { return !it ? 0 : k === "cpu" ? BCP.prices.cpu[it.id] || 0 : k === "gpu" ? BCP.prices.gpu[it.id] || 0 : it.priceUSD || 0; }
  function table(P, head, rows) {
    var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
  }
  function avgFps(sel, cpu, gpu) { return BCP.games.items.reduce(function (s, g) { return s + eng.gameFps(g, cb(cpu).gaming, gsc(gpu), sel.res, sel.workload, gpu.vramGB); }, 0) / BCP.games.items.length; }
  function delta(n, cur) { var d = n - cur; return d === 0 ? "same price" : (d > 0 ? "+" : "-") + ui.usd(Math.abs(d)); }

  // Each advisor returns [{part, now, pick:[{name, cost, why}], verdict}]
  function advice(sel) {
    var out = [], B = BCP, want = sel.workload === "productivity" ? 64 : 32;
    var ram = sel.ram;
    if (ram) {
      var rc = B.memoryKits.items.filter(function (k) { return k.type === ram.type && (k.capacityGB > ram.capacityGB || k.speedMTs > ram.speedMTs * 1.15) && k.capacityGB >= ram.capacityGB && k.priceUSD > 0; });
      var rp = rc.filter(function (k) { return k.capacityGB >= Math.min(want, ram.capacityGB * 2); }).sort(function (a, b) { return a.priceUSD - b.priceUSD; }).slice(0, 2);
      out.push({ part: "Memory", now: ram.name, ok: ram.capacityGB >= want && (ram.type === "DDR4" || ram.speedMTs >= 5600) && ram.modules >= 2, pick: rp.map(function (k) { return { name: k.name, cost: k.priceUSD - ram.priceUSD, why: k.capacityGB > ram.capacityGB ? "more capacity (" + want + " GB suits " + sel.workload + ")" : "faster kit" }; }), note: ram.modules < 2 ? "Single module runs single-channel. A dual-channel kit helps lows." : "" });
    }
    var st = sel.storage, sc = B.storage.items.filter(function (s) { return s.interface !== "SATA" && (s.capacityGB >= st.capacityGB * 2 || s.readMBs > st.readMBs * 1.4) && s.priceUSD > 0; }).sort(function (a, b) { return a.priceUSD - b.priceUSD; }).slice(0, 2);
    out.push({ part: "Storage", now: st.name, ok: st.capacityGB >= 1000 && st.readMBs >= 5000, pick: sc.map(function (s) { return { name: s.name, cost: s.priceUSD - st.priceUSD, why: s.capacityGB >= st.capacityGB * 2 ? "double the space or more" : "much faster reads" }; }), note: st.capacityGB < 1000 ? "Modern games are 100 GB+, 1 TB is a comfortable floor." : "" });
    var rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW), psu = sel.psu, need = Math.ceil(rec * 1.15 / 50) * 50;
    var pc = B.psus.items.filter(function (p) { return p.wattageW >= need && (sel.gpu.tdpW < 300 || p.atx31) && p.priceUSD > 0; }).sort(function (a, b) { return a.priceUSD - b.priceUSD; }).slice(0, 2);
    out.push({ part: "PSU", now: psu.name, ok: psu.wattageW >= rec && (sel.gpu.tdpW < 300 || psu.atx31), pick: pc.map(function (p) { return { name: p.name, cost: p.priceUSD - psu.priceUSD, why: "covers " + rec + "W recommended with headroom" + (p.atx31 ? ", ATX 3.1 for modern GPUs" : "") }; }), note: psu.wattageW < rec ? "Current PSU is under the " + rec + "W recommendation." : "" });
    var cl = sel.cooler, cc = B.coolers.items.filter(function (c) { return c.sockets.indexOf(sel.cpu.socket) >= 0 && c.tdpRatingW >= sel.cpu.tdpW * 1.3 && c.id !== cl.id && c.priceUSD > 0 && (!sel.case_ || c.type === "AIO" ? true : c.heightMM <= sel.case_.maxCoolerHeightMM); }).sort(function (a, b) { return a.priceUSD - b.priceUSD; }).slice(0, 2);
    out.push({ part: "Cooling", now: cl.name + " (" + cl.tdpRatingW + "W vs " + sel.cpu.tdpW + "W CPU)", ok: cl.tdpRatingW >= sel.cpu.tdpW * 1.3, pick: cc.map(function (c) { return { name: c.name, cost: c.priceUSD - cl.priceUSD, why: c.tdpRatingW + "W rating, " + Math.round((c.tdpRatingW / sel.cpu.tdpW - 1) * 100) + "% headroom" }; }), note: "" });
    if (sel.mobo) {
      var mb = sel.mobo, mc = B.motherboards.items.filter(function (m) { return m.socket === sel.cpu.socket && m.ramType === mb.ramType && m.id !== mb.id && (m.m2Slots > mb.m2Slots || (m.pcie5Gpu && !mb.pcie5Gpu)) && (!sel.case_ || sel.case_.fits.indexOf(m.formFactor) >= 0); }).sort(function (a, b) { return a.priceUSD - b.priceUSD; }).slice(0, 2);
      out.push({ part: "Motherboard", now: mb.name, ok: !mc.length, pick: mc.map(function (m) { return { name: m.name, cost: m.priceUSD - mb.priceUSD, why: (m.m2Slots > mb.m2Slots ? m.m2Slots + " M.2 slots" : "") + (m.pcie5Gpu && !mb.pcie5Gpu ? " PCIe 5.0 GPU slot" : "") }; }), note: "A new board means reinstalling the system. Only worth it for a specific missing feature." });
    }
    return out;
  }
  function parts(box) {
    var sel = BCP.getSelection(), A = advice(sel), P = ui.panel("Part upgrade recommendations", "RAM, storage, PSU, cooling, motherboard"); box.appendChild(P);
    A.forEach(function (a) {
      var d = el("div", "adv-block"); var h = el("h3", null, a.part + (a.ok ? "" : " - worth upgrading")); d.appendChild(h); d.appendChild(el("p", "muted", "Now: " + a.now));
      if (a.ok && !a.pick.length) d.appendChild(el("p", null, "Fine as it is."));
      else if (a.ok) d.appendChild(el("p", null, "Fine as it is. Optional upgrades:"));
      if (a.pick.length) table(d, ["Option", "Cost vs now", "Why"], a.pick.map(function (p) { return [p.name, (p.cost >= 0 ? "+" : "-") + ui.usd(Math.abs(p.cost)), p.why]; }));
      else if (!a.ok) d.appendChild(el("p", "muted", "No catalog option clearly fixes this."));
      if (a.note) d.appendChild(ui.note(a.note)); P.appendChild(d);
    });
    P.appendChild(ui.note("Rules of thumb on the curated catalog and curated prices. Alternatives are the two cheapest options that solve the problem."));
  }

  /* ---------- Roadmap ---------- */
  function steps(sel) {
    var out = [], cur = { cpu: sel.cpu, gpu: sel.gpu }, base = avgFps(sel, sel.cpu, sel.gpu), A = advice(sel), run = base;
    A.forEach(function (a) { if (!a.ok && a.pick.length && (a.part === "PSU" || a.part === "Cooling")) out.push({ t: a.part + " fix", n: a.pick[0].name, cost: a.pick[0].cost, fps: 0, why: a.note || a.pick[0].why, tier: 1 }); });
    var bn = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), sel.res, sel.workload, sel.cpu);
    if (bn.limiter === "cpu" && bn.pct >= 12) {
      var c = BCP.cpus.items.filter(function (x) { return !x.legacy && !x.mobile && x.socket === sel.cpu.socket && BCP.prices.cpu[x.id] && cb(x) && cb(x).gaming > cb(sel.cpu).gaming * 1.1; }).sort(function (a, b) { return (avgFps(sel, b, sel.gpu) / Math.max(1, BCP.prices.cpu[b.id] - BCP.prices.cpu[sel.cpu.id])) - (avgFps(sel, a, sel.gpu) / Math.max(1, BCP.prices.cpu[a.id] - BCP.prices.cpu[sel.cpu.id])); })[0];
      if (c) { var f = avgFps(sel, c, sel.gpu); out.push({ t: "CPU upgrade", n: c.name, cost: BCP.prices.cpu[c.id] - BCP.prices.cpu[sel.cpu.id], fps: f - run, why: "CPU limits the GPU by " + bn.pct + "%", tier: 2 }); cur.cpu = c; run = f; }
    }
    var g = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && BCP.prices.gpu[x.id] && gsc(x) > gsc(sel.gpu) * 1.2 && BCP.prices.gpu[x.id] > BCP.prices.gpu[sel.gpu.id]; }).map(function (x) { var f = avgFps(sel, cur.cpu, x); return { x: x, f: f, d: BCP.prices.gpu[x.id] - BCP.prices.gpu[sel.gpu.id] }; }).filter(function (o) { return o.f > run * 1.15; }).sort(function (a, b) { return (b.f - run) / b.d - (a.f - run) / a.d; })[0];
    if (g) { out.push({ t: "GPU upgrade", n: g.x.name, cost: g.d, fps: g.f - run, why: "best FPS gain per dollar above +15%", tier: 3 }); }
    ["Memory", "Storage"].forEach(function (p) { var a = A.filter(function (x) { return x.part === p; })[0]; if (a && !a.ok && a.pick.length) out.push({ t: p + " upgrade", n: a.pick[0].name, cost: a.pick[0].cost, fps: 0, why: a.pick[0].why, tier: 4 }); });
    return { base: base, list: out };
  }
  function roadmap(box) {
    var sel = BCP.getSelection(), R = steps(sel), P = ui.panel("Upgrade roadmap", "ordered by what hurts the build most"); box.appendChild(P);
    if (!R.list.length) { P.appendChild(el("p", null, "No clear upgrade step for this build. It is balanced at the selected resolution.")); }
    else { var cum = 0, fps = R.base; table(P, ["Step", "Part", "Cost", "Running total", "Avg FPS after", "Reason"], R.list.map(function (s, i) { cum += s.cost; fps += s.fps; return [(i + 1) + ". " + s.t, s.n, (s.cost >= 0 ? "+" : "-") + ui.usd(Math.abs(s.cost)), ui.usd(cum), Math.round(fps) + " fps", s.why]; })); }
    P.appendChild(ui.note("Order: stability fixes first (PSU, cooling), then the CPU if it holds the GPU back, then the best-value GPU, then memory and storage. FPS comes from the estimator and is a guide."));
    var I = ui.panel("Incremental upgrade planner", "spread the steps over time"); box.appendChild(I);
    var f = el("div", "hb-form"); f.appendChild(ui.field("Spend per month (USD)", ui.number(S.step, 20, 5000, 10, function (v) { S.step = v; ui.set("adv.step", v); box.innerHTML = ""; roadmap(box); })));
    I.appendChild(f); var acc = 0; var pay = R.list.map(function (s) { acc += Math.max(0, s.cost); return [s.t + ": " + s.n, Math.max(1, Math.ceil(acc / S.step)) + " month" + (Math.ceil(acc / S.step) > 1 ? "s" : "")]; });
    if (pay.length) table(I, ["Step", "Ready after"], pay); else I.appendChild(el("p", "muted", "Nothing to schedule."));
    var F = ui.panel("Future-proofing analysis", "heuristic score"); box.appendChild(F);
    var rows = [], pts = 0;
    function row(l, p, max, note) { pts += p; rows.push([l, p + "/" + max, note]); }
    var yr = { AM5: 3, LGA1851: 2, AM4: 0, LGA1700: 0 }[sel.cpu.socket]; row("Platform", yr == null ? 1 : yr, 3, sel.cpu.socket + (yr >= 2 ? " has further CPU generations ahead" : " is at the end of its upgrade path"));
    var ddr5 = sel.ram ? sel.ram.type === "DDR5" : sel.cpu.socket === "AM5"; row("Memory type", ddr5 ? 2 : 0, 2, ddr5 ? "DDR5" : "DDR4 will not carry to new platforms");
    row("GPU VRAM", sel.gpu.vramGB >= 16 ? 3 : sel.gpu.vramGB >= 12 ? 2 : sel.gpu.vramGB >= 8 ? 1 : 0, 3, sel.gpu.vramGB + " GB");
    var rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW); row("PSU headroom", sel.psu.wattageW >= rec * 1.4 ? 2 : sel.psu.wattageW >= rec ? 1 : 0, 2, sel.psu.wattageW + "W vs " + rec + "W recommended");
    row("Storage slots", sel.mobo ? (sel.mobo.m2Slots >= 3 ? 2 : sel.mobo.m2Slots >= 2 ? 1 : 0) : 1, 2, sel.mobo ? sel.mobo.m2Slots + " M.2 slots" : "board not set");
    row("CPU threads", sel.cpu.threads >= 16 ? 2 : sel.cpu.threads >= 12 ? 1 : 0, 2, sel.cpu.threads + " threads"); table(F, ["Area", "Points", "Note"], rows);
    var tot = Math.round(pts / 14 * 100); F.appendChild(el("p", "adv-score", "Future-proofing score: " + tot + "/100 - " + (tot >= 75 ? "should age well" : tot >= 50 ? "decent, one weak spot" : "plan a platform refresh soon")));
    F.appendChild(ui.note("A heuristic about upgrade paths, not a prediction of game requirements."));
  }

  /* ---------- Cooling and airflow ---------- */
  var CFM = { 120: 55, 140: 75 };
  function cooling(box) {
    var sel = BCP.getSelection(), rer = function () { box.innerHTML = ""; cooling(box); }, P = ui.panel("Fan configuration planner", sel.case_ ? sel.case_.name : "no case selected"); box.appendChild(P);
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Intake fans (front/bottom)", ui.number(S.intake, 0, 6, 1, function (v) { S.intake = v; ui.set("adv.intake", v); rer(); })));
    f.appendChild(ui.field("Exhaust fans (rear/top)", ui.number(S.exhaust, 0, 6, 1, function (v) { S.exhaust = v; ui.set("adv.exhaust", v); rer(); })));
    f.appendChild(ui.field("Fan size", ui.select([["120", "120 mm"], ["140", "140 mm"]], String(S.size), function (v) { S.size = +v; ui.set("adv.size", +v); rer(); })));
    P.appendChild(f);
    var inC = S.intake * CFM[S.size], outC = S.exhaust * CFM[S.size], heat = Math.round(BCP.powerFigures(sel).gaming - 35), need = Math.round(heat * 0.1756 / 0.6), tot = inC + outC;
    var diff = inC + outC ? (inC - outC) / Math.max(inC, outC, 1) : 0, press = diff > 0.15 ? "Positive" : diff < -0.15 ? "Negative" : "Balanced";
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Intake", "~" + inC + " CFM")); st.appendChild(ui.stat("Exhaust", "~" + outC + " CFM")); st.appendChild(ui.stat("Pressure", press)); st.appendChild(ui.stat("Heat to move", "~" + heat + "W")); st.appendChild(ui.stat("Airflow needed", "~" + need + " CFM"));
    P.appendChild(st);
    var verdict = Math.min(inC, outC) >= need ? "Airflow is enough for this load." : Math.min(inC, outC) >= need * 0.7 ? "Workable, expect warmer parts under long loads." : "Too little airflow for this build. Add fans first.";
    P.appendChild(el("p", "adv-score", verdict));
    var tips = [];
    if (press === "Positive") tips.push("Positive pressure: less dust (use filters), slightly warmer rear parts. A good default.");
    if (press === "Negative") tips.push("Negative pressure: air leaks in through gaps, so more dust. Add intake or remove an exhaust fan.");
    if (press === "Balanced") tips.push("Balanced pressure: even flow and fair dust control.");
    if (S.intake < 2) tips.push("Two front intake fans is the usual minimum for a GPU over 200W.");
    if (S.exhaust < 1) tips.push("Add at least one rear exhaust fan so hot air has a path out.");
    if (sel.case_ && /budget/i.test(sel.case_.name)) tips.push("Budget cases often ship with one fan and a solid front. A mesh-front case lowers temperatures more than extra fans.");
    tips.forEach(function (t) { P.appendChild(el("p", "muted", t)); });
    // diagram
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 520 240"); svg.setAttribute("class", "adv-svg");
    function node(t, a, txt) { var e = document.createElementNS(ns, t); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt) e.textContent = txt; svg.appendChild(e); return e; }
    node("rect", { x: 70, y: 20, width: 380, height: 190, rx: 14, fill: "#1b1233", stroke: "#8b5cf6", "stroke-width": 2 });
    node("rect", { x: 220, y: 70, width: 110, height: 90, rx: 8, fill: "#2a1c4d", stroke: "#a78bfa" }); node("text", { x: 275, y: 120, fill: "#d9ccff", "font-size": 14, "text-anchor": "middle" }, "CPU + GPU");
    for (var i = 0; i < S.intake; i++) { var y = 50 + i * (140 / Math.max(1, S.intake)); node("circle", { cx: 95, cy: y + 15, r: 17, fill: "#0e2a44", stroke: "#38bdf8" }); node("path", { d: "M10 " + (y + 15) + " L60 " + (y + 15) + " M52 " + (y + 8) + " L62 " + (y + 15) + " L52 " + (y + 22), stroke: "#38bdf8", "stroke-width": 3, fill: "none" }); }
    for (i = 0; i < S.exhaust; i++) { var x = 380 - i * 42, top = i > 0; var cx = top ? 380 - (i - 1) * 50 - 30 : 425, cy = top ? 40 : 90; node("circle", { cx: cx, cy: cy, r: 17, fill: "#44112d", stroke: "#e879f9" }); if (top) node("path", { d: "M" + cx + " 22 L" + cx + " 4 M" + (cx - 7) + " 11 L" + cx + " 2 L" + (cx + 7) + " 11", stroke: "#e879f9", "stroke-width": 3, fill: "none" }); else node("path", { d: "M442 " + cy + " L500 " + cy + " M492 " + (cy - 7) + " L502 " + cy + " L492 " + (cy + 7), stroke: "#e879f9", "stroke-width": 3, fill: "none" }); }
    node("text", { x: 10, y: 232, fill: "#38bdf8", "font-size": 13 }, "Intake: " + S.intake); node("text", { x: 120, y: 232, fill: "#e879f9", "font-size": 13 }, "Exhaust: " + S.exhaust); node("text", { x: 230, y: 232, fill: "#a79fc4", "font-size": 13 }, press + " pressure (schematic)");
    P.appendChild(svg);
    P.appendChild(ui.note("Schematic, not a CFD simulation. Fan flow assumes about 55 CFM per 120 mm and 75 CFM per 140 mm at mid speed, and 60% effective after filters and grilles. Needed airflow uses a 10 C rise rule of thumb."));
    var C = ui.panel("Fan curve recommendations", "starting point for your BIOS or fan software"); box.appendChild(C);
    var hot = sel.cpu.tdpW >= 140 || sel.gpu.tdpW >= 300;
    table(C, ["CPU / GPU temp", "Case fans", "CPU cooler fan", "Why"], [["under 45 C", hot ? "35%" : "30%", "30%", "Near silent at idle"], ["45 to 60 C", hot ? "50%" : "40%", "45%", "Gentle ramp, avoids rising and falling noise"], ["60 to 75 C", hot ? "70%" : "60%", "65%", "Normal gaming range"], ["75 to 85 C", "85%", "85%", "Heavy load"], ["over 85 C", "100%", "100%", "Protect the parts"]]);
    C.appendChild(ui.note("Smooth the curve with a few seconds of delay so fans do not pulse. Curves are generic and depend on your fans and case."));
    var G = ui.panel("GPU thermal limit and cooler comparison", sel.gpu.name); box.appendChild(G);
    var gpuHeat = sel.gpu.tdpW, cls = need >= 1 && Math.min(inC, outC) >= need ? (gpuHeat >= 300 ? "Hot but manageable" : "Comfortable") : "Likely to run hot";
    G.appendChild(el("p", null, sel.gpu.name + " draws up to " + gpuHeat + "W. With this fan setup: " + cls + ". " + (sel.case_ && sel.gpu.lengthMM ? "GPU length " + sel.gpu.lengthMM + " mm vs case limit " + sel.case_.maxGpuLengthMM + " mm (" + (sel.gpu.lengthMM <= sel.case_.maxGpuLengthMM ? "fits" : "does not fit") + ")." : "")));
    var cl = BCP.coolers.items.filter(function (c) { return c.sockets.indexOf(sel.cpu.socket) >= 0; }).sort(function (a, b) { return b.tdpRatingW - a.tdpRatingW; });
    table(G, ["Cooler", "Type", "Rating", "Headroom vs CPU", "Fits case", "Price"], cl.slice(0, 10).map(function (c) { var fits = !sel.case_ ? "-" : c.type === "AIO" ? (sel.case_.maxRadiatorMM >= (/420/.test(c.name) ? 420 : /360/.test(c.name) ? 360 : /280/.test(c.name) ? 280 : /240/.test(c.name) ? 240 : 120) ? "Yes" : "Radiator too large") : (c.heightMM <= sel.case_.maxCoolerHeightMM ? "Yes" : "Too tall"); return [c.name + (c.id === sel.cooler.id ? " (yours)" : ""), c.type, c.tdpRatingW + "W", Math.round((c.tdpRatingW / sel.cpu.tdpW - 1) * 100) + "%", fits, c.priceUSD ? ui.usd(c.priceUSD) : "bundled"]; }));
  }
  BCP.addHub({ key: "advisor", label: "Advisor", before: "dash", title: "Upgrade smart.", intro: "Part-by-part upgrade advice, a step-by-step roadmap, future-proofing, and cooling and airflow planning for your build.",
    subs: [{ id: "parts", label: "Part upgrades", render: parts }, { id: "road", label: "Roadmap", render: roadmap }, { id: "cool", label: "Cooling and airflow", render: cooling }] });
})();
