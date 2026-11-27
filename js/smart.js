/* ============================================================
 * SMART HUB - rule-based recommendation engine ("smart", not an LLM; the
 * optional LLM chat stays in the Assistant box). Natural-language build
 * finder, build rating and troubleshooting, and the gaming toolkit
 * (presets, upscalers, ray tracing, VR, high-refresh, rankings).
 * Everything is a labeled estimate from the curated layers.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP, ui = BCP.ui, eng = BCP.engine, el = ui.el;
  var RES = { p1080: "1080p", p1440: "1440p", p2160: "4K" };
  var S = { q: ui.get("sm.q", "gaming PC under $1200 for Fortnite at 1440p"), sym: ui.get("sm.sym", "fps"), game: ui.get("sm.game", ""), hz: ui.get("sm.hz", 144), pre: ui.get("sm.pre", "balanced"), a: ui.get("sm.a", ""), b: ui.get("sm.b", "") };
  function cb(c) { return BCP.benchmarks.cpu[c.id]; }
  function gsc(g) { return BCP.benchmarks.gpu[g.id]; }
  function table(P, head, rows) {
    var t = el("table", "cmp-table lab-table"), h = el("tr"); head.forEach(function (x) { h.appendChild(el("th", null, x)); }); t.appendChild(h);
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (c, i) { var td = el(i ? "td" : "th"); if (c && c.nodeType) td.appendChild(c); else td.textContent = String(c); tr.appendChild(td); }); t.appendChild(tr); });
    var w = el("div", "lab-scroll"); w.appendChild(t); P.appendChild(w);
  }
  function note(P, t) { P.appendChild(ui.note(t)); }
  function gpuKind(g) { var n = g.name; return /GeForce RTX 50/.test(n) ? "rtx50" : /GeForce RTX 40/.test(n) ? "rtx40" : /GeForce RTX/.test(n) ? "rtx" : /Radeon RX (9|7)/.test(n) ? "amd-new" : /Radeon/.test(n) ? "amd" : /Arc/.test(n) ? "arc" : "old"; }
  function rtCost(g) { var k = gpuKind(g); return k === "rtx50" ? 0.30 : k === "rtx40" ? 0.35 : k === "rtx" ? 0.45 : k === "amd-new" ? 0.45 : k === "amd" ? 0.6 : k === "arc" ? 0.5 : 0.8; }
  function fpsOf(sel, game, cpu, gpu, res, boost) { return eng.gameFpsUpscaled(game, cb(cpu).gaming, gsc(gpu), res, sel.workload, boost || 1, gpu.vramGB); }
  function loadCode(sel, b, res, wl) { var code = [b.cpu.id, b.gpu.id, b.mobo.id, b.ram.id, b.psu.id, b.cooler.id, sel.case_ ? sel.case_.id : "", b.storage.id, res, wl].join(","); if (BCP.applyBuildCode) { BCP.applyBuildCode(code); document.querySelector('.tab-btn[data-view="calc"]').click(); } }

  /* ---------- Ask / find ---------- */
  function parse(q) {
    var s = q.toLowerCase(), o = { budget: null, wl: "gaming", res: null, game: null, esports: false };
    var m = s.match(/\$\s?(\d[\d,]*)|(\d[\d,]{2,5})\s*(?:\$|usd|dollars?|bucks)|(?:under|below|budget|around|max|up to)\s*(\d[\d,]{2,5})/);
    if (m) o.budget = parseInt((m[1] || m[2] || m[3]).replace(/,/g, ""), 10);
    if (/stream/.test(s)) o.wl = "streaming"; else if (/edit|render|blender|workstation|productiv|3d |coding|program|compile|premiere|davinci|video work/.test(s)) o.wl = "productivity";
    if (/4k|2160|uhd/.test(s)) o.res = "p2160"; else if (/1440|2k|qhd/.test(s)) o.res = "p1440"; else if (/1080|fhd|full hd/.test(s)) o.res = "p1080";
    BCP.games.items.forEach(function (g) { var w = g.name.toLowerCase().replace(/\(.*\)/, "").trim(); if (s.indexOf(w) >= 0 || s.indexOf(w.split(" ")[0]) >= 0 && w.split(" ")[0].length > 4) o.game = g; });
    if (/esport|competitive|fps game|high refresh|240|360|cs2|counter|valorant/.test(s)) o.esports = true;
    return o;
  }
  function ask(box) {
    var sel = BCP.getSelection(), rer = function () { box.innerHTML = ""; ask(box); }, P = ui.panel("Ask in plain words", "natural-language build finder, rule-based"); box.appendChild(P);
    var i = el("input"); i.type = "text"; i.value = S.q; i.placeholder = "e.g. 4K video editing PC under $2500"; i.className = "sm-q";
    var go = el("button", "hb-btn", "Find builds"); go.type = "button"; go.addEventListener("click", function () { S.q = i.value; ui.set("sm.q", S.q); rer(); }); i.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    var row = el("div", "hb-form"); row.appendChild(i); row.appendChild(go); P.appendChild(row);
    var o = parse(S.q), res = o.res || (o.esports ? "p1080" : sel.res), budget = o.budget || 1200;
    P.appendChild(el("p", "muted", "Understood: " + (o.wl === "productivity" ? "productivity" : o.wl) + ", " + RES[res] + ", budget " + ui.usd(budget) + (o.budget ? "" : " (default, none found)") + (o.game ? ", game " + o.game.name : "") + (o.esports ? ", competitive focus" : "")));
    var builds = eng.generateBuilds(budget, o.wl, res, 3), R = ui.panel("Recommended builds", "best balanced parts within the budget"); box.appendChild(R);
    if (!builds.length) R.appendChild(el("p", "muted", "No catalog build fits this budget. Try raising it."));
    builds.forEach(function (b, k) {
      var d = el("div", "adv-block"); d.appendChild(el("h3", null, "Option " + (k + 1) + ": " + b.cpu.name + " + " + b.gpu.name + " - " + ui.usd(b.total)));
      d.appendChild(el("p", "muted", [b.mobo.name, b.ram.name, b.storage.name, b.psu.name, b.cooler.name].join(" , ")));
      var g = o.game || BCP.games.items.filter(function (x) { return /Fortnite|Cyberpunk/.test(x.name); })[o.esports ? 0 : 1] || BCP.games.items[0];
      if (o.esports) g = BCP.games.items.filter(function (x) { return /Counter|Valorant/.test(x.name); })[0] || g;
      var fp = o.wl === "productivity" ? null : eng.gameFps(g, cb(b.cpu).gaming, gsc(b.gpu), res, o.wl, b.gpu.vramGB);
      d.appendChild(el("p", null, (fp ? g.name + " about " + fp + " fps at " + RES[res] + ". " : "") + "Bottleneck " + b.pct + "% (" + b.limiter + "). Why: highest balanced score within budget" + (k ? ", different GPU for variety." : ".")));
      var lb = el("button", "hb-btn ghost", "Load in Calculator"); lb.type = "button"; lb.addEventListener("click", function () { loadCode(sel, b, res, o.wl); }); d.appendChild(lb); R.appendChild(d);
    });
    note(R, "Builds come from the same engine as the Calculator, using curated prices and the benchmark layer. The question parser is keyword-based: it understands budget, workload, resolution and game names. It is not a language model.");
    var C = ui.panel("Hardware comparison in words", "pick two parts"); box.appendChild(C);
    var gpus = BCP.gpus.items.filter(function (x) { return !x.mobile && gsc(x); }).sort(function (x, y) { return gsc(y) - gsc(x); }), opts = gpus.map(function (x) { return [x.id, x.name]; });
    var a = S.a || gpus[6].id, b2 = S.b || gpus[12].id, f = el("div", "hb-form");
    f.appendChild(ui.field("GPU A", ui.select(opts, a, function (v) { S.a = v; ui.set("sm.a", v); rer(); }))); f.appendChild(ui.field("GPU B", ui.select(opts, b2, function (v) { S.b = v; ui.set("sm.b", v); rer(); }))); C.appendChild(f);
    var A = gpus.filter(function (x) { return x.id === a; })[0], B = gpus.filter(function (x) { return x.id === b2; })[0], pa = BCP.prices.gpu[A.id], pb = BCP.prices.gpu[B.id];
    var fast = gsc(A) >= gsc(B) ? [A, B] : [B, A], gain = Math.round((gsc(fast[0]) / gsc(fast[1]) - 1) * 100);
    C.appendChild(el("p", null, fast[0].name + " is about " + gain + "% faster than " + fast[1].name + " (score " + Math.round(gsc(fast[0])) + " vs " + Math.round(gsc(fast[1])) + ")." + (pa && pb ? " It costs " + (BCP.prices.gpu[fast[0].id] >= BCP.prices.gpu[fast[1].id] ? ui.usd(BCP.prices.gpu[fast[0].id] - BCP.prices.gpu[fast[1].id]) + " more" : ui.usd(BCP.prices.gpu[fast[1].id] - BCP.prices.gpu[fast[0].id]) + " less") + ". " + (fast[0].vramGB !== fast[1].vramGB ? "VRAM: " + fast[0].vramGB + " GB vs " + fast[1].vramGB + " GB. " : "") + "Better value per dollar: " + ((gsc(A) / pa) >= (gsc(B) / pb) ? A.name : B.name) + "." : "")));
  }

  /* ---------- Review / troubleshoot ---------- */
  function review(box) {
    var sel = BCP.getSelection(), rer = function () { box.innerHTML = ""; review(box); }, h = eng.buildHealth(sel), bn = eng.bottleneck(cb(sel.cpu), gsc(sel.gpu), sel.res, sel.workload, sel.cpu);
    var P = ui.panel("Build rating", "from the build health score"); box.appendChild(P);
    var sc = h ? h.score : 0, grade = sc >= 90 ? "A" : sc >= 80 ? "B" : sc >= 65 ? "C" : sc >= 50 ? "D" : "F";
    var st = el("div", "pw-stats"); st.appendChild(ui.stat("Rating", grade)); st.appendChild(ui.stat("Health score", sc + "/100")); st.appendChild(ui.stat("Bottleneck", bn.pct + "% " + bn.limiter)); P.appendChild(st);
    var verdict = grade <= "B" ? "A well-balanced build." : "Fixable issues below.";
    var sg = (h ? h.tips : []).slice(); var adv = []; if (sel.psu.wattageW < eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW)) adv.push("PSU is below the recommended wattage. Replace it before anything else."); if (sel.ram && sel.ram.modules < 2) adv.push("Use a dual-channel kit."); if (sel.storage.capacityGB < 1000) adv.push("Move to a 1 TB or larger drive.");
    P.appendChild(el("p", "adv-score", verdict)); var ul = el("ul", "hb-list"); sg.concat(adv).forEach(function (t) { ul.appendChild(el("li", null, t)); }); if (!ul.children.length) ul.appendChild(el("li", null, "No improvement stands out.")); P.appendChild(ul);
    var X = ui.panel("Bottleneck, explained", "plain English"); box.appendChild(X);
    var other = bn.limiter === "cpu" ? "GPU" : "CPU";
    X.appendChild(el("p", null, bn.limiter === "balanced" ? "The CPU and GPU are well matched at " + RES[sel.res] + ". Neither waits on the other." : "At " + RES[sel.res] + " the " + bn.limiter.toUpperCase() + " is the slower side. The " + other + " could do about " + bn.pct + "% more, but it spends that time waiting. " + (bn.limiter === "cpu" ? "A higher resolution or heavier settings would shift work to the GPU and shrink the gap." : "That is the healthy case for gaming: the GPU is working at full tilt.")));
    var pred = BCP.games.items.map(function (g) { return eng.gameFps(g, cb(sel.cpu).gaming, gsc(sel.gpu), sel.res, sel.workload, sel.gpu.vramGB); }).sort(function (a, b) { return a - b; });
    X.appendChild(el("p", "muted", "Performance prediction at " + RES[sel.res] + ": median " + pred[Math.floor(pred.length / 2)] + " fps, from " + pred[0] + " in the heaviest game to " + pred[pred.length - 1] + " in the lightest (plus or minus 12%)."));
    var T = ui.panel("Troubleshooting", "pick a symptom"); box.appendChild(T);
    var SYM = [["fps", "Low FPS or stutter"], ["crash", "Crashes or random restarts"], ["hot", "High temperatures or loud fans"], ["boot", "Will not boot or no display"], ["ram", "Memory runs below rated speed"]];
    T.appendChild(ui.field("Symptom", ui.select(SYM, S.sym, function (v) { S.sym = v; ui.set("sm.sym", v); rer(); })));
    var tips = [];
    if (S.sym === "fps") { tips.push(bn.limiter === "cpu" ? "The CPU limits this build (" + bn.pct + "%). Lower CPU-heavy settings (crowds, view distance) or raise resolution." : "The GPU is the limit. Lower settings or use an upscaler (DLSS, FSR or XeSS)."); if (sel.ram && sel.ram.modules < 2) tips.push("Memory is single-channel. Install a second stick for matched dual channel."); if (sel.ram) tips.push("Enable XMP/EXPO in the BIOS. Kits run at a slow default speed until you do."); if (sel.gpu.vramGB <= 8) tips.push(sel.gpu.vramGB + " GB VRAM is tight for high textures at " + RES[sel.res] + ". Drop texture quality one step."); tips.push("Check the monitor is connected to the GPU, not the motherboard, and Windows power plan is Balanced or High performance."); }
    if (S.sym === "crash") { var rec = eng.recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW); tips.push("PSU: " + sel.psu.wattageW + "W against ~" + BCP.powerFigures(sel).peak + "W estimated peak" + (sel.psu.wattageW < rec ? " is under the " + rec + "W recommendation, a top crash cause." : " has room.")); tips.push("Reseat the GPU power cables fully, and use separate cables per connector if the GPU has two or more."); tips.push("Run memory at stock speed (disable XMP) for a test. Unstable memory settings crash games."); tips.push("Update the GPU driver with a clean install and update the BIOS."); }
    if (S.sym === "hot") { var hd = sel.cooler.tdpRatingW - sel.cpu.tdpW; tips.push("CPU cooler headroom: " + hd + "W (" + sel.cooler.name + ")" + (hd < 40 ? ", low. A larger cooler would lower temps and noise." : ", fine.")); tips.push("Check the cooler is seated with the plastic film removed and fans point the right way."); tips.push("Set a fan curve with a smooth ramp (see Advisor, Cooling and airflow)."); tips.push("Make sure the case has at least two intake fans and one exhaust, and clean dust filters."); }
    if (S.sym === "boot") { tips.push("Check the 8-pin CPU power cable is connected on the top of the board."); tips.push("Reseat RAM firmly until both clips click. Try one stick in slot A2."); tips.push("Plug the monitor into the GPU output."); if (sel.mobo && /A320|B350|X370/.test(sel.mobo.chipset || "") && sel.cpu.socket === "AM4") tips.push("Older " + sel.mobo.chipset + " board: the BIOS may not support " + sel.cpu.name + ". Update the BIOS with a supported CPU."); tips.push("Check the front panel power switch cable and the PSU switch."); }
    if (S.sym === "ram") { tips.push("Enable XMP or EXPO in the BIOS, otherwise memory runs at its slow default speed."); if (sel.ram && sel.mobo) tips.push(sel.ram.name + " on " + sel.mobo.name + ": " + (sel.ram.type === sel.mobo.ramType ? "types match." : "TYPE MISMATCH, this will not work.")); tips.push("Use slots A2 and B2 for two sticks."); }
    var ul2 = el("ol", "hb-list"); tips.forEach(function (t) { ul2.appendChild(el("li", null, t)); }); T.appendChild(ul2); note(T, "Checks ordered from most to least likely, tailored to your selected parts. General guidance, not a diagnosis.");
    var C = ui.panel("Compatibility assistant", "what the engine found, in plain words"); box.appendChild(C);
    var w = eng.partCompatibility(sel.cpu, sel.gpu, sel.mobo, sel.ram, sel.psu, sel.workload, bn, sel.cooler, sel.case_, sel.res), bad = w.filter(function (x) { return x.level === "bad"; }), warn = w.filter(function (x) { return x.level === "warn"; });
    C.appendChild(el("p", null, bad.length ? bad.length + " blocking problem(s) found. Fix before buying." : warn.length ? "No blocking problems, but " + warn.length + " warning(s) worth reading." : "No problems found. These parts should work together."));
    var u3 = el("ul", "hb-list"); bad.concat(warn).forEach(function (x) { u3.appendChild(el("li", null, x.text)); }); C.appendChild(u3);
    var Sh = ui.panel("Shopping assistant", "buy in this order"); box.appendChild(Sh);
    var order = [["Power supply", sel.psu], ["Motherboard", sel.mobo], ["CPU", sel.cpu], ["GPU", sel.gpu], ["Memory", sel.ram], ["Storage", sel.storage], ["Cooler", sel.cooler], ["Case", sel.case_]].filter(function (x) { return x[1]; });
    var tot = 0; table(Sh, ["Step", "Part", "Est. price"], order.map(function (x, i) { var p = x[1].priceUSD || BCP.prices.cpu[x[1].id] || BCP.prices.gpu[x[1].id] || 0; tot += p; return [(i + 1) + ". " + x[0], x[1].name, p ? ui.usd(p) : "-"]; }));
    Sh.appendChild(el("p", "adv-score", "Estimated total: " + ui.usd(tot)));
    note(Sh, "Order: confirm the PSU and board first (they gate everything), then the big-ticket parts when prices look good, then the rest. Curated estimates, not a live quote.");
  }

  /* ---------- Gaming ---------- */
  function gaming(box) {
    var sel = BCP.getSelection(), rer = function () { box.innerHTML = ""; gaming(box); }, g0 = BCP.games.items.filter(function (x) { return x.id === S.game; })[0] || BCP.games.items[0];
    var P = ui.panel("Game performance finder", "one game, every resolution"); box.appendChild(P);
    P.appendChild(ui.field("Game", ui.select(BCP.games.items.map(function (x) { return [x.id, x.name]; }), g0.id, function (v) { S.game = v; ui.set("sm.game", v); rer(); })));
    table(P, ["Resolution", "Native", "Quality upscale", "Performance upscale", "Ray tracing on"], ["p1080", "p1440", "p2160"].map(function (r) { return [RES[r], fpsOf(sel, g0, sel.cpu, sel.gpu, r) + " fps", fpsOf(sel, g0, sel.cpu, sel.gpu, r, 1.5) + " fps", fpsOf(sel, g0, sel.cpu, sel.gpu, r, 2.1) + " fps", Math.round(fpsOf(sel, g0, sel.cpu, sel.gpu, r) * (1 - rtCost(sel.gpu))) + " fps"]; }));
    note(P, "Ray tracing costs about " + Math.round(rtCost(sel.gpu) * 100) + "% of FPS on " + sel.gpu.name + " (typical for its generation, heavier in some games).");
    var K = gpuKind(sel.gpu), U = ui.panel("Upscaling and frame generation", sel.gpu.name); box.appendChild(U);
    var up = [["DLSS", /rtx/.test(K), "RTX 20 series and newer"], ["FSR", true, "works on most GPUs, including older ones"], ["XeSS", true, "best on Intel Arc, runs on others"], ["Frame generation", K === "rtx40" || K === "rtx50" || K === "amd-new" || K === "amd" || K === "rtx" && false, K.indexOf("rtx") === 0 ? "DLSS 3 needs RTX 40 or newer" : "FSR 3 frame generation (game support varies)"]];
    table(U, ["Technology", "Supported", "Note"], up.map(function (x) { return [x[0], x[1] ? "Yes" : "No", x[2]]; }));
    table(U, ["Mode", "FPS gain (GPU-bound)", g0.name + " @ " + RES[sel.res]], [["Quality", "about 1.5x", fpsOf(sel, g0, sel.cpu, sel.gpu, sel.res, 1.5) + " fps"], ["Balanced", "about 1.75x", fpsOf(sel, g0, sel.cpu, sel.gpu, sel.res, 1.75) + " fps"], ["Performance", "about 2.1x", fpsOf(sel, g0, sel.cpu, sel.gpu, sel.res, 2.1) + " fps"]].concat(up[3][1] ? [["Frame generation on top", "up to 1.6x shown FPS", Math.round(fpsOf(sel, g0, sel.cpu, sel.gpu, sel.res, 1.5) * 1.6) + " fps (adds latency)"]] : []));
    note(U, "Upscaling only speeds up the GPU side, so CPU-limited games gain less. Frame generation raises displayed FPS, not responsiveness. XeSS and FSR gains are the same rule-of-thumb figures as DLSS here.");
    var Pr = ui.panel("Graphics preset selector and gaming profiles", "pick the lowest-effort preset that hits your target"); box.appendChild(Pr);
    var PRE = [["Low", 1.7], ["Medium", 1.35], ["High", 1.12], ["Ultra", 1.0]], tgt = S.hz; var f = el("div", "hb-form");
    f.appendChild(ui.field("Target FPS", ui.select([["60", "60"], ["90", "90"], ["144", "144"], ["240", "240"]], String(tgt), function (v) { S.hz = +v; ui.set("sm.hz", +v); rer(); })));
    Pr.appendChild(f);
    table(Pr, ["Game", "Best preset for " + S.hz + " fps", "Expected"], BCP.games.items.map(function (g) {
      var best = null; PRE.slice().reverse().forEach(function (p) { if (!best && fpsOf(sel, g, sel.cpu, sel.gpu, sel.res, p[1]) >= S.hz) best = p; });
      var top = fpsOf(sel, g, sel.cpu, sel.gpu, sel.res, 1.7); return [g.name, best ? best[0] : "Cannot reach " + S.hz + " even on Low (" + top + " fps)", best ? fpsOf(sel, g, sel.cpu, sel.gpu, sel.res, best[1]) + " fps" : "-"];
    }));
    table(Pr, ["Profile", "Settings", "Expected change"], [["Competitive", "Low textures and shadows, upscaling off, frame cap just above refresh rate", "highest FPS, lowest latency"], ["Balanced", "High preset, Quality upscaling if under 60 fps", "good look at 60 to 100 fps"], ["Cinematic", "Ultra, ray tracing on, upscaling Quality, frame generation if available", "best image, lower FPS"]]);
    var Ho = ui.panel("Competitive and high-refresh optimizer", "can this build feed the monitor?"); box.appendChild(Ho);
    var es = BCP.games.items.filter(function (g) { return /Counter|Valorant|Fortnite|Apex|Warzone|Minecraft/.test(g.name); });
    table(Ho, ["Esports game", "Low preset FPS", "144 Hz", "240 Hz", "360 Hz"], es.map(function (g) { var v = fpsOf(sel, g, sel.cpu, sel.gpu, "p1080", 1.7); return [g.name, v + " fps", v >= 144 ? "Yes" : "No", v >= 240 ? "Yes" : "No", v >= 360 ? "Yes" : "No"]; }));
    note(Ho, "At 1080p Low. Esports titles lean on the CPU, so " + sel.cpu.name + " (gaming score " + Math.round(cb(sel.cpu).gaming) + ") sets the ceiling. Esports build tip: spend on CPU and a 240 Hz monitor before a bigger GPU.");
    var V = ui.panel("VR gaming", "compatibility and estimate"); box.appendChild(V);
    var vs = gsc(sel.gpu), ok = sel.gpu.vramGB >= 8 && vs >= 40, st = el("div", "pw-stats");
    st.appendChild(ui.stat("VR ready", ok ? "Yes" : "Marginal")); st.appendChild(ui.stat("Headset class", vs >= 75 ? "High-end (Index, Quest 3 PC at max)" : vs >= 45 ? "Mid (Quest 3 PC, Reverb)" : "Entry (Quest 2 at low res)")); st.appendChild(ui.stat("Est. VR FPS", Math.round(Math.min(120, 90 * vs / 55)) + " fps")); V.appendChild(st);
    note(V, "VR renders about 2 to 3x the pixels of a 1080p screen. Estimate scales from the GPU score and VRAM and is a rough guide.");
    var Ra = ui.panel("Gaming hardware rankings", "GPUs by score at the selected resolution"); box.appendChild(Ra);
    var gl = BCP.gpus.items.filter(function (x) { return !x.mobile && !x.legacy && gsc(x); }).sort(function (a, b) { return gsc(b) - gsc(a); }).slice(0, 12);
    table(Ra, ["#", "GPU", "Score", "Avg FPS " + RES[sel.res], "Price", "FPS per $100"], gl.map(function (x, i) { var avg = BCP.games.items.reduce(function (s, g) { return s + fpsOf(sel, g, sel.cpu, x, sel.res); }, 0) / BCP.games.items.length, p = BCP.prices.gpu[x.id]; return [String(i + 1), x.name + (x.id === sel.gpu.id ? " (yours)" : ""), Math.round(gsc(x)), Math.round(avg) + " fps", p ? ui.usd(p) : "-", p ? (avg / p * 100).toFixed(1) : "-"]; }));
    note(Ra, "Uses your CPU, so CPU-limited cards cluster together. Steam and game-library syncing is not available: it needs a login to a third-party service and a backend.");
  }
  BCP.addHub({ key: "smart", label: "Smart", before: "dash", title: "Ask, rate, tune.", intro: "Describe a PC in plain words, get a rating and troubleshooting for your build, and tune games for your GPU. Rule-based and free, no AI key needed.",
    subs: [{ id: "ask", label: "Ask and find", render: ask }, { id: "review", label: "Rate and fix", render: review }, { id: "gaming", label: "Gaming toolkit", render: gaming }] });
})();
