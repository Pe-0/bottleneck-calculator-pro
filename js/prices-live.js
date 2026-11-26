/* ============================================================
 * LIVE PRICES - weekly US retail snapshot (Pricify open data, CC BY 4.0)
 * Separate layer (BCP.pricesLive) from the curated prices layer.
 * Renders: Calculator "Market prices" panel (price, vs MSRP, weekly change,
 * 7-week history, deal flag, where to buy) and the Market tab.
 * ============================================================ */
(function () {
  "use strict";
  var BCP = window.BCP;
  var PL = BCP.pricesLive;
  var $ = function (s) { return document.querySelector(s); };
  function usd(n) { return n == null ? "-" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safeUrl(u) { return typeof u === "string" && /^https:\/\//.test(u) ? u : null; }
  function pct(n) { return (n > 0 ? "+" : "") + (Math.round(n * 10) / 10) + "%"; }
  function weekLabel() { return PL ? PL.meta.week + " (" + PL.meta.from + " to " + PL.meta.to + ")" : ""; }

  // ---- deal flag from the item's own weekly history ----
  function dealFlag(rec, hist) {
    var out = [];
    if (rec.launch_price) {
      var d = (rec.week_close / rec.launch_price - 1) * 100;
      if (d <= -3) out.push({ cls: "good", text: Math.abs(Math.round(d)) + "% under launch price" });
      else if (d >= 8) out.push({ cls: "bad", text: Math.round(d) + "% over launch price" });
      else out.push({ cls: "mid", text: "Near launch price" });
    }
    var prev = (hist || []).slice(0, -1).map(function (h) { return h[1]; });
    if (prev.length >= 3) {
      var avg = prev.reduce(function (a, b) { return a + b; }, 0) / prev.length;
      var r = rec.week_close / avg - 1;
      if (r <= -0.05) out.push({ cls: "good", text: "Below its " + prev.length + "-week average" });
      else if (r >= 0.05) out.push({ cls: "bad", text: "Above its " + prev.length + "-week average" });
      else out.push({ cls: "mid", text: "Near its " + prev.length + "-week average" });
    }
    return out;
  }

  function sparkline(hist) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 36"); svg.setAttribute("class", "pl-spark"); svg.setAttribute("role", "img");
    var vals = hist.map(function (h) { return h[1]; });
    svg.setAttribute("aria-label", "Weekly price history, " + hist.length + " weeks, " + usd(Math.min.apply(null, vals)) + " to " + usd(Math.max.apply(null, vals)));
    if (vals.length < 2) return null;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = max - min || 1;
    var pts = vals.map(function (v, i) { return (4 + i * (112 / (vals.length - 1))).toFixed(1) + "," + (32 - ((v - min) / span) * 26).toFixed(1); });
    var line = document.createElementNS(NS, "polyline");
    line.setAttribute("points", pts.join(" ")); line.setAttribute("class", "pl-spark-line"); svg.appendChild(line);
    var last = pts[pts.length - 1].split(",");
    var dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", last[0]); dot.setAttribute("cy", last[1]); dot.setAttribute("r", "2.6"); dot.setAttribute("class", "pl-spark-dot"); svg.appendChild(dot);
    return svg;
  }

  function priceCard(kind, item, curated) {
    var card = el("div", "pl-card");
    var rec = PL[kind][item.id];
    var head = el("div", "pl-head");
    head.appendChild(el("strong", null, item.name));
    head.appendChild(el("span", "pl-kind", kind.toUpperCase()));
    card.appendChild(head);
    if (!rec) {
      card.appendChild(el("p", "muted pl-none", item.legacy
        ? "Older part: not sold new at US retailers, so it is not in the weekly feed. The curated used-market estimate is used elsewhere in the app."
        : "Not in the weekly feed (the feed tracks only each store's 100 most popular new products per category). The curated price estimate is used instead."));
      if (curated) card.appendChild(el("p", "pl-cur", "Curated estimate: " + usd(curated) + " (see Data sources for its as-of date)"));
      return card;
    }
    var hist = (PL.history[kind] || {})[item.id] || [];
    var row = el("div", "pl-row");
    var big = el("div", "pl-big");
    big.appendChild(el("span", "pl-price", usd(rec.week_close)));
    big.appendChild(el("small", null, "lowest in-stock new price, week end"));
    row.appendChild(big);
    var sp = hist.length > 1 ? sparkline(hist) : null;
    if (sp) { var w = el("div", "pl-spark-wrap"); w.appendChild(sp); w.appendChild(el("small", null, hist.length + "-week history")); row.appendChild(w); }
    card.appendChild(row);
    var flags = el("div", "pl-flags");
    dealFlag(rec, hist).forEach(function (f) { flags.appendChild(el("span", "pl-flag " + f.cls, f.text)); });
    if (rec.change_vs_prev_week_pct != null) flags.appendChild(el("span", "pl-flag " + (rec.change_vs_prev_week_pct <= -2 ? "good" : rec.change_vs_prev_week_pct >= 2 ? "bad" : "mid"), pct(rec.change_vs_prev_week_pct) + " vs last week"));
    card.appendChild(flags);
    var dl = el("dl", "pl-facts");
    function fact(k, v) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); }
    fact("Week range", usd(rec.week_low) + " to " + usd(rec.week_high));
    if (rec.launch_price) fact("Launch price", usd(rec.launch_price));
    fact("Cheapest at", (rec.lowest_store_end || "-").replace(" (in store)", " (in-store)"));
    fact("In stock", rec.retailers_in_stock_end + " retailers, " + rec.shops_in_stock_end + " shops");
    if (curated) fact("Curated estimate", usd(curated));
    card.appendChild(dl);
    if (rec.variant) card.appendChild(el("p", "muted pl-var", "Matched to the most-tracked variant: " + rec.pricifyName + "."));
    return card;
  }

  var lastKey = "";
  function renderCalc() {
    var box = $("#livePrices"); if (!box || !BCP.getSelection) return;
    var sel = BCP.getSelection();
    if (!sel || !sel.cpu || !sel.gpu) return;
    var key = sel.cpu.id + "|" + sel.gpu.id;
    if (key === lastKey) return;
    lastKey = key;
    box.innerHTML = "";
    box.appendChild(priceCard("cpu", sel.cpu, BCP.prices.cpu[sel.cpu.id]));
    box.appendChild(priceCard("gpu", sel.gpu, BCP.prices.gpu[sel.gpu.id]));
    var note = $("#livePricesNote");
    if (note) note.textContent = "Weekly US retail snapshot, " + weekLabel() + ". Not a live quote: check the store before buying. Data: " + PL.meta.attribution + " (" + PL.meta.license + ").";
  }
  BCP.livePricesHook = renderCalc;
  BCP.livePrice = function (kind, id) { return PL && PL[kind] ? PL[kind][id] || null : null; };

  // ---- Market tab ----
  var CATS = [["gpu", "Graphics cards"], ["cpu", "Processors"], ["ram", "Memory"], ["ssd", "SSDs"], ["hdd", "Hard drives"], ["motherboard", "Motherboards"], ["psu", "Power supplies"], ["case", "Cases"]];
  var mk = { cat: "gpu", q: "", sort: "shops" };
  function renderMarket() {
    var rows = (PL.market[mk.cat] || []).slice();
    var q = mk.q.trim().toLowerCase();
    if (q) rows = rows.filter(function (r) { return r[0].toLowerCase().indexOf(q) >= 0; });
    var sorters = {
      shops: function (a, b) { return (b[6] || 0) - (a[6] || 0); },
      low: function (a, b) { return (a[2] || 1e9) - (b[2] || 1e9); },
      high: function (a, b) { return (b[2] || 0) - (a[2] || 0); },
      drop: function (a, b) { return (a[4] == null ? 99 : a[4]) - (b[4] == null ? 99 : b[4]); },
      msrp: function (a, b) { function v(r) { return r[3] ? r[2] / r[3] : 99; } return v(a) - v(b); }
    };
    rows.sort(sorters[mk.sort]);
    var list = $("#mkList"); list.innerHTML = "";
    $("#mkCount").textContent = rows.length > 100 ? "showing 100 of " + rows.length : rows.length + " products";
    if (!rows.length) { list.appendChild(el("p", "muted", "No products match that search.")); return; }
    var table = el("table", "mk-table");
    var thead = el("thead"); var hr = el("tr");
    ["Product", "Price", "vs launch", "vs last week", "Cheapest at", "In stock", ""].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    thead.appendChild(hr); table.appendChild(thead);
    var tb = el("tbody");
    rows.slice(0, 100).forEach(function (r) {
      var tr = el("tr");
      var n = el("td", "mk-name"); n.appendChild(el("strong", null, r[0])); tr.appendChild(n);
      tr.appendChild(el("td", "mk-price", usd(r[2])));
      var vs = r[3] ? (r[2] / r[3] - 1) * 100 : null;
      tr.appendChild(el("td", vs == null ? "" : vs <= -3 ? "mk-good" : vs >= 8 ? "mk-bad" : "mk-mid", vs == null ? "-" : pct(vs)));
      tr.appendChild(el("td", r[4] == null ? "" : r[4] <= -2 ? "mk-good" : r[4] >= 2 ? "mk-bad" : "mk-mid", r[4] == null ? "-" : pct(r[4])));
      tr.appendChild(el("td", null, (r[7] || "-").replace(" (in store)", " (in-store)")));
      tr.appendChild(el("td", null, r[5] + " retailers / " + r[6] + " shops"));
      var a = el("td", "mk-link"); var u = safeUrl(r[8]);
      if (u) { var link = el("a", null, "All store prices"); link.href = u; link.target = "_blank"; link.rel = "noopener noreferrer"; a.appendChild(link); }
      tr.appendChild(a); tb.appendChild(tr);
    });
    table.appendChild(tb);
    var wrap = el("div", "mk-scroll"); wrap.appendChild(table); list.appendChild(wrap);
  }
  function initMarket() {
    var chips = $("#mkChips"); if (!chips) return;
    CATS.forEach(function (c) {
      var b = el("button", "mk-chip" + (c[0] === mk.cat ? " active" : ""), c[1]); b.type = "button"; b.setAttribute("data-cat", c[0]);
      b.addEventListener("click", function () {
        mk.cat = c[0];
        chips.querySelectorAll(".mk-chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderMarket();
      });
      chips.appendChild(b);
    });
    $("#mkSearch").addEventListener("input", function () { mk.q = this.value; renderMarket(); });
    $("#mkSort").addEventListener("change", function () { mk.sort = this.value; renderMarket(); });
    $("#mkMeta").textContent = "Weekly US retail snapshot, " + weekLabel() + ". Top 100 most popular new products per category.";
    $("#mkAttr").textContent = "Price data: " + PL.meta.attribution + ", licensed " + PL.meta.license + " (github.com/pricify-ai/pc-hardware-prices). Prices change daily at stores; this is a weekly snapshot, so always check the store before buying.";
    var all = ["viewCalc","viewCompare","viewUpgrade","viewPower","viewGames","viewMonitors","viewDash","viewCommunity","viewAuth","viewData"];
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      if (b.getAttribute("data-view") === "market") {
        b.addEventListener("click", function () {
          document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          all.forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.add("hidden"); });
          $("#viewMarket").classList.remove("hidden");
          window.scrollTo(0, 0);
          renderMarket();
        });
      } else b.addEventListener("click", function () { var v = $("#viewMarket"); if (v) v.classList.add("hidden"); });
    });
    var dl = document.getElementById("dataLink");
    if (dl) dl.addEventListener("click", function () { var v = $("#viewMarket"); if (v) v.classList.add("hidden"); });
  }

  function init() {
    if (!PL) return;
    initMarket();
    var f = $("#plFooter");
    if (f) f.textContent = "Market prices: weekly US retail snapshot " + PL.meta.week + ", data by " + PL.meta.attribution + " (" + PL.meta.license + ").";
    renderCalc();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
