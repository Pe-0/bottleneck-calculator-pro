/* ============================================================
 * COMPATIBILITY RULES — separate rules layer
 * Layer: compat. Rule data only; evaluation lives in engine.js.
 * Each rule set is keyed so future parts (motherboards, RAM kits,
 * PSUs, cases) can plug in without reshaping existing data.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.compat = {
  meta: {
    layer: "compat",
    asOf: "2025-Q3",
    confidence: "high",
    source: "Intel/AMD platform documentation"
  },
  sockets: {
    "AM5":     { ram: ["DDR5"],          chipsets: "AMD 600/800-series (A620, B650, X670, B850, X870)", note: "AM5 supports DDR5 only." },
    "AM4":     { ram: ["DDR4"],          chipsets: "AMD 400/500-series (B450, B550, X570)",             note: "AM4 supports DDR4 only." },
    "LGA1700": { ram: ["DDR4", "DDR5"],  chipsets: "Intel 600/700-series (B660, B760, Z690, Z790)",     note: "LGA1700 boards are DDR4 OR DDR5 — the two are not interchangeable on one board." },
    "LGA1851": { ram: ["DDR5"],          chipsets: "Intel 800-series (B860, Z890)",                     note: "LGA1851 supports DDR5 only." }
  },
  psu: {
    // recommended PSU = ceil((cpuTdp + gpuTdp * 1.15 + 150 headroom) / 50) * 50
    headroomW: 150,
    gpuSpikeFactor: 1.15,
    minW: 450
  }
};
