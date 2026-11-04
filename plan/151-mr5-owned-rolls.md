# 151 — Elite and spare rewards give only what you don't own

> An elite's relic or lane piece goes around anything a quest pays in that same fight, so the player keeps one copy. A spared foe's roll already does, and a test pins it. #1379's extra copy comes out, and an app close keeps a waiting item and misses only its screen.

## Why

### Sources

- T, 2026-11-04, `/pilot 149`: "Elites and spare rewards should only give you relic's, weapons, and armor you don't currently own".
- On an elite or spare roll meeting a same-fight quest: "Roll around the quest". The roll picks another item or drops nothing, the quest still pays, the player gets one copy, and #1379's extra-copy code comes out.
- On an app close: "Reword A5 only". The item is kept and only the ceremony is missed. Saved games don't change and the queue is not persisted. The corrected A5 is in spec 149's Rewards paragraph.
- On spare gear: "/plot the fix". `offerSpareGearAction` dedupes by item id only, so a spared foe's drop could lose its reward screen when a quest or elite entry for that item is queued. This spec finds that state unreachable, and pins it.

### What exists today (read 2026-11-04, at 8911bacbc)

**Already built, and stays.** `eliteRelicPool`, `rollEliteEquipmentDrop` (`equipmentDropPool`) and `rollSpareReward`'s gear and relic cases skip every item in the satchel or worn. The plain rule needs no work.

