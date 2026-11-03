# 145 — The mercy check's follow-ups

> A relic or weapon won by sparing can be equipped on the spot, sparing the Green Jelly shows its story, card transforms reach the card reports, foes lose their dead loot tables, and the words the removal left behind are gone.

## Why

### Sources

- T's answers at the end gate of `/pilot 144`, 2026-11-03, attended, then `/plot asap`. The parent is `plan/144-mr1-mercy-check.md`; the pitch is
  `braindump/2026-11-03-mercy-check.md`.
  - Spare's gear: "Use item reward screen".
  - The Open Hand's number: "Show live number" (shipped in #1350).
  - Foe loot tables: "Delete them".
  - A transform's log: "Add a transform kind".
  - The spare prose: "Show on spared screen".
  - Spec 114's chunks: "Retire both".
- The final review of #1350, whose notes are this spec's cleanup.

### What exists today (read 2026-11-03, at 3f6dcce4e)

- `applySpareReward` puts table gear straight in the satchel, unworn. Elite drops route through the `itemReward` queue instead:
  `axiomancer-mobile/state/item-reward/relic-sources.ts` (`offerEliteRelicAction`, `offerElitePieceAction`) takes the item back out and offers it, so CONFIRM or EQUIP is the one grant.
- `Enemy.loot` pays nothing since 144.1. `Enemy/loot.ts` has no non-test caller, and `World/roster-health.ts` still checks the tables' references. Map events and loot caches have their own loot, which is not in question.
- `DECK_EVENT_KINDS` in `Combat/combat.play-log-contract.ts` has no transform kind, so a transform posts nothing. `deck_events.kind` is plain `TEXT` (`backend/migrations/0002_play_log.sql`), so a new kind needs no migration.
- `Enemy.spareStory.narrative` and `Enemy.pactLines` are data no screen reads. Only the Green Jelly carries them (`Enemy/enemy.library.ts`). The removed friendship panel showed them.
- `signatureText(skill, stats)` resolves printed numbers in a signature's description. Open Vein still prints "HEAL 5" though Mind scales it.

## Design

**Gear on the spot.** A relic, weapon or armor from the Spare table routes through the `itemReward` queue as an elite drop does, after the spared end screen. The grant happens once, and a closed app keeps the item.

**The spared story.** On the spared end screen, a foe with `spareStory.narrative` shows it, with its `pactLines` line for the player's level, as the friendship panel chose it (`git log -p` on `aftermath.engine.ts`; `levelTier3` is the existing helper). A foe with neither shows what it shows today. The Journal line stays.

**Transforms in the reports.** A new `transform` deck-event kind, shaped as `upgrade` is: `card_id` is the card replaced, and `offered` is the one card it became.

**Loot tables.** `Enemy.loot`, `LootTableEntry` and `Enemy/loot.ts` go, with their barrel exports, tests and `roster-health` reads, migrating consumers in the same change. No map-event or cache loot changes.

### Decisions made upfront (do not ask)

- Table gear goes through the item reward screen (T, 2026-11-03).
- The foe loot tables are deleted (T, 2026-11-03).
- Card transforms get their own deck-event kind (T, 2026-11-03).
- The spare prose shows on the spared screen (T, 2026-11-03).
- 114.1 and 114.2 are retired (T, 2026-11-03): 114.1 shipped in #1242, and 114.2's caption explained a gate that no longer exists.
- The parked Labyrinth's `exploited` outcome stays until the Labyrinth returns, and the mechanics `VISION.md` gets no trim (T, 2026-11-03).

### Out of scope

- The review tool's 100-file limit (`pr-partition.mjs`), and plots not settling into the roadmap table. Neither belongs to this feature; each needs its own `/bug` or `/plot`.
- A general "why it will not fire" caption for all signatures: lost with 114.2 unless T plots it again.
- Any change to the table's weights, the check's chance or the shop's prices.

## Acceptance

