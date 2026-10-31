#!/usr/bin/env python3
"""Cut a card-art sheet into one lossless PNG per card, by its manifest.

THE SHEETS
----------
T's card paintings arrive as 1536 x 1024 sheets of a 3 x 2 grid of square-ish
tiles on a black ground, divided by magenta (#FF00FF) gutters. The sidecar
`manifest.json` of a lane names the card id in each tile, row-major, and owns
the grid: it is NOT inferred from the pixels. A sheet whose gutters make a 3 x 1
grid is refused, not quietly cut into the wrong cards. A `null` tile is a cell
the lane has no card for; it is skipped.

HOW THE GRID IS FOUND
---------------------
A pixel is gutter when it is magenta: R > 200, B > 200, G < 60. A column (row)
is a gutter line when more than 90% of it is gutter, which is why magenta INSIDE
a painting (the Elementalist's lightning) does not split a tile: no painted
stroke covers nine tenths of a column. The tiles are the runs of non-gutter
columns and rows longer than 50 px (shorter runs are anti-aliasing at a gutter's
edge).

WHAT IS REFUSED, AND WHAT IS ONLY WARNED
----------------------------------------
Refused (non-zero exit, a message naming the sheet and the card):
  - a grid that is not the manifest's;
  - a tile more than 4% off square, or under 400 px on a side;
  - a tile whose outer 4 px edge band, after a 3 px inset trim, holds gutter
    colour. That is a gutter fringe the painting never drew, and it would show
    as a magenta hairline on the card face. Magenta further in is kept.
Warned (stderr, naming the card): the mean of a tile's outer 5% ring exceeds 20
of 255. The ground is meant to be black; a lighter ring is a tile the generator
framed or lit unlike its siblings. The tile is still written.

WHY THIS TOOL WRITES PNG AND NOT THE SHIPPED WEBP
-------------------------------------------------
The encode recipe (longest edge <= 640, WebP q44) and the provenance record live
in exactly one place, `axiomancer-mobile/scripts/ingest-art.mjs`. This tool does
the geometry and hands the policy to the ingest, as split-spritesheet.py does.
The two commands, in order (the staging directory is outside the repo):

    python art-department/tools/split-card-sheet.py \\
        --sheet art-department/masters/cards/defender/sheet-1.webp \\
        --manifest art-department/masters/cards/defender/manifest.json \\
        --out <staging-dir>                       # once per sheet

    node scripts/ingest-art.mjs --in <staging-dir> --category cards \\
        --no-grade --source ... --license ...     # from axiomancer-mobile/

`--no-grade` is not optional: the ingest's default grade is grayscale and this
art is in colour.

Usage:  python art-department/tools/split-card-sheet.py --sheet <img> --manifest <json> --out <dir>
Exit:   0 cut; 1 a sheet was refused.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

GUTTER_FRACTION = 0.90   # a line is gutter when more than this share of it is
MIN_RUN = 50             # px; shorter non-gutter runs are edge anti-aliasing
MAX_SKEW = 0.04          # a tile may be this far off square
MIN_SIDE = 400           # px
INSET = 3                # px trimmed off every tile before the edge check
EDGE_BAND = 4            # px, the band after the trim that must hold no gutter
RING_FRACTION = 0.05     # the outer ring the black-ground warning measures
RING_MEAN_LIMIT = 20     # of 255


class Refused(Exception):
    """A sheet this tool will not cut. The message names the sheet."""


def gutter_mask(rgb: np.ndarray) -> np.ndarray:
    """True where a pixel is the magenta gutter colour."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    return (r > 200) & (b > 200) & (g < 60)


def runs(is_gutter_line: np.ndarray) -> list[tuple[int, int]]:
    """Half-open [start, end) runs of non-gutter lines longer than MIN_RUN."""
    out = []
    start = None
    for i, gutter in enumerate(is_gutter_line):
        if not gutter and start is None:
            start = i
        elif gutter and start is not None:
            if i - start > MIN_RUN:
                out.append((start, i))
            start = None
    if start is not None and len(is_gutter_line) - start > MIN_RUN:
        out.append((start, len(is_gutter_line)))
    return out


