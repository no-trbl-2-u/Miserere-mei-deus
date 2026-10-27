# Phase RW1 — The decided reward rule: relic lanes feed the reward slot, and the cache shows its card

## Sources

- `/plot` from T, 2026-10-25 ("plot them all, one plot run, one PR"), run unattended on the `[owner]` candidate
  "The decided reward rule, implemented: relic lanes feed the reward slot and the cache shows its card"
  (`plan/PHASE_CANDIDATES.md`, proposed 2026-10-24 by T's `/messy` of the Elementalist swarm, R8; CRITIQUE RC2 walk
  item 11).
- Part plan: `plan/revamp/cards.md` "The Elementalist after the swarm" (Rewards, Proposed (c), T's calls, T's reward
  rule) and "Deck model" (D68, D71, D100); `plan/revamp/relics.md` "Relics open lanes", "Lane relics stack".
- Decisions: D68 (relics open lanes), D71 (2 random + 1 lane card; no starting relic), D73 (a relic names a family;
  the guaranteed card comes from any lane an equipped relic opens), D100 (lane relics stack), **D104** (T's
  2026-10-24 reward rule, recorded by this plot: it amends D68 and D71), **D107** (T, 2026-10-26: only worn relics
  put their lane in the pool; amends D104's carry rule), D88/D99 (relic content is not this
  phase's), D57 (a measurement is not a gate).
- Code read while shaping this:
  - `rewardPoolFor` (`axiomancer-mechanics/src/Combat/combat.rewards.ts:60-67`) reads only the dev override
    `devRewardLaneIds` (`Character/types.ts:94-101`, "Set by the dev menu's CARDS section only") and otherwise
    returns `COMBAT_REWARD_POOL`, the whole library minus Curses. `rollCombatCardRewards` (`:76-89`) draws `count`
    distinct ids uniformly from it. No relic is read anywhere in the reward path.
  - `rollEliteCardRewards` (`:147-163`) also draws from `rewardPoolFor`, with its own "one from the deck's lanes"
    guarantee (`deckLaneIds`, UP1f).
  - The cache rolls its one card with the same function: `rollCombatCardRewards(player, Math.random, 1)[0]`
    (`axiomancer-mobile/state/cache/store-actions.ts:72`), stored as `LootCacheChoiceSession.cardCandidate`
    (`World/LootCacheChoice/lootcachechoice.types.ts`). The cache presenter's offers are a static list
    (`state/presenters/cache.engine.ts:53`, `OFFERS`), so TAKE A CARD shows no card; the outcome chip names it
    only after the pick (`:82`).
  - No relic names a lane: `Equipment` (`Items/types.ts:77-83`) has no lane field, and the relic library holds the
    Suppliant's Ring and the Bleeding Signet (`Items/relic.library.ts`), neither a lane relic. Relics are cloned
    into the save (`cloneRelic`), so a field added to a library relic later is missing on a saved copy.
  - Worn state is `player.equipment` (`EquipmentLoadout`: weapon, armor, up to 3 accessories), the truth since EQ1a
    (#862); carried items are `player.inventory`.
  - Lanes: `CARD_LANES` (`Cards/card.lanes.ts:75`) is grey plus each trial set's lanes (`blood-price`,
    `elementalist`); `laneRewardPool(laneIds)` merges their `cardIds`.
  - The combat reward overlay already renders real faces: `rewardCardVMs` (`state/presenters/combat-encounter.engine.ts:1870`)
    into `CombatCardFace` (`components/combat/encounter/CombatRewardsOverlay.tsx:130`).

## Outcome

Every card reward draws from the lanes of the relics the player wears (D107; grey cards only when no lane relic is
worn), the 3-card offers hold 0, 1 or 2 (3 at five relics) guaranteed cards from the lane the player wears most, the cache's
single card follows the same rule, and the cache shows the card it offers before the pick.

## Acceptance

- **A1** `Equipment` gains an optional `laneId` naming a `CardLane.id`. One engine function resolves a relic's lane:
  the relic library's entry for the item's id first, then the item's own `laneId`, so a save made before a library
  relic gained its lane still carries it. A unit test covers both paths and an id naming no registered lane
  (ignored).
- **A2** `unlockedLaneIds(player)` returns every registered lane named by a relic in `player.equipment` (worn), in
  registry order; `player.inventory` is not read, and `grey` is never in it (the grey starter cards are not a lane).
  `rewardPoolFor` is those lanes' cards; when the list is empty it falls back to the grey lane's cards, the only way
  a grey card is ever offered (D107). Confirmed by T (2026-10-26): grey until character selection; CH1a removes the fallback. A test: a worn lane relic puts its lane in the list; the
  same relic carried in the satchel, unworn, gives an empty list and the grey fallback; unequipping it removes the
  lane again; no worn lane relic gives the grey fallback.
- **A3** The lane slot count follows D100 from the worn relics (`player.equipment` only): the most relics worn from
  any one lane gives 0 → 0, 1-2 → 1, 3-4 → 2, 5 → 3 lane cards. The lane is the one with the most worn relics; a
  tie is broken by the roll's seeded `rng`. A table test covers 0, 1, 2 and 3 worn, and one relic each of two lanes.
- **A4** With no dev override, `rollCombatCardRewards` fills the lane slots first from that lane's cards, then the
  rest from `rewardPoolFor` (the worn lanes' cards, or grey when none is worn; Curses excluded). Offers stay distinct within one roll; a
  card the player already owns may be offered (duplicates allowed). Same seed, same offers. An engine e2e over many
  seeds with fixture lanes and fixture lane relics: no lane relic gives grey ids only (the empty-pool fallback); an unworn lane relic changes nothing (grey ids only,
  exactly as with no relic); one worn gives offers from that lane only, never a grey id; one relic each of two lanes
  gives offers from those two lanes only, at least one from the slot lane; three worn give at least two.
- **A5** The dev override stays an override: when `devRewardLaneIds` names a registered lane, every slot draws
  from those lanes and the worn-lane pool and the lane slots are not read. The existing `card-lanes.engine.test.ts` override
  cases pass unchanged.
- **A6** The cache follows the rule: its card is the first slot of the same roll (the lane card when a lane slot is
  earned, otherwise a card from `rewardPoolFor`). A mobile store test: a player holding the Elementalist test
  deck and no lane relic opens a cache and is offered a grey card, never a Blood Price card (the swarm's LEECH
  case); with a fixture lane relic carried in the satchel but not worn, the cache card is still grey; with it worn,
  the card is from its lane.
- **A7** The elite reward's cards draw from the new `rewardPoolFor`; its shape (the best cards, one from the deck's
  lanes, or one upgrade) is unchanged. `elite-reward.engine.test.ts` passes, updated where it assumed the whole
  library.
- **A8** The cache's TAKE A CARD offer shows the rolled card's face before the pick: the `CombatCardFace` built by
  `rewardCardVMs` (scaled to the player's stats, as the combat reward is), and the card's name in the offer's
  accessibility label. TAKE THE GOODS and the outcome ledger are unchanged. A presenter test and a screen test cover
  it.
- **A9** Browser evidence: a 375-wide screenshot of `/cache` in its offer state, showing the card face, is attached
  to the RW1b PR, and `npm run e2e:map-walk` (which takes the card at bw-5) passes.

Measure: on the web build, a fresh run's first combat reward and its bw-5 cache offer only grey cards, and the cache
shows the card it offers before the pick; the engine e2e of A4 passes.

## Phases

### RW1a — The rule in the engine · M · closes A1, A2, A3, A4, A5, A6, A7 · requires nothing
Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile`; the A4 reward-lanes e2e
and the A6 cache store test pass.
- Scope: `axiomancer-mechanics/src/Items/types.ts` (`laneId?`), `Items/relic.library.ts` (the lane resolver, or a
  small `Items/relic-lanes.ts`), `Combat/combat.rewards.ts` (`unlockedLaneIds`, the slot count, `rewardPoolFor`,
  `rollCombatCardRewards`; each takes the lane registry and the relic library as optional last arguments, as
  `rewardPoolFor` takes `lanes` today, so tests pass fixtures), `Character/types.ts` (the `devRewardLaneIds`
  comment: it is now the override of a real rule), `Combat/index.ts` and `src/index.ts` exports. Mobile: no
  production change is required (the cache and the combat aftermath already call `rollCombatCardRewards`); the
  `store-actions.ts` comment at `state/combat/store-actions.ts:28` that says the roll is uniform over
  `COMBAT_REWARD_POOL` is corrected.
- Consumers: the combat aftermath (`state/combat/store-actions.ts:55-59`), the cache (`state/cache/store-actions.ts:72`),
  the dev menu's reward-pool grid (`state/dev/cards.ts`, unchanged: it writes the override), `DebugCardLanes`.
- Save / schema: `Equipment.laneId` is optional and additive; no `game.migrate.ts` hop. No relic in the library gets
  a lane in this phase.
- Tests: add `Combat/e2e/reward-lanes.engine.test.ts` (A1-A5, fixture lanes and relics); update
  `combat.rewards.test.ts`, `Cards/e2e/card-lanes.engine.test.ts` (the fallback case is now the worn lanes' cards,
  grey when none is worn, not the whole library), `trial-set-removal.engine.test.ts`, `Combat/e2e/elite-reward.engine.test.ts`,
  `hazard-pattern-combat.engine.test.ts` where they assert the whole-library fallback; mobile
  `state/combat/__tests__/combat-reward-draft.test.ts`, `lib/__tests__/deckEvents.test.ts` where they do; add the
  A6 case to `state/e2e/cache.flow.engine.test.ts`.
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile` (cross-package
  checklist: `src/Combat/**`); `npm run e2e:combat` (Combat browser routing); the root `npm test`.

### RW1b — The cache shows its card · S · closes A8, A9 · requires nothing
Measure: the A8 presenter and screen tests pass, the A9 screenshot shows the card face on TAKE A CARD, and
`npm run e2e:map-walk` passes.
- Scope: `axiomancer-mobile/state/presenters/cache.engine.ts` (the card offer's VM carries the candidate's
  `CombatCardVM` from `rewardCardVMs`, with the player's stats), `app/cache/index.tsx` (`OfferCard` renders
  `CombatCardFace` for the card offer), `state/presenters/cache.copy.ts` if the offer's line changes.
- Consumers: `/cache` only.
- Save / schema: none (`cardCandidate` is already in the session).
- Tests: a `cache.engine` presenter case (the card offer carries the candidate's face, name and scaled numbers);
  `app/cache/__tests__/cache-card-preview.test.tsx` (the face renders on the card offer, the a11y label names the
  card); `scripts/map-walk-e2e.mjs` adjusted only if a testID it reads moves.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:map-walk`; the A9 screenshot.

## Scope

- `axiomancer-mechanics` (the rule, RW1a) and `axiomancer-mobile` (tests and comments in RW1a; the cache screen in
  RW1b). No relic, card or lane content is authored (D88, EL1 lane-creator step 7, B1).

## Consumers to update

- The combat card reward, the elite reward's cards, the cache's card, the dev menu's reward-pool override and the
  `/cache` screen.

## Save / schema contracts

- `Equipment.laneId?: string`, optional, additive; a save without it loads unchanged. The lane is read from the
  relic library by id first (A1), so saved relic copies never need rewriting. No migration.

## Decisions made upfront — DO NOT ASK

- **The pool is the worn relics' lanes (T, 2026-10-26, D107, amending D104's carry rule).** The reward pool is the
  character's two starting lanes plus the lane of every worn relic; unequipping a relic removes its lane, and a
  carried, unworn relic does nothing for the pool. The grey starter cards are not a lane and are never offered as
  card rewards. Character selection, which supplies the starting lanes, does not exist yet (it waits on a third
  lane), so until it lands the pool is the worn relics' lanes only; with one lane worn, every offer is that lane's.
- **When the pool is empty (no lane relic worn), the reward falls back to grey cards** (D107's stopgap), so a fresh
  run still gets a card reward. Confirmed by T (2026-10-26): grey, and only until character selection ships. Once
  it does, every run starts at character select and a character always brings two lanes, so the pool is never
  empty; CH1a deletes this fallback and a test asserts the pool is non-empty.
- **T's reward rule (T, 2026-10-24), recorded as D104 by this plot (2026-10-25); its carry rule is replaced by
  D107 (above):** "random" means drawn from every
  lane the player has unlocked; a lane unlocks the moment one of its relics is in the inventory, equipped or not;
  the lane slots are counted from equipped relics (one equipped: 2 random + 1 lane; three of one lane: 1 random + 2
  lane); and it applies to every card reward, the cache included. It amends D68's "card rewards outside combat are
  not affected by relics" and D71's "the first lane opens with the first lane relic" (now: with the first lane
  relic carried). D100's table stands.
- **Duplicates allowed (T, 2026-10-24).** "No owned card re-offered" is withdrawn: an owned card may be offered.
  Offers stay distinct within one roll, as today.
- **Grey is not in the pool (D107).** `GREY_LANE` stays in the registry for the starter deck and the empty-pool
  fallback, but `unlockedLaneIds` never returns it. With no lane relic worn, every reward is grey (the fallback).
- **No relic gets a lane here.** The lane relics are EL1 lane-creator step 7 and the B1 relic pass (D88, D99); the
  candidate states it: until one exists every lane is locked and every offer is grey. Tests use fixture relics.
- **Lanes are registry lanes.** A relic's `laneId` names a `CardLane.id`. D73's families map one-to-one onto the
  registry lanes today (each trial set registers one lane); a family holding several lanes is a follow-up.
- **Five relics give 3 lane cards (D100) is kept** in the slot function, though only the three accessory positions
  hold relics today (EQ1 Follow-ups: the relic count is B1's), so 2 is the most a player reaches now. That is the
  "0 / 1 / 2 of 3" of the candidate.
- **Which lane fills the slots:** the lane with the most worn relics, a tie broken by the seeded `rng`. This is
  D100's "the most relics the player has equipped from any one lane" and D73's "any lane an equipped relic opens"
  for the single slot.
- **Lane slots come first in the returned list**, so the cache's one card (`count = 1`) is the lane card when one is
  earned. No marker on the face says which card is the lane card: no decision asks for one.
- **The dev override stays the override** (candidate scope): `devRewardLaneIds` replaces the pool for every slot,
  and EL1d's reward-pool check keeps working. SET DECK still does not set it.
- **The elite reward keeps its UP1f shape** over the new pool (A7) rather than taking the 3-slot composition; its
  "one from the deck's lanes" guarantee is its own rule. `[T to confirm]`
- **The cache's single card is the first slot of the 3-card rule** (A6): with a lane slot earned it is always the
  lane card. The alternative, a lane card with probability slots/3, is one line. `[T to confirm]`
- **The cache preview reuses the combat reward's face** (`rewardCardVMs` into `CombatCardFace`), so the card reads
  the same in the cache, the reward overlay and the hand.
- **Ships even though it narrows today's rewards to grey.** Until a lane relic exists, players stop being offered
  Blood Price and Elementalist cards outside the dev override. That is T's rule as written. `[T to confirm]`

## Tests matrix

- Added: `axiomancer-mechanics/src/Combat/e2e/reward-lanes.engine.test.ts` (A1-A5); the A6 cache case in
  `axiomancer-mobile/state/e2e/cache.flow.engine.test.ts`; the A8 `cache.engine` presenter case and
  `app/cache/__tests__/cache-card-preview.test.tsx`.
- Rewritten where they assert the whole-library fallback: `combat.rewards.test.ts`, `card-lanes.engine.test.ts`,
  `trial-set-removal.engine.test.ts`, `elite-reward.engine.test.ts`, `hazard-pattern-combat.engine.test.ts`,
  `combat-reward-draft.test.ts`, `deckEvents.test.ts`.

## Verify gate

`npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat` (RW1a);
`npm run e2e:map-walk` (RW1b); the root `npm test`.

## Commit body template

```
Phase RW1<a|b> — <title>

Closes <ids> of plan/phases/phase_RW1_reward_rule.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A9 ticked across RW1a and RW1b; the Measure met on the web build.

## Follow-ups (out of scope)

- The lane relics themselves, and their sources (quests, elites; D71): EL1 lane-creator step 7 and B1.
- The relic's detail view showing the lane it opens (D71): worth building once a relic has a lane.
- Families with more than one lane (D73), when a family registers its second lane.
- Starting lanes join the pool when character selection lands (D107): `unlockedLaneIds` then returns the
  character's two starting lanes plus the worn relics' lanes, and CH1a deletes the grey fallback (T, 2026-10-26:
  a run cannot reach the map without a character, so the pool is never empty). Character selection waits on T plotting a third lane.
- SET DECK setting the reward override to match the dealt deck (the swarm's LEECH-from-the-cache case): dev menu,
  B10.
- Whether five relics can be worn (weapon and armor relics): settled by D105 (three relic slots); reaching 3 lane
  cards through a set bonus is SB1's (`plan/phases/phase_SB1_set_bonuses.md`, T 2026-10-26).
