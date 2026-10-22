"""The rig regenerates every committed sheet byte for byte.

One suite per rigged enemy: the float-eye (phase AN1e's master) and the
death-beholder (phase AN4b's), each regenerated from its shipped painting and
compared against what is committed.

The rig is deterministic -- Pillow affine transforms and numpy arithmetic, no
randomness and no timestamp in any of the four outputs -- so the strict test is
available and cheap. It is the one that catches the failure mode a move
actually has: paths that still resolve, but to somewhere else, so the tool
quietly stops reproducing the master a reviewer compares against.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

DEPT = Path(__file__).resolve().parents[1]
RIG = DEPT / "tools" / "rig-spritesheet.py"
MASTERS = DEPT / "masters" / "enemies"

# The WebP sheet, the manifest and the review flipbook are compared as raw
# bytes. The lossless PNG is compared pixel for pixel instead, because a PNG's
# IDAT is a deflate stream and its exact bytes depend on which zlib the Pillow
# wheel was linked against -- zlib-ng on the authoring machine, plain zlib on a
# Linux runner -- for identical pixels. The WebP is the stricter witness
# anyway: it is byte-identical everywhere, so any change to a single pixel
# fails this suite regardless of how the PNG happened to compress.


class _RigRegeneratesTheMaster:
    """Mixed into one TestCase per enemy below; ENEMY names the sheet."""

    ENEMY = ""

    @classmethod
    def setUpClass(cls):
        e = cls.ENEMY
        cls.BYTE_FOR_BYTE = [f"{e}.sheet.webp", f"{e}.sheet.json", f"{e}.preview.webp"]
        cls.PIXEL_FOR_PIXEL = [f"{e}.sheet.png"]
        cls.OUTPUTS = cls.PIXEL_FOR_PIXEL + cls.BYTE_FOR_BYTE
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name)
        done = subprocess.run(
            [sys.executable, str(RIG), "--enemy", e, "--out", str(cls.out)],
            capture_output=True, text=True)
        if done.returncode != 0:
            raise AssertionError(f"rig failed:\n{done.stdout}\n{done.stderr}")

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_it_writes_every_output(self):
        for name in self.OUTPUTS:
            with self.subTest(name):
                self.assertTrue((self.out / name).is_file(), f"{name} was not written")

    def test_the_webp_manifest_and_flipbook_match_the_master_byte_for_byte(self):
        for name in self.BYTE_FOR_BYTE:
            with self.subTest(name):
                fresh = (self.out / name).read_bytes()
                committed = (MASTERS / name).read_bytes()
                self.assertEqual(
                    len(fresh), len(committed),
                    f"{name}: regenerated {len(fresh)} bytes, master {len(committed)}")
                self.assertEqual(
                    fresh, committed,
                    f"{name} differs from the committed master. The rig is "
                    "deterministic, so something in the tool changed -- find it "
                    "rather than refreshing the master.")

    def test_the_png_matches_the_master_pixel_for_pixel(self):
        for name in self.PIXEL_FOR_PIXEL:
            with self.subTest(name):
                with Image.open(self.out / name) as fresh, Image.open(MASTERS / name) as master:
                    self.assertEqual(fresh.size, master.size, name)
                    self.assertEqual(fresh.mode, master.mode, name)
                    self.assertEqual(
                        fresh.convert("RGBA").tobytes(), master.convert("RGBA").tobytes(),
                        f"{name} differs from the committed master in its pixels. "
                        "The rig is deterministic, so something in the tool "
                        "changed -- find it rather than refreshing the master.")

    def test_the_manifest_still_points_at_the_source_painting(self):
        import json

        meta = json.loads((self.out / f"{self.ENEMY}.sheet.json").read_text(encoding="utf-8"))
        source = DEPT / "masters" / "enemies" / meta["source"]
        self.assertTrue(source.resolve().is_file(),
                        f"manifest source {meta['source']} does not resolve to a file")
        self.assertEqual(meta["generator"], "art-department/tools/rig-spritesheet.py")


class FloatEyeRegenerates(_RigRegeneratesTheMaster, unittest.TestCase):
    ENEMY = "float-eye"


class DeathBeholderRegenerates(_RigRegeneratesTheMaster, unittest.TestCase):
    ENEMY = "death-beholder"


class TheRigRefusesAnEnemyItHasNoRigFor(unittest.TestCase):
    def test_an_unrigged_enemy_is_refused_by_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            done = subprocess.run(
                [sys.executable, str(RIG), "--enemy", "hag", "--out", tmp],
                capture_output=True, text=True)
            self.assertNotEqual(done.returncode, 0)
            self.assertIn("no rig for 'hag'", done.stderr)
            self.assertEqual(list(Path(tmp).iterdir()), [])


class TheToolLivesHereNow(unittest.TestCase):
    def test_nothing_python_is_left_in_the_mobile_art_scripts(self):
        old_home = DEPT.parent / "axiomancer-mobile" / "scripts" / "art"
        if not old_home.is_dir():
            return
        strays = sorted(p.name for p in old_home.rglob("*.py"))
        self.assertEqual(strays, [], f"Python left behind in {old_home}: {strays}")


if __name__ == "__main__":
    unittest.main()
