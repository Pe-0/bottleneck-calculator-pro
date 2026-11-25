/* Monitor catalog - curated, indicative USD prices.
 * fpsRes maps the panel to the engine's resolution keys; fpsScale
 * adjusts ultrawide panels relative to their base key. */
window.BCP = window.BCP || {};
window.BCP.monitors = {
  meta: { asOf: "2026-11", confidence: "curated estimates, prices indicative", currency: "USD" },
  items: [
    { id: "m24-1080-180",  name: '24" 1080p 180 Hz IPS',        sizeIn: 24, res: "1920 x 1080", fpsRes: "p1080", fpsScale: 1,    refreshHz: 180, panel: "IPS",        priceUSD: 120 },
    { id: "m25-1080-240",  name: '25" 1080p 240 Hz IPS',        sizeIn: 25, res: "1920 x 1080", fpsRes: "p1080", fpsScale: 1,    refreshHz: 240, panel: "IPS",        priceUSD: 180 },
    { id: "m27-1440-165",  name: '27" 1440p 165 Hz IPS',        sizeIn: 27, res: "2560 x 1440", fpsRes: "p1440", fpsScale: 1,    refreshHz: 165, panel: "IPS",        priceUSD: 220 },
    { id: "m27-1440-240",  name: '27" 1440p 240 Hz IPS',        sizeIn: 27, res: "2560 x 1440", fpsRes: "p1440", fpsScale: 1,    refreshHz: 240, panel: "IPS",        priceUSD: 350 },
    { id: "m32-1440-165",  name: '32" 1440p 165 Hz VA',         sizeIn: 32, res: "2560 x 1440", fpsRes: "p1440", fpsScale: 1,    refreshHz: 165, panel: "VA",         priceUSD: 280 },
    { id: "m27-1440-360",  name: '27" 1440p 360 Hz OLED',       sizeIn: 27, res: "2560 x 1440", fpsRes: "p1440", fpsScale: 1,    refreshHz: 360, panel: "OLED",       priceUSD: 650 },
    { id: "m27-4k-144",    name: '27" 4K 144 Hz IPS',           sizeIn: 27, res: "3840 x 2160", fpsRes: "p2160", fpsScale: 1,    refreshHz: 144, panel: "IPS",        priceUSD: 500 },
    { id: "m32-4k-240",    name: '32" 4K 240 Hz OLED',          sizeIn: 32, res: "3840 x 2160", fpsRes: "p2160", fpsScale: 1,    refreshHz: 240, panel: "OLED",       priceUSD: 1000 },
    { id: "m34-uw-165",    name: '34" ultrawide 165 Hz VA',     sizeIn: 34, res: "3440 x 1440", fpsRes: "p1440", fpsScale: 0.82, refreshHz: 165, panel: "VA",         priceUSD: 450 },
    { id: "m49-uw-240",    name: '49" super-ultrawide 240 Hz OLED', sizeIn: 49, res: "5120 x 1440", fpsRes: "p2160", fpsScale: 0.88, refreshHz: 240, panel: "OLED", priceUSD: 1300 }
  ]
};
