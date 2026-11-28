/* ============================================================
 * ANALYZE HUB - deeper bottleneck analysis (per game, per software, RAM,
 * VRAM, multitasking, fixes, history) plus memory profile, M.2 slot and
 * PSU efficiency checks. All derived from the engine and catalog data;
 * results are estimates, labeled as such.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gs(g) { return BCP.benchmarks.gpu[g.id]; }
  function table(P, head, rows) { var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h); rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { tr.appendChild(el(i ? "td" : "th", null, String(c))); }); t.appendChild(tr); }); var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w); }
  function vramNeed(g, res) { var heavy = 1 - g.cpuWeight + (g.baseFps.p1080 < 140 ? 0.3 : 0); return Math.round((res === "p2160" ? 7 : res === "p1440" ? 5 : 3) + heavy * 4); }
  function limiterFor(g, sel) {
    var c = cb(sel.cpu).gaming, gp = gs(sel.gpu), f = eng.gameFps(g, c, gp, sel.res, sel.workload, sel.gpu.vramGB);
    var fg = eng.gameFps(g, c, Math.max(gp * 1.5, gp + 40), sel.res, sel.workload, 48), fc = eng.gameFps(g, Math.max(c * 1.5, c + 40), gp, sel.res, sel.workload, sel.gpu.vramGB);
    var gg = fg / f - 1, cg = fc / f - 1, lim = Math.max(gg, cg) < 0.04 ? "balanced" : gg > cg ? "GPU" : "CPU";
    return { fps: f, lim: lim, gpuGain: Math.round(gg * 100), cpuGain: Math.round(cg * 100) };
  }

  function bottle(box) {
    var sel = BCP.getSelection(), P = ui.panel("Bottleneck breakdown", sel.cpu.name + " + " + sel.gpu.name + " at " + RES[sel.res]); box.appendChild(P);
    var bn = eng.bottleneck(cb(sel.cpu), gs(sel.gpu), sel.res, sel.workload, sel.cpu), st = el("div", "pw-stats");
    st.appendChild(ui.stat("Primary limiter", bn.limiter.toUpperCase())); st.appendChild(ui.stat("Bottleneck", bn.pct + "%"));
    var sec = [];
    if (sel.ram) {
      var mg = BCP.compat.memGuidance[sel.cpu.socket]; if (sel.ram.capacityGB < 16) sec.push(["RAM", "Under 16 GB. Modern games and browsers will swap to disk.", "high"]); else if (sel.ram.capacityGB < 32 && sel.workload === "productivity") sec.push(["RAM", sel.ram.capacityGB + " GB is tight for production work. 32 GB is the comfortable floor.", "medium"]);
      if (sel.ram.modules < 2) sec.push(["RAM", "A single stick runs single-channel, roughly half the memory bandwidth.", "medium"]);
      if (mg && sel.ram.speedMTs && sel.ram.speedMTs < mg.low) sec.push(["RAM", sel.ram.speedMTs + " MT/s is below the usual floor for this socket (" + mg.low + ").", "medium"]);
    }
    var need = Math.max.apply(null, BCP.games.items.map(function (g) { return vramNeed(g, sel.res); }));
    if (sel.gpu.vramGB < need) sec.push(["VRAM", sel.gpu.vramGB + " GB is below the heaviest game's rule-of-thumb need (" + need + " GB) at " + RES[sel.res] + ".", "medium"]);
    if (sel.psu && sel.psu.wattageW < eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW)) sec.push(["PSU", "Below the recommended wattage for this CPU and GPU.", "high"]);
    if (sel.storage && sel.storage.readMBs && sel.storage.readMBs < 1000) sec.push(["Storage", "A slow drive lengthens loading times. It does not lower FPS.", "low"]);
    st.appendChild(ui.stat("Secondary issues", String(sec.length))); P.appendChild(st);
    if (sec.length) table(P, ["Part", "Finding", "Severity"], sec); else P.appendChild(ui.note("No secondary bottleneck found: RAM, VRAM, PSU and storage all clear the checks below."));
    P.appendChild(ui.note("Primary limiter comes from the engine's CPU-versus-GPU score balance. Secondary checks are rules of thumb, not measurements."));

    var G = ui.panel("Per-game bottleneck", "which part limits each game"); box.appendChild(G);
    table(G, ["Game", "Est. FPS", "Limited by", "+FPS from a faster GPU", "+FPS from a faster CPU", "VRAM need"], BCP.games.items.map(function (g) { var r = limiterFor(g, sel), vn = vramNeed(g, sel.res); return [g.name, r.fps, r.lim, "+" + r.gpuGain + "%", "+" + r.cpuGain + "%", vn + " GB" + (sel.gpu.vramGB < vn ? " (short)" : "")]; }));
    G.appendChild(ui.note("The gain columns show how much FPS the model adds when that one part gets about 50% faster. The larger gain is the real limiter for that game. Estimates, not measurements."));

    var S = ui.panel("Per-software bottleneck", "CPU, GPU or memory focus"); box.appendChild(S);
    table(S, ["Software", "Leans on", "RAM guidance", "Your RAM", "Verdict"], BCP.software.items.map(function (w) { var lean = w.cpuImp > w.gpuImp + 0.15 ? "CPU" : w.gpuImp > w.cpuImp + 0.15 ? "GPU" : "CPU and GPU", have = sel.ram ? sel.ram.capacityGB : 0; var weak = lean === "CPU" ? cb(sel.cpu).productivity : lean === "GPU" ? gs(sel.gpu) : Math.min(cb(sel.cpu).productivity, gs(sel.gpu)); return [w.name, lean, w.ramGB + " GB", have ? have + " GB" : "unknown", (have && have < w.ramGB ? "RAM short. " : "") + (weak >= 70 ? "Strong" : weak >= 40 ? "Adequate" : "Weak") + " for the " + lean + " side"]; }));
    var M = ui.panel("Multitasking: game + stream + browser", "thread and memory headroom"); box.appendChild(M);
    var thr = sel.cpu.threads, ramG = sel.ram ? sel.ram.capacityGB : 16, load = 8 + 4 + 2;
    table(M, ["Resource", "Your build", "Comfortable target", "Verdict"], [["CPU threads", thr, "16+", thr >= 16 ? "Good" : thr >= 12 ? "Okay, expect encode cost" : "Tight"], ["RAM", ramG + " GB", "32 GB", ramG >= 32 ? "Good" : ramG >= 16 ? "Tight with many tabs" : "Short"], ["GPU encoder", sel.gpu.brand === "NVIDIA" ? "NVENC" : sel.gpu.brand === "AMD" ? "AMF/VCN" : "Quick Sync/Arc encoder", "hardware encoder", "Offloads streaming from the CPU"]]);
    M.appendChild(ui.note("Rule-of-thumb targets for a game plus an encoder plus a browser. Not measured."));

    var F = ui.panel("Bottleneck-free suggestions", "one-part swaps that bring the pair near balance"); box.appendChild(F);
    var cpuP = BCP.prices.cpu[sel.cpu.id] || 0, gpuP = BCP.prices.gpu[sel.gpu.id] || 0, opts = [];
    BCP.gpus.items.forEach(function (g) { if (g.legacy || g.mobile || !gs(g) || !BCP.prices.gpu[g.id] || g.id === sel.gpu.id) return; var b = eng.bottleneck(cb(sel.cpu), gs(g), sel.res, sel.workload, sel.cpu); if (b.pct <= 10) opts.push([("Swap GPU to " + g.name), BCP.prices.gpu[g.id] - gpuP, b.pct, gs(g) - gs(sel.gpu)]); });
    BCP.cpus.items.forEach(function (c) { if (c.legacy || c.mobile || !cb(c) || !BCP.prices.cpu[c.id] || c.id === sel.cpu.id || c.socket !== sel.cpu.socket) return; var b = eng.bottleneck(cb(c), gs(sel.gpu), sel.res, sel.workload, c); if (b.pct <= 10) opts.push([("Swap CPU to " + c.name + " (same socket)"), BCP.prices.cpu[c.id] - cpuP, b.pct, cb(c).gaming - cb(sel.cpu).gaming]); });
    opts = opts.filter(function (o) { return o[3] > 0; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 6);
    if (bn.pct <= 10) F.appendChild(ui.note("Your pair is already within 10% of balanced. No swap needed."));
    else if (!opts.length) F.appendChild(ui.note("No single-part swap in the catalog brings this pair within 10%. Try changing both parts in the Calculator."));
    else table(F, ["Change", "Extra cost", "Bottleneck after", "Score gain"], opts.map(function (o) { return [o[0], (o[1] >= 0 ? "+" : "-") + ui.usd(Math.abs(o[1])), o[2] + "%", "+" + Math.round(o[3])]; }));
    F.appendChild(ui.note("Cost uses curated prices. Only parts with a benchmark score and price are considered."));
  }

  function history(box) {
    var sel = BCP.getSelection(), P = ui.panel("Analysis history and comparison", "saved on this device"); box.appendChild(P);
    var hist = ui.get("an.hist", []), bn = eng.bottleneck(cb(sel.cpu), gs(sel.gpu), sel.res, sel.workload, sel.cpu);
    var b = el("button", "hb-btn", "Save this analysis"); b.type = "button"; b.addEventListener("click", function () { hist.unshift({ t: new Date().toISOString(), n: sel.cpu.name + " + " + sel.gpu.name, res: sel.res, wl: sel.workload, pct: bn.pct, lim: bn.limiter, cs: Math.round(cb(sel.cpu).gaming), gsc: Math.round(gs(sel.gpu)) }); ui.set("an.hist", hist.slice(0, 20)); box.innerHTML = ""; history(box); });
    P.appendChild(b);
    if (!hist.length) { P.appendChild(ui.note("Nothing saved yet. Save an analysis, change a part in the Calculator, then save again to compare.")); return; }
    table(P, ["Saved", "Build", "Setting", "Bottleneck", "CPU / GPU score"], hist.map(function (h) { return [h.t.slice(0, 16).replace("T", " "), h.n, RES[h.res] + ", " + h.wl, h.pct + "% " + h.lim, h.cs + " / " + h.gsc]; }));
    if (hist.length > 1) { var a = hist[0], z = hist[1], d = a.pct - z.pct; P.appendChild(ui.note("Latest vs previous: " + a.n + " (" + a.pct + "%) against " + z.n + " (" + z.pct + "%). " + (d < 0 ? "The newer build is better balanced by " + (-d) + " points." : d > 0 ? "The newer build is less balanced by " + d + " points." : "Same balance."))); }
    var c = el("button", "hb-btn ghost", "Clear history"); c.type = "button"; c.addEventListener("click", function () { ui.set("an.hist", []); box.innerHTML = ""; history(box); }); P.appendChild(c);
  }

  function parts(box) {
    var sel = BCP.getSelection(), P = ui.panel("Memory profile (XMP / EXPO)", "does your kit need a BIOS profile"); box.appendChild(P);
    if (!sel.ram) P.appendChild(ui.note("Pick a memory kit in the Calculator first."));
    else {
      var mg = BCP.compat.memGuidance[sel.cpu.socket] || {}, rows = [["Kit", sel.ram.name], ["Speed", sel.ram.speedMTs + " MT/s " + sel.ram.type]];
      var amd = sel.cpu.brand === "AMD", prof = amd ? "EXPO (XMP kits often work but are not guaranteed)" : "XMP";
      rows.push(["Profile to enable", sel.ram.speedMTs > 4800 && sel.ram.type === "DDR5" || sel.ram.speedMTs > 3200 && sel.ram.type === "DDR4" ? prof + ". Without it the kit runs at the JEDEC base speed." : "Runs at or near base speed. No profile needed."]);
      if (mg.low) rows.push(["Socket guidance", sel.cpu.socket + ": " + (mg.sweet || "no single sweet spot") + ". Typical range " + mg.low + " to " + mg.high + " MT/s."]);
      if (mg.high && sel.ram.speedMTs > mg.high) rows.push(["Warning", "Above the typical range for this socket. It may not hold the rated speed."]);
      if (sel.mobo && sel.mobo.ramType && sel.mobo.ramType !== sel.ram.type) rows.push(["Warning", "Motherboard takes " + sel.mobo.ramType + " but the kit is " + sel.ram.type + ". It will not fit."]);
      table(P, ["Item", "Result"], rows);
    }
    P.appendChild(ui.note("Whether a specific board runs a specific kit at its rated speed comes from the board's memory QVL, which this app does not hold. Treat this as guidance."));
    var M = ui.panel("M.2 slots and storage", "slot availability"); box.appendChild(M);
    if (!sel.mobo) M.appendChild(ui.note("Pick a motherboard in the Calculator first."));
    else { var used = 1; table(M, ["Item", "Result"], [["Motherboard", sel.mobo.name], ["M.2 slots", sel.mobo.m2Slots], ["Used by your drive", sel.storage ? sel.storage.name + (/m\.?2|nvme/i.test(sel.storage.interface || sel.storage.name) ? " (1 slot)" : " (SATA, no M.2 slot)") : "none"], ["Free M.2 slots", Math.max(0, sel.mobo.m2Slots - (sel.storage && /m\.?2|nvme/i.test((sel.storage.interface || "") + sel.storage.name) ? used : 0))], ["Memory slots", sel.mobo.ramSlots + " (max " + sel.mobo.maxRamGB + " GB)"]]); }
    M.appendChild(ui.note("Some boards share bandwidth between M.2 and SATA ports. The catalog does not store that, so check the manual before filling every slot."));

    var E = ui.panel("PSU efficiency and 80 PLUS", "wall draw and heat from your PSU"); box.appendChild(E);
    var CERT = { white: [80, 80, 80], bronze: [82, 85, 82], silver: [85, 88, 85], gold: [87, 90, 87], platinum: [90, 92, 89], titanium: [90, 94, 90] }, key = Object.keys(CERT).filter(function (k) { return new RegExp(k, "i").test(sel.psu.efficiency || sel.psu.name || ""); })[0];
    var pf = BCP.powerFigures(sel), e = key ? CERT[key] : null, rated = sel.psu.wattageW;
    function eff(loadW) { if (!e) return null; var l = loadW / rated; return l <= 0.2 ? e[0] : l <= 0.5 ? e[0] + (e[1] - e[0]) * (l - 0.2) / 0.3 : l <= 1 ? e[1] + (e[2] - e[1]) * (l - 0.5) / 0.5 : e[2]; }
    var rows2 = [["Your PSU", sel.psu.name], ["Certification", key ? "80 PLUS " + key[0].toUpperCase() + key.slice(1) : "not in the catalog entry"]];
    if (e) { rows2.push(["Minimum efficiency at 20 / 50 / 100% load (115 V)", e.join("% / ") + "%"]); [["Gaming", pf.gaming], ["Idle", pf.idle], ["Peak", pf.peak]].forEach(function (x) { var f = eff(x[1]); rows2.push([x[0] + " load " + x[1] + "W", "about " + Math.round(f) + "% efficient, " + Math.round(x[1] / f * 100) + "W from the wall, " + Math.round(x[1] / f * 100 - x[1]) + "W lost as heat"]); }); }
    table(E, ["Item", "Result"], rows2);
    E.appendChild(ui.note("80 PLUS percentages are the published minimums at 115 V, interpolated between the 20/50/100% points. Real units usually do slightly better. Load comes from the Power tab's TDP-based estimates."));
  }

  document.addEventListener("DOMContentLoaded", function () {
    BCP.addHub({ key: "analyze", label: "Analyze", before: "dash", title: "Go deeper on your build.", intro: "Per-game and per-software bottlenecks, RAM and VRAM checks, fixes that balance the pair, memory profile and PSU efficiency, for the build on the Calculator tab.",
      subs: [{ id: "bottle", label: "Bottleneck deep-dive", render: bottle }, { id: "hist", label: "History and comparison", render: history }, { id: "parts", label: "Memory, M.2 and PSU", render: parts }] });
  });
})();
