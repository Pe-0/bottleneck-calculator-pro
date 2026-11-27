/* ============================================================
 * STORAGE DATA — SSDs
 * Layer: components/storage. Logically separate.
 * Prices refreshed 2026-11-27 from the weekly feed (see meta).
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.storage = {
  meta: {
    layer: "components/storage",
    asOf: "specs 2025-Q3; prices 2026-W47",
    confidence: "medium (specs vendor-published; prices are floor prices from the weekly US retail feed)",
    source: "Samsung, WD, Crucial, Kingston, Solidigm spec pages; prices refreshed 2026-11-27 from the Pricify weekly US retail feed (cheapest in-stock internal drive of the same size/interface where matched; Gen3 and flagship variants scaled from the matched Gen4 change)"
  },
  items: [
    { id: "ssd-500-g3",  name: "500 GB M.2 NVMe Gen3 (up to 3,500 MB/s)",        capacityGB: 500,  interface: "NVMe PCIe 3.0", readMBs: 3500,  priceUSD: 83 },
    { id: "ssd-1tb-g3",  name: "1 TB M.2 NVMe Gen3 (up to 3,500 MB/s)",          capacityGB: 1000, interface: "NVMe PCIe 3.0", readMBs: 3500,  priceUSD: 110 },
    { id: "ssd-1tb-sata",name: "1 TB SATA SSD 2.5-inch (up to 560 MB/s)",           capacityGB: 1000, interface: "SATA",          readMBs: 560,   priceUSD: 107 },
    { id: "ssd-1tb-g4",  name: "1 TB M.2 NVMe Gen4 (up to 7,000 MB/s)",          capacityGB: 1000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 140 },
    { id: "ssd-1tb-g4h", name: "1 TB M.2 NVMe Gen4 flagship (up to 7,450 MB/s)", capacityGB: 1000, interface: "NVMe PCIe 4.0", readMBs: 7450,  priceUSD: 180 },
    { id: "ssd-2tb-g4",  name: "2 TB M.2 NVMe Gen4 (up to 7,000 MB/s)",          capacityGB: 2000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 280 },
    { id: "ssd-2tb-g4h", name: "2 TB M.2 NVMe Gen4 flagship (up to 7,450 MB/s)", capacityGB: 2000, interface: "NVMe PCIe 4.0", readMBs: 7450,  priceUSD: 350 },
    { id: "ssd-4tb-g4",  name: "4 TB M.2 NVMe Gen4 (up to 7,000 MB/s)",          capacityGB: 4000, interface: "NVMe PCIe 4.0", readMBs: 7000,  priceUSD: 500 },
    { id: "ssd-1tb-g5",  name: "1 TB M.2 NVMe Gen5 (up to 11,700 MB/s)",          capacityGB: 1000, interface: "NVMe PCIe 5.0", readMBs: 11700, priceUSD: 205 },
    { id: "ssd-2tb-g5",  name: "2 TB M.2 NVMe Gen5 (up to 12,400 MB/s)",          capacityGB: 2000, interface: "NVMe PCIe 5.0", readMBs: 12400, priceUSD: 350 },
    { id: "ssd-250-g3",  name: "250 GB M.2 NVMe Gen3 (up to 3,100 MB/s)",        capacityGB: 250,  interface: "NVMe PCIe 3.0", readMBs: 3100,  priceUSD: 62 },
    { id: "ssd-500-sata",name: "500 GB SATA SSD 2.5-inch (up to 560 MB/s)",      capacityGB: 500,  interface: "SATA",          readMBs: 560,   priceUSD: 68 },
    { id: "ssd-500-g4",  name: "500 GB M.2 NVMe Gen4 (up to 6,600 MB/s)",        capacityGB: 500,  interface: "NVMe PCIe 4.0", readMBs: 6600,  priceUSD: 100 },
    { id: "ssd-2tb-g3",  name: "2 TB M.2 NVMe Gen3 (up to 3,500 MB/s)",          capacityGB: 2000, interface: "NVMe PCIe 3.0", readMBs: 3500,  priceUSD: 222 },
    { id: "ssd-2tb-sata",name: "2 TB SATA SSD 2.5-inch (up to 560 MB/s)",        capacityGB: 2000, interface: "SATA",          readMBs: 560,   priceUSD: 330 },
    { id: "ssd-4tb-sata",name: "4 TB SATA SSD 2.5-inch (up to 560 MB/s)",        capacityGB: 4000, interface: "SATA",          readMBs: 560,   priceUSD: 343 },
    { id: "ssd-4tb-g4h", name: "4 TB M.2 NVMe Gen4 flagship (up to 7,450 MB/s)", capacityGB: 4000, interface: "NVMe PCIe 4.0", readMBs: 7450,  priceUSD: 607 },
    { id: "ssd-4tb-g5",  name: "4 TB M.2 NVMe Gen5 (up to 12,400 MB/s)",         capacityGB: 4000, interface: "NVMe PCIe 5.0", readMBs: 12400, priceUSD: 700 }
  ]
};
