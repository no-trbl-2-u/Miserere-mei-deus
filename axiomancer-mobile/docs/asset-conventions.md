# Asset conventions — naming, ingest, provenance

> The previously-tacit rules of the art pipeline, written down
> (2026-08-22, from the content-pipelines audit). Sources: the registry
> file headers under `assets/images/*/index.ts`, the `provenance.json`
> records (esp. `maps/` — the Doré plate acquisition), `SVG_ASSET_SPEC.md`,
> and the former `specs/11-asset-pipeline.md` (archived 2026-09-25 at
> `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/`). The registry
> headers, provenance records and `SVG_ASSET_SPEC.md` stay authoritative for
> their own surfaces; this doc is the one-page checklist.

## The ingest contract (raster art)

1. **File**: WebP preferred (JPEG acceptable for full-bleed photos),
   longest edge <= 640px (card/enemy art historically <= 512px),
   dark-mode-first grading. Enemy portraits are ALPHA-MATTED cutouts.
2. **Location**: `assets/images/<category>/<kebab-case-name>.webp` —
   categories today: `cards/`, `enemies/`, `portraits/`, `labyrinth/`,
   `treasure/`, `maps/`, `combat/`.
3. **Registry**: add a static `require()` literal to that directory's
   `index.ts` map (Metro needs static literals — no dynamic paths).
   Art keys are kebab-case; enemies key by `portraitAsset`
   (declared in `axiomancer-mechanics/src/Enemy/types.ts`), cards key by card id in
   `assets/images/cards/index.ts` (the ONE place a card id meets a
   file path — the mechanics package stays art-free).
4. **Provenance**: append an entry to the directory's
   `provenance.json` in the same commit — source (URL for
   acquisitions), license, generator/tool, post-process recipe, date.
   The Doré plate entry (`maps/provenance.json`) is the model record:
   Wikimedia Commons source URL, PD status, and the exact grade
   (grayscale, brightness 0.62 / contrast 1.08, WebP q44).
   **No provenance entry, no asset.**
5. **Render**: consume through `lib/platform/image.ts` (the expo-image
   seam), never a direct `expo-image` import.

## Acquisition (the proven no-generation path)

Public-domain woodcuts/engravings (Wikimedia Commons and kin) fit the
Mörk Borg tonal north star and need no generation capability:
download → grade → WebP → registry + provenance. Licensing bar:
PD or CC0 preferred; CC BY acceptable with attribution carried in the
provenance entry. The `Potential Assets/icons-TBR` SVG trove
(game-icons.net, CC BY 3.0/CC0 — see its `license.txt`) is ingested
only via `scripts/extract-game-icons.mjs` (hand-edited MANIFEST →
regenerates `components/icons/game-icon-paths.ts` with per-entry
attribution).