def find_tiles(mask: np.ndarray) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    """The (column runs, row runs) of the tiles on a sheet."""
    cols = runs(mask.mean(axis=0) > GUTTER_FRACTION)
    rows = runs(mask.mean(axis=1) > GUTTER_FRACTION)
    return cols, rows


def check_square(label: str, width: int, height: int) -> None:
    if min(width, height) < MIN_SIDE:
        raise Refused(f"{label}: tile {width}x{height} is under {MIN_SIDE}px")
    skew = abs(width - height) / max(width, height)
    if skew > MAX_SKEW:
        raise Refused(
            f"{label}: tile {width}x{height} is {skew:.1%} off square "
            f"(limit {MAX_SKEW:.0%})")


def trim(tile: np.ndarray, label: str) -> np.ndarray:
    """Inset the tile and refuse a gutter fringe in what remains of its edge."""
    inner = tile[INSET:-INSET, INSET:-INSET]
    band = gutter_mask(inner)
    edge = np.zeros_like(band)
    edge[:EDGE_BAND, :] = True
    edge[-EDGE_BAND:, :] = True
    edge[:, :EDGE_BAND] = True
    edge[:, -EDGE_BAND:] = True
    if (band & edge).any():
        raise Refused(f"{label}: gutter colour in the tile's {EDGE_BAND}px edge band")
    return inner


def ring_mean(tile: np.ndarray) -> float:
    """Mean of the outer ring (RING_FRACTION of each side) over all channels."""
    h, w = tile.shape[:2]
    t = max(1, round(h * RING_FRACTION))
    s = max(1, round(w * RING_FRACTION))
    ring = np.ones((h, w), dtype=bool)
    ring[t:-t, s:-s] = False
    return float(tile[ring].mean())


def split(sheet_path: Path, manifest_path: Path, out_dir: Path) -> list[Path]:
    """Cut one sheet. Returns the PNGs written; raises Refused on a bad sheet."""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    entry = next((s for s in manifest["sheets"] if s["file"] == sheet_path.name), None)
    if entry is None:
        raise Refused(f"{sheet_path}: not a sheet of {manifest_path} "
                      f"(it lists {[s['file'] for s in manifest['sheets']]})")
    want_cols, want_rows = int(manifest["grid"]["cols"]), int(manifest["grid"]["rows"])
    ids = entry["tiles"]
    if len(ids) != want_cols * want_rows:
        raise Refused(f"{manifest_path}: {sheet_path.name} lists {len(ids)} tiles "
                      f"for a {want_cols}x{want_rows} grid")

    rgb = np.asarray(Image.open(sheet_path).convert("RGB"))
    cols, rows = find_tiles(gutter_mask(rgb))
    if (len(cols), len(rows)) != (want_cols, want_rows):
        raise Refused(f"{sheet_path}: found a {len(cols)}x{len(rows)} grid, "
                      f"the manifest says {want_cols}x{want_rows}")

    cut = []
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            card = ids[r * want_cols + c]
            if card is None:
                continue
            label = f"{sheet_path}: {card}"
            check_square(label, x1 - x0, y1 - y0)
            tile = trim(rgb[y0:y1, x0:x1], label)
            cut.append((card, tile))

    # Nothing is written until the whole sheet has passed, so a refused sheet
    # leaves no half-cut set in the staging directory.
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for card, tile in cut:
        mean = ring_mean(tile)
        if mean > RING_MEAN_LIMIT:
            print(f"warning: {card} ({sheet_path.name}): outer ring mean {mean:.0f}/255 "
                  f"is not near black", file=sys.stderr)
        dest = out_dir / f"{card}.png"
        Image.fromarray(tile).save(dest, "PNG")
        written.append(dest)
    return written


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sheet", type=Path, required=True, help="the master sheet (WebP or PNG)")
    ap.add_argument("--manifest", type=Path, required=True, help="the lane's manifest.json")
    ap.add_argument("--out", type=Path, required=True,
                    help="staging directory for the cells (outside the repo: the ingest "
                         "writes the app's asset tree)")
    args = ap.parse_args(argv)

    try:
        written = split(args.sheet, args.manifest, args.out)
    except Refused as why:
        print(f"split-card-sheet: refused: {why}", file=sys.stderr)
        return 1
    print(f"{args.sheet.name}: {len(written)} cards -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
