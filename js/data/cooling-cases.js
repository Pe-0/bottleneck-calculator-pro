/* ============================================================
 * COOLING & CASES DATA — CPU coolers and PC cases
 * Layer: components/cooling + components/cases. Logically
 * separate. Prices are curated 2025-Q3 US snapshots.
 * Cooler tdpRatingW is the manufacturer's heat-dissipation class
 * (approximate for air towers); case limits from vendor specs.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.coolers = {
  meta: {
    layer: "components/cooling",
    asOf: "2025-Q3",
    confidence: "medium (specs vendor-published, ratings approximate, prices curated)",
    source: "Cooler Master, Thermalright, Noctua, be quiet!, DeepCool, Arctic spec pages"
  },
  items: [
    { id: "cl-stock",   name: "Stock cooler (bundled with CPU)",  type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851","LGA1200"], tdpRatingW: 65, heightMM: 60, priceUSD: 0 },
    { id: "cl-212",     name: "Hyper 212-class tower (air)",      type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 150, heightMM: 155, priceUSD: 30 },
    { id: "cl-ak400",   name: "DeepCool AK400 (air)",             type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 220, heightMM: 155, priceUSD: 30 },
    { id: "cl-pa120",   name: "Thermalright PA120 SE (air)",      type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 245, heightMM: 155, priceUSD: 35 },
    { id: "cl-u12s",    name: "Noctua NH-U12S redux (air)",       type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 190, heightMM: 158, priceUSD: 55 },
    { id: "cl-dr4",     name: "be quiet! Dark Rock 4 (air)",      type: "Air", sockets: ["AM5","AM4","LGA1700"],           tdpRatingW: 200, heightMM: 160, priceUSD: 75 },
    { id: "cl-drp5",    name: "be quiet! Dark Rock Pro 5 (air)",  type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 270, heightMM: 168, priceUSD: 95 },
    { id: "cl-d15",     name: "Noctua NH-D15 G2 (air)",           type: "Air", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 260, heightMM: 168, priceUSD: 150 },
    { id: "cl-aio240",  name: "240mm AIO liquid cooler",          type: "AIO", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 250, radiatorMM: 240, priceUSD: 100 },
    { id: "cl-aio280",  name: "280mm AIO liquid cooler",          type: "AIO", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 300, radiatorMM: 280, priceUSD: 130 },
    { id: "cl-aio360",  name: "360mm AIO liquid cooler",          type: "AIO", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 350, radiatorMM: 360, priceUSD: 150 },
    { id: "cl-aio420",  name: "420mm AIO liquid cooler",          type: "AIO", sockets: ["AM5","AM4","LGA1700","LGA1851"], tdpRatingW: 400, radiatorMM: 420, priceUSD: 200 }
  ]
};

window.BCP.cases = {
  meta: {
    layer: "components/cases",
    asOf: "2025-Q3",
    confidence: "medium (specs vendor-published, prices curated)",
    source: "Fractal, Lian Li, NZXT, Corsair, Phanteks, Montech spec pages"
  },
  items: [
    { id: "case-matx-budget", name: "Budget mATX tower",          fits: ["mATX","ITX"],          maxGpuLengthMM: 330, maxCoolerHeightMM: 160, maxRadiatorMM: 240, priceUSD: 50 },
    { id: "case-matx-air",    name: "mATX airflow tower",         fits: ["mATX","ITX"],          maxGpuLengthMM: 360, maxCoolerHeightMM: 165, maxRadiatorMM: 280, priceUSD: 70 },
    { id: "case-atx-value",   name: "ATX value airflow tower",    fits: ["ATX","mATX","ITX"],    maxGpuLengthMM: 400, maxCoolerHeightMM: 170, maxRadiatorMM: 360, priceUSD: 80 },
    { id: "case-atx-mesh",    name: "ATX mesh mid-tower",         fits: ["ATX","mATX","ITX"],    maxGpuLengthMM: 420, maxCoolerHeightMM: 175, maxRadiatorMM: 360, priceUSD: 110 },
    { id: "case-atx-premium", name: "Premium ATX mid-tower",      fits: ["ATX","mATX","ITX"],    maxGpuLengthMM: 435, maxCoolerHeightMM: 185, maxRadiatorMM: 420, priceUSD: 160 },
    { id: "case-full",        name: "Full tower",                 fits: ["ATX","mATX","ITX"],    maxGpuLengthMM: 480, maxCoolerHeightMM: 195, maxRadiatorMM: 420, priceUSD: 220 },
    { id: "case-itx",         name: "Compact ITX case",           fits: ["ITX"],                 maxGpuLengthMM: 320, maxCoolerHeightMM: 70,  maxRadiatorMM: 240, priceUSD: 110 }
  ]
};
