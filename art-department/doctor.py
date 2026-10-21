#!/usr/bin/env python3
"""Check that this tree's Python toolchain can run, and name what is missing.

An art tool that dies inside `import PIL` tells a newcomer nothing useful.
This reports every unsatisfied requirement by name, with the command that
fixes it, and exits non-zero -- so a checkout without Pillow fails saying
"Pillow", not with a traceback.

What it checks:
  * the interpreter is new enough;
  * every distribution declared in requirements.txt is importable.

Usage:  python art-department/doctor.py
Exit:   0 everything present; 1 something is missing.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import importlib.util
import re
import sys
from dataclasses import dataclass
from pathlib import Path

DEPT = Path(__file__).resolve().parent
REQUIREMENTS = DEPT / "requirements.txt"

# Matches the floor in requirements.txt's own comment; bumped deliberately.
MIN_PYTHON = (3, 11)


@dataclass(frozen=True)
class Requirement:
    """One declared dependency: how pip names it, and how Python imports it."""

    spec: str     # the whole requirement line, e.g. "Pillow>=12.0"
    name: str     # the distribution name, e.g. "Pillow"
    module: str   # the import name, e.g. "PIL"


# A requirement line ends at the first version specifier, extra or whitespace.
_NAME = re.compile(r"^[A-Za-z0-9._-]+")
_MODULE_NOTE = re.compile(r"module:\s*([A-Za-z0-9_.]+)")


def parse_requirements(text: str) -> list[Requirement]:
    """Read requirements.txt content into Requirements, comments and all."""
    out: list[Requirement] = []
    for raw in text.splitlines():
        spec, _, comment = raw.partition("#")
        spec = spec.strip()
        if not spec:
            continue
        match = _NAME.match(spec)
        if not match:
            continue
        name = match.group(0)
        note = _MODULE_NOTE.search(comment)
        out.append(Requirement(spec=spec, name=name, module=note.group(1) if note else name))
    return out


def importable(module: str) -> bool:
    """True when `import <module>` would resolve, without executing it."""
    try:
        return importlib.util.find_spec(module) is not None
    except (ImportError, ValueError):
        return False


def missing(requirements, probe=importable) -> list[Requirement]:
    """The declared requirements whose module cannot be found."""
    return [r for r in requirements if not probe(r.module)]


def _version(req: Requirement) -> str:
    try:
        return importlib.metadata.version(req.name)
    except importlib.metadata.PackageNotFoundError:
        return "present"


def report(requirements, probe=importable, python=sys.version_info, out=sys.stdout) -> int:
    """Print one line per check and return the process exit code."""
    print("art-department doctor", file=out)

    version = ".".join(str(n) for n in python[:3])
    floor = ".".join(str(n) for n in MIN_PYTHON)
    old = tuple(python[:2]) < MIN_PYTHON
    status = f"too old, needs >={floor}" if old else "ok"
    print(f"  {'python':<10} {version:<12} {status}", file=out)

    gone = missing(requirements, probe)
    for req in requirements:
        if req in gone:
            print(f"  {req.name:<10} {'MISSING':<12} install with: "
                  f'python -m pip install "{req.spec}"', file=out)
        else:
            print(f"  {req.name:<10} {_version(req):<12} ok", file=out)

    if old or gone:
        names = ", ".join(r.name for r in gone) if gone else "none"
        print(f"\nunsatisfied: {names}", file=out)
        print(f"fix everything at once: python -m pip install -r "
              f"{REQUIREMENTS.relative_to(DEPT.parent).as_posix()}", file=out)
        return 1

    print("\nall good", file=out)
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--requirements", type=Path, default=REQUIREMENTS,
                    help="manifest to check; defaults to this tree's own")
    args = ap.parse_args(argv)
    return report(parse_requirements(args.requirements.read_text(encoding="utf-8")))


if __name__ == "__main__":
    sys.exit(main())
