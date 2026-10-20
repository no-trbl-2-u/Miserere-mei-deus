# Phase HP4 — A graded hazard-puzzle set, played and pattern-mined

## Sources

- `/plot` request, T, 2026-10-19 (attended), in T's words: "plot a phase where
  we do 10 easy, 10 medium, 10 hard, each with a label. I'll do another
  playthrough of them to determine which to keep and hopefully we can find
  some patterns for future puzzles."
- The finding that prompted it, same session: T played all six routes of the
  three demos through `/devpuzzle` and solved every one in under ten seconds.
  `npm run puzzle:report` on the current library:

  | demo / route | declared band | winning outcomes | cards required in every win |
  |---|---|---|---|
  | `demo-cliff-easy` safe | easy | 32 | 0 / 4 |
  | `demo-cliff-easy` risk | easy | 44 | 1 / 4 |
  | `demo-ashfall-medium` safe | medium | 17 | 2 / 4 |
  | `demo-undercroft-hard` safe | medium | 10 | 3 / 5 |
  | `demo-ashfall-medium` risk | medium | 7 | 4 / 4 |
  | `demo-undercroft-hard` risk | hard | 2 | 5 / 5 |

- D37 / D88 (THE CARD HOLD; content per surface), D84–D87 (code lands by PR,
  T merges), D93 (`/plot` lands by a `plot` PR).
- `plan/deadlines.md` — W1 "Hazard puzzles locked", W2 "Act 1 hazards are
  puzzles".
- Prior art read while shaping this: `hazard-puzzle.tuning.ts`
  (`HAZARD_PUZZLE_BANDS`, `HAZARD_PUZZLE_CARD_POOL`), `hazard-puzzle.band.ts`
  (`hazardPuzzleBandOf`, `auditHazardPuzzleRoute`), `hazard-puzzle.report.ts`,
  `hazard-puzzle.dominance.ts` (HP1d), `hazard-puzzle.types.ts`,
  `hazard-puzzle.library.ts`, `components/hazard/puzzle/HazardPuzzleDemo.tsx`.

## Outcome

Thirty labelled candidate hazard puzzles exist, ten per intended difficulty,
authored against a measure of the decisions a player actually faces; T has
played them and ruled each keep or cut; and the kept set's shared traits are
written down as the authoring patterns future puzzles are built to.

## The defect this phase exists to fix

`HAZARD_PUZZLE_BANDS` grades a route purely by its count of distinct winning
outcomes: easy is `>= 30`, medium `5-29`, hard `1-4` with a best surplus of at
most 1. `auditHazardPuzzleRoute` then holds every library layout to its
declared band, so the outcome count *is* the current definition of difficulty.

T's solves show that definition is inverted. A low outcome count means the
round is combinatorially tight, and in practice tightness is reached by making
every card mandatory: on `demo-undercroft-hard` risk all five cards are
required in every winning line, so the only available play is "play
everything" and there is no decision to make. At the other end 44 winning
outcomes from a four-card hand means almost any play wins, so the decisions
that do exist carry no weight. **Both ends solve in seconds, for opposite
reasons.** A puzzle lives in the middle: several plausible plays, most of which
lose.

Authoring thirty puzzles to the current band thresholds would therefore
reproduce the defect thirty times. So this phase first builds a measure of
decision pressure, then authors to that measure, and keeps the candidate set
out of `HAZARD_PUZZLE_LIBRARY` so the existing band and dominance gates stay
green while the new grading is still a claim under test.

## Size

See `## Phases`: six phases, `size:multi-phase`.

## Acceptance

- **A1** `npm run puzzle:report` prints, per layout, route and unlock set, a
  **decision-pressure** block alongside the existing card table: the count of
  pool cards that are *optional* (staged in at least one winning outcome but
  not all), the required share (`required / total`), the number of distinct
  **first plays** that can still reach a win, and the number that cannot. Each
  number has a test on a hand-built layout with hand-worked values.
