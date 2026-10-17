"""Tile the vision-needed cluster representatives into labelled contact sheets.

One vision call per 25 assets instead of 25 calls. Each cell is drawn at a
fixed 128px on a mid-grey checker (so both white UI glyphs and black
silhouettes stay visible) with its index painted in the corner, and each
sheet ships a JSON sidecar mapping index -> asset name, real size and the
game's own atlas. The agent answers by index.

Writes catalog/derived/sheets/sheet-NNN.png + .json and shards/shard-NN.json.
"""
import json, io, os, math, collections

from PIL import Image, ImageDraw

ASSETS = r"C:\Users\notrb\Workspace\Miserere-mei-deus\Potential Assets"
EXTRACT = os.path.join(ASSETS, "extract")
BUILD = os.path.join(ASSETS, "catalog", "derived")
SHEETS = os.path.join(BUILD, "sheets")
SHARDS = os.path.join(BUILD, "shards")

CELL, COLS, ROWS = 128, 5, 5
PER_SHEET = COLS * ROWS
PAD, LABEL = 6, 16
N_SHARDS = 12


def jsonl(path):
    with io.open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def checker(size, a=(96, 96, 100), b=(120, 120, 124), step=16):
    im = Image.new("RGB", (size, size), a)
    d = ImageDraw.Draw(im)
    for y in range(0, size, step):
        for x in range(0, size, step):
            if (x // step + y // step) % 2:
                d.rectangle([x, y, x + step - 1, y + step - 1], fill=b)
    return im


def main():
    base = {r["file"]: r for r in jsonl(os.path.join(BUILD, "base.jsonl"))}
    clusters = [c for c in jsonl(os.path.join(BUILD, "clusters.jsonl")) if not c["has_corpus_row"]]
    # Shard by atlas then name so a sheet holds visually related assets — an
    # agent labelling 25 icons from one atlas is reading one art style, not 25.
    clusters.sort(key=lambda c: (c.get("atlas") or "", c.get("type") or "", c["representative"]))

    os.makedirs(SHEETS, exist_ok=True)
    os.makedirs(SHARDS, exist_ok=True)
    tile = checker(CELL)

    sheets = []
    for s in range(math.ceil(len(clusters) / PER_SHEET)):
        chunk = clusters[s * PER_SHEET:(s + 1) * PER_SHEET]
        w = COLS * (CELL + PAD) + PAD
        h = math.ceil(len(chunk) / COLS) * (CELL + PAD + LABEL) + PAD
        sheet = Image.new("RGB", (w, h), (28, 28, 32))
        draw = ImageDraw.Draw(sheet)
        cells = []
        for i, c in enumerate(chunk):
            cx = PAD + (i % COLS) * (CELL + PAD)
            cy = PAD + (i // COLS) * (CELL + PAD + LABEL)
            sheet.paste(tile, (cx, cy))
            rel = c["representative"]
            try:
                with Image.open(os.path.join(EXTRACT, rel)) as im:
                    im = im.convert("RGBA")
                    # Fit the cell in BOTH directions. thumbnail() only ever
                    # shrinks, which left every 16-32px cursor and glyph a
                    # speck the agent could not read. Nearest-neighbour on the
                    # way up keeps pixel art crisp instead of smearing it.
                    k = min(CELL / im.width, CELL / im.height)
                    resample = Image.LANCZOS if k < 1 else Image.NEAREST
                    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), resample)
                    sheet.paste(im, (cx + (CELL - im.width) // 2, cy + (CELL - im.height) // 2), im)
            except Exception as exc:
                draw.text((cx + 4, cy + 4), "ERR", fill=(255, 80, 80))
            draw.rectangle([cx, cy, cx + CELL - 1, cy + CELL - 1], outline=(60, 60, 68))
            draw.text((cx + 2, cy + CELL + 2), "%d" % i, fill=(235, 235, 240))
            b = base.get(rel, {})
            cells.append({
                "i": i, "cluster_id": c["cluster_id"], "name": b.get("name"),
                "file": rel, "size": "%sx%s" % (b.get("width"), b.get("height")),
                "atlas": b.get("atlas"), "type": b.get("type"),
                "members": c["size"],
            })
        name = "sheet-%03d" % s
        sheet.save(os.path.join(SHEETS, name + ".png"), optimize=True)
        with io.open(os.path.join(SHEETS, name + ".json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"sheet": name, "cells": cells}, fh, ensure_ascii=False, indent=1)
        sheets.append(name)

    # Deal the sheets round-robin so every shard gets a mix of atlases.
    shards = collections.defaultdict(list)
    for i, name in enumerate(sheets):
        shards[i % N_SHARDS].append(name)
    for k, names in shards.items():
        with io.open(os.path.join(SHARDS, "shard-%02d.json" % k), "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"shard": "shard-%02d" % k, "sheets": names,
                       "assets": sum(len(json.load(io.open(os.path.join(SHEETS, n + ".json"), encoding="utf-8"))["cells"]) for n in names)},
                      fh, ensure_ascii=False, indent=1)

    print(json.dumps({"vision_clusters": len(clusters), "sheets": len(sheets),
                      "shards": len(shards), "per_shard_sheets": [len(v) for v in shards.values()]}, indent=1))


if __name__ == "__main__":
    main()
