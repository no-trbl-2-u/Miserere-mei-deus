# 146 — Arena plates: twelve engravings behind the foe, a default per region, a plate per node

> Combat stops being a black void. Each Act 1 region opens every fight on T's default engraving, any map node can name a different plate from the twelve kept, and every foe stands on a soft black backing shaped to its own silhouette, so its dark strokes stay dark over any plate.

## Why

### Sources

- The Nov 7 deadline Items "Pick the title plate and the four arena backgrounds" and "Plot the arena-background swap"
  (`plan/deadlines.md`), worked early in a channel thread with T, 2026-11-03 to 2026-11-04, attended. The candidates are
  T's Art Sourcing Dossier (an artifact page, graded through the plate pipeline's own recipe); the picks page that laid
  them out is a claude.ai artifact, not in the repo.
- T's words, in that thread:
  - The title: "I pick the title plate with the lion. It's got a huge area at the top we could put The title in"
    (built by 121.2, not here).
  - The backing: "the images are transparent and the enemies use the background to fill in the black ... put black just
    behind the enemies (slight aura around is okay so you don't have to make it fit perfectly)"
  - Keep every plate: "make sure to keep all of them, as some look great with some enemies but will likely not be perfect
    for others. So let's have all of them and change them based on where they are within the region of the map they're
    on with defaults based on my picks. I like all your recommendations except for the underworld. I like the second one"
  - "Yes please" to plotting the seven draft rows.

### What exists today (read 2026-11-04, at 33050d3)

- `axiomancer-mobile/assets/images/combat/index.ts`: two plates (Doré's "The New Zealander" as the fallback, "Off
  Billingsgate" for the Drowned Parish), one ordered region-rule table keyed on the region's display string, and
  `ARENA_PLATES_SHOWN = false` (D32, T 2026-09-26: "an all black background for all combat plates for now").
- Its test names all four Act 1 regions in `AWAITING_PLATE` and pins that set in both directions.
- `CombatCombatantPane.tsx` already draws a figure plate: a soft radial gradient of `AXM.bg` (0.92 at the centre) between
  the backdrop and the foe, because roster art is alpha-matted by keying black out of a painting. It is a round blob,
  not the foe's shape, so a tall or wide foe's keyed-away strokes still show the plate through it.
- The pane gets `region` only; no node id reaches it (`CombatBoard.tsx`, `CombatEncounterPanel.tsx`).
- `NodeLayout` (`state/exploration-maps/types.ts`) carries id, position, label and blurb; nothing per-node about combat.
- `scripts/acquire-art.mjs` + `scripts/art-sources.json` (category `combat`), the shared grade in `scripts/ingest-art.mjs`,
  and the plate register `docs/art-catalog.json` checked by `scripts/asset-provenance.test.mjs`.
- Seventeen roster sprites in `assets/images/enemies/`, and combat draws none of them: all seventeen are framed
  (`enemies/__tests__/frames.test.ts`), so it draws the cells under `enemies/anim/<key>/`, and every foe's cells are
  transparent, Death Beholder's and Green Jelly's included (T's gate, correcting this line's first reading of the stills).

## Design

**The twelve plates** (all Commons, all graded by the shared recipe; licence proven by `acquire-art.mjs`, never asserted):

| Region | Default (T's pick) | Also kept |
|---|---|---|
| The Breakwater | Friedrich, *Northern Sea in the Moonlight* | Friedrich, *Küste bei Mondschein*; Boeck, *Mondscheinnacht auf Rügen* |
| The Charcoal Wood | Böcklin, *Sacred Grove* (1882, Basel) | Rousseau, *Pheasantry in the Forest of Compiègne*; Friedrich, *Klosterruine Eldena* |
| The Beacon Crags | Herzog, *Storm in the Mountains* | Bierstadt, *A Storm in the Rocky Mountains*; Friedrich, *Riesengebirge 3* |
| The Lantern Deep | Böcklin, *Die Toteninsel III* (Berlin) | Martin, *Le Pandemonium* (Louvre, sans cadre); Martin, *The Great Day of His Wrath* |

Commons file titles: `File:Caspar_David_Friedrich_-_Northern_Sea_in_the_Moonlight_-_Google_Art_Project.jpg`,
`File:Caspar_David_Friedrich_-_Küste_bei_Mondschein.jpg`, `File:Johann_Friedrich_Boeck_-_Mondscheinnacht_auf_Rügen.jpg`,
`File:Sacred_Grove_(1882)_-_Arnold_Böcklin_(Kunstmuseum_Basel).jpg`,
`File:Théodore_Rousseau_-_Pheasantry_in_the_Forest_of_Compiègne_-_33-2016_-_Saint_Louis_Art_Museum.jpg`,
`File:Caspar_David_Friedrich_Klosterruine_Eldena_1824-25.jpg`, `File:Hermann_Herzog_-_Storm_in_the_mountains.jpg`,
`File:Albert_Bierstadt_-_A_Storm_in_the_Rocky_Mountains.jpg`, `File:Friedrich_Riesengebirge_3.jpg`,
`File:Arnold_Böcklin_-_Die_Toteninsel_III_(Alte_Nationalgalerie,_Berlin).jpg`,
`File:Le_Pandemonium_-_John_Martin_-_Musée_du_Louvre_Peintures_RF_2006_21_-_sans_cadre.jpg`,
`File:John_Martin_-_Great_Day_of_His_Wrath_-_WGA14150.jpg`.

**One library, three layers of choice.** Every plate is one record (stable id, art, alt text describing what is in the
plate). Combat resolves a fight's plate as: the node's own plate, if its layout names one; else the region's default;
else the fallback (The New Zealander, unchanged). The Drowned Parish rule stays.

**The backing.** Each foe that draws transparent cells gets one baked matte (T: "One per foe, all cells"): the union of
alpha across every cell, thresholded, holes closed, grown a few pixels and feathered, drawn in `AXM.bg` directly under the
figure and moving with it. It replaces the radial figure plate (T: "Remove it") as the thing that keeps keyed-away strokes
dark. A foe that moves a lot gets a looser aura, which T accepted. A foe that draws no transparency gets none; today that
is no foe, and it is judged by alpha values, never the file's flag.

### Decisions made upfront (do not ask)

- The twelve plates and the four defaults are T's picks (T, 2026-11-03, D88).
- All twelve are kept; none is dropped for being weaker (T, 2026-11-03).
- The backing need not fit exactly; a slight aura is fine (T, 2026-11-03).
- Turning plates on ends D32 (T's plain-black rule) once the backing ships; a new decision records it.
- The loop assigns no node plates. Which node gets which plate is T's art call (D88), its own attended chunk.
- Separation and luminance figures are measurements to help T pick, never a gate that rejects T's pick (D57).

### Out of scope

- The title plate: chunk 121.2 builds T's pick (the lion), with its own legibility gate.
- New plates beyond the twelve, Acts 2+ regions, and per-foe plates.
- Changing any sprite's art.

## Acceptance

- **A7** T's node plate picks are in the map layouts.

## Open questions

1. When does T pick node plates? Default: date not set, after the report (146.6). [T to confirm #1]
2. Which plates may a node name? Any of the twelve (T, 2026-11-04): the only check is that the plate id exists, so a node may name a plate from another region.
3. Does the radial figure plate stay under the new matte? No: T ruled "Remove it" at the 146 gate; the matte replaces it.

## Chunks

Measure: 1 open · 6 closed · next A8

- [ ] **146.7** T picks node plates (owner-led) · S · closes A7 · needs — · alias: AP1g

### 146.1 (AP1a) — Pull in the twelve arena plates · M · closes A1 · requires —

- Twelve `category: combat` entries in `scripts/art-sources.json` (the titles above, a `why` each), run through
  `acquire-art.mjs`. Trim scan borders and mounts (Rousseau's pale mount, Toteninsel's frame edge) in the recipe, not by hand.
- Stable keys `arena-<region>-<subject>`, for example `arena-breakwater-northern-sea`.
- Measure: `node --test scripts/asset-provenance.test.mjs` and `npm run verify -w axiomancer-mobile`.

### 146.2 (AP1b) — One plate library, a default per region · S · closes A2 · requires 146.1

- `assets/images/combat/index.ts`: a record per plate by id; four narrow region rules (`/the breakwater/i` and so on) naming
  the default ids. The fallback stays out of the table.
- Empty `AWAITING_PLATE`; the test's both-directions pin keeps holding.
- Measure: the combat index test, then `npm run verify -w axiomancer-mobile`.

### 146.3 (AP1c) — A node may name its plate · M · closes A3 · requires 146.2

- An optional `arena?: ArenaPlateId` on `NodeLayout`. The board passes the current node id to the pane beside `region`;
  the resolver takes both. No layout names a plate yet.
- A test over `ALL_MAP_LAYOUTS` fails on an unknown id.
- Measure: a resolver test for all three layers, then `npm run verify -w axiomancer-mobile`.

### 146.4 (AP1d) — A backing shaped to each foe · M · closes A4 · requires —

- A script beside `ingest-art.mjs` writes `backing/<key>.backing.webp` for each foe with transparent cells: union of alpha
  across the cells, threshold, close holes, grow, feather (one tuning block). The roster index exposes it; the pane draws
  it in `AXM.bg` under the figure, in the same box and the same animated wrapper so it lunges and breathes with the foe.
- The radial figure plate goes (T: "Remove it").
- Measure: a test that every foe drawing transparent cells has a matte, a pane test, then `npm run verify -w axiomancer-mobile`.

### 146.5 (AP1e) — Combat plates back on · S · closes A5 · requires 146.2, 146.4

- `ARENA_PLATES_SHOWN = true`; record `D151` superseding D32. Update the pane's comment and any suite that
  assumes black.
- Measure: `npm run verify -w axiomancer-mobile`, then `npm run verify:visual` for the combat screen.

### 146.6 (AP1f) — Every foe on its region's three plates, measured · S · closes A6 · requires 146.1, 146.4

- A script composites each sprite, with its matte, over each of its region's plates at the pane's figure position and writes
  `docs/reports/arena-separation.md`: one table per region, sprite by plate, with the commit.
- Measure: the report, named in the PR body.

### 146.7 (AP1g) — T picks node plates (owner-led) · S · closes A7 · requires 146.3, 146.6

- T reads the report and names a plate on the nodes T wants changed; every other node keeps its region default. The loop
  writes only what T names.
