#!/usr/bin/env python3
"""Builds js/data/prices-live.js from the Pricify open weekly dataset.

Source: https://github.com/pricify-ai/pc-hardware-prices (CC BY 4.0, attribution "Pricify (pricify.ai)").
No API key. Stdlib only. Matches Pricify model names to our CPU/GPU ids by exact normalized
name; anything unmatched is simply left out (the app falls back to the curated layer).
"""
import json, re, subprocess, sys, urllib.request, urllib.error, os
RAW = "https://raw.githubusercontent.com/pricify-ai/pc-hardware-prices/main/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = {"cpu": ["cpu.live"], "gpu": ["rtx.live", "vga.live"], "mobo": ["motherboards.live"], "ram": ["rams.live"],
         "ssd": ["ssd.live"], "psu": ["psu.live"], "pcase": ["pccase.live"]}
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


    # ---- Parts: boards, RAM, SSDs, PSUs, cases. Matched at class level (cheapest in-stock new product in the class). ----
    parts = {"mobo": {}, "ram": {}, "ssd": {}, "psu": {}, "pcase": {}}
    part_hist = {"mobo": {}, "ram": {}, "ssd": {}, "psu": {}, "pcase": {}}
    FIELDS = ["week_low","week_high","week_close","typical_price_end","prev_week_close","change_vs_prev_week_pct","days_in_stock","retailers_in_stock_end","shops_in_stock_end","lowest_store_end"]
    GROUPKEY = {"mobo": ("motherboards.live", "chipsets"), "ram": ("rams.live", "sizes"), "ssd": ("ssd.live", "sizes"),
                "psu": ("psu.live", "sizes"), "pcase": ("pccase.live", "types")}
    def groups(data, kind):
        site, key = GROUPKEY[kind]
        return {g["name"]: g for g in (data.get(site) or {}).get(key, [])}
    def prods(kind):
        return (latest.get(GROUPKEY[kind][0]) or {}).get("products", [])
    def from_group(kind, gname, basis):
        g = groups(latest, kind).get(gname)
        if not g or g.get("week_close") is None: return None
        rec = {k: g.get(k) for k in FIELDS}
        rec.update({"basis": basis, "n": g.get("products_tracked"), "group": gname})
        hh = []
        for w in wk_order:
            gg = groups(weeks[w], kind).get(gname)
            if gg and gg.get("week_close") is not None: hh.append([w, gg["week_close"]])
        return rec, hh
    def from_products(rows, basis):
        rows = [r for r in rows if r.get("week_close") is not None]
        if not rows: return None
        r = min(rows, key=lambda x: x["week_close"])
        rec = {k: r.get(k) for k in FIELDS}
        rec.update({"basis": basis, "n": len(rows), "product": r["name"], "url": r.get("url")})
        return rec, []
    def setp(kind, iid, res):
        if res: parts[kind][iid] = res[0]; part_hist[kind][iid] = res[1]

    # motherboards: chipset + socket group; refine by size from top-100 products when the same chipset+size is there
    FF = lambda n: "ITX" if re.search(r"Mini-ITX|\bITX\b", n, re.I) else "mATX" if re.search(r"Micro-ATX|mATX|\bM-ATX", n, re.I) else "ATX" if re.search(r"\bATX\b", n) else None
    for it in items["mobo"]:
        if not it.get("chipset") or it["socket"] == "BGA": continue
        cs, sock, ff = it["chipset"], it["socket"], it["formFactor"]
        rows = [pr for pr in prods("mobo") if re.search(r"(?<![A-Z0-9])" + re.escape(cs) + r"[A-Z]?(?![A-Z0-9])", pr["name"].upper()) and FF(pr["name"]) == ff and sock.split("-")[0].upper() in pr["name"].upper()]
        res = from_products(rows, "popular boards, this chipset and size") if rows else None
        if not res: res = from_group("mobo", "%s (%s)" % (cs, sock), "cheapest board with this chipset, any size")
        setp("mobo", it["id"], res)
    # memory: exact capacity + type + speed in top-100 (not SO-DIMM); else exact capacity+type group (any speed)
    for it in items["ram"]:
        m = re.match(r"(\d+) GB DDR(\d)-(\d+)", it["name"])
        if not m or m.group(2) == "3": continue
        cap, typ, spd = m.group(1), m.group(2), m.group(3)
        rows = [pr for pr in prods("ram") if not re.search(r"SO-?DIMM|laptop|RDIMM", pr["name"], re.I)
                and re.search(r"(?<!\d)%sGB" % cap, pr["name"]) and ("DDR%s-%s" % (typ, spd)) in pr["name"]]
        res = from_products(rows, "popular kits, same size and speed") if rows else None
        if not res: res = from_group("ram", "%sGB DDR%s" % (cap, typ), "cheapest kit of this size and type, any speed")
        setp("ram", it["id"], res)
    # SSDs: top-100 products, capacity + interface generation (no portable drives)
    for it in items["ssd"]:
        if "flagship" in it["name"]: continue
        m = re.match(r"(\d+) (GB|TB) ", it["name"]); cap = m.group(1) + m.group(2)
        gen = re.search(r"Gen(\d)", it["name"])
        def ok(pr):
            n = pr["name"]
            if re.search(r"Portable|External", n, re.I) or not re.search(r"(?<!\d)%s\b" % cap, n): return False
            if gen: return ("PCIe %s.0" % gen.group(1)) in n and "NVMe" in n
            return "SATA" in n
        res = from_products([pr for pr in prods("ssd") if ok(pr)], "popular drives, same size and interface")
        if not res and not gen and cap == "2TB": res = from_group("ssd", "2TB SATA", "cheapest drive of this size and type")
        setp("ssd", it["id"], res)
    # PSUs: exact wattage + efficiency tier group; else top-100 products (ATX only, no SFX/TFX)
    for it in items["psu"]:
        m = re.match(r"(\d+)W 80\+ (\w+)", it["name"]); w, tier = m.group(1), m.group(2)
        res = from_group("psu", "%sW %s" % (w, tier), "cheapest unit with this wattage and tier")
        if not res:
            rows = [pr for pr in prods("psu") if not re.search(r"SFX|TFX|Flex|SFF", pr["name"], re.I) and re.search(r"(?<!\d)%sW" % w, pr["name"]) and ("80+ " + tier) in pr["name"]]
            res = from_products(rows, "popular units, same wattage and tier")
        setp("psu", it["id"], res)
    # cases: size class (type group). Tier words (value/premium) are not separable from the feed.
    CASEMAP = {"case-matx-budget": "Mini tower", "case-matx-air": "Mini tower", "case-atx-value": "Mid tower", "case-atx-mesh": "Mid tower",
               "case-atx-premium": "Mid tower", "case-full": "Full tower", "case-itx": "Small form factor"}
    for it in items["pcase"]:
        if it["id"] in CASEMAP: setp("pcase", it["id"], from_group("pcase", CASEMAP[it["id"]], "cheapest case of this size class"))

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
            "matched": dict({k: len(v) for k, v in live.items()}, **{k: len(v) for k, v in parts.items()}), "unmatched": unmatched}
    out = "/* Generated by scripts/sync_pricify.py - do not edit by hand.\n * Layer: prices-live (kept separate from curated prices.js). Data (c) Pricify (pricify.ai), CC BY 4.0. */\n"
    out += "window.BCP = window.BCP || {};\nwindow.BCP.pricesLive = " + json.dumps({"meta": meta, "cpu": live["cpu"], "gpu": live["gpu"], "mobo": parts["mobo"], "ram": parts["ram"], "ssd": parts["ssd"], "psu": parts["psu"], "pcase": parts["pcase"], "history": dict(hist, **part_hist), "market": market}, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "js/data/prices-live.js"), "w").write(out)
    print(wk, meta["matched"], unmatched, len(out)//1024, "KB", wk_order)

main()
