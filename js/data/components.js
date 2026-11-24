/* ============================================================
 * COMPONENTS DATA — motherboards, memory kits, power supplies
 * Layer: components (specs + price per item). Logically separate
 * from hardware/benchmarks/prices layers.
 * Prices are curated 2025-Q3 US snapshots (low-medium confidence):
 * motherboard/RAM/PSU prices were not re-verified in Nov 2026 and
 * the 2026 market is volatile, especially DRAM.
 * ============================================================ */

window.BCP = window.BCP || {};

window.BCP.motherboards = {
  meta: {
    layer: "components/motherboards",
    asOf: "2025-Q3",
    confidence: "medium (specs high, prices curated snapshots)",
    source: "Manufacturer spec pages (ASUS, MSI, Gigabyte, ASRock); curated US street prices"
  },
  items: [
    // ---- AM5 (DDR5 only) ----
    { id: "a620m",   name: "A620M (mATX)",        socket: "AM5",     chipset: "A620",  formFactor: "mATX", ramType: "DDR5", ramSlots: 2, maxRamGB: 96,  m2Slots: 1, pcie5Gpu: false, priceUSD: 85 },
    { id: "b650m",   name: "B650M (mATX)",        socket: "AM5",     chipset: "B650",  formFactor: "mATX", ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 2, pcie5Gpu: false, priceUSD: 130 },
    { id: "b650",    name: "B650 (ATX)",          socket: "AM5",     chipset: "B650",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 3, pcie5Gpu: false, priceUSD: 160 },
    { id: "b650e",   name: "B650E (ATX)",         socket: "AM5",     chipset: "B650E", formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 3, pcie5Gpu: true,  priceUSD: 220 },
    { id: "x670e",   name: "X670E (ATX)",         socket: "AM5",     chipset: "X670E", formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 4, pcie5Gpu: true,  priceUSD: 300 },
    { id: "b850m",   name: "B850M (mATX)",        socket: "AM5",     chipset: "B850",  formFactor: "mATX", ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 2, pcie5Gpu: false, priceUSD: 150 },
    { id: "b850",    name: "B850 (ATX)",          socket: "AM5",     chipset: "B850",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 3, pcie5Gpu: true,  priceUSD: 190 },
    { id: "x870",    name: "X870 (ATX)",          socket: "AM5",     chipset: "X870",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 4, pcie5Gpu: true,  priceUSD: 250 },
    { id: "x870e",   name: "X870E (ATX)",         socket: "AM5",     chipset: "X870E", formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 4, pcie5Gpu: true,  priceUSD: 380 },
    // ---- AM4 (DDR4) ----
    { id: "a520m",   name: "A520M (mATX)",        socket: "AM4",     chipset: "A520",  formFactor: "mATX", ramType: "DDR4", ramSlots: 2, maxRamGB: 64,  m2Slots: 1, pcie5Gpu: false, priceUSD: 70 },
    { id: "b450",    name: "B450 (ATX)",          socket: "AM4",     chipset: "B450",  formFactor: "ATX",  ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 1, pcie5Gpu: false, priceUSD: 85 },
    { id: "b550m",   name: "B550M (mATX)",        socket: "AM4",     chipset: "B550",  formFactor: "mATX", ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 2, pcie5Gpu: false, priceUSD: 100 },
    { id: "b550",    name: "B550 (ATX)",          socket: "AM4",     chipset: "B550",  formFactor: "ATX",  ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 2, pcie5Gpu: false, priceUSD: 120 },
    { id: "x570",    name: "X570 (ATX)",          socket: "AM4",     chipset: "X570",  formFactor: "ATX",  ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 2, pcie5Gpu: false, priceUSD: 180 },
    // ---- LGA1851 (DDR5 only) ----
    { id: "b860m",   name: "B860M (mATX)",        socket: "LGA1851", chipset: "B860",  formFactor: "mATX", ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 2, pcie5Gpu: true,  priceUSD: 140 },
    { id: "b860",    name: "B860 (ATX)",          socket: "LGA1851", chipset: "B860",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 3, pcie5Gpu: true,  priceUSD: 170 },
    { id: "z890",    name: "Z890 (ATX)",          socket: "LGA1851", chipset: "Z890",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 256, m2Slots: 4, pcie5Gpu: true,  priceUSD: 280 },
    // ---- LGA1700 ----
    { id: "h610m",   name: "H610M DDR4 (mATX)",   socket: "LGA1700", chipset: "H610",  formFactor: "mATX", ramType: "DDR4", ramSlots: 2, maxRamGB: 64,  m2Slots: 1, pcie5Gpu: false, priceUSD: 75 },
    { id: "b660m",   name: "B660M DDR4 (mATX)",   socket: "LGA1700", chipset: "B660",  formFactor: "mATX", ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 2, pcie5Gpu: false, priceUSD: 110 },
    { id: "b760m",   name: "B760M DDR4 (mATX)",   socket: "LGA1700", chipset: "B760",  formFactor: "mATX", ramType: "DDR4", ramSlots: 4, maxRamGB: 128, m2Slots: 2, pcie5Gpu: false, priceUSD: 120 },
    { id: "b760-d5", name: "B760 DDR5 (ATX)",     socket: "LGA1700", chipset: "B760",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 3, pcie5Gpu: false, priceUSD: 160 },
    { id: "z790",    name: "Z790 DDR5 (ATX)",     socket: "LGA1700", chipset: "Z790",  formFactor: "ATX",  ramType: "DDR5", ramSlots: 4, maxRamGB: 192, m2Slots: 4, pcie5Gpu: true,  priceUSD: 240 }
  ]
};

