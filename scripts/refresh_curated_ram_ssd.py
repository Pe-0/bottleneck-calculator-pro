#!/usr/bin/env python3
"""One-off: refresh curated RAM + SSD priceUSD from the weekly feed (matched items exact; unmatched current-gen items scaled)."""
import json, re, subprocess, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(os.path.join(ROOT, "js/data/prices-live.js")).read()
d = json.loads(js[js.index("window.BCP.pricesLive = ") + len("window.BCP.pricesLive = "):].rstrip().rstrip(";"))
def patch(path, kind, scale_rules):
    s = open(os.path.join(ROOT, path)).read()
    old = {m.group(1): int(m.group(2)) for m in re.finditer(r'id: "([^"]+)".*?priceUSD: (\d+)', s)}
    new = {}
    for iid, rec in d[kind].items():
        if iid in old: new[iid] = int(round(rec["week_close"]))
    for iid, ref in scale_rules.items():  # unmatched current-gen items: scale old price by the reference item's change
        if iid in old and iid not in new and ref in new: new[iid] = int(round(old[iid] * new[ref] / old[ref]))
    for iid, v in new.items():
        s = re.sub(r'(id: "%s".*?priceUSD: )\d+' % re.escape(iid), r"\g<1>%d" % v, s, count=1)
    open(os.path.join(ROOT, path), "w").write(s)
    print(kind, len(new), "updated")
    return new
ram = patch("js/data/components.js", "ram", {"d5-5600-96": "d5-5600-32", "d5-5600-128": "d5-5600-32"})
ssd = patch("js/data/storage.js", "ssd", {"ssd-500-g3": "ssd-500-g4", "ssd-1tb-g3": "ssd-1tb-g4", "ssd-2tb-g3": "ssd-2tb-g4",
        "ssd-250-g3": "ssd-500-g4", "ssd-1tb-g4h": "ssd-1tb-g4", "ssd-2tb-g4h": "ssd-2tb-g4", "ssd-4tb-g4h": "ssd-4tb-g4"})
