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
| `deck.png` | `/deck` | `app/(tabs)/deck/index.tsx` |
| `settings.png` | `/settings` | `app/(tabs)/settings/index.tsx` |
| `exploration.png` | `/exploration` | `app/(tabs)/exploration/index.tsx` |
| `combat-encounter.png` | `/combat-encounter` | `app/combat-encounter/index.tsx` |
| `combat-elite.png` | `/exploration` + fixture `wanderer-bw-elite-arrive` → `/combat-encounter`, the elite's reveal with its ELITE chip | `components/combat/encounter/CombatEncounterPanel.tsx`, `RevealGround.tsx` |
| `combat-boss.png` | `/exploration` + fixture `wanderer-bw-boss-arrive` → `/combat-encounter`, the boss's held title card | `components/combat/encounter/BossTitleCard.tsx`, `RevealGround.tsx` |
| `combat-board.png` | `/combat-encounter` entered as `combat-encounter` is (seed 16, the lowest-level standard foe), then ENTER COMBAT pressed, dice at rest; waits on a testID for each brass place (intent badge, conviction chip, momentum chip, dock, END, player medallion, player VITAE bar) and carries its own 0.1% diff line | `components/combat/encounter/CombatBoard.tsx`, `CombatFooterDock.tsx`, `CombatCombatantPane.tsx` (the fight's board) |
| `memoir.png` | `/memoir` | `app/(tabs)/memoir/index.tsx` |
| `labyrinth.png` | `/labyrinth` | `app/labyrinth/index.tsx` |
| `dialogue.png` | `/exploration` + fixture `apprentice-staged-dialogue` → `/dialogue` | `app/dialogue/index.tsx` |
| `village.png` | `/exploration` + fixture `wanderer-staged-village` → `/village` | `app/village/index.tsx` |
| `cutscene.png` | `/exploration` + fixture `wanderer-staged-cutscene` → `/cutscene` | `app/cutscene/index.tsx` |
| `quest-locked.png` | `/exploration` + fixture `wanderer-bw-keep-gate-locked` → `/quest`, the gate warden turning the player away (only step 1 turned in), waits on `quest-locked` | `app/quest/index.tsx`, `components/quest/QuestCard.tsx` |
| `quest-paid.png` | `/exploration` + fixture `wanderer-bw-bridge-paid` → `/quest`, the chain's last card marked paid (all four steps turned in), waits on `quest-card-paid` | `app/quest/index.tsx`, `components/quest/QuestCard.tsx` |
| `quest.png` | `/exploration` + fixture `wanderer-bw-keep-gate-offer` → `/quest`, the gate warden's offer (steps 1 to 3 turned in), waits on `quest-offer` | `app/quest/index.tsx`, `components/quest/QuestCard.tsx` (the quest card, spec 173) |
| `travel.png` | `/exploration` + fixture `wanderer-bw-door-arrive` → `/travel` | `app/travel/index.tsx` (the river bridge's "Move to The Charcoal Wood?") |
| `travel-cave.png` | `/exploration` + fixture `wanderer-bw-cave-mouth-arrive` → `/travel` | `app/travel/index.tsx` (the sea cave mouth's "Move to The Cave Face?", the map zoomed on the Cave Face) |
| `death-return.png` | `/death-return?preview=1` + fixture `fresh-start` | `app/death-return/index.tsx` (the full-screen moment after a first death) |
| `hazard-board.png` | `/exploration` + fixture `l30-bw-hazard-arrive` → `/hazard` (the injector's pinned hazard id keeps the three-round board), risk route picked, dice settled | `app/hazard/index.tsx` (the three-round board, still on every non-Breakwater hazard; the puzzle board's parity baseline) |
| `hazard-puzzle-stakes.png` | `/exploration` + fixture `l30-bw-hazard-arrive`, hazard-id pin dropped → `/hazard`, the stakes card with the one goal | `components/hazard/puzzle/HazardPuzzleNodeBoard.tsx`, `state/presenters/hazard-stakes.engine.ts` (HP6c) |
| `hazard-puzzle-node.png` | `/exploration` + fixture `l30-bw-hazard-arrive`, hazard-id pin dropped → `/hazard`, Face it pressed, dice settled, clock held | `components/hazard/puzzle/HazardPuzzleNodeBoard.tsx` (a Breakwater hazard's puzzle, HP6c) |
| `rest-upgrade.png` | `/exploration` + fixture `apprentice-bw-rest` → `/rest`, UPGRADE A CARD tapped (`tapTestId`), waits on the figure, the centre bead, HOLD and the way back | `components/upgrade/CardUpgradePicker.tsx` at `app/rest/index.tsx` (the string of beads, spec 127 A17; the Anvil and the elite reward host the same screen) |
| `cache.png` | `/exploration` + fixture `apprentice-cw-cache` (the cave cache, cw-6) → `/cache`, the choice, seed pinned by the injector | `app/cache/index.tsx` (plan 174: top bar, picture band, two rows each with a brass TAKE) |
| `cache-goods.png` | the same, TAKE THE GOODS tapped (`tapTestId`) | `app/cache/index.tsx` (the gold band, a row per good, the shillings, MOVE ON) |
| `cache-card.png` | the same, TAKE A CARD tapped (`tapTestId`) | `app/cache/index.tsx` (the card picture band, the one card in `CombatCardFace`, MOVE ON) |
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

## Layout pins versus the `combat-board` route

The fight's board has two nets, and neither replaces the other.
`components/combat/encounter/__tests__/CombatBoard.layout-pins.test.tsx`
pins element boxes and a few `transparent` colours in jest; the
`combat-board` route here shoots the painted board in Chromium.

| | Layout pins (jest, jsdom) | `combat-board` route (Chromium, CI) |
| --- | --- | --- |
| Catches | an element moved or resized by a pixel; a `transparent` colour that came back opaque | art, colour, text, z-order, overflow and clipping, fonts, a missing or doubled element, anything painted |
| Blind to | art, colour, fonts, how anything actually paints | a small move or recolour under its threshold (0.1%); anything on a state it does not shoot |
| Runs | every PR, in `npm test`, seconds, any machine | in CI on the renderer of record; report-only; a local run is advisory |
| Fails by | going red | a diff image in the PR and a re-stamp commit T merges |

If a change moves the dock, both react: the pin fails, and the route shows
the new pixels. Delete the pins and a half-pixel shift passes unseen; delete
the route and a recolour passes unseen.

The route shoots the opening board only, and it refuses to stamp a board
with a piece missing: `expectTestIds` makes an absent place a `load-failed`
route, which the re-stamp never commits. A route may carry its own
`maxDiffRatio` (the board's is 0.1%, about 330 px of 329,160); every other
route keeps the global 0.5%. The harness launches Chromium with
`--disable-partial-raster`: with partial raster the board's fading hand and
moving foe left edge pixels a few levels off from load to load, so
`SMOKE_RUNS` reported the route nondeterministic; with full-tile raster five
loads are byte-identical (the other routes are unchanged to within one level
on two pixels).

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

   A local run shoots only the routes the branch's changes can reach
   (`scripts/lib/smoke-routes-for.mjs`, phase VE1d): the paths changed
   since the merge-base with `origin/main`, plus uncommitted and
   untracked files, mapped to routes. It logs `routes from diff: <names>`.
   A path no rule names, app-wide code (`app/_layout.tsx`, `state/`,
   `lib/`, `assets/`, shared components), the engine or the lockfile
   selects every route, and so does a diff with no rendered path in it.
   `SMOKE_ROUTES=all` shoots every route regardless (CI always passes
   it); `SMOKE_ONLY=<names>` overrides both.

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
