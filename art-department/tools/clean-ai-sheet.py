#!/usr/bin/env python3
"""Turn one image-model spritesheet into a splitter-ready lossless sheet.

WHY A CLEANUP PASS EXISTS
-------------------------
The rigged sets (float-eye, death-beholder, green-jelly) are posed by
`rig-spritesheet.py`, which places every frame exactly. An image model does
not. Asked for 8 x 3 cells of 256px, it draws 24 poses that are roughly on
that grid: a wing or a weapon reaches over a gridline, so a straight 256px
cut puts a sliver of each neighbour's pose into a cell and clips the pose's
own extremity; and nothing holds the body still, so an idle row drifts
sideways and the loop slides and snaps back. This tool fixes both, the same
way every time, and writes down what it did, so a regenerated sheet re-runs
the same chain and nobody paints over a master by hand (phase AN5, A1).

THE STEPS, IN ORDER (A1 a-d, A2)
--------------------------------
(a) Canvas. A sheet off `columns x frame` by `rows x frame` is resampled
    (Lanczos) onto it, and only when each axis is within 1%; further off it
    refuses, naming the size. A badly wrong sheet is a wrong sheet, not a
    stretchable one.
(b) Ownership. The generator's own threshold (alpha >= 160) separates the
    figures; its 8-connected components are the CORES. Each core belongs to
    the cell its area centroid lies in, so a core whose centroid is outside a
    cell is a neighbour's sliver there, and a core that reached over a
    gridline is still wholly its own cell's. Every softer pixel
    (1 <= alpha < 160: antialiasing, haze, a feather's fringe) then joins
    the core it is connected to through other painted pixels (a geodesic
    flood inside alpha >= 1), so the fringe travels with its figure; a soft
    island that touches no core is a component of its own and is placed by
    its own centroid. A core with a quarter or more of its area in a second
    cell is two poses welded together, not one limb: it is separated at its
    neck when eroding it apart finds two poses in different cells (each
    pixel then goes to the pose it is geodesically nearest; reported as
    `welded_necked`), and otherwise cut at the gridlines (`welded_split`).
(c) Registration, by integer translation only. The anchor is measured from
    the idle row (A2): if the lowest opaque row of each idle cell moves by
    no more than 6% of the cell the enemy STANDS (`foot-line`, at the median
    foot line and the median body centre); otherwise it FLOATS (`centre`, at
    the median bounding-box centre). Every idle cell is moved so its own body
    (the alpha-mass centroid; for a stander, the centroid's x and the foot
    line's y) sits on the anchor, because an idle that travels is drift.
    Each `struck` and `attacking` row is moved AS A WHOLE so its first cell
    lands on the anchor, keeping the recoil and the lunge it was drawn with.
(d) Fit. If the registered figures still do not fit their cells, one
    sheet-wide scale is applied to all 24 cells alike, about the anchor,
    and recorded. Never per cell: a per-cell scale makes the body pulse.
    A figure that fits once the whole set is moved by one integer
    translation is moved, not scaled. Haze fainter than 3% alpha does not
    count toward the fit and is cropped where it overhangs.

It then measures A9 on what it wrote (the idle's horizontal centre holds
within 3px; each reaction row starts within 3px of the idle's rest frame) and
exits non-zero, with the report still written, when either fails.

OUTPUT
------
    <out>/<key>.sheet.png            lossless, the splitter's input
    <out>/<key>.sheet.json           its sidecar: grid, anchor, clips, scale
    <out>/<key>.cleanup-report.json  slivers, reassembly, translations, A9

Usage:
    python art-department/tools/clean-ai-sheet.py \\
        --sheet art-department/masters/enemies/gallows-crow.sheet.webp \\
        --out <staging-dir>
    python art-department/tools/split-spritesheet.py \\
        --sheet <staging-dir>/gallows-crow.sheet.png --out <cells-dir>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

GENERATOR = "art-department/tools/clean-ai-sheet.py"

# The generator's own layout check calls a pixel painted at alpha >= 160
# (`ai-sheets.layout-report.json`'s edge_test). Using the same number here
# means the tool and the report it answers agree on what "paint" is.
CORE_ALPHA = 160

# A1 (a): how far off the canvas a sheet may be and still be resampled.
RESAMPLE_TOLERANCE = 0.01

# A2: a standing figure's foot line held to 5.2% of the cell on AN1's A6
# reference sheet; 6% is that measurement with a little room, not taste.
FOOT_SPREAD_MAX = 0.06

# (d): the faintest haze an image model leaves around a figure (alpha under
# 8 of 255, 3%) does not count toward whether the figure fits its cell. On the
# Gallows Crow it reaches 15-20px past the visible paint, and fitting it would
# shrink every cell to make room for pixels nobody can see; what of it falls
# outside the cell after the fit is cropped.
FIT_ALPHA = 8

# A9: the idle holds within this many pixels, and each reaction row starts
# within it of the idle's rest frame.
DRIFT_MAX_PX = 3.0

# (b): a core with at least this share of its area in a second cell is two
# poses welded together (a weapon touching the next frame's body), not one
# pose's limb reaching over a gridline. The Gallows Crow's widest crossing
# wing leaves under 15% of its core in the neighbour.
WELD_SHARE = 0.25

# (b): a welded core is first separated at its neck (the thinnest join, found
# by eroding it a ring at a time) when that yields two poses: pieces of at
# least 1% of a cell's area each (655 px at 256) whose centroids lie in
# different cells, within a cell/16 rings (16 at 256). The Toll-Keeper's
# lunge row welds two whole figures through a shield and its motion streak
# (x 518-1102, phase AN5d): cut at the gridline, the left pose lost the end
# of its shield to the right pose's cell. A thin weld (the Crane-Hook's
# 378 px chain, a 2px touch) never yields two such pieces and is still cut at
# the gridlines.
NECK_SEED_SHARE = 0.01

ROW_NAMES = ("idle", "struck", "attacking")

# The clip table every installed set uses (AN5 Decisions: not re-tuned per
# enemy). Row order is the generator's requested order.
CLIPS = {
    "idle": {"row": 0, "frames": 8, "fps": 10, "loop": True, "rest": 0},
    "struck": {"row": 1, "frames": 8, "fps": 16, "loop": False, "rest": 7},
    "attacking": {"row": 2, "frames": 8, "fps": 12, "loop": False, "rest": 0},
}


class Refused(SystemExit):
    """A sheet the tool will not clean, with the reason as its message."""

    def __init__(self, message: str):
        super().__init__(f"clean-ai-sheet: {message}")
        self.reason = message


# --------------------------------------------------------------------- (a)

def fit_canvas(img: Image.Image, width: int, height: int) -> tuple[Image.Image, dict]:
    """The sheet on the exact canvas, or a refusal naming its size."""
    w, h = img.size
    record = {"input_size": [w, h], "canvas": [width, height], "resampled": False}
    if (w, h) == (width, height):
        return img, record
    off_w, off_h = abs(w - width) / width, abs(h - height) / height
    if off_w > RESAMPLE_TOLERANCE or off_h > RESAMPLE_TOLERANCE:
        raise Refused(
            f"{w}x{h} is not the {width}x{height} canvas and is "
            f"{off_w:.2%} x {off_h:.2%} off it; only a sheet within "
            f"{RESAMPLE_TOLERANCE:.0%} on each axis is resampled")
    record["resampled"] = True
    record["off"] = [round(off_w, 5), round(off_h, 5)]
    return resize_premultiplied(img, (width, height)), record


def resize_premultiplied(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Lanczos resize that does not bleed the transparent black into edges."""
    rgba = np.asarray(img.convert("RGBA"), dtype=np.float64)
    alpha = rgba[..., 3:4] / 255.0
    pre = np.concatenate([rgba[..., :3] * alpha, rgba[..., 3:4]], axis=2)
    channels = [
        Image.fromarray(pre[..., i].astype(np.float32), mode="F").resize(size, Image.LANCZOS)
        for i in range(4)
    ]
    out = np.stack([np.asarray(c, dtype=np.float64) for c in channels], axis=2)
    return Image.fromarray(unpremultiply(out), mode="RGBA")


