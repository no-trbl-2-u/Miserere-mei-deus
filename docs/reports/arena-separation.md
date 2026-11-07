# Arena separation: every foe on its region's three plates

Measured at commit `de0628add` (the tree the plates, mattes and cells below are read from). Regenerate with `node axiomancer-mobile/scripts/measure-arena-separation.mjs`.

This is a measurement (D57), not a gate. It rejects nothing and carries no verdict on any plate or pick.

## How it is measured

- Composite, bottom to top: the plate (`cover`, bottom centre, in the scene band: 390x523 of a 390x844 phone), the resting cell's own backing tinted to `AXM.bg` (#0b0a09, the `ashen-gold` theme, read from `theme/palette.ts`), the foe's cell.
- Figure position and size are the pane's own: wrap top 134, bottom 9% of the band, box 78% of the width (92% for the boss) by 96% of the wrap, the square cell 'contain'ed at the bottom centre for a foot-line foe and the centre for a floating one. The pane's HUD-measured `top` and the idle breath, lunge, grounding shadow and top/floor scrims are not modelled.
- Cell used for the main figure: the resting cell of the idle clip, `<key>-00.webp` (idle row 0, `rest: 0`) for every foe.
- Separation = alpha-weighted mean luminance of the foe's cell minus the alpha-weighted mean luminance of what is behind it, over the cell's own pixels. Luminance is Rec. 709 on the stored sRGB values, 0 to 255. Positive: the foe is lighter than what is behind it.
- Each table cell reads `with backing (without backing)`. With backing, what is behind each pixel is the plate mixed toward `AXM.bg` by the matte's alpha; without, it is the bare plate.
- Under each region table: `plate Y` is the mean luminance of the bare plate behind the foe's pixels (the same for a given foe whichever backing).

## The twelve plates themselves

Over the scene band (390x523), no foe. `dark` is the share of pixels under luminance 16. `detail` is the mean absolute luminance step to the pixel right and the pixel below (higher is more texture).

| Region | Plate | mean Y | sd Y | dark | detail |
|---|---|---|---|---|---|
| The Breakwater | northern-sea (default) | 29.5 | 21.2 | 31% | 1.4 |
| The Breakwater | kuste-bei-mondschein | 27.2 | 20.3 | 38% | 2.1 |
| The Breakwater | mondscheinnacht-ruegen | 40.6 | 16.7 | 13% | 2.0 |
| The Charcoal Wood | sacred-grove (default) | 36.6 | 31.0 | 34% | 3.6 |
| The Charcoal Wood | pheasantry | 20.9 | 18.0 | 49% | 4.1 |
| The Charcoal Wood | eldena | 46.1 | 18.7 | 1% | 6.6 |
| The Beacon Crags | storm-mountains (default) | 39.7 | 19.2 | 6% | 2.2 |
| The Beacon Crags | rocky-mountains-storm | 41.6 | 23.7 | 5% | 1.6 |
| The Beacon Crags | riesengebirge | 59.0 | 23.4 | 11% | 0.4 |
| The Lantern Deep | toteninsel (default) | 36.2 | 36.4 | 47% | 2.3 |
| The Lantern Deep | pandemonium | 21.7 | 17.2 | 45% | 2.7 |
| The Lantern Deep | great-day-of-wrath | 28.7 | 31.1 | 48% | 3.1 |

### Reading the separation tables

- With a backing every pixel of the foe sits on its own matte, so the first number in a cell is the same on all three plates of a region. The plate shows only through the backing edge feather (about a pixel), which is not measured here. The plate-dependent number is the one in brackets (no backing) and the `plate Y behind` column.

### arena-beacon-crags-riesengebirge

Mean Y 59.0, sd Y 23.4, dark share 11%, detail 0.4. By detail it ranks 12 of 12 (most to least: eldena 6.6, pheasantry 4.1, sacred-grove 3.6, great-day-of-wrath 3.1, pandemonium 2.7, toteninsel 2.3, storm-mountains 2.2, kuste-bei-mondschein 2.1, mondscheinnacht-ruegen 2.0, rocky-mountains-storm 1.6, northern-sea 1.4, riesengebirge 0.4).

## The Breakwater

