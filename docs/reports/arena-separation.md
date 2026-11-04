# Arena separation: every foe on its region's three plates

Measured at commit `911b145d0` (the tree the plates, mattes and cells below are read from). Regenerate with `node axiomancer-mobile/scripts/measure-arena-separation.mjs`.

This is a measurement (D57), not a gate. It rejects nothing and carries no verdict on any plate or pick.

## How it is measured

- Composite, bottom to top: the plate (`cover`, bottom centre, in the scene band: 390x523 of a 390x844 phone), the foe's matte tinted to `AXM.bg` (#0b0a09, the `ashen-gold` theme, read from `theme/palette.ts`), the foe's cell.
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

- With a backing every pixel of the foe sits on its own matte, so the first number in a cell is the same on all three plates of a region. The plate shows only in the aura past the matte and through its feather, which is not measured here. The plate-dependent number is the one in brackets (no backing) and the `plate Y behind` column.

### arena-beacon-crags-riesengebirge

Mean Y 59.0, sd Y 23.4, dark share 11%, detail 0.4. By detail it ranks 12 of 12 (most to least: eldena 6.6, pheasantry 4.1, sacred-grove 3.6, great-day-of-wrath 3.1, pandemonium 2.7, toteninsel 2.3, storm-mountains 2.2, kuste-bei-mondschein 2.1, mondscheinnacht-ruegen 2.0, rocky-mountains-storm 1.6, northern-sea 1.4, riesengebirge 0.4).

## The Breakwater

| Foe | northern-sea (default) | kuste-bei-mondschein | mondscheinnacht-ruegen | plate Y behind (northern-sea / kuste-bei-mondschein / mondscheinnacht-ruegen) |
|---|---|---|---|---|
| float-eye | +68.2 (+37.9) | +68.2 (+42.5) | +68.2 (+23.3) | 40.4 / 35.8 / 55.1 |
| gallows-crow | +161.1 (+135.7) | +161.1 (+136.8) | +161.0 (+120.3) | 35.5 / 34.4 / 50.9 |
| toll-keeper | +53.6 (+45.3) | +53.6 (+44.1) | +53.6 (+21.5) | 18.5 / 19.7 / 42.2 |
| tide-gate | +52.3 (+23.5) | +52.3 (+25.0) | +52.3 (+9.5) | 39.1 / 37.6 / 53.0 |
| death-beholder | +39.3 (+12.8) | +39.3 (+17.9) | +39.3 (-3.3) | 36.7 / 31.5 / 52.8 |
| net-mender | +54.9 (+29.9) | +54.9 (+34.4) | +54.8 (+12.7) | 35.2 / 30.6 / 52.4 |
| crane-hook | +65.0 (+49.3) | +65.0 (+50.5) | +65.0 (+30.0) | 25.9 / 24.7 / 45.2 |
| brine-widow | +142.8 (+122.3) | +142.8 (+124.8) | +142.8 (+106.9) | 30.6 / 28.2 / 46.1 |
| cave-choir | +74.8 (+55.4) | +74.8 (+57.4) | +74.8 (+38.4) | 29.6 / 27.6 / 46.6 |
| tithe-collector | +53.5 (+33.5) | +53.5 (+36.5) | +53.5 (+15.9) | 30.2 / 27.2 / 47.8 |
| lamprey-knot | +58.6 (+38.5) | +58.6 (+41.0) | +58.6 (+16.3) | 30.2 / 27.7 / 52.4 |
| green-jelly | +116.1 (+98.5) | +116.1 (+99.6) | +116.1 (+76.6) | 27.7 / 26.7 / 49.6 |
| curfew-ringer | +74.1 (+54.2) | +74.1 (+57.2) | +74.1 (+35.2) | 30.1 / 27.1 / 49.0 |
| wreck-picker | +75.5 (+54.9) | +75.5 (+56.3) | +75.5 (+34.1) | 30.7 / 29.3 / 51.5 |
| lamplighter | +79.0 (+73.2) | +79.0 (+73.8) | +79.0 (+46.2) | 15.9 / 15.3 / 42.9 |
| wrecker | +116.9 (+107.2) | +116.9 (+107.2) | +116.9 (+87.4) | 19.8 / 19.8 / 39.7 |
| smokehouse-gutter | +79.6 (+67.5) | +79.6 (+68.2) | +79.6 (+45.9) | 22.3 / 21.5 / 43.8 |

