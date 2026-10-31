# Phase AN5 — Every enemy with a portrait animates

## Sources

- **The masters, committed with this plot**, under `art-department/masters/enemies/`: fourteen
  image-model sheets T generated on 2026-10-30 from the shipped stand-in portraits, one per enemy
  that has a portrait and no frame set: `brine-widow`, `cave-choir`, `crane-hook`, `curfew-ringer`,
  `gallows-crow`, `lamplighter`, `lamprey-knot`, `net-mender`, `smokehouse-gutter`, `tide-gate`,
  `tithe-collector`, `toll-keeper`, `wreck-picker`, `wrecker`. Each is `<key>.sheet.webp` (WebP q95
  with exact alpha, re-encoded from T's PNG, the CA3 convention) beside `<key>.prompt.txt`, the exact
  prompt that drew it (Gallows Crow, generated earlier and approved, has none). The generator's own
  layout check is `ai-sheets.layout-report.json`; it still lists the float-eye, death-beholder and
  green-jelly sheets, which were deleted as duplicates of the installed sets and are not here.
- Requested layout: 2048 x 768, 8 columns x 3 rows of 256px cells, rows `idle`, `struck`,
  `attacking` — exactly the grid and the clip names the three installed sets use and
  `REQUIRED_CLIPS` demands. Thirteen sheets are exactly 2048 x 768; **`tithe-collector` is 2043 x 770**.
- **Measured at plot time** (alpha >= 160, the generator's own threshold): no sheet has paint on its
  outer border, but paint CROSSES an inner gridline on 13 of the 14 sheets — 1 to 6 of the 9 lines,
  up to 106 px of one line (`toll-keeper`); only `tide-gate` is clean. A straight 256px cut would
  therefore put a sliver of each neighbour's pose into a cell and clip that pose's own extremity.
  The generator also did not register the figure: nothing guarantees the body sits at the same
  place in every cell.
- `axiomancer-mobile/assets/images/enemies/frames.ts` — `ENEMY_FRAME_SETS`, `validateFrameSet`,
  `FRAME_CELL_MAX_BYTES = 12000`, the two anchor kinds; three sets installed (float-eye AN1e,
  death-beholder AN4b, green-jelly AN3b).
- `axiomancer-mobile/assets/images/enemies/index.ts` — `ENEMY_ART_BY_KEY`, the fourteen stand-ins
  (EN1f, EN1g, EN1h, EN1j, EN1l) commented "static, no frame set".
- `art-department/tools/split-spritesheet.py` — cuts a master into lossless row-major cells from
  its `<key>.sheet.json` sidecar; refuses a sheet whose size is not `columns x frame` by
  `rows x frame`. `axiomancer-mobile/scripts/ingest-art.mjs` encodes them (`--no-grade`).
- The install shape: `anim/<key>/index.ts` (literal `require()`s, Metro resolves statically) and
  `anim/<key>/provenance.json`, one registry entry, one `CombatCombatantPane.<key>.test.tsx`
  (`CombatCombatantPane.green-jelly.test.tsx` is the model); `scripts/frame-cells.test.mjs` weighs
  every cell; `scripts/art-department-sealed.test.mjs` forbids app code naming the masters tree.
- `plan/phases/phase_AN1_enemy_animation.md` (A6 anchors, A6b grade once, A11 cost),
  `phase_AN3_the_green_jelly.md`, `phase_AN4_the_death_beholder.md` (176px fallback).
- D98 (masters sealed in `art-department/`), D115 (all art open source), D116 (Chapter 1's enemies).

## Outcome

Every enemy that has a portrait animates in combat: it idles, flinches when struck and swings on
its turn. Today three do; after AN5 all seventeen do. The fourteen sets are cut from T's sheets
after a cleanup pass that removes neighbour slivers and holds the body still, so nothing flickers
in from the next frame and nothing bobs that should not.

Measure: `ENEMY_FRAME_SETS` has a valid entry for every key in `ENEMY_ART_BY_KEY` (17 of 17), each
with a passing encounter test, every cell under `FRAME_CELL_MAX_BYTES`; `npm run verify -w
axiomancer-mobile` and `npm test` green.

## Acceptance

- **A1 (the cleanup tool)** `art-department/tools/clean-ai-sheet.py --sheet <master> --out <dir>`
  turns one image-model master into a splitter-ready lossless sheet plus its `<key>.sheet.json`
  sidecar. In order: (a) a sheet off the 2048 x 768 canvas is resampled (Lanczos) to it, and only
  when each axis is within 1% (see Decisions); further off it refuses, naming the size; (b) in each
  cell, every alpha component (8-connected, alpha >= 1 after the generator's threshold mask) whose
  area centroid lies OUTSIDE the cell is a neighbour's sliver and is removed, and the cell's own
  figure is reassembled from the parts of it that crossed into neighbouring cells, so a pose that
  reached over a gridline is whole again rather than clipped; (c) every cell is re-centred about the
  set's anchor (A2) by an integer translation, never a scale; (d) a figure that, after (c), would
  still not fit its 256px cell is scaled down as one sheet-wide factor applied to all 24 cells
  alike, recorded in the sidecar, never per cell (a per-cell scale makes the body pulse). It writes
  a report per sheet: slivers removed, pixels reassembled, translation per cell, any global scale.
  A pytest suite covers each step on synthetic sheets: a sliver is dropped, a crossing limb is
  restored to its own cell, a resample refuses outside 1%, the translation is integer, a global
  scale is uniform.
- **A2 (the anchor is measured, not chosen)** The tool picks the anchor kind from the idle row: the
  lowest opaque row of each idle cell is measured, and if it moves by no more than 6% of the cell
  across the row the enemy STANDS (`foot-line`, anchored at the median foot line and the body's
  horizontal centre); otherwise it FLOATS (`centre`, anchored at the median bounding-box centre).
  The sidecar records the kind, the point and the measured spread in its `why`, the same three
  fields the installed sets carry. The thresholds come from AN1's A6 measurement (a standing
  figure's foot line held to 5.2% of the cell), not from taste.
- **A3 (each set is installed the AN1e way)** For each of the fourteen keys: the cleaned sheet is
  split by `split-spritesheet.py`, ingested by `ingest-art.mjs --no-grade` into
  `assets/images/enemies/anim/<key>/` (24 cells), given an `index.ts` of literal `require()`s and a
  `provenance.json` naming the master, its prompt, the cleanup report, the tool chain, the licence
  (D115) and the measured bytes; registered in `ENEMY_FRAME_SETS` with the sidecar's grid, anchor
  and the clip table the installed sets use (idle 8f loop rest 0, struck 8f one-shot rest 7,
  attacking 8f one-shot rest 0; fps 10 / 16 / 12); and `validateFrameSet` returns no problems. The
  "static, no frame set" comments in `index.ts` and the "every OTHER enemy is still absent" passage
  in `frames.ts` are rewritten to match.
- **A4 (grade once)** `--no-grade` for all fourteen: the stand-ins they were drawn from were
  ingested in colour (measured at plot time: the sheets carry the same saturation as their
  portraits, e.g. lamplighter 212 vs 203, gallows-crow 4 vs 0), so grading the cells would grey
  thirteen colour enemies against their own portraits. `graded: false` on every manifest.
- **A5 (it plays in a fight)** One encounter test per key, the `CombatCombatantPane.green-jelly`
  shape: the pane mounts the frame player for the key, it advances through idle, and `struck` and
  `attacking` each play and hand back to idle.
- **A6 (within the ceiling)** Every shipped cell is under `FRAME_CELL_MAX_BYTES` (12000 B), enforced
  by `frame-cells.test.mjs` as today. A set that overshoots at 256px is cut at 176px instead (the
  death-beholder's answer: the cleaned sheet downscaled as a whole to 1408 x 528 before the split,
  the manifest's `frame` saying 176). The ceiling is never raised. Each set's provenance records its
  cell count, total, mean and max bytes; the last phase records the bundle total for all seventeen.
- **A7 (a swapped portrait drops its animation)** Confirmed by T (2026-10-30): animate now; when T
  swaps a stand-in for a new portrait (the Nov 8 deadline), that enemy goes back to static until a
  sheet is drawn from the new portrait. Mechanised, not remembered: each set's `provenance.json`
  records the SHA-256 of the static portrait it was drawn from, and a root test fails when a key in
  `ENEMY_FRAME_SETS` has a static portrait whose bytes no longer match, naming the key and saying
  "remove its frame set or regenerate it". The three installed sets get the same field, so the rule
  covers all seventeen.
- **A8 (the dev gallery shows all of them)** The existing frame dev route (`app/devframes/`) lists
  every registered set, so T can watch all seventeen cycle their three clips outside a fight. If it
  already enumerates `ENEMY_FRAME_SETS`, this is a check, not a change.

## Decisions made upfront — DO NOT ASK

- **The tithe-collector sheet is resampled.** Confirmed by T (2026-10-30): resample the 2043 x 770
  master to 2048 x 768 before cutting (under 0.3% each way, invisible at combat size). A1's 1%
  bound exists so a badly wrong sheet still refuses rather than being stretched.
- **Animate the stand-ins now.** Confirmed by T (2026-10-30), with A7 as the guard: a swap retires
  the set rather than the swap waiting on the animation.
- **The masters are not rewritten by hand.** Every fix the README in T's drop calls "cleanup" is
  done by A1's tool, deterministically and reported, so a regenerated sheet re-runs the same chain.
  No painting over, no per-frame manual nudges.
- **The clip table is the installed sets'**, not re-tuned per enemy. fps and rest frames match
  green-jelly's; tuning a single enemy's timing after seeing it is a follow-up, not this phase.
- **WebP q95 masters, not PNG**, the CA3 convention (8.9 MB for fourteen, against 35 MB of
  PNG); the cleanup tool reads either.
- **Requires is a chain** (b on a, c on b, d on c), not a fan, because every phase edits
  `frames.ts` and `index.ts` and a fan would ship four conflicting PRs.

## Phases

### AN5a — The cleanup tool, and the Gallows Crow animates (Size: M)

Closes A1, A2, A7. Requires nothing. Attended: no.

- **Scope:** `art-department/tools/clean-ai-sheet.py` and its pytest suite (A1, A2); install
  `gallows-crow` end to end through A3's chain (the approved sheet, and the one T saw first), its
  encounter test and its cell weights; the portrait-hash field on the four installed sets'
  provenance and the root test (A7).
- **Consumers:** the combat pane (the crow animates in its fights); every later AN5 phase runs this
  tool.
- **Save/schema:** none; a frame set is presentation.
- **Tests:** the tool's pytest suite; `CombatCombatantPane.gallows-crow.test.tsx`; the A7 portrait
  test (passes on all four sets; a fixture with a changed portrait fails it); `frame-cells.test.mjs`
  and `asset-provenance` unchanged and green.
- **Verify gate:** `npm run verify -w axiomancer-mobile`, `npm test`, the tool's pytest.
- Measure: the crow's 24 cells ship under the ceiling and its encounter test plays all three clips;
  the A7 test goes red on a changed portrait.

### AN5b — The first five normals animate (Size: M)

Closes nothing on its own beyond its share of A3–A6 for these keys. Requires AN5a. Attended: no.

- **Scope:** `net-mender`, `crane-hook`, `brine-widow`, `lamprey-knot`, `curfew-ringer` (EN1f and
  EN1g's normals) through A1's tool and A3's chain; a test and provenance each.
- **Tests:** five encounter tests; cell weights; A7 test covers the new keys.
- **Verify gate:** as AN5a.
- Measure: eight of seventeen keys animate; every new cell under the ceiling.

### AN5c — The cliff, hamlet and cave normals animate (Size: M)

Closes A4. Requires AN5b. Attended: no.

- **Scope:** `wreck-picker`, `smokehouse-gutter`, `tithe-collector` (EN1h), the last including the
  resample (Decisions); the A4 grade audit across every AN5 set shipped so far (each manifest
  `graded: false`, each ingest run `--no-grade`, recorded in provenance).
- **Tests:** three encounter tests; the tool's report for `tithe-collector` shows the resample.
- **Verify gate:** as AN5a.
- Measure: eleven of seventeen keys animate, the tithe-collector among them.

### AN5d — The five elites animate, and every portrait has a set (Size: M)

Closes A3, A5, A6, A8. Requires AN5c. Attended: no.

- **Scope:** `cave-choir`, `lamplighter`, `wrecker`, `toll-keeper`, `tide-gate` (EN1j–EN1l) through
  the chain; a root test that every key of `ENEMY_ART_BY_KEY` has a valid `ENEMY_FRAME_SETS` entry
  (the Measure as a test, so a new portrait without a set is a visible red, not a quiet static
  enemy — it names the key and says a portrait needs a set or an explicit exemption); the A8 dev
  route check; the bundle total for all seventeen sets recorded in `frames.ts`'s BUNDLE COST
  passage; the `frames.ts` and `index.ts` comments rewritten (A3).
- **Tests:** five encounter tests; the every-portrait-has-a-set test; cell weights.
- **Verify gate:** as AN5a.
- Measure: 17 of 17 keys animate; the every-portrait test is green and goes red on a fixture
  portrait with no set.

Acceptance closure: A1, A2, A7 by AN5a; A4 by AN5c; A3, A5, A6, A8 by AN5d (AN5a–c each install
their keys under A3, A5 and A6, and AN5d closes them when the seventeenth set lands).

## Definition of done

Every key with a portrait has a validated frame set that plays its three clips in a live encounter;
the fourteen new sets are cut by a reproducible tool from committed masters; no cell exceeds the
ceiling; a swapped portrait is caught by a test; verify and the root suite green.

## Follow-ups (not in this phase)

- **Per-enemy timing.** Once T watches them on device, an enemy whose swing reads slow or whose
  flinch is too long gets its fps or rest frame tuned. Not plotted; file with `/jot` on sight.
- **New portraits after the Nov 8 swap.** A swapped enemy loses its set (A7); drawing a sheet from
  its new portrait and installing it is a new `/plot` per swap batch.
- **A fourth clip** (self-targeting) stays the open question in
  `phase_AN2_the_animation_is_seen.md`.
