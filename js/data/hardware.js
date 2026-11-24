/* ============================================================
 * HARDWARE DATA — CPU physical & core specifications
 * Layer: hardware (specs). Benchmark scores live in benchmarks.js,
 * prices in prices.js, compatibility rules in compat.js.
 * Curated from public spec sheets (Intel ARK, AMD.com).
 * confidence: high = verified spec sheet, medium = curated from
 * multiple public sources, low = needs refresh.
 * asOf: data vintage. Refresh pipeline planned for stage 2.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.cpus = {
  meta: {
    layer: "hardware.cpu",
    asOf: "2026-11",
    confidence: "high",
    source: "Intel ARK / AMD / NVIDIA product pages (curated); 2026 models (9850X3D, 9950X3D2, 7700X3D, 270K/250K Plus) partly estimated clocks; l3MB = L3 cache; GPU lengthMM estimated by model tier"
  },
  items: [
    // ---- AMD AM5 (Zen 5 / Zen 4) ----
    { id: "r7-9850x3d",brand: "AMD", name: "Ryzen 7 9850X3D",socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.6, tdpW: 120, launchYear: 2026, baseGHz: 4.7, l3MB: 104, arch: "Zen 5" },
    { id: "r9-9950x3d",brand: "AMD", name: "Ryzen 9 9950X3D",socket: "AM5", cores: 16, threads: 32, boostGHz: 5.7, tdpW: 170, launchYear: 2025, baseGHz: 4.3, l3MB: 128, arch: "Zen 5" },
    { id: "r9-9950x3d2",brand: "AMD", name: "Ryzen 9 9950X3D2",socket: "AM5", cores: 16, threads: 32, boostGHz: 5.7, tdpW: 170, launchYear: 2026, baseGHz: 4.3, l3MB: 192, arch: "Zen 5" },
    { id: "r9-9900x3d",brand: "AMD", name: "Ryzen 9 9900X3D",socket: "AM5", cores: 12, threads: 24, boostGHz: 5.5, tdpW: 120, launchYear: 2025, baseGHz: 4.4, l3MB: 128, arch: "Zen 5" },
    { id: "r9-7950x3d",brand: "AMD", name: "Ryzen 9 7950X3D",socket: "AM5", cores: 16, threads: 32, boostGHz: 5.7, tdpW: 120, launchYear: 2023, baseGHz: 4.2, l3MB: 128, arch: "Zen 4" },
    { id: "r9-7900x3d",brand: "AMD", name: "Ryzen 9 7900X3D",socket: "AM5", cores: 12, threads: 24, boostGHz: 5.6, tdpW: 120, launchYear: 2023, baseGHz: 4.4, l3MB: 128, arch: "Zen 4" },
    { id: "r7-7700x3d",brand: "AMD", name: "Ryzen 7 7700X3D",socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.0, tdpW: 120, launchYear: 2026, baseGHz: 4.3, l3MB: 96, arch: "Zen 4" },
    { id: "r5-7600x3d",brand: "AMD", name: "Ryzen 5 7600X3D",socket: "AM5", cores: 6,  threads: 12, boostGHz: 4.7, tdpW: 105, launchYear: 2024, baseGHz: 4.1, l3MB: 96, arch: "Zen 4" },
    { id: "r9-9950x",  brand: "AMD", name: "Ryzen 9 9950X",  socket: "AM5", cores: 16, threads: 32, boostGHz: 5.7, tdpW: 170, launchYear: 2024, baseGHz: 4.3, l3MB: 64, arch: "Zen 5" },
    { id: "r9-9900x",  brand: "AMD", name: "Ryzen 9 9900X",  socket: "AM5", cores: 12, threads: 24, boostGHz: 5.6, tdpW: 120, launchYear: 2024, baseGHz: 4.4, l3MB: 64, arch: "Zen 5" },
    { id: "r7-9800x3d",brand: "AMD", name: "Ryzen 7 9800X3D",socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.2, tdpW: 120, launchYear: 2024, baseGHz: 4.7, l3MB: 96, arch: "Zen 5" },
    { id: "r7-9700x",  brand: "AMD", name: "Ryzen 7 9700X",  socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.5, tdpW: 65,  launchYear: 2024, baseGHz: 3.8, l3MB: 32, arch: "Zen 5" },
    { id: "r5-9600x",  brand: "AMD", name: "Ryzen 5 9600X",  socket: "AM5", cores: 6,  threads: 12, boostGHz: 5.4, tdpW: 65,  launchYear: 2024, baseGHz: 3.9, l3MB: 32, arch: "Zen 5" },
    { id: "r9-7950x",  brand: "AMD", name: "Ryzen 9 7950X",  socket: "AM5", cores: 16, threads: 32, boostGHz: 5.7, tdpW: 170, launchYear: 2022, baseGHz: 4.5, l3MB: 64, arch: "Zen 4" },
    { id: "r9-7900x",  brand: "AMD", name: "Ryzen 9 7900X",  socket: "AM5", cores: 12, threads: 24, boostGHz: 5.6, tdpW: 170, launchYear: 2022, baseGHz: 4.7, l3MB: 64, arch: "Zen 4" },
    { id: "r7-7800x3d",brand: "AMD", name: "Ryzen 7 7800X3D",socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.0, tdpW: 120, launchYear: 2023, baseGHz: 4.2, l3MB: 96, arch: "Zen 4" },
    { id: "r7-7700x",  brand: "AMD", name: "Ryzen 7 7700X",  socket: "AM5", cores: 8,  threads: 16, boostGHz: 5.4, tdpW: 105, launchYear: 2022, baseGHz: 4.5, l3MB: 32, arch: "Zen 4" },
    { id: "r5-7600x",  brand: "AMD", name: "Ryzen 5 7600X",  socket: "AM5", cores: 6,  threads: 12, boostGHz: 5.3, tdpW: 105, launchYear: 2022, baseGHz: 4.7, l3MB: 32, arch: "Zen 4" },
    { id: "r5-7600",   brand: "AMD", name: "Ryzen 5 7600",   socket: "AM5", cores: 6,  threads: 12, boostGHz: 5.1, tdpW: 65,  launchYear: 2023, baseGHz: 3.8, l3MB: 32, arch: "Zen 4" },
    // ---- AMD AM4 (Zen 3) ----
    { id: "r9-5950x",  brand: "AMD", name: "Ryzen 9 5950X",  socket: "AM4", cores: 16, threads: 32, boostGHz: 4.9, tdpW: 105, launchYear: 2020, baseGHz: 3.4, l3MB: 64, arch: "Zen 3" },
    { id: "r9-5900x",  brand: "AMD", name: "Ryzen 9 5900X",  socket: "AM4", cores: 12, threads: 24, boostGHz: 4.8, tdpW: 105, launchYear: 2020, baseGHz: 3.7, l3MB: 64, arch: "Zen 3" },
    { id: "r7-5800x3d",brand: "AMD", name: "Ryzen 7 5800X3D",socket: "AM4", cores: 8,  threads: 16, boostGHz: 4.5, tdpW: 105, launchYear: 2022, baseGHz: 3.4, l3MB: 96, arch: "Zen 3" },
    { id: "r7-5800x",  brand: "AMD", name: "Ryzen 7 5800X",  socket: "AM4", cores: 8,  threads: 16, boostGHz: 4.7, tdpW: 105, launchYear: 2020, baseGHz: 3.8, l3MB: 32, arch: "Zen 3" },
    { id: "r7-5700x3d",brand: "AMD", name: "Ryzen 7 5700X3D",socket: "AM4", cores: 8,  threads: 16, boostGHz: 4.1, tdpW: 105, launchYear: 2024, baseGHz: 3.0, l3MB: 96, arch: "Zen 3" },
    { id: "r5-5600x",  brand: "AMD", name: "Ryzen 5 5600X",  socket: "AM4", cores: 6,  threads: 12, boostGHz: 4.6, tdpW: 65,  launchYear: 2020, baseGHz: 3.7, l3MB: 32, arch: "Zen 3" },
    { id: "r5-5600",   brand: "AMD", name: "Ryzen 5 5600",   socket: "AM4", cores: 6,  threads: 12, boostGHz: 4.4, tdpW: 65,  launchYear: 2022, baseGHz: 3.5, l3MB: 32, arch: "Zen 3" },
    // ---- Intel LGA1851 (Core Ultra 200S) ----
    { id: "u7-270kp",  brand: "Intel", name: "Core Ultra 7 270K Plus", socket: "LGA1851", cores: 24, threads: 24, boostGHz: 5.5, tdpW: 125, launchYear: 2026, baseGHz: 3.7, l3MB: 36, arch: "Arrow Lake Refresh" },
    { id: "u5-250kp",  brand: "Intel", name: "Core Ultra 5 250K Plus", socket: "LGA1851", cores: 18, threads: 18, boostGHz: 5.2, tdpW: 125, launchYear: 2026, baseGHz: 3.9, l3MB: 26, arch: "Arrow Lake Refresh" },
    { id: "u9-285k",   brand: "Intel", name: "Core Ultra 9 285K", socket: "LGA1851", cores: 24, threads: 24, boostGHz: 5.7, tdpW: 125, launchYear: 2024, baseGHz: 3.7, l3MB: 36, arch: "Arrow Lake" },
    { id: "u7-265k",   brand: "Intel", name: "Core Ultra 7 265K", socket: "LGA1851", cores: 20, threads: 20, boostGHz: 5.5, tdpW: 125, launchYear: 2024, baseGHz: 3.9, l3MB: 30, arch: "Arrow Lake" },
    { id: "u5-245k",   brand: "Intel", name: "Core Ultra 5 245K", socket: "LGA1851", cores: 14, threads: 14, boostGHz: 5.2, tdpW: 125, launchYear: 2024, baseGHz: 4.2, l3MB: 24, arch: "Arrow Lake" },
    // ---- Intel LGA1700 (14th / 13th / 12th gen) ----
    { id: "i9-14900k", brand: "Intel", name: "Core i9-14900K", socket: "LGA1700", cores: 24, threads: 32, boostGHz: 6.0, tdpW: 125, launchYear: 2023, baseGHz: 3.2, l3MB: 36, arch: "Raptor Lake" },
    { id: "i7-14700k", brand: "Intel", name: "Core i7-14700K", socket: "LGA1700", cores: 20, threads: 28, boostGHz: 5.6, tdpW: 125, launchYear: 2023, baseGHz: 3.4, l3MB: 33, arch: "Raptor Lake" },
    { id: "i5-14600k", brand: "Intel", name: "Core i5-14600K", socket: "LGA1700", cores: 14, threads: 20, boostGHz: 5.3, tdpW: 125, launchYear: 2023, baseGHz: 3.5, l3MB: 24, arch: "Raptor Lake" },
    { id: "i5-14400f", brand: "Intel", name: "Core i5-14400F", socket: "LGA1700", cores: 10, threads: 16, boostGHz: 4.7, tdpW: 65,  launchYear: 2024, baseGHz: 2.5, l3MB: 20, arch: "Raptor Lake" },
    { id: "i9-13900k", brand: "Intel", name: "Core i9-13900K", socket: "LGA1700", cores: 24, threads: 32, boostGHz: 5.8, tdpW: 125, launchYear: 2022, baseGHz: 3.0, l3MB: 36, arch: "Raptor Lake" },
    { id: "i7-13700k", brand: "Intel", name: "Core i7-13700K", socket: "LGA1700", cores: 16, threads: 24, boostGHz: 5.4, tdpW: 125, launchYear: 2022, baseGHz: 3.4, l3MB: 30, arch: "Raptor Lake" },
    { id: "i5-13600k", brand: "Intel", name: "Core i5-13600K", socket: "LGA1700", cores: 14, threads: 20, boostGHz: 5.1, tdpW: 125, launchYear: 2022, baseGHz: 3.5, l3MB: 24, arch: "Raptor Lake" },
    { id: "i5-13400f", brand: "Intel", name: "Core i5-13400F", socket: "LGA1700", cores: 10, threads: 16, boostGHz: 4.6, tdpW: 65,  launchYear: 2023, baseGHz: 2.5, l3MB: 20, arch: "Raptor Lake" },
    { id: "i9-12900k", brand: "Intel", name: "Core i9-12900K", socket: "LGA1700", cores: 16, threads: 24, boostGHz: 5.2, tdpW: 125, launchYear: 2021, baseGHz: 3.2, l3MB: 30, arch: "Alder Lake" },
    { id: "i7-12700k", brand: "Intel", name: "Core i7-12700K", socket: "LGA1700", cores: 12, threads: 20, boostGHz: 5.0, tdpW: 125, launchYear: 2021, baseGHz: 3.6, l3MB: 25, arch: "Alder Lake" },
    { id: "i5-12600k", brand: "Intel", name: "Core i5-12600K", socket: "LGA1700", cores: 10, threads: 16, boostGHz: 4.9, tdpW: 125, launchYear: 2021, baseGHz: 3.7, l3MB: 20, arch: "Alder Lake" },
    { id: "i5-12400f", brand: "Intel", name: "Core i5-12400F", socket: "LGA1700", cores: 6,  threads: 12, boostGHz: 4.4, tdpW: 65,  launchYear: 2022, baseGHz: 2.5, l3MB: 18, arch: "Alder Lake" }
  ]
};

window.BCP.gpus = {
  meta: {
    layer: "hardware.gpu",
    asOf: "2025-Q3",
    confidence: "high",
    source: "NVIDIA / AMD / Intel product pages (curated)"
  },
  items: [
    // ---- NVIDIA RTX 50 series ----
    { id: "rtx-5090",     brand: "NVIDIA", name: "GeForce RTX 5090",     vramGB: 32, tdpW: 575, launchYear: 2025, arch: "Blackwell", lengthMM: 360 },
    { id: "rtx-5080",     brand: "NVIDIA", name: "GeForce RTX 5080",     vramGB: 16, tdpW: 360, launchYear: 2025, arch: "Blackwell", lengthMM: 330 },
    { id: "rtx-5070ti",   brand: "NVIDIA", name: "GeForce RTX 5070 Ti",  vramGB: 16, tdpW: 300, launchYear: 2025, arch: "Blackwell", lengthMM: 300 },
    { id: "rtx-5070",     brand: "NVIDIA", name: "GeForce RTX 5070",     vramGB: 12, tdpW: 250, launchYear: 2025, arch: "Blackwell", lengthMM: 285 },
    { id: "rtx-5060ti",   brand: "NVIDIA", name: "GeForce RTX 5060 Ti",  vramGB: 16, tdpW: 180, launchYear: 2025, arch: "Blackwell", lengthMM: 245 },
    { id: "rtx-5060",     brand: "NVIDIA", name: "GeForce RTX 5060",     vramGB: 8,  tdpW: 145, launchYear: 2025, arch: "Blackwell", lengthMM: 240 },
    { id: "rtx-5050",     brand: "NVIDIA", name: "GeForce RTX 5050",     vramGB: 8,  tdpW: 130, launchYear: 2025, arch: "Blackwell", lengthMM: 220 },
    // ---- NVIDIA RTX 40 series ----
    { id: "rtx-4090",     brand: "NVIDIA", name: "GeForce RTX 4090",     vramGB: 24, tdpW: 450, launchYear: 2022, arch: "Ada Lovelace", lengthMM: 336 },
    { id: "rtx-4080s",    brand: "NVIDIA", name: "GeForce RTX 4080 Super", vramGB: 16, tdpW: 320, launchYear: 2024, arch: "Ada Lovelace", lengthMM: 310 },
    { id: "rtx-4070tis",  brand: "NVIDIA", name: "GeForce RTX 4070 Ti Super", vramGB: 16, tdpW: 285, launchYear: 2024, arch: "Ada Lovelace", lengthMM: 305 },
    { id: "rtx-4070s",    brand: "NVIDIA", name: "GeForce RTX 4070 Super", vramGB: 12, tdpW: 220, launchYear: 2024, arch: "Ada Lovelace", lengthMM: 285 },
    { id: "rtx-4070",     brand: "NVIDIA", name: "GeForce RTX 4070",     vramGB: 12, tdpW: 200, launchYear: 2023, arch: "Ada Lovelace", lengthMM: 245 },
    { id: "rtx-4060ti",   brand: "NVIDIA", name: "GeForce RTX 4060 Ti",  vramGB: 8,  tdpW: 160, launchYear: 2023, arch: "Ada Lovelace", lengthMM: 245 },
    { id: "rtx-4060",     brand: "NVIDIA", name: "GeForce RTX 4060",     vramGB: 8,  tdpW: 115, launchYear: 2023, arch: "Ada Lovelace", lengthMM: 240 },
    // ---- NVIDIA RTX 30 series ----
    { id: "rtx-3090",     brand: "NVIDIA", name: "GeForce RTX 3090",     vramGB: 24, tdpW: 350, launchYear: 2020, arch: "Ampere", lengthMM: 313 },
    { id: "rtx-3080",     brand: "NVIDIA", name: "GeForce RTX 3080",     vramGB: 10, tdpW: 320, launchYear: 2020, arch: "Ampere", lengthMM: 285 },
    { id: "rtx-3070",     brand: "NVIDIA", name: "GeForce RTX 3070",     vramGB: 8,  tdpW: 220, launchYear: 2020, arch: "Ampere", lengthMM: 242 },
    { id: "rtx-3060ti",   brand: "NVIDIA", name: "GeForce RTX 3060 Ti",  vramGB: 8,  tdpW: 200, launchYear: 2020, arch: "Ampere", lengthMM: 242 },
    { id: "rtx-3060",     brand: "NVIDIA", name: "GeForce RTX 3060",     vramGB: 12, tdpW: 170, launchYear: 2021, arch: "Ampere", lengthMM: 242 },
    // ---- AMD RX 9000 / 7000 / 6000 ----
    { id: "rx-9070gre",   brand: "AMD", name: "Radeon RX 9070 GRE", vramGB: 12, tdpW: 220, launchYear: 2025, arch: "RDNA 4", lengthMM: 280 },
    { id: "rx-9060xt",    brand: "AMD", name: "Radeon RX 9060 XT",  vramGB: 16, tdpW: 160, launchYear: 2025, arch: "RDNA 4", lengthMM: 260 },
    { id: "rx-9070xt",    brand: "AMD", name: "Radeon RX 9070 XT",  vramGB: 16, tdpW: 304, launchYear: 2025, arch: "RDNA 4", lengthMM: 300 },
    { id: "rx-9070",      brand: "AMD", name: "Radeon RX 9070",     vramGB: 16, tdpW: 220, launchYear: 2025, arch: "RDNA 4", lengthMM: 290 },
    { id: "rx-7900xtx",   brand: "AMD", name: "Radeon RX 7900 XTX", vramGB: 24, tdpW: 355, launchYear: 2022, arch: "RDNA 3", lengthMM: 320 },
    { id: "rx-7900xt",    brand: "AMD", name: "Radeon RX 7900 XT",  vramGB: 20, tdpW: 315, launchYear: 2022, arch: "RDNA 3", lengthMM: 300 },
    { id: "rx-7800xt",    brand: "AMD", name: "Radeon RX 7800 XT",  vramGB: 16, tdpW: 263, launchYear: 2023, arch: "RDNA 3", lengthMM: 290 },
    { id: "rx-7700xt",    brand: "AMD", name: "Radeon RX 7700 XT",  vramGB: 12, tdpW: 245, launchYear: 2023, arch: "RDNA 3", lengthMM: 280 },
    { id: "rx-7600",      brand: "AMD", name: "Radeon RX 7600",     vramGB: 8,  tdpW: 165, launchYear: 2023, arch: "RDNA 3", lengthMM: 250 },
    { id: "rx-6900xt",    brand: "AMD", name: "Radeon RX 6900 XT",  vramGB: 16, tdpW: 300, launchYear: 2020, arch: "RDNA 2", lengthMM: 290 },
    { id: "rx-6800xt",    brand: "AMD", name: "Radeon RX 6800 XT",  vramGB: 16, tdpW: 300, launchYear: 2020, arch: "RDNA 2", lengthMM: 290 },
    { id: "rx-6700xt",    brand: "AMD", name: "Radeon RX 6700 XT",  vramGB: 12, tdpW: 230, launchYear: 2021, arch: "RDNA 2", lengthMM: 270 },
    { id: "rx-6600",      brand: "AMD", name: "Radeon RX 6600",     vramGB: 8,  tdpW: 132, launchYear: 2021, arch: "RDNA 2", lengthMM: 240 },
    // ---- Intel Arc ----
    { id: "arc-b570",     brand: "Intel", name: "Arc B570", vramGB: 10, tdpW: 150, launchYear: 2025, arch: "Battlemage", lengthMM: 260 },
    { id: "arc-b580",     brand: "Intel", name: "Arc B580", vramGB: 12, tdpW: 190, launchYear: 2024, arch: "Battlemage", lengthMM: 270 },
    { id: "arc-a770",     brand: "Intel", name: "Arc A770", vramGB: 16, tdpW: 225, launchYear: 2022, arch: "Alchemist", lengthMM: 280 }
  ]
};
