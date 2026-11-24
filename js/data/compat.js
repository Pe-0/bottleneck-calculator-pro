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
    asOf: "2026-11",
    confidence: "high",
    source: "Intel/AMD platform documentation, board vendor specs"
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
  },
  // Board class by chipset: entry boards have modest VRMs and features.
  boardTier: {
    "A620": "entry", "A520": "entry", "H610": "entry",
    "B450": "mid", "B550": "mid", "B650": "mid", "B650E": "mid", "B850": "mid",
    "B660": "mid", "B760": "mid", "B860": "mid",
    "X570": "high", "X670E": "high", "X870": "high", "X870E": "high",
    "Z690": "high", "Z790": "high", "Z890": "high"
  },
  // GPUs with a PCIe 5.0 interface (rest are PCIe 4.0)
  pcie5Gpus: ["rtx-5090","rtx-5080","rtx-5070ti","rtx-5070","rtx-5060ti","rtx-5060","rtx-5050",
              "rx-9070xt","rx-9070","rx-9070gre","rx-9060xt"],
  // Intel boards that allow CPU overclocking (AMD: all except A620)
  intelOcChipsets: ["Z690", "Z790", "Z890"],
  // Memory speed guidance per socket (MT/s)
  memGuidance: {
    "AM5":     { sweet: "DDR5-6000 CL30 is the AM5 sweet spot", low: 5600, high: 6400 },
    "AM4":     { sweet: "DDR4-3600 is the AM4 sweet spot", low: 3200, high: 3600 },
    "LGA1700": { sweet: null, low: 3200, high: 7200 },
    "LGA1851": { sweet: null, low: 5600, high: 8000 }
  }
};
