/* ============================================================
 * BENCHMARK DATA — relative performance scores
 * Layer: benchmarks. Logically separate from hardware specs.
 * Reference points:
 *   CPU gaming  : Ryzen 7 7800X3D = 100 (1080p gaming class)
 *   CPU productivity : Ryzen 9 9950X = 100 (multi-core class)
 *   GPU raster  : GeForce RTX 4090 = 100
 * Curated from public benchmark aggregates (TechPowerUp relative
 * performance, Tom's Hardware hierarchy, 3DMark averages).
 * confidence: medium — curated approximations, flagged for the
 * stage-2 automated refresh pipeline.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.benchmarks = {
  meta: {
    layer: "benchmarks",
    asOf: "2025-Q3",
    confidence: "medium",
    source: "TechPowerUp / Tom's Hardware relative performance aggregates (curated)"
  },
  cpu: {
    // id: { gaming, productivity }
    "r9-9950x":   { gaming: 96,  productivity: 100 },
    "r9-9900x":   { gaming: 94,  productivity: 82 },
    "r7-9800x3d": { gaming: 105, productivity: 66 },
    "r7-9700x":   { gaming: 92,  productivity: 58 },
    "r5-9600x":   { gaming: 88,  productivity: 42 },
    "r9-7950x":   { gaming: 94,  productivity: 95 },
    "r9-7900x":   { gaming: 92,  productivity: 78 },
    "r7-7800x3d": { gaming: 100, productivity: 55 },
    "r7-7700x":   { gaming: 87,  productivity: 48 },
    "r5-7600x":   { gaming: 84,  productivity: 40 },
    "r5-7600":    { gaming: 80,  productivity: 38 },
    "r9-5950x":   { gaming: 75,  productivity: 62 },
    "r9-5900x":   { gaming: 74,  productivity: 55 },
    "r7-5800x3d": { gaming: 80,  productivity: 36 },
    "r7-5800x":   { gaming: 68,  productivity: 38 },
    "r7-5700x3d": { gaming: 74,  productivity: 34 },
    "r5-5600x":   { gaming: 62,  productivity: 26 },
    "r5-5600":    { gaming: 60,  productivity: 24 },
    "u9-285k":    { gaming: 97,  productivity: 95 },
    "u7-265k":    { gaming: 94,  productivity: 78 },
    "u5-245k":    { gaming: 88,  productivity: 55 },
    "i9-14900k":  { gaming: 99,  productivity: 92 },
    "i7-14700k":  { gaming: 97,  productivity: 80 },
    "i5-14600k":  { gaming: 93,  productivity: 55 },
    "i5-14400f":  { gaming: 76,  productivity: 32 },
    "i9-13900k":  { gaming: 97,  productivity: 88 },
    "i7-13700k":  { gaming: 95,  productivity: 72 },
    "i5-13600k":  { gaming: 92,  productivity: 52 },
    "i5-13400f":  { gaming: 74,  productivity: 30 },
    "i9-12900k":  { gaming: 85,  productivity: 60 },
    "i7-12700k":  { gaming: 82,  productivity: 48 },
    "i5-12600k":  { gaming: 78,  productivity: 36 },
    "i5-12400f":  { gaming: 68,  productivity: 28 }
  },
  gpu: {
    // id: raster score (RTX 4090 = 100)
    "rtx-5090":    125,
    "rtx-5080":    88,
    "rtx-5070ti":  78,
    "rtx-5070":    66,
    "rtx-4090":    100,
    "rtx-4080s":   80,
    "rtx-4070tis": 72,
    "rtx-4070s":   62,
    "rtx-4070":    52,
    "rtx-4060ti":  40,
    "rtx-4060":    34,
    "rtx-3090":    66,
    "rtx-3080":    57,
    "rtx-3070":    40,
    "rtx-3060ti":  36,
    "rtx-3060":    28,
    "rx-9070xt":   70,
    "rx-9070":     62,
    "rx-7900xtx":  76,
    "rx-7900xt":   68,
    "rx-7800xt":   55,
    "rx-7700xt":   46,
    "rx-7600":     30,
    "rx-6900xt":   57,
    "rx-6800xt":   52,
    "rx-6700xt":   42,
    "rx-6600":     26,
    "arc-b580":    36,
    "arc-a770":    30
  }
};
