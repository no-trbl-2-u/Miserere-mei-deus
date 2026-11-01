# 110 — A difficulty curve from bot plays, and the Breakwater's six hazards on it

> The thirty dev-menu puzzles each have a rough difficulty number from two seeded bots, ranked into one curve in a committed report. The Breakwater's six hazard nodes each play one puzzle from the middle of that curve, rising in difficulty along the story route, with the ten hardest left for later chapters.

Carried from the v1 brief `phase_HP6_breakwater_puzzle_curve.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_HP6_breakwater_puzzle_curve.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- `/plot` request, T, 2026-10-31 (attended), in T's words: "Let's do a phase where we run a reasonable amount of
  simulations of each hazard hidden in the devtools so we can get a rough difficulty curve. Then, pick n (where n
  is the number of hazards on Act 1 Chapter 1) puzzles to add to the first map. Pick the ones roughly in the middle
  but make sure each subsequent one on the map is harder than the last. (But don't pick the hardest ones since we
  need harder ones for the next chapter"
- T's rulings in the same session (AskUserQuestion):
  - **Order is the story route first.** The wreck (`bw-h4`) is the first story gate (`plan/revamp/breakwater-vision.md`
    "The story route", step 2), so it gets the easiest of the six. The other five rise by distance from the windmill.
  - **The pool is all thirty now.** If T later cuts a candidate (HP4e), a test fails and the six are re-picked.
  - **The six come from the middle third** of the ranked thirty. The ten easiest and the ten hardest are never picked.
  - **One puzzle per hazard, no route choice:** "There aren't safe vs. risky routes anymore, it's just the one
    puzzle per hazard now."
- What exists (read 2026-10-31 at `4bece75b9`):
  - The thirty "hidden in the devtools" are `HAZARD_PUZZLE_CANDIDATES`
    (`axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.candidates.ts`): HP4c's ten `cand-hard-*` and
    HP5d's twenty `cand-cost-medium-*` / `cand-cost-hard-*`. `/devpuzzle` lists them (HP4d).
  - Each candidate is graded on one `route` (`HazardPuzzleCandidate.route`). Its goal is `goals[route]`.
  - A puzzle is deterministic: authored dice, a fixed DRAW reserve and fixed reroll faces (HP3). The one-round
    session is `hazard-puzzle.session.ts`: `createHazardPuzzleSession`, `playHazardPuzzleMove`,
    `confirmHazardPuzzle`.
  - The solver (`hazard-puzzle.solver.ts`) walks every board exhaustively and reads winning lines and difficulty
    features. Its move generator `candidateMoves` is private. `docs/reports/hazard-puzzle-card-audit.md` prints the
    solver's view of the thirty.
  - No bot plays puzzles today. `World/Hazard/hazard.sim.ts`'s three policies play the old three-round live hazard.
  - The Breakwater's six hazard nodes (`World/MapEvents/content.ts` `BREAKWATER_CHAPTER_KINDS`; locations from
    `World/Continents/Coastal-Village/breakwater-chapter.ts`, [depth, lane]):
    `bw-h4` The wreck [6, 0], `bw-m2` River meadow [3, 2], `bw-p1` Foothills [3, 3], `bw-m4` Manor road [4, 4],
    `bw-t5` Back lanes [7, 3], `bw-d4` Tower switchbacks [12, 1]. `bw-h4` is in `BREAKWATER_CHAPTER_HELD`
    (`holdRoadsUntilSettled`).
  - Today a live hazard node runs the old board. `state/hazard/store-actions.ts` `beginHazardAction` draws
    `HAZARD_LIBRARY[seed % length]` (`:185`), and `app/hazard/index.tsx` runs the three-round board. The puzzle
    board renders on the live hazard board in `/devpuzzle` (B3e2, `components/hazard/puzzle/HazardPuzzleDemo.tsx`).
    The outcome is applied by `claimHazardPuzzleAction` (`state/hazard/puzzle-store-actions.ts`), through
    `claimHazardPuzzleOutcome`.
  - The headless run driver (SM1e, `axiomancer-mobile/sim/run-driver.ts`) resolves hazards with a `hazard.sim.ts`
    policy (`resolveHazard`, `:180`).
- Part plan: `plan/revamp/hazards.md` "The Act 1 rollout and the live board". The W2 candidate "the live hazard
  routing (a random puzzle from the thirty per node) and the cuts" (`plan/PHASE_CANDIDATES.md`). This plot takes the
  Breakwater's six nodes out of that candidate, with a fixed pick instead of a random one. The other five Act 1 nodes
  and the cuts stay with it.
- D-numbers: D37 and D99 (no card or keyword added here), D57 (the curve is a measurement, not a gated baseline),
  D88 (content: maps and hazards, allowed because T is asking), D114 (the Breakwater's six hazards).

### Outcome

The thirty dev-menu puzzles each have a rough difficulty number from two seeded bots, ranked into one curve in a
committed report. The Breakwater's six hazard nodes each play one puzzle from the middle of that curve, rising in
difficulty along the story route, with the ten hardest left for later chapters.

## Design

### Scope (shared)

- `axiomancer-mechanics/src/World/Hazard/puzzle/`: a new `hazard-puzzle.sim.ts` (the bots, the curve, the pick
  rule), `hazard-puzzle.legal-moves.ts` (or the export, if it stays in the solver file), `src/CLI/puzzle-sim.cli.ts`
  and the `puzzle:sim` script.
- The Breakwater table lives beside the chapter's content (`World/MapEvents/` or
  `World/Continents/Coastal-Village/`), exported through `src/index.ts`.
- `axiomancer-mobile`: `state/hazard/` (begin a puzzle at a node that names one), `app/hazard/index.tsx` (render the
  puzzle board for it), the stakes-card presenter, and `sim/run-driver.ts` / `sim/run-fight.ts` neighbours for
  the hazard step.

### Consumers to update

- `axiomancer-mechanics/src/index.ts` and `World/Hazard/puzzle/index.ts` exports.
- The solver, which moves onto the shared legal-move export (no behaviour change: `puzzle:report` and
  `puzzle:audit` output byte-identical).
- `axiomancer-mobile/sim/run-driver.ts` `resolveHazard`.
- `docs/feature-map/features.json`, if the feature-map lint names the hazard route's uses.
- `axiomancer-mobile/docs/E2E_INVENTORY.md` for the new e2e.

### Decisions made upfront — DO NOT ASK

- **Two bots, 1000 plays each** is "a reasonable amount": 60,000 plays, seconds of CPU. The bots differ in kind
  (blind and roughly skilled), so a puzzle that only a skilled line clears and one that anything clears separate.
  The solver's exhaustive numbers sit beside them as a cross-check, not in the score.
- **The score is the mean of the two win rates.** It is a rough curve, as T asked. Calibrating against human solve
  times stays with HP2d-HP2f.
- **The seed is a named constant** in `hazard-puzzle.tuning.ts`, so the report and the table test agree.
- **The middle third, evenly spaced** (T's ruling, the rule in A4). The ten hardest are kept for Chapters 2-4, and
  the ten easiest go unused for now.
- **Story order** (T's ruling): the wreck first because every run must clear it, then the rest by depth from the
  windmill, with ties (River meadow and Foothills, both depth 3) broken by lane.
- **One puzzle per hazard, on its graded route** (T's ruling). The board shows no route select, and the
  candidate's other `goals` entry is unused.
- **The clock** is what `/devpuzzle` shows for the candidate today (`HAZARD_PUZZLE_CLOCK_SECONDS` by band). HP4g
  sets the real clocks later, and this phase changes none of them.
- **The puzzle copy** (title, scenario) is the candidate's `hazardId` copy, as on `/devpuzzle`. The node's place
  name and stakes card come from the map. No new `[content]` is written.
- **All thirty are in the pool** (T's ruling). A later HP4e cut fails A5's test, and the fix is to re-run the rule.

### Tests matrix (shared intent; each phase lists its own)

- The bots: legal moves only, termination, seeded determinism, `noisy-greedy` beating `random` on the three demos.
- The pick rule on synthetic curves: ties, window edges, `n` of 1 and 6, strict ordering.
- The table matches the rule at the pinned seed.
- Mobile: a screen test that a named node opens the puzzle board with no route select, plus an e2e walk into
  `bw-h4` that ends with the held road open.

### Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, and the root `npm test`.

### Commit body template

```
<phase id>: <title>