def unpremultiply(pre: np.ndarray) -> np.ndarray:
    alpha = np.clip(pre[..., 3], 0, 255)
    safe = np.where(alpha > 0, alpha / 255.0, 1.0)
    rgb = np.clip(pre[..., :3] / safe[..., None], 0, 255)
    rgb[alpha <= 0] = 0
    out = np.concatenate([rgb, alpha[..., None]], axis=2)
    return np.rint(out).astype(np.uint8)


# --------------------------------------------------------------------- (b)

def label_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """8-connected components of a boolean mask: (labels, count), 0 = none.

    Run-based union-find, because the toolchain is Pillow and numpy only and
    a pixel-by-pixel flood in Python is minutes on a 2048 x 768 sheet.
    Labels are numbered in raster order of their first run, so the result is
    deterministic.
    """
    height = mask.shape[0]
    parent: list[int] = []

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    runs: list[tuple[int, int, int, int]] = []
    prev: list[tuple[int, int, int]] = []
    for y in range(height):
        edges = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        starts = np.nonzero(edges == 1)[0]
        ends = np.nonzero(edges == -1)[0]
        cur: list[tuple[int, int, int]] = []
        j = 0
        for s, e in zip(starts.tolist(), ends.tolist()):
            i = len(parent)
            parent.append(i)
            # A previous-row run [ps, pe) touches [s, e) 8-connectedly when
            # ps <= e and pe >= s (the diagonal is the +-1).
            while j < len(prev) and prev[j][1] < s:
                j += 1
            k = j
            while k < len(prev) and prev[k][0] <= e:
                ra, rb = find(i), find(prev[k][2])
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
                k += 1
            cur.append((s, e, i))
            runs.append((y, s, e, i))
        prev = cur

    labels = np.zeros(mask.shape, dtype=np.int32)
    compact: dict[int, int] = {}
    for y, s, e, i in runs:
        root = find(i)
        if root not in compact:
            compact[root] = len(compact) + 1
        labels[y, s:e] = compact[root]
    return labels, len(compact)


