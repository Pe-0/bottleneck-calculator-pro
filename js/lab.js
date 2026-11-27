/* ============================================================
 * LAB HUB - performance lows, scores, simulators and workload estimators.
 * Everything here is a labeled HEURISTIC built on the curated benchmark
 * layer (RTX 4090 = 100 GPU, 7800X3D = 100 gaming, 9950X = 100 multi-core).
 * It is not measured data; ranges are shown on purpose.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var S = { sim: ui.get("lab.sim", {}), hist: ui.get("lab.hist", []) };
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function cb(cpu) { return BCP.benchmarks.cpu[cpu.id] || { gaming: 0, productivity: 0 }; }
  function gs(gpu) { return BCP.benchmarks.gpu[gpu.id] || 0; }
  function memScore(ram) { return ram ? clamp(ram.capacityGB / 32 * 60 + ram.speedMTs / 6000 * 40, 0, 100) : 50; }
  function note(P, t) { P.appendChild(ui.note(t)); }
  function table(P, head, rows) {
    var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, c)); }); t.appendChild(tr); });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w); return t;
  }
  // Per-game model: average FPS plus bound type and heuristic lows.
  function gameModel(g, cpu, gpu, ram, res, wlKey, boost) {
    var wl = eng.WORKLOADS[wlKey] || eng.WORKLOADS.gaming, vf = gpu.vramGB;
    var avg = eng.gameFpsUpscaled(g, cb(cpu).gaming, gs(gpu), res, wlKey, boost || 1, vf);
    var vramOk = eng.gameFps(g, cb(cpu).gaming, gs(gpu), res, wlKey, 999) <= avg * 1.02;
    var gpuRel = gs(gpu) / 100 * wl.fpsGpuPenalty * (boost || 1);
    var cpuTerm = 1 + (cb(cpu).gaming / 100 * wl.fpsCpuPenalty - 1) * g.cpuWeight;
    var cpuBound = cpuTerm < gpuRel;
    var r1 = 0.82 - (cpuBound ? 0.06 : 0) - (vramOk ? 0 : 0.09) - (ram && ram.capacityGB < 16 ? 0.08 : 0) - (ram && ram.modules === 1 ? 0.05 : 0);
    r1 = clamp(r1, 0.5, 0.9);
    var low1 = avg * r1, low01 = low1 * 0.82, min = low01 * 0.9;
    return { avg: avg, low1: Math.round(low1), low01: Math.round(low01), min: Math.round(min), cpuBound: cpuBound, vramOk: vramOk, gpuRel: gpuRel, cpuTerm: cpuTerm };
  }
  function rows(sel) { return BCP.games.items.map(function (g) { return { g: g, m: gameModel(g, sel.cpu, sel.gpu, sel.ram, sel.res, sel.workload) }; }); }
  function scores(sel) {
    var c = cb(sel.cpu), g = gs(sel.gpu), mem = memScore(sel.ram);
    var single = Math.round(0.7 * c.gaming + 0.3 * (sel.cpu.boostGHz / 5.7 * 100));
    var overall = sel.workload === "productivity" ? 0.35 * c.productivity + 0.4 * g + 0.15 * mem + 0.1 * clamp(sel.storage.readMBs / 7000 * 100, 0, 100) : 0.28 * c.gaming + 0.52 * g + 0.12 * mem + 0.08 * clamp(sel.storage.readMBs / 7000 * 100, 0, 100);
    return { cpuG: Math.round(c.gaming), cpuP: Math.round(c.productivity), gpu: Math.round(g), single: single, multi: Math.round(c.productivity),
      render: Math.round(0.5 * g + 0.5 * c.productivity), overall: Math.round(overall), mem: Math.round(mem) };
  }

  /* ---------- Performance ---------- */
  function perf(box) {
    var sel = BCP.getSelection(), rs = rows(sel), sc = scores(sel);
    var P = ui.panel("Frame-rate lows", "heuristic, " + RES[sel.res] + " " + sel.workload + " build from the Calculator"); box.appendChild(P);
    table(P, ["Game", "Average", "1% low", "0.1% low", "Minimum", "Frame time (avg / 1% low)", "Limited by"], rs.map(function (r) {
      return [r.g.name, r.m.avg + " fps", r.m.low1 + " fps", r.m.low01 + " fps", r.m.min + " fps", (1000 / r.m.avg).toFixed(1) + " / " + (1000 / r.m.low1).toFixed(1) + " ms", r.m.cpuBound ? "CPU" : (r.m.vramOk ? "GPU" : "GPU + VRAM")];
    }));
    note(P, "Lows are a rule of thumb: about 82% of average for the 1% low, less when the CPU limits the game, VRAM runs short, RAM is under 16 GB or single-channel. They are not measured frame-time captures.");
    var avgs = rs.map(function (r) { return r.m.avg; }), mean = avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length;
    var R = ui.panel("Expected range and stability", "across the " + rs.length + " game profiles"); box.appendChild(R);
    var bn = eng.bottleneck(cb(sel.cpu), gs(sel.gpu), sel.res, sel.workload, sel.cpu);
    var stab = Math.round(clamp(100 - bn.pct * 0.8 - (rs.some(function (r) { return !r.m.vramOk; }) ? 12 : 0) - (sel.ram && sel.ram.capacityGB < 16 ? 10 : 0) - (sel.ram && sel.ram.modules === 1 ? 6 : 0), 20, 100));
    var st = el("div", "pw-stats");
    st.appendChild(ui.stat("Average FPS", Math.round(mean) + " fps")); st.appendChild(ui.stat("Expected range", Math.round(mean * 0.88) + " to " + Math.round(mean * 1.12) + " fps"));
    st.appendChild(ui.stat("Stability score", stab + "/100")); R.appendChild(st);
    note(R, "Range is the average plus or minus 12%, matching the medium confidence of the benchmark layer. Stability drops with bottleneck size, short VRAM and weak memory setups (heuristic).");
    var Sx = ui.panel("Performance scores", "100 = reference part (RTX 4090 / 7800X3D / 9950X)"); box.appendChild(Sx);
    var sg = el("div", "pw-stats");
    [["Overall PC", sc.overall], ["Gaming (CPU)", sc.cpuG], ["GPU", sc.gpu], ["Single-core (proxy)", sc.single], ["Multi-core", sc.multi], ["Rendering", sc.render], ["Memory", sc.mem]].forEach(function (x) { sg.appendChild(ui.stat(x[0], String(x[1]))); });
    Sx.appendChild(sg);
    note(Sx, "Single-core is a proxy (70% gaming score, 30% boost clock). Rendering blends GPU and multi-core scores. Overall weights the workload mode: gaming favors the GPU, productivity favors the CPU. All are heuristics.");
    var W = ui.panel("Workload benchmark analysis", "how this build suits each task"); box.appendChild(W);
    table(W, ["Workload", "Category", "Estimated score", "Reading"], BCP.software.items.map(function (s) {
      var v = (s.cpuImp * sc.multi + s.gpuImp * sc.gpu) / Math.max(0.01, s.cpuImp + s.gpuImp);
      return [s.name, s.category, String(Math.round(v)), v >= 90 ? "Excellent" : v >= 65 ? "Strong" : v >= 40 ? "Fine" : "Slow"];
    }));
    var H = ui.panel("Benchmark history", "snapshots saved on this device"); box.appendChild(H);
    var b = el("button", "hb-btn", "Save snapshot of this build"); b.type = "button";
    b.addEventListener("click", function () { S.hist.unshift({ t: new Date().toISOString().slice(0, 16).replace("T", " "), cpu: sel.cpu.name, gpu: sel.gpu.name, res: RES[sel.res], overall: sc.overall, fps: Math.round(mean), stab: stab }); S.hist = S.hist.slice(0, 20); ui.set("lab.hist", S.hist); box.innerHTML = ""; perf(box); });
    H.appendChild(b);
    if (S.hist.length) table(H, ["Saved", "CPU", "GPU", "Res", "Overall", "Avg FPS", "Stability"], S.hist.map(function (h) { return [h.t, h.cpu, h.gpu, h.res, String(h.overall), h.fps + " fps", String(h.stab)]; }));
    else note(H, "No snapshots yet. Save one, change a part in the Calculator, then save again to compare.");
  }

  /* ---------- Simulators ---------- */
  function sim(box) {
    var sel = BCP.getSelection(), P = ui.panel("CPU and GPU simulators", "swap a part, see the difference"); box.appendChild(P);
    var cpus = BCP.cpus.items.filter(function (x) { return !x.legacy && !x.mobile && cb(x).gaming; });
    var gpus = BCP.gpus.items.filter(function (x) { return !x.legacy && !x.mobile && gs(x); });
    var cid = S.sim.cpu || sel.cpu.id, gid = S.sim.gpu || sel.gpu.id;
    var f = el("div", "hb-form");
    f.appendChild(ui.field("Simulated CPU", ui.select(cpus.map(function (x) { return [x.id, x.name]; }), cid, function (v) { S.sim.cpu = v; ui.set("lab.sim", S.sim); box.innerHTML = ""; sim(box); })));
    f.appendChild(ui.field("Simulated GPU", ui.select(gpus.map(function (x) { return [x.id, x.name]; }), gid, function (v) { S.sim.gpu = v; ui.set("lab.sim", S.sim); box.innerHTML = ""; sim(box); })));
    P.appendChild(f);
    var nc = BCP.cpus.items.find(function (x) { return x.id === cid; }) || sel.cpu, ng = BCP.gpus.items.find(function (x) { return x.id === gid; }) || sel.gpu;
    var a = rows(sel), bb = BCP.games.items.map(function (g) { return { g: g, m: gameModel(g, nc, ng, sel.ram, sel.res, sel.workload) }; });
    var avgA = a.reduce(function (s, r) { return s + r.m.avg; }, 0) / a.length, avgB = bb.reduce(function (s, r) { return s + r.m.avg; }, 0) / bb.length;
    var st = el("div", "pw-stats");
    st.appendChild(ui.stat("Current avg FPS", Math.round(avgA) + " fps")); st.appendChild(ui.stat("Simulated avg FPS", Math.round(avgB) + " fps"));
    st.appendChild(ui.stat("Change", (avgB >= avgA ? "+" : "") + Math.round((avgB / avgA - 1) * 100) + "%", avgB >= avgA ? "hb-good" : "hb-bad"));
    st.appendChild(ui.stat("Gaming score", Math.round(cb(sel.cpu).gaming) + " to " + Math.round(cb(nc).gaming))); st.appendChild(ui.stat("GPU score", Math.round(gs(sel.gpu)) + " to " + Math.round(gs(ng))));
    P.appendChild(st);
    var bn = eng.bottleneck(cb(nc), gs(ng), sel.res, sel.workload, nc);
    P.appendChild(el("p", "muted", "Simulated pair at " + RES[sel.res] + ": " + (bn.limiter === "cpu" ? "CPU" : "GPU") + " is the limit, bottleneck about " + Math.round(bn.pct) + "%."));
    table(P, ["Game", "Current", "Simulated"], a.map(function (r, i) { return [r.g.name, r.m.avg + " fps", bb[i].m.avg + " fps"]; }));

    var G = ui.panel("Game settings simulator", "preset effect on the current build"); box.appendChild(G);
    var PRE = [["Low", 1.7], ["Medium", 1.35], ["High", 1.12], ["Ultra", 1.0]];
    table(G, ["Game"].concat(PRE.map(function (p) { return p[0]; })), BCP.games.items.map(function (g) {
      return [g.name].concat(PRE.map(function (p) { return gameModel(g, sel.cpu, sel.gpu, sel.ram, sel.res, sel.workload, p[1]).avg + " fps"; }));
    }));
    note(G, "Lower presets only lift the GPU side, so CPU-limited games gain little. Preset multipliers are rough averages (about 1.7x Low, 1.35x Medium, 1.12x High), not per-game measurements.");

    var O = ui.panel("Build optimization simulator", "best single upgrade for the money"); box.appendChild(O);
    var curP = BCP.prices.cpu[sel.cpu.id] || 0, curG = BCP.prices.gpu[sel.gpu.id] || 0, opts = [];
    cpus.forEach(function (x) { var p = BCP.prices.cpu[x.id]; if (!p || x.id === sel.cpu.id || x.socket !== sel.cpu.socket) return; var m = BCP.games.items.reduce(function (s, g) { return s + gameModel(g, x, sel.gpu, sel.ram, sel.res, sel.workload).avg; }, 0) / BCP.games.items.length; opts.push({ n: "CPU: " + x.name, d: p - curP, fps: m - avgA }); });
    gpus.forEach(function (x) { var p = BCP.prices.gpu[x.id]; if (!p || x.id === sel.gpu.id) return; var m = BCP.games.items.reduce(function (s, g) { return s + gameModel(g, sel.cpu, x, sel.ram, sel.res, sel.workload).avg; }, 0) / BCP.games.items.length; opts.push({ n: "GPU: " + x.name, d: p - curG, fps: m - avgA }); });
    var good = opts.filter(function (o) { return o.fps > 2 && o.d > 0; }).sort(function (a, b) { return b.fps / b.d - a.fps / a.d; }).slice(0, 6);
    if (good.length) table(O, ["Swap", "Extra cost", "Avg FPS gain", "FPS per $100"], good.map(function (o) { return [o.n, ui.usd(o.d), "+" + Math.round(o.fps) + " fps", (o.fps / o.d * 100).toFixed(1)]; }));
    else O.appendChild(el("p", "muted", "No same-socket CPU or GPU swap adds a meaningful gain at this resolution."));
    note(O, "Uses the curated price layer and the FPS model. CPU swaps are limited to the same socket so the board stays valid.");

    var L = ui.panel("Power load simulator", "wall draw at chosen loads"); box.appendChild(L);
    var pf = BCP.powerFigures(sel), cl = S.sim.cl == null ? 60 : S.sim.cl, gl = S.sim.gl == null ? 90 : S.sim.gl;
    var f2 = el("div", "hb-form");
    f2.appendChild(ui.field("CPU load %", ui.number(cl, 0, 100, 5, function (v) { S.sim.cl = v; ui.set("lab.sim", S.sim); upd(); })));
    f2.appendChild(ui.field("GPU load %", ui.number(gl, 0, 100, 5, function (v) { S.sim.gl = v; ui.set("lab.sim", S.sim); upd(); })));
    L.appendChild(f2); var out = el("div", "pw-stats"); L.appendChild(out);
    function upd() {
      var c = S.sim.cl == null ? 60 : S.sim.cl, g = S.sim.gl == null ? 90 : S.sim.gl, rest = pf.gaming - sel.cpu.tdpW * 0.85 - sel.gpu.tdpW * 0.9;
      var w = Math.round(pf.idle * 0.6 + sel.cpu.tdpW * 0.85 * c / 100 + sel.gpu.tdpW * 0.9 * g / 100 + rest * 0.5);
      out.innerHTML = ""; out.appendChild(ui.stat("Estimated draw", "~" + w + "W")); out.appendChild(ui.stat("PSU load", Math.round(w / sel.psu.wattageW * 100) + "% of " + sel.psu.wattageW + "W")); out.appendChild(ui.stat("Idle / gaming / peak", pf.idle + " / " + pf.gaming + " / " + pf.peak + "W"));
    }
    upd(); note(L, "Linear load model on the same TDP figures as the Power tab. Real draw varies with the game and power limits.");
  }

  /* ---------- Estimators ---------- */
  var VR = { p1080: [4, 6, 8], p1440: [5, 8, 10], p2160: [7, 10, 13] };
  function est(box) {
    var sel = BCP.getSelection(), P;
    // VRAM
    P = ui.panel("VRAM usage estimator", sel.gpu.name + " has " + sel.gpu.vramGB + " GB"); box.appendChild(P);
    table(P, ["Resolution", "Medium textures", "High", "Ultra", "Ultra + ray tracing"], Object.keys(VR).map(function (k) {
      var v = VR[k]; function c(x) { return x + " GB " + (x <= sel.gpu.vramGB ? "(fits)" : "(short)"); }
      return [RES[k], c(v[0]), c(v[1]), c(v[2]), c(v[2] + 2)];
    }));
    note(P, "Typical demanding-game ranges for recent titles. Individual games vary a lot. Short VRAM shows up as stutter and lower lows.");
    // RAM + bandwidth
    var ram = sel.ram; P = ui.panel("RAM usage and memory bandwidth", ram ? ram.name : "no kit selected"); box.appendChild(P);
    var rt = [["Gaming only", 10], ["Gaming + browser + chat", 14], ["Streaming while gaming", 18], ["Video editing 4K", 24], ["Virtual machines / dev", 32], ["Heavy 3D / compositing", 48]];
    if (ram) {
      table(P, ["Scenario", "Typical use", "Verdict"], rt.map(function (r) { return [r[0], "~" + r[1] + " GB", r[1] <= ram.capacityGB * 0.85 ? "Comfortable" : r[1] <= ram.capacityGB ? "Tight" : "Short on " + ram.capacityGB + " GB"]; }));
      var ch = ram.modules >= 2 ? 2 : 1, bw = ram.speedMTs * 8 * ch / 1000;
      var st = el("div", "pw-stats"); st.appendChild(ui.stat("Channels", String(ch))); st.appendChild(ui.stat("Peak bandwidth", "~" + ui.num(bw, 0) + " GB/s")); st.appendChild(ui.stat("Speed", ram.speedMTs + " MT/s")); P.appendChild(st);
      note(P, "Bandwidth is the theoretical peak (MT/s x 8 bytes x channels). Real sustained throughput is lower. Typical-use figures are rules of thumb.");
    }
    // Storage
    P = ui.panel("Storage workload analysis", sel.storage.name); box.appendChild(P);
    var rd = sel.storage.readMBs, real = rd * 0.65;
    table(P, ["Task", "Size", "Estimated time"], [["Load a 60 GB game's assets", "20 GB read", Math.max(1, Math.round(20000 / real)) + " s"], ["Copy a 100 GB game library", "100 GB", (100000 / real / 60).toFixed(1) + " min"], ["Open a 4K project (50 GB cache)", "50 GB", Math.round(50000 / real) + " s"], ["Windows boot", "about 4 GB", Math.max(6, Math.round(4000 / real + 8)) + " s"]]);
    note(P, "Uses 65% of the drive's rated sequential read as the real-world rate. Small-file and write-heavy loads are slower than this.");
    // Utilization
    P = ui.panel("Hardware utilization", RES[sel.res] + ", estimated per game"); box.appendChild(P);
    table(P, ["Game", "GPU use", "CPU use", "Reading"], rows(sel).map(function (r) {
      var gu = clamp(r.m.cpuTerm / r.m.gpuRel, 0, 1), cu = clamp(r.m.gpuRel / r.m.cpuTerm, 0, 1) * (0.35 + 0.5 * BCP.games.items.filter(function (g) { return g === r.g; })[0].cpuWeight);
      return [r.g.name, Math.round(gu * 100) + "%", Math.round(cu * 100) + "%", gu < 0.9 ? "CPU-bound, GPU waits" : "GPU-bound, CPU has room"];
    }));
    note(P, "Utilization follows the bottleneck model: the slower side sets the frame rate and the other side idles. Treat it as a direction, not a monitor reading.");
  }

  /* ---------- Workloads ---------- */
  function work(box) {
    var sel = BCP.getSelection(), sc = scores(sel), P = ui.panel("Rendering and export time", "versus the reference rig"); box.appendChild(P);
    var M = S.sim.ref || 10, f = el("div", "hb-form");
    f.appendChild(ui.field("Job time on the reference rig (min)", ui.number(M, 1, 600, 1, function (v) { S.sim.ref = v; ui.set("lab.sim", S.sim); box.innerHTML = ""; work(box); }), "RTX 4090 + 9950X class"));
    P.appendChild(f);
    var ids = ["sw-blender", "sw-premiere", "sw-resolve", "sw-ps"], out = [];
    ids.forEach(function (id) { var s = BCP.software.items.find(function (x) { return x.id === id; }); if (!s) return;
      var v = (s.cpuImp * sc.multi + s.gpuImp * sc.gpu) / (s.cpuImp + s.gpuImp) / 100; out.push([s.name, Math.round(v * 100) + "%", (M / Math.max(0.05, v)).toFixed(1) + " min"]); });
    table(P, ["Software", "Speed vs reference", "Estimated time"], out);
    note(P, "Time scales inversely with a CPU/GPU blend weighted by how much each program uses them. Real jobs depend on codec, scene and plugins.");
    P = ui.panel("AI and machine-learning estimator", sel.gpu.name + ", " + sel.gpu.vramGB + " GB VRAM"); box.appendChild(P);
    var v = sel.gpu.vramGB;
    table(P, ["Model size (4-bit)", "VRAM needed", "Fits on GPU", "Relative speed"], [["7B-8B", 6, 0], ["13B-14B", 10, 0], ["32B", 20, 0], ["70B", 40, 0]].map(function (m) {
      var fits = m[1] <= v; return [m[0], "~" + m[1] + " GB", fits ? "Yes" : "No, needs CPU offload", fits ? Math.round(sc.gpu) + "% of 4090 class" : "much slower"];
    }));
    note(P, "VRAM is the first limit for local models. Needs are 4-bit quantized estimates including context. Training needs far more memory than inference.");
    P = ui.panel("Streaming and recording", "gaming while capturing"); box.appendChild(P);
    var th = sel.cpu.threads, nv = sel.gpu.brand === "NVIDIA" ? "NVENC" : sel.gpu.brand === "AMD" ? "AMF/VCN" : "QuickSync/Arc encoder";
    var hit = clamp(Math.round(6 + (12 - Math.min(12, th)) * 1.2), 4, 20);
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("GPU encoder", nv)); st.appendChild(ui.stat("FPS cost, GPU encoder", "~5 to 8%")); st.appendChild(ui.stat("FPS cost, CPU x264", "~" + hit + "% (" + th + " threads)"));
    st.appendChild(ui.stat("Recording 1440p60", sel.gpu.vramGB >= 8 ? "Smooth" : "Possible, lower settings")); P.appendChild(st);
    note(P, "Hardware encoding is the better choice on any recent GPU. Percentages are rules of thumb that grow with fewer CPU threads.");
    P = ui.panel("Virtual machines, servers and multitasking", sel.cpu.threads + " threads, " + (sel.ram ? sel.ram.capacityGB : "?") + " GB RAM"); box.appendChild(P);
    var rg = sel.ram ? sel.ram.capacityGB : 16, vms = Math.max(0, Math.min(Math.floor((th - 2) / 2), Math.floor((rg - 8) / 4)));
    var cont = Math.max(0, Math.min(th * 2, Math.floor((rg - 6) / 0.5)));
    var st2 = el("div", "pw-stats"); st2.appendChild(ui.stat("Comfortable VMs (2 vCPU, 4 GB)", String(vms))); st2.appendChild(ui.stat("Light containers", "~" + cont));
    st2.appendChild(ui.stat("Multitasking", th >= 16 && rg >= 32 ? "Heavy: game + stream + browser + editor" : th >= 8 && rg >= 16 ? "Good: game + browser + chat" : "Basic: one heavy app at a time")); P.appendChild(st2);
    note(P, "Leaves 2 threads and 8 GB for the host. Based on thread and memory counts only, not storage or network limits.");
  }

  BCP.addHub({ key: "lab", label: "Lab", before: "dash", title: "Test the build.", intro: "Frame-rate lows, scores, simulators and workload estimators. All heuristics from the curated benchmark layer, with ranges shown.",
    subs: [{ id: "perf", label: "Performance", render: perf }, { id: "sim", label: "Simulators", render: sim }, { id: "est", label: "Estimators", render: est }, { id: "work", label: "Workloads", render: work }] });
})();