window.BCP.memoryKits = {
  meta: {
    layer: "components/memory",
    asOf: "2025-Q3",
    confidence: "low-medium (specs high, prices curated snapshots; 2026 DRAM market volatile)",
    source: "JEDEC/XMP spec sheets; curated US street prices"
  },
  items: [
    { id: "d4-3200-16", name: "16 GB DDR4-3200 CL16 (2x8)",   type: "DDR4", speedMTs: 3200, capacityGB: 16, modules: 2, casLatency: 16, priceUSD: 35 },
    { id: "d4-3200-32", name: "32 GB DDR4-3200 CL16 (2x16)",  type: "DDR4", speedMTs: 3200, capacityGB: 32, modules: 2, casLatency: 16, priceUSD: 55 },
    { id: "d4-3600-32", name: "32 GB DDR4-3600 CL18 (2x16)",  type: "DDR4", speedMTs: 3600, capacityGB: 32, modules: 2, casLatency: 18, priceUSD: 65 },
    { id: "d5-4800-32", name: "32 GB DDR5-4800 CL40 (2x16)",  type: "DDR5", speedMTs: 4800, capacityGB: 32, modules: 2, casLatency: 40, priceUSD: 70 },
    { id: "d5-5600-32", name: "32 GB DDR5-5600 CL36 (2x16)",  type: "DDR5", speedMTs: 5600, capacityGB: 32, modules: 2, casLatency: 36, priceUSD: 90 },
    { id: "d5-6000-32", name: "32 GB DDR5-6000 CL30 (2x16)",  type: "DDR5", speedMTs: 6000, capacityGB: 32, modules: 2, casLatency: 30, priceUSD: 105 },
    { id: "d5-6000-64", name: "64 GB DDR5-6000 CL30 (2x32)",  type: "DDR5", speedMTs: 6000, capacityGB: 64, modules: 2, casLatency: 30, priceUSD: 190 },
    { id: "d5-6400-32", name: "32 GB DDR5-6400 CL32 (2x16)",  type: "DDR5", speedMTs: 6400, capacityGB: 32, modules: 2, casLatency: 32, priceUSD: 115 },
    { id: "d5-6800-32", name: "32 GB DDR5-6800 CL34 (2x16)",  type: "DDR5", speedMTs: 6800, capacityGB: 32, modules: 2, casLatency: 34, priceUSD: 140 },
    { id: "d5-7200-32", name: "32 GB DDR5-7200 CL36 (2x16)",  type: "DDR5", speedMTs: 7200, capacityGB: 32, modules: 2, casLatency: 36, priceUSD: 190 }
  ]
};

window.BCP.psus = {
  meta: {
    layer: "components/psus",
    asOf: "2025-Q3",
    confidence: "medium (specs high, prices curated snapshots)",
    source: "Manufacturer spec pages (Corsair, Seasonic, be quiet!, MSI); curated US street prices"
  },
  items: [
    { id: "psu-550b",  name: "550W 80+ Bronze",            wattageW: 550,  efficiency: "Bronze",   modular: "No",   atx31: false, priceUSD: 50 },
    { id: "psu-650b",  name: "650W 80+ Bronze",            wattageW: 650,  efficiency: "Bronze",   modular: "No",   atx31: false, priceUSD: 60 },
    { id: "psu-650g",  name: "650W 80+ Gold",              wattageW: 650,  efficiency: "Gold",     modular: "Semi", atx31: false, priceUSD: 80 },
    { id: "psu-750g",  name: "750W 80+ Gold ATX 3.0",      wattageW: 750,  efficiency: "Gold",     modular: "Full", atx31: true,  priceUSD: 100 },
    { id: "psu-850g",  name: "850W 80+ Gold ATX 3.1",      wattageW: 850,  efficiency: "Gold",     modular: "Full", atx31: true,  priceUSD: 120 },
    { id: "psu-1000g", name: "1000W 80+ Gold ATX 3.1",     wattageW: 1000, efficiency: "Gold",     modular: "Full", atx31: true,  priceUSD: 160 },
    { id: "psu-1000p", name: "1000W 80+ Platinum ATX 3.1", wattageW: 1000, efficiency: "Platinum", modular: "Full", atx31: true,  priceUSD: 200 },
    { id: "psu-1200p", name: "1200W 80+ Platinum ATX 3.1", wattageW: 1200, efficiency: "Platinum", modular: "Full", atx31: true,  priceUSD: 260 },
    { id: "psu-1500p", name: "1500W 80+ Platinum ATX 3.1", wattageW: 1500, efficiency: "Platinum", modular: "Full", atx31: true,  priceUSD: 330 }
  ]
};