**The gap is timing.** `applyHazardOutcome` (`CombatEncounterPanel.tsx`) runs: elite relic roll, elite piece roll, `endCombat` (its reducer pays a kill's quest; the spare roll comes after that dispatch), `settleSpareAction`, then the quest's offer. The spare's offer waits for the end screen to close.

| Pair | Collide? | Why |
|---|---|---|
| Elite relic, same-fight quest | Yes | The roll comes first and can't see the payout. Probed through `applyHazardOutcome`: two copies. |
| Elite piece, same-fight quest | Yes | The same order. Probed: two copies. |
| Spare gear or relic, same-fight quest | No | `store.ts` rolls after `END_COMBAT`, from the player the quest has just paid. Probed with the engine rng pinned: a gear draw picks another piece; with the whole pool paid, the gear and relic draws pay shillings. |
| Elite, spare | Never in one fight | `rollMercyCheck` asks only of a `difficulty: 'normal'` foe, and the elite rolls need `isEliteEnemy`. |

**Spare gear's lost screen is not reachable.** `offerSpareGearAction` stops only for a carried entry of the same id. A carried entry holds a satchel row, which the spare roll has already skipped, and the queue is drained before a fight can start (`ItemRewardGate`; leaving the screen commits). So a spare's offer never meets an entry for its own item.

**No shipped quest pays on an elite or a spared kill today.** The Breakwater chain's one kill step is held for its turn-in (`settle: 'turn-in'`). The overlap can't happen in Chapter 1 yet: the fixtures reach it, and Chapters 2-4's quest lines could.

### Why a new spec

Spec 149 owns this surface, but two things rule out extending it. `nextChunkNumber` (`scripts/plan/settle.mjs`) reads archive lines as `· 149.3 ·` and misses Miserere's `· 149.3 (alias: TL2c) ·`, so an `## Add` there would be numbered 149.3, an id already closed. And 149's last chunk is in PR #1382, so the spec is about to be absorbed.

## Design

**Roll around the quest.** The elite rolls keep their signatures, chance and draw order. They read a player that already holds what the win would pay, so `eliteRelicPool` and `equipmentDropPool` skip it with the code they have. That player is for rolling only and is never stored. With nothing left in the pool the roll drops nothing, which is today's path for an owned pool: no relic means the XP and the card draft stand.

The read lives in the engine, since rules and RNG do. It works out the payout without drawing: a constant rng, whose card offers are thrown away, so the seeded stream stays where it was.

**One copy.** `carryAndOffer` no longer adds a row beside another source's entry, and queues nothing when a carried entry for the item waits, as `offerSpareGearAction` does. Elite and spare offers both treat a waiting entry as the one copy.

**Quests are untouched.** The ruling covers only elite and spare rolls. `carriedCovers` stays per source for `offerCompletedQuestItemsAction`, so two quests paying one item still pay two copies with two offers.

### Decisions made upfront (do not ask)

- The rule: D166 (proposed).
- No save version moves and the item-reward queue is not persisted (T, 2026-11-04).
- No tuning value moves. The rule changes which items can drop, never how often a roll fires.

### Out of scope

- Fixing `nextChunkNumber`: the settle script is not this spec's.
- Any quest's payout rules, and shop or loot-cache stock.

## Acceptance

- **A1** A won elite fight whose quest pays relic X in that same fight never drops X: the roll picks another from its pool, the player ends with one X, and the quest's offer reaches the reward screen. With X the only relic left in the pool, no relic drops, so the XP and the card draft stand. Tests drive `applyHazardOutcome` and fail on today's code.
- **A2** The same for a lane piece: an elite's piece roll skips what a same-fight quest pays, picks another or drops nothing, and the player ends with one copy. A test fails on today's code.
- **A3** `carryAndOffer` adds no satchel row and no entry when a carried entry for that item already waits, so an offer never makes a second copy. A test fails on today's code.
- **A4** Quests are untouched: two quests that pay one item in one fight still pay two copies, each with its own offer. A guard test.
- **A5** A spared foe's roll never pays what a quest paid in that fight, through the real `endCombat`: a gear draw picks another piece, and with the whole pool paid the gear and relic draws pay shillings. Its gear still reaches the screen beside a quest's entry for another item. Guard tests, whose comment says the lost screen is unreachable and why.
- **A6** Spec 149's A5 as corrected: after an elite's drop or a quest's item is offered, a store reopened from the save holds it once and shows an empty queue. No save version moves.
- **A7** Working out what a win would pay draws nothing from the seeded rng and changes no state, and it names exactly the items the real `endCombat` then pays.

## Open questions

- [T to confirm #1] An elite can drop a lane piece that a later quest step then pays: the Breakwater chain pays a weapon and an armor at its steps 2 and 4, and the elite's piece roll draws from every lane piece. The player then holds two. That is not the same fight, so T's ruling leaves it alone. Default: leave it. Or: the elite's pool also skips what an accepted quest still owes.

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **151.1** Elite rolls go around a same-fight quest's item, and the extra copy comes out · M · closes A1, A2, A3, A4, A5, A6, A7 · needs — · alias: MR5a
  - The PR takes `review:rules-change` (D119): it changes which items can drop, so T merges it. No tuning value moves: `ELITE_RELIC_DROP_CHANCE`, `EQUIPMENT_DROP_TUNING` and `MERCY_TUNING.spareTable` stay as they are.
  - Engine: one pure read in `axiomancer-mechanics/src/World/questline.ts`, the items a win over `state.currentEncounter` would pay: advance the kills as `END_COMBAT` does, then `settleQuestLog(state, log, () => 0)`, keeping `paid[].items`. Share the kill loop with the reducer so the two can't drift. A second helper returns the player with those items added to the inventory. With no encounter staged it returns the player unchanged. Additive barrel exports only (`src/index.ts`, the locked contract in `plan/bearings.md`).
  - Mobile: `settleEliteRelicAction` and `settleEliteEquipmentAction` (`state/combat/store-actions.ts`) roll with that player. Nothing else about them moves.
  - Comes out of `state/item-reward/relic-sources.ts`: `carriedHeld` and `carryAndOffer`'s row-adding branch from #1379. `carryAndOffer` adds a row only when the satchel has none, and returns when any carried entry for the item waits.
  - Stays there: `carriedCovers` per source, now used only by `offerCompletedQuestItemsAction`. `offerSpareGearAction` keeps its dedupe, with a comment saying why it can't lose a screen. Fix the file header too.
  - Comes out of `state/e2e/carried-rewards.engine.test.ts`: the describe "the same item from a quest and from an elite keeps both offers", which is `expectBothOffers` and its three tests (two copies, a reopen with both rows). The elite-entry setup of "a second look at the same completion" can no longer occur: rebuild it on another quest's waiting entry.
  - Stays there: the elite relic, elite piece and quest "survives an app close" tests. The reopen check moves to A6, at one copy.
  - Spare pins go in the existing `state/e2e/spare-gear.engine.test.ts`. Pin the draw with `jest.spyOn(getRng(), 'random')`, since the store's seed repeats (gear draws from 0.85 to 0.95, relic above 0.95). Edited test files escape the fail-on-parent gate; a NEW test file that passes on the base needs a `guard-test:` comment and also makes `docs/feature-map/features.json` stale, so keep to the existing files.
  - Docs: `docs/game-model.md`'s elite lines (the lane-piece source and `rollEliteRelicDrop`) say a same-fight quest's item is skipped too.
  - Measure: the A1, A2 and A3 tests fail on main; both package gates, `npm run verify -w backend`, `act1-walk-e2e`.