- **A2** A layout whose every card is required on a route is reported as
  `forced` on that route, and one where every first play still wins is
  reported as `free`. Both are findings in `puzzle:report`, not failures: the
  current library prints `forced` on `demo-undercroft-hard` risk and
  `demo-ashfall-medium` risk, and `free` on `demo-cliff-easy` risk.
- **A3** A candidate layout type carries a short `label` (the authored pattern
  in a few words, e.g. "one trap, two decoys"), an `intendedBand` of
  `easy | medium | hard`, and the single `route` it is meant to be played on.
  `HAZARD_PUZZLE_CANDIDATES` holds them, separate from
  `HAZARD_PUZZLE_LIBRARY`.
- **A4** A candidate is validated by `validateHazardPuzzleLayout` and is
  solvable, inside the solver budget, and drawn only from
  `HAZARD_PUZZLE_CARD_POOL`; it is **not** held to `hazardPuzzleBandOf`, and a
  test pins that the three live library layouts and the dominance check are
  unaffected by anything in the candidate set.
- **A5** Thirty candidates exist: ten `intendedBand: 'easy'`, ten `'medium'`,
  ten `'hard'`, every `label` distinct, across at least three of the four Act 1
  regions.
- **A6** No candidate is `forced` or `free` on its nominated route (A2), and
  the thirty span the A1 decision-pressure numbers rather than clustering: each
  of the optional-card count and the losing-first-play count takes at least
  four distinct values across the set.
- **A7** No card, keyword or art is added (D37): every candidate draws from
  `HAZARD_PUZZLE_CARD_POOL` and reuses a live hazard's copy through `hazardId`,
  as the three demos do.
- **A8** `/devpuzzle` lists the thirty candidates grouped by `intendedBand`,
  each row showing its `label`, and plays any of them on its nominated route
  through the live `HazardBoard`. The three demos stay reachable. Production
  renders nothing, as now.
- **A9** `docs/reports/hazard-puzzle-candidates.md` records T's play of every
  candidate: the label, its intended band, T's rough solve time, whether T
  solved it, and T's keep-or-cut ruling in T's words.
- **A10** `docs/reports/hazard-puzzle-patterns.md` sets the kept candidates
  against the cut ones on the A1 numbers and names the authoring patterns that
  separate them, each as a rule a future puzzle can be built to and checked
  against. Where no pattern separates them it says so rather than inventing
  one.

Measure: `npm run verify -w axiomancer-mechanics` and `-w axiomancer-mobile`;
`npm run puzzle:report` prints the decision-pressure block for all thirty
candidates; `docs/reports/hazard-puzzle-patterns.md` exists and quotes T's
rulings.

## Scope

`axiomancer-mechanics`: the solver, report, types, tuning and library modules
under `src/World/Hazard/puzzle/`. `axiomancer-mobile`: the `/devpuzzle` route
and `components/hazard/puzzle/`, presenter-side only. Two reports under
`docs/reports/`. No change to `HAZARD_PUZZLE_LIBRARY`'s three layouts, to
`HAZARD_PUZZLE_BANDS`, to `HAZARD_PUZZLE_CLOCK_SECONDS`, or to the live Act 1
hazard nodes.

## Consumers to update

The puzzle barrel (`src/World/Hazard/puzzle/index.ts`) and the engine barrel
(`src/index.ts`) for the new types and functions; `docs/dev-tools.md` for the
`/devpuzzle` listing and the report's new block; `docs/game-model.md` only if a
constant moves, which this phase does not do.

## Save / schema contracts

None. Candidates are authored content read at dev time; nothing enters a save,
and no migration is needed. `/devpuzzle` is dev-gated by `isDevToolsEnabled`.

## Decisions made upfront — DO NOT ASK

