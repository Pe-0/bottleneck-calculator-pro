/* ============================================================
 * STORAGE DATA — SSDs
 * Layer: components/storage. Logically separate.
 * Prices are curated 2025-Q3 US snapshots (NAND market volatile).
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.storage = {
  meta: {
    layer: "components/storage",
    asOf: "2025-Q3",
    confidence: "medium (specs vendor-published, prices curated)",
    source: "Samsung, WD, Crucial, Kingston, Solidigm spec pages"
  },
  items: [
    { id: "ssd-500-g3",  name: "500 GB NVMe Gen3",        capacityGB: 500,  interface: "NVMe PCIe 3.0", readMBs: 3500,  priceUSD: 40 },
    { id: "ssd-1tb-g3",  name: "1 TB NVMe Gen3",          capacityGB: 1000, interface: "NVMe PCIe 3.0", readMBs: 3500,  priceUSD: 55 },
    { id: "ssd-1tb-sata",name: "1 TB SATA SSD",           capacityGB: 1000, interface: "SATA",          readMBs: 560,   priceUSD: 55 },
    { id: "ssd-1tb-g4",  name: "1 TB NVMe Gen4",          capacityGB: 1000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 70 },
    { id: "ssd-1tb-g4h", name: "1 TB NVMe Gen4 flagship", capacityGB: 1000, interface: "NVMe PCIe 4.0", readMBs: 7450,  priceUSD: 90 },
    { id: "ssd-2tb-g4",  name: "2 TB NVMe Gen4",          capacityGB: 2000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 120 },
    { id: "ssd-2tb-g4h", name: "2 TB NVMe Gen4 flagship", capacityGB: 2000, interface: "NVMe PCIe 4.0", readMBs: 7450,  priceUSD: 150 },
    { id: "ssd-4tb-g4",  name: "4 TB NVMe Gen4",          capacityGB: 4000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 280 },
    { id: "ssd-1tb-g5",  name: "1 TB NVMe Gen5",          capacityGB: 1000, interface: "NVMe PCIe 5.0", readMBs: 11700, priceUSD: 140 },
    { id: "ssd-2tb-g5",  name: "2 TB NVMe Gen5",          capacityGB: 2000, interface: "NVMe PCIe 5.0", readMBs: 12400, priceUSD: 240 }
  ]
};
