"""The splitter cuts the float-eye master into the cells its manifest promises.

What is pinned here is the one thing a split can get wrong without looking
wrong: the MAPPING. A cell that is the right size, from the right sheet, and
one column out, is a sheet whose clips have silently rotated -- the enemy
flinches on the beat it meant to swing. So every cell is compared against the
crop the manifest's own grid says it should be, rather than only counted.
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

DEPT = Path(__file__).resolve().parents[1]
MASTERS = DEPT / "masters" / "enemies"
SHEET = MASTERS / "float-eye.sheet.png"
MANIFEST = MASTERS / "float-eye.sheet.json"

# The tool's filename is kebab-case like every other script in this tree, so it
# is loaded by path rather than imported by name.
_spec = importlib.util.spec_from_file_location(
    "split_spritesheet", DEPT / "tools" / "split-spritesheet.py")
split_spritesheet = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(split_spritesheet)


class SplitsTheFloatEye(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = json.loads(MANIFEST.read_text(encoding="utf-8"))
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name)
        cls.written = split_spritesheet.split(SHEET, cls.out)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_it_writes_one_cell_per_grid_position(self):
        expected = self.meta["columns"] * self.meta["rows"]
        self.assertEqual(len(self.written), expected)
        self.assertEqual(len(sorted(self.out.glob("*.png"))), expected)

    def test_the_cells_are_named_row_major_and_zero_padded(self):
        names = [p.name for p in self.written]
        self.assertEqual(names[0], "float-eye-00.png")
        self.assertEqual(names[-1], f"float-eye-{len(names) - 1:02d}.png")
        # Sorted alphabetically is sorted by frame: the ingest sweeps the
        # staging directory in name order, so the two orders must agree.
        self.assertEqual(names, sorted(names))

    def test_every_cell_is_one_frame_square(self):
        frame = self.meta["frame"]
        for path in self.written:
            with self.subTest(path.name):
                self.assertEqual(Image.open(path).size, (frame, frame))

    def test_every_cell_is_its_own_square_of_the_master(self):
        frame, columns = self.meta["frame"], self.meta["columns"]
        sheet = Image.open(SHEET).convert("RGBA")
        for i, path in enumerate(self.written):
            row, col = divmod(i, columns)
            box = (col * frame, row * frame, (col + 1) * frame, (row + 1) * frame)
            with self.subTest(i=i):
                self.assertEqual(
                    Image.open(path).convert("RGBA").tobytes(),
                    sheet.crop(box).tobytes(),
                    f"cell {i} is not the ({row}, {col}) square of the sheet")

    def test_the_cells_keep_their_alpha(self):
        # The cells are matted art over a transparent background; a split that
        # dropped the alpha would put a black box behind every enemy.
        self.assertEqual(Image.open(self.written[0]).mode, "RGBA")

    def test_a_sheet_whose_pixels_disagree_with_its_manifest_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bogus.sheet.png"
            Image.new("RGBA", (100, 100)).save(bad)
            (Path(tmp) / "bogus.sheet.json").write_text(
                json.dumps({"frame": 256, "columns": 8, "rows": 3}), encoding="utf-8")
            with self.assertRaises(SystemExit):
                split_spritesheet.split(bad, Path(tmp) / "out")

    def test_a_sheet_with_no_manifest_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            lonely = Path(tmp) / "lonely.sheet.png"
            Image.new("RGBA", (32, 32)).save(lonely)
            with self.assertRaises(SystemExit):
                split_spritesheet.split(lonely, Path(tmp) / "out")


if __name__ == "__main__":
    unittest.main()
