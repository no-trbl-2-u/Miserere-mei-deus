# Phase AN4 — The Doorwarden becomes the Death Beholder

## Sources

- `axiomancer-mechanics/src/Enemy/enemy.library.ts` — `TheDoorwarden`:
  `id: 'enemy-the-doorwarden'`, `portraitAsset: 'the-doorwarden'`, **level 8,
  `difficulty: 'boss'`, `logic: 'boss'`**, `mapName: 'lantern-deep'`. This is the Act 1
  boss, not an ordinary elite.
- `axiomancer-mobile/assets/images/enemies/the-doorwarden.webp` — **1434 bytes**, a single
  colour (pure white), no shading: the dark areas are alpha holes, not paint. A placeholder
  standing in for the act's climax.
- `Potential Assets/torio/2022_added_monsters_ver3/.../Death Beholder A.png` — 2000x2000,
  catalogued as slug `death-beholder`, "An undead Beholder. It has no eyeballs, but its
  gaze is, if anything, more potent." Licence: **torio Javardry free material, free for any
  use including commercial, modification and redistribution; no attribution required**.
- `plan/steps/01_build_plan.md` Phase UP1h — "against the Act 1 boss, half-upgraded Blood
  Price wins above 50% and the plain deck at or below 25%". That row measures *this* fight.
- `phase_AN3_the_green_jelly.md` — the same shape, one tier down. AN4 follows its pattern
  deliberately rather than inventing a second one.

## Outcome

The Act 1 boss stops being a 1.4 KB white rectangle. T chose the art in an attended session
(2026-10-22) after seeing it rigged, having already ruled the Doorwarden is not to be
animated as it stands.

Measure: the boss fight resolves identically under the new id; the beholder animates in a
live encounter; `npm run verify -w axiomancer-mobile` and root `npm test` green.

## Acceptance

- **A1 (a boss fight is not re-tuned by an art change)** Level 8, the stat budget,
  `difficulty: 'boss'`, `logic: 'boss'`, `mapName: 'lantern-deep'`, the loot table and every
  other number are carried over unchanged, proven by the diff. **UP1h measures this exact
  fight**, so a balance drift here silently invalidates a planned measurement rather than
  failing loudly.
- **A2 (the id moves everywhere at once)** `enemy-the-doorwarden` and the art key
  `the-doorwarden` become the new id and key wherever they appear — the library, any deck or
  stage profile, the mobile mock, every engine test, the map content that pins the door
  fight, and the docs. A repo-wide search for the old strings returns nothing outside
  provenance and plan history.
- **A3 (the boss is pinned per node, so the pin must move too)** `EnemyLibrary`'s own comment
  records that the Doorwarden is "the door fight", pinned in `MapEvents/content.ts` rather
  than drawn from a wandering pool. The pin is found and moved with the id; a test asserts
  the `lantern-deep` boss node still resolves to a boss.
- **A4 (saves are considered, not assumed)** Whether a persisted save can carry an enemy id —
  including a mid-run save standing in the boss room — is established by reading the save
  schema and recorded. A boss id in a save is a worse failure than a wandering enemy's.
