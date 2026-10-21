#!/usr/bin/env python3
"""Rig a shipped enemy painting into an animation spritesheet.

No image model is involved. The painting is split into two layers and moved
by affine transforms, which is why this costs nothing and why the frames are
in the same hand exactly as the art already in the build.

The float-eye is riggable because of one accident of its composition: the eye
floats in a large near-black disc. Erase the eye from the body, refill the
hole with the body's own black, and the eye patch can then be moved, squeezed
and dilated anywhere inside that disc without a visible seam -- black on black.

Layers
  body  the full painting with the eye disc erased and refilled
  eye   a feathered disc around the eye, moved/scaled on its own each frame

Clips are authored as explicit per-frame keys rather than curves. Animation
timing is a thing you tune by eye, so the numbers you want to nudge are all
in CLIPS below and read top-to-bottom as a dope sheet.

Usage:  python art-department/tools/rig-spritesheet.py [--enemy float-eye]
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path

import numpy as np
from PIL import Image

# This file lives at art-department/tools/, so the department is one level up
# and the repo root two. Both ends of the pipeline resolve from there: the
# source painting is read out of the mobile package's bundled asset tree, and
# the sheet is written back inside the department, because a master is a
# build-time artifact that must never reach the app bundle.
DEPT = Path(__file__).resolve().parents[1]
ROOT = DEPT.parent
MOBILE = ROOT / "axiomancer-mobile"
SRC_DIR = MOBILE / "assets" / "images" / "enemies"
OUT_DIR = DEPT / "masters" / "enemies"

# Measured off float-eye.webp; see the provenance record written beside the sheet.
EYE_CENTER = (253.0, 228.0)
EYE_INNER_R = 58.0   # fully the eye layer
EYE_OUTER_R = 72.0   # feathered out to here, and the radius erased from the body
PAD = 768            # working canvas, padded so a lunge never clips
CROP = 640           # window cropped back out before the downscale


# --------------------------------------------------------------------------
# dope sheet
#
# tx,ty   translate in source pixels (+x = recoil away, -x = lunge forward)
# sx,sy   shell scale about the sprite centre
# rot     shell rotation, degrees
# ex,ey   eye-layer scale about the eye centre (ey < 1 reads as a wince)
# edx,edy eye-layer offset
# flash   blend toward white, 0..1
# red     blend toward impact red, 0..1
# flare   corona brightness boost, 0..1
# dim     overall darkening, 0..1
# --------------------------------------------------------------------------

def _idle_frame(i: int, n: int) -> dict:
    t = i / n
    w = 2 * math.pi * t
    return dict(
        tx=0.0, ty=-6.0 * math.sin(w),
        sx=1 + 0.012 * math.cos(w), sy=1 - 0.012 * math.cos(w),
        rot=1.4 * math.sin(w),
        ex=1 + 0.03 * math.sin(w), ey=1 + 0.03 * math.sin(w),
        edx=4.0 * math.sin(w), edy=3.0 * math.sin(2 * w),
        dim=0.03 + 0.03 * math.sin(w + 1.0),
    )


# Clip names are AN1c's vocabulary -- idle / struck / attacking -- not the
# words this experiment started with, so the manifest drops straight into the
# registry AN1a builds without a rename later.
CLIPS = {
    # Loops. Breathing bob, a slow pupil drift, a faint corona flicker.
    "idle": dict(loop=True, fps=12, rest=0, frames=[_idle_frame(i, 8) for i in range(8)]),

    # One-shot. Frame 0 IS the impact -- no anticipation, a hit has none.
    #
    # The flash is ONE frame. Spread over several it stops reading as an impact
    # and just bleaches the sprite, and the squash and the wince -- which are
    # what actually sell the hit -- disappear under it. So: white on f0, gone
    # by f2, and the recoil plays in the clear.
    "struck": dict(loop=False, fps=16, rest=7, frames=[
        dict(tx=+18, ty=-3, sx=1.16, sy=0.86, rot=-6.0, ex=1.06, ey=0.30, flash=0.92),
        dict(tx=+16, ty=-2, sx=1.14, sy=0.87, rot=-5.5, ex=1.05, ey=0.34, flash=0.22, red=0.22),
        dict(tx=+5,  ty=+1, sx=0.95, sy=1.06, rot=-1.5, ex=1.01, ey=0.52, red=0.14),
        dict(tx=-7,  ty=+2, sx=1.06, sy=0.95, rot=+2.5, ex=1.00, ey=0.74, red=0.06),
        dict(tx=+4,  ty=0,  sx=0.97, sy=1.04, rot=-1.2, ex=1.00, ey=0.88),
        dict(tx=-2,  ty=0,  sx=1.02, sy=0.98, rot=+0.6, ex=1.00, ey=0.96),
        dict(tx=0,   ty=0,  sx=1.00, sy=1.00, rot=0.0,  ex=1.00, ey=1.00),
        dict(tx=0,   ty=-1, sx=1.00, sy=1.00, rot=0.0,  ex=1.00, ey=1.00),
    ]),

    # One-shot. Coil back and narrow the eye, then snap forward with the pupil
    # blown wide and the corona flaring. Scale carries the lunge, so this reads
    # without knowing which way the enemy faces.
    # The coil has to be unmistakably NOT idle, or the lunge arrives with no
    # wind-up and the clip reads as a single pop. Hence a deep pull-back, a
    # real dim, and the eye narrowing to a slit before it blows open.
    "attacking": dict(loop=False, fps=14, rest=0, frames=[
        dict(tx=0,   ty=0,  sx=1.00, sy=1.00, rot=0.0,  ex=1.00, ey=1.00),
        dict(tx=+16, ty=+5, sx=0.92, sy=0.95, rot=+3.5, ex=0.84, ey=0.72, dim=0.20),
        dict(tx=+24, ty=+8, sx=0.88, sy=0.93, rot=+5.0, ex=0.78, ey=0.60, dim=0.28),
        dict(tx=+2,  ty=0,  sx=1.04, sy=1.02, rot=+1.0, ex=1.18, ey=1.12, flare=0.25),
        dict(tx=-28, ty=-5, sx=1.21, sy=1.25, rot=-2.0, ex=1.48, ey=1.48, flare=0.95),
        dict(tx=-19, ty=-3, sx=1.14, sy=1.16, rot=-1.5, ex=1.35, ey=1.35, flare=0.55),
        dict(tx=-6,  ty=-1, sx=1.05, sy=1.06, rot=-0.5, ex=1.12, ey=1.12, flare=0.20),
        dict(tx=0,   ty=0,  sx=1.00, sy=1.00, rot=0.0,  ex=1.02, ey=1.02, flare=0.05),
    ]),
}


def _feather(shape, center, r_in, r_out):
    """Radial 1->0 ramp; the soft edge is what hides the layer seam."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx - center[0], yy - center[1])
    m = (r_out - r) / (r_out - r_in)
    return np.clip(m, 0.0, 1.0).astype(np.float32)


