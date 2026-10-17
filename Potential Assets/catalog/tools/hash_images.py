"""Perceptual hash + cheap pixel stats for every extracted PNG.

Why: the manifest already collapsed 14,940 byte-identical copies, but the
tree still carries systematic near-duplicates (`_nobg` cut-outs, `X1`
rescales) and cross-name aliases the extractor kept on purpose (`Ghost` and
`RC18` are the same art). Clustering on pHash means one description covers a
cluster instead of being paid for once per file.

Writes catalog/derived/hashes.jsonl.
"""
import json, io, os, sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image
import imagehash
import numpy as np

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
EXTRACT = os.path.join(ASSETS, "extract")
OUT = os.path.join(ASSETS, "catalog", "derived")


def stats(rel):
    path = os.path.join(EXTRACT, rel)
    try:
        with Image.open(path) as im:
            im.load()
            ph = str(imagehash.phash(im.convert("RGB"), hash_size=8))
            dh = str(imagehash.dhash(im.convert("RGB"), hash_size=8))
            rgba = im.convert("RGBA")
            a = np.asarray(rgba, dtype=np.uint16)
            alpha = a[..., 3]
            opaque = alpha > 16
            n = int(opaque.sum())
            if n:
                px = a[..., :3][opaque]
                mean = px.mean(axis=0)
                lum = float((0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2]).mean())
                sat = float((px.max(axis=1) - px.min(axis=1)).mean())
            else:
                mean, lum, sat = np.zeros(3), 0.0, 0.0
            return {
                "file": rel, "phash": ph, "dhash": dh,
                "coverage": round(n / alpha.size, 4),
                "mean_rgb": [int(round(v)) for v in mean],
                "luma": round(lum, 1), "chroma": round(sat, 1),
            }
    except Exception as exc:  # a file we cannot read is reported, never silently dropped
        return {"file": rel, "error": "%s: %s" % (type(exc).__name__, exc)}


def main():
    # Walk the tree, not _index.json: the index is keyed by asset name and omits
    # the 133 name-collision files written as "<name>~2.png", so an index-driven
    # pass silently skips them.
    pngs = []
    for root, _dirs, files in os.walk(EXTRACT):
        for fn in files:
            if fn.lower().endswith(".png"):
                pngs.append(os.path.relpath(os.path.join(root, fn), EXTRACT).replace("\\", "/"))
    pngs.sort()
    print("hashing %d png(s)" % len(pngs), flush=True)
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    with io.open(os.path.join(OUT, "hashes.jsonl"), "w", encoding="utf-8", newline="\n") as fh:
        with ProcessPoolExecutor() as pool:
            for i, rec in enumerate(pool.map(stats, pngs, chunksize=64), 1):
                if "error" in rec:
                    bad += 1
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                if i % 1000 == 0:
                    print("  %d/%d" % (i, len(pngs)), flush=True)
    print("done; %d unreadable" % bad)


if __name__ == "__main__":
    main()
