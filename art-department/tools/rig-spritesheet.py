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

The death-beholder (phase AN4b) is rigged as ONE layer. It has no single eye
to lift out -- a dozen empty sockets -- and its attack is a scale change of the
whole sphere, not a deformation of any part of it. What it needs instead is a
matte: the painting arrived fully opaque on black, so scaled as it stands it
would read as a black square growing and shrinking. The black ground that is
connected to the border is keyed to alpha first (see `matte_border_black`).

The green jelly (phase AN3b) is the same one matted layer, but it is the
first rig that STANDS. A jelly rests on a surface and squashes about its base,
so every pose is taken about a pivot on its foot line rather than the cell
centre, and its manifest declares a `foot-line` anchor. Posed about the centre
it would lift off the floor every time it squashed.

Clips are authored as explicit per-frame keys rather than curves. Animation
timing is a thing you tune by eye, so the numbers you want to nudge are all
in CLIPS below and read top-to-bottom as a dope sheet.

Usage:  python art-department/tools/rig-spritesheet.py [--enemy float-eye|death-beholder|green-jelly]
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


# --------------------------------------------------------------------------
# the death-beholder (phase AN4b)
#
# Same key vocabulary, minus the eye layer it does not have. The working
# canvas is wider than the float-eye's because this painting fills its whole
# square with corona: the crop window is 768 around a 640 source, so the sphere
# rests at 83% of the cell and the attack's swell (x1.14, 730px) stays inside it
# instead of shearing the corona off at the cell edge.
# --------------------------------------------------------------------------

BEHOLDER_PAD = 1024
BEHOLDER_CROP = 768

# The cell edge. Not the float-eye's 256: this painting is far busier, and at
# 256 its cells encode to 21 KB at the ingest's q44, against the app's 12000 B
# per-cell ceiling. 176 is the largest edge that fits under it (max 11068 B);
# 192 does not (12840 B). The ceiling is the contract, the edge is the dial.
BEHOLDER_FRAME = 176

# The attack's two poses, named because a test pins them. The coil is the
# smallest the sphere ever gets and the swell the largest, and they are
# ADJACENT frames: the silhouette changes by SWELL / COIL = 1.425 (about 40%)
# in one step. T rejected an earlier candidate because its motion was "very
# subtle" at combat size; a jump this size survives the downscale, and
# `tests/test_beholder_attack.py` fails if anyone eases it.
BEHOLDER_COIL = 0.80
BEHOLDER_SWELL = 1.14


def _beholder_idle_frame(i: int, n: int) -> dict:
    t = i / n
    w = 2 * math.pi * t
    return dict(
        tx=3.0 * math.sin(w), ty=-8.0 * math.sin(w),
        sx=1 + 0.015 * math.cos(w), sy=1 - 0.015 * math.cos(w),
        rot=1.0 * math.sin(w),
        dim=0.04 + 0.04 * math.sin(w + 1.0),
    )


BEHOLDER_CLIPS = {
    # A slow hover with a breathing squash; heavier than the float-eye's.
    "idle": dict(loop=True, fps=10, rest=0, frames=[_beholder_idle_frame(i, 8) for i in range(8)]),

    # One frame of white, then a squash-and-recoil in the clear (the
    # float-eye's lesson: a flash spread over frames just bleaches the sprite).
    "struck": dict(loop=False, fps=16, rest=7, frames=[
        dict(tx=+16, ty=-3, sx=1.12, sy=0.88, rot=-5.0, flash=0.90),
        dict(tx=+14, ty=-2, sx=1.10, sy=0.90, rot=-4.5, flash=0.20, red=0.24),
        dict(tx=+5,  ty=+1, sx=0.96, sy=1.05, rot=-1.5, red=0.14),
        dict(tx=-6,  ty=+2, sx=1.05, sy=0.96, rot=+2.0, red=0.06),
        dict(tx=+3,  ty=0,  sx=0.98, sy=1.03, rot=-1.0),
        dict(tx=-2,  ty=0,  sx=1.01, sy=0.99, rot=+0.5),
        dict(tx=0,   ty=0,  sx=1.00, sy=1.00, rot=0.0),
        dict(tx=0,   ty=-1, sx=1.00, sy=1.00, rot=0.0),
    ]),

    # One-shot. It draws in on itself and goes dark, then swells hard at the
    # camera and settles. Pure scale, uniform in x and y, so it reads at combat
    # size without knowing which way the creature faces.
    "attacking": dict(loop=False, fps=12, rest=0, frames=[
        dict(sx=1.00, sy=1.00),
        dict(sx=0.92, sy=0.92, dim=0.18),
        dict(sx=0.85, sy=0.85, dim=0.32),
        dict(sx=BEHOLDER_COIL, sy=BEHOLDER_COIL, dim=0.42),
        dict(sx=BEHOLDER_SWELL, sy=BEHOLDER_SWELL, flare=0.60),
        dict(sx=1.10, sy=1.10, flare=0.35),
        dict(sx=1.04, sy=1.04, flare=0.12),
        dict(sx=1.00, sy=1.00),
    ]),
}

