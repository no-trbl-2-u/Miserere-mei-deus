"""Phase AN3b, A7: the jelly stands on its foot line, and squashes about it.

The float-eye and the beholder float, so their rigs pose about the cell centre
and their manifests say `centre`. The jelly is the first rig that stands: a
jelly rests on a surface, and its squash and stretch are about its base. Pose
it about the centre and it lifts off the floor every time it squashes.

Two witnesses, as the beholder's attack has:

* the manifest -- the anchor kind is `foot-line`, and its point sits where the
  rig's pivot lands in a cell;
* the committed master -- the lowest opaque row of every grounded cell sits on
  that anchor line, measured off the pixels, so a change that kept the numbers
  but moved the pivot (or posed about the centre again) fails.

And one for the attack, because the beholder's lesson applies to it too: the
wind-up and the spring are adjacent frames, and the jelly's height changes by
a large factor between them, large enough to survive the combat downscale.
"""

from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

DEPT = Path(__file__).resolve().parents[1]
MASTERS = DEPT / "masters" / "enemies"

# How far, in cell pixels, a grounded frame's lowest opaque row may sit from
# the anchor line. A small sway rotation about the pivot lifts one corner of
# the base by a pixel or two; a jelly posed about its centre misses by tens.
FOOT_TOLERANCE = 4

# Coil to spring, in silhouette height. Lowering this is softening the attack.
MIN_SPRING = 1.40


def _rig():
    spec = importlib.util.spec_from_file_location("rig", DEPT / "tools" / "rig-spritesheet.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _cells():
    meta = json.loads((MASTERS / "green-jelly.sheet.json").read_text(encoding="utf-8"))
    sheet = np.asarray(Image.open(MASTERS / "green-jelly.sheet.png").convert("RGBA"))
    fp = meta["frame"]
    return meta, lambda row, col: sheet[row * fp:(row + 1) * fp, col * fp:(col + 1) * fp, 3]


def _rows(alpha):
    ys = np.nonzero((alpha > 128).any(axis=1))[0]
    return int(ys.min()), int(ys.max())


class TheManifestSaysItStands(unittest.TestCase):
    def test_the_anchor_is_the_foot_line(self):
        meta, _ = _cells()
        self.assertEqual(meta["anchor"]["kind"], "foot-line")

    def test_the_anchor_point_is_the_pivot_carried_into_the_cell(self):
        rig = _rig()
        meta, _ = _cells()
        k = meta["frame"] / rig.CROP
        lo = (rig.PAD - rig.CROP) // 2
        off = (rig.PAD - 640) // 2
        self.assertAlmostEqual(meta["anchor"]["x"], (rig.JELLY_PIVOT[0] + off - lo) * k, places=1)
        self.assertAlmostEqual(meta["anchor"]["y"], (rig.JELLY_PIVOT[1] + off - lo) * k, places=1)

    def test_the_floaters_still_say_centre(self):
        for enemy in ("float-eye", "death-beholder"):
            with self.subTest(enemy):
                meta = json.loads((MASTERS / f"{enemy}.sheet.json").read_text(encoding="utf-8"))
                self.assertEqual(meta["anchor"]["kind"], "centre")


class EveryGroundedFrameSitsOnTheLine(unittest.TestCase):
    def test_the_lowest_opaque_row_is_the_anchor_line(self):
        rig = _rig()
        meta, cell = _cells()
        line = meta["anchor"]["y"]
        for name, clip in rig.JELLY_CLIPS.items():
            row = meta["clips"][name]["row"]
            for col, key in enumerate(clip["frames"]):
                if key.get("ty", 0):
                    continue  # it has left the floor on purpose
                with self.subTest(clip=name, frame=col):
                    _, bottom = _rows(cell(row, col))
                    self.assertLessEqual(abs(bottom - line), FOOT_TOLERANCE,
                                         f"lowest row {bottom}, anchor line {line:.1f}")

    def test_the_spring_actually_leaves_the_floor(self):
        rig = _rig()
        meta, cell = _cells()
        frames = rig.JELLY_CLIPS["attacking"]["frames"]
        spring = next(i for i, f in enumerate(frames) if f.get("ty", 0) < 0)
        _, bottom = _rows(cell(meta["clips"]["attacking"]["row"], spring))
        self.assertLess(bottom, meta["anchor"]["y"] - FOOT_TOLERANCE)


class TheAttackSpringsHard(unittest.TestCase):
    def test_the_coil_and_the_spring_are_adjacent_and_far_apart(self):
        rig = _rig()
        meta, cell = _cells()
        frames = rig.JELLY_CLIPS["attacking"]["frames"]
        coil = next(i for i, f in enumerate(frames) if f.get("sy") == rig.JELLY_COIL["sy"])
        self.assertEqual(frames[coil + 1]["sy"], rig.JELLY_SPRING["sy"])

        row = meta["clips"]["attacking"]["row"]
        top_c, bot_c = _rows(cell(row, coil))
        top_s, bot_s = _rows(cell(row, coil + 1))
        self.assertGreaterEqual((bot_s - top_s) / (bot_c - top_c), MIN_SPRING)

    def test_the_spring_is_not_clipped_by_the_cell(self):
        rig = _rig()
        meta, cell = _cells()
        frames = rig.JELLY_CLIPS["attacking"]["frames"]
        for col in range(len(frames)):
            with self.subTest(frame=col):
                a = cell(meta["clips"]["attacking"]["row"], col)
                self.assertFalse((a[0] > 16).any(), "the jelly touches the top of its cell")
                self.assertFalse((a[:, 0] > 16).any() or (a[:, -1] > 16).any(),
                                 "the jelly touches the side of its cell")


if __name__ == "__main__":
    unittest.main()