def cell_of(x: float, y: float, frame: int, columns: int, rows: int) -> int:
    col = min(max(int(x // frame), 0), columns - 1)
    row = min(max(int(y // frame), 0), rows - 1)
    return row * columns + col


def grid_owner(shape: tuple[int, int], frame: int, columns: int) -> np.ndarray:
    ys, xs = np.indices(shape)
    return (ys // frame) * columns + (xs // frame)


def assign(labels: np.ndarray, count: int, owner: np.ndarray, frame: int,
           columns: int, rows: int, note: dict, cut_welds: bool = True) -> None:
    """Give each labelled component to the cell its area centroid lies in."""
    if count == 0:
        return
    sel = labels > 0
    lab = labels[sel]
    ys, xs = np.nonzero(sel)
    n = count + 1
    area = np.bincount(lab, minlength=n).astype(np.float64)
    sx = np.bincount(lab, weights=xs, minlength=n)
    sy = np.bincount(lab, weights=ys, minlength=n)
    n_cells = columns * rows
    in_cell = (np.minimum(ys // frame, rows - 1) * columns
               + np.minimum(xs // frame, columns - 1))
    share = np.bincount(lab * n_cells + in_cell, minlength=n * n_cells)
    share = share.reshape(n, n_cells).astype(np.float64)

    target = np.full(n, -1, dtype=np.int64)
    welded = np.zeros(n, dtype=bool)
    necked: dict[int, np.ndarray] = {}
    for c in range(1, n):
        # A limb that crossed a gridline leaves a small share of its core in
        # the neighbour; two poses welded by a touching weapon leave a large
        # share in each. Only the second is separated: a figure merely wider
        # than its cell is still one figure, and (d) fits it.
        second = np.sort(share[c])[-2] if n_cells > 1 else 0.0
        if cut_welds and second >= WELD_SHARE * area[c]:
            welded[c] = True
            split = split_at_neck(labels, c, frame, columns, rows)
            if split is None:
                note["welded_split"] += 1
            else:
                necked[c] = split
                note["welded_necked"] += 1
            continue
        target[c] = cell_of(sx[c] / area[c], sy[c] / area[c], frame, columns, rows)
    cells = target[lab]
    cut = welded[lab]
    cells[cut] = in_cell[cut]
    owner[ys, xs] = cells
    for y0, x0, part in necked.values():
        h, w = part.shape
        region = owner[y0:y0 + h, x0:x0 + w]
        mine = part >= 0
        region[mine] = part[mine]


def erode(mask: np.ndarray) -> np.ndarray:
    """One 8-connected erosion ring: a pixel survives only if all 8 neighbours are set."""
    h, w = mask.shape
    pad = np.zeros((h + 2, w + 2), dtype=bool)
    pad[1:-1, 1:-1] = mask
    out = mask.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                out &= pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
    return out


def split_at_neck(labels: np.ndarray, c: int, frame: int, columns: int,
                  rows: int):
    """Separate a welded core along its thinnest joins, or None.

    The core is eroded one ring at a time, up to NECK_MAX_RINGS; at the first
    ring where it falls apart into two or more pieces of at least
    NECK_SEED_SHARE of a cell's area whose centroids lie in different cells,
    each such piece is a pose and seeds its cell, and every pixel of the
    original core is grown back to the seed it is geodesically nearest
    (inside the core, the same flood as `grow`). A weld that no erosion within
    the cap separates into two such poses (a thin chain, a 2px touch) returns
    None and is cut at the gridlines as before.
    Returns (y0, x0, owner) with owner the cell per pixel of the core's
    bounding box, -1 outside the core.
    """
    ys, xs = np.nonzero(labels == c)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    core = labels[y0:y1, x0:x1] == c
    min_area = NECK_SEED_SHARE * frame * frame
    rings = max(1, frame // 16)
    eroded = core
    for _ in range(rings):
        eroded = erode(eroded)
        if not eroded.any():
            return None
        pieces, count = label_components(eroded)
        if count < 2:
            continue
        seeds = np.full(core.shape, -1, dtype=np.int32)
        seen = set()
        for p in range(1, count + 1):
            py, px = np.nonzero(pieces == p)
            if len(py) < min_area:
                continue
            k = cell_of(px.mean() + x0, py.mean() + y0, frame, columns, rows)
            seeds[py, px] = k
            seen.add(k)
        if len(seen) < 2:
            continue
        grow(seeds, core)
        return int(y0), int(x0), seeds
    return None


def grow(owner: np.ndarray, mask: np.ndarray) -> None:
    """Flood each owned region through the unowned pixels of `mask`.

    One ring per pass, all neighbours at once, the highest owner winning a
    tie: deterministic and independent of scan order.
    """
    h, w = owner.shape
    while True:
        open_ = mask & (owner < 0)
        if not open_.any():
            return
        pad = np.full((h + 2, w + 2), -1, dtype=owner.dtype)
        pad[1:-1, 1:-1] = owner
        best = np.full(owner.shape, -1, dtype=owner.dtype)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                best = np.maximum(best, pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w])
        take = open_ & (best >= 0)
        if not take.any():
            return
        owner[take] = best[take]


def ownership(alpha: np.ndarray, frame: int, columns: int, rows: int) -> tuple[np.ndarray, dict]:
    """Which cell every painted pixel belongs to (-1 for unpainted)."""
    note = {"cores": 0, "soft_islands": 0, "welded_split": 0, "welded_necked": 0}
    owner = np.full(alpha.shape, -1, dtype=np.int32)

    cores, n_cores = label_components(alpha >= CORE_ALPHA)
    note["cores"] = n_cores
    assign(cores, n_cores, owner, frame, columns, rows, note)

    painted = alpha >= 1
    grow(owner, painted)

    leftover = painted & (owner < 0)
    if leftover.any():
        islands, n_islands = label_components(leftover)
        note["soft_islands"] = n_islands
        assign(islands, n_islands, owner, frame, columns, rows, note, cut_welds=False)
    return owner, note


# --------------------------------------------------------------------- (c)

def figure_layers(rgba: np.ndarray, owner: np.ndarray, frame: int, columns: int,
                  rows: int, margin: int) -> list[np.ndarray]:
    """Each cell's own figure on a canvas of the cell plus `margin` each side.

    Cell coordinates: the cell's own box is [margin, margin + frame).
    """
    size = frame + 2 * margin
    layers = []
    h, w = owner.shape
    for k in range(columns * rows):
        row, col = divmod(k, columns)
        x0, y0 = col * frame - margin, row * frame - margin
        canvas = np.zeros((size, size, 4), dtype=np.uint8)
        sx0, sy0 = max(x0, 0), max(y0, 0)
        sx1, sy1 = min(x0 + size, w), min(y0 + size, h)
        window = owner[sy0:sy1, sx0:sx1] == k
        patch = rgba[sy0:sy1, sx0:sx1].copy()
        patch[~window] = 0
        canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = patch
        layers.append(canvas)
    return layers


def measure(layer: np.ndarray, offset: int = 0) -> dict | None:
    """Where a figure is, in cell pixels (`offset` subtracted)."""
    alpha = layer[..., 3].astype(np.float64)
    if alpha.sum() <= 0:
        return None
    ys, xs = np.indices(alpha.shape)
    total = alpha.sum()
    cx = float((alpha * xs).sum() / total) - offset
    cy = float((alpha * ys).sum() / total) - offset
    core = layer[..., 3] >= CORE_ALPHA
    if not core.any():
        core = layer[..., 3] >= 1
    cols = np.nonzero(core.any(axis=0))[0]
    rws = np.nonzero(core.any(axis=1))[0]
    return {
        "cx": cx,
        "cy": cy,
        "foot": float(rws[-1]) - offset,
        "bbox_cx": (float(cols[0]) + float(cols[-1])) / 2 - offset,
        "bbox_cy": (float(rws[0]) + float(rws[-1])) / 2 - offset,
    }


def choose_anchor(idle: list[dict], frame: int) -> dict:
    """A2: the anchor kind and point, measured from the idle row."""
    feet = [m["foot"] for m in idle]
    spread = max(feet) - min(feet)
    if spread <= FOOT_SPREAD_MAX * frame:
        x = float(np.median([m["cx"] for m in idle]))
        y = float(np.median(feet))
        return {
            "kind": "foot-line",
            "x": round(x, 1),
            "y": round(y, 1),
            "spread_px": round(spread, 1),
            "why": (f"stands: the idle foot line moves {spread:.0f}px "
                    f"({spread / frame:.1%} of the {frame}px cell, within "
                    f"{FOOT_SPREAD_MAX:.0%}); anchored at the median foot line "
                    f"y {y:.1f} and the body's median centre x {x:.1f}"),
        }
    x = float(np.median([m["bbox_cx"] for m in idle]))
    y = float(np.median([m["bbox_cy"] for m in idle]))
    return {
        "kind": "centre",
        "x": round(x, 1),
        "y": round(y, 1),
        "spread_px": round(spread, 1),
        "why": (f"floats: the idle foot line moves {spread:.0f}px "
                f"({spread / frame:.1%} of the {frame}px cell, over "
                f"{FOOT_SPREAD_MAX:.0%}); anchored at the median bounding-box "
                f"centre ({x:.1f}, {y:.1f})"),
    }


def body_point(m: dict, kind: str) -> tuple[float, float]:
    """The point of a figure that the anchor holds."""
    if kind == "foot-line":
        return m["cx"], m["foot"]
    return m["cx"], m["cy"]


def translations(measures: list[dict | None], anchor: dict, columns: int,
                 rows: int) -> list[tuple[int, int]]:
    """A1 (c): one integer (dx, dy) per cell."""
    ax, ay = anchor["x"], anchor["y"]

    def to_anchor(m: dict | None) -> tuple[int, int]:
        if m is None:
            return (0, 0)
        px, py = body_point(m, anchor["kind"])
        return (int(round(ax - px)), int(round(ay - py)))

    out: list[tuple[int, int]] = []
    for row in range(rows):
        cells = measures[row * columns:(row + 1) * columns]
        if row == 0:
            out.extend(to_anchor(m) for m in cells)
        else:
            first = next((m for m in cells if m is not None), None)
            out.extend([to_anchor(first)] * columns)
    return out


# --------------------------------------------------------------------- (d)

def painted_extent(layer: np.ndarray, offset: int) -> tuple[int, int, int, int] | None:
    painted = layer[..., 3] >= FIT_ALPHA
    if not painted.any():
        return None
    cols = np.nonzero(painted.any(axis=0))[0]
    rws = np.nonzero(painted.any(axis=1))[0]
    return (int(cols[0]) - offset, int(rws[0]) - offset,
            int(cols[-1]) + 1 - offset, int(rws[-1]) + 1 - offset)


def plan_fit(extents: list[tuple[int, int, int, int]], anchor: tuple[float, float],
             frame: int) -> tuple[float, tuple[int, int]]:
    """One sheet-wide scale (about the anchor) and one integer shift."""
    x0 = min(e[0] for e in extents)
    y0 = min(e[1] for e in extents)
    x1 = max(e[2] for e in extents)
    y1 = max(e[3] for e in extents)
    width, height = x1 - x0, y1 - y0
    scale = 1.0
    if width > frame or height > frame:
        scale = math.floor(min(frame / width, frame / height) * 1000) / 1000
    ax, ay = anchor
    sx0, sx1 = ax + scale * (x0 - ax), ax + scale * (x1 - ax)
    sy0, sy1 = ay + scale * (y0 - ay), ay + scale * (y1 - ay)

    def shift(lo: float, hi: float) -> int:
        if lo < 0:
            return int(math.ceil(-lo))
        if hi > frame:
            return -int(math.ceil(hi - frame))
        return 0

    return scale, (shift(sx0, sx1), shift(sy0, sy1))


def render_cell(layer: np.ndarray, offset: int, frame: int, move: tuple[int, int],
                scale: float, anchor: tuple[float, float], shift: tuple[int, int]) -> np.ndarray:
    """One output cell: translate, then (only if needed) the sheet-wide scale."""
    dx, dy = move
    if scale == 1.0:
        tx, ty = dx + shift[0], dy + shift[1]
        out = np.zeros((frame, frame, 4), dtype=np.uint8)
        size = layer.shape[0]
        # Source pixel (u, v) on the layer lands at (u - offset + tx, ...).
        u0, v0 = max(0, offset - tx), max(0, offset - ty)
        u1, v1 = min(size, offset - tx + frame), min(size, offset - ty + frame)
        if u1 > u0 and v1 > v0:
            out[v0 - offset + ty:v1 - offset + ty, u0 - offset + tx:u1 - offset + tx] = \
                layer[v0:v1, u0:u1]
        return out

    # Output pixel p maps back to layer pixel:
    #   cell = anchor + (p - shift - anchor) / scale - move;  layer = cell + offset
    ax, ay = anchor
    inv = 1.0 / scale
    cx = ax - (shift[0] + ax) * inv - dx + offset
    cy = ay - (shift[1] + ay) * inv - dy + offset
    rgba = layer.astype(np.float64)
    a = rgba[..., 3:4] / 255.0
    pre = np.concatenate([rgba[..., :3] * a, rgba[..., 3:4]], axis=2)
    chans = []
    for i in range(4):
        src = Image.fromarray(pre[..., i].astype(np.float32), mode="F")
        dst = src.transform((frame, frame), Image.AFFINE, (inv, 0, cx, 0, inv, cy),
                            resample=Image.BICUBIC)
        chans.append(np.asarray(dst, dtype=np.float64))
    return unpremultiply(np.stack(chans, axis=2))


# ------------------------------------------------------------------- A9

def drift_report(cells: list[np.ndarray], columns: int, rows: int) -> dict:
    centres = []
    for cell in cells:
        m = measure(cell)
        centres.append(None if m is None else m["cx"])
    idle = [c for c in centres[:columns] if c is not None]
    idle_drift = (max(idle) - min(idle)) if idle else 0.0
    rest = centres[CLIPS["idle"]["rest"]]
    starts = {}
    for name in ROW_NAMES[1:rows]:
        first = centres[CLIPS[name]["row"] * columns]
        starts[name] = None if (first is None or rest is None) else round(abs(first - rest), 2)
    ok = idle_drift <= DRIFT_MAX_PX and all(v is None or v <= DRIFT_MAX_PX for v in starts.values())
    return {
        "idle_centre_drift_px": round(idle_drift, 2),
        "row_start_offset_px": starts,
        "max_px": DRIFT_MAX_PX,
        "pass": bool(ok),
    }


# ------------------------------------------------------------------ main

def clean(sheet_path: Path, out_dir: Path, key: str | None = None, frame: int = 256,
          columns: int = 8, rows: int = 3, out_frame: int | None = None) -> dict:
    """Run (a)-(d) on one master; write the sheet, sidecar and report."""
    key = key or sheet_path.name.split(".")[0]
    width, height = columns * frame, rows * frame
    img = Image.open(sheet_path).convert("RGBA")
    img, canvas = fit_canvas(img, width, height)
    rgba = np.asarray(img, dtype=np.uint8)
    alpha = rgba[..., 3]

    owner, note = ownership(alpha, frame, columns, rows)
    grid = grid_owner(alpha.shape, frame, columns)
    painted = alpha >= 1

    margin = frame
    layers = figure_layers(rgba, owner, frame, columns, rows, margin)
    measures = [measure(layer, margin) for layer in layers]
    idle = [m for m in measures[:columns] if m is not None]
    if not idle:
        raise Refused(f"{sheet_path.name}: the idle row is empty")
    anchor = choose_anchor(idle, frame)
    moves = translations(measures, anchor, columns, rows)

    extents = []
    for layer, (dx, dy) in zip(layers, moves):
        e = painted_extent(layer, margin)
        if e is not None:
            extents.append((e[0] + dx, e[1] + dy, e[2] + dx, e[3] + dy))
    point = (anchor["x"], anchor["y"])
    scale, shift = plan_fit(extents, point, frame) if extents else (1.0, (0, 0))

    cells = [render_cell(layer, margin, frame, move, scale, point, shift)
             for layer, move in zip(layers, moves)]
    final_anchor = {
        "kind": anchor["kind"],
        "x": round(anchor["x"] + shift[0], 1),
        "y": round(anchor["y"] + shift[1], 1),
        "why": anchor["why"],
    }

    sheet = np.zeros((height, width, 4), dtype=np.uint8)
    for k, cell in enumerate(cells):
        r, c = divmod(k, columns)
        sheet[r * frame:(r + 1) * frame, c * frame:(c + 1) * frame] = cell
    a9 = drift_report(cells, columns, rows)

    shipped_frame = frame
    out_img = Image.fromarray(sheet, mode="RGBA")
    if out_frame and out_frame != frame:
        # A6: a set that overshoots the per-cell byte ceiling is cut smaller,
        # the cleaned sheet downscaled AS A WHOLE before the split.
        ratio = out_frame / frame
        out_img = resize_premultiplied(out_img, (columns * out_frame, rows * out_frame))
        final_anchor["x"] = round(final_anchor["x"] * ratio, 1)
        final_anchor["y"] = round(final_anchor["y"] * ratio, 1)
        shipped_frame = out_frame
    if scale != 1.0 or shift != (0, 0) or shipped_frame != frame:
        final_anchor["why"] += (
            f"; after the fit (scale {scale}, shift {shift[0]},{shift[1]})"
            + (f" and the cut at {shipped_frame}px" if shipped_frame != frame else "")
            + f" it sits at ({final_anchor['x']}, {final_anchor['y']})")

    per_cell = []
    for k in range(columns * rows):
        mine = owner == k
        inside = grid == k
        foreign = painted & inside & ~mine
        foreign_ids = np.unique(owner[foreign]) if foreign.any() else np.array([])
        per_cell.append({
            "cell": k,
            "row": ROW_NAMES[k // columns] if k // columns < len(ROW_NAMES) else k // columns,
            "sliver_px_removed": int(foreign.sum()),
            "sliver_sources": [int(v) for v in foreign_ids if v >= 0],
            "px_reassembled": int((mine & ~inside).sum()),
            "translate": [moves[k][0] + shift[0], moves[k][1] + shift[1]],
        })

    sidecar = {
        "source": sheet_path.name,
        "generator": GENERATOR,
        "frame": shipped_frame,
        "columns": columns,
        "rows": rows,
        "scale": scale,
        "anchor": final_anchor,
        "clips": CLIPS,
    }
    report = {
        "key": key,
        "source": sheet_path.name,
        "source_sha256": hashlib.sha256(sheet_path.read_bytes()).hexdigest(),
        "generator": GENERATOR,
        "canvas": canvas,
        "components": note,
        "anchor": {**final_anchor, "foot_spread_px": anchor["spread_px"]},
        "global_scale": scale,
        "global_shift": list(shift),
        "out_frame": shipped_frame,
        "totals": {
            "sliver_px_removed": sum(c["sliver_px_removed"] for c in per_cell),
            "cells_with_slivers": sum(1 for c in per_cell if c["sliver_px_removed"]),
            "px_reassembled": sum(c["px_reassembled"] for c in per_cell),
            "cells_reassembled": sum(1 for c in per_cell if c["px_reassembled"]),
        },
        "a9": a9,
        # The cleaned pixels, hashed raw rather than as PNG bytes (which
        # depend on the zlib build): what a regeneration must reproduce.
        "pixels_sha256": hashlib.sha256(out_img.tobytes()).hexdigest(),
        "cells": per_cell,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_img.save(out_dir / f"{key}.sheet.png", "PNG")
    write_json(out_dir / f"{key}.sheet.json", sidecar)
    write_json(out_dir / f"{key}.cleanup-report.json", report)
    return report


def write_json(path: Path, data: dict) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(data, indent=2) + "\n")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--sheet", type=Path, required=True, help="the image-model master (.webp or .png)")
    ap.add_argument("--out", type=Path, required=True, help="staging directory for the cleaned sheet")
    ap.add_argument("--key", default=None, help="enemy key; defaults to the sheet's stem")
    ap.add_argument("--frame", type=int, default=256, help="requested cell edge (px)")
    ap.add_argument("--columns", type=int, default=8)
    ap.add_argument("--rows", type=int, default=3)
    ap.add_argument("--out-frame", type=int, default=None,
                    help="downscale the cleaned sheet to this cell edge (A6: 176 for a heavy set)")
    args = ap.parse_args(argv)

    report = clean(args.sheet, args.out, args.key, args.frame, args.columns, args.rows,
                   args.out_frame)
    t, a9 = report["totals"], report["a9"]
    print(f"{report['key']}: anchor {report['anchor']['kind']} "
          f"({report['anchor']['x']}, {report['anchor']['y']}), scale {report['global_scale']}")
    print(f"  slivers removed: {t['sliver_px_removed']} px in {t['cells_with_slivers']} cells; "
          f"reassembled: {t['px_reassembled']} px in {t['cells_reassembled']} cells")
    print(f"  A9: idle drift {a9['idle_centre_drift_px']} px, row starts "
          f"{a9['row_start_offset_px']} (max {a9['max_px']}) -> "
          f"{'pass' if a9['pass'] else 'FAIL'}")
    if not a9["pass"]:
        print("clean-ai-sheet: A9 fails; the report is written, the sheet must not ship",
              file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
