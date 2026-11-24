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

  function bottleneck(cpuBench, gpuScore, resKey, workloadKey) {
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var cpuScore = cpuBench[wl.cpuScoreKey];
    var feed = wl.feedMod === null ? PRODUCTIVITY_FEED : FEED_NEED[resKey] * wl.feedMod;
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
  function gameFps(game, cpuGamingScore, gpuScore, resKey, workloadKey) {
    var wl = WORKLOADS[workloadKey] || WORKLOADS.gaming;
    var gpuRel = (gpuScore / 100) * wl.fpsGpuPenalty;
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

  function compatibility(cpuHw, gpuHw, bn) {
    var out = [];
    var sock = window.BCP.compat.sockets[cpuHw.socket];
    if (sock) {
      if (sock.ram.length === 1) {
        out.push({ level: "info", text: cpuHw.socket + " platform: " + sock.ram[0] + " memory required. " + sock.note });
      } else {
        out.push({ level: "warn", text: cpuHw.socket + " boards come in DDR4 and DDR5 variants — make sure the motherboard matches your RAM kit." });
      }
      out.push({ level: "info", text: "Needs a " + sock.chipsets + " motherboard." });
    }
    var psu = recommendedPsuW(cpuHw.tdpW, gpuHw.tdpW);
    out.push({ level: psu >= 850 ? "warn" : "info", text: "Recommended PSU: " + psu + "W or higher (" + cpuHw.tdpW + "W CPU + " + gpuHw.tdpW + "W GPU, with transient headroom)." });
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

  return {
    WORKLOADS: WORKLOADS,
    bottleneck: bottleneck,
    gameFps: gameFps,
    recommendedPsuW: recommendedPsuW,
    compatibility: compatibility,
    balanceLabel: balanceLabel
  };
})();
