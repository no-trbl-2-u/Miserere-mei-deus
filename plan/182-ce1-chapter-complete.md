# 182 — Chapter 1 ends on a chapter complete screen with the run's stats

> Crossing the bridge out of the Breakwater shows a chapter complete screen with the run's stats, where today a toast names the next region and the player is dropped into the Charcoal Wood.

## Why

### Sources

- **T, 2026-11-14 (attended, after the Chapter 1 gap audit, `plan/chapter1-gaps.md`):** asked what should happen at the far bank, T answered "Create a chapter complete screen and show stats".
- **The audit's finding:** Chapter 1 has no end. A run that beats the Saint Beneath and crosses the bridge gets one toast and stands in a map of placeholders.

### What exists today

- **The crossing.** `takeTravelAction` (`axiomancer-mobile/state/travel/store-actions.ts`) takes the trip, and when the map underfoot was `STARTING_MAP` and the next one is not, calls `recordRunClosed(before, 'chapter-clear')`, sets the new world, shows `TRAVEL_COPY.crossedToast(region)` and saves. Nothing else marks the chapter's end.
- **The run log already closes the run there** with the outcome `chapter-clear`, the end node, the level, VITAE, nodes resolved and the end deck (`state/run-log.ts`, `recordRunClosed`). The nightly sim stops at the same point (`sim/run-driver.ts`).
- **What the state can count without new bookkeeping:** the player's level, VITAE and maximum VITAE, shillings, the deck, the worn relics and equipment, the nodes spent (`countResolvedNodes`), the quest log's completed steps, and the foes beaten (`GameState`'s beaten-foe slugs, `Game/types.ts`). Whether a count of deaths or of foes spared exists in the state was not found; the first chunk checks.
- **Screens to copy the manner of:** the victory screen with its level panel (phase FE1a, FE1b) and the death return (`app/death-return`).
- **The Charcoal Wood** opens on a slot scene (phase SS1d) and is otherwise placeholder content.

### The small version first

The facts are already in the state and the run log already knows the moment. The small version is one pure summary function and one screen shown at that moment, then the crossing goes on as it does today. No new save data.

## Design

### The summary (A1)

- A pure function in the mobile presenters reads the game state as it stands on the far bank, before the crossing, and returns the chapter's stats. The list, in order: level reached; VITAE of maximum; nodes resolved of the chapter's nodes; fights won; quest steps completed of four; shillings; cards in the deck; relics worn. [T to confirm #1]
- A stat the state cannot give truthfully is left off the screen, never estimated. If the state holds a count of deaths or of foes spared, each joins the list after fights won; if not, neither is added and no new counter is built here.

### The screen (A2)

- A new route `/chapter-complete`, opened by the far bank crossing out of the Breakwater in place of the toast. It shows a title line, the chapter's name, the stats as label and number rows, and one button.
- Words on it are labels only: `CHAPTER COMPLETE`, `THE BREAKWATER`, the stat labels and `CONTINUE`. It carries no narration. A line of narration is the Narrator's (spec 177's surfaces and T's text work) and is not added here.
- Looks: the victory screen's ground, type and brass button, so it reads as the same family. The numbers use tabular figures. It fits a phone at 375 px wide without clipping.
- `CONTINUE` takes the crossing exactly as today: the Charcoal Wood's world, its arrival scene, the checkpoint save. [T to confirm #2]
- The run log's `chapter-clear` close fires once, when the screen opens, as it does today at the crossing.
- A save made on the screen and reopened lands on the far bank with the crossing still to take; the screen holds no state of its own.
- Only the crossing out of `STARTING_MAP` opens it. Every other travel (the cave shortcut, later chapters' crossings) is unchanged.

### Decisions made upfront (do not ask)

- No new save fields and no migration.
- The sim's `chapter-clear` stop and the nightly report are unchanged.
- No version bump: v0.9.0 is set when Chapter 1 is complete, by T.

### Out of scope

- Any narration on the screen.
- A chapter complete screen for Chapters 2 to 4.
- Closing the Charcoal Wood.

## Acceptance

- **A1** A pure summary function returns the chapter's stats from a game state, each one read from the state and none estimated; a test pins every stat on a fixture run and shows a stat the state lacks is absent.
- **A2** Crossing the bridge out of the Breakwater opens `/chapter-complete` with the title, the chapter's name, the stats and `CONTINUE`, and no toast; `CONTINUE` lands the player in the Charcoal Wood with the save made, as today. The cave shortcut opens no such screen. A phone-width screenshot is in the PR.

## Open questions

- [T to confirm #1] The stats shown. Default: level, VITAE of maximum, nodes resolved, fights won, quest steps, shillings, deck size, relics worn (deaths and foes spared only if the state already counts them).
- [T to confirm #2] What `CONTINUE` does. Default: the player walks on into the Charcoal Wood as today. Or: the run stops there and returns to the title until Chapter 2 ships.

## Chunks

Measure: 2 open · 0 closed · next A3
- [ ] **182.1** The chapter summary: the run's stats from the state · S · closes A1 · needs — · alias: CE1a
  - Mobile: a presenter `state/presenters/chapter-complete.ts` (pure, no store) and its copy file with the labels; reuse `countResolvedNodes` and the quest log's readers. Check first whether the state counts deaths and foes spared; add each only if it does.
  - Tests: a presenter test on a fixture state for every stat, red first.
  - Measure: mobile `npx tsc --noEmit`, lint and the whole jest suite pass.
- [ ] **182.2** The chapter complete screen at the far bank · M · closes A2 · needs 182.1 · alias: CE1b
  - Mobile: `app/chapter-complete/index.tsx`; `takeTravelAction` (or the travel screen that calls it) opens the screen on the crossing out of `STARTING_MAP` in place of the toast, and `CONTINUE` completes the crossing. Keep `recordRunClosed` firing once.
  - Tests: a screen test (the rows, the button, no toast), an e2e from the far bank through `CONTINUE` into the Charcoal Wood, and the cave shortcut opening no screen. Check siblings: the sim's run driver still ends at `chapter-clear`; the travel screen's tests; a smoke route and visual baseline for the new screen.
  - Measure: mobile `npx tsc --noEmit`, lint and the whole jest suite, and the root `npm test` pass; the screenshot is in the PR.
