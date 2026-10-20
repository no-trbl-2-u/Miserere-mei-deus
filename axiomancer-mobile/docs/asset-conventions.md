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
open-source art found online** (owner's answer, 2026-08-22), per-image
license NOT yet on record. "Open source" spans CC0 (no obligations),
CC BY (attribution required), and share-alike terms, so the origin
answer removes the scrape risk but does not settle the terms. Rule:
do not wire one into the card registry until its source and license
can be written truthfully into `provenance.json`. Tracing them
(filename / reverse-image / bundled-manifest search against the usual
open-art hosts) is fair game, and any image whose license is
evidenced may ship.

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

## Licensing debt (open, blocked on the owner)

Every raster directory except `maps/` (the Dore plate) now records
`"license": "UNRESOLVED"` with a note. That is not a formality: the
card, enemy, portrait, treasure, combat, door and wall art was all
owner-supplied with no source or license captured, and the terms have
never been established. The assets already ship, so the records state
what is known instead of inventing terms. `assets:check` prints the
count on every run; it does not fail, because only the owner can answer
the question and a red build would neither answer it nor let anything
else ship. Same question as `Potential Assets/MCP-Axiomancer/images/`.

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
the failure the licensing-debt AUDIT row describes.

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
