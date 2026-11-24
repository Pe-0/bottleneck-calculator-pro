# Bottleneck Calculator Pro

Stage 1 of a PC hardware platform: a CPU/GPU balance checker with resolution- and workload-aware bottleneck analysis, FPS estimates for popular games, and basic compatibility guidance.

Live site: deployed on Netlify (free tier). English UI, prices in USD.

## What it does

- Pick a CPU and GPU from a seeded database of popular current- and recent-gen parts.
- Bottleneck percentage **varies by resolution (1080p/1440p/4K) and workload (gaming / streaming / productivity)** — never a fixed number per CPU+GPU pair.
- FPS estimates for 15 popular games at the selected resolution.
- Compatibility advice: socket + RAM generation (including the LGA1700 DDR4-vs-DDR5 pitfall), chipset guidance, recommended PSU wattage, high-power GPU warnings, and severe-mismatch alerts.

## Architecture

No build step. A static site — plain HTML/CSS/JS — so any static host can serve it.

```
index.html          page structure
css/styles.css      theme (dark navy, blue/teal accents)
js/engine.js        bottleneck + FPS model (pure functions, DOM-free)
js/app.js           UI wiring
js/data/
  hardware.js       CPU/GPU physical specs        (hardware layer)
  benchmarks.js     relative performance scores    (benchmark layer)
  games.js          per-game FPS baselines         (benchmark layer)
  prices.js         USD street prices              (price layer)
  compat.js         socket/RAM/PSU rules           (compat layer)
```

Hardware, benchmark, compatibility, and price data are deliberately separate files so each layer can later be swapped for a live API or an automated refresh pipeline without touching the others.

## Data confidence

Every data file carries `meta.asOf` and `meta.confidence`:

- Specs: high (vendor spec sheets, curated)
- Benchmark scores + game FPS baselines: medium (curated from public benchmark aggregates)
- Prices: low (curated street prices — first candidate for a live feed)

FPS figures are estimates from relative-performance data, not measured benchmarks.

## Bottleneck model

```
requiredCpuScore = gpuScore x feedNeed(resolution) x workloadModifier
cpu-limited:  pct = (1 - cpuScore / requiredCpuScore) x 100
gpu-limited:  pct = (1 - requiredCpuScore / cpuScore) x 100
```

`feedNeed` falls as resolution rises (1080p: 1.6, 1440p: 1.15, 4K: 0.75) because higher resolutions shift load onto the GPU. Streaming adds a 20% CPU-side modifier; productivity compares multi-core scores 1:1.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Roadmap (later stages)

- Live price feeds replacing `js/data/prices.js`
- Automated benchmark refresh pipeline
- Motherboard/RAM/PSU/case catalogs with full build compatibility
- Build sharing, user accounts, marketplace
