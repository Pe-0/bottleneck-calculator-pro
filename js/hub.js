/* ============================================================
 * HUB - lets a feature cluster add one sidebar tab with sub-tabs.
 * BCP.addHub({ key, label, title, intro, before, subs: [{ id, label, render(box) }] })
 * Shared helpers: BCP.ui (el, usd, num, store).
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var ui = BCP.ui = {
    el: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; },
    usd: function (n, d) { return n == null || isNaN(n) ? "-" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d }); },
    num: function (n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d }); },
    get: function (k, def) { try { var v = localStorage.getItem("bcp." + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem("bcp." + k, JSON.stringify(v)); } catch (e) {} },
    field: function (label, input, hint) {
      var w = ui.el("label", "hb-field"); w.appendChild(ui.el("span", null, label)); w.appendChild(input);
      if (hint) w.appendChild(ui.el("small", "muted", hint)); return w;
    },
    number: function (val, min, max, step, onChange) {
      var i = ui.el("input"); i.type = "number"; i.value = val; i.min = min; i.max = max; i.step = step || 1;
      i.addEventListener("input", function () { var v = parseFloat(i.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); });
      return i;
    },
    select: function (opts, val, onChange) {
      var s = ui.el("select"); opts.forEach(function (o) { var op = ui.el("option", null, o[1]); op.value = o[0]; if (o[0] === val) op.selected = true; s.appendChild(op); });
      s.addEventListener("change", function () { onChange(s.value); }); return s;
    },
    stat: function (k, v, cls) { var d = ui.el("div", "pw-stat"); d.appendChild(ui.el("small", null, k)); var s = ui.el("strong", cls || "", v); d.appendChild(s); return d; },
    bar: function (pct, cls) { var b = ui.el("div", "rv-bar"); var f = ui.el("div", "rv-fill " + (cls || "")); f.style.width = Math.max(0, Math.min(100, pct)) + "%"; b.appendChild(f); return b; },
    panel: function (title, sub) { var p = ui.el("section", "panel"); var h = ui.el("h2", null, title); if (sub) h.appendChild(ui.el("small", "h-sub", sub)); p.appendChild(h); return p; },
    note: function (t) { return ui.el("p", "muted cmp-note", t); },
    download: function (name, text, type) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
  };

  var hubs = [];
  function hideAllViews() { document.querySelectorAll(".view").forEach(function (v) { v.classList.add("hidden"); }); }

  BCP.addHub = function (cfg) {
    var nav = document.querySelector(".tab-nav"), anchor = document.querySelector('.tab-btn[data-view="' + (cfg.before || "dash") + '"]');
    var btn = ui.el("button", "tab-btn", cfg.label); btn.type = "button"; btn.setAttribute("data-view", cfg.key);
    nav.insertBefore(btn, anchor);
    var viewId = "viewHub_" + cfg.key;
    var view = ui.el("div", "view hidden"); view.id = viewId;
    var hero = ui.el("section", "hero"); hero.appendChild(ui.el("h1", null, cfg.title)); hero.appendChild(ui.el("p", null, cfg.intro)); view.appendChild(hero);
    var pills = ui.el("div", "mk-chips hb-pills"); view.appendChild(pills);
    var body = ui.el("div", "hb-body"); view.appendChild(body);
    var host = document.getElementById("viewMarket").parentNode; host.appendChild(view);
    var cur = cfg.subs[0].id;
    function show(id) {
      cur = id; ui.set("hub." + cfg.key, id);
      pills.querySelectorAll(".mk-chip").forEach(function (c) { c.classList.toggle("active", c.getAttribute("data-sub") === id); });
      body.innerHTML = "";
      cfg.subs.forEach(function (s) { if (s.id === id) { try { s.render(body); } catch (e) { body.appendChild(ui.el("p", "muted", "This section failed to load: " + e.message)); } } });
    }
    cfg.subs.forEach(function (s) {
      var c = ui.el("button", "mk-chip", s.label); c.type = "button"; c.setAttribute("data-sub", s.id);
      c.addEventListener("click", function () { show(s.id); }); pills.appendChild(c);
    });
    var hub = { key: cfg.key, viewId: viewId, show: show, open: function (sub) { btn.click(); if (sub) show(sub); } };
    hubs.push(hub);
    btn.addEventListener("click", function () {
      hideAllViews();
      document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === btn); });
      view.classList.remove("hidden"); window.scrollTo(0, 0);
      var saved = ui.get("hub." + cfg.key, cur);
      show(cfg.subs.some(function (s) { return s.id === saved; }) ? saved : cfg.subs[0].id);
    });
    BCP.hubs = hubs;
    return hub;
  };

  // If a non-hub view becomes visible (other tab, Data sources, Auth), hide hub views.
  function guard() {
    var visible = [].slice.call(document.querySelectorAll(".view:not(.hidden)"));
    var hubViews = visible.filter(function (v) { return v.id.indexOf("viewHub_") === 0; });
    var other = visible.filter(function (v) { return v.id.indexOf("viewHub_") !== 0; });
    if (hubViews.length && other.length) hubViews.forEach(function (v) { v.classList.add("hidden"); });
  }
  document.addEventListener("DOMContentLoaded", function () {
    new MutationObserver(guard).observe(document.querySelector("main") || document.body, { attributes: true, subtree: true, attributeFilter: ["class"] });
  });
})();