- **A1** A relic, weapon or armor won from the Spare table opens the item reward screen, where it can be equipped or kept; it is granted exactly once, and survives an app close before the screen is answered.
- **A2** A spared Green Jelly's end screen shows its narrative and level's pact line through presenter state; a foe with neither shows no empty block. [T to confirm #2]
- **A3** A card transform posts a `transform` deck event naming the card replaced and the card it became, the backend accepts it, and its contract test fails without it.
- **A4** No `Enemy.loot`, `LootTableEntry` or `Enemy/loot.ts` remains, while map-event and cache loot still pay.
- **A5** No player-facing text says parley, and no doc or CLI text describes the removed outcomes: the memoir and map-node tooltips, `docs/combat.md`, `docs/cli.md`, the `--json-events` note and the `combat-sim` legend.
- **A6** The tests #1350's review named as unable to fail now fail without the behaviour they name, and the Labyrinth CLI's always-slain boss has a test.
- **A7** Open Vein prints its live, Mind-scaled HEAL, the number the engine applies. [T to confirm #1]

## Open questions

1. Should Open Vein also print its live number? T ruled this for The Open Hand; Open Vein has the same fault. Default: yes. [T to confirm #1]
2. The Green Jelly's lines were written for befriending. Do they show as written? Default: yes; T can reword them later. [T to confirm #2]

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **145.1** The words the removal left behind, and the tests that could not fail · M · closes A5, A6, A7 · needs — · alias: MR2a
- [ ] **145.2** Gear won by sparing opens the item reward screen · M · closes A1 · needs — · alias: MR2b
- [ ] **145.3** Sparing the Green Jelly shows its story · S · closes A2 · needs — · alias: MR2c
- [ ] **145.4** A card transform reaches the card reports · S · closes A3 · needs — · alias: MR2d
- [ ] **145.5** Foes lose their dead loot tables · M · closes A4 · needs — · alias: MR2e

### 145.1 (MR2a) — The words the removal left behind, and the tests that could not fail · M · closes A5, A6, A7 · requires —

- `state/presenters/tooltip.engine.ts:101` and `:149`; `axiomancer-mechanics/docs/combat.md:21,30`; `docs/cli.md:94`; `CLI/combat.cli.ts:36`; `CLI/combat-sim.cli.ts:64`.
- Tests: `Enemy/e2e/aftermath-lines.engine.test.ts:103`; `CombatEncounterPanel.mercy-check.test.tsx:164`, which must assert the log's `spare` tag; a test for `CLI/labyrinth.cli.ts`'s `bossRoomSequence`.
- `scripts/equipment-dock-drag-e2e.mjs:70`'s stale fixture text. Leave `levelTier3`: 145.3 uses it.
- Open Vein through a `{heal:5}` token and `signatureText`.
- Measure: both verify gates, the backend gate, root `npm test`, and `node scripts/check-prose.mjs`.

### 145.2 (MR2b) — Gear won by sparing opens the item reward screen · M · closes A1 · requires —

- Route the table's relic and gear through `state/item-reward/relic-sources.ts`, as elite drops do. Note the end screen's naming line; the check's answer must stay settled before the screen opens.
- Measure: a seeded test per result kind that the item is offered and granted once, plus a screen test.

### 145.3 (MR2c) — Sparing the Green Jelly shows its story · S · closes A2 · requires —

- `state/presenters/spare-reward.engine.ts` and `CombatSummaryModal`. Restore the pact line's choice from the friendship panel in presenter code.
- Measure: a presenter test with and without the data, a before and after shot.

### 145.4 (MR2d) — A card transform reaches the card reports · S · closes A3 · requires —

- `DECK_EVENT_KINDS` and its shape table in `combat.play-log-contract.ts`; the mobile post beside `recordDeckUpgrade`; every report that switches on the kind.
- Measure: `npm run verify -w backend`, and a contract test.

### 145.5 (MR2e) — Foes lose their dead loot tables · M · closes A4 · requires —

- `Enemy/types.ts`, `Enemy/loot.ts`, `Enemy/enemy.library.ts`, `Enemy/index.ts`, `World/roster-health.ts`, the tests that pin the tables, and `CombatVictoryPanel` if it reads them. A barrel removal, per `plan/bearings.md`, so verify mobile.
- Measure: `git grep -E "LootTableEntry|Enemy/loot"` finds nothing, and map-event and cache tests stay green.
