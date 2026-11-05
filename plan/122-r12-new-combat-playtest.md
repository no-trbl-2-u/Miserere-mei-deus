# 122 — New combat-playtest

> New combat-playtest

Carried from the v1 build plan row at the nexus v2 cut-over (phase NX1d, 2026-11-01); the row had no brief of its own. Each chunk keeps its v1 row id as its `alias:`.

## Why

- R12: New combat-playtest (attended): design and write a new `/combat-playtest` command for the rebuilt game (the old one was archived in R0), around the two questions only T's play can answer: are the survivors winnable, and are they dangerous (T's judgement, played). The number for "how hard is Chapter 1" (win rates, how long a run takes, where it breaks) is SM2f's nightly report (spec 135, `docs/reports/sim/latest.md`), not this command's; the command reads that report and R12a's `measuredTruthCells` for the numbers and does not recompute them. T also decides what the matrix should measure (lowest VITAE included). Keeps the engine matrix CLI. `plan/revamp/loop.md`. Requires RC, R11, R12a.

## Design

New combat-playtest (attended): design and write a new `/combat-playtest` command for the rebuilt game (the old one was archived in R0), around the two questions only T's play can answer: are the survivors winnable, and are they dangerous (T's judgement, played). The number for "how hard is Chapter 1" (win rates, how long a run takes, where it breaks) is SM2f's nightly report (spec 135, `docs/reports/sim/latest.md`), not this command's; the command reads that report and R12a's `measuredTruthCells` for the numbers and does not recompute them. T also decides what the matrix should measure (lowest VITAE included). Keeps the engine matrix CLI. `plan/revamp/loop.md`. Requires RC, R11, R12a.

## Contracts

None beyond Design.

## Acceptance

- **A1** New combat-playtest (attended): design and write a new `/combat-playtest` command for the rebuilt game (the old one was archived in R0), around the two questions only T's play can answer: are the survivors winnable, and are they dangerous (T's judgement, played). The number for "how hard is Chapter 1" (win rates, how long a run takes, where it breaks) is SM2f's nightly report (spec 135, `docs/reports/sim/latest.md`), not this command's; the command reads that report and R12a's `measuredTruthCells` for the numbers and does not recompute them. T also decides what the matrix should measure (lowest VITAE included). Keeps the engine matrix CLI. `plan/revamp/loop.md`.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 0 closed · next A2

- [ ] **122.2** New combat-playtest (attended) · S · closes A1 · needs — · alias: R12
