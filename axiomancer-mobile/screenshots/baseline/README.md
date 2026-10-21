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
| `devpuzzle-list.png` | `/devpuzzle` + fixture `fresh-start` | `app/devpuzzle/index.tsx` (the demos, then the candidates grouped easy, medium, hard) |
| `devpuzzle-board.png` | `/devpuzzle?id=demo-undercroft-hard&route=risk&paused=1` + fixture `fresh-start` | `app/devpuzzle/index.tsx` (the puzzle on the live board) |
| `devpuzzle-outcome.png` | `/devpuzzle?id=demo-undercroft-hard&route=risk&confirm=1` + fixture `fresh-start` | `app/devpuzzle/index.tsx` (outcome panel) |

The fixture rows boot the app from a state fixture
(`docs/state-fixtures.md` at the monorepo root) in a second browser
context with dev tools forced, then wait for the gate to push the
route; the plain rows stay unforced.

## Renderer of record

The baselines are what **CI's Linux Playwright Chromium** renders on
`ubuntu-latest`: the Chromium that the `playwright` version pinned in the
root `package-lock.json` installs (1.61.1 at the time of writing). A
capture from Windows or macOS is **advisory**: glyph-edge noise of a few
percent on an unchanged screen is the renderer, not the UI, and is
enough on its own to cross the 0.5% threshold. Never approve a baseline
from a Windows or macOS run; `npm run baseline:approve` warns there.

Every script shares one web export, `.smoke-dist`, written by
`scripts/lib/web-export.mjs`. It carries a stamp (`.axm-export-stamp`,
a hash of the files that reach the bundle) and is reused while the stamp
matches the tree; `AXM_FORCE_EXPORT=1` re-exports.

`/combat` is intentionally not a visual-smoke baseline route while it renders
the unseeded placeholder `THE FIELD STIRS.`. The canonical combat screenshot is
`combat-encounter.png`, which exercises the seeded Hazard-style combat surface.

Add a row when you add a route. PNGs are 390×844 (iPhone-13-ish
portrait, `deviceScaleFactor: 1`).

## How to update a baseline

1. Make the UI change and open its PR.
2. CI renders the routes on the renderer of record. The PR's new
   captures over `screenshots/baseline/*.png` are committed to the PR
   (`visual: re-stamp <routes> (CI render ...)`), so the PR's image diff
   (two-up, swipe, onion skin) is the review surface.
3. T approves the new pixels by merging the PR, or requests changes in
   it.
4. Locally, `npm run verify:visual` lists the routes that differ and
   writes diff PNGs into `screenshots/diff/`; read them as advisory on
   any machine but the renderer of record. `npm run baseline:approve`
   (current over baseline) stays for a capture taken on that renderer,
   such as a Linux container.

The re-stamp is CI's report-only visual step (phase VE1c, `verify-mobile`
and `verify-mechanics` through `_visual-restamp.yml`): it never turns a
check red, writes the route table to the step summary, uploads the
captures as `visual-smoke-<sha>`, and on a same-repo PR commits the
differing and missing routes (never a route whose two captures differ)
and posts one `<!-- visual-smoke -->` comment. A fork PR gets the summary
and the artifact only.

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
