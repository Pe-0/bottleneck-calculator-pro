// Dumps part ids + names (+ key fields) from the data layer for the price matcher.
global.window = {};
["hardware", "components", "cooling-cases", "storage"].forEach(function (f) { require("../js/data/" + f + ".js"); });
var B = window.BCP;
function m(a) { return a.items.map(function (x) { return { id: x.id, name: x.name, brand: x.brand, legacy: !!x.legacy, mobile: !!x.mobile, chipset: x.chipset, socket: x.socket, formFactor: x.formFactor }; }); }
var out = { cpu: m(B.cpus), gpu: m(B.gpus), mobo: m(B.motherboards), ram: m(B.memoryKits), psu: m(B.psus), ssd: m(B.storage), pcase: m(B.cases) };
process.stdout.write(JSON.stringify(out));
