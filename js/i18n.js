/* i18n core: runtime translator + RTL switch.
   Arabic is OFF for visitors. It only activates with ?lang=ar or localStorage bcp.lang=ar (test flag).
   No visible toggle exists until the Arabic coverage audit is empty. */
(function () {
  "use strict";
  var flag = false;
  try {
    var q = /[?&]lang=(\w+)/.exec(location.search);
    if (q) { if (q[1] === "ar") localStorage.setItem("bcp.lang", "ar"); else localStorage.removeItem("bcp.lang"); }
    flag = localStorage.getItem("bcp.lang") === "ar";
  } catch (e) {}
  var I18N = window.I18N = { active: flag, dict: {}, pats: [], add: function (o) { for (var k in o) I18N.dict[k] = o[k]; } };
  if (!flag) return;
  var de = document.documentElement;
  de.setAttribute("lang", "ar"); de.setAttribute("dir", "rtl"); de.classList.add("is-rtl");
  var AR = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  var NUMRE = /\d[\d,]*(?:\.\d+)?/g;
  var orig = new WeakMap();
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SVG: 1, CANVAS: 1 };
  function norm(s) { var nums = []; var k = s.replace(NUMRE, function (m) { nums.push(m); return "#"; }); return { k: k, nums: nums }; }
  function fill(t, nums) { var i = 0; return t.replace(/#/g, function () { return i < nums.length ? nums[i++] : "#"; }); }
  function tr(s) {
    var lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0], core = s.trim();
    if (!core) return s;
    var n = norm(core), t = I18N.dict[n.k];
    if (t === undefined) t = I18N.dict[core];
    if (t === undefined) return s;
    return lead + fill(t, n.nums) + trail;
  }
  I18N.t = function (s) { return tr(s); };
  function doText(node) {
    var cur = node.nodeValue, o = orig.get(node);
    if (o && o.out === cur) return;
    var out = tr(cur);
    if (out !== cur) { orig.set(node, { src: cur, out: out }); node.nodeValue = out; }
  }
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  function doEl(el) {
    if (el.nodeType !== 1 || SKIP[el.tagName.toUpperCase()]) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v) { var o = tr(v); if (o !== v) el.setAttribute(ATTRS[i], o); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.tagName.toUpperCase()]) return;
    doEl(root);
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === "characterData") doText(m.target);
        else if (m.type === "attributes") doEl(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    } finally { busy = false; }
    mo.takeRecords();
  });
  function start() {
    document.title = tr(document.title);
    busy = true; walk(document.body); busy = false;
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  window.addEventListener("load", function () { setTimeout(start, 0); });
  // native dialogs
  var _a = window.alert, _c = window.confirm, _p = window.prompt;
  window.alert = function (m) { return _a.call(window, tr(String(m))); };
  window.confirm = function (m) { return _c.call(window, tr(String(m))); };
  window.prompt = function (m, d) { return _p.call(window, tr(String(m)), d); };
})();