- **Candidates live in their own library, not `HAZARD_PUZZLE_LIBRARY`** (A3,
  A4). `auditHazardPuzzleRoute` holds every library layout to
  `hazardPuzzleBandOf`, which is the very definition under test; putting thirty
  candidates in the library would either fail that gate thirty times or force
  the gate to be weakened. Keeping them separate leaves the existing band and
  HP1d dominance gates untouched.
- **`intendedBand` is a separate field from `bands`** (A3). `bands` stays what
  the solver measures; `intendedBand` is T's claim about felt difficulty. The
  whole point of the playthrough is to find out how far apart they are, so they
  cannot be the same field.
- **Each candidate nominates one route** (A3). A layout has two routes with
  two bands, so "ten easy" is otherwise ambiguous. The nominated route is what
  T plays and what the intended band grades.
- **Decision pressure is measured, not guessed** (A1). The authoring phase
  needs a target it can check, and the existing report gives only per-card
  use. The required share is already derivable from `hazardPuzzleCardReport`'s
  `required` flag; the first-play counts come from the solver.
- **The decision-pressure feature extends HP2b rather than duplicating it**
  (`requires HP2b`). HP2b already plans five difficulty features in
  `puzzle:report` and owns those files; a sixth feature landing beside them in
  a separate tick would conflict. HP2b is unclaimed as of 2026-10-19 (no
  `loop/ship-HP2b*` branch, no open `loop:pr`), but its brief is not amended
  here — lesson `amend-while-claimed`.
- **Thirty, as ten/ten/ten** (A5), exactly as T asked. Not a number the solver
  or the calibration maths picked.
- **Puzzle layouts are not card work** (A7). D37 and D88 reserve cards,
  keywords and art to guided sessions; a layout is an arrangement of existing
  pool cards, dice faces and goals, in the class D88 lets the loop build from
  a brief T approved. This brief is that approval.
- **`HAZARD_PUZZLE_CLOCK_SECONDS` is not touched.** T's solves were all under
  ten seconds, so median × 1.5 would set a ~15 s clock and encode the defect
  in a constant. The placeholders stand until the kept set has real times.
- **T's rough times are recorded as rough** (A9). HP2c's move log ships for
  the candidate playthrough, but T's solves of the *demos* were untimed
  recollections and the report says so.

## Tests matrix

- `hazard-puzzle.report.engine.test.ts` — the A1 numbers on hand-built
  layouts with hand-worked values; the `forced` and `free` findings of A2,
  including the named current-library cases.
- `hazard-puzzle.candidates.engine.test.ts` (new) — A4's validation and
  budget checks over all thirty; A5's counts, distinct labels and region
  spread; A6's no-`forced`, no-`free` and four-distinct-values spread.
- `hazard-puzzle.dominance.engine.test.ts` — extended with A4's pin that the
  candidate set does not enter `hazardPuzzleLibraryCells`.
- Mobile: a presenter test for the grouped candidate list (A8) and a visual
  shot of the list screen beside the existing `devpuzzle-board`.

## Verify gate

Mechanics verify for HP4a–HP4c and HP4f; mechanics plus mobile verify for
HP4b (the types cross the barrel) and HP4d. Root `npm test` for the report
phases.

## Commit body template

```
<type>: <what changed> — phase HP4<x>

<why, in one or two lines>

Acceptance: A<n> <how it was proved>
```

## DoD

A1–A10, all ticked, each naming the test, command or report that proves it.

## Follow-ups (out of scope)

- **B3f's report.** T's verdict on the demo solves is "change X", not "lock
  the process". `docs/reports/hazard-puzzle-timing.md` records the sub-ten-second
  solves, the table above and that verdict; B3f's own row owns it, not HP4.
- **HP2d (the calibration set, 13–20 puzzles with 3–5 held out)** should be
  drawn from HP4's kept set rather than authored separately; the row stays
  open and its brief is amended once HP4e's rulings exist.
