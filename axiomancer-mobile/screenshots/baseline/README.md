# Visual-smoke baselines

This directory holds the committed reference screenshots that
`scripts/smoke-screens.mjs` (npm run `verify:visual`) diffs against.

## Filename contract

One PNG per route, named after the route's stable `name` in
`scripts/smoke-screens.mjs:ROUTES`:

| File | Route | Source screen |
| --- | --- | --- |
| `root.png` | `/` | redirects to the active tab |
| `character.png` | `/character` | `app/(tabs)/character/index.tsx` |
| `inventory.png` | `/inventory` | `app/(tabs)/inventory/index.tsx` |
| `exploration.png` | `/exploration` | `app/(tabs)/exploration/index.tsx` |
| `combat-encounter.png` | `/combat-encounter` | `app/combat-encounter/index.tsx` |
| `memoir.png` | `/memoir` | `app/(tabs)/memoir/index.tsx` |
| `labyrinth.png` | `/labyrinth` | `app/labyrinth/index.tsx` |
| `dialogue.png` | `/exploration` + fixture `apprentice-staged-dialogue` → `/dialogue` | `app/dialogue/index.tsx` |
| `village.png` | `/exploration` + fixture `wanderer-staged-village` → `/village` | `app/village/index.tsx` |
| `cutscene.png` | `/exploration` + fixture `wanderer-staged-cutscene` → `/cutscene` | `app/cutscene/index.tsx` |
| `hazard-board.png` | `/exploration` + fixture `l30-bw-hazard-arrive` → `/hazard`, risk route picked, dice settled | `app/hazard/index.tsx` (the live board; the puzzle board's parity baseline) |
| `devpuzzle-board.png` | `/devpuzzle?id=demo-undercroft-hard&route=risk&paused=1` + fixture `fresh-start` | `app/devpuzzle/index.tsx` (the puzzle on the live board) |
| `devpuzzle-outcome.png` | `/devpuzzle?id=demo-undercroft-hard&route=risk&confirm=1` + fixture `fresh-start` | `app/devpuzzle/index.tsx` (outcome panel) |

The three fixture rows (2026-09-08) boot the app from a state fixture
(`docs/state-fixtures.md` at the monorepo root) in a second browser
context with dev tools forced, then wait for the gate to push the
route; the plain rows stay unforced. Their baselines were rendered in
the container Chromium 1194 (`SMOKE_CHROME`); the seven pre-existing
baselines (2026-09-02) already differ under that renderer by 0.9–10%,
so a differing run needs eyeballing, not a blind re-approve.

`/combat` is intentionally not a visual-smoke baseline route while it renders
the unseeded placeholder `THE FIELD STIRS.`. The canonical combat screenshot is
`combat-encounter.png`, which exercises the seeded Hazard-style combat surface.

Add a row when you add a route. PNGs are 390×844 (iPhone-13-ish
portrait, `deviceScaleFactor: 1`).

## How to update a baseline

1. Make the UI change.
2. Run `npm run verify:visual`. The script exits 1 and lists the
   routes that differ + writes diff PNGs into
   `screenshots/diff/`.
3. Eyeball the diffs. If they match the intent of your change,
   run `npm run baseline:approve` to promote
   `screenshots/current/*.png` over `screenshots/baseline/*.png`.
4. Commit the updated baseline PNGs **alongside** the code that
   produced them so the next CI run is green.

## First-run setup

The smoke script needs three devDeps and one Playwright browser
binary:

```
npm install                       # picks up playwright / pixelmatch / pngjs
npx playwright install chromium   # ~150MB browser download (one-time)
```

Then run `npm run verify:visual` once to generate the initial
baselines (the first run exits 2 with "missing baseline" for
every route — that's the seed signal, not a failure).
