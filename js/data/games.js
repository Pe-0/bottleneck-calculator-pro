/* ============================================================
 * GAME DEMAND DATA — FPS estimate baselines
 * Layer: benchmarks.games (kept with benchmark logic).
 * baseFps: average FPS of a reference rig (GPU score 100 = RTX 4090,
 * CPU score 100 = 7800X3D) at each resolution, ultra-ish settings,
 * no upscaling. cpuWeight: 0..1 how strongly the game scales with
 * CPU at high frame rates (esports titles ~0.9, GPU-heavy AAA ~0.4).
 * confidence: medium — curated from public benchmark suites.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.games = {
  meta: {
    layer: "benchmarks.games",
    asOf: "2025-Q3",
    confidence: "medium",
    source: "Curated from public benchmark suites (TechPowerUp, Tom's Hardware, Notebookcheck)",
    reference: "RTX 4090 + 7800X3D = 100/100, native resolution, highest preset, no upscaling"
  },
  items: [
    { id: "cyberpunk",   name: "Cyberpunk 2077",        cpuWeight: 0.45, baseFps: { p1080: 130, p1440: 92,  p2160: 52 } },
    { id: "rdr2",        name: "Red Dead Redemption 2", cpuWeight: 0.40, baseFps: { p1080: 140, p1440: 105, p2160: 62 } },
    { id: "hogwarts",    name: "Hogwarts Legacy",       cpuWeight: 0.50, baseFps: { p1080: 115, p1440: 85,  p2160: 50 } },
    { id: "starfield",   name: "Starfield",             cpuWeight: 0.55, baseFps: { p1080: 100, p1440: 78,  p2160: 48 } },
    { id: "eldenring",   name: "Elden Ring",            cpuWeight: 0.50, baseFps: { p1080: 60,  p1440: 60,  p2160: 60 }, cap: 60 },
    { id: "bg3",         name: "Baldur's Gate 3",       cpuWeight: 0.60, baseFps: { p1080: 120, p1440: 95,  p2160: 58 } },
    { id: "witcher3",    name: "The Witcher 3 (Next-Gen)", cpuWeight: 0.45, baseFps: { p1080: 135, p1440: 100, p2160: 58 } },
    { id: "forza",       name: "Forza Horizon 5",       cpuWeight: 0.45, baseFps: { p1080: 155, p1440: 125, p2160: 82 } },
    { id: "spiderman",   name: "Spider-Man Remastered", cpuWeight: 0.55, baseFps: { p1080: 135, p1440: 105, p2160: 65 } },
    { id: "warzone",     name: "Call of Duty: Warzone", cpuWeight: 0.70, baseFps: { p1080: 150, p1440: 120, p2160: 75 } },
    { id: "fortnite",    name: "Fortnite (Perf. Mode)", cpuWeight: 0.75, baseFps: { p1080: 240, p1440: 190, p2160: 120 } },
    { id: "apex",        name: "Apex Legends",          cpuWeight: 0.70, baseFps: { p1080: 220, p1440: 180, p2160: 115 } },
    { id: "cs2",         name: "Counter-Strike 2",      cpuWeight: 0.90, baseFps: { p1080: 420, p1440: 360, p2160: 240 } },
    { id: "valorant",    name: "Valorant",              cpuWeight: 0.95, baseFps: { p1080: 560, p1440: 500, p2160: 400 } },
    { id: "minecraft",   name: "Minecraft (Java)",      cpuWeight: 0.85, baseFps: { p1080: 300, p1440: 260, p2160: 180 } }
  ]
};