- **A5 (the prose is the creature's own)** `name` and `description` are rewritten. "The
  Doorwarden" is a name about a door; the replacement is an undead eye. The catalog's own
  line — it has no eyeballs but its gaze is, if anything, more potent — is the seed, not the
  text. Drafted in the repo's voice for T to accept or replace at review.
- **A6 (the art lands with its provenance)** The source is ingested through the full
  `RECIPE` (a new source, never graded, so not `--no-grade`), and its provenance records the
  torio Javardry grant, the artist, the pack and the catalog slug. `Potential Assets/` stays
  a store; nothing resolves a path into it (D96, rule 9).
- **A7 (it animates, and the attack reads)** An 8x3 / 24-cell set, split, registered, with an
  encounter test proving the player mounts and advances. The attack clip is a **scale**
  change, not a shape change: it shrinks and dims, then swells hard at the camera. T rejected
  an earlier candidate because its motion was "very subtle" at combat size; a silhouette that
  changes by roughly 40% between two frames is the fix, and the phase should not quietly
  soften it.
- **A8 (anchor kind, and the ceiling)** The manifest declares its anchor kind with its reason
  — the beholder floats, so `centre`, as the float-eye does. Every cell is under
  `FRAME_CELL_MAX_BYTES` and the per-set cost is recorded.

Measure: the A1 numeric diff; a clean repo-wide search; the A3 boss-node test; the A7
encounter test; verify and root test green.

## Scope

- `axiomancer-mechanics/src/Enemy/enemy.library.ts`, `World/MapEvents/content.ts` and the
  tests and docs naming the old id.
- `axiomancer-mobile/assets/images/enemies/` — the new portrait, the cells, the registry.
- `art-department/` — the beholder rig.
- Not touched: the frame engine, the combat pane, the clip selection, any balance number, any
  other enemy, UP1h's thresholds.

## Save / schema contracts

Open by A4; read the schema and record the finding before deciding.

## Decisions made upfront — DO NOT ASK

- **T chose the art, attended, 2026-10-22**, after being shown it rigged. That is the owner
  approval D37/D88 requires; the loop installs a choice T made.
- **Replace the boss, do not add a fourth enemy.** T's framing throughout has been
  replacement. A fourth enemy would change encounter pacing and Act 1's ledger; a reskin does
  not.
- **The Doorwarden's art was never finished.** 1434 bytes, one colour, alpha holes for the
  eyes and letterbox. T, shown it at 2x: it is a placeholder. This phase is not discarding
  authored art.
- **`centre`, not `foot-line`** (A8). The beholder is a floating sphere, the float-eye case,
  unlike AN3's jelly which sits and squashes about its base.
- **Scale, not deformation** (A7). The jellyfish candidate was rejected for subtlety: a
  per-row tendril wave reads at full size and vanishes at combat scale. Scale survives
  downsampling, which is why this candidate was chosen over it.

## Tests matrix

- `axiomancer-mechanics` — the roster and boss-node suites on the new id; the carried-over
  numbers unchanged; the `lantern-deep` pin still resolving to a boss.
- `axiomancer-mobile` — the A7 encounter test; the registry enumeration; the cell ceiling.

## Verify gate

`npm run verify -w axiomancer-mobile` and root `npm test`.

## Commit body template

```
enemies: the Act 1 boss is no longer a placeholder

The Doorwarden shipped as 1434 bytes of flat white with alpha holes for
its eyes - a stand-in that became the act's climax by default. It is now
an undead beholder from torio's Javardry free material, free for any use
including commercial and modification. Level 8, boss difficulty and
logic, the map, the pin and the loot are carried over untouched: UP1h
measures this fight, and an art change must not move what it measures.
```

## DoD

A1–A8 ticked.

## Phases

### AN4a — The Beholder takes the Doorwarden's place (Size: M)

Closes A1, A2, A3, A4, A5, A6. Requires nothing. Attended: no.

The identity move, the pin, and the portrait, with the boss fight carried over whole.

Measure: the numeric diff clean; the repo-wide search clean; the boss node still a boss; the
save answer recorded; verify and root test green.

### AN4b — The Beholder animates (Size: M)

Closes A7, A8. Requires AN4a. Attended: no.

The rig, the split, the registry entry and the encounter test, on a `centre` anchor.

Measure: the encounter test shows the player mounting and advancing; the attack clip's scale
range is pinned by a test so it cannot be softened later; every cell under the ceiling.

## Follow-ups (not in this phase)

- **Act 1 would then be fully animated** — float-eye (shipped), jelly (AN3), beholder (AN4).
  No enemy would still render a single static image, which makes the static fallback path
  untested by any live enemy. Worth a fixture if the fallback is to stay trustworthy.
- **The float-eye's provenance correction** — see `phase_AN3_the_green_jelly.md`.
