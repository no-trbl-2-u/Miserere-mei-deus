# 121 — Title plate legibility: prove the plate, then replace it

> The launch sequence stops depending on luck. A machine check says whether the wordmark and the psalm line are actually legible against whatever plate is installed — measured through the scrims and at the menu dim, from the same layout functions the screen uses — so when T replaces the plate in an art pass, the gate either confirms it or names the number it missed by. The current plate's measurement is recorded as the baseline rather than used to fail the build.

Carried from the v1 brief `phase_TP1_title_plate_legibility.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_TP1_title_plate_legibility.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- The `/plot` request from T, 2026-10-19 (attended). T saw the shipped launch sequence on the throwaway
  `new-assets-extract` branch with an **unlicensed** placeholder plate — a dark field, a low burning sun over
  still water, silhouetted reeds — and said the sequence "looked and felt" right for the first time. The
  sequence itself was unchanged on that branch: the only diff to `assets/images/title/` was the plate's bytes.
  So what T liked is the existing sequence finally reading, and the variable is the plate.
- `axiomancer-mobile/components/TitleScreen.tsx` and `state/presenters/title.engine.ts` — the shipped sequence:
  the splash wordmark lifted into the plate's sky, the psalm line, EMBARK, then the main menu under the same
  wordmark, the plate dimmed to `MENU_PLATE_OPACITY` (0.3). `titleLayout` and `titleWordmarkFrames` own the
  geometry; `TITLE_TIMING` the beats; reduced motion and the e2e instant flag land every value at once.
- The two SVG scrims already composited over the plate in `TitleScreen.tsx`: `axmTitleFoot` (a bottom feather to
  `AXM.bg` reaching opacity 1 by 93% of height) and `axmTitleSides` (side feathers when `sideFeather`). Any
  measurement of "what is behind the text" is a measurement of the plate **after** those scrims, not of the file.
- `scripts/acquire-art.mjs` (Commons `imageinfo` extmetadata; refuses anything it cannot prove PD/CC0; the
  operator never asserts a licence) and `scripts/art-sources.json` key `shore-at-dawn` (category `title`, recipe
  `plate-page`, `maxEdge` 1600, `darkRatio` 0.95).
- `scripts/asset-provenance.test.mjs` (the world-plate register: one `docs/art-catalog.json` entry per plate,
  `plateCount` and `surfaceCounts` true, no `UNRESOLVED` without a note).
- **D88 / bearings "Content per surface": art is owner-only.** Picking the image is therefore not loop work and
  is not planned here; it is row TP1b, `[blocked: owner-led]`.

### Outcome

The launch sequence stops depending on luck. A machine check says whether the wordmark and the psalm line are
actually legible against whatever plate is installed — measured through the scrims and at the menu dim, from the
same layout functions the screen uses — so when T replaces the plate in an art pass, the gate either confirms it
or names the number it missed by. The current plate's measurement is recorded as the baseline rather than used
to fail the build.

Measure: `npm run verify -w axiomancer-mobile` passes; `docs/reports/title-plate-legibility.md` records a
contrast figure for the wordmark and the psalm line at both sequence phases for the installed plate; a fixture
plate that is too pale fails the check and a dark fixture passes.

## Design

### Scope

- `axiomancer-mobile/scripts/`: `title-plate-legibility.mjs` and its `node --test` file, wired into
  `art:test`.
- `axiomancer-mobile/docs/` or `docs/reports/`: `title-plate-legibility.md` (the baseline and the threshold).
- Not touched: `TitleScreen.tsx`, `title.engine.ts`, the plate's bytes, any colour, any timing. **No art.**

### Consumers to update

- `axiomancer-mobile/docs/art.md` (or the nearest art doc): that a plate swap must clear the gate.
- `docs/truth-sources.md`: the legibility report as a measured source.

### Decisions made upfront — DO NOT ASK

- **The image is not in scope.** Art is owner-only (D88). TP1a builds the gate; TP1b is T's pick, filed
  `[blocked: owner-led]`.
- **The gate does not fail on the current plate.** A check that reddens `main` the moment it lands would be
  reverted, not obeyed. Baseline-and-arm is the honest shape: it measures now, enforces on change.
- **Measured after the scrims, not on the file.** The foot scrim already drives the bottom of the frame to
  `AXM.bg`; a figure taken on the raw plate would be a number about a file nobody sees.
- **One reference viewport, named.** `titleLayout` is width-dependent; a single recorded viewport keeps the
  figure comparable between runs. More viewports are a follow-up, not a blocker.
- **Threshold stated in the report, with its reasoning**, so T can move it with a one-line edit and a sentence
  rather than a code change.
- **Slot: asap.** T asked for this now, it blocks no open row, and it is what makes the art pass verifiable
  instead of a matter of taste.

### Tests matrix

- `node --test` in `axiomancer-mobile`: the scrim compositor (A3), the four-figure computation against fixture
  plates (A1, A5), the baseline-and-arm decision (A4), the region import from `title.engine.ts` (A2).
- No Jest changes. The existing title suites must pass unchanged (A7).

### Verify gate

`npm run verify -w axiomancer-mobile`.

### Follow-ups (not in this phase)

- **TP1b — the plate itself** (owner-led, D88). Candidates already tried and rejected in T's 2026-10-18 pass, all
  confirmed Public domain by `acquire-art.mjs`'s own check but too pale after the ingest recipe
  (brightness 0.62, contrast 1.08): Hiroshige daylight landscapes (print borders, light fields) and three
  Turners — *Sun Setting over a Lake*, *The Fighting Temeraire*, *Sunrise with Sea Monsters*. The look that
  worked: dark field, one burning light source low in the frame, silhouetted foreground, quiet upper band for
  the wordmark. Note that torio's free Javardry pack cannot supply this — its 74 "distant view" plates are
  abstract corridor far-planes, not scenery (`Potential Assets/torio/LICENCE-torio.md`).
- **The launcher icon** derives from the same `shore-at-dawn` source (`art-sources.json`, category `title`).
  Whether an icon-size legibility check is worth having is a separate question; this phase does not answer it.
- **More viewports** for the measurement, if one reference proves too narrow.

## Contracts

None. The report is a generated record, not save data.

## Acceptance

- **A8** The title plate itself (carried from row TP1b, whose brief named no A-ID left open for it).

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 7 closed · next A9

- [ ] **121.2** The title plate itself (owner-led) · M · closes A8 · needs — · alias: TP1b
