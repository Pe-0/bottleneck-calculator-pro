// Dumps CPU/GPU ids + names from the data layer for the price matcher.
global.window = {};
require("../js/data/hardware.js");
var B = window.BCP;
function m(a) { return a.items.map(function (x) { return { id: x.id, name: x.name, brand: x.brand, legacy: !!x.legacy, mobile: !!x.mobile }; }); }
process.stdout.write(JSON.stringify({ cpu: m(B.cpus), gpu: m(B.gpus) }));
