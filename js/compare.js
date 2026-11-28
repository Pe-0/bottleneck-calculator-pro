/* ============================================================
 * COMPARE — Component Comparison Center + value rankings
 * Pure rendering over the existing data layers (hardware,
 * benchmarks, prices, components). No data mutation here.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var eng = BCP.engine;
  var $ = function (sel) { return document.querySelector(sel); };

  function fmtUsd(n) { return "$" + n.toLocaleString("en-US"); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function hw(items, id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  // Average base FPS of the game database on the reference rig per
  // resolution - used to convert a GPU score into an estimated
  // average FPS, and from there into FPS-per-dollar.
  var refFps = (function () {
    var sums = { p1080: 0, p1440: 0, p2160: 0 }, n = 0;
    BCP.games.items.forEach(function (g) {
      sums.p1080 += g.baseFps.p1080; sums.p1440 += g.baseFps.p1440; sums.p2160 += g.baseFps.p2160; n++;
    });
    return { p1080: sums.p1080 / n, p1440: sums.p1440 / n, p2160: sums.p2160 / n };
  })();

  function gpuEstFps(gpuScore, resKey) {
    return Math.round(refFps[resKey] * (gpuScore / 100));
  }

  /* ---------- category definitions ---------- */
  // Each row: [label, getter(item) -> {v: comparable number|null, t: display text, betterHigh?:bool}]
  // Rows with a numeric v get a bar and a "best" highlight.

  function cpuRows(c) {
    var bench = BCP.benchmarks.cpu[c.id] || null;
    var price = BCP.prices.cpu[c.id] || null;
    return [
      ["Price (USD)",            { v: price, t: price ? fmtUsd(price) : "—", betterHigh: false }],
      ["Gaming score",           bench ? { v: bench.gaming, t: String(bench.gaming) } : { v: null, t: "—" }],
      ["Multi-core score",       bench ? { v: bench.productivity, t: String(bench.productivity) } : { v: null, t: "—" }],
      ["Gaming score per $",     bench && price ? { v: round1(bench.gaming / price * 100), t: round1(bench.gaming / price * 100) + "" } : { v: null, t: "—" }],
      ["Multi-core score per $", bench && price ? { v: round1(bench.productivity / price * 100), t: round1(bench.productivity / price * 100) + "" } : { v: null, t: "—" }],
      ["Performance per watt*",  bench ? { v: round1(bench.gaming / c.tdpW * 100), t: round1(bench.gaming / c.tdpW * 100) + "" } : { v: null, t: "—" }],
      ["Socket",                 { v: null, t: c.socket }],
      ["Architecture",           { v: null, t: c.arch || "—" }],
      ["Cores / Threads",        { v: c.cores, t: c.cores + " / " + c.threads }],
      ["Boost clock",            { v: c.boostGHz, t: c.boostGHz + " GHz" }],
      ["L3 cache",               { v: c.l3MB || null, t: c.l3MB ? c.l3MB + " MB" : "—" }],
      ["TDP",                    { v: c.tdpW, t: c.tdpW + "W", betterHigh: false }],
      ["Launch year",            { v: c.launchYear, t: String(c.launchYear) }]
    ];
  }

  function gpuRows(g) {
    var score = BCP.benchmarks.gpu[g.id] || null;
    var price = BCP.prices.gpu[g.id] || null;
    return [
      ["Price (USD)",          { v: price, t: price ? fmtUsd(price) : "—", betterHigh: false }],
      ["Raster score",         score ? { v: score, t: String(score) } : { v: null, t: "—" }],
      ["Est. avg FPS · 1080p", score ? { v: gpuEstFps(score, "p1080"), t: gpuEstFps(score, "p1080") + " fps" } : { v: null, t: "—" }],
      ["Est. avg FPS · 1440p", score ? { v: gpuEstFps(score, "p1440"), t: gpuEstFps(score, "p1440") + " fps" } : { v: null, t: "—" }],
      ["Est. avg FPS · 4K",    score ? { v: gpuEstFps(score, "p2160"), t: gpuEstFps(score, "p2160") + " fps" } : { v: null, t: "—" }],
      ["FPS per $ · 1440p",    score && price ? { v: round1(gpuEstFps(score, "p1440") / price * 100), t: round1(gpuEstFps(score, "p1440") / price * 100) + "" } : { v: null, t: "—" }],
      ["Score per $",          score && price ? { v: round1(score / price * 100), t: round1(score / price * 100) + "" } : { v: null, t: "—" }],
      ["Performance per watt*", score ? { v: round1(score / g.tdpW * 100), t: round1(score / g.tdpW * 100) + "" } : { v: null, t: "—" }],
      ["VRAM",                 { v: g.vramGB, t: g.vramGB + " GB" }],
      ["TDP",                  { v: g.tdpW, t: g.tdpW + "W", betterHigh: false }],
      ["Length (est.)",        { v: g.lengthMM || null, t: g.lengthMM ? "~" + g.lengthMM + " mm" : "—" }],
      ["Architecture",         { v: null, t: g.arch || "—" }],
      ["Launch year",          { v: g.launchYear, t: String(g.launchYear) }]
    ];
  }

  var CATEGORIES = {
    cpu:    { label: "Processors",     items: function () { return BCP.cpus.items; },         rows: cpuRows,
              price: function (c) { return BCP.prices.cpu[c.id]; } },
    gpu:    { label: "Graphics cards", items: function () { return BCP.gpus.items; },         rows: gpuRows,
              price: function (g) { return BCP.prices.gpu[g.id]; } },
    mobo:   { label: "Motherboards",   items: function () { return BCP.motherboards.items; }, rows: function (m) {
              return [
                ["Price (USD)",    { v: m.priceUSD, t: fmtUsd(m.priceUSD), betterHigh: false }],
                ["Socket",         { v: null, t: m.socket }],
                ["Chipset",        { v: null, t: m.chipset }],
                ["Form factor",    { v: null, t: m.formFactor }],
                ["Memory type",    { v: null, t: m.ramType }],
                ["Memory slots",   { v: m.ramSlots, t: String(m.ramSlots) }],
                ["Max memory",     { v: m.maxRamGB, t: m.maxRamGB + " GB" }],
                ["M.2 slots",      { v: m.m2Slots, t: String(m.m2Slots) }],
                ["PCIe 5.0 x16",   { v: null, t: m.pcie5Gpu ? "Yes" : "No" }]
              ];
            }, price: function (m) { return m.priceUSD; } },
    ram:    { label: "Memory kits",    items: function () { return BCP.memoryKits.items; },   rows: function (k) {
              return [
                ["Price (USD)",  { v: k.priceUSD, t: fmtUsd(k.priceUSD), betterHigh: false }],
                ["Type",         { v: null, t: k.type }],
                ["Capacity",     { v: k.capacityGB, t: k.capacityGB + " GB" }],
                ["Speed",        { v: k.speedMTs, t: k.speedMTs + " MT/s" }],
                ["CAS latency",  { v: k.casLatency, t: "CL" + k.casLatency, betterHigh: false }],
                ["Modules",      { v: null, t: String(k.modules) }],
                ["Price per GB", { v: round1(k.priceUSD / k.capacityGB), t: "$" + round1(k.priceUSD / k.capacityGB), betterHigh: false }]
              ];
            }, price: function (k) { return k.priceUSD; } },
    psu:    { label: "Power supplies", items: function () { return BCP.psus.items; },         rows: function (p) {
              return [
                ["Price (USD)",   { v: p.priceUSD, t: fmtUsd(p.priceUSD), betterHigh: false }],
                ["Wattage",       { v: p.wattageW, t: p.wattageW + "W" }],
                ["Efficiency",    { v: null, t: p.efficiency }],
                ["Modular",       { v: null, t: p.modular }],
                ["ATX 3.x",       { v: null, t: p.atx31 ? "Yes (native 12V-2x6)" : "No" }],
                ["Price per watt", { v: round1(p.priceUSD / p.wattageW * 100) / 100, t: "$" + (round1(p.priceUSD / p.wattageW * 100) / 100).toFixed(2) + "/W", betterHigh: false }]
              ];
            }, price: function (p) { return p.priceUSD; } },
    ssd:    { label: "Storage",        items: function () { return BCP.storage.items; },      rows: function (s) {
              return [
                ["Price (USD)",   { v: s.priceUSD, t: fmtUsd(s.priceUSD), betterHigh: false }],
                ["Capacity",      { v: s.capacityGB, t: s.capacityGB >= 1000 ? (s.capacityGB / 1000) + " TB" : s.capacityGB + " GB" }],
                ["Interface",     { v: null, t: s.interface }],
                ["Seq. read",     { v: s.readMBs, t: "up to " + s.readMBs.toLocaleString("en-US") + " MB/s" }],
                ["Price per TB",  { v: Math.round(s.priceUSD / (s.capacityGB / 1000)), t: fmtUsd(Math.round(s.priceUSD / (s.capacityGB / 1000))) + "/TB", betterHigh: false }]
              ];
            }, price: function (s) { return s.priceUSD; } },
    case_:  { label: "Cases",          items: function () { return BCP.cases.items; },        rows: function (c) {
              return [
                ["Price (USD)",      { v: c.priceUSD, t: fmtUsd(c.priceUSD), betterHigh: false }],
                ["Motherboard sizes", { v: null, t: c.fits.join(", ") }],
                ["Max GPU length",   { v: c.maxGpuLengthMM, t: c.maxGpuLengthMM + " mm" }],
                ["Max cooler height", { v: c.maxCoolerHeightMM, t: c.maxCoolerHeightMM + " mm" }],
                ["Max radiator",     { v: c.maxRadiatorMM, t: c.maxRadiatorMM + " mm" }],
                ["Largest board",    { v: null, t: c.fits[0] }]
              ];
            }, price: function (c) { return c.priceUSD; } },
    cooler: { label: "CPU coolers",    items: function () { return BCP.coolers.items; },      rows: function (c) {
              return [
                ["Price (USD)",      { v: c.priceUSD, t: c.priceUSD ? fmtUsd(c.priceUSD) : "$0", betterHigh: false }],
                ["Type",             { v: null, t: c.type }],
                ["TDP rating",       { v: c.tdpRatingW, t: "~" + c.tdpRatingW + "W" }],
                ["Size",             { v: null, t: c.type === "AIO" ? c.radiatorMM + "mm radiator" : c.heightMM + "mm tall" }],
                ["Sockets",          { v: null, t: c.sockets.join(", ") }],
                ["Cooling per $*",   c.priceUSD > 0 ? { v: round1(c.tdpRatingW / c.priceUSD), t: round1(c.tdpRatingW / c.priceUSD) + " W/$" } : { v: null, t: "—" }]
              ];
            }, price: function (c) { return c.priceUSD; } }
  };

  var cmpState = { cat: "cpu", picks: [null, null, null] };

  /* ---------- side-by-side comparison table ---------- */

  function renderCompare() {
    var cat = CATEGORIES[cmpState.cat];
    var items = cat.items();
    // default picks: first two items
    for (var i = 0; i < 3; i++) {
      if (!hw(items, cmpState.picks[i])) cmpState.picks[i] = i < 2 ? (items[i] ? items[i].id : null) : null;
    }
    // picker row
    [0, 1, 2].forEach(function (slot) {
      var sel = $("#cmpPick" + slot);
      sel.innerHTML = "";
      var none = document.createElement("option");
      none.value = ""; none.textContent = slot === 2 ? "— none —" : "(choose)";
      sel.appendChild(none);
      items.forEach(function (it) {
        var o = document.createElement("option");
        o.value = it.id; o.textContent = it.name;
        sel.appendChild(o);
      });
      sel.value = cmpState.picks[slot] || "";
    });

    var chosen = cmpState.picks.map(function (id) { return id ? hw(items, id) : null; });
    var table = $("#cmpTable");
    table.innerHTML = "";
    if (!chosen[0] || !chosen[1]) {
      table.innerHTML = '<p class="muted">Pick at least two ' + cat.label.toLowerCase() + " to compare.</p>";
      return;
    }
    var rowSets = chosen.map(function (it) { return it ? cat.rows(it) : null; });
    var nCols = chosen.filter(Boolean).length;

    var grid = document.createElement("div");
    grid.className = "cmp-grid cols-" + nCols;

    // header row
    var head = document.createElement("div");
    head.className = "cmp-row cmp-head";
    head.innerHTML = '<div class="cmp-cell cmp-label"></div>' + chosen.filter(Boolean).map(function (it) {
      var p = cat.price(it);
      return '<div class="cmp-cell cmp-item"><strong></strong><span class="price">' + (p !== undefined && p !== null ? fmtUsd(p) : "—") + "</span></div>";
    }).join("");
    grid.appendChild(head);
    head.querySelectorAll(".cmp-item strong").forEach(function (el, i) {
      el.textContent = chosen.filter(Boolean)[i].name;
    });

    // data rows
    var rowCount = rowSets.filter(Boolean)[0].length;
    for (var r = 0; r < rowCount; r++) {
      var label = rowSets.filter(Boolean)[0][r][0];
      var cells = chosen.map(function (it, ci) {
        return it ? rowSets[ci][r][1] : null;
      }).filter(function (_, ci2) { return chosen[ci2]; });
      // find best numeric cell
      var nums = cells.map(function (c) { return c && c.v !== null && c.v !== undefined ? c.v : null; });
      var bestIdx = -1;
      if (nums.some(function (v) { return v !== null; })) {
        var betterHigh = true;
        for (var bi = 0; bi < cells.length; bi++) {
          if (cells[bi] && cells[bi].betterHigh === false) { betterHigh = false; break; }
        }
        var bestVal = null;
        nums.forEach(function (v, i2) {
          if (v === null) return;
          if (bestVal === null || (betterHigh ? v > bestVal : v < bestVal)) { bestVal = v; bestIdx = i2; }
        });
        // tie: no single best
        if (nums.filter(function (v) { return v === bestVal; }).length > 1) bestIdx = -1;
      }
      var maxV = Math.max.apply(null, nums.filter(function (v) { return v !== null; }).concat([1]));
      var row = document.createElement("div");
      row.className = "cmp-row";
      var html = '<div class="cmp-cell cmp-label">' + label + "</div>";
      cells.forEach(function (c, i3) {
        var txt = c ? c.t : "—";
        var cls = "cmp-cell cmp-val" + (i3 === bestIdx ? " best" : "");
        var bar = "";
        if (c && c.v !== null && c.v !== undefined && c.v > 0 && label !== "Launch year" && label !== "Price (USD)" && label !== "TDP") {
          var w = clamp(Math.round((c.v / maxV) * 100), 3, 100);
          bar = '<span class="fps-bar cmp-bar"><span class="fps-fill" style="width:' + w + '%"></span></span>';
        }
        html += '<div class="' + cls + '"><span class="cmp-text"></span>' + bar + "</div>";
      });
      row.innerHTML = html;
      row.querySelectorAll(".cmp-text").forEach(function (el, i4) {
        el.textContent = cells[i4] ? cells[i4].t : "—";
      });
      grid.appendChild(row);
    }
    table.appendChild(grid);
  }

  /* ---------- value rankings ---------- */

  var rankState = { cat: "gpu", metric: "fpsDollar" };

  var RANK_METRICS = {
    gpu: [
      { id: "fpsDollar", label: "FPS per $ · 1440p",  val: function (g) { var s = BCP.benchmarks.gpu[g.id], p = BCP.prices.gpu[g.id]; return s && p ? gpuEstFps(s, "p1440") / p * 100 : null; }, fmt: function (v) { return round1(v) + " fps/$100"; } },
      { id: "scoreDollar", label: "Score per $",      val: function (g) { var s = BCP.benchmarks.gpu[g.id], p = BCP.prices.gpu[g.id]; return s && p ? s / p * 100 : null; }, fmt: function (v) { return round1(v) + " pts/$100"; } },
      { id: "perfWatt",  label: "Performance per watt", val: function (g) { var s = BCP.benchmarks.gpu[g.id]; return s ? s / g.tdpW * 100 : null; }, fmt: function (v) { return round1(v) + ""; } },
      { id: "score",     label: "Raw raster score",   val: function (g) { return BCP.benchmarks.gpu[g.id] || null; }, fmt: function (v) { return Math.round(v) + ""; } }
    ],
    cpu: [
      { id: "gamingDollar", label: "Gaming score per $",  val: function (c) { var b = BCP.benchmarks.cpu[c.id], p = BCP.prices.cpu[c.id]; return b && p ? b.gaming / p * 100 : null; }, fmt: function (v) { return round1(v) + " pts/$100"; } },
      { id: "mtDollar",     label: "Multi-core score per $", val: function (c) { var b = BCP.benchmarks.cpu[c.id], p = BCP.prices.cpu[c.id]; return b && p ? b.productivity / p * 100 : null; }, fmt: function (v) { return round1(v) + " pts/$100"; } },
      { id: "perfWatt",     label: "Performance per watt", val: function (c) { var b = BCP.benchmarks.cpu[c.id]; return b ? b.gaming / c.tdpW * 100 : null; }, fmt: function (v) { return round1(v) + ""; } },
      { id: "gaming",       label: "Raw gaming score",    val: function (c) { var b = BCP.benchmarks.cpu[c.id]; return b ? b.gaming : null; }, fmt: function (v) { return Math.round(v) + ""; } },
      { id: "mt",           label: "Raw multi-core score", val: function (c) { var b = BCP.benchmarks.cpu[c.id]; return b ? b.productivity : null; }, fmt: function (v) { return Math.round(v) + ""; } }
    ]
  };

  function renderRankings() {
    var metrics = RANK_METRICS[rankState.cat];
    if (!metrics.some(function (m) { return m.id === rankState.metric; })) rankState.metric = metrics[0].id;
    var metric = metrics.filter(function (m) { return m.id === rankState.metric; })[0];

    var catSel = $("#rankCat"), metSel = $("#rankMetric");
    catSel.value = rankState.cat;
    metSel.innerHTML = "";
    metrics.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.id; o.textContent = m.label;
      metSel.appendChild(o);
    });
    metSel.value = rankState.metric;

    var showLegacy = $("#rankLegacy") && $("#rankLegacy").checked;
    var items = (rankState.cat === "gpu" ? BCP.gpus.items : BCP.cpus.items)
      .filter(function (it) { return showLegacy || !it.legacy; })
      .map(function (it) { return { it: it, v: metric.val(it), price: rankState.cat === "gpu" ? BCP.prices.gpu[it.id] : BCP.prices.cpu[it.id] }; })
      .filter(function (r) { return r.v !== null && r.v > 0; })
      .sort(function (a, b) { return b.v - a.v; })
      .slice(0, 10);

    var box = $("#rankList");
    box.innerHTML = "";
    if (!items.length) {
      box.innerHTML = '<p class="muted">No priced items available for this ranking yet.</p>';
      return;
    }
    var maxV = items[0].v;
    items.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "rank-row";
      var w = clamp(Math.round((r.v / maxV) * 100), 3, 100);
      row.innerHTML =
        '<span class="rank-pos">' + (i + 1) + "</span>" +
        '<span class="rank-name"></span>' +
        '<span class="fps-bar rank-bar"><span class="fps-fill" style="width:' + w + '%"></span></span>' +
        '<span class="rank-val">' + metric.fmt(r.v) + "</span>" +
        '<span class="rank-price">' + (r.price ? fmtUsd(r.price) : "—") + "</span>";
      row.querySelector(".rank-name").textContent = r.it.name;
      box.appendChild(row);
    });
  }

  function persistCmp() {
    var code = [cmpState.cat].concat(cmpState.picks.filter(Boolean)).join(",");
    try {
      localStorage.setItem("bcp.cmp.last", code);
      var hist = JSON.parse(localStorage.getItem("bcp.cmp.history") || "[]");
      if (!Array.isArray(hist)) hist = [];
      hist = hist.filter(function (c) { return c !== code; });
      hist.unshift(code);
      if (hist.length > 8) hist.length = 8;
      localStorage.setItem("bcp.cmp.history", JSON.stringify(hist));
    } catch (e) {}
    renderCmpHistory();
  }

  function cmpLabel(code) {
    var parts = code.split(",");
    var cat = CATEGORIES[parts[0]];
    if (!cat) return code;
    var items = cat.items();
    var names = parts.slice(1).map(function (id) { var it = hw(items, id); return it ? it.name.replace(/^(AMD|Intel|GeForce|NVIDIA) /, "") : null; }).filter(Boolean);
    return cat.label.replace(/s$/, "") + ": " + names.join(" vs ");
  }

  function renderCmpHistory() {
    var box = $("#cmpHistory");
    if (!box) return;
    box.innerHTML = "";
    var hist = [];
    try { hist = JSON.parse(localStorage.getItem("bcp.cmp.history") || "[]"); } catch (e) {}
    if (!Array.isArray(hist) || !hist.length) return;
    var cur = [cmpState.cat].concat(cmpState.picks.filter(Boolean)).join(",");
    var shown = hist.filter(function (c) { return c !== cur; }).slice(0, 5);
    if (!shown.length) return;
    var label = document.createElement("span");
    label.className = "muted cmp-hist-label";
    label.textContent = "Recent comparisons:";
    box.appendChild(label);
    shown.forEach(function (code) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cmp-chip";
      chip.textContent = cmpLabel(code);
      chip.addEventListener("click", function () {
        var parts = code.split(",");
        if (!CATEGORIES[parts[0]]) return;
        cmpState.cat = parts[0];
        $("#cmpCat").value = parts[0];
        cmpState.picks = [parts[1] || null, parts[2] || null, parts[3] || null];
        renderCompare();
        persistCmp();
      });
      box.appendChild(chip);
    });
  }

  /* ---------- tabs ---------- */

  function switchView(name) {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    $("#viewCalc").classList.toggle("hidden", name !== "calc");
    $("#viewCompare").classList.toggle("hidden", name !== "compare");
    if (name === "compare") { renderCompare(); renderRankings(); }
    window.scrollTo(0, 0);
  }

  function init() {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () { switchView(b.getAttribute("data-view")); });
    });

    var catSel = $("#cmpCat");
    Object.keys(CATEGORIES).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = CATEGORIES[k].label;
      catSel.appendChild(o);
    });
    catSel.value = cmpState.cat;
    catSel.addEventListener("change", function () {
      cmpState.cat = this.value;
      cmpState.picks = [null, null, null];
      renderCompare();
      persistCmp();
    });
    [0, 1, 2].forEach(function (slot) {
      $("#cmpPick" + slot).addEventListener("change", function () {
        cmpState.picks[slot] = this.value || null;
        renderCompare();
        persistCmp();
      });
    });


    // Export the current comparison as CSV or Markdown (built from the rows on screen).
    function cmpExport(kind) {
      var cat = CATEGORIES[cmpState.cat], items = cat.items(), ch = cmpState.picks.map(function (id) { return id ? hw(items, id) : null; }).filter(Boolean);
      if (ch.length < 2) { alert("Pick at least two items first."); return; }
      var sets = ch.map(function (it) { return cat.rows(it); }), head = ["Spec"].concat(ch.map(function (it) { return it.name; })), rows = sets[0].map(function (r, i) { return [r[0]].concat(sets.map(function (st) { return st[i] ? String(st[i][1].t) : ""; })); });
      var meta = "Bottleneck Calculator Pro comparison, " + new Date().toISOString().slice(0, 10) + ". Scores and prices are estimates from the app's curated data.";
      var text, name = "comparison-" + cmpState.cat + (kind === "csv" ? ".csv" : ".md"), type = kind === "csv" ? "text/csv;charset=utf-8" : "text/markdown";
      if (kind === "csv") { var q = function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; text = "\uFEFF" + [head].concat(rows).concat([[], [meta]]).map(function (r) { return r.map(q).join(","); }).join("\r\n"); }
      else text = "# " + head.slice(1).join(" vs ") + "\n\n_" + meta + "_\n\n| " + head.join(" | ") + " |\n|" + head.map(function () { return "---"; }).join("|") + "|\n" + rows.map(function (r) { return "| " + r.join(" | ") + " |"; }).join("\n") + "\n";
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    }
    var shareBtn0 = $("#cmpShare");
    if (shareBtn0) [["Export comparison (CSV)", "csv"], ["Export comparison (Markdown)", "md"]].forEach(function (b) { var x = document.createElement("button"); x.type = "button"; x.className = "gen-load"; x.textContent = b[0]; x.addEventListener("click", function () { cmpExport(b[1]); }); shareBtn0.parentNode.appendChild(x); });

    // Shareable comparison link: #c=<cat>,<id1>,<id2>[,<id3>]
    var shareBtn = $("#cmpShare");
    if (shareBtn) shareBtn.addEventListener("click", function () {
      var code = [cmpState.cat].concat(cmpState.picks.filter(Boolean)).join(",");
      var url = location.origin + location.pathname + "#c=" + code;
      var done = function () {
        shareBtn.textContent = "Link copied";
        setTimeout(function () { shareBtn.textContent = "Copy comparison link"; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
      } else {
        prompt("Copy this link:", url);
      }
    });

    // Restore: URL hash wins, else the last comparison from this browser.
    (function restoreCmp() {
      var fromHash = null;
      if (location.hash.indexOf("#c=") === 0) fromHash = location.hash.slice(3);
      var saved = null;
      try { saved = localStorage.getItem("bcp.cmp.last"); } catch (e) {}
      var code = fromHash || saved;
      if (!code) return;
      var parts = code.split(",");
      if (!CATEGORIES[parts[0]]) return;
      cmpState.cat = parts[0];
      catSel.value = cmpState.cat;
      cmpState.picks = [parts[1] || null, parts[2] || null, parts[3] || null];
      renderCompare();
      if (fromHash) switchView("compare");
    })();

    $("#rankCat").addEventListener("change", function () {
      rankState.cat = this.value;
      rankState.metric = RANK_METRICS[this.value][0].id;
      renderRankings();
    });
    $("#rankMetric").addEventListener("change", function () {
      rankState.metric = this.value;
      renderRankings();
    });
    var legacyBox = $("#rankLegacy");
    if (legacyBox) legacyBox.addEventListener("change", renderRankings);

    renderCompare();
    renderRankings();
    renderCmpHistory();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
