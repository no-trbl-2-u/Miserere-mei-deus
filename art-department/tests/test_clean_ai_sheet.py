"""The image-model sheet cleanup does each of its steps, and only those (AN5, A1/A2/A9).

Every step is pinned on a small synthetic sheet (8 x 3 cells of 32px) where
the right answer is known by construction: a neighbour's sliver is dropped, a
limb that crossed a gridline is restored to its own cell, a resample refuses
outside 1%, every translation is an integer, and a scale, when one is needed,
is the same for all 24 cells. The last class runs the tool on the Gallows
Crow's master and checks it reproduces the committed sidecar and report,
pixels included, so the shipped cells can always be regenerated.
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

DEPT = Path(__file__).resolve().parents[1]
MASTERS = DEPT / "masters" / "enemies"

_spec = importlib.util.spec_from_file_location(
    "clean_ai_sheet", DEPT / "tools" / "clean-ai-sheet.py")
clean_ai_sheet = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(clean_ai_sheet)

F, COLS, ROWS = 32, 8, 3
RED = (220, 30, 30, 255)
GREEN = (30, 200, 30, 255)


def blank() -> np.ndarray:
    return np.zeros((ROWS * F, COLS * F, 4), dtype=np.uint8)


def box(sheet: np.ndarray, x0: int, y0: int, x1: int, y1: int, colour=GREEN) -> None:
    sheet[y0:y1, x0:x1] = colour


def standing_sheet(drift=(0, 0, 0, 0, 0, 0, 0, 0)) -> np.ndarray:
    """A 10x10 square in every cell, its base on y 28; idle drifts by `drift`."""
    sheet = blank()
    for k in range(COLS * ROWS):
        row, col = divmod(k, COLS)
        dx = drift[col] if row == 0 else 0
        x0 = col * F + 11 + dx
        box(sheet, x0, row * F + 18, x0 + 10, row * F + 28)
    return sheet


def run(sheet: np.ndarray, **kw) -> tuple[dict, dict, np.ndarray, Path]:
    tmp = tempfile.TemporaryDirectory()
    root = Path(tmp.name)
    src = root / "synthetic.sheet.png"
    Image.fromarray(sheet, mode="RGBA").save(src)
    out = root / "out"
    report = clean_ai_sheet.clean(src, out, frame=F, columns=COLS, rows=ROWS, **kw)
    sidecar = json.loads((out / "synthetic.sheet.json").read_text(encoding="utf-8"))
    cleaned = np.asarray(Image.open(out / "synthetic.sheet.png").convert("RGBA"))
    run.keep.append(tmp)
    return report, sidecar, cleaned, out


run.keep = []


def tearDownModule():
    for tmp in run.keep:
        tmp.cleanup()


def cell(sheet: np.ndarray, k: int) -> np.ndarray:
    row, col = divmod(k, COLS)
    return sheet[row * F:(row + 1) * F, col * F:(col + 1) * F]


def is_colour(px: np.ndarray, colour) -> np.ndarray:
    return np.all(px == np.array(colour, dtype=np.uint8), axis=-1)


class SliversAndLimbs(unittest.TestCase):
    """(b): a neighbour's sliver goes, a crossing limb comes home."""

    @classmethod
    def setUpClass(cls):
        sheet = standing_sheet()
        # Cell 1's figure is red, and its arm reaches 6px over the gridline
        # into cell 2, connected to the body.
        cell1 = 1 * F
        box(sheet, cell1 + 11, 18, cell1 + 21, 28, RED)
        box(sheet, cell1 + 21, 20, 2 * F + 6, 23, RED)
        cls.red_total = int(is_colour(sheet, RED).sum())
        cls.arm_in_cell2 = 6 * 3
        cls.report, cls.sidecar, cls.cleaned, _ = run(sheet)

    def test_the_sliver_is_dropped_from_the_neighbour(self):
        self.assertEqual(int(is_colour(cell(self.cleaned, 2), RED).sum()), 0)
        self.assertEqual(self.report["cells"][2]["sliver_px_removed"], self.arm_in_cell2)
        self.assertEqual(self.report["cells"][2]["sliver_sources"], [1])

    def test_the_limb_is_restored_whole_to_its_own_cell(self):
        # No scale was needed, so every red pixel is in cell 1, unclipped.
        self.assertEqual(self.report["global_scale"], 1.0)
        self.assertEqual(int(is_colour(cell(self.cleaned, 1), RED).sum()), self.red_total)
        self.assertEqual(self.report["cells"][1]["px_reassembled"], self.arm_in_cell2)

    def test_no_other_cell_is_touched_by_the_sliver_logic(self):
        for k in range(COLS * ROWS):
            if k in (1, 2):
                continue
            with self.subTest(cell=k):
                self.assertEqual(self.report["cells"][k]["sliver_px_removed"], 0)
                self.assertEqual(self.report["cells"][k]["px_reassembled"], 0)


