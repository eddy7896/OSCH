#!/usr/bin/env python3
"""Build the WEB font files that the Next apps load with next/font/local (committed, self-hosted, no network at build time).

Why: next/font/google downloads every family from Google on each `next build` (12 families x 3 apps, no retry in
Next), so a transient network error fails CI at random. These files are the same bytes the Flutter apps bundle, just
WOFF2-compressed, so web and mobile render identical glyphs and there is one subsetting pipeline.

  Noto (non-Latin + Latin): packages/flutter-core/assets/fonts/<Family>-<Weight>.ttf  ->  packages/i18n/fonts/<Family>-<Weight>.woff2
  Poppins (marketing headlines, Latin only): pinned upstream TTF -> subset to Latin -> packages/shared-design-tokens/fonts/Poppins-<Weight>.woff2

Usage:
  python3 tools/assets/make-web-fonts.py [--poppins-src <dir containing Poppins-Medium.ttf, Poppins-Bold.ttf, OFL.txt>]
  (without --poppins-src the pinned upstream files are downloaded)
Needs: pip install fonttools brotli   (use a venv; not a project dependency)

Outputs also include the SIL OFL licences and a provenance.json per directory (source hashes, sizes) that
evals/web-fonts.test.mjs checks, including that every WOFF2 is built from the CURRENT Flutter TTF.
"""
import argparse, hashlib, json, shutil, tempfile, urllib.request
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

UPSTREAM = "https://raw.githubusercontent.com/google/fonts"
UPSTREAM_SHA = "b7c8331cf620346575487ef8db0e2c729f014675"  # same pin as make-flutter-fonts.py
WEIGHT_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}
POPPINS = {500: "Poppins-Medium.ttf", 700: "Poppins-Bold.ttf"}  # brand guidelines: Poppins Medium and Bold, headlines only

ap = argparse.ArgumentParser()
ap.add_argument("--poppins-src")
ap.add_argument("--locales", default="packages/i18n/locales.json")
args = ap.parse_args()
root = Path(".")
cfg = json.loads((root / args.locales).read_text())
flutter = root / "packages/flutter-core/assets/fonts"
noto_out = root / "packages/i18n/fonts"
brand_out = root / "packages/shared-design-tokens/fonts"
noto_out.mkdir(parents=True, exist_ok=True)
brand_out.mkdir(parents=True, exist_ok=True)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def to_woff2(ttf_bytes_path, dest, subset_codepoints=None):
    font = TTFont(str(ttf_bytes_path), recalcTimestamp=False)  # no timestamp rewrite: output must be byte-reproducible
    if subset_codepoints is not None:
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.notdef_outline = True
        opts.name_IDs = ["*"]
        opts.drop_tables += ["DSIG"]
        s = subset.Subsetter(opts)
        s.populate(unicodes=subset_codepoints)
        s.subset(font)
    font.flavor = "woff2"
    font.save(str(dest))
    return dest.read_bytes()


def expand(ranges):
    cps = []
    for r in ranges:
        cps += list(range(r[0], r[1] + 1)) if isinstance(r, list) else [r]
    return cps


# 1. Noto: WOFF2 of the exact TTFs the Flutter apps bundle.
noto = {}
for name, s in cfg["scripts"].items():
    fam = s["flutterFamily"]
    files = {}
    for w in s["weights"]:
        src = flutter / f"{fam}-{WEIGHT_NAMES[w]}.ttf"
        data = to_woff2(src, noto_out / f"{fam}-{WEIGHT_NAMES[w]}.woff2")
        files[f"{fam}-{WEIGHT_NAMES[w]}.woff2"] = {"weight": w, "bytes": len(data), "sha256": sha(data), "sourceTtf": src.name, "sourceTtfSha256": sha(src.read_bytes())}
    shutil.copyfile(flutter / f"OFL-{fam}.txt", noto_out / f"OFL-{fam}.txt")
    noto[fam] = {"script": name, "files": files, "totalBytes": sum(f["bytes"] for f in files.values())}
(noto_out / "provenance.json").write_text(json.dumps({"generator": "tools/assets/make-web-fonts.py", "source": "packages/flutter-core/assets/fonts", "families": noto}, indent=2) + "\n")

# 2. Poppins: pinned upstream, Latin subset only.
src_dir = Path(args.poppins_src) if args.poppins_src else Path(tempfile.mkdtemp())
if not args.poppins_src:
    for fname in [*POPPINS.values(), "OFL.txt"]:
        with urllib.request.urlopen(f"{UPSTREAM}/{UPSTREAM_SHA}/ofl/poppins/{fname}") as r:
            (src_dir / fname).write_bytes(r.read())
latin = expand(cfg["scripts"]["Latin"]["ranges"])
poppins = {}
for w, fname in POPPINS.items():
    out = f"Poppins-{WEIGHT_NAMES[w]}.woff2"
    data = to_woff2(src_dir / fname, brand_out / out, latin)
    poppins[out] = {"weight": w, "bytes": len(data), "sha256": sha(data), "upstreamFile": fname, "upstreamSha256": sha((src_dir / fname).read_bytes())}
shutil.copyfile(src_dir / "OFL.txt", brand_out / "OFL-Poppins.txt")
(brand_out / "provenance.json").write_text(json.dumps({"generator": "tools/assets/make-web-fonts.py", "upstream": "https://github.com/google/fonts", "upstreamCommit": UPSTREAM_SHA, "subset": "Latin ranges of packages/i18n/locales.json", "families": {"Poppins": {"files": poppins, "totalBytes": sum(f["bytes"] for f in poppins.values())}}}, indent=2) + "\n")

total = sum(f["totalBytes"] for f in noto.values())
print(f"Noto web fonts: {sum(len(f['files']) for f in noto.values())} files, {total / 1024:.0f} KiB; Poppins: {sum(f['bytes'] for f in poppins.values()) / 1024:.0f} KiB")
