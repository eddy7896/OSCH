#!/usr/bin/env python3
"""Build the Flutter font assets from upstream Noto variable fonts (reproducible, table-driven).

Why: apps are offline-first (design system D1), so fonts are bundled, never fetched. Upstream Noto fonts ship only as
variable TTFs (0.1-0.9 MB each). We instance the weights the type scale uses and subset each font to its script, which
keeps the per-app cost small enough for budget phones on weak networks.

Source of truth: packages/i18n/locales.json (scripts -> upstream file, weights, unicode ranges; locales -> sample text).

Usage:
  python3 tools/assets/make-flutter-fonts.py --download <cache-dir> [--out packages/flutter-core/assets/fonts]
  python3 tools/assets/make-flutter-fonts.py --src <cache-dir>      # already downloaded
Needs: pip install fonttools   (use a venv; not a project dependency)

Outputs: <Family>-<Weight>.ttf, OFL-<Family>.txt (licences), provenance.json (upstream commit, hashes, sizes and the
per-language glyph-coverage report that evals/i18n.test.mjs asserts on).
"""
import argparse, hashlib, json, sys, urllib.parse, urllib.request
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

UPSTREAM = "google/fonts"
UPSTREAM_SHA = "b7c8331cf620346575487ef8db0e2c729f014675"  # pinned: google/fonts main on 2026-10-15
WEIGHT_NAMES = {400: "Regular", 600: "SemiBold", 700: "Bold"}

ap = argparse.ArgumentParser()
ap.add_argument("--src", help="directory containing downloaded upstream TTFs")
ap.add_argument("--download", help="download pinned upstream files into this directory first")
ap.add_argument("--out", default="packages/flutter-core/assets/fonts")
ap.add_argument("--locales", default="packages/i18n/locales.json")
args = ap.parse_args()
src = Path(args.download or args.src or ".")
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
cfg = json.loads(Path(args.locales).read_text())


def expand(ranges):
    cps = []
    for r in ranges:
        cps += list(range(r[0], r[1] + 1)) if isinstance(r, list) else [r]
    return cps


def raw_url(directory, filename):
    return f"https://raw.githubusercontent.com/{UPSTREAM}/{UPSTREAM_SHA}/ofl/{directory}/{urllib.parse.quote(filename)}"


def fetch(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        return
    print(f"  downloading {url.split('/ofl/')[1]}")
    with urllib.request.urlopen(url) as r:
        dest.write_bytes(r.read())


if args.download:
    src.mkdir(parents=True, exist_ok=True)
    for name, s in cfg["scripts"].items():
        fetch(raw_url(s["googleDir"], s["upstreamFile"]), src / f"{s['flutterFamily']}-VF.ttf")
        fetch(raw_url(s["googleDir"], "OFL.txt"), src / f"OFL-{s['flutterFamily']}.txt")

provenance = {"upstream": f"https://github.com/{UPSTREAM}", "upstreamCommit": UPSTREAM_SHA, "families": {}}
cmaps = {}  # script -> set of codepoints actually shipped (union over weights)

for name, s in cfg["scripts"].items():
    family = s["flutterFamily"]
    vf_path = src / f"{family}-VF.ttf"
    if not vf_path.exists():
        sys.exit(f"missing {vf_path} (run with --download)")
    vf_hash = hashlib.sha256(vf_path.read_bytes()).hexdigest()
    entry = {"script": name, "sourceSha256": vf_hash, "files": {}}
    shipped = set()
    for wght in s["weights"]:
        vf = TTFont(vf_path)
        axes = {a.axisTag for a in vf["fvar"].axes}
        limits = {"wght": wght}
        if "wdth" in axes:
            limits["wdth"] = 100
        # updateFontNames rewrites name IDs 1/2/4/6(/16/17), macStyle and fsSelection so Bold and SemiBold do not claim to be
        # Regular (duplicate PostScript names confuse platform font registries). Needs the STAT table (all Noto VFs have it).
        inst = instancer.instantiateVariableFont(vf, limits, inplace=False, updateFontNames=True)
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = [1, 2, 3, 4, 6, 13, 14, 16, 17]
        opts.notdef_outline = True
        opts.glyph_names = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=expand(s["ranges"]))
        sub.subset(inst)
        fname = f"{family}-{WEIGHT_NAMES[wght]}.ttf"
        inst.save(out / fname)
        data = (out / fname).read_bytes()
        shipped |= set(TTFont(out / fname).getBestCmap())
        entry["files"][fname] = {"weight": wght, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    cmaps[name] = shipped
    # Latin letters must come from Noto Sans only: a non-Latin font that carries its own A-Z/a-z would render mixed strings
    # (the brand name "OruSchools" inside Urdu text) in that script's Latin glyph style, e.g. serif in Nastaliq.
    entry["latinLetterGlyphs"] = len([c for c in shipped if 65 <= c <= 90 or 97 <= c <= 122])
    total = sum(f["bytes"] for f in entry["files"].values())
    entry["totalBytes"] = total
    provenance["families"][family] = entry
    licence = src / f"OFL-{family}.txt"
    if licence.exists():
        (out / f"OFL-{family}.txt").write_text(licence.read_text())
    print(f"{family:20} {len(s['weights'])} weights  {total/1024:7.1f} KB")

# ---- glyph coverage per language, against what is ACTUALLY shipped (Latin is always in the fallback chain) ----
def covered(locale):
    chars = {c for c in locale["sample"] if not c.isspace()}
    available = cmaps[locale["font"]] | cmaps["Latin"]
    if locale["font"] == "Nastaliq":  # Naskh is the fallback for anything Nastaliq lacks
        available |= cmaps["Arabic"]
    missing = sorted(c for c in chars if ord(c) not in available)
    return missing

coverage = {}
for loc in cfg["locales"]:
    missing = covered(loc)
    coverage[loc["code"]] = {"font": loc["font"], "sampleChars": len({c for c in loc["sample"] if not c.isspace()}),
                             "missing": [f"U+{ord(c):04X} {c}" for c in missing]}
    status = "OK" if not missing else "MISSING " + " ".join(f"U+{ord(c):04X}" for c in missing)
    print(f"  coverage {loc['code']:4} ({loc['font']:10}) {status}")
provenance["coverage"] = coverage
provenance["totalBytes"] = sum(f["totalBytes"] for f in provenance["families"].values())
(out / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n")
print(f"TOTAL {provenance['totalBytes']/1024/1024:.2f} MB bundled per app")
