"""The card cutter cuts a magenta-gutter sheet by its manifest, and refuses a bad one.

Every sheet here is built in the test, so the suite needs none of the committed
masters. Each synthetic tile is a flat colour of its own on a black ground, which
is what lets the mapping be pinned: a tile that is the right size but belongs to
the wrong card id would still look like a cut, so each output is compared to the
colour its tile was painted.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

DEPT = Path(__file__).resolve().parents[1]

_spec = importlib.util.spec_from_file_location(
    "split_card_sheet", DEPT / "tools" / "split-card-sheet.py")
cutter = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cutter)

MAGENTA = (255, 0, 255)
TILE = 450        # a tile's side; over the 400 px floor
GUTTER = 24
IDS = ["aa-1", "aa-2", "aa-3", "aa-4", "aa-5", "aa-6"]


def tile_colour(i: int) -> tuple[int, int, int]:
    """A distinct, non-magenta, mid-bright colour per tile index."""
    return (40 + 30 * i, 120, 200 - 20 * i)


def build_sheet(cols=3, rows=2, tile_w=TILE, tile_h=TILE, painter=None) -> np.ndarray:
    """A magenta sheet with cols x rows tiles; each tile black with a coloured
    core (so its outer ring is black). `painter(i, tile)` may then mark a tile."""
    w = cols * tile_w + (cols + 1) * GUTTER
    h = rows * tile_h + (rows + 1) * GUTTER
    sheet = np.zeros((h, w, 3), dtype=np.uint8)
    sheet[:, :] = MAGENTA
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            x0 = GUTTER + c * (tile_w + GUTTER)
            y0 = GUTTER + r * (tile_h + GUTTER)
            tile = np.zeros((tile_h, tile_w, 3), dtype=np.uint8)
            m = tile_w // 6
            tile[m:-m, m:-m] = tile_colour(i)
            if painter:
                painter(i, tile)
            sheet[y0:y0 + tile_h, x0:x0 + tile_w] = tile
    return sheet


class Cutting(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)
        self.out = self.dir / "out"

    def tearDown(self):
        self._tmp.cleanup()

    def sheet(self, array, tiles=IDS, cols=3, rows=2, name="sheet-1.png") -> tuple[Path, Path]:
        path = self.dir / name
        Image.fromarray(array).save(path, "PNG")
        manifest = self.dir / "manifest.json"
        manifest.write_text(json.dumps({
            "lane": "test", "grid": {"cols": cols, "rows": rows},
            "sheets": [{"file": name, "tiles": tiles}],
        }), encoding="utf-8")
        return path, manifest

    def cut(self, array, **kw):
        path, manifest = self.sheet(array, **kw)
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            written = cutter.split(path, manifest, self.out)
        return written, stderr.getvalue()

    def refused(self, array, **kw) -> str:
        path, manifest = self.sheet(array, **kw)
        with self.assertRaises(cutter.Refused) as caught:
            cutter.split(path, manifest, self.out)
        return str(caught.exception)

    def test_a_good_sheet_gives_six_named_cells(self):
        written, _ = self.cut(build_sheet())
        self.assertEqual([p.name for p in written], [f"{i}.png" for i in IDS])
        self.assertEqual(sorted(p.name for p in self.out.glob("*.png")),
                         sorted(f"{i}.png" for i in IDS))

    def test_each_cell_is_the_tile_its_id_names(self):
        written, _ = self.cut(build_sheet())
        for i, path in enumerate(written):
            pixels = np.asarray(Image.open(path).convert("RGB"))
            centre = tuple(int(v) for v in pixels[pixels.shape[0] // 2, pixels.shape[1] // 2])
            with self.subTest(card=path.stem):
                self.assertEqual(centre, tile_colour(i))

    def test_a_cell_is_the_tile_trimmed_by_the_inset_and_lossless(self):
        written, _ = self.cut(build_sheet())
        side = TILE - 2 * cutter.INSET
        for path in written:
            self.assertEqual(Image.open(path).size, (side, side))
            self.assertEqual(Image.open(path).mode, "RGB")

    def test_a_null_tile_is_skipped(self):
        tiles = IDS[:5] + [None]
        written, _ = self.cut(build_sheet(), tiles=tiles)
        self.assertEqual(len(written), 5)
        self.assertEqual(len(list(self.out.glob("*.png"))), 5)

    def test_a_three_by_one_sheet_is_refused_for_a_three_by_two_manifest(self):
        message = self.refused(build_sheet(cols=3, rows=1), tiles=IDS[:3])
        self.assertIn("sheet-1.png", message)
        self.assertIn("1", message)
        self.assertFalse(self.out.exists())

    def test_a_non_square_tile_is_refused(self):
        message = self.refused(build_sheet(tile_h=TILE + 60))
        self.assertIn("off square", message)
        self.assertIn("aa-1", message)

    def test_a_tile_under_four_hundred_pixels_is_refused(self):
        message = self.refused(build_sheet(tile_w=360, tile_h=360))
        self.assertIn("under 400px", message)

    def test_a_gutter_fringe_on_a_tiles_edge_is_refused(self):
        def fringe(i, tile):
            if i == 2:
                tile[:, :5] = MAGENTA   # reaches past the 3 px inset into the band

        message = self.refused(build_sheet(painter=fringe))
        self.assertIn("aa-3", message)
        self.assertIn("edge band", message)
        self.assertFalse(self.out.exists())

    def test_a_fringe_inside_the_trimmed_inset_is_cut_away_not_refused(self):
        def hairline(i, tile):
            tile[:, :cutter.INSET] = MAGENTA   # exactly what the inset trims

        written, _ = self.cut(build_sheet(painter=hairline))
        self.assertEqual(len(written), 6)

    def test_a_magenta_stroke_in_the_middle_of_a_tile_is_kept(self):
        def lightning(i, tile):
            if i == 0:
                mid = TILE // 2
                tile[40:-40, mid - 6:mid + 6] = MAGENTA   # a long painted stroke, clear of the edge

        written, _ = self.cut(build_sheet(painter=lightning))
        pixels = np.asarray(Image.open(written[0]).convert("RGB"))
        self.assertEqual(len(written), 6)
        self.assertTrue((pixels == MAGENTA).all(axis=-1).any())

    def test_a_grey_ring_warns_naming_the_card_and_still_writes_it(self):
        def grey(i, tile):
            if i == 4:
                tile[:, :] = 90   # the ring is no longer near black

        written, stderr = self.cut(build_sheet(painter=grey))
        self.assertIn("aa-5", stderr)
        self.assertIn("not near black", stderr)
        self.assertEqual(len(written), 6)

    def test_black_rings_do_not_warn(self):
        _, stderr = self.cut(build_sheet())
        self.assertEqual(stderr, "")

    def test_a_sheet_the_manifest_does_not_list_is_refused(self):
        path, manifest = self.sheet(build_sheet())
        other = self.dir / "sheet-9.png"
        other.write_bytes(path.read_bytes())
        with self.assertRaises(cutter.Refused):
            cutter.split(other, manifest, self.out)


class CommandLine(unittest.TestCase):
    def test_a_refused_sheet_exits_non_zero_naming_the_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            Image.fromarray(build_sheet(cols=3, rows=1)).save(tmp / "sheet-1.png")
            (tmp / "manifest.json").write_text(json.dumps({
                "grid": {"cols": 3, "rows": 2},
                "sheets": [{"file": "sheet-1.png", "tiles": IDS}],
            }), encoding="utf-8")
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                code = cutter.main(["--sheet", str(tmp / "sheet-1.png"),
                                    "--manifest", str(tmp / "manifest.json"),
                                    "--out", str(tmp / "out")])
            self.assertEqual(code, 1)
            self.assertIn("sheet-1.png", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