class TwoPosesWelded(unittest.TestCase):
    """(b): two poses joined by a bar are cut at the gridline, not merged."""

    def test_a_weld_is_split_at_the_gridline(self):
        sheet = standing_sheet()
        box(sheet, 1 * F + 21, 22, 2 * F + 11, 24)  # joins cell 1's and 2's squares
        report, _, cleaned, _ = run(sheet)
        self.assertEqual(report["components"]["welded_split"], 1)
        # Each cell keeps a square: neither lost its figure to the other.
        for k in (1, 2):
            with self.subTest(cell=k):
                self.assertGreaterEqual(int((cell(cleaned, k)[..., 3] > 0).sum()), 100)


class Resample(unittest.TestCase):
    """(a): within 1% on each axis it is resampled; further off it refuses."""

    def test_a_sheet_more_than_one_percent_off_refuses_naming_its_size(self):
        sheet = standing_sheet()
        wide = np.zeros((ROWS * F, COLS * F + 3, 4), dtype=np.uint8)  # 1.17% off
        wide[:, :COLS * F] = sheet
        with self.assertRaises(clean_ai_sheet.Refused) as raised:
            run(wide)
        self.assertIn(f"{COLS * F + 3}x{ROWS * F}", raised.exception.reason)

    def test_a_sheet_within_one_percent_is_resampled_to_the_canvas(self):
        sheet = standing_sheet()
        near = np.zeros((ROWS * F, COLS * F + 1, 4), dtype=np.uint8)  # 0.39% off
        near[:, :COLS * F] = sheet
        report, _, cleaned, _ = run(near)
        self.assertTrue(report["canvas"]["resampled"])
        self.assertEqual(report["canvas"]["input_size"], [COLS * F + 1, ROWS * F])
        self.assertEqual(cleaned.shape[:2], (ROWS * F, COLS * F))

    def test_an_exact_sheet_is_not_resampled(self):
        report, _, _, _ = run(standing_sheet())
        self.assertFalse(report["canvas"]["resampled"])


class Registration(unittest.TestCase):
    """(c) and A9: integer moves only, and the idle stops drifting."""

    @classmethod
    def setUpClass(cls):
        # An idle that slides 7px one way across its loop: the generator's drift.
        cls.report, cls.sidecar, cls.cleaned, _ = run(standing_sheet((0, 1, 2, 3, 4, 5, 6, 7)))

    def test_every_translation_is_an_integer(self):
        for c in self.report["cells"]:
            with self.subTest(cell=c["cell"]):
                self.assertTrue(all(isinstance(v, int) for v in c["translate"]))

    def test_the_idle_holds_still_after_cleanup(self):
        self.assertLessEqual(self.report["a9"]["idle_centre_drift_px"], 1.0)
        self.assertTrue(self.report["a9"]["pass"])
        centres = []
        for k in range(COLS):
            alpha = cell(self.cleaned, k)[..., 3].astype(float)
            xs = np.indices(alpha.shape)[1]
            centres.append((alpha * xs).sum() / alpha.sum())
        self.assertLessEqual(max(centres) - min(centres), 1.0)

    def test_each_reaction_row_moves_as_a_whole(self):
        for row in (1, 2):
            moves = {tuple(c["translate"]) for c in self.report["cells"][row * COLS:(row + 1) * COLS]}
            with self.subTest(row=row):
                self.assertEqual(len(moves), 1, "a reaction row's cells were moved differently")

    def test_a9_fails_a_drifting_idle(self):
        cells = [cell(standing_sheet((0, 0, 0, 0, 5, 5, 5, 5)), k).copy() for k in range(COLS * ROWS)]
        a9 = clean_ai_sheet.drift_report(cells, COLS, ROWS)
        self.assertFalse(a9["pass"])
        self.assertEqual(a9["idle_centre_drift_px"], 5.0)


