#!/usr/bin/env python3
"""Builds js/data/prices-live.js from the Pricify open weekly dataset.

Source: https://github.com/pricify-ai/pc-hardware-prices (CC BY 4.0, attribution "Pricify (pricify.ai)").
No API key. Stdlib only. Matches Pricify model names to our CPU/GPU ids by exact normalized
name; anything unmatched is simply left out (the app falls back to the curated layer).
"""
import json, re, subprocess, sys, urllib.request, urllib.error, os
RAW = "https://raw.githubusercontent.com/pricify-ai/pc-hardware-prices/main/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = {"cpu": ["cpu.live"], "gpu": ["rtx.live", "vga.live"]}
MARKET = {"gpu": ["rtx.live", "vga.live"], "cpu": ["cpu.live"], "ssd": ["ssd.live"], "hdd": ["hdd.live"],
          "ram": ["rams.live"], "motherboard": ["motherboards.live"], "case": ["pccase.live"], "psu": ["psu.live"]}

def get(path):
    try:
        with urllib.request.urlopen(urllib.request.Request(RAW + path, headers={"User-Agent": "bcp-sync"}), timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        raise

def norm(s):
    s = s.lower().replace("(laptop)", "")
    s = re.sub(r"[^a-z0-9+ ]", " ", s)
    s = re.sub(r"\b(geforce|radeon|amd|nvidia|intel|core)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def load_week(week):
    out = {}
    for sites in SITES.values():
        for s in sites:
            d = get("data/2026/%s/json/%s.json" % (week, s)) if week != "latest" else get("latest/json/%s.json" % s)
            if d: out[s] = d
    return out

def main():
    items = json.loads(subprocess.check_output(["node", os.path.join(ROOT, "scripts/dump_items.js")]))
    latest = load_week("latest")
    wk = latest["cpu.live"]["week"]  # e.g. 2026-W47
    latest_n = int(wk.split("W")[1])
    weeks = {}
    for n in range(41, latest_n):  # archive weeks before latest
        w = "W%d" % n
        d = load_week(w)
        if d: weeks[w] = d
    weeks["W%d" % latest_n] = latest
    wk_order = sorted(weeks, key=lambda w: int(w[1:]))

    def model_index(data, kind):
        idx = {}
        for s in SITES[kind]:
            for m in (data.get(s) or {}).get("models", []):
                idx.setdefault(norm(m["name"]), []).append(m)
        return idx

    live = {"cpu": {}, "gpu": {}}
    hist = {"cpu": {}, "gpu": {}}
    unmatched = {"cpu": 0, "gpu": 0}
    for kind in ("cpu", "gpu"):
        idx_latest = model_index(latest, kind)
        keys = list(idx_latest)
        for it in items[kind]:
            n = norm(it["name"])
            if n in idx_latest: cands = idx_latest[n]; variant = False
            else:
                ks = [k for k in keys if k.startswith(n + " ") and re.match(r"^\d+gb$", k[len(n)+1:])]
                cands = [m for k in ks for m in idx_latest[k]]; variant = bool(cands)
            if not cands: unmatched[kind] += 1; continue
            m = max(cands, key=lambda x: x.get("products_tracked", 0))
            rec = {k: m.get(k) for k in ["launch_price","week_low","week_high","week_close","typical_price_end","prev_week_close","change_vs_prev_week_pct","days_in_stock","retailers_in_stock_end","shops_in_stock_end","lowest_store_end","products_tracked","products_in_stock_end"]}
            rec["pricifyName"] = m["name"]
            if variant: rec["variant"] = True
            live[kind][it["id"]] = rec
            h = []
            for w in wk_order:
                mi = model_index(weeks[w], kind).get(norm(m["name"]))
                if mi:
                    mm = max(mi, key=lambda x: x.get("products_tracked", 0))
                    if mm.get("week_close") is not None: h.append([w, mm["week_close"]])
            hist[kind][it["id"]] = h

    market = {}
    for cat, sites in MARKET.items():
        rows = []
        for s in sites:
            d = latest.get(s) or get("latest/json/%s.json" % s)
            if not d: continue
            for p in d["products"]:
                rows.append([p["name"], p.get("maker"), p.get("week_close"), p.get("launch_price"), p.get("change_vs_prev_week_pct"),
                             p.get("retailers_in_stock_end"), p.get("shops_in_stock_end"), p.get("lowest_store_end"), p.get("url"), p.get("week_low"), p.get("week_high")])
        rows.sort(key=lambda r: -(r[6] or 0))
        market[cat] = rows
    h = latest["cpu.live"]
    meta = {"layer": "prices-live", "currency": "USD", "week": wk, "from": h["from"], "to": h["to"], "generated": h.get("generated"),
            "confidence": "medium: real retail prices, but weekly (not live), US stores, new in-stock products only",
            "source": "Pricify open weekly retail price dataset (pricify.ai), CC BY 4.0",
            "sourceUrl": "https://github.com/pricify-ai/pc-hardware-prices", "attribution": "Pricify (pricify.ai)",
            "license": "CC BY 4.0", "weeksInHistory": wk_order,
            "matched": {k: len(v) for k, v in live.items()}, "unmatched": unmatched}
    out = "/* Generated by scripts/sync_pricify.py - do not edit by hand.\n * Layer: prices-live (kept separate from curated prices.js). Data (c) Pricify (pricify.ai), CC BY 4.0. */\n"
    out += "window.BCP = window.BCP || {};\nwindow.BCP.pricesLive = " + json.dumps({"meta": meta, "cpu": live["cpu"], "gpu": live["gpu"], "history": hist, "market": market}, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "js/data/prices-live.js"), "w").write(out)
    print(wk, meta["matched"], unmatched, len(out)//1024, "KB", wk_order)

main()
