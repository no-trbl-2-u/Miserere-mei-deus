# 161 — A second death reaches the Game Over screen

> Dying while already dying ends the run, and the game has a Game Over screen for that moment. A real run never reaches it: the player lands on the opening windmill scene instead. This spec makes a run end show Game Over, then character select, as it was built to.

## Why

### Sources

- **T, 2026-11-08,** after a browser playthrough reported that losing a fight replayed the opening scene: "a new plot for 5".

### What exists today (read 2026-11-08, at 9ebb8e890)

- **The rule** (`axiomancer-mechanics/src/Game/death.ts`): a first death revives the player on the node they walked from, with 1 VITAE and `dying` set. A death while dying ends the run: `runOverState`, no character, the codex kept, `runOver: true`.
- **The route** (`axiomancer-mobile/app/combat-encounter/index.tsx`, `onExit`): on `playerDied('fight') === 'revived'` it goes to `/death-return`. Otherwise, when `store.getState().runOver === true`, it saves, arms Game Over and does `router.replace(runEndRoute(slot))`. `state/run-end.ts` says every path that meets a run end routes to Game Over, then character select for the slot. `app/hazard/index.tsx` has the same run-end branch.
- **The screen** (`app/game-over/index.tsx`, phase CH1j): a title, one line and NEW CHARACTER, which opens character select for the slot. T asked for it on plot PR #1181.

### What a real run does (measured 2026-11-08, web export, 390 x 844)

A new game, walked to the first fight (`bw-w2`, the Gallows Crossroads), every turn passed:

1. **First death: correct.** Defeat summary, then `/death-return`, then back on the map at the Windmill.
2. **Second death: wrong.** Walked into the same fight at 1 VITAE and lost. After the Defeat summary the app was on `/cutscene` showing the opening windmill scene. `game-over` was never on screen in the 10 seconds polled, and neither was character select.

The cause is not established. One lead: the run-over state has a fresh world on the Windmill, whose arrival cutscene is a pending event, so the event gate may route to `/cutscene` ahead of, or over, `/game-over`. The build confirms or rules that out first.

## Design

- A run end on the map, from a fight or a hazard, shows Game Over. NEW CHARACTER opens character select for the slot, and only CONFIRM there starts the next run, with the codex kept. The opening scene plays after that CONFIRM, as for any new character.
- A first death is untouched: `/death-return`, then the map, dying.
- Reloading on the Game Over screen keeps today's behaviour: straight to character select.

### Decisions made upfront (do not ask)

- This is a routing fix. The death rule, what a run end keeps, and the Game Over screen's look and words do not change.
- The Labyrinth's defeat path is checked by the same test where it shares the code, and otherwise left alone.

### Out of scope

- The Game Over screen's placeholder copy (authored content, D88).
- Dev tools that start a fight from the first node without walking there.

## Sources

- **T, 2026-11-08,** on the review findings left open after `/pilot 159.6 161.1`: "Yes plot the test gaps". Review verdict on PR #1473, MED at `state/e2e/run-end-no-arrival.engine.test.tsx:100`, with the LOW at line 78.
- **Read 2026-11-08, at 42f80962c.** The test calls `actions.resolveCurrentMapEvent()` and never asserts a scene is pending. `selectPacedEventRoute` returns null first when `selectHasActivePacedEvent` is false, so with nothing pending the test passes without the guard. The first test does not pin it either: the map's own run-over guard keeps `mockPush` empty.

## Acceptance

- **A5** A test fails if `selectPacedEventRoute`'s run-over guard is removed: it holds a run-over state with a cutscene really pending, asserts that it is pending, and asserts the route is null.

## Open questions

none

## Chunks

Measure: 1 open · 4 closed · next A6


### 161.1 (GO1a) — A second death reaches Game Over, not the opening scene · M · closes A1, A2, A3, A4 · requires —

- Reproduce first: a browser run of the sequence in "What a real run does", logging each route and which of `game-over`, character select and the cutscene are on screen. Name the cause in the PR.
- Fix the routing at its cause. Candidates to read: `app/combat-encounter/index.tsx` `onExit`, `app/hazard/index.tsx`, `state/run-end.ts`, `state/game-over.ts`, and the event gate that pushes `/cutscene`. The event gate must not fire for a run-over state.
- Tests: a run-over state routes to Game Over and starts no arrival cutscene; a first death still reaches `/death-return`; the hazard path; NEW CHARACTER reaches character select for the slot.
- Measure: the mobile gate run piecewise with a worker cap, then the browser sequence above run once, its route log and shots of the Game Over screen and character select in the PR body.
- [ ] **161.2** The second run-end test really has a scene pending · S · closes A5 · needs — · alias: GO1b
  - Test only: `axiomancer-mobile/state/e2e/run-end-no-arrival.engine.test.tsx`, the case "the event gate names no route for a run-over state, even with a scene pending". No change to app code.
  - Put a cutscene in `event.pending` on the run-over state (through `actions.resolveCurrentMapEvent()` if that really leaves one, otherwise set it on the store), assert `store.getState().event.pending?.event.kind` is `cutscene` and `selectHasActivePacedEvent` is true, then assert the route is null.
  - Measure: delete the `state.runOver === true` line from `selectPacedEventRoute` and show the case red, restore it and show it green, both in the PR body. Jest on that file with `--maxWorkers=1`.
