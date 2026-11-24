/* ============================================================
 * BENCHMARK DATA — relative performance scores
 * Layer: benchmarks. Logically separate from hardware specs.
 * Reference points:
 *   CPU gaming  : Ryzen 7 7800X3D = 100 (1080p gaming class)
 *   CPU productivity : Ryzen 9 9950X = 100 (multi-core class)
 *   GPU raster  : GeForce RTX 4090 = 100
 * Scores are derived from Tom's Hardware's published hierarchies:
 *   GPU: Nov 18, 2026 raster hierarchy (1080p column, rescaled to 4090=100)
 *   CPU: Oct 5, 2026 gaming + multi-thread tables (rescaled to
 *        7800X3D=100 gaming, 9950X=100 multi-thread)
 * Chips absent from those tables are curated estimates (older AM4 /
 * entry Intel parts, 9950X3D2 gaming) - marked via meta below.
 * confidence: high for table-derived scores, medium for estimates.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.benchmarks = {
  meta: {
    layer: "benchmarks",
    asOf: "2026-11",
    confidence: "high (Tom's Hardware tables, rescaled); medium for curated estimates",
    source: "Tom's Hardware GPU hierarchy 2026-11-18; Tom's Hardware CPU hierarchy 2026-10-05 (via techfuelhq.com, verdictbits.com)"
  },
  cpu: {
    "r7-9850x3d": { gaming: 117, productivity: 59 },
    "r9-9950x3d": { gaming: 112, productivity: 103 },
    "r9-9950x3d2": { gaming: 112, productivity: 108 },
    "r9-9900x3d": { gaming: 102, productivity: 80 },
    "r9-9950x": { gaming: 90, productivity: 100 },
    "r9-9900x": { gaming: 86, productivity: 79 },
    "r7-9800x3d": { gaming: 113, productivity: 59 },
    "r7-9700x": { gaming: 84, productivity: 49 },
    "r5-9600x": { gaming: 85, productivity: 41 },
    "r9-7950x3d": { gaming: 98, productivity: 88 },
    "r9-7950x": { gaming: 83, productivity: 91 },
    "r9-7900x3d": { gaming: 90, productivity: 63 },
    "r9-7900x": { gaming: 81, productivity: 72 },
    "r7-7800x3d": { gaming: 100, productivity: 46 },
    "r7-7700x3d": { gaming: 96, productivity: 43 },
    "r7-7700x": { gaming: 82, productivity: 48 },
    "r5-7600x3d": { gaming: 94, productivity: 32 },
    "r5-7600x": { gaming: 79, productivity: 34 },
    "r5-7600": { gaming: 76, productivity: 32 },
    "r9-5950x": { gaming: 70, productivity: 57 },
    "r9-5900x": { gaming: 69, productivity: 50 },
    "r7-5800x3d": { gaming: 74, productivity: 33 },
    "r7-5800x": { gaming: 63, productivity: 35 },
    "r7-5700x3d": { gaming: 69, productivity: 31 },
    "r5-5600x": { gaming: 58, productivity: 24 },
    "r5-5600": { gaming: 56, productivity: 22 },
    "u7-270kp": { gaming: 91, productivity: 99 },
    "u5-250kp": { gaming: 86, productivity: 73 },
    "u9-285k": { gaming: 84, productivity: 92 },
    "u7-265k": { gaming: 82, productivity: 82 },
    "u5-245k": { gaming: 78, productivity: 58 },
    "i9-14900k": { gaming: 91, productivity: 87 },
    "i7-14700k": { gaming: 89, productivity: 78 },
    "i5-14600k": { gaming: 85, productivity: 56 },
    "i5-14400f": { gaming: 68, productivity: 30 },
    "i9-13900k": { gaming: 90, productivity: 84 },
    "i7-13700k": { gaming: 89, productivity: 69 },
    "i5-13600k": { gaming: 83, productivity: 52 },
    "i5-13400f": { gaming: 69, productivity: 28 },
    "i9-12900k": { gaming: 80, productivity: 65 },
    "i7-12700k": { gaming: 77, productivity: 54 },
    "i5-12600k": { gaming: 71, productivity: 41 },
    "i5-12400f": { gaming: 63, productivity: 26 }
  },
  gpu: {
    "rtx-5090": 111,
    "rtx-5080": 91,
    "rtx-5070ti": 85,
    "rtx-5070": 72,
    "rtx-5060ti": 57,
    "rtx-5060": 48,
    "rtx-5050": 38,
    "rtx-4090": 100,
    "rtx-4080s": 87,
    "rtx-4070tis": 77,
    "rtx-4070s": 69,
    "rtx-4070": 61,
    "rtx-4060ti": 48,
    "rtx-4060": 39,
    "rtx-3090": 67,
    "rtx-3080": 61,
    "rtx-3070": 47,
    "rtx-3060ti": 40,
    "rtx-3060": 34,
    "rx-9070xt": 85,
    "rx-9070": 77,
    "rx-9070gre": 66,
    "rx-9060xt": 54,
    "rx-7900xtx": 88,
    "rx-7900xt": 79,
    "rx-7800xt": 64,
    "rx-7700xt": 56,
    "rx-7600": 38,
    "rx-6900xt": 64,
    "rx-6800xt": 61,
    "rx-6700xt": 43,
    "rx-6600": 28,
    "arc-b580": 39,
    "arc-b570": 35,
    "arc-a770": 33
  }
};