**`Potential Assets/MCP-Axiomancer/images/` (116 card paintings) —
open-source art found online** (owner's answer, 2026-08-22). The art
licence question is closed (T, 2026-10-29, D115): "The images we use
for everything are open source." An image from this folder may be wired
with `"license": "open source (T, 2026-10-29, D115)"` and a note
saying where it came from. A file from any other third-party source
still records its own licence.

## Generated art (Option A, ruled 2026-08-22)

The art route is hosted **gpt-image-2 behind a swappable adapter**,
upgradeable to a local FLUX+LoRA setup later
(`plan/ideas/AI_ART_PIPELINE_OPTIONS.md` §9; build-plan Phase 73).
A generated asset follows the same ingest contract above, with two
additions to its `provenance.json` entry: the **model** and the
**exact prompt**. That record is the Steam AI-disclosure artifact —
raw AI output is not copyrightable, so the provenance file is what
evidences human curation. The API key lives in `.env` (gitignored)
and is never committed.

## Running the ingest (phase 71)

```bash
npm run assets:ingest --workspace axiomancer-mobile -- \
  --in <file-or-dir> --category <dir-under-assets/images> \
  --source <url> --license <terms> [--dry-run] [--no-grade]
```

`scripts/ingest-art.mjs` encodes the recipe above: grade -> resize to
the 640px cap -> WebP -> **provenance entry in the same run**, because
a script that emitted the image and left the record to a human would
just reproduce gap §4 exists to close. `--no-grade` skips the
grayscale/brightness/contrast pass — the grade is for raw acquisitions
(the Dore plate), not for art that already carries its own styling.

`scripts/shrink-art.mjs` is the recipe's other half — the same two size
steps (resize to the cap -> WebP q44, NO grade) applied in place to art
that landed before the recipe existed, with a dated note appended to the
covering provenance entry in the same run. It never converts `.jpg`/`.png`
(registries `require()` them by name) and never grows a file. `maps/` is
excluded by convention (below) and by `plate-crop.test.ts`, which binds
each plate's note to its pixel size.

```bash
node scripts/shrink-art.mjs --dirs enemies,labyrinth/walls --dry-run
```

`npm run assets:check --workspace axiomancer-mobile` is the gate: every
art directory has a provenance record, every record carries date / tool
/ license / covers, every `require()` resolves, and every file is
reachable from a registry. It runs inside the mobile verify gate.

## Enemy frame sets (the animated art contract)

An enemy may carry one asset or several. The old "1:1 art law" is
retired: the bindings in `assets/images/enemies/index.ts` are preserved,
but a key is now allowed a static painting **and** an animated FRAME
SET beside it. `assets/images/enemies/frames.ts` holds the registry,
the manifest type and `validateFrameSet`. It shipped EMPTY in phase
AN1a, the float-eye went into it in AN1e, the death-beholder (the
Act 1 boss) in AN4b and the green jelly (the Act 1 elite) in AN3b, which
framed the last enemy on the roster. A key absent from it renders exactly
the single image it would have before. Absence from the frame registry is
the static path, not a gap.

**What ships is cells, never the sheet.** A frame set is per-cell WebP,
one file per frame, under
`assets/images/enemies/anim/<portraitAsset>/`. The grid master is a
build input and lives in the repo-root art-department tree; nothing
under `axiomancer-mobile/` may resolve a path into that tree, so the
splitter runs there and emits here. Two commands, in order — the
splitter does the geometry, the ingest does the recipe and writes the
provenance in the same run:

```bash
python art-department/tools/split-spritesheet.py \
  --sheet art-department/masters/enemies/<key>.sheet.png --out <staging-dir>

# from axiomancer-mobile/
node scripts/ingest-art.mjs --in <staging-dir> \
  --category enemies/anim/<key> --no-grade --license "<the licence of this file>"
```

The cells come out `<key>-NN.webp`, zero-padded and row-major, and the
`require()` literals go in `assets/images/enemies/anim/<key>/index.ts`
in that same order — it is `row * columns + frame`, the index
`sheetIndexFor` computes. Getting it wrong does not crash anything; it
makes the enemy flinch on the beat it meant to swing.

**The manifest.** Mirrors the master's sidecar JSON:

```jsonc
{
  "frame": 256,              // edge of one square cell, source pixels
  "columns": 8, "rows": 3,   // the grid the cells came from
  "anchor": { "kind": "centre", "x": 128, "y": 128, "why": "it hovers" },
  "graded": true,            // see "grade once" below
  "clips": {
    "idle":      { "row": 0, "frames": 8, "fps": 12, "loop": true,  "rest": 0 },
    "struck":    { "row": 1, "frames": 8, "fps": 16, "loop": false, "rest": 7 },
    "attacking": { "row": 2, "frames": 8, "fps": 14, "loop": false, "rest": 0 }
  }
}
```

`rest` is the index WITHIN ITS CLIP of the frame to hold when nothing
is playing — the frame reduced motion and the seeded e2e harness show.

**All three clips, every time.** `idle`, `struck` and `attacking` are
required names, and a manifest missing one FAILS validation by that
name. So does one whose loop flags disagree with the state: `idle`
loops, `struck` and `attacking` are one-shots. A set that cannot show
being hit is worse than an enemy that never animates, because the gap
only appears in the one resolution it was needed; and a `struck` clip
marked `loop: true` would leave an enemy flinching for the rest of the
fight without failing anything else. The vocabulary is not a choice:
the float-eye master's sidecar already names its rows this way.

**The anchor is a KIND, not a rule.** There is no single right anchor,
and a universal one would have broken on the first enemy it met:

| Kind | For | Evidence |
|---|---|---|
| `foot-line` (default) | a creature that STANDS | On the reference sheet the foot line held to 23px of a 443px cell (5.2%) while the bounding-box centre wandered 49.5px (11.2%) as the weapon swung. A bbox anchor makes that creature bob. |
| `centre` | a creature that FLOATS | No foot line exists, and the hover IS the idle clip — an anchor tracking the body would cancel the motion the clip is for. The float-eye's own sidecar declares it. |

A manifest naming neither kind FAILS validation, exactly as a cell count
that disagrees with the grid does, or a `rest` index past the end of its
clip. A frame set that fails is not rendered at all: a partial loop is a
failure, not a shrug.

**Grade once, never twice.** The ingest `RECIPE` carries
`grayscale: true` alongside the size and quality terms. Run on a colour
enemy it flattens the read — on the float-eye it takes the corona from
RGB (62, 61, 16) to a flat grey 56, and the corona flare is the whole
read of the attack frame. A sheet DERIVED from an already-ingested
painting arrives with its source's grade baked in, so it ingests with
`--no-grade`; only newly generated cells, which have never been graded,
take the full recipe. The manifest's `graded` field records which
happened, so the next reader does not have to guess. An animated enemy
must not look graded differently from the static one beside it.

**Bundle cost, measured on the cells that shipped.** The float-eye's
8x3 sheet split and ingested at the recipe's q44: 24 cells, 156452 B
(152.8 KB) total, mean 6519 B per frame, max 9352 B
(`float-eye-20.webp`, the attack flare), min 3786 B — against 23624 B
for the static `float-eye.webp`. That is 6.6x, +132.8 KB, for one
enemy. (The AN1 brief's estimate was 149.5 KB / mean 6378 / max 9020,
measured with a different encoder build; the figures here are the files
in the tree.) The death-beholder (AN4b) is a far busier painting: at
256px its cells reach 21490 B, so it is cut at 176px instead — 24 cells,
197658 B, max 11068 B, against 56286 B static (3.5x). The green jelly
(AN3b) is back at 256px: 24 cells, 179610 B, mean 7484 B, max 7920 B,
against 12572 B static (14.3x, but its static portrait is unusually
small). It is also the first set on a `foot-line` anchor: the rig poses
every frame about a pivot on its base, so the pane pins its cells to the
bottom of the box. When a set
overshoots, the cell edge is the dial; the ceiling is not.
`FRAME_CELL_MAX_BYTES` in `frames.ts` is the ceiling, and
`scripts/frame-cells.test.mjs` weighs every shipped cell against it on
each `assets:check` — a ceiling nothing weighs is a wish. That test
also checks the provenance record's stated cost against the bytes on
disk, because a record that drifts from its files is worse than none:
it is believed.

**Provenance.** A set is several files under ONE record, and that
record lives in `anim/<key>/provenance.json` — beside the cells, which
is where the directory sweep looks. `covers` names the directory's
cells (a prose blanket such as "every cell in anim/float-eye/" is also
accepted), and the record carries the master it was split from, the
splitter, the measured cost, and whether the cells were graded on the
way in. Two fields say the two things that get confused: `graded` is
whether the pixels carry a grade at all, `graded_in_this_run` is
whether this ingest applied one. A derived set is `true` / `false`.

**Reachability, since a registry is no longer one file.** The orphan
sweep in `asset-provenance.test.mjs` used to read only
`<category>/index.ts`. A frame set's `require()` literals live two
modules down — `enemies/index.ts` to `frames.ts` to
`anim/<key>/index.ts` — so the sweep now walks the local modules a
category's `index.ts` imports or re-exports, transitively, without
leaving the category. That is the reachability Metro performs, which is
what "a registry reaches it" always meant. A cell nothing imports is
still dead weight and still fails.

**Seeing it work.** `/devframes` is the dev-only harness: it plays a
supplied set at its manifest fps, names the clip and cell on screen, and
offers pause-and-step plus a reduced-motion toggle. It plays a synthetic
inline fixture rather than an installed enemy, so it keeps working
whatever the registry holds. For the installed article, fight the
Float-Eye: it is the breakwater's level-1 foe and it hovers, flinches
and lunges in the combat pane itself.

**When each clip plays in combat.** `CombatCombatantPane` reads TWO
beats off the single walk of `fx.events` it already does per
resolution, and `useEnemyClipSelection` turns them into one clip name:

| State | Beat | Timing |
|---|---|---|
| `idle` | none — it is where the enemy sits | A loop, so a resting foe is alive rather than paused. |
| `struck` | `damage-dealt` or `dot-tick` the ENEMY took | Immediately: the blow has already landed, and a delayed flinch reads as a second hit. |
| `attacking` | `threat-fired`, or `damage-dealt` the player took | At the pane's existing 100ms impact offset, so it lands with the recoil, the shake and the flash rather than ahead of them. |

A fired threat counts as the enemy's beat even when the hit was denied,
because the swing happened. A resolution in which the enemy neither
struck nor was struck — a buff, a status application, a heal — selects
nothing, so the enemy keeps breathing and never mimes a swing it did
not make.

The two beats are separate counters rather than one verdict, because a
single resolution can be both: the player's blow lands and the enemy's
threat fires. When it is, the flinch plays at once and the swing takes
over at its own offset; whoever started last owns the return to `idle`,
so the flinch's expiry cannot cut the swing short. Each one-shot ends by
handing the enemy back to `idle` after its own declared length.

Reduced motion is the ref the pane already maintains: when it says
motion is reduced, no clip is selected at all and the enemy holds its
resting frame. An enemy with no frame set goes through none of this and
renders its single painting.

**Generating a sheet (phase AN1d).** A subject spec with a
`frames: { cols, rows, poses? }` block makes `npm run art:gen` ask for
ONE grid image instead of one figure: one call is what keeps the
creature the same in every cell. `poses` names one pose per row (for
example idle, struck, attacking). The generator then splits the grid
row-major into `<slug>-NN.webp` under `enemies/anim/<slug>/`, grades
each cell once with the full recipe (these cells were never graded),
keys the black ground to alpha (border-connected, so a dark pupil inside
the figure stays opaque), and writes ONE provenance record for the set
with the grid, the measured per-cell cost and `graded_in_this_run: true`.
It does not write the registry entry; `frames.ts` still names the
clips by hand.

It **refuses** any slug that is not an enemy already in the game: the
key must be a `portraitAsset` in `axiomancer-mechanics/src/Enemy/enemy.library.ts`
**and** a key of `ENEMY_ART_BY_KEY` in `enemies/index.ts`. Both are read
from source on every run. `sandbag-01` (no portrait) and any new
creature are refused by name before a request is built; art for them
stays with the owner. `prompts/enemies/green-jelly.sheet.json` is the
worked spec, and with no `OPENAI_API_KEY` the run is a dry run that
prints the compiled sheet request and writes nothing.

## Licensing (closed, D115)

T ruled on 2026-10-29: "The images we use for everything are open
source." The owner-supplied card, enemy, portrait, treasure, door and
wall art records `"license": "open source (T, 2026-10-29, D115)"`; the
torio files keep their traced free-material grant and the Act 1 map
plates their owner-generated record. Nobody re-opens the question.
A new third-party file still records its own licence: a traced grant, or
T's ruling written into its record by a session T runs.
`ingest-art.mjs` refuses to run without `--license` (no default) and
rejects `UNRESOLVED` with a line citing D115; `assets:check` still reports
any older record that says so.
The DevLog art gate (`scripts/devlog-art-licence.mjs`) withholds such a
file from the public site until its record names a licence.

## Item glyphs are chosen by id

An inventory item's glyph is a property of the item, not its category.
`components/icons/item-glyphs.ts` holds `ITEM_GLYPH_BY_ID`, one row per
item id naming a registry icon (`AxmIconName`, so a name that is not in
`game-icon-paths.ts` does not compile). `ItemGlyph` draws that icon when
the id has a row and the category glyph otherwise; it never draws
nothing. The table starts empty. Choosing an item's icon is an owner art
call: add the icon to the extraction manifest if it is not in the
registry yet, regenerate, then add the row.

## Known gaps (queued work, build plan)

- No bundle-size budget (spec 11 Q5 was left blank).
- `assets/images/maps/` has five plates; `combat/` six arenas plus one
  village plate — coverage, not convention, problems. `combat/` gained
  its `index.ts` (`arenaBackdropFor`) in phase 83, so
  `asset-provenance.test.mjs`'s registry-less set is now empty.
- `labyrinth/walls/` shipped at 720x1280, above the 640px longest-edge
  cap, on the assumption that a lossy-on-lossy re-encode would save
  little. Measured 2026-09-22 (`scripts/shrink-art.mjs --dry-run`): 2.76 MB
  -> 0.64 MB. Closed by the build-size pass; the walls now sit at the cap.
- `maps/` is a **standing exception to the 640px cap**: map backdrops are
  full-bleed under a chart layer, so they are acquired at 1120px (the
  recorded `forest-dark` recipe). `art:qa` counts them in its `over`
  column by design — the column reports the cap, and this category is
  known to sit outside it.

## Acquiring public-domain art (phase V4)

```bash
npm run assets:acquire --workspace axiomancer-mobile -- --key <key>
npm run assets:acquire --workspace axiomancer-mobile -- --all --dry-run
```

`scripts/acquire-art.mjs` reads the licence from the Wikimedia Commons
`imageinfo` API and **refuses to write anything it cannot prove is
public domain or CC0** — non-zero exit, no file, no provenance record.
The operator picks the file and the destination; the operator never
asserts the licence, because a `--licence` flag would reproduce exactly
the failure the old licensing-debt AUDIT row described.

Attribution licences (CC BY, CC BY-SA) are refused too. They are usable
in principle, but the build has no attribution surface, and "we could
comply" is not "we do". Widening `ACCEPTED_LICENCES` should be a
deliberate diff — a test pins its length.

Candidate files live in `scripts/art-sources.json`, one entry per plate
with its reason recorded. A title in that file is a proposal, not a
permission.

## The title plate must stay legible (phase TP1a)

A new title plate (`assets/images/title/shore-at-dawn.webp`) must clear
the legibility gate before it ships. `scripts/title-plate-legibility.mjs`
measures the wordmark's and the psalm line's contrast against the plate
as the player sees it (through the screen's scrims, at the title and menu
opacities); `npm run art:test` fails a plate that differs from the
recorded baseline and misses a threshold. Try a candidate first:

```bash
npm run art:legibility --workspace axiomancer-mobile -- --plate <file>
npm run art:legibility --workspace axiomancer-mobile -- --write   # after installing it
```

The thresholds, their reasoning and the baseline live in
`docs/reports/title-plate-legibility.md`.