class AnchorKind(unittest.TestCase):
    """A2: the anchor kind is measured from the idle row's foot line."""

    def test_a_figure_whose_feet_hold_stands(self):
        _, sidecar, _, _ = run(standing_sheet())
        self.assertEqual(sidecar["anchor"]["kind"], "foot-line")
        self.assertIn("stands", sidecar["anchor"]["why"])

    def test_a_figure_whose_base_bobs_floats(self):
        sheet = blank()
        bob = (0, 3, 6, 9, 6, 3, 0, 3)  # 9px of 32: 28%, far over 6%
        for k in range(COLS * ROWS):
            row, col = divmod(k, COLS)
            y = row * F + 6 + (bob[col] if row == 0 else 0)
            box(sheet, col * F + 11, y, col * F + 21, y + 10)
        _, sidecar, _, _ = run(sheet)
        self.assertEqual(sidecar["anchor"]["kind"], "centre")
        self.assertIn("floats", sidecar["anchor"]["why"])


class SheetWideScale(unittest.TestCase):
    """(d): a figure too big for its cell shrinks the whole set by one factor."""

    @classmethod
    def setUpClass(cls):
        sheet = standing_sheet()
        # One attacking cell's figure is wider than a cell: its square plus a
        # wing reaching 14px into the next cell (a limb, not a weld).
        k = 2 * COLS + 3
        x0 = 3 * F + 11
        box(sheet, x0 - 12, 2 * F + 18, x0 + 10 + 14, 2 * F + 20)
        cls.report, cls.sidecar, cls.cleaned, _ = run(sheet)
        cls.wide = k

    def test_one_factor_is_recorded_in_the_sidecar_and_the_report(self):
        self.assertLess(self.sidecar["scale"], 1.0)
        self.assertEqual(self.sidecar["scale"], self.report["global_scale"])

    def test_the_scale_is_the_same_for_every_cell(self):
        s = self.sidecar["scale"]
        areas = []
        for k in range(COLS * ROWS):
            if k == self.wide:
                continue
            areas.append(cell(self.cleaned, k)[..., 3].astype(float).sum() / 255.0)
        # Every 10x10 square comes out at the same size, and that size is s^2.
        self.assertLess(max(areas) - min(areas), 0.02 * max(areas))
        self.assertAlmostEqual(float(np.mean(areas)), 100 * s * s, delta=3.0)

    def test_the_wide_figure_now_fits_uncropped(self):
        # 36px of wing plus its square: 10*10 + 36*2 - 10*2 = 152 px of paint.
        # Scaled by s and wholly inside the cell, it weighs 152 * s^2; a crop
        # would weigh less.
        s = self.sidecar["scale"]
        mass = cell(self.cleaned, self.wide)[..., 3].astype(float).sum() / 255.0
        self.assertAlmostEqual(mass, 152 * s * s, delta=0.03 * 152)


class TheGallowsCrowRegenerates(unittest.TestCase):
    """The committed sidecar and report are what the tool makes of the master."""

    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name)
        cls.report = clean_ai_sheet.clean(
            MASTERS / "gallows-crow.sheet.webp", cls.out, out_frame=176)

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_the_sidecar_is_reproduced(self):
        committed = json.loads((MASTERS / "gallows-crow.sheet.json").read_text(encoding="utf-8"))
        fresh = json.loads((self.out / "gallows-crow.sheet.json").read_text(encoding="utf-8"))
        self.assertEqual(fresh, committed)

    def test_the_report_and_its_pixels_are_reproduced(self):
        committed = json.loads(
            (MASTERS / "gallows-crow.cleanup-report.json").read_text(encoding="utf-8"))
        self.assertEqual(self.report["pixels_sha256"], committed["pixels_sha256"])
        self.assertEqual(self.report, committed)

    def test_the_crow_stands_and_holds_still(self):
        self.assertEqual(self.report["anchor"]["kind"], "foot-line")
        self.assertTrue(self.report["a9"]["pass"])
        self.assertLessEqual(self.report["a9"]["idle_centre_drift_px"], 3.0)


if __name__ == "__main__":
    unittest.main()