# --------------------------------------------------------------------------
# the green jelly (phase AN3b)
#
# One matted layer, like the beholder, but posed about its BASE. The pivot is
# the middle of the foot line, measured off green-jelly.webp after the matte:
# the silhouette's last solid row is y=552 and its base spans x=217..441 at
# y=540. Every scale and rotation below happens about that point, so a squash
# spreads the jelly along the floor and a stretch grows it upward, and the
# foot line itself never moves unless a frame says `ty`.
#
# Volume is (roughly) conserved: wider is shorter, taller is narrower. That is
# the whole of what makes it read as jelly rather than as a sprite scaling.
# --------------------------------------------------------------------------

JELLY_PIVOT = (330.0, 548.0)

# The attack's two poses, named because a test pins them: the deepest squash
# of the wind-up and the tallest stretch of the spring, on ADJACENT frames.
# The beholder's lesson applies (T: motion that is "very subtle" at combat
# size does not survive the downscale), so the change in height between them
# is large on purpose.
JELLY_COIL = dict(sx=1.24, sy=0.72)
JELLY_SPRING = dict(sx=0.82, sy=1.24)


def _jelly_idle_frame(i: int, n: int) -> dict:
    t = i / n
    w = 2 * math.pi * t
    return dict(
        sx=1 - 0.035 * math.sin(w), sy=1 + 0.035 * math.sin(w),
        rot=1.2 * math.sin(w + math.pi / 2),
        dim=0.03 + 0.03 * math.sin(w + 1.0),
    )


JELLY_CLIPS = {
    # A slow breathing wobble about the base: it swells up, settles wide, and
    # sways a degree either way. The foot line holds still.
    "idle": dict(loop=True, fps=10, rest=0, frames=[_jelly_idle_frame(i, 8) for i in range(8)]),

    # One frame of white on the impact, flattened by the blow, then a jiggle
    # that rings down: taller, wider, taller, each smaller than the last.
    "struck": dict(loop=False, fps=16, rest=7, frames=[
        dict(tx=+14, sx=1.20, sy=0.80, rot=-3.0, flash=0.90),
        dict(tx=+12, sx=1.16, sy=0.83, rot=-2.5, flash=0.20, red=0.22),
        dict(tx=+5,  sx=0.90, sy=1.12, rot=+1.5, red=0.14),
        dict(tx=-3,  sx=1.08, sy=0.93, rot=-1.0, red=0.06),
        dict(tx=+2,  sx=0.96, sy=1.05, rot=+0.6),
        dict(tx=-1,  sx=1.02, sy=0.98, rot=-0.3),
        dict(tx=0,   sx=1.00, sy=1.00, rot=0.0),
        dict(tx=0,   sx=1.00, sy=1.00, rot=0.0),
    ]),

    # One-shot. It sinks into itself and darkens, springs up off the floor,
    # and lands spread wide toward the player before it wobbles back.
    "attacking": dict(loop=False, fps=12, rest=0, frames=[
        dict(sx=1.00, sy=1.00),
        dict(sx=1.12, sy=0.86, dim=0.12),
        dict(**JELLY_COIL, dim=0.24),
        dict(**JELLY_SPRING, tx=-14, ty=-34),
        dict(sx=1.26, sy=0.78, tx=-26),
        dict(sx=0.93, sy=1.08, tx=-14),
        dict(sx=1.04, sy=0.97, tx=-5),
        dict(sx=1.00, sy=1.00),
    ]),
}

# How dark a border-connected pixel must be to count as ground, and the ramp
# its alpha takes from there: 0 at black, opaque at MATTE_LIFT.
MATTE_GROUND = 40.0
MATTE_LIFT = 48.0


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


def matte_border_black(src: Image.Image) -> Image.Image:
    """Key the black ground that touches the border to alpha.

    Border-CONNECTED, not a luminance key: the beholder's spines, its empty
    sockets and its mouth are as black as the ground, but they are enclosed by
    lit paint, so a flood from the edge never reaches them and they stay
    opaque. The flood is a repeated 4-neighbour dilation inside the dark mask,
    run until it stops growing, which is deterministic and needs nothing past
    numpy. Keyed pixels take a graded alpha from their own brightness, so the
    corona's spray fades into the ground instead of ending on a hard edge.
    """
    a = np.asarray(src.convert("RGBA")).astype(np.float32)
    lum = a[..., :3].max(2)
    dark = lum < MATTE_GROUND

    reach = np.zeros_like(dark)
    reach[0, :], reach[-1, :], reach[:, 0], reach[:, -1] = dark[0, :], dark[-1, :], dark[:, 0], dark[:, -1]
    while True:
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]
        grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= dark
        if (grown == reach).all():
            break
        reach = grown

    alpha = np.where(reach, np.clip(lum / MATTE_LIFT, 0.0, 1.0) * 255.0, a[..., 3])
    out = a.copy()
    out[..., 3] = alpha
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


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


