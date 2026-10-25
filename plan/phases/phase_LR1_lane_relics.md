# Phase LR1 — Lane relics and how a player gets them

## Sources

- `/plot` from T, 2026-10-25, decided in session and run unattended: "lane relics and how a player gets them, so
  RW1's reward rule can work in play". It answers two Follow-ups of `plan/phases/phase_RW1_reward_rule.md`: "the lane
  relics themselves, and their sources (quests, elites; D71)" and "the relic's detail view showing the lane it opens
  (D71)".
- Part plan: `plan/revamp/relics.md` "B1 — The relic pass (owner)" (Relics open lanes, Lane relics stack, Relic
  sources); `plan/revamp/cards.md` "Deck model" (D68, D71, D100).
- Decisions: D47 (signet relics; a relic grants one signature), D68 (relics open lanes), D71 (the detail view shows
  the lane; relics come from quests and elites), D72 (the quest, dialogue and equipment plumbing stays, each
  witnessed by a fixture), D73 (a relic names a family), D88/D99 (relic content is T's; T asks now, so it is
  allowed), D100 (lane relics stack), D104 (a carried lane relic unlocks its lane; worn relics count lane slots),
  D57 (a measurement is not a gate).
- Code read while shaping this:
  - Relics: `axiomancer-mechanics/src/Items/relic.library.ts` holds two, the Suppliant's Ring (`relic-disarming-plea`,
    The Open Hand, the first-node hand-over) and the Bleeding Signet (`relic-bleeding-signet`, +20 max VITAE,
    Crimson Covenant), which "has no source yet: ... the dev menu's GET ALL RELICS hands it over". Relic identity is
    `grantsSignature !== undefined` plus the `relic-` prefix. RW1a adds `Equipment.laneId?`, a resolver (library
    entry by id first, then the item's own field) and `unlockedLaneIds`, and gives no relic a lane.
  - Signatures: `Combat/combat.signature.ts` (98 lines) holds two, each one `kind` branch; Crimson Covenant is built
    from a card-program verb (`programTetherAndTwice`, `Combat/combat.card-program.ts`). `SignatureSkillId` is a
    closed union (`Combat/combat.encounter.types.ts:169`). A new relic needs a new signature (the identity rule).
  - Lanes: `blood-price` named "Blood Price" (`Cards/library/blood-price.cards.ts:231`), `elementalist` named
    "Elementalist" (`Cards/library/elementalist.cards.ts:254`, EL1c, a removable trial set); `CardLane.name` is the
    display name.
  - The detail view: `selectEquipmentDetailViewModel` (`axiomancer-mobile/state/presenters/equipment-detail.engine.ts:227`)
    feeds `components/inventory/EquipmentDetailModal.tsx` (the inventory tab) and the item-reward screen's presenter
    (`state/presenters/item-reward.engine.ts`, which calls it over a one-item projection), so one VM field reaches
    both.
  - Quests: **no quest exists in the game.** `World/quest.library.ts` says "No quest is authored"; all four Act 1
    maps carry `quests: []` (`World/Continents/*/{breakwater,charcoal-wood,beacon-crags,lantern-deep}.ts`); the only
    quest is the test fixture `FIXTURE_QUEST` (`Game/fixtures/fixture-content.ts`). The plumbing that stays (D72):
    the quest log (`World/quest.engine.ts`: start, progress, complete; `kill`, `reach` and `collect` objectives),
    dialogue effects `startQuest`/`progressQuest`/`completeQuest` (`World/dialogue.runtime.ts:53-86`, which looks a
    quest up on the current map's `quests` first), the `interaction` and `narration` event kinds that play a
    dialogue tree (`World/MapEvents/types.ts:56,130`), and the Memoir tab's quest cards
    (`app/(tabs)/memoir/index.tsx`). The `quest` route is retired (bearings).
  - Quest rewards: `Quest.reward: Reward` (`World/types.ts:12,79`) may be an `Item` or `{ kind: 'item' }`, but only
    one path pays anything: `endCombat`'s kill objectives pay `currency` and `experience`
    (`Game/game.reducer.ts:309-323`). An item reward is never granted, and a quest completed by a `reach` or
    `collect` objective (`World/MapEvents/resolve-map-event.ts:46-66`), by a dialogue effect, or by the hazard
    combat's host call to `advanceKillObjectives` pays nothing. So today **no quest can hand out a relic**: there is
    no quest, and the reward path could not pay a relic if there were.
  - Elites: one elite foe, the Green Jelly (`Enemy/enemy.library.ts:92`, `difficulty: 'elite'`, loot 80% nothing /
    20% healing potion), met on the Breakwater's elite column (`World/MapEvents/content.ts:209,258`); Lantern Deep
    has "one elite on the last fight column" (`content.ts:559`). The elite reward is cards or an upgrade
    (`Combat/combat.rewards.ts:187`, `rollEliteReward`), rolled by the mobile aftermath
    (`axiomancer-mobile/state/combat/store-actions.ts:54-57`). No relic is dropped anywhere.
  - Granting a relic with a screen: the item-reward queue (`state.itemReward.queue`, route `/item-reward`, eyebrow
    `ITEM_REWARD_EYEBROW` overridable by the call site, TO THE SATCHEL / WEAR IT NOW) is how the first-node ring is
    handed over; `Items/item-grant.ts` does the grant.

## Outcome

The Bleeding Signet and five new lane relics (two Blood Price, three Elementalist) each name the lane they open and
say so in their detail view ("Unlocks: <lane name>"); Act 1 quests hand out the quest relics and the elite drops the
rest at a lower chance, so a player who earns a lane relic sees that lane's cards in their next reward (D104).

## Acceptance

- **A1** The Bleeding Signet's library entry carries `laneId: 'blood-price'`. A test: a player holding the Signet
  (worn or in the satchel) has `blood-price` in `unlockedLaneIds`; wearing it earns one Blood Price lane slot (D100);
  a saved Signet copy without the field resolves to the lane through the library (RW1a's resolver).
- **A2** The equipment detail VM gains `unlocks: string | null`: `Unlocks: <CardLane.name>` for an item whose resolved
  lane is a registered lane, `null` otherwise. The Signet's reads exactly "Unlocks: Blood Price"; the Suppliant's
  Ring's is `null`; a relic naming an unregistered lane (a removed trial set) is `null`. A presenter test covers the
  three.
- **A3** The line renders wherever the detail VM does: the inventory's `EquipmentDetailModal` and the `/item-reward`
  screen, under the signature, and in the modal's accessibility label. Screen tests for both.
- **A4** (attended) T's five lane relics are recorded in `plan/revamp/relics.md` § "The lane relics (LR1b)": per
  relic its id, name, lane, accessory kind, stat line, signature (name, cost, effect in verbs the engine has, or
  marked "needs a new verb"), description, and source (`quest` or `elite`). Two are Blood Price, three Elementalist;
  each lane has exactly one elite-only relic (the Bleeding Signet counts as Blood Price's third).
- **A5** (attended) T's quests are recorded in the same section: per quest relic, one quest with its name, the Act 1
  node and event kind that gives it, its objective (an objective kind the engine counts: `kill`, `reach` or
  `collect`), its lines, and the relic it pays.
- **A6** One engine function pays a completed quest's reward, and every completion path calls it: `endCombat`'s kill
  objectives, the hazard host's `advanceKillObjectives`, `reach` and `collect` objectives in `resolveMapEvent`, and
  the dialogue `progressQuest` and `completeQuest` effects. `currency` and `experience` pay as today; an `Item` or
  `{ kind: 'item' }` reward is granted to the inventory. An engine test per path with the fixture quest and a fixture
  relic reward.
- **A7** A relic granted by a quest or an elite reaches the player through the item-reward queue (TO THE SATCHEL /
  WEAR IT NOW), its eyebrow naming the source (a quest's name, or the elite's). A mobile store test for each source.
- **A8** Library relics carry `relicSource?: 'quest' | 'elite'`. After a won elite fight, `rollEliteRelicDrop(player,
  rng)` drops one relic with probability `ELITE_RELIC_DROP_CHANCE` from the elite pool, never a relic the player
  carries; same seed, same drop; an empty pool drops nothing. A seeded table test over fixture relics: the rate over
  10,000 seeds is within 1 point of the constant, and no carried relic is ever dropped. `[T to confirm #1]`
  `[T to confirm #2]`
- **A9** The elite's relic does not replace the elite reward: the cards-or-upgrade offer is unchanged
  (`elite-reward.engine.test.ts` passes) and the relic is queued after it.
- **A10** The five relics of A4 are in `relicLibrary` with their `laneId`, `relicSource`, stat lines and new
  signatures (each a `SignatureSkillId` with its effect, cost and description, on the signature bar when worn); the
  library header comment no longer says the Signet has no source. A test per new signature's effect; a test that
  every lane relic resolves to a registered lane and its detail VM reads `Unlocks: <lane name>`.
- **A11** The quests of A5 are on their Act 1 maps' `quests` and their giver nodes play the dialogue that starts them.
  An engine e2e per quest: from a fresh game, reach the giver, start the quest, meet the objective, and the relic is
  queued, its lane is in `unlockedLaneIds`, and with it worn the next combat reward holds a card of that lane.
- **A12** No quest pays an elite-only relic, and no relic is both a quest's reward and outside `relicSource:
  'quest'`: a library test over every authored quest.
- **A13** Browser evidence on the web build: a 375-wide screenshot of the Signet's detail view showing "Unlocks:
  Blood Price", attached to the LR1a PR.
- **A14** Browser evidence on the web build: a 375-wide screenshot of the `/item-reward` screen handing over a quest
  relic with its "Unlocks:" line, attached to the LR1e PR.

Measure: the A11 engine e2e passes for every quest (a quest relic, once earned and worn, puts its lane's card in the
next reward), and on the web build the Signet's detail view reads "Unlocks: Blood Price".

## Phases

### LR1a — The Signet opens Blood Price, and every lane relic says what it unlocks · S · closes A1, A2, A3, A13 · requires RW1a
Measure: the A1 unlock test and the A2/A3 presenter and screen tests pass; A13's screenshot shows
"Unlocks: Blood Price".
- Scope: `axiomancer-mechanics/src/Items/relic.library.ts` (the Signet's `laneId`); mobile
  `state/presenters/equipment-detail.engine.ts` (`unlocks`, read through RW1a's lane resolver and the lane
  registry, never re-derived), `components/inventory/EquipmentDetailModal.tsx`, the item-reward screen
  (`app/item-reward/index.tsx`) and its presenter if the VM shape needs passing through.
- Consumers: the inventory tab's detail modal, `/item-reward`, `DebugCardLanes` (unchanged).
- Save / schema: none. The lane is read from the library by id (RW1a A1), so saved Signets need no rewrite.
- Tests: a case in RW1a's `Combat/e2e/reward-lanes.engine.test.ts` or `Items/e2e/relic-library.engine.test.ts` (A1);
  a new `state/presenters/__tests__/equipment-detail.engine.test.ts` (A2); `components/inventory/__tests__/EquipmentDetailModal.test.tsx`
  and `state/e2e/item-reward.screen.test.tsx` (A3).
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; the root `npm test`.

### LR1b — T writes the five lane relics and their quests · S · closes A4, A5 · requires nothing · (attended)
Measure: `plan/revamp/relics.md` § "The lane relics (LR1b)" holds five relics and one quest per quest relic, every
field of A4 and A5 filled in T's words.
- What happens: an attended session (T at the wheel, D88). The session may draft two or three options per relic and
  per quest for T to pick from or rewrite (signatures drafted only in verbs the card program already has, so A10
  needs no new keyword; T may still pick one that needs a new verb, which is then marked). T decides names, effects,
  signatures, stat lines, which Blood Price relic and which Elementalist relic are elite-only, and every quest's
  giver, objective and lines. `[T to confirm #3]` `[T to confirm #4]`
- Scope: `plan/revamp/relics.md` only. No code.
- Consumers: LR1d and LR1e read the table.
- Verify gate: the root `npm test` (the deadline lint).

### LR1c — The sources, in the engine: quests pay their rewards, elites drop relics · M · closes A6, A7, A8, A9 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile`; the A6 per-path tests,
the A7 store tests and the A8 seeded table test pass with fixture relics and the fixture quest.
- Scope: `axiomancer-mechanics/src/World/quest.engine.ts` (the reward-paying function, `payQuestReward` or similar,
  pure over `GameState`), its callers in `Game/game.reducer.ts` (replacing the inline currency/experience branch),
  `World/MapEvents/resolve-map-event.ts` (`reach`, `collect`), `World/dialogue.runtime.ts` (progress, complete);
  `Items/types.ts` (`relicSource?`); `Combat/combat.rewards.ts` (`rollEliteRelicDrop`, `ELITE_RELIC_DROP_CHANCE` in
  `Game/game-mechanics.constants.ts` or beside the elite reward); exports. Mobile: the combat aftermath
  (`state/combat/store-actions.ts`) queues the elite's relic after the card reward; the hazard host's
  `advanceKillObjectives` call and every quest-completion site queue a relic reward on `state.itemReward`.
- Consumers: the combat aftermath, `/hazard`'s end-of-fight, `/event` (reach, collect), `/dialogue`, `/item-reward`,
  the Memoir tab (unchanged: a completed quest is already shown).
- Save / schema: `relicSource` is optional and read from the library by id like `laneId`; no migration. The fixture
  quest gains a fixture relic reward in tests only.
- Tests: a new `World/e2e/quest-rewards.engine.test.ts` (A6, each path; `World/e2e/world.engine.test.ts` holds today's quest cases), `Combat/e2e/elite-relic-drop.engine.test.ts` (A8),
  `Combat/e2e/elite-reward.engine.test.ts` (A9, unchanged); mobile `state/e2e/item-reward.engine.test.ts`,
  `state/combat/__tests__/` and `state/e2e/event.engine.test.ts` (A7).
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile` (cross-package:
  `src/World/**`, `src/Combat/**`); `npm run e2e:combat`; the root `npm test`.

### LR1d — T's five relics in the library, with their signatures · M · closes A10 · requires LR1a, LR1b, LR1c
Measure: the A10 tests pass and each new relic, granted from the dev menu's GET ALL RELICS and worn, puts its
signature on the bar and reads "Unlocks: <lane name>" in its detail view.
- Scope: `Items/relic.library.ts` (five entries from LR1b's table, `laneId`, `relicSource`; the Signet's
  `relicSource` from LR1b), `Combat/combat.signature.ts` and `Combat/combat.encounter.types.ts` (five
  `SignatureSkillId`s and their branches, built from card-program verbs), the signature glosses and atlas rows they
  need. A relic LR1b marked "needs a new verb" is not built here: it is split out as its own row when this phase is
  picked, and LR1d ships the rest.
- Consumers: the signature bar, the dev menu's GET ALL RELICS (reads `relicLibrary`), the equip-delta panel.
- Save / schema: additive library entries; no migration.
- Tests: `Combat/combat.signature.test.ts` (one case per new signature), `Items/e2e/relic-library.engine.test.ts` (every lane
  relic resolves to a registered lane), the A2 presenter test extended to the five.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat`;
  the root `npm test`.

### LR1e — The quests in Act 1 and the elite's pool · M · closes A11, A12, A14 · requires LR1c, LR1d
Measure: the A11 e2e passes for every quest, A12 passes, and A14's `/item-reward` screenshot shows a quest relic
with its "Unlocks:" line.
- Scope: the four Act 1 map definitions (`World/Continents/*/*.ts`, `quests`), their giver nodes' events in
  `World/MapEvents/content.ts` (the event kind LR1b names, playing the dialogue that starts the quest), and the
  dialogue trees; `World/quest.library.ts` (the quest names); the elite pool reads `relicSource` (A8).
- Consumers: `/event`, `/dialogue`, the Memoir tab, `/item-reward`, the map's node labels (`AW1b`'s blurb test, if a
  giver node's blurb changes), `e2e:act1-walk` and `e2e:map-walk` (re-pinned only where a node they cross changes).
- Save / schema: quests live in the save's quest log already; a save made before LR1e simply has no quest started.
  No migration.
- Tests: `World/e2e/lane-relic-quests.engine.test.ts` (A11, one journey per quest), a new `World/quest.library.test.ts`
  (A12), `narrative-reachability.test.ts` if it walks giver nodes.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`;
  `npm run e2e:map-walk`; `npm run e2e:act1-walk`; the A14 screenshot; the root `npm test`.

## Scope

- `axiomancer-mechanics` (relics, signatures, quest rewards, the elite drop, Act 1 quests) and `axiomancer-mobile`
  (the detail line, the reward queue). `plan/revamp/relics.md` (T's table, LR1b). No card or lane is authored.

## Consumers to update

- The inventory detail modal, `/item-reward`, the signature bar, the combat aftermath, `/hazard`'s end of fight,
  `/event`, `/dialogue`, the Memoir tab, the dev menu's GET ALL RELICS.

## Save / schema contracts

- `Equipment.relicSource?: 'quest' | 'elite'`, optional, additive, read from the library by id (as RW1a reads
  `laneId`). Quests use the existing `QuestLog` in the save. No migration in any phase.

## Decisions made upfront — DO NOT ASK

- **The Bleeding Signet names Blood Price (T, 2026-10-25),** and its detail view says exactly "Unlocks: Blood Price".
- **Every lane relic's detail view shows "Unlocks: <lane name>" (T, 2026-10-25).** The name is `CardLane.name`. A
  relic that opens no lane (the Suppliant's Ring) shows no line; a relic whose lane is not registered (its trial set
  removed) shows none either, matching RW1a's "ignored".
- **Five new relics: two Blood Price, three Elementalist (T, 2026-10-25).** With the Signet, each lane has three.
  Names, effects and signatures are T's content (D88): LR1b is attended, and the loop phases that wire them in
  (LR1d, LR1e) require it. This brief invents no relic content.
- **Quests are the primary source; elites drop relics at a lower chance; a lane's third relic comes only from an
  elite (T, 2026-10-25).** Read as: each lane has one relic marked `relicSource: 'elite'` and two marked `'quest'`,
  so four quest relics and two elite-only relics in all.
- **The Signet and the "Unlocks:" line are their own phase, LR1a, requiring RW1a (T, 2026-10-25).** RW1a and RW1b
  are still `[ ]` and no open `loop:pr` PR claims either (checked 2026-10-25), so per T's rule they are not amended:
  LR1a builds on RW1a's resolver.
- **No quest exists, so LR1 builds both halves of the quest source.** The engine half (LR1c: rewards paid on every
  completion path, an item reward granted) is loop work over the fixture quest; the quests themselves (giver, words,
  objective) are T's content, written in LR1b and wired in LR1e: one quest per quest relic, one in each
  Act 1 region (four). A quest is given by an event kind that exists today
  (an `interaction` or `narration` node playing a dialogue whose choice starts it) and finished by an objective the
  engine counts (`kill`, `reach`, `collect`); no new quest UI is built (the Memoir tab already lists quests).
  `[T to confirm #3]`
- **The elite's drop chance: 8% per won elite fight,** one relic at most, rolled after the elite reward and never
  replacing it. With one elite foe in Act 1 (the Green Jelly) met once or twice a run, an elite-only relic turns up
  in roughly one run in eight to one in six. `[T to confirm #1]`
- **The elite pool: only the elite-only relics the player does not carry.** Quest relics come only from their
  quests, so a relic is never handed out twice and no quest has to handle "already carried". `[T to confirm #2]`
- **Which relic is elite-only, per lane: one of T's new ones,** chosen by T in LR1b; the Bleeding Signet becomes a
  quest relic. `[T to confirm #4]`
- **Signatures are drafted in verbs the card program already has.** A relic needs a signature (the identity rule,
  D47); a signature built from existing verbs (as Crimson Covenant is) keeps LR1d one tick. One that needs a new
  verb is marked in LR1b and split into its own row when LR1d is picked, rather than growing LR1d.
- **A relic from a quest or an elite arrives through the item-reward screen,** like the first-node ring, with the
  source in its eyebrow. The eyebrow words are copy (the builder writes plain ones; T may rewrite them as
  `[content]`).
- **The cache, shops and the blacksmith give no relics.** T named two sources; adding others is a new plot.
- **Slotted after SG1 and BC1, not asap (T, 2026-10-25):** after the last open row.

## Tests matrix

- Added: an `Items/e2e/relic-library.engine.test.ts` case (A1), the equipment-detail
  presenter and screen cases (A2, A3), `World/e2e/quest-rewards.engine.test.ts` (A6), mobile reward-queue store tests
  (A7), `Combat/e2e/elite-relic-drop.engine.test.ts` (A8), signature and library cases (A10),
  `World/e2e/lane-relic-quests.engine.test.ts` (A11), `World/quest.library.test.ts` (A12).
- Unchanged and must pass: `Combat/e2e/elite-reward.engine.test.ts` (A9).

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat` (LR1c, LR1d);
`npm run e2e:map-walk` and `npm run e2e:act1-walk` (LR1e); the root `npm test`.

## Commit body template

```
Phase LR1<a|c|d|e> — <title>

Closes <ids> of plan/phases/phase_LR1_lane_relics.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A14 ticked across LR1a, LR1b, LR1c, LR1d and LR1e; the Measure met.

## Follow-ups (out of scope)

- A signature that needs a new card-program verb (split out of LR1d when it is picked).
- Relics from the cache, shops or the blacksmith; relics in the hazard deck's "Bonus Relic"/"Shrine Cache" lie
  (`plan/revamp/relics.md`).
- More elites: Act 1 has one elite foe; the elite pool's reach grows with B2's roster.
- The rest of B1: re-authoring the starting ring and stat-only relics (the identity rule would need changing), and
  whether five relics can be worn (EQ1 Follow-ups).
- A marker on a reward face saying which card is the lane card (RW1's Decisions: none asked for).