def split_layers(src: Image.Image):
    """Return (body, eye): the painting with the eye erased, and the eye alone."""
    a = np.asarray(src).astype(np.float32)
    mask = _feather(a.shape[:2], EYE_CENTER, EYE_INNER_R, EYE_OUTER_R)

    # Refill colour sampled from the body ring just outside the erased disc, so
    # the patched hole is the painting's own black rather than a flat #000.
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx - EYE_CENTER[0], yy - EYE_CENTER[1])
    ring = (r > EYE_OUTER_R + 4) & (r < EYE_OUTER_R + 26) & (a[..., 3] > 200)
    fill = a[..., :3][ring].mean(0) if ring.sum() else np.zeros(3, np.float32)

    body = a.copy()
    m3 = mask[..., None]
    body[..., :3] = body[..., :3] * (1 - m3) + fill[None, None, :] * m3
    body[..., 3] = np.maximum(body[..., 3], mask * 255.0)  # keep the disc opaque

    eye = a.copy()
    eye[..., 3] = eye[..., 3] * mask

    to_img = lambda arr: Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    return to_img(body), to_img(eye)


def affine(img: Image.Image, center, sx=1.0, sy=1.0, rot=0.0, tx=0.0, ty=0.0):
    """Scale about `center`, rotate, then translate. Pillow wants the inverse map."""
    th = math.radians(rot)
    cos, sin = math.cos(th), math.sin(th)
    a, b = cos / sx, sin / sx
    d, e = -sin / sy, cos / sy
    cx, cy = center
    c = cx - (a * (cx + tx) + b * (cy + ty))
    f = cy - (d * (cx + tx) + e * (cy + ty))
    return img.transform(img.size, Image.AFFINE, (a, b, c, d, e, f),
                         resample=Image.BICUBIC)


