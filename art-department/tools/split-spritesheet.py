#!/usr/bin/env python3
"""Cut a spritesheet master into one lossless cell per frame.

WHY A SPLITTER EXISTS AT ALL
----------------------------
React Native cannot crop a sheet cheaply, and the app may not reach into this
tree in any case: nothing outside `art-department/` is allowed to resolve a
path into it, so a `require()` of `float-eye.sheet.webp` is not an option that
was weighed and rejected -- it is not an option. What ships is per-cell WebP
under the app's own asset tree, which is also the "ordered frame list" the
frame registry asks for.

WHY THIS TOOL WRITES PNG AND NOT THE SHIPPED WEBP
-------------------------------------------------
The encode recipe (longest edge <= 640, WebP q44) lives in exactly one place --
`axiomancer-mobile/scripts/ingest-art.mjs` -- and so does the rule that an
asset arrives with a provenance record in the same run. Re-implementing q44 in
Pillow here would be a second copy of a number that is supposed to have one,
and it would emit art with no record. So this tool does the half that is
geometry and hands the half that is policy to the ingest.

The two commands, in order:

    python art-department/tools/split-spritesheet.py \\
        --sheet art-department/masters/enemies/float-eye.sheet.png \\
        --out <staging-dir>

    node scripts/ingest-art.mjs --in <staging-dir> \\
        --category enemies/anim/float-eye --no-grade ...      # from axiomancer-mobile/

`--no-grade` is not an optimisation. The ingest recipe carries
`grayscale: true, brightness 0.62, contrast 1.08`, and these cells descend from
a painting that already went through it; running it again would grade them
twice and flatten the corona that is the whole read of the attack frame. A set
derived from shipped art ingests ungraded, and its manifest says so.

The cells come out named `<stem>-NN.png`, zero-padded and row-major, so the
ingest's alphabetical sweep and the registry's frame order are the same order
the sheet was drawn in.

Usage:  python art-department/tools/split-spritesheet.py --sheet <png> --out <dir>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def read_grid(sheet_path: Path) -> dict:
    """The sheet's sidecar manifest, which owns the grid.

    The grid is NOT inferred from the image. A sheet whose sidecar says 8x3 and
    whose pixels divide evenly by some other number would split silently into
    the wrong cells, and the first anyone would know of it is an enemy that
    flinches when it means to swing.
    """
    sidecar = sheet_path.parent / f"{sheet_path.name.split('.')[0]}.sheet.json"
    if not sidecar.is_file():
        raise SystemExit(f"split-spritesheet: no manifest beside the sheet: {sidecar}")
    return json.loads(sidecar.read_text(encoding="utf-8"))


def cells(sheet: Image.Image, frame: int, columns: int, rows: int) -> list[Image.Image]:
    """Every cell of the grid, row-major, left to right and top to bottom."""
    if sheet.width != columns * frame or sheet.height != rows * frame:
        raise SystemExit(
            f"split-spritesheet: {sheet.width}x{sheet.height} is not "
            f"{columns}x{rows} cells of {frame}px")
    out = []
    for row in range(rows):
        for col in range(columns):
            box = (col * frame, row * frame, (col + 1) * frame, (row + 1) * frame)
            out.append(sheet.crop(box))
    return out


def split(sheet_path: Path, out_dir: Path, stem: str | None = None) -> list[Path]:
    meta = read_grid(sheet_path)
    frame, columns, rows = int(meta["frame"]), int(meta["columns"]), int(meta["rows"])
    sheet = Image.open(sheet_path).convert("RGBA")
    name = stem or sheet_path.name.split(".")[0]

    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for i, cell in enumerate(cells(sheet, frame, columns, rows)):
        dest = out_dir / f"{name}-{i:02d}.png"
        # Lossless, alpha preserved: this is an intermediate, and the one lossy
        # step in a cell's life belongs to the ingest.
        cell.save(dest, "PNG")
        written.append(dest)
    return written


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sheet", type=Path, required=True, help="the master .png")
    ap.add_argument("--out", type=Path, required=True,
                    help="staging directory for the cells (NOT the app asset tree: "
                         "the ingest writes there)")
    ap.add_argument("--stem", default=None, help="cell filename stem; defaults to the sheet's")
    args = ap.parse_args(argv)

    written = split(args.sheet, args.out, args.stem)
    total = sum(p.stat().st_size for p in written)
    print(f"{len(written)} cells -> {args.out}  ({total / 1024:.0f} KB lossless)")
    print("next: node scripts/ingest-art.mjs --in <that dir> "
          "--category enemies/anim/<key> --no-grade")
    return 0


if __name__ == "__main__":
    sys.exit(main())
