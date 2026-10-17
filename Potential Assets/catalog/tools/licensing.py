"""Decide Copy vs Open from provenance and from each file's own metadata.

Not a per-image judgement. Three facts settle almost everything:
  * every file under extract/ came out of one Steam install of Buriedbornes 2
    (_manifest.json "game_dir"), so the whole tree is Copy;
  * icons-TBR/ ships a license.txt naming 36 game-icons.net contributors
    under CC-BY-3.0 or CC0, so that tree is Open;
  * a font states its own licence in its name table (IDs 13/14), so the
    12 extracted faces are classified from the file, not from an opinion.
Payment-brand marks are called out separately: a trademark is not "open",
and it is more restricted than ordinary copyright, so folding it into
either bucket would overstate what may be done with it.

Writes catalog/derived/licensing.json.
"""
import json, io, os, re, collections

from fontTools.ttLib import TTFont

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
EXTRACT = os.path.join(ASSETS, "extract")
OUT = os.path.join(ASSETS, "catalog", "derived")

# Third-party marks shipped inside the game's atlases. Substring match on the
# asset name, case-insensitive; these are trademarks, not art.
# Decided by atlas membership, not by the asset's name. A substring test on the
# name is wrong twice over: "25_secret_community" matched "unity", and
# "ApplePay_0" does not match a -anchored "applepay" because "_" is a word
# character. The game packs each payment brand into its own atlas, so the
# atlas is the authoritative signal.
TRADEMARK_ATLASES = {"ApplePay", "ApplePayWhite", "GooglePay", "GooglePayWhite",
                     "Stripe", "StripeWhite", "Coda", "CodaWhite"}
OFL = re.compile(r"open font license|OFL", re.I)
APACHE = re.compile(r"Apache License", re.I)


def font_licence(rel):
    path = os.path.join(EXTRACT, rel)
    out = {"file": rel}
    try:
        tt = TTFont(path, fontNumber=0, lazy=True)
        names = {}
        for rec in tt["name"].names:
            if rec.nameID in (0, 1, 4, 13, 14):
                try:
                    names.setdefault(rec.nameID, rec.toUnicode())
                except Exception:
                    pass
        tt.close()
        text = " ".join(names.values())
        out["family"] = names.get(1) or names.get(4)
        out["license_text"] = (names.get(13) or "")[:300]
        out["license_url"] = names.get(14) or ""
        out["copyright"] = (names.get(0) or "")[:200]
        if OFL.search(text):
            out["bucket"], out["license"] = "Open", "SIL Open Font License 1.1"
        elif APACHE.search(text):
            out["bucket"], out["license"] = "Open", "Apache License 2.0"
        else:
            out["bucket"], out["license"] = "Copy", "no redistributable licence stated in the font"
    except Exception as exc:
        out["error"] = "%s: %s" % (type(exc).__name__, exc)
        out["bucket"], out["license"] = "Copy", "unreadable font metadata"
    return out


def main():
    manifest = json.load(io.open(os.path.join(EXTRACT, "_manifest.json"), encoding="utf-8"))
    assets = manifest["assets"]

    fonts = [font_licence(a["file"]) for a in assets if a["type"] == "Font"]
    marks = [a["name"] for a in assets
             if a.get("atlas") in TRADEMARK_ATLASES]

    buckets = collections.Counter()
    per_file = {}
    for a in assets:
        if a["type"] == "Font":
            continue
        if a.get("atlas") in TRADEMARK_ATLASES:
            per_file[a["file"]] = ("Copy", "third-party trademark (payment/platform mark) — not redistributable, not licensable as art")
        else:
            per_file[a["file"]] = ("Copy", "Buriedbornes 2 game asset (%s)" % manifest["game_dir"])
    for f in fonts:
        per_file[f["file"]] = (f["bucket"], f["license"])
    for b, _ in per_file.values():
        buckets[b] += 1

    # The Open tree, which is already on disk and needs no inference.
    icons = os.path.join(ASSETS, "icons-TBR")
    svgs, authors = [], collections.Counter()
    for root, _dirs, files in os.walk(icons):
        for fn in files:
            if fn.lower().endswith(".svg"):
                rel = os.path.relpath(os.path.join(root, fn), ASSETS).replace("\\", "/")
                svgs.append(rel)
                authors[os.path.basename(root)] += 1

    summary = {
        "extract": {
            "game_dir": manifest["game_dir"],
            "files": len(assets),
            "buckets": dict(buckets),
            "trademark_marks": sorted(set(marks)),
            "fonts": fonts,
        },
        "icons_tbr": {
            "files": len(svgs),
            "bucket": "Open",
            "license": "CC-BY-3.0 (CC0 for Viscious Speed and Zeromancer) — game-icons.net",
            "contributors": dict(authors.most_common()),
        },
    }
    os.makedirs(OUT, exist_ok=True)
    with io.open(os.path.join(OUT, "licensing.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=1)
    with io.open(os.path.join(OUT, "per-file-license.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        for rel, (bucket, lic) in sorted(per_file.items()):
            fh.write(json.dumps({"file": rel, "bucket": bucket, "license": lic}, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in summary["extract"].items() if k != "fonts"}, ensure_ascii=False, indent=1))
    for f in fonts:
        print("  %-34s %-5s %s" % (os.path.basename(f["file"]), f["bucket"], f["license"]))
    print("icons-TBR: %d svg, %d contributors" % (len(svgs), len(authors)))


if __name__ == "__main__":
    main()
