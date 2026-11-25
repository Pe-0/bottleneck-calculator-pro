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
    "LGA1200": { ram: ["DDR4"],          chipsets: "Intel 400/500-series (B460, B560, Z490)",           note: "LGA1200 supports DDR4 only." },
    "LGA1851": { ram: ["DDR5"],          chipsets: "Intel 800-series (B860, Z890)",                     note: "LGA1851 supports DDR5 only." },
    "LGA1151": { ram: ["DDR4"], chipsets: "Intel 100/200-series (H110, B250, Z270)", note: "100/200-series boards support 6th/7th-gen Core only - 8th/9th-gen CPUs do NOT work despite the same LGA1151 socket name." },
    "LGA1151-300": { ram: ["DDR4"], chipsets: "Intel 300-series (H310, B360, Z390)", note: "300-series boards support 8th/9th-gen Core only - 6th/7th-gen CPUs do NOT work despite the same LGA1151 socket name." },
    "LGA1150": { ram: ["DDR3"], chipsets: "Intel 8/9-series (H81, B85, Z97)", note: "LGA1150 (4th-gen Core) uses DDR3 memory." },
    "LGA1155": { ram: ["DDR3"], chipsets: "Intel 6/7-series (H61, B75, Z77)", note: "LGA1155 (2nd/3rd-gen Core) uses DDR3 memory." },
    "AM3+":    { ram: ["DDR3"], chipsets: "AMD 900-series (970, 990FX)", note: "AM3+ (FX) is a 2011-2016 platform with no upgrade path - keep expectations modest." },
    "BGA":     { ram: ["DDR4", "DDR5", "DDR3"], chipsets: "soldered laptop platform", note: "Laptop CPUs are soldered to the board and cannot be upgraded." },
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
    "B660": "mid", "B760": "mid", "B860": "mid", "B460": "mid", "B560": "mid", "H410": "entry",
    "X570": "high", "X670E": "high", "X870": "high", "X870E": "high",
    "Z690": "high", "Z790": "high", "Z890": "high", "Z490": "high",
    "A320": "entry", "X470": "high", "H110": "entry", "B250": "mid", "Z270": "high",
    "H310": "entry", "B360": "mid", "Z390": "high", "H81": "entry", "B85": "mid", "Z97": "high",
    "H61": "entry", "B75": "mid", "970": "mid", "BGA": "mid"
  },
  // GPUs with a PCIe 5.0 interface (rest are PCIe 4.0)
  pcie5Gpus: ["rtx-5090","rtx-5080","rtx-5070ti","rtx-5070","rtx-5060ti","rtx-5060","rtx-5050",
              "rx-9070xt","rx-9070","rx-9070gre","rx-9060xt"],
  // Intel boards that allow CPU overclocking (AMD: all except A620)
  intelOcChipsets: ["Z690", "Z790", "Z890", "Z170", "Z270", "Z370", "Z390", "Z97", "Z77"],
  // Memory speed guidance per socket (MT/s)
  memGuidance: {
    "AM5":     { sweet: "DDR5-6000 CL30 is the AM5 sweet spot", low: 5600, high: 6400 },
    "AM4":     { sweet: "DDR4-3600 is the AM4 sweet spot", low: 3200, high: 3600 },
    "LGA1700": { sweet: null, low: 3200, high: 7200 },
    "LGA1200": { sweet: null, low: 2933, high: 3600 },
    "LGA1151": { sweet: "DDR4-2400 is the 6th/7th-gen sweet spot", low: 2133, high: 2666 },
    "LGA1151-300": { sweet: "DDR4-2666 is the 8th/9th-gen sweet spot", low: 2400, high: 3200 },
    "LGA1150": { sweet: "DDR3-1600 is the Haswell sweet spot", low: 1333, high: 1866 },
    "LGA1155": { sweet: "DDR3-1600 is the Sandy/Ivy sweet spot", low: 1333, high: 1600 },
    "AM3+":    { sweet: "DDR3-1866 squeezes the most from FX chips", low: 1333, high: 1866 },
    "LGA1851": { sweet: null, low: 5600, high: 8000 }
  }
};
