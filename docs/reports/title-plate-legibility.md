# Title plate legibility

> Measured by `axiomancer-mobile/scripts/title-plate-legibility.mjs` (phase TP1a). The thresholds below are
> hand-edited; the baseline block is written by `npm run art:legibility -w axiomancer-mobile -- --write`.
> A measurement, not a design ruling.

## What is measured

The contrast ratio (WCAG 2.x formula) between the text colour (`parchment`, both texts) and the **mean
relative luminance of the plate region the text sits on, as the player sees it**: the plate fitted to its
box, then the `axmTitleSides` scrim, then the `axmTitleFoot` scrim, then faded to the phase's opacity over
the ground colour (`bg`). Four figures: the wordmark and the psalm line, at the `title` phase (plate at 1)
and the `menu` phase (plate at `MENU_PLATE_OPACITY`).

- **Regions.** The wordmark's box is its rest frame from `titleLayout` and `titleWordmarkFrames`
  (`state/presenters/title.engine.ts`, imported). The psalm line is laid out by flex from the window's foot,
  so its box is rebuilt from `TitleScreen.tsx`'s style numbers (mirrored, and pinned to the component's source
  by `title-plate-legibility.test.mjs`) with a glyph-width estimate for the line wrap.
- **Reference viewport:** desktop 1280x800, no safe-area inset, theme `ashen-gold`. The layout is
  width-dependent, so one fixed size keeps the figures comparable between runs.
- **What it does not see.** The text shadows (they only help), local bright spots inside the region (a mean
  hides them), and any viewport but the reference one.
- At the reference viewport the psalm line sits on the plate's last few percent, where the foot scrim has
  already reached the ground colour, so its figure is the text against `bg`. On a phone the plate ends above
  the psalm line altogether. Under the menu the psalm line is faded out; its `menu` figure is kept for
  symmetry and is gated like the rest.

## Thresholds

The wordmark is set at about 58pt in Pirata One, so it is **large text** and takes WCAG 2.x's 3:1 (SC 1.4.3,
large-scale text). The psalm line is 17pt italic serif, **normal text**, and takes 4.5:1. Move a threshold by
editing this block and saying why in a sentence here; no code change is needed.

```json legibility-thresholds
{
  "wordmark": 3,
  "psalm": 4.5
}
```

## The gate (baseline-and-arm)

`npm run art:test` (in `npm run verify -w axiomancer-mobile`) measures the installed plate. A plate whose
bytes match the baseline below passes whatever its figures, so a plate already shipped never turns `main`
red; a plate that differs from it fails for each figure under its threshold, and the failure names the
figure, the threshold and which of the four measurements missed. To try a candidate before installing it:
`npm run art:legibility -w axiomancer-mobile -- --plate <file>`. After installing a plate that clears it,
re-record the baseline with `--write`.

## Baseline

The plate's licence record is
[`axiomancer-mobile/assets/images/title/provenance.json`](../../axiomancer-mobile/assets/images/title/provenance.json)
(Doré, Inferno Plate 3, the lion: T's pick, installed by plan 121.2; public domain, read from Commons by
`scripts/acquire-art.mjs`). It replaced Purgatorio Canto I (`shore-at-dawn`, wordmark 5.43:1 at the `title`
phase), whose record moved to `axiomancer-mobile/assets/images/icon.provenance.json` as the launcher icon's
source. The wordmark rests in the plate's darkest band, under its slit of sky (`WORDMARK_REST_Y` in
`title.engine.ts`), which is why its `title` figure sits near the ground's own. Off the reference viewport,
measured by hand on 2026-11-04 with `measurePlate`: a 412x915 phone (inset 24) and 450x1000 read 14.85:1 and
14.89:1 for the wordmark, 15.11:1 and 15.13:1 for the psalm line. The title plate has
no entry in [`docs/art-catalog.json`](../art-catalog.json): that catalogue's scope is the eleven world plates
under `combat/` and `maps/`.

<!-- legibility:baseline:begin -->
Plate `assets/images/title/lion-in-the-wood.webp` at desktop 1280x800 (1280x800), theme `ashen-gold`:

| Text | `title` phase (plate at 1) | `menu` phase (plate at 0.3) |
| --- | --- | --- |
| Wordmark | 14.9:1 | 15.2:1 |
| Psalm line | 15.13:1 | 15.13:1 |

```json legibility-baseline
{
  "plate": "assets/images/title/lion-in-the-wood.webp",
  "sha256": "2540f0206ef7b144e365b3adf5041064a0d641a2e933c93bdff840680407e495",
  "viewport": {
    "name": "desktop 1280x800",
    "width": 1280,
    "height": 800,
    "topInset": 0
  },
  "theme": "ashen-gold",
  "figures": {
    "wordmark.title": 14.9,
    "psalm.title": 15.13,
    "wordmark.menu": 15.2,
    "psalm.menu": 15.13
  }
}
```
<!-- legibility:baseline:end -->
