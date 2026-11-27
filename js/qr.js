/* Minimal QR code generator (byte mode, error correction L, versions 1-10, fixed mask 0).
 * BCP.qr(text) -> array of rows of booleans, or null when the text is too long. */
(function () {
  "use strict";
  var EC = { 1: [26, 7, [[1, 19]]], 2: [44, 10, [[1, 34]]], 3: [70, 15, [[1, 55]]], 4: [100, 20, [[1, 80]]], 5: [134, 26, [[1, 108]]], 6: [172, 18, [[2, 68]]], 7: [196, 20, [[2, 78]]], 8: [242, 24, [[2, 97]]], 9: [292, 30, [[2, 116]]], 10: [346, 18, [[2, 68], [2, 69]]] };
  var ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  var EXP = [], LOG = [];
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function rsGen(n) { var g = [1]; for (var i = 0; i < n; i++) { var ng = []; for (var j = 0; j <= g.length; j++) ng[j] = (j < g.length ? gmul(g[j], 1) : 0) ^ (j > 0 ? gmul(g[j - 1], EXP[i]) : 0); g = ng; } return g; }
  function rsEnc(data, n) { var g = rsGen(n), res = []; for (var i = 0; i < n; i++) res[i] = 0; data.forEach(function (d) { var f = d ^ res[0]; res.shift(); res.push(0); for (var i = 0; i < n; i++) res[i] ^= gmul(g[i + 1], f); }); return res; }
  function bits(val, len, out) { for (var i = len - 1; i >= 0; i--) out.push((val >> i) & 1); }
  function bch(v, gen, genLen, total) { var d = v << (total - 5 >= 0 ? genLen : 0); return d; }
  function formatBits(mask) { var data = (1 << 3 | mask), v = data << 10, g = 0x537; for (var i = 14; i >= 10; i--) if ((v >> i) & 1) v ^= g << (i - 10); return ((data << 10) | v) ^ 0x5412; }
  function versionBits(ver) { var v = ver << 12, g = 0x1f25; for (var i = 17; i >= 12; i--) if ((v >> i) & 1) v ^= g << (i - 12); return (ver << 12) | v; }
  window.BCP = window.BCP || {};
  BCP.qr = function (text) {
    var bytes = []; var enc = unescape(encodeURIComponent(text)); for (var i = 0; i < enc.length; i++) bytes.push(enc.charCodeAt(i));
    var ver = 0; for (var v = 1; v <= 10; v++) { var dc = EC[v][2].reduce(function (s, b) { return s + b[0] * b[1]; }, 0); if (bytes.length + 2 + (v > 9 ? 1 : 0) <= dc) { ver = v; break; } }
    if (!ver) return null;
    var dcw = EC[ver][2].reduce(function (s, b) { return s + b[0] * b[1]; }, 0), b = [];
    bits(4, 4, b); bits(bytes.length, ver > 9 ? 16 : 8, b); bytes.forEach(function (x) { bits(x, 8, b); });
    for (i = 0; i < 4 && b.length < dcw * 8; i++) b.push(0); while (b.length % 8) b.push(0);
    var data = []; for (i = 0; i < b.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = x << 1 | b[i + j]; data.push(x); }
    for (var pad = 0; data.length < dcw; pad++) data.push(pad % 2 ? 0x11 : 0xec);
    var blocks = [], pos = 0, ecn = EC[ver][1];
    EC[ver][2].forEach(function (g) { for (var k = 0; k < g[0]; k++) { var d = data.slice(pos, pos + g[1]); pos += g[1]; blocks.push({ d: d, e: rsEnc(d, ecn) }); } });
    var out = [], maxd = Math.max.apply(null, blocks.map(function (x) { return x.d.length; }));
    for (i = 0; i < maxd; i++) blocks.forEach(function (bl) { if (i < bl.d.length) out.push(bl.d[i]); });
    for (i = 0; i < ecn; i++) blocks.forEach(function (bl) { out.push(bl.e[i]); });
    var n = 17 + 4 * ver, m = [], f = [];
    for (i = 0; i < n; i++) { m.push([]); f.push([]); for (j = 0; j < n; j++) { m[i].push(false); f[i].push(false); } }
    function set(r, c, v) { if (r >= 0 && c >= 0 && r < n && c < n) { m[r][c] = v; f[r][c] = true; } }
    function finder(r, c) { for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) { var on = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6 && (dy == 0 || dy == 6 || dx == 0 || dx == 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4)); set(r + dy, c + dx, on); } }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (i = 8; i < n - 8; i++) { set(6, i, i % 2 == 0); set(i, 6, i % 2 == 0); }
    var al = ALIGN[ver] || []; al.forEach(function (r) { al.forEach(function (c) { if ((r == 6 && c == 6) || (r == 6 && c == al[al.length - 1]) || (c == 6 && r == al[al.length - 1])) return; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(r + dy, c + dx, Math.max(Math.abs(dy), Math.abs(dx)) != 1); }); });
    set(n - 8, 8, true);
    var fb = formatBits(0);
    function sx(x, y, v) { set(y, x, v); }
    for (i = 0; i < 15; i++) { var bit = ((fb >> i) & 1) == 1;
      if (i < 6) sx(8, i, bit); else if (i == 6) sx(8, 7, bit); else if (i == 7) sx(8, 8, bit); else if (i == 8) sx(7, 8, bit); else sx(14 - i, 8, bit);
      if (i < 8) sx(n - 1 - i, 8, bit); else sx(8, n - 15 + i, bit); }
    if (ver >= 7) { var vb = versionBits(ver); for (i = 0; i < 18; i++) { var bt = ((vb >> i) & 1) == 1; set(Math.floor(i / 3), n - 11 + i % 3, bt); set(n - 11 + i % 3, Math.floor(i / 3), bt); } }
    var all = []; out.forEach(function (x) { bits(x, 8, all); });
    var idx = 0, up = true;
    for (var c = n - 1; c > 0; c -= 2) { if (c == 6) c--;
      for (var t = 0; t < n; t++) { var r = up ? n - 1 - t : t;
        for (var k = 0; k < 2; k++) { var cc = c - k; if (f[r][cc]) continue; var bv = idx < all.length ? all[idx] == 1 : false; idx++; if ((r + cc) % 2 == 0) bv = !bv; m[r][cc] = bv; } }
      up = !up; }
    return m;
  };
})();
