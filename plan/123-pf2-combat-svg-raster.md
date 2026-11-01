# 123 — Combat SVG rasterisation

> On T's Android release APK, drags a/b/c show fewer janky frames and a lower p95 frame time than PR #510's baseline, because the combat board's static SVG layers are drawn once (as cached textures or webp images) instead of re-rasterised, with no visible change.

Carried from the v1 brief `phase_PF2_combat_svg_raster.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_PF2_combat_svg_raster.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- T's request, 2026-10-13: "turn those svgs into images so it doesn't
  have to be drawn so many times", after PR #510 reported 30 `<Svg>`
  roots and 330 paths on the combat board.
- PR #510 (`ccr-9327878f-vn0e49`): `axiomancer-mobile/docs/perf/combat-drag-baseline.md`
  (the three drags a/b/c, the web numbers, the blank Android tables) and
  `axiomancer-mobile/scripts/android-drag-perf.sh` (gfxinfo + Perfetto per
  drag set).
- Decisions: **D37** and **D88** (art is owner-only; this phase changes
  how existing chrome is drawn, never what it looks like), **D77** (PF1:
  perf is measured, report-first), **D84** (code by PR; T merges).
- Tooling precedent: `sharp` is already a mobile devDependency
  (`scripts/shrink-art.mjs`); `expo-image` already draws card art;
  `npm run art:test` is the freshness-check shape.

### Outcome

On T's Android release APK, drags a/b/c show fewer janky frames and a
lower p95 frame time than PR #510's baseline, because the combat board's
static SVG layers are drawn once (as cached textures or webp images)
instead of re-rasterised, with no visible change.

## Design

### Scope

`axiomancer-mobile` only.

Static layers (step 1 wraps them, step 2 rasterises them):
- `components/combat/encounter/CombatCombatantPane.tsx`: top scrim, floor
  glow, bottom scrim, enemy figure plate, enemy ground shadow, HP crest
  shield (the HP number stays `Text` over it).
- `components/combat/encounter/CombatBoard.tsx`: fan shelf glow, End-turn
  pulse glow (the pulse animates the wrapper's opacity, not the SVG).
- `components/combat/encounter/CombatEncounterPanel.tsx`: card-detail halo.

Tinted glyphs (step 3): `CombatBoard.tsx` free-cell glyph and
`StanceCube`.

Stays SVG: `CombatDie.tsx` (per-die clip paths and state gradients; step 1
caches it as a texture instead), `CombatEncounterPanel.tsx` 128x30 bars
and the 170px roll ring if their props vary per frame.

New: `scripts/build-combat-chrome.mjs`, `assets/images/combat/chrome/*.webp`,
a `chrome:test` script in `package.json`.

### Consumers to update

None outside the combat screen. `DebugCombatSandbox.tsx` renders the
same components and inherits the change.

### Carrier sweep

Not an R-phase. None.

### Decisions made upfront — DO NOT ASK

- **Identical pixels, not new art.** The SVG source strings move into
  exported constants and the webp is generated from them; nobody draws
  anything. That keeps the phase outside D37/D88.
- **Texture caching before rasterising.** Step 1 is one prop per site
  and needs no assets; steps 2 and 3 run only if A3's gate says so.
  Building an asset pipeline for an unmeasured cost is the waste PR #510
  warned about.
- **Colours from tokens at build time.** The build script imports `AXM`
  and `HUE` from `theme/`, so a theme change regenerates the webp and
  `chrome:test` catches a stale asset.
- **Densities 1x/2x/3x, webp lossless for the glyph masks, quality 90
  for the gradients.** `expo-image` picks the density.
- **Full-width scrims** render at a fixed 1080px-wide source and stretch
  horizontally (`contentFit="fill"`); they are vertical gradients, so
  horizontal stretch is lossless.
- **Stance cube per colour, not tinted.** It uses three shades of one
  colour; a single tint would flatten it.
- **Attended.** The device numbers are T's; the loop does not start this
  row.

### Tests matrix

- `chrome:test` (new): every webp matches a fresh render of its source.
- `components/combat/encounter/__tests__/`: snapshot updates where
  `<Svg>` becomes `<Image>`; the PR #510 commit-count tests stay green.
- Web pixel diff for step 3 glyphs in `scripts/combat-drag-perf.mjs` or a
  sibling.

### Verify gate

`npm run verify -w axiomancer-mobile`; `node scripts/combat-round-e2e.mjs`;
`node scripts/combat-encounter-e2e.mjs`. Mechanics untouched.

### Commit body template

```
perf(mobile): <step> — <what is drawn once now>

Android release APK, <device>, drags a/b/c:
janky % <before> -> <after>; p95 ms <before> -> <after>.
Acceptance: A<n>.
```

### Follow-ups (out of scope)

- The exploration map drawn and pulsing under the combat layer
  (`ExplorationNode.tsx:84`).
- `elevation: 6` on every card face.
- Reanimated `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`.

## Contracts

None.

## Acceptance

- **A1** Step 1 shipped: `renderToHardwareTextureAndroid` (and
  `shouldRasterizeIOS`) on a wrapper `View` around each static SVG layer
  listed in Scope and around each `CombatDie`; no visual change on web
  or in the jest snapshots.
- **A2** T records step 1's numbers for drags a/b/c in
  `combat-drag-baseline.md` beside the PR #510 baseline, same device,
  same APK profile.
- **A3** Gate: step 2 starts only if A2 shows the static layers still
  cost frames (Perfetto slices naming SVG draw on the RenderThread, or
  "Show GPU overdraw" red over the scrims). Otherwise steps 2 and 3 are
  recorded as not needed and the phase closes on A1, A2.
- **A4** Step 2: `scripts/build-combat-chrome.mjs` renders the static
  layers to webp at 1x/2x/3x into `assets/images/combat/chrome/`, each
  from a single SVG source string exported by the component's module;
  each `<Svg>` in Scope becomes an `expo-image` `<Image>`.
- **A5** `npm run chrome:test` fails when a committed webp no longer
  matches its source (re-render and byte or pixel compare), and runs in
  `npm run verify -w axiomancer-mobile`.
- **A6** Step 3: the card-face free-cell glyph renders from a white mask
  webp tinted with `tintColor`; the stance cube is one webp per card
  colour. Pixel diff against the SVG under 1% per glyph in the web
  harness.
- **A7** T records steps 2 and 3's numbers in the same tables.
- **A8** `npm run verify -w axiomancer-mobile`, `combat-round-e2e.mjs`
  and `combat-encounter-e2e.mjs` pass at every step.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 8 open · 0 closed · next A9

- [ ] **123.1** Combat SVG rasterisation (attended) · S · closes A1, A2, A3, A4, A5, A6, A7, A8 · needs — · alias: PF2
  - also waits on: PR #510 merged
  - also waits on: its Android baseline tables filled by T