| Foe | northern-sea (default) | kuste-bei-mondschein | mondscheinnacht-ruegen | plate Y behind (northern-sea / kuste-bei-mondschein / mondscheinnacht-ruegen) |
|---|---|---|---|---|
| quay-crab | +70.9 (+64.5) | +70.9 (+62.7) | +70.6 (+27.0) | 16.6 / 18.4 / 54.1 |
| net-mender | +53.7 (+29.9) | +54.0 (+34.4) | +52.5 (+12.7) | 35.2 / 30.6 / 52.4 |
| coralback | +99.7 (+91.1) | +99.7 (+90.1) | +99.6 (+60.2) | 18.8 / 19.9 / 49.7 |
| brine-widow | +142.5 (+122.3) | +142.6 (+124.8) | +142.1 (+106.9) | 30.6 / 28.2 / 46.1 |
| saltwick-swarm | +143.7 (+109.3) | +143.7 (+113.5) | +143.4 (+102.3) | 45.8 / 41.5 / 52.8 |
| bilge-stalker | +97.0 (+72.6) | +97.1 (+77.5) | +96.7 (+56.4) | 34.9 / 30.0 / 51.1 |
| cave-choir | +74.6 (+55.4) | +74.7 (+57.4) | +74.5 (+38.4) | 29.6 / 27.6 / 46.6 |
| tithe-collector | +53.4 (+33.5) | +53.4 (+36.5) | +53.2 (+15.9) | 30.2 / 27.2 / 47.8 |
| lamplighter | +78.9 (+73.2) | +78.9 (+73.8) | +78.7 (+46.2) | 15.9 / 15.3 / 42.9 |
| wrecker | +116.7 (+107.2) | +116.7 (+107.2) | +116.4 (+87.4) | 19.8 / 19.8 / 39.7 |
| wreckmaster | +66.5 (+39.2) | +66.5 (+41.8) | +66.4 (+24.5) | 37.6 / 35.1 / 52.3 |
| tide-gate | +51.5 (+23.5) | +51.6 (+25.0) | +50.7 (+9.5) | 39.1 / 37.6 / 53.0 |
| saint-beneath | +67.6 (+40.3) | +67.6 (+41.5) | +67.4 (+23.4) | 37.6 / 36.3 / 54.5 |

## The Charcoal Wood

| Foe | sacred-grove (default) | pheasantry | eldena | plate Y behind (sacred-grove / pheasantry / eldena) |
|---|---|---|---|---|
| float-eye | +68.2 (+68.6) | +68.2 (+40.6) | +68.0 (+22.6) | 9.7 / 37.8 / 55.7 |
| green-jelly | +116.0 (+106.6) | +116.0 (+97.4) | +115.9 (+72.3) | 19.6 / 28.8 / 53.9 |
| death-beholder | +39.1 (+33.3) | +39.2 (+18.9) | +38.8 (-5.2) | 16.2 / 30.5 / 54.7 |

## The Beacon Crags

| Foe | storm-mountains (default) | rocky-mountains-storm | riesengebirge | plate Y behind (storm-mountains / rocky-mountains-storm / riesengebirge) |
|---|---|---|---|---|
| float-eye | +68.1 (+43.0) | +68.1 (+37.6) | +68.0 (+9.2) | 35.4 / 40.7 / 69.1 |
| green-jelly | +116.0 (+96.8) | +116.0 (+84.3) | +115.9 (+65.8) | 29.4 / 41.9 / 60.5 |
| death-beholder | +39.0 (+14.0) | +39.1 (+12.6) | +38.7 (-17.4) | 35.4 / 36.9 / 66.9 |

## The Lantern Deep

| Foe | toteninsel (default) | pandemonium | great-day-of-wrath | plate Y behind (toteninsel / pandemonium / great-day-of-wrath) |
|---|---|---|---|---|
| float-eye | +68.2 (+71.1) | +68.1 (+41.3) | +68.2 (+60.2) | 7.3 / 37.1 / 18.1 |
| green-jelly | +116.0 (+109.7) | +115.9 (+93.1) | +116.1 (+114.8) | 16.5 / 33.2 / 11.4 |
| death-beholder | +39.3 (+38.3) | +39.0 (+13.2) | +39.2 (+31.6) | 11.1 / 36.2 / 17.9 |

## Backing coverage at the rendered size

The resting cell's own backing (one per cell since 146.8) against the cell it sits behind, drawn at the size combat draws it. `figure` is the resting cell's pixels at alpha 64 or more; `backing` is the backing's alpha summed; both as a share of the foe's square. `ratio` is backing over figure: a little over 1 is the keyed-away strokes and enclosed holes the backing fills, and its edge feather.

| Foe | rendered square | figure | backing | ratio |
|---|---|---|---|---|
| bilge-stalker | 304px | 11% | 11% | 1.08x |
| toll-keeper | 304px | 15% | 16% | 1.06x |
| coralback | 304px | 14% | 15% | 1.05x |
| quay-crab | 304px | 10% | 10% | 1.04x |
| lamplighter | 304px | 14% | 15% | 1.04x |
| saltwick-swarm | 304px | 10% | 10% | 1.04x |
| gallows-crow | 304px | 20% | 20% | 1.03x |
| lamprey-knot | 304px | 28% | 29% | 1.03x |
| wreckmaster | 304px | 10% | 10% | 1.03x |
| wreck-picker | 304px | 26% | 27% | 1.03x |
| tide-gate | 304px | 15% | 16% | 1.03x |
| net-mender | 304px | 22% | 23% | 1.03x |
| brine-widow | 304px | 18% | 19% | 1.02x |
| cave-choir | 304px | 30% | 31% | 1.02x |
| tithe-collector | 304px | 27% | 28% | 1.02x |
| death-beholder | 328px | 42% | 43% | 1.02x |
| smokehouse-gutter | 304px | 19% | 20% | 1.02x |
| curfew-ringer | 304px | 18% | 18% | 1.02x |
| wrecker | 304px | 31% | 32% | 1.02x |
| saint-beneath | 328px | 14% | 14% | 1.01x |
| crane-hook | 304px | 34% | 34% | 1.01x |
| float-eye | 304px | 28% | 29% | 1.00x |
| green-jelly | 304px | 33% | 33% | 1.00x |