- **HP2e's 0.7 Spearman bar.** With every solve under ten seconds there is no
  variance for any feature to correlate against, so HP2e fails its own bar as
  written. HP4's graded set is what would give it a spread; whether the bar
  survives is T's call once HP4f names the patterns.
- **HP2f** moves `HAZARD_PUZZLE_BANDS` onto the adopted measure and inherits
  whatever HP4f concludes.
- **Routing the live Act 1 hazard nodes to puzzles** (W2) is untouched here.
- Retiring or re-authoring the three demo layouts once the kept set exists.

## Phases

### HP4a — Decision pressure in the report · M · closes A1, A2 · requires HP2b
Measure: `npm run verify -w axiomancer-mechanics`; `npm run puzzle:report`
prints the decision-pressure block, and the current library prints `forced` on
two routes and `free` on one.
- Scope: `hazard-puzzle.report.ts`, `hazard-puzzle.solver.ts`, the puzzle
  barrel, the `puzzle:report` CLI.
- Consumers: the barrel; `docs/dev-tools.md`.
- Tests: the A1 numbers and the A2 findings on hand-built layouts with
  hand-worked values.
- Verify gate: mechanics verify; root `npm test`.

### HP4b — The candidate library shape · M · closes A3, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `-w axiomancer-mobile`;
an empty-but-typed `HAZARD_PUZZLE_CANDIDATES` validates, and the library and
dominance tests are untouched.
- Scope: `hazard-puzzle.types.ts`, a new candidates module,
  `hazard-puzzle.validate.ts`, both barrels.
- Consumers: engine barrel; `docs/dev-tools.md`.
- Tests: A4's validation, budget and isolation pins, including the extension
  to `hazard-puzzle.dominance.engine.test.ts`.
- Verify gate: mechanics plus mobile verify (the types cross the barrel).

### HP4c — Author the thirty · L · closes A5, A6, A7 · requires HP4a, HP4b
Measure: `npm run verify -w axiomancer-mechanics`; thirty candidates pass A5's
counts and A6's spread, and none is `forced` or `free` on its nominated route.
- Scope: the candidates module only.
- Consumers: none beyond the module.
- Tests: `hazard-puzzle.candidates.engine.test.ts` over all thirty.
- Verify gate: mechanics verify.
- Note: if a target band cannot be hit ten times without a `forced` or `free`
  layout, the phase ships the ones that pass and files the shortfall as a
  finding naming which band ran out of room. It never relaxes A6 to reach ten.

### HP4d — Thirty on the board · M · closes A8 · requires HP4b
Measure: `npm run verify -w axiomancer-mobile`; the `/devpuzzle` list shows
three labelled groups of candidates, plays any on its nominated route, and
still reaches the three demos.
- Scope: `app/devpuzzle/index.tsx`, `components/hazard/puzzle/`, the puzzle
  presenter in `state/presenters/`.
- Consumers: `docs/dev-tools.md`.
- Tests: a presenter test for the grouped list; a visual shot of the list
  screen.
- Verify gate: mobile verify.

### HP4e — T plays the thirty (attended) · S · closes A9 · requires HP4c, HP4d
Measure: `docs/reports/hazard-puzzle-candidates.md` has a row per candidate
with T's time, whether T solved it, and T's keep-or-cut ruling quoted.
- Scope: the report only.
- Consumers: none.
- Tests: none new; the report is the artefact.
- Verify gate: prose verify.
- Note: a first-time solve survives one exposure, so each candidate is played
  once and its label is not described to T beforehand. HP2c's move log times
  the session.

### HP4f — The patterns · M · closes A10 · requires HP4e
Measure: `docs/reports/hazard-puzzle-patterns.md` sets kept against cut on the
A1 numbers and states each pattern as a checkable rule, or says no pattern
separates them.
- Scope: the report; a candidates-module annotation marking each candidate
  kept or cut.
- Consumers: `docs/truth-sources.md` if the report becomes a cited source.
- Tests: none new.
- Verify gate: prose verify; mechanics verify for the annotation.
