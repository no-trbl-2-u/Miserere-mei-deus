#!/usr/bin/env python3
"""Run this tree's test suite.

The art-department is reached by path, never by `npm --workspace`, so it needs
its own runner rather than a script in the root package.json's test list.

Usage:  python art-department/run-tests.py [-v]
Exit:   0 green; 1 a failure, an error, or a missing dependency.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

DEPT = Path(__file__).resolve().parent


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    verbosity = 2 if ("-v" in argv or "--verbose" in argv) else 1

    # The suite imports `doctor` and the masters by path, so the department
    # itself is the import root.
    sys.path.insert(0, str(DEPT))

    # A missing dependency is the doctor's story to tell, not an import trace's.
    import doctor

    gone = doctor.missing(doctor.parse_requirements(
        doctor.REQUIREMENTS.read_text(encoding="utf-8")))
    if gone:
        print("cannot run the suite -- missing: "
              + ", ".join(r.name for r in gone), file=sys.stderr)
        print("run `python art-department/doctor.py` for the fix", file=sys.stderr)
        return 1

    suite = unittest.defaultTestLoader.discover(
        start_dir=str(DEPT / "tests"), top_level_dir=str(DEPT))
    result = unittest.TextTestRunner(verbosity=verbosity).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
