/* ============================================================
 * PRICE DATA — USD street prices
 * Layer: prices. Separate so a live price API (stage 2) can
 * replace this file without touching hardware or benchmarks.
 * confidence: low — curated street prices, refresh planned.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.prices = {
  meta: {
    layer: "prices",
    currency: "USD",
    asOf: "2025-Q3",
    confidence: "low",
    source: "Curated US street prices; live price feeds planned for stage 2"
  },
  cpu: {
    "r9-9950x": 649, "r9-9900x": 469, "r7-9800x3d": 479, "r7-9700x": 359,
    "r5-9600x": 279, "r9-7950x": 549, "r9-7900x": 399, "r7-7800x3d": 449,
    "r7-7700x": 299, "r5-7600x": 229, "r5-7600": 199,
    "r9-5950x": 549, "r9-5900x": 349, "r7-5800x3d": 329, "r7-5800x": 249,
    "r7-5700x3d": 249, "r5-5600x": 159, "r5-5600": 135,
    "u9-285k": 589, "u7-265k": 394, "u5-245k": 309,
    "i9-14900k": 569, "i7-14700k": 409, "i5-14600k": 319, "i5-14400f": 199,
    "i9-13900k": 489, "i7-13700k": 369, "i5-13600k": 289, "i5-13400f": 179,
    "i9-12900k": 389, "i7-12700k": 289, "i5-12600k": 209, "i5-12400f": 149
  },
  gpu: {
    "rtx-5090": 1999, "rtx-5080": 999, "rtx-5070ti": 749, "rtx-5070": 549,
    "rtx-4090": 1599, "rtx-4080s": 999, "rtx-4070tis": 789, "rtx-4070s": 589,
    "rtx-4070": 539, "rtx-4060ti": 379, "rtx-4060": 289,
    "rtx-3090": 999, "rtx-3080": 649, "rtx-3070": 449, "rtx-3060ti": 369, "rtx-3060": 289,
    "rx-9070xt": 599, "rx-9070": 549,
    "rx-7900xtx": 899, "rx-7900xt": 699, "rx-7800xt": 499, "rx-7700xt": 419,
    "rx-7600": 269, "rx-6900xt": 749, "rx-6800xt": 599, "rx-6700xt": 429, "rx-6600": 229,
    "arc-b580": 249, "arc-a770": 279
  }
};
