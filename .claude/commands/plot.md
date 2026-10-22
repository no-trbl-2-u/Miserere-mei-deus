---
description: T's intake for one known task — turn "let's add…", "the loop should build…", "make a phase for…", "queue this" into one spec brief with acceptance IDs (A1…) and a Measure line, split into as many one-tick phases as it needs (a build-plan row each), slotted asap or anytime and opened as a `plot` PR T merges to approve. Never builds; never fired by the loop.
---

You are invoked under the `plot` skill. Read `skills/plot.md` end to
end before touching anything else; it is the single source of truth.

Argument handling:
- `asap "<task>"` → slot directly above the first open row.
- `anytime "<task>"` → slot after the last open row.
- `peek "<task>"` → orient, research, shape; print the brief and its
  phase table, commit nothing, open no PR.
- `"<task>"` with no word → pick asap or anytime and say why.
- `<N>` → write the missing brief for existing row N.

Procedure: §2 of `skills/plot.md` (orient, research, shape the spec and
decide its phases, slot, open the `plot` PR on `loop/plot-<N>-<slug>`,
retro). Never push `main` (D93). Hard rules: §3.
Never write code.

Argument: $ARGUMENTS
