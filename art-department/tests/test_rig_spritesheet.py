"""The rig regenerates the float-eye sheet byte for byte from its new home.

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

DEPT = Path(__file__).resolve().parents[1]
RIG = DEPT / "tools" / "rig-spritesheet.py"
MASTERS = DEPT / "masters" / "enemies"
ENEMY = "float-eye"
OUTPUTS = [
    f"{ENEMY}.sheet.png",
    f"{ENEMY}.sheet.webp",
    f"{ENEMY}.sheet.json",
    f"{ENEMY}.preview.webp",
]


class RigRegeneratesTheMaster(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name)
        done = subprocess.run(
            [sys.executable, str(RIG), "--enemy", ENEMY, "--out", str(cls.out)],
            capture_output=True, text=True)
        if done.returncode != 0:
            raise AssertionError(f"rig failed:\n{done.stdout}\n{done.stderr}")

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_it_writes_every_output(self):
        for name in OUTPUTS:
            with self.subTest(name):
                self.assertTrue((self.out / name).is_file(), f"{name} was not written")

    def test_every_output_matches_the_committed_master_byte_for_byte(self):
        for name in OUTPUTS:
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

    def test_the_manifest_still_points_at_the_source_painting(self):
        import json

        meta = json.loads((self.out / f"{ENEMY}.sheet.json").read_text(encoding="utf-8"))
        source = DEPT / "masters" / "enemies" / meta["source"]
        self.assertTrue(source.resolve().is_file(),
                        f"manifest source {meta['source']} does not resolve to a file")
        self.assertEqual(meta["generator"], "art-department/tools/rig-spritesheet.py")


class TheToolLivesHereNow(unittest.TestCase):
    def test_nothing_python_is_left_in_the_mobile_art_scripts(self):
        old_home = DEPT.parent / "axiomancer-mobile" / "scripts" / "art"
        if not old_home.is_dir():
            return
        strays = sorted(p.name for p in old_home.rglob("*.py"))
        self.assertEqual(strays, [], f"Python left behind in {old_home}: {strays}")


if __name__ == "__main__":
    unittest.main()
