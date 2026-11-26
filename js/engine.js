/* ============================================================
 * ENGINE — bottleneck + FPS estimation
 * Pure functions over the data layers. No DOM access here.
 *
 * Bottleneck model (transparent, tunable):
 *  - A GPU needs a certain CPU tier to stay fully fed, and that
 *    need falls as resolution rises (at 4K the GPU is the wall
 *    almost regardless of CPU):
 *      requiredCpuScore = gpuScore * feedNeed(res) * workloadMod
 *  - If cpuScore < requiredCpuScore the CPU holds the GPU back:
 *      bottleneck% = (1 - cpuScore / requiredCpuScore) * 100
 *  - Otherwise the GPU is the limiter and the under-use is:
 *      bottleneck% = (1 - requiredCpuScore / cpuScore) * 100
 *  Same pair therefore reports different percentages at 1080p,
 *  1440p and 4K, and per workload — never a fixed number.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.engine = (function () {
  "use strict";

  // CPU tier required to fully feed a GPU per unit of GPU score.
  // 1080p is frame-rate heavy (needs a strong CPU); 4K is pixel heavy.
  var FEED_NEED = { p1080: 1.6, p1440: 1.15, p2160: 0.75 };

  var WORKLOADS = {
    gaming:       { label: "Gaming",       cpuScoreKey: "gaming",       feedMod: 1.0,  fpsGpuPenalty: 1.0,  fpsCpuPenalty: 1.0 },
    streaming:    { label: "Streaming",    cpuScoreKey: "gaming",       feedMod: 1.2,  fpsGpuPenalty: 0.95, fpsCpuPenalty: 0.88 },
    productivity: { label: "Productivity", cpuScoreKey: "productivity", feedMod: null, fpsGpuPenalty: 1.0,  fpsCpuPenalty: 1.0 }
  };
  // Productivity (render/compute) is resolution-independent: the CPU
  // must match the GPU's compute tier 1:1.
  var PRODUCTIVITY_FEED = 1.0;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Streaming encodes video alongside the game, so the CPU needs
  // spare cores on top of raw per-core speed. Fewer threads => the
  // CPU must be proportionally stronger to feed the same GPU.
  function streamingThreadFactor(threads) {
    if (!threads) return 1;
    if (threads >= 16) return 1;
    if (threads >= 12) return 1.08;
    if (threads >= 8)  return 1.18;
    return 1.32;
  }

  function bottleneck(cpuBench, gpuScore, resKey, workloadKey, cpuHw) {
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var cpuScore = cpuBench[wl.cpuScoreKey];
    var feed = wl.feedMod === null ? PRODUCTIVITY_FEED : FEED_NEED[resKey] * wl.feedMod;
    if (workloadKey === "streaming" && cpuHw) {
      feed *= streamingThreadFactor(cpuHw.threads);
    }
    var required = gpuScore * feed;
    var pct, limiter;
    if (cpuScore >= required) {
      limiter = "gpu";
      pct = cpuScore > 0 ? (1 - required / cpuScore) * 100 : 0;
    } else {
      limiter = "cpu";
      pct = required > 0 ? (1 - cpuScore / required) * 100 : 0;
    }
    if (Math.round(pct) === 0) limiter = "balanced";
    return {
      pct: Math.round(clamp(pct, 0, 95)),
      limiter: limiter,
      cpuScore: Math.round(cpuScore),
      gpuScore: Math.round(gpuScore),
      requiredCpuScore: Math.round(required)
    };
  }

  // Per-game FPS: scale the reference rig's base FPS by whichever
  // component runs out first, with the game's CPU sensitivity
  // softening the CPU term (a game with cpuWeight 0.4 barely cares
  // about CPU above a threshold; 0.9 esports titles scale hard).
  // VRAM sufficiency: below the comfortable buffer for a resolution the card
  // spills to system memory and loses performance (estimated steps).
  function vramFactor(vramGB, resKey) {
    if (!vramGB) return 1;
    var steps;
    if (resKey === "p4k") steps = [[16, 1], [12, 0.97], [10, 0.93], [8, 0.85], [6, 0.73], [0, 0.6]];
    else if (resKey === "p1440") steps = [[12, 1], [10, 0.99], [8, 0.96], [6, 0.88], [4, 0.78], [0, 0.68]];
    else steps = [[8, 1], [6, 0.95], [4, 0.87], [3, 0.82], [0, 0.72]];
    for (var i = 0; i < steps.length; i++) if (vramGB >= steps[i][0]) return steps[i][1];
    return 1;
  }

  function gameFps(game, cpuGamingScore, gpuScore, resKey, workloadKey, vramGB) {
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var gpuRel = (gpuScore / 100) * wl.fpsGpuPenalty * vramFactor(vramGB, resKey);
    var cpuRel = (cpuGamingScore / 100) * wl.fpsCpuPenalty;
    var cpuTerm = 1 + (cpuRel - 1) * game.cpuWeight;
    var fps = game.baseFps[resKey] * Math.min(gpuRel, cpuTerm);
    if (game.cap) fps = Math.min(fps, game.cap);
    return Math.round(fps);
  }

  // Upscaling (DLSS/FSR/XeSS): the GPU renders at a lower internal
  // resolution, so only the GPU term gets the boost - a CPU-limited
  // game gains nothing. gpuBoost ~1.5 Quality, ~1.75 Balanced, ~2.1 Performance.
  function gameFpsUpscaled(game, cpuGamingScore, gpuScore, resKey, workloadKey, gpuBoost, vramGB) {
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var gpuRel = (gpuScore / 100) * wl.fpsGpuPenalty * (gpuBoost || 1) * vramFactor(vramGB, resKey);
    var cpuRel = (cpuGamingScore / 100) * wl.fpsCpuPenalty;
    var cpuTerm = 1 + (cpuRel - 1) * game.cpuWeight;
    var fps = game.baseFps[resKey] * Math.min(gpuRel, cpuTerm);
    if (game.cap) fps = Math.min(fps, game.cap);
    return Math.round(fps);
  }

  function recommendedPsuW(cpuTdp, gpuTdp) {
    var c = window.BCP.compat.psu;
    var raw = cpuTdp + gpuTdp * c.gpuSpikeFactor + c.headroomW;
    return Math.max(c.minW, Math.ceil(raw / 50) * 50);
  }

  function partCompatibility(cpuHw, gpuHw, mobo, ram, psuSel, workloadKey, bn, cooler, pcCase, resKey) {
    var R = window.BCP.compat;
    var out = compatibility(cpuHw, gpuHw, bn);
    if (!mobo) return out;
    // With a concrete board + kit chosen and matched, the generic
    // "DDR4 or DDR5 variant" caution no longer applies.
    if (ram && ram.type === mobo.ramType) {
      out = out.filter(function (w) { return w.text.indexOf("come in DDR4 and DDR5 variants") === -1; });
    }

    if (mobo.socket !== cpuHw.socket) {
      out.push({ level: "bad", text: mobo.name + " is a " + mobo.socket + " board - it does not fit the " + cpuHw.socket + " CPU." });
    }
    if (ram) {
      if (mobo.ramType !== "any" && ram.type !== mobo.ramType) {
        out.push({ level: "bad", text: ram.name + " is " + ram.type + " but this board takes " + mobo.ramType + " only." });
      }
      if (ram.capacityGB > mobo.maxRamGB) {
        out.push({ level: "bad", text: "This board supports up to " + mobo.maxRamGB + " GB - the selected " + ram.capacityGB + " GB kit exceeds that." });
      }
      var mg = R.memGuidance[cpuHw.socket];
      if (mg && ram.type === mobo.ramType) {
        if (ram.speedMTs < mg.low) {
          out.push({ level: "info", text: ram.name + " runs below the usual " + cpuHw.socket + " range" + (mg.sweet ? " - " + mg.sweet + "." : ".") });
        } else if (ram.speedMTs > mg.high) {
          out.push({ level: "info", text: ram.name + " is above the practical " + cpuHw.socket + " range - expect diminishing returns and manual tuning." });
        }
      }
      if (mobo.chipset === "H610" && ram.speedMTs > 3200) {
        out.push({ level: "warn", text: "H610 boards run memory at JEDEC speeds - this " + ram.speedMTs + " MT/s kit would be capped near 3200." });
      }
      if (workloadKey === "streaming" && ram.capacityGB < 32) {
        out.push({ level: "warn", text: "Streaming alongside games is memory-hungry - 32 GB or more is recommended." });
      }
      if (workloadKey === "productivity" && ram.capacityGB < 64) {
        out.push({ level: "info", text: "Heavy content work (video, 3D, VMs) benefits from 64 GB." });
      }
      if (workloadKey === "gaming" && ram.capacityGB < 32) {
        out.push({ level: "info", text: "16 GB still runs most games; 32 GB is the safer pick for new titles." });
      }
    }

    var tier = R.boardTier[mobo.chipset] || "mid";
    if (cpuHw.tdpW >= 170 && tier === "entry") {
      out.push({ level: "warn", text: "A " + cpuHw.tdpW + "W CPU on an entry " + mobo.chipset + " board can hit VRM power limits - a B-series or better board is advised." });
    }
    if (cpuHw.brand === "Intel" && /k(p)?$/.test(cpuHw.id) && R.intelOcChipsets.indexOf(mobo.chipset) === -1) {
      out.push({ level: "info", text: "This unlocked Intel CPU can only be overclocked on a Z-series board (Z790/Z890)." });
    }
    if (cpuHw.socket === "AM5" && mobo.chipset === "A620" && /x3d/.test(cpuHw.id) === false && cpuHw.tdpW > 105) {
      out.push({ level: "info", text: "A620 boards have limited CPU power headroom for higher-TDP Ryzen chips." });
    }
    if (R.pcie5Gpus.indexOf(gpuHw.id) !== -1 && !mobo.pcie5Gpu) {
      out.push({ level: "info", text: gpuHw.name + " is a PCIe 5.0 card on a PCIe 4.0 slot - fully compatible, typically 0-2% performance difference." });
    }

    if (psuSel) {
      var rec = recommendedPsuW(cpuHw.tdpW, gpuHw.tdpW);
      if (psuSel.wattageW < rec) {
        out.push({ level: "bad", text: "Selected PSU (" + psuSel.wattageW + "W) is below the recommended " + rec + "W for this CPU + GPU pair." });
      } else if (gpuHw.tdpW >= 300 && !psuSel.atx31) {
        out.push({ level: "warn", text: "This GPU draws " + gpuHw.tdpW + "W - an ATX 3.x PSU with a native 12V-2x6 cable is recommended over adapters." });
      }
    }

    if (cooler && cpuHw.socket === "BGA") {
      out.push({ level: "info", text: "Laptop: cooling is built into the laptop - no desktop cooler needed." });
    } else if (cooler) {
      if (cooler.id === "cl-stock" && !cpuHw.stockCooler) {
        out.push({ level: "warn", text: "The " + cpuHw.name + " does not include a stock cooler - add an aftermarket cooler to the list." });
      }
      if (cooler.sockets.indexOf(cpuHw.socket) === -1) {
        out.push({ level: "bad", text: cooler.name + " has no " + cpuHw.socket + " mounting kit." });
      }
      if (cooler.tdpRatingW < cpuHw.tdpW) {
        out.push({ level: "warn", text: cooler.name + " is rated ~" + cooler.tdpRatingW + "W but the CPU is a " + cpuHw.tdpW + "W part - expect thermal throttling under sustained load." });
      }
      if (pcCase && cooler.type === "Air" && cooler.heightMM > pcCase.maxCoolerHeightMM) {
        out.push({ level: "bad", text: cooler.name + " (" + cooler.heightMM + "mm tall) does not fit this case (max " + pcCase.maxCoolerHeightMM + "mm cooler height)." });
      }
      if (pcCase && cooler.type === "AIO" && cooler.radiatorMM > pcCase.maxRadiatorMM) {
        out.push({ level: "bad", text: "The " + cooler.radiatorMM + "mm radiator does not fit this case (max " + pcCase.maxRadiatorMM + "mm)." });
      }
    }
    if (pcCase && mobo && mobo.formFactor === "Laptop") {
      out.push({ level: "info", text: "Laptop platform: no desktop case needed." });
    } else if (pcCase && mobo) {
      if (pcCase.fits.indexOf(mobo.formFactor) === -1) {
        out.push({ level: "bad", text: "This case takes " + pcCase.fits.join("/") + " boards - the " + mobo.formFactor + " board does not fit." });
      }
      if (gpuHw.lengthMM && gpuHw.lengthMM > pcCase.maxGpuLengthMM) {
        out.push({ level: "bad", text: gpuHw.name + " (~" + gpuHw.lengthMM + "mm long) exceeds this case's " + pcCase.maxGpuLengthMM + "mm GPU clearance." });
      }
    }

    if (gpuHw && gpuHw.vramGB && resKey) {
      var v = gpuHw.vramGB;
      if (resKey === "p4k" && v < 12) {
        out.push({ level: "warn", text: gpuHw.name + " has " + v + " GB VRAM - tight for 4K. Newer games will need lower texture settings (the FPS estimates already reflect this)." });
      } else if (resKey === "p1440" && v < 8) {
        out.push({ level: "warn", text: gpuHw.name + " has " + v + " GB VRAM - tight for 1440p. Expect to drop texture quality in newer titles (the FPS estimates already reflect this)." });
      } else if (resKey === "p1080" && v < 4) {
        out.push({ level: "warn", text: gpuHw.name + " has under 4 GB VRAM - texture quality is the limit even at 1080p in newer games (the FPS estimates already reflect this)." });
      }
    }

    var worst = out.some(function (w) { return w.level === "bad"; }) ? "bad"
              : out.some(function (w) { return w.level === "warn"; }) ? "warn" : "ok";
    if (worst === "ok") {
      out.push({ level: "info", text: "All selected parts are compatible." });
    }
    return out;
  }

  function compatibility(cpuHw, gpuHw, bn) {
    var out = [];
    var sock = window.BCP.compat.sockets[cpuHw.socket];
    if (cpuHw.socket === "BGA") {
      out.push({ level: "info", text: "Laptop platform: the CPU is soldered (BGA) and cannot be upgraded later. Pair it with the laptop platform entry instead of a desktop motherboard." });
    } else if (sock) {
      if (sock.ram.length === 1) {
        out.push({ level: "info", text: cpuHw.socket + " platform: " + sock.ram[0] + " memory required. " + sock.note });
      } else {
        out.push({ level: "warn", text: cpuHw.socket + " boards come in DDR4 and DDR5 variants — make sure the motherboard matches your RAM kit." });
      }
      out.push({ level: "info", text: "Needs a " + sock.chipsets + " motherboard." });
    }
    if (cpuHw.socket === "BGA") {
      out.push({ level: "info", text: "Laptop: powered by its own charger - no desktop PSU needed." });
    } else {
      var psu = recommendedPsuW(cpuHw.tdpW, gpuHw.tdpW);
      out.push({ level: psu >= 850 ? "warn" : "info", text: "Recommended PSU: " + psu + "W or higher (" + cpuHw.tdpW + "W CPU + " + gpuHw.tdpW + "W GPU, with transient headroom)." });
    }
    if (gpuHw.tdpW >= 350) {
      out.push({ level: "warn", text: gpuHw.name + " is a high-power card — check case clearance and use a quality PSU with the native power connector." });
    }
    if (bn.limiter === "cpu" && bn.pct >= 40) {
      out.push({ level: "bad", text: "Severe mismatch: the CPU holds this GPU back by ~" + bn.pct + "%. Consider a stronger processor." });
    } else if (bn.limiter === "cpu" && bn.pct >= 20) {
      out.push({ level: "warn", text: "Noticeable CPU bottleneck (~" + bn.pct + "%). Acceptable if you plan to upgrade the CPU soon." });
    }
    return out;
  }

  function balanceLabel(pct, limiter) {
    // A GPU limiter is the normal case for gaming (especially at 4K),
    // so it is graded more leniently than a CPU limiter.
    if (limiter === "gpu") {
      if (pct < 10) return { label: "Excellent match", cls: "good" };
      if (pct < 30) return { label: "Well balanced", cls: "good" };
      if (pct < 50) return { label: "GPU-bound (normal)", cls: "mid" };
      return { label: "Strongly GPU-bound", cls: "mid" };
    }
    if (pct < 5)  return { label: "Excellent match", cls: "good" };
    if (pct < 15) return { label: "Well balanced",   cls: "good" };
    if (pct < 25) return { label: "Mild CPU bottleneck", cls: "mid" };
    if (pct < 40) return { label: "Noticeable CPU bottleneck", cls: "bad" };
    return { label: "Severe CPU bottleneck", cls: "bad" };
  }

  // Shared compatible-part pickers (cheapest part passing the rules).
  // Used by the build generator and by "complete my build" auto-fill.
  var TIER_ORDER = { entry: 0, mid: 1, high: 2 };
  function pickMobo(cpu) {
    var B = window.BCP;
    var unlocked = /k(f)?$|kp$/.test(cpu.id);
    var minTier = (cpu.tdpW >= 170 || unlocked) ? "mid" : "entry";
    var boards = B.motherboards.items.filter(function (m) {
      return m.socket === cpu.socket && TIER_ORDER[(B.compat.boardTier[m.chipset] || "mid")] >= TIER_ORDER[minTier];
    });
    boards.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return boards[0] || null;
  }
  function pickRam(mobo, workload) {
    var B = window.BCP;
    var want64 = workload === "productivity";
    var kits = B.memoryKits.items.filter(function (k) { return k.type === mobo.ramType; });
    var exact = kits.filter(function (k) { return want64 ? k.capacityGB >= 64 : k.capacityGB === 32; });
    var pool = exact.length ? exact : kits;
    pool = pool.slice().sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return pool[0] || null;
  }
  function pickCooler(cpu) {
    var B = window.BCP;
    if (cpu.stockCooler) {
      var stock = B.coolers.items.find(function (cl) { return cl.id === "cl-stock"; });
      if (stock && stock.tdpRatingW >= cpu.tdpW) return stock;
    }
    var units = B.coolers.items.filter(function (cl) {
      return cl.id !== "cl-stock" && cl.sockets.indexOf(cpu.socket) !== -1 && cl.tdpRatingW >= cpu.tdpW;
    });
    units.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return units[0] || null;
  }
  function pickCase(mobo, gpu, cooler) {
    var B = window.BCP;
    var needLen = gpu.lengthMM || 250;
    var boxes = B.cases.items.filter(function (cs) {
      if (cs.fits.indexOf(mobo.formFactor) === -1) return false;
      if (cs.maxGpuLengthMM < needLen) return false;
      if (cooler && cooler.type === "Air" && cs.maxCoolerHeightMM < cooler.heightMM) return false;
      if (cooler && cooler.type === "AIO" && cs.maxRadiatorMM < cooler.radiatorMM) return false;
      return true;
    });
    boxes.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return boxes[0] || null;
  }
  function pickStorage(workload) {
    var B = window.BCP;
    var want = workload === "productivity" ? 2000 : 1000;
    var drives = B.storage.items.filter(function (s) { return s.capacityGB >= want && s.interface !== "SATA"; });
    drives.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return drives[0] || B.storage.items[0];
  }
  function pickPsu(cpu, gpu) {
    var B = window.BCP;
    var rec = recommendedPsuW(cpu.tdpW, gpu.tdpW);
    var needAtx31 = gpu.tdpW >= 300;
    var units = B.psus.items.filter(function (p) {
      return p.wattageW >= rec && (!needAtx31 || p.atx31);
    });
    units.sort(function (a, b) { return a.priceUSD - b.priceUSD; });
    return units[0] || null;
  }

  // Suggest the cheapest compatible part for every empty slot, anchored
  // to the parts already selected. Returns {slot: part} plus a flat list
  // of {slot, part, priceUSD} for display. null when anchors are missing.
  function suggestMissing(sel, workloadKey) {
    if (!sel || !sel.cpu || !sel.gpu) return null;
    var filled = [];
    var out = {};
    if (!sel.mobo) { out.mobo = pickMobo(sel.cpu); if (out.mobo) filled.push({ slot: "Motherboard", part: out.mobo }); }
    var mobo = sel.mobo || out.mobo;
    if (!sel.ram && mobo) { out.ram = pickRam(mobo, workloadKey); if (out.ram) filled.push({ slot: "Memory", part: out.ram }); }
    if (!sel.psu) { out.psu = pickPsu(sel.cpu, sel.gpu); if (out.psu) filled.push({ slot: "Power supply", part: out.psu }); }
    if (!sel.cooler) { out.cooler = pickCooler(sel.cpu); if (out.cooler) filled.push({ slot: "CPU cooler", part: out.cooler }); }
    if (!sel.storage) { out.storage = pickStorage(workloadKey); if (out.storage) filled.push({ slot: "Storage", part: out.storage }); }
    return { parts: out, filled: filled };
  }

  // Heuristic build health score (0-100) from balance, power headroom,
  // memory speed, storage class, cooling and case clearance. Deterministic,
  // not a benchmark. Returns null without CPU/GPU anchors.
  function buildHealth(sel) {
    if (!sel || !sel.cpu || !sel.gpu) return null;
    var B = window.BCP;
    var rows = [];
    var cpuBench = B.benchmarks.cpu[sel.cpu.id];
    var gpuScore = B.benchmarks.gpu[sel.gpu.id];
    if (cpuBench && gpuScore) {
      var bn = bottleneck(cpuBench, gpuScore, sel.res, sel.workload, sel.cpu);
      var bal = balanceLabel(bn.pct, bn.limiter);
      var balPts = bal.cls === "good" ? 30 : bal.cls === "mid" ? 20 : 8;
      rows.push({ label: "CPU-GPU balance", pts: balPts, max: 30, note: bn.pct + "% - " + bal.label.toLowerCase() });
    } else {
      rows.push({ label: "CPU-GPU balance", pts: 0, max: 30, note: "no benchmark data for this pair" });
    }
    var rec = recommendedPsuW(sel.cpu.tdpW, sel.gpu.tdpW);
    if (sel.psu) {
      var head = sel.psu.wattageW - rec;
      var pPts = head >= 150 ? 20 : head >= 0 ? 15 : head >= -50 ? 8 : 0;
      rows.push({ label: "Power headroom", pts: pPts, max: 20, note: sel.psu.wattageW + "W vs " + rec + "W recommended" });
    } else {
      rows.push({ label: "Power headroom", pts: 0, max: 20, note: "no power supply selected" });
    }
    if (sel.ram) {
      var mg = (B.compat.memGuidance || {})[sel.cpu.socket];
      var rPts = 12, rNote = sel.ram.name;
      if (mg && sel.ram.speedMTs) {
        if (sel.ram.speedMTs < mg.low) { rPts = 9; rNote = sel.ram.speedMTs + " MT/s - below the usual " + sel.cpu.socket + " range"; }
        else if (sel.ram.speedMTs > mg.high) { rPts = 12; rNote = sel.ram.speedMTs + " MT/s - above the sweet spot, diminishing returns"; }
        else { rPts = 15; rNote = sel.ram.speedMTs + " MT/s - in the " + sel.cpu.socket + " sweet spot"; }
      }
      rows.push({ label: "Memory speed", pts: rPts, max: 15, note: rNote });
    } else {
      rows.push({ label: "Memory speed", pts: 0, max: 15, note: "no memory selected" });
    }
    if (sel.storage) {
      var sPts = /PCIe 5/.test(sel.storage.interface) ? 15 : /PCIe 4/.test(sel.storage.interface) ? 14 : /PCIe 3/.test(sel.storage.interface) ? 11 : 6;
      rows.push({ label: "Storage class", pts: sPts, max: 15, note: sel.storage.interface });
    } else {
      rows.push({ label: "Storage class", pts: 0, max: 15, note: "no storage selected" });
    }
    if (sel.cooler) {
      var cPts = sel.cooler.tdpRatingW >= sel.cpu.tdpW * 1.3 ? 10 : sel.cooler.tdpRatingW >= sel.cpu.tdpW ? 7 : 3;
      rows.push({ label: "Cooling headroom", pts: cPts, max: 10, note: "rated " + sel.cooler.tdpRatingW + "W vs " + sel.cpu.tdpW + "W CPU" });
    } else {
      rows.push({ label: "Cooling headroom", pts: 0, max: 10, note: "no cooler selected" });
    }
    if (sel.case_) {
      var need = sel.gpu.lengthMM || 250;
      var clear = sel.case_.maxGpuLengthMM - need;
      var kPts = clear >= 20 ? 10 : clear >= 0 ? 7 : 0;
      rows.push({ label: "Case clearance", pts: kPts, max: 10, note: clear >= 0 ? clear + "mm spare GPU length" : "GPU does not fit this case" });
    } else {
      rows.push({ label: "Case clearance", pts: 10, max: 10, note: "no case constraint applied" });
    }
    var score = rows.reduce(function (s, r) { return s + r.pts; }, 0);
    var tips = rows.filter(function (r) { return r.max - r.pts > 0; })
      .sort(function (a, b) { return (b.max - b.pts) - (a.max - a.pts); })
      .slice(0, 3)
      .map(function (r) { return r.label + " (" + r.note + ")"; });
    return { score: score, rows: rows, tips: tips };
  }

  // Assemble the best-balanced priced builds within a budget.
  // Uses the separated layers: specs (hardware), scores (benchmarks),
  // prices (prices + components). Parts without a verified price are
  // skipped rather than estimated.
  function generateBuilds(budgetUsd, workloadKey, resKey, maxResults) {
    var B = window.BCP;
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var feed = wl.feedMod === null ? PRODUCTIVITY_FEED : FEED_NEED[resKey] * wl.feedMod;
    var out = [];

    B.cpus.items.forEach(function (cpu) {
      var cpuPrice = B.prices.cpu[cpu.id];
      var cpuBench = B.benchmarks.cpu[cpu.id];
      if (!cpuPrice || !cpuBench || cpu.legacy || cpu.mobile) return;
      B.gpus.items.forEach(function (gpu) {
        var gpuPrice = B.prices.gpu[gpu.id];
        var gpuScore = B.benchmarks.gpu[gpu.id];
        if (!gpuPrice || !gpuScore || gpu.legacy || gpu.mobile) return;
        var mobo = pickMobo(cpu), ram = mobo && pickRam(mobo, workloadKey), psu = pickPsu(cpu, gpu);
        var cooler = pickCooler(cpu);
        var drive = pickStorage(workloadKey);
        if (!mobo || !ram || !psu || !cooler || !drive) return;
        var total = cpuPrice + gpuPrice + mobo.priceUSD + ram.priceUSD + psu.priceUSD + cooler.priceUSD + drive.priceUSD;
        if (total > budgetUsd) return;
        var eff = workloadKey === "productivity"
          ? 0.7 * cpuBench.productivity + 0.3 * gpuScore
          : Math.min(gpuScore, cpuBench.gaming / feed);
        var bn = bottleneck(cpuBench, gpuScore, resKey, workloadKey);
        out.push({ cpu: cpu, gpu: gpu, mobo: mobo, ram: ram, psu: psu, cooler: cooler, storage: drive, total: total, eff: eff, pct: bn.pct, limiter: bn.limiter });
      });
    });

    out.sort(function (a, b) { return b.eff - a.eff; });
    // keep GPU diversity in the top picks
    var seen = {}, picks = [];
    for (var i = 0; i < out.length && picks.length < (maxResults || 3); i++) {
      if (seen[out[i].gpu.id]) continue;
      seen[out[i].gpu.id] = true;
      picks.push(out[i]);
    }
    return picks;
  }

  return {
    WORKLOADS: WORKLOADS,
    bottleneck: bottleneck,
    gameFps: gameFps,
    gameFpsUpscaled: gameFpsUpscaled,
    recommendedPsuW: recommendedPsuW,
    compatibility: compatibility,
    partCompatibility: partCompatibility,
    generateBuilds: generateBuilds,
    suggestMissing: suggestMissing,
    buildHealth: buildHealth,
    balanceLabel: balanceLabel
  };
})();
