"""Build the blind accuracy gate.

Take 200 clusters the game's own tables DO describe, render them into sheets
exactly like the vision shards, and withhold the corpus row. An agent labels
them having seen only the image and the asset name. Scoring those answers
against the game's table is the only measurement that says how far the 4,054
vision-only descriptions can be trusted -- it is not my opinion of them and
not the user's.

Writes derived/heldout/sheet-*.png + .json (no corpus text) and
derived/heldout/answers.json (the withheld rows, for scoring only).
"""
import json, io, os, math, random, collections

from PIL import Image, ImageDraw

import sheets as S  # reuse the identical renderer

BUILD = S.BUILD
OUT = os.path.join(BUILD, "heldout")
N = 200
SEED = 20261017


def main():
    base = {r["file"]: r for r in S.jsonl(os.path.join(BUILD, "base.jsonl"))}
    covered = [c for c in S.jsonl(os.path.join(BUILD, "clusters.jsonl")) if c["has_corpus_row"]]
    rng = random.Random(SEED)
    pick = rng.sample(covered, min(N, len(covered)))
    pick.sort(key=lambda c: c["representative"])

    os.makedirs(OUT, exist_ok=True)
    tile = S.checker(S.CELL)
    answers = {}
    sheets = []
    for s in range(math.ceil(len(pick) / S.PER_SHEET)):
        chunk = pick[s * S.PER_SHEET:(s + 1) * S.PER_SHEET]
        w = S.COLS * (S.CELL + S.PAD) + S.PAD
        h = math.ceil(len(chunk) / S.COLS) * (S.CELL + S.PAD + S.LABEL) + S.PAD
        sheet = Image.new("RGB", (w, h), (28, 28, 32))
        draw = ImageDraw.Draw(sheet)
        cells = []
        for i, c in enumerate(chunk):
            cx = S.PAD + (i % S.COLS) * (S.CELL + S.PAD)
            cy = S.PAD + (i // S.COLS) * (S.CELL + S.PAD + S.LABEL)
            sheet.paste(tile, (cx, cy))
            rel = c["representative"]
            with Image.open(os.path.join(S.EXTRACT, rel)) as im:
                im = im.convert("RGBA")
                k = min(S.CELL / im.width, S.CELL / im.height)
                im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))),
                               Image.LANCZOS if k < 1 else Image.NEAREST)
                sheet.paste(im, (cx + (S.CELL - im.width) // 2, cy + (S.CELL - im.height) // 2), im)
            draw.rectangle([cx, cy, cx + S.CELL - 1, cy + S.CELL - 1], outline=(60, 60, 68))
            draw.text((cx + 2, cy + S.CELL + 2), "%d" % i, fill=(235, 235, 240))
            b = base.get(rel, {})
            cells.append({"i": i, "cluster_id": c["cluster_id"], "name": b.get("name"),
                          "file": rel, "size": "%sx%s" % (b.get("width"), b.get("height")),
                          "atlas": b.get("atlas"), "type": b.get("type")})
            answers[c["cluster_id"]] = {"name": b.get("name"), "corpus": b.get("corpus")}
        name = "sheet-%02d" % s
        sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
        with io.open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"sheet": name, "cells": cells}, fh, ensure_ascii=False, indent=1)
        sheets.append(name)

    with io.open(os.path.join(OUT, "answers.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(answers, fh, ensure_ascii=False, indent=1)
    print(json.dumps({"heldout_assets": len(pick), "sheets": sheets}, indent=1))


if __name__ == "__main__":
    main()
