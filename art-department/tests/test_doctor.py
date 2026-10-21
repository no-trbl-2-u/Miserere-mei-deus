"""The doctor reports a missing dependency by name rather than crashing."""

from __future__ import annotations

import io
import subprocess
import sys
import unittest
from pathlib import Path

import doctor

DEPT = Path(doctor.__file__).resolve().parent


class ParseRequirements(unittest.TestCase):
    def test_reads_the_name_and_the_import_name(self):
        reqs = doctor.parse_requirements('Pillow>=12.0  # module: PIL\nnumpy>=2.0\n')
        self.assertEqual([r.name for r in reqs], ["Pillow", "numpy"])
        self.assertEqual([r.module for r in reqs], ["PIL", "numpy"])
        self.assertEqual(reqs[0].spec, "Pillow>=12.0")

    def test_skips_blank_and_comment_only_lines(self):
        reqs = doctor.parse_requirements("# a header\n\n   \nnumpy>=2.0\n")
        self.assertEqual([r.name for r in reqs], ["numpy"])

    def test_the_real_manifest_declares_the_rig_tools_dependencies(self):
        reqs = doctor.parse_requirements(doctor.REQUIREMENTS.read_text(encoding="utf-8"))
        modules = {r.module for r in reqs}
        self.assertIn("PIL", modules)
        self.assertIn("numpy", modules)


class Report(unittest.TestCase):
    def _report(self, absent, python=sys.version_info):
        reqs = doctor.parse_requirements(doctor.REQUIREMENTS.read_text(encoding="utf-8"))
        out = io.StringIO()
        code = doctor.report(reqs, probe=lambda m: m not in absent, python=python, out=out)
        return code, out.getvalue()

    def test_a_missing_dependency_is_named_and_the_exit_code_is_non_zero(self):
        code, text = self._report({"PIL"})
        self.assertNotEqual(code, 0)
        self.assertIn("Pillow", text)
        self.assertIn("MISSING", text)
        self.assertIn("unsatisfied: Pillow", text)
        # The fix is spelled out, not left to the reader.
        self.assertIn("pip install", text)

    def test_every_missing_dependency_is_named_not_just_the_first(self):
        code, text = self._report({"PIL", "numpy"})
        self.assertNotEqual(code, 0)
        self.assertIn("unsatisfied: Pillow, numpy", text)

    def test_an_old_interpreter_fails_and_says_the_floor(self):
        code, text = self._report(set(), python=(3, 9, 0, "final", 0))
        self.assertNotEqual(code, 0)
        self.assertIn("too old", text)

    def test_a_satisfied_toolchain_passes(self):
        code, text = self._report(set())
        self.assertEqual(code, 0)
        self.assertIn("all good", text)


class Entrypoint(unittest.TestCase):
    def test_running_doctor_on_this_machine_exits_zero(self):
        done = subprocess.run([sys.executable, str(DEPT / "doctor.py")],
                              capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertIn("all good", done.stdout)


if __name__ == "__main__":
    unittest.main()
