# 158 — The combat board gets a CI visual route, so the fight's brass and layout have a pixel net

> The fight board, where the whole game is played, is the one big screen CI never looks at. `smoke-screens`' `combat-encounter` route stops at the reveal card (ENTER COMBAT / WITHDRAW); nothing ever presses ENTER COMBAT, so no pixel of the board is checked. This spec adds that route.
>
> - **A `combat-board` route** in `smoke-screens`: the same seeded fight the reveal route enters, one click further, shot with the dice at rest.
> - **It refuses to stamp a board with a missing piece.** The route waits for each brass place to be on screen first, so a vanished badge fails the route instead of becoming the new baseline.
> - **It is told apart from the layout pins in writing**, so nobody deletes one believing the other covers it.
> - **Two plain tabs ride along** (Deck and Settings), since adding a row is nearly free.

## Why

### Sources

- T, 2026-11-07, shown the gap by chunk 152.3's run on PR #1422 and asked whether to plot it: approved, as a `/plot`.
- **The measured evidence** (chunk 152.3, PR #1422, CI run `42332201234` on `verify-mobile`). The visual step shot 19 routes twice in 56 s and reported `matched 18, differing 1`. The one difference was `combat-encounter`, the reveal: 8474 px, 2.574%, in two bands (`y375-425 / x107-283` and `y438-485 / x140-249`), which is S-01 and nothing else. The other 18 routes matched at ratio 0, with `nondeterministic 0`. So the harness is sound and its captures are exact; the board is simply absent from it.
- **What that leaves unwatched.** Of 152.3's five brass places only **S-01** is on a covered route. **S-03** (intent badge), **S-04** (conviction chip), **S-06** (player dock) and **S-09** (player VITAE bar) have no CI visual coverage, and neither do three of the four places T kept Normal: **S-05** (momentum chip), **S-07** (END) and **S-08** (player portrait ring). The board's only regression net is `CombatBoard.layout-pins.test.tsx` (ten pins: element boxes and a few `transparent` colour assertions, added by 152.3) plus whatever a chunk captures by hand.

### What exists today (read 2026-11-07, at origin/main)

- **The harness** (`axiomancer-mobile/scripts/smoke-screens.mjs`): 19 `ROUTES`, shot at 390x844 with `reducedMotion: 'reduce'`, diffed against `screenshots/baseline/<name>.png` with pixelmatch (per-pixel threshold 0.1, a route flags above 0.5% of pixels). CI runs it as the report-only visual step with `SMOKE_ROUTES=all` and `SMOKE_RUNS=2`: every route is shot twice and a route whose two captures differ is `nondeterministic` and never re-stamped. A new route with no baseline is `missing`, and the re-stamp job commits its CI render into the PR, so the new baseline arrives as an image diff T can review.
- **The live-fight route** (`combat-encounter`): `enterLiveFight(page, baseUrl, { seed: 16 })` in `scripts/live-fight-entry.mjs` boots `/character` with `__AXM_FORCE_DEV_TOOLS__` and `__AXM_COMBAT_SEED__ = 16` set before the bundle, follows the SELF tab's dev link to `/dev`, opens ENCOUNTERS, presses `debug-trigger-encounter-encounter`, and resolves when `combat-reveal` is visible. It never presses `combat-enter`.
- **Five other drivers already click through**, with the same seed (16) and the same viewport: `critique-drive.mjs` (`combat-board`), `fresh-eyes-capture.mjs` (`combat-board`), `perf-web.mjs`, `combat-drag-perf.mjs` and the fixture gallery (`boss-board`). Each presses `combat-enter` with `force: true`, waits for `combat-board`, and `critique-drive` then waits for the dice-skip layer (`combat-dice-skip`) to detach (`diceSettled`). The step is written five times and shared nowhere.
- **The layout pins** (`components/combat/encounter/__tests__/CombatBoard.layout-pins.test.tsx`, from 152.3, PR #1422): jest, jsdom, no renderer.
- **Route selection** (`scripts/lib/smoke-routes-for.mjs`): a local run shoots only what the changed paths reach. `components/combat/` and `app/combat-encounter/` map to `['combat-encounter']`; `components/hazard/` maps to the hazard routes plus `combat-encounter`.

## Design

### Reaching the board, and why it will hold still

`enterLiveFight` needs one more step, and the step already exists in the other drivers: press `combat-enter`, wait for `combat-board`, wait for the dice-skip layer to detach, then `waitForReady`. It becomes an option, `intoBoard: true`, so every current caller keeps stopping at the reveal and the five hand-written copies can move to it later. The question that decides whether the route is worth having is whether the capture is the same every time. Each way it could drift, and what holds it:

| What could drift | What holds it |
|---|---|
| The deal: shuffle, dice faces, the foe's move pick, the enemy-art frame pick | The engine seed. `__AXM_COMBAT_SEED__ = 16` is read by `app/combat-encounter/index.tsx` (`readDevSeed`), honoured only because `enterLiveFight` sets `__AXM_FORCE_DEV_TOOLS__`, and passed to `initializeCombatEncounter`. The one `Math.random` in the panel (`CombatEncounterPanel.tsx`, the seed stamp) runs only when no seed arrived, which the route never does. |
| The foe | `debug-trigger-encounter-encounter` seeds "the lowest-level standard foe on the current map" (`DebugTriggerEncounter.tsx`), on a fresh boot's map. Same boot, same foe. It moves only when the library or the map does (spec 157 will move it), and that is a real content change, not a flake. |
| The player's kit and deck | A fresh boot at `/character`: the new-game state and its starting loadout, the same as the reveal route's. |
| Motion | The context sets `reducedMotion: 'reduce'`. Dice resolve `instant` (`resolveRollMode`), frame sets hold still (`useFramePlayback`: "stillness is not a degraded mode"), juice resolves instant. `diceSettled` waits on the tumble layer anyway, as a second signal. |
| Time | No wall-clock read paints the board. The only `Date.now` in the combat components is a 350 ms debounce on the card-detail popup. The combat screen has no clock; the clock the hazard routes pause is a hazard thing. |
| The click | `combat-enter` is pressed with `force: true`, then the route waits for the board, the dice layer and `waitForReady`. Three signals, not a sleep. |
| The renderer | CI's Linux Chromium is the renderer of record. A Windows or macOS shot is advisory, as the baseline README says; this route follows the same rule. |

**Proof, not argument.** CI already shoots every route twice (`SMOKE_RUNS=2`) and never re-stamps a route whose captures differ, so a drifting board cannot become a baseline silently. The first chunk also runs `SMOKE_ONLY=combat-board SMOKE_RUNS=5 npm run verify:visual` locally: byte-identity across five loads is a property of the page, not of the renderer, so a Windows run settles determinism (exit 2, missing baseline, passes; exit 4 fails the chunk). Confidence: good, not certain. The reveal route sits on the same seed, foe and motion settings and came out identical across its two loads on the CI run read above (`nondeterministic 0`), its only diff being 152.3's intended change; what is new is the dealt board (hand, dice, dock), which is all seeded. I have not run it, so the five-load check is the chunk's first gate, not a formality.

### A board with a piece missing is not a baseline

The visual gate compares to whatever was last stamped. If a change makes the intent badge disappear, the re-stamp would commit a board without it and the next run would call that green. So the route waits on the testID of each place 152.3 names before it shoots: the intent badge, the conviction chip (`combat-conviction`), the momentum chip (`combat-momentum-v2`), the player dock, END (`combat-end-phase`), the player portrait and the player VITAE bar. An absent place is a `load-failed` route, which is never re-stamped. The builder reads each testID off the board (the momentum chip may render only when there is a chain; if so it is left off the wait list and the PR says so, which is the evidence for the second state below).

### Which states to stamp

**The opening board, and only that, for now.** It is the state every fight starts in and the one the five places live on: the foe's intent is telegraphed from the first round, the hand is dealt, the dock is full, both VITAE bars are at their opening values, and the conviction chip renders at zero. A second state earns its keep only if the opening board leaves a place unshown, and the testID wait above turns that from a guess into a finding the first chunk reports.

The candidate second state is "one card staged and applied": it would show the play area occupied, VITAE spent, and a momentum chain. It is not in this plot because getting there needs a pointer drag from hand to play area, the one input in the harness that needs a retry loop (`perf-web.mjs` drags up to three times and re-checks), and a retry loop is exactly the shape that makes a capture flake. If the opening board proves to leave places out, plot that state then, with its own determinism proof. (`[T to confirm #2]`)

### The threshold the board should carry

`smoke-screens` flags a route above 0.5% of its pixels: 1,645 of the 329,160 in a 390x844 shot. The reveal's whole re-stamp was 8,474 px, but the places on the board are small. A conviction chip is about 80x38 = 3,000 px; the intent badge and a VITAE bar's fill are less. A badge that turns the wrong colour could change a few hundred pixels and stay under the line, while the layout pins, which see only boxes, would not notice a colour. The harness's evidence is that identical code matches at exactly ratio 0, so a tight threshold costs no noise on the renderer of record. The route carries its own ratio, 0.1% (329 px, about an 18x18 block of glyph); the global stays at 0.5% for the 19 routes that already match at 0. (`[T to confirm #1]`)

### What it costs, and where it lives

- **Runtime.** CI's visual step took 56 s for 19 routes shot twice (38 shots, 1.5 s each on average). A live-fight route is the slowest kind: it boots, walks to `/dev`, opens a section and presses a button before it shoots, in a fresh context per shot. My estimate is 5 to 6 s a shot, so the board adds about 10 to 12 s to the step, roughly a fifth. That is an estimate, not a measurement; the first chunk's PR quotes the step summary's `capture` figure before and after. Locally a change under `components/combat/` already selects the reveal route, and will now select the board too.
- **Flake exposure.** A longer click path has more places to time out. The step is report-only and `continue-on-error`, so a timeout is a `load-failed` row and a noisy comment, never a red check; a route that fails to load is never re-stamped. The cost of a flake is a rerun, not a blocked merge.
- **It belongs in `smoke-screens`, not a separate job.** A separate job would repeat the web export (the expensive part, cached by stamp in this step), would split the summary the re-stamp job reads from one artifact into two, and would give up the free `SMOKE_RUNS=2` determinism check. Nothing about the board needs a different environment.

### What the pins are for and what the route is for

They overlap and neither replaces the other. Chunk 158.1 writes this into the baselines README and into the pins test's header comment.

| | Layout pins (jest, jsdom) | `combat-board` route (Chromium, CI) |
|---|---|---|
| Catches | an element moved or resized by a pixel; a `transparent` colour that came back opaque | art, colour, text, z-order, overflow and clipping, fonts, a missing or doubled element, anything painted |
| Blind to | art, colour, fonts, how anything actually paints | a small move or recolour under its threshold (0.1%); anything on a state it does not shoot |
| Runs | every PR, in `npm test`, seconds, any machine | in CI on the renderer of record; report-only; a local run is advisory |
| Fails by | going red | a diff image in the PR and a re-stamp commit T merges |

If a change moves the dock, both react: the pin fails, and the route shows the new pixels. Delete the pins and a half-pixel shift passes unseen; delete the route and a recolour passes unseen.

### Other screens with the same hole

Checked against `app/` and the 19 `ROUTES` (2026-11-07). Not expanded here except the two tabs, which are one row each:

- **Tabs with no route: Deck (`/deck`) and Settings (`/settings`)**, two of the six tab-bar screens. Spec 155 rebuilds the Deck and 152.6 restyles Settings, so both are about to change. Chunk 158.2 adds them.
- **Node screens with a fixture but no baseline:** rest, loot cache, quest, blacksmith, item-reward. `fresh-eyes-capture.mjs` and the fixture gallery already shoot rest, cache and the blacksmith, with no diff behind them. Spec 154 restyles most of them. Not added (`[T to confirm #4]`).
- **Menus with no route:** saves, character-select.
- **The fight's end states:** the summary, the Spoils (`combat-rewards`; 152.4 just restyled it) and the mercy screen. Reaching one needs a won fight, which no dev trigger gives cheaply; it is its own piece of work, not a row.
- Covered and fine: the title (`root`), Self, Satchel, Wilds, the Ledger, the Labyrinth, dialogue, village, cutscene, travel, the hazard board and its two puzzle states, death-return, game-over, and the three dev puzzle routes. The hazard-deck screen is going (153.5), so it is not a gap.

### Out of scope

- A second board state (see above).
- Moving the five drivers that press `combat-enter` by hand onto the new option. It is a mechanical clean-up with no gate value; the option exists so a later chunk can do it.
- The fight's end states.
- Any change to the board itself, to `CombatBoard.layout-pins.test.tsx`'s assertions, or to the global 0.5% threshold.

### Decisions made upfront — DO NOT ASK

1. **The route is `combat-board`, beside `combat-encounter`, and keeps the reveal route as it is.** Two routes, two baselines: the reveal and the board fail separately.
2. **Seed 16 and the lowest-level standard foe**, the reveal route's own, so the two routes show the same fight. (`[T to confirm #3]` on pinning a named foe instead.)
3. **`intoBoard` is an option on the shared helper**, default off.
4. **A place that does not render fails the route**; it is never stamped around.

## Contracts

`enterLiveFight(page, baseUrl, { seed, kind, timeout, intoBoard })`: `intoBoard` defaults to `false`; when `true` the promise resolves once `combat-board` is visible and the dice layer has detached. A `ROUTES` entry may carry `maxDiffRatio` (default `DIFF_THRESHOLD_RATIO`) and `expectTestIds` (a list the route waits on before it shoots). No other signature changes.

## Open questions

1. How tight should the board's diff line be? Default: 0.1% for this route only (about 330 px), because the board's places are small and an exact-match renderer makes it free. Or: leave the global 0.5% and accept that a small badge can change colour unflagged; or 0.05% for a still tighter net. [T to confirm #1]
2. Should a second board state be stamped now? Default: no. The opening board shows every place unless the first chunk's wait finds one missing, and the second state needs a drag that can flake. Or: add "one card staged and applied" now. [T to confirm #2]
3. Which foe? Default: the same lowest-level standard foe as the reveal route, so a roster change (spec 157 is one) re-stamps both together and honestly. Or: pin a named Chapter 1 keeper by id through the dev menu's per-foe buttons, so a roster change cannot move the board. [T to confirm #3]
4. Should the other uncovered node screens (rest, loot cache, quest, blacksmith, item-reward) get routes too? Default: no, only named here; the two tabs are the only extra rows. Or: add them in 158.2, a fixture row each, about 3 s of CI apiece. [T to confirm #4]
5. Where does it sit in line? Answered by T (2026-11-07): the Asap lane, so 158.1 lands before 153.4 changes the dock. The guard only works if it exists first: in table order, 153.4's dock change would be stamped as the new baseline instead of diffed against the old one, losing the one comparison that shows what 153.4 did. 158.1 waits on 152.3 either way, so the lane costs a line and no extra waiting. The lane line heads the lane, since its `needs 152.3` already holds it back and the lane's other chunks are not blocked by it. 158.2 stays in table order.

## Chunks

Measure: 0 open · 7 closed · next A8


### 158.1 (VR1a) — The combat board gets a visual route · M · closes A1, A2, A3, A4, A5, A6 · requires 152.3

- `scripts/live-fight-entry.mjs`: add `intoBoard`, the steps in the Design section. `scripts/smoke-screens.mjs`: the `combat-board` row, `maxDiffRatio` and `expectTestIds` on the route type and their use in `shootRoute` and the compare. `scripts/lib/smoke-routes-for.mjs`: the selection rules. `screenshots/baseline/README.md`: the row and the pins-versus-pixels section. The pins test: its header comment.
- Read the testID of each place off `CombatBoard.tsx` and the dock (the S-numbers are in spec 152's table); list them in the PR with whether the opening board renders them.
- Needs 152.3 so the first stamp is the brass board T kept, and so the pins file exists to be named. Do not stamp the baseline by hand: the CI re-stamp commits the Linux render into the PR.
- Tests: `smoke-screens.test.mjs` (the ratio rule and `expectTestIds`), `smoke-routes-for.test.mjs` (the rules). Hermetic: no browser in jest.
- Measure: `SMOKE_ONLY=combat-board SMOKE_RUNS=5 npm run verify:visual -w axiomancer-mobile` exits 2, then `npm run verify -w axiomancer-mobile` (run piecewise with a worker cap). The PR quotes the CI step summary's `capture` time before and after, and carries the board as the re-stamp's image diff.

### 158.2 (VR1b) — The Deck and Settings tabs get routes · S · closes A7 · requires —

- Two `ROUTES` rows (`deck` at `/deck`, `settings` at `/settings`, unforced context like `character` and `inventory`), the `app/(tabs)/deck/` and `app/(tabs)/settings/` selection rules, the README rows. The re-stamp commits the baselines.
- Both screens are about to change (specs 155 and 152.6), so these baselines will re-stamp as those land; that is the route working, not a flake. If the Settings tab shows anything time-dependent, wait it out and say so.
- Measure: `SMOKE_ONLY=deck,settings SMOKE_RUNS=5 npm run verify:visual -w axiomancer-mobile` exits 2, then `npm run verify -w axiomancer-mobile`.

<!-- Not chunked yet: hand absorb in progress -->