## The Charcoal Wood

| Foe | sacred-grove (default) | pheasantry | eldena | plate Y behind (sacred-grove / pheasantry / eldena) |
|---|---|---|---|---|
| float-eye | +68.2 (+68.6) | +68.2 (+40.6) | +68.2 (+22.6) | 9.7 / 37.8 / 55.7 |
| green-jelly | +116.1 (+106.6) | +116.1 (+97.4) | +116.1 (+72.3) | 19.6 / 28.8 / 53.9 |
| death-beholder | +39.3 (+33.3) | +39.3 (+18.9) | +39.3 (-5.2) | 16.2 / 30.5 / 54.7 |

## The Beacon Crags

| Foe | storm-mountains (default) | rocky-mountains-storm | riesengebirge | plate Y behind (storm-mountains / rocky-mountains-storm / riesengebirge) |
|---|---|---|---|---|
| float-eye | +68.2 (+43.0) | +68.2 (+37.6) | +68.2 (+9.2) | 35.4 / 40.7 / 69.1 |
| green-jelly | +116.1 (+96.8) | +116.1 (+84.3) | +116.1 (+65.8) | 29.4 / 41.9 / 60.5 |
| death-beholder | +39.3 (+14.0) | +39.3 (+12.6) | +39.3 (-17.4) | 35.4 / 36.9 / 66.9 |

## The Lantern Deep

| Foe | toteninsel (default) | pandemonium | great-day-of-wrath | plate Y behind (toteninsel / pandemonium / great-day-of-wrath) |
|---|---|---|---|---|
| float-eye | +68.2 (+71.1) | +68.2 (+41.3) | +68.2 (+60.2) | 7.3 / 37.1 / 18.1 |
| green-jelly | +116.1 (+109.7) | +116.1 (+93.1) | +116.1 (+114.8) | 16.5 / 33.2 / 11.4 |
| death-beholder | +39.3 (+38.3) | +39.3 (+13.2) | +39.3 (+31.6) | 11.1 / 36.2 / 17.9 |

## Matte coverage at the rendered size

The shipped matte (all cells) against the foe it sits behind, drawn at the size combat draws it. `figure` is the resting cell's pixels at alpha 64 or more; `matte` is the matte's alpha summed; both as a share of the foe's square. `ratio` is matte over figure. The last three columns re-bake the matte from one resting cell, from the idle clip's cells, and from all cells with the shipped tuning, as a share of the cell.

| Foe | rendered square | figure | matte | ratio | one cell | idle cells | all cells |
|---|---|---|---|---|---|---|---|
| brine-widow | 304px | 18% | 59% | 3.27x | 23% | 26% | 59% |
| tide-gate | 304px | 15% | 49% | 3.21x | 19% | 22% | 49% |
| curfew-ringer | 304px | 18% | 52% | 2.91x | 22% | 25% | 52% |
| lamplighter | 304px | 14% | 40% | 2.83x | 17% | 19% | 40% |
| gallows-crow | 304px | 20% | 53% | 2.67x | 24% | 29% | 53% |
| smokehouse-gutter | 304px | 19% | 51% | 2.63x | 23% | 25% | 51% |
| toll-keeper | 304px | 15% | 39% | 2.62x | 18% | 20% | 39% |
| net-mender | 304px | 22% | 52% | 2.36x | 28% | 32% | 52% |
| wreck-picker | 304px | 26% | 59% | 2.28x | 31% | 37% | 59% |
| tithe-collector | 304px | 27% | 62% | 2.28x | 32% | 36% | 62% |
| cave-choir | 304px | 30% | 68% | 2.26x | 36% | 37% | 68% |
| lamprey-knot | 304px | 28% | 58% | 2.06x | 35% | 42% | 58% |
| wrecker | 304px | 31% | 54% | 1.74x | 35% | 40% | 54% |
| float-eye | 304px | 28% | 48% | 1.70x | 32% | 33% | 48% |
| crane-hook | 304px | 34% | 58% | 1.70x | 37% | 39% | 58% |
| green-jelly | 304px | 33% | 52% | 1.58x | 37% | 39% | 52% |
| death-beholder | 328px | 42% | 60% | 1.44x | 46% | 49% | 60% |

The all-cells column is the shipped matte re-baked here, so it should match the file; the one-cell and idle-cell columns are for comparison only and nothing in the tree uses them.