def grade(img: Image.Image, flash=0.0, red=0.0, flare=0.0, dim=0.0):
    """Impact flash, damage red, corona flare, idle dim -- alpha untouched."""
    if not (flash or red or flare or dim):
        return img
    a = np.asarray(img).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3:]
    if flare:
        # Only the warm corona lifts; the black body must stay black or the
        # whole sprite turns to mud.
        y = ((rgb[..., 0] > 120) & (rgb[..., 1] > 95) & (rgb[..., 2] < 130)).astype(np.float32)[..., None]
        rgb = rgb + y * flare * np.array([70, 55, 10], np.float32)
    if dim:
        rgb = rgb * (1.0 - dim)
    if red:
        # Weighted by what is already lit. A flat red blend over this sprite
        # turns its black body brown -- mud, not damage. Tinting only the lit
        # corona keeps the silhouette intact and still reads as a wound.
        w = np.clip(rgb.max(2) / 255.0, 0, 1)[..., None] * red
        rgb = rgb * (1 - w) + np.array([235, 58, 40], np.float32) * w
    if flash:
        rgb = rgb * (1 - flash) + 255.0 * flash
    out = np.concatenate([np.clip(rgb, 0, 255), al], axis=-1)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def render_frame(body, eye, key, frame_px):
    k = lambda n, d: float(key.get(n, d))

    # The eye moves inside the body first, so it rides the shell transform.
    posed = body.copy()
    moved_eye = affine(eye, EYE_CENTER, k("ex", 1), k("ey", 1), 0.0, k("edx", 0), k("edy", 0))
    posed.alpha_composite(moved_eye)

    pad = Image.new("RGBA", (PAD, PAD), (0, 0, 0, 0))
    off = (PAD - posed.width) // 2
    pad.paste(posed, (off, off))

    c = (PAD / 2, PAD / 2)
    pad = affine(pad, c, k("sx", 1), k("sy", 1), k("rot", 0), k("tx", 0), k("ty", 0))
    pad = grade(pad, k("flash", 0), k("red", 0), k("flare", 0), k("dim", 0))

    lo = (PAD - CROP) // 2
    return pad.crop((lo, lo, lo + CROP, lo + CROP)).resize((frame_px, frame_px), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--enemy", default="float-eye")
    ap.add_argument("--frame", type=int, default=256, help="frame edge in px")
    ap.add_argument("--out", type=Path, default=OUT_DIR,
                    help="directory to write into; defaults to the masters tree")
    args = ap.parse_args()
    out_dir = args.out

    src = Image.open(SRC_DIR / f"{args.enemy}.webp").convert("RGBA")
    body, eye = split_layers(src)

    names = list(CLIPS)
    cols = max(len(CLIPS[n]["frames"]) for n in names)
    fp = args.frame
    sheet = Image.new("RGBA", (cols * fp, len(names) * fp), (0, 0, 0, 0))

    meta = {
        "source": f"../../../axiomancer-mobile/assets/images/enemies/{args.enemy}.webp",
        "generator": "art-department/tools/rig-spritesheet.py",
        "frame": fp, "columns": cols, "rows": len(names),
        # AN1 A6 anchors frames on the foot line. A floating creature has no
        # feet, and its hover is the animation, so anchoring it on anything
        # that tracks the body would cancel the bob. This sheet declares its
        # anchor as the cell centre, fixed across every frame, and the rig
        # guarantees that by construction -- all motion is an offset from it.
        "anchor": {"kind": "centre", "x": fp / 2, "y": fp / 2,
                   "why": "floating enemy; no foot line exists"},
        "clips": {},
    }
    previews = []
    for row, name in enumerate(names):
        clip = CLIPS[name]
        for col, key in enumerate(clip["frames"]):
            f = render_frame(body, eye, key, fp)
            sheet.paste(f, (col * fp, row * fp))
            previews.append(f)
        meta["clips"][name] = {
            "row": row, "frames": len(clip["frames"]),
            "fps": clip["fps"], "loop": clip["loop"],
            # AN1 A1/A5: the frame held under reduced motion, and the index
            # A5 range-checks against the cell count.
            "rest": clip["rest"],
        }

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = out_dir / f"{args.enemy}.sheet"
    sheet.save(f"{stem}.png")
    sheet.save(f"{stem}.webp", quality=88, method=6)
    # Explicit encoding and newline, because the manifest has to come out
    # byte-identical on every platform and the default writes CRLF on Windows.
    (out_dir / f"{args.enemy}.sheet.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8", newline="\n")

    # Flipbook of every clip back to back, purely so a human can eyeball it.
    previews[0].save(out_dir / f"{args.enemy}.preview.webp", save_all=True,
                     append_images=previews[1:], duration=80, loop=0, quality=86)

    png_kb = os.path.getsize(f"{stem}.png") / 1024
    webp_kb = os.path.getsize(f"{stem}.webp") / 1024
    print(f"{sheet.width}x{sheet.height}  png {png_kb:.0f} KB  webp {webp_kb:.0f} KB")
    for n, c in meta["clips"].items():
        print(f"  {n:7s} row {c['row']}  {c['frames']} frames @ {c['fps']}fps  "
              f"{'loop' if c['loop'] else 'one-shot'}")


if __name__ == "__main__":
    main()
