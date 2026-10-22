"""Phase AN4b, A7: the beholder's attack is a SCALE change, and stays one.

T rejected an earlier candidate because its motion was "very subtle" at combat
size: a per-row tendril wave that read at full size and vanished once the
sprite was downscaled into the combat pane. The beholder was chosen because
scale survives the downscale. That is only true while the jump is big, and a
big jump is exactly the thing a later tidy-up softens "because it looked a bit
much". These tests are what stop that.

Two witnesses, on purpose:

* the dope sheet -- the coil and the swell are adjacent frames, uniform in x
  and y, with the swell at least 40% larger than the coil;
* the committed master -- the opaque silhouette measured off the pixels, so a
  change that kept the numbers but broke the render (a crop that clips the
  swell, a matte that ate the sphere) fails too.
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

# The jump the brief asks for: "a silhouette that changes by roughly 40%
# between two frames". Lowering this number is softening the attack.
MIN_JUMP = 1.40


def _rig():
    spec = importlib.util.spec_from_file_location("rig", DEPT / "tools" / "rig-spritesheet.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TheDopeSheetSwellsHard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rig = _rig()
        cls.frames = cls.rig.BEHOLDER_CLIPS["attacking"]["frames"]
        cls.scales = [f.get("sx", 1.0) for f in cls.frames]

    def test_every_attack_frame_is_uniform_scale_not_a_deformation(self):
        for i, f in enumerate(self.frames):
            with self.subTest(frame=i):
                self.assertEqual(f.get("sx", 1.0), f.get("sy", 1.0))
                self.assertEqual(f.get("rot", 0.0), 0.0)

    def test_the_coil_is_the_smallest_pose_and_the_swell_the_largest(self):
        self.assertEqual(min(self.scales), self.rig.BEHOLDER_COIL)
        self.assertEqual(max(self.scales), self.rig.BEHOLDER_SWELL)
        self.assertLessEqual(self.rig.BEHOLDER_COIL, 0.80)
        self.assertGreaterEqual(self.rig.BEHOLDER_SWELL, 1.14)

    def test_the_coil_and_the_swell_are_adjacent_frames(self):
        coil = self.scales.index(self.rig.BEHOLDER_COIL)
        self.assertEqual(self.scales[coil + 1], self.rig.BEHOLDER_SWELL,
                         "the swell must follow the coil directly, or the jump is eased")
        self.assertGreaterEqual(self.rig.BEHOLDER_SWELL / self.rig.BEHOLDER_COIL, MIN_JUMP)

    def test_it_dims_into_the_coil(self):
        coil = self.scales.index(self.rig.BEHOLDER_COIL)
        self.assertGreater(self.frames[coil].get("dim", 0.0), 0.3)

    def test_it_starts_and_ends_at_rest(self):
        self.assertEqual(self.scales[0], 1.0)
        self.assertEqual(self.scales[-1], 1.0)


class TheMasterShowsTheSwell(unittest.TestCase):
    """Measured off the committed sheet, not the numbers that drew it."""

    @classmethod
    def setUpClass(cls):
        meta = json.loads((MASTERS / "death-beholder.sheet.json").read_text(encoding="utf-8"))
        cls.meta = meta
        clip = meta["clips"]["attacking"]
        fp = meta["frame"]
        with Image.open(MASTERS / "death-beholder.sheet.png") as im:
            a = np.asarray(im.convert("RGBA"))
        cls.widths = []
        cls.edges = []
        for col in range(clip["frames"]):
            cell = a[clip["row"] * fp:(clip["row"] + 1) * fp, col * fp:(col + 1) * fp, 3]
            ys, xs = np.nonzero(cell > 128)
            cls.widths.append(int(xs.max() - xs.min() + 1))
            cls.edges.append(bool(cell[0, :].any() or cell[-1, :].any()
                                  or cell[:, 0].any() or cell[:, -1].any()))

    def test_the_silhouette_jumps_at_least_forty_percent_in_one_frame(self):
        jumps = [b / a for a, b in zip(self.widths, self.widths[1:])]
        self.assertGreaterEqual(max(jumps), MIN_JUMP,
                                f"widest one-frame jump {max(jumps):.2f}x; widths {self.widths}")

    def test_the_swell_is_not_clipped_by_the_cell(self):
        # A crop that shears the swell would also pass a width test by accident.
        self.assertEqual(self.edges, [False] * len(self.edges))

    def test_it_floats_so_it_anchors_on_the_centre(self):
        self.assertEqual(self.meta["anchor"]["kind"], "centre")


if __name__ == "__main__":
    unittest.main()
