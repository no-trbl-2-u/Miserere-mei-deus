# 147 — The mercy check's loose ends

> Text stops naming outcomes and words the game no longer has, a relic earned from a quest or an elite survives an app close, card reports count transforms and upgrades, and the tests the reviews flagged prove what they claim.

## Why

### Sources

- T, 2026-11-04, attended: "Do it", to the small things left after `/pilot 145`. They were the memoir tooltip, the possible lost rewards, the card reports, "parley" on the dialogue screen and the weak tests.
- The reviews of #1347, #1348, #1356, #1357 and #1359.

### What exists today (read 2026-11-04, at cbc672078)

- `state/presenters/tooltip.engine.ts`, `combat:ended`: "victory, defeat, retreat". `retreat` is a dead outcome; the engine never applies it, though `PLAY_LOG_FIGHT_OUTCOMES` keeps it for stored rows.
- `app/dialogue/index.tsx:190,203`: "No one is waiting. The parley is done." and "◉ PARLEY".
- `state/item-reward/relic-sources.ts`: `offerCompletedQuestItemsAction` takes a quest's item out of the inventory before offering it, and the elite offers queue theirs. `itemReward.queue` is never saved, so an app close before the answer may lose the item. This comes from reading the code and hasn't been reproduced. #1358 avoided it for Spare gear with `carried: true` (`offerSpareGearAction`, `state/item-reward/store-actions.ts`).
- `backend/src/reports.ts`: the card reports count `reward`, `cache-reward` and `remove`, so `transform` and `upgrade` rows are stored but never summarised.

## Design

**Words.** The tooltip names only the outcomes a fight can reach. The dialogue screen drops "parley" (default in #1 below). No play-log contract value changes: `retreat` and `mercy` stay readable for stored rows and older APKs.

**Rewards.** Write the failing test first: an elite relic, an elite piece and a quest item each survive an app close before the screen is answered, exactly once. If it passes, the bug isn't real for that source: say so and change nothing there. If it fails, route that source as Spare gear goes, already saved and offered with `carried: true`.

**Reports.** The card reports that count removals also show `transformed` (the card replaced), `transformed_into` (what it became) and `upgraded`, per card. Stay within D1's compound SELECT limit, as the comments there warn.

### Decisions made upfront (do not ask)

- All five items are in (T, 2026-11-04).
- No change to the check's chance, the table's weights, or any rule or price.

### Out of scope

- The Labyrinth's slain-on-retreat quirk, and its `exploited` outcome: both wait until the Labyrinth returns (T, 2026-11-03).
- Plots not settling, and the review tool's file limit: spec 148.

## Acceptance

- **A1** No player-facing text says parley, and the `combat:ended` tooltip names only reachable outcomes. [T to confirm #1]
- **A2** An elite relic, an elite piece and a quest item each survive an app close before the item reward screen is answered, granted exactly once, with a test per source that fails on today's code where the bug is real.
- **A3** The card reports show transformed, transformed-into and upgraded counts per card, with a backend test over stored rows.
- **A4** Each test the reviews flagged either fails without the behaviour it names or is deleted because a type now enforces it, and the sim test asserts `mercy.xp` and `mercy.shillings`.

## Open questions

1. What replaces "parley" on the dialogue screen? Default: "◉ WORDS" and "No one is waiting. The words are done." [T to confirm #1]

## Chunks

Measure: 4 open · 0 closed · next A5

- [ ] **147.1** Text names only what the game has · S · closes A1 · needs — · alias: MR3a
- [ ] **147.2** A quest or elite reward survives an app close · M · closes A2 · needs — · alias: MR3b
- [ ] **147.3** Card reports count transforms and upgrades · S · closes A3 · needs — · alias: MR3c
- [ ] **147.4** The flagged tests prove what they claim · S · closes A4 · needs — · alias: MR3d

### 147.1 (MR3a) — Text names only what the game has · S · closes A1 · requires —

- `state/presenters/tooltip.engine.ts`, `app/dialogue/index.tsx` (move the strings to a copy file if the screen has one), and any test that pins them. Search by content; line numbers move.
- Measure: `git grep -i parley -- axiomancer-mobile/app axiomancer-mobile/components axiomancer-mobile/state` finds nothing outside tests that name its absence, and `node scripts/check-prose.mjs` passes.

### 147.2 (MR3b) — A quest or elite reward survives an app close · M · closes A2 · requires —

- Tests first, in `state/e2e/`, beside `spare-gear.engine.test.ts`, per source. Then `state/item-reward/relic-sources.ts`. Keep `spare` and each source's log tag, and leave the walk scripts passing.
- Measure: the tests, both verify gates, and a run of `act1-walk-e2e`.

### 147.3 (MR3c) — Card reports count transforms and upgrades · S · closes A3 · requires —

- `backend/src/reports.ts`, its tests, and whatever reads those report columns.
- Measure: `npm run verify -w backend`.

### 147.4 (MR3d) — The flagged tests prove what they claim · S · closes A4 · requires —

- `Game/e2e/fight-wage.engine.test.ts`, `Items/e2e/healing-potions-only.engine.test.ts`, `Enemy/e2e/revamp-roster.engine.test.ts`, `Enemy/e2e/aftermath-lines.engine.test.ts`, `CombatEncounterPanel.mercy-check.test.tsx`, `state/e2e/codex-unlock-consumer.engine.test.ts`, `sim/run-fight.test.ts`.
- A test that only held on the parent commit because the behaviour is now a type error may be deleted, with a line saying so in the PR. Never add a test that fails when the game is merely different.
- Measure: both verify gates, and each changed test shown failing with its behaviour removed, noted in the PR.