<what the player or T now sees>. Closes <A-ids>.
Measure: <the phase's Measure line, with the numbers it produced>.
```

### Follow-ups (out of scope)

- The other five Act 1 hazard nodes (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2) and the cuts (three-round
  engine paths, RE-CAST cards, the saved hazard deck, `deadcard`, the save migration) stay with the Nov 3 routing
  plot. That plot can reuse `pickChapterHazardPuzzles` on the ten hardest for those chapters.
- Re-picking after HP4e's keep or cut rulings: a re-run of `puzzle:sim`, not a new phase, unless a cut empties the
  middle third.
- Calibrating the score against T's solve times (HP2d-HP2f).

### Chunk notes (the brief's phase blocks)

#### HP6a (chunk 110.1)

- Scope:
  - export `hazardPuzzleLegalMoves` and move the solver onto it;
  - `hazard-puzzle.sim.ts` with the two bots and `buildHazardPuzzleCurve`;
  - `puzzle-sim.cli.ts`, the `puzzle:sim` script, and the committed `docs/reports/hazard-puzzle-curve.md`.
- Consumers: the solver (byte-identical `puzzle:report` / `puzzle:audit`), the mechanics exports.
- Save/schema: none.
- Tests: the bots (legal, terminating, deterministic, `noisy-greedy` ahead of `random` on the demos), plus a curve
  snapshot of three candidates at 50 plays.
- Verify: `npm run verify -w axiomancer-mechanics`.
- Measure: the report has thirty rows with both win rates and a score, and a second run at the same seed is
  byte-identical.

#### HP6b (chunk 110.2)

- Scope: `pickChapterHazardPuzzles`, `BREAKWATER_HAZARD_PUZZLES`, its export, and the report's six-node section.
- Consumers: the mechanics exports.
- Save/schema: none.
- Tests: the pick rule on synthetic curves, plus the table-matches-rule test.
- Verify: `npm run verify -w axiomancer-mechanics`.
- Measure: the report's six-node table rises strictly in rank in story order, inside ranks 11-20.

#### HP6c (chunk 110.3)

- Scope:
  - `beginHazardAction` (or a sibling) opens a puzzle session when the current node is in
    `BREAKWATER_HAZARD_PUZZLES`;
  - `app/hazard` renders the puzzle board for it with no route select;
  - the stakes card shows the one goal;
  - confirm runs `claimHazardPuzzle` and settles the node;
  - the run driver's hazard step plays the puzzle with `noisy-greedy`.
- Consumers: `sim/run-driver.ts`, `E2E_INVENTORY.md`, the feature map if its lint asks.
- Save/schema: none new. An old in-flight three-round session at one of the six finishes on the old board.
- Tests:
  - a screen test for the named node: board, no route select, confirm, back to the map;
  - an e2e walk into `bw-h4` that ends with the sea-cave road open;
  - a test that a Charcoal Wood hazard still opens the old board;
  - `run-driver.test.ts` covering a Breakwater hazard.
- Verify: `npm run verify -w axiomancer-mobile` and the root `npm test`.
- Measure: the `bw-h4` e2e passes and `npm run sim:run` completes Chapter 1 runs through all six puzzles.

## Contracts

- No new save field. A puzzle in progress is not saved. Leaving the app mid-puzzle leaves the node unsettled, and
  re-entering it starts the same puzzle again (it is deterministic).
- Existing saves load unchanged. A save holding an old three-round `hazard.session` at a Breakwater hazard node
  finishes that session on the old board. The routing applies from the next entry.

## Acceptance

- **A1** `npm run puzzle:sim -w axiomancer-mechanics` plays every `HAZARD_PUZZLE_CANDIDATES` entry on its graded
  route, 1000 plays per bot by default (`--plays N`), through the session's move functions only. The same seed gives
  the same numbers.
- **A2** Two bots, both making only legal moves and always ending in a confirm within a move cap:
  - `random`: each step picks uniformly among the legal moves and confirm.
  - `noisy-greedy`: each step picks the move that leaves the smallest shortfall to the goal, confirms when no move
    shrinks it, and plays a uniform random legal move instead 15% of the time.
  - A legal move comes from a new exported `hazardPuzzleLegalMoves(session)`, which the solver's walk also uses.
- **A3** `docs/reports/hazard-puzzle-curve.md` is written by the CLI and never edited by hand. One row per
  candidate, sorted easiest to hardest, with:
  - its rank, id, label and `intendedBand`, and the route goal;
  - `random` win %, `noisy-greedy` win % and the score (their mean);
  - beside them, the solver's winning lines and first-play win share;
  - a text bar of the score, so the curve reads at a glance.
- **A4** A pure `pickChapterHazardPuzzles(curve, nodesInOrder)` works as follows:
  - It ranks by score, highest first (easiest). Ties go to more solver winning lines, then to id.
  - It takes the middle third: ranks 11-20 of 30, or in general the ranks after the easiest third and before the
    hardest third.
  - It picks `n` evenly spaced ranks from that window, `round(lo + i * (hi - lo) / (n - 1))`. For six that is ranks
    11, 13, 15, 16, 18 and 20.
  - It assigns them in node order, so each node's puzzle ranks strictly harder than the one before.
  - It never returns a rank from the easiest or hardest third.
- **A5** `BREAKWATER_HAZARD_PUZZLES` (mechanics, node id to candidate id) holds the rule's output at the report's
  seed and plays. The node order is `bw-h4`, `bw-m2`, `bw-p1`, `bw-m4`, `bw-t5`, `bw-d4`: the wreck first, then by
  depth from the windmill, ties by lane. A test re-runs the sim and the rule and fails if the table drifts or names a
  missing candidate. The report ends with the six (node, place, candidate, rank, score).
- **A6** In a run, entering one of the six nodes opens the puzzle board with that node's candidate on its one goal.
  There is no route choice, and the stakes card (ET1b) shows the one goal.
- **A7** Confirming applies the outcome through `claimHazardPuzzle` (XP, the consumable roll, VITAE loss on a
  shortfall) and settles the node, so the wreck's held road opens as it does today. The player returns to the map.
- **A8** These stay unchanged:
  - Every other Act 1 hazard node (Charcoal Wood, Beacon Crags, Lantern Deep) runs as today.
  - `/devpuzzle` is unchanged.
  - `npm run sim:run` plays the six with the `noisy-greedy` bot instead of a `hazard.sim.ts` policy.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 8 open · 0 closed · next A9

- [ ] **110.1** The bots and the curve · M · closes A1, A2, A3 · needs — · alias: HP6a
- [ ] **110.2** The Breakwater six · S · closes A4, A5 · needs 110.1 · alias: HP6b
- [ ] **110.3** The six play their puzzle · L · closes A6, A7, A8 · needs 110.2 · alias: HP6c