def render_frame(body, eye, key, frame_px, pad_px=PAD, crop_px=CROP, pivot=None):
    k = lambda n, d: float(key.get(n, d))

    # The eye moves inside the body first, so it rides the shell transform.
    # A one-layer rig (the beholder) has no eye and poses the body alone.
    posed = body.copy()
    if eye is not None:
        moved_eye = affine(eye, EYE_CENTER, k("ex", 1), k("ey", 1), 0.0, k("edx", 0), k("edy", 0))
        posed.alpha_composite(moved_eye)

    pad = Image.new("RGBA", (pad_px, pad_px), (0, 0, 0, 0))
    off = (pad_px - posed.width) // 2
    pad.paste(posed, (off, off))

    # A floating rig poses about the canvas centre; a standing one about its
    # pivot in source pixels, carried onto the padded canvas.
    c = (pad_px / 2, pad_px / 2) if pivot is None else (pivot[0] + off, pivot[1] + off)
    pad = affine(pad, c, k("sx", 1), k("sy", 1), k("rot", 0), k("tx", 0), k("ty", 0))
    pad = grade(pad, k("flash", 0), k("red", 0), k("flare", 0), k("dim", 0))

    lo = (pad_px - crop_px) // 2
    return pad.crop((lo, lo, lo + crop_px, lo + crop_px)).resize((frame_px, frame_px), Image.LANCZOS)


def _beholder_layers(src):
    return matte_border_black(src), None


# The two anchor kinds the app's manifest validates. A floating rig's anchor is
# the cell centre; a standing rig's is its pivot, carried into cell pixels.
_FLOATING = dict(kind="centre", why="floating enemy; no foot line exists")
_STANDING = dict(kind="foot-line", why="rests on a surface; squash and stretch are about its base")


def anchor_for(rig, fp):
    """The manifest anchor: where, in a cell, the rig holds still."""
    if rig.get("pivot") is None:
        return {"kind": _FLOATING["kind"], "x": fp / 2, "y": fp / 2, "why": _FLOATING["why"]}
    lo = (rig["pad"] - rig["crop"]) // 2
    off = (rig["pad"] - rig["source"]) // 2
    k = fp / rig["crop"]
    x, y = ((p + off - lo) * k for p in rig["pivot"])
    return {"kind": _STANDING["kind"], "x": round(x, 2), "y": round(y, 2), "why": _STANDING["why"]}


# One row per riggable enemy: how its painting becomes layers, the canvas it
# is posed on, its cell edge, and its dope sheet. An enemy absent from here cannot be rigged
# by this tool, and says so by name rather than borrowing the float-eye's eye.
RIGS = {
    "float-eye": dict(layers=split_layers, pad=PAD, crop=CROP, frame=256, clips=CLIPS),
    "death-beholder": dict(layers=_beholder_layers, pad=BEHOLDER_PAD, crop=BEHOLDER_CROP,
                           frame=BEHOLDER_FRAME, clips=BEHOLDER_CLIPS),
    # 640 source on a 768 canvas cropped back to 640: the crop is the painting
    # itself, which already leaves room above the dome for the spring and to
    # either side for the landing.
    "green-jelly": dict(layers=_beholder_layers, pad=PAD, crop=CROP, frame=256,
                        clips=JELLY_CLIPS, pivot=JELLY_PIVOT, source=640),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--enemy", default="float-eye")
    ap.add_argument("--frame", type=int, default=None,
                    help="frame edge in px; defaults to the enemy's rig row")
    ap.add_argument("--out", type=Path, default=OUT_DIR,
                    help="directory to write into; defaults to the masters tree")
    args = ap.parse_args()
    out_dir = args.out

    if args.enemy not in RIGS:
        ap.error(f"no rig for {args.enemy!r}; riggable: {', '.join(RIGS)}")
    rig = RIGS[args.enemy]
    clips = rig["clips"]

    src = Image.open(SRC_DIR / f"{args.enemy}.webp").convert("RGBA")
    body, eye = rig["layers"](src)

    names = list(clips)
    cols = max(len(clips[n]["frames"]) for n in names)
    fp = args.frame or rig["frame"]
    sheet = Image.new("RGBA", (cols * fp, len(names) * fp), (0, 0, 0, 0))

    meta = {
        "source": f"../../../axiomancer-mobile/assets/images/enemies/{args.enemy}.webp",
        "generator": "art-department/tools/rig-spritesheet.py",
        "frame": fp, "columns": cols, "rows": len(names),
        # AN1 A6 anchors frames on the foot line. A floating creature has no
        # feet, and its hover is the animation, so anchoring it on anything
        # that tracks the body would cancel the bob: those sheets declare the
        # cell centre. A standing one (the jelly) declares its pivot. Either
        # way the rig guarantees it by construction -- all motion is about it.
        "anchor": anchor_for(rig, fp),
        "clips": {},
    }
    previews = []
    for row, name in enumerate(names):
        clip = clips[name]
        for col, key in enumerate(clip["frames"]):
            f = render_frame(body, eye, key, fp, rig["pad"], rig["crop"], rig.get("pivot"))
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
