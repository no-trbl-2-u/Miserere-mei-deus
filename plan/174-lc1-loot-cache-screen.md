# 174 — The loot cache, picture first

> A loot cache opens on a picture of the cache, its flavour line and two blind choices, TAKE A CARD and TAKE THE GOODS, each with its own action line and a brass TAKE button. Nothing names the reward until the player takes one. Then the picture changes to what was taken: the gold and one row per good for the goods, or a picture of its own and the card itself, drawn in the one card face, just above MOVE ON.

## Why

### Sources

- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, Verdict, slot S-04), verbatim: "S-04 Loot cache: KEEP S-04j (Picture first) | note: Don't show the actual reward. Only Take a/the ___ and the flavor text. Reward should be hidden until the selection is made. Furthermore, goods? Show goods as you have it  Show Card? We replace the gold with a different image and the card will go right above move on."
- **The settled shot:** `plan/card-ledger/screens/S-04-settled.webp` (three screens: the choice, goods taken, card taken). It lands with PR #1584 and is the Source picture of this spec. The winning look is `screens/S-04j.webp`; today's screen, redrawn from the code, is `screens/S-04a.webp`.
- **The ledger's notes for the plot** (`plan/card-ledger/screens.md`, "Open for the plot", S-04): both rewards are rolled before the choice; a doctrine comment says the screen states what you do, never what you get; only the cave cache (`cw-6`) has action lines; the card pool is the three grey cards.
- **New image, ledger row 14:** "the runes cut into the cave wall, lit by one lantern; grey dusk, engraved; landscape, 780x540; the picture band at the top of the card outcome, in place of the gold." Art is T's (D88).
- **The deadline act** "Event kind 7, loot cache: pitch its full treatment ... settle it and plot it" (`plan/deadlines.md`), which this plot answers.

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- **The route.** `axiomancer-mobile/app/cache/index.tsx` draws the title `TWO WAYS TO LEAVE IT` (`CACHE_CHOICE_TITLE`), the cache's flavour line, and two bordered rows, `TAKE A CARD` and `TAKE THE GOODS` (`CACHE_CHOICE_OFFER_LABEL`), each with its action line under the label; the whole row is the button (`cache-choice-offer-<id>`). After the pick it shows `SETTLED`, the label again, one chip per thing taken (`+ A PLAIN WORD`, `+ HEALING POTION`, `+6 SHILLINGS`) and `MOVE ON` (`cache-claim`). The ground is `ScreenBg art="cache"` with the region plate (`assets/images/screens/index.ts`, `cache` is the Ludgate Hill engraving). No picture of the cache, no purse, no card face, no item icons. The buttons are plain bordered boxes, not the brass plate.
- **The presenter.** `state/presenters/cache.engine.ts` `selectCacheVM`: `CacheChoiceOfferVM` is `{ id, label, action }` and carries nothing about the reward (154.7, UK2g, removed `card` and `goods` from it on purpose). `CacheChoiceOutcomeVM` carries `chosen`, `label`, `cardName`, `itemNames` and `currency`: names only, no card face, no item ids, no effect lines.
- **The copy.** `state/presenters/cache.copy.ts`: the title, the two labels, `SETTLED`, `MOVE ON` and the three chip formatters.
- **The rules.** `axiomancer-mechanics/src/World/LootCacheChoice/` (`createLootCacheChoiceSession`, `chooseLootCacheChoiceOffer`, `claimLootCacheChoiceOutcome`). Both rewards are rolled before the choice by `beginLootCacheChoiceAction` (`state/cache/store-actions.ts`): `rollCombatCardRewards(player, cacheCardRng(seed), 1)[0]`, so **TAKE A CARD is one card, not a pick from several**, and `rollCacheReward` (`Items/cache-reward.ts`): one or two consumables (`modest`), two or three (`rich`), and sometimes one weapon or armor the player does not carry (`EQUIPMENT_DROP_TUNING.cache`). The node's currency rides with the goods. Nothing is paid until MOVE ON (`claimLootCacheChoiceOutcomeAction`), and the node is spent on entry, so there is no backing out.
- **Action lines.** `World/MapEvents/content.ts`: `CAVE_CACHE_ACTIONS` (T's two lines, verbatim, on `cw-6`); every other cache (`COAST_LOOT_CACHES`, `cw-2`, `cw-13`, `bc-5`, the Labyrinth's) already carries `PLACEHOLDER_CACHE_ACTIONS`, both lines `[content]`, and `cache-action-lines.engine.test.ts` fails a cache carrying neither. **Already built; this spec adds no copy.** S-04a's blank rows are the redraw's, not the code's.
- **Pieces to reuse.** The closed red chest `TREASURE_CHEST_CLOSED`, the gold hoard `TREASURE_GOLD_HOARD` and the falling coins `TREASURE_FALLING_COINS` (`assets/images/treasure/index.ts`); the item sprites `getItemSprite` (`components/icons/item-sprites.ts`; the three healing potions and the ten weapons and armors have one); `equipmentEffectLine` (`state/presenters/equipment-effect-line.ts`); the one card face `CombatCardFace` (`components/combat/encounter/CombatBoard.tsx`) fed by `rewardCardVMs` (`state/presenters/combat-encounter.engine.ts`), as the Shop does (`app/village/shop.tsx`, `village.engine.ts`); the brass plate `BrassButton` (`components/experience/BrassButton.tsx`), whose look comes from the look table `components/experience/looks.ts` (no cache place there yet).
- **Tests and fixtures.** `state/e2e/cache-action-lines.screen.test.tsx` (the choice names no reward), `state/e2e/cache.flow.engine.test.ts`, `state/presenters/__tests__/cache.engine.test.ts`, `components/__tests__/CacheGate.test.tsx`. Fixture `apprentice-bw-cache` (`Game/fixtures/state-fixture.registry.ts`) stands on `bw-m3`, whose lines are `[content]`. `verify:visual` (`scripts/smoke-screens.mjs`) has no cache route.

## Design

Three moments, one screen, as the settled shot draws them.

- **The top bar.** A small eyebrow at the left (`TWO WAYS TO LEAVE IT` on the choice, `SETTLED` after it) and the purse at the right ("15 shillings").
- **The picture band.** A wide band under the bar: the region plate behind, the moment's picture over it. The choice shows the closed chest; goods taken shows the gold hoard; card taken shows its own picture (row 14 for the cave cache).
- **The choice.** Under the band, the cache's flavour line, centred. Then two rows, split by a thin rule: the label in gold (`TAKE A CARD`, `TAKE THE GOODS`), the cache's action line under it in parchment, and a brass `TAKE` button at the row's right end. Nothing on this screen names a card, an item or a sum.
- **Goods taken.** The band shows the gold. Under it, the label large and centred (`TAKE THE GOODS`), then one row per thing taken: its icon, `+ NAME`, and one line saying what it does; the shillings last, with the coins icon and `+6 SHILLINGS`. MOVE ON at the foot on the brass plate.
- **Card taken.** The band shows the card picture. Under it, `TAKE A CARD` large and centred, then the card taken, drawn in the one card face (D91), centred, just above MOVE ON.
- **Pictures come from one table** keyed by moment (`choice`, `goods`, `card`) with a per-cache override for the card picture, so T swaps an image in one place.

### Decisions made upfront (do not ask)

- **The choice stays blind.** T's note keeps 154.7's doctrine for the choice: the offer VM gains no reward field. Only the outcome shows what was taken.
- **One card.** TAKE A CARD grants the one card rolled today, so the card outcome draws one face. No pick, no reroll.
- **The rules are untouched.** The rolls, the tiers, the currency, the equipment drop and paying on MOVE ON stay `World/LootCacheChoice`'s and `store-actions.ts`'s.
- **The purse in the bar reads what the purse will hold once the take is paid** (today's purse plus the goods' shillings), as the settled shot draws it (15 on the choice and after a card, 21 after goods worth 6). The payment itself still happens on MOVE ON.
- **What a good does** is one line built from the item's own numbers: a weapon or armor reads `equipmentEffectLine`; a potion reads its heal and its below-half heal in the inventory's terms (`Heal 20 VITAE`, `30 below half VITAE`). No new wording, no new rule.
- **The action lines** are the cache's own data, as today; the caches without T's lines keep showing `[content]` (D88). This spec writes no copy.
- **Every button wears the brass plate:** a new look-table place for the cache's buttons, set to `brass`, read through `BrassButton`.
- **The testIDs stay** (`cache-choice-offer-<id>` on each TAKE, `cache-choice-action-<id>`, `cache-outcome`, `cache-claim`), so today's tests keep their hold.

### Out of scope

- The art itself: row 14 and any per-cache card picture are T's (D88). The slot ships with a stand-in.
- Any action line or flavour line (T's, D88).
- Cache tuning: tiers, counts, the equipment drop rate, currency.
- Combat's reward screen and every other screen.

## Acceptance

- **A1** The cache presenter's outcome carries what the outcome screen draws: for a card, its one-card-face VM (`rewardCardVMs`); for goods, one row per item with its id, name, sprite key and what-it-does line, then the shillings; and the purse as it will stand once paid. The offer VM is unchanged and still names no reward (154.7's guard holds).
- **A2** The cache's pictures come from one table keyed by moment (`choice`, `goods`, `card`), the card picture overridable per cache node; the choice wears `TREASURE_CHEST_CLOSED`, goods `TREASURE_GOLD_HOARD`, and the card slot a stand-in until T's row 14 lands (`[T to confirm #1]`, `[T to confirm #2]`).
- **A3** The choice screen draws the top bar (eyebrow and purse), the picture band, the flavour line, and the two rows each with its label, its action line and a brass TAKE; nothing on it names the reward (S-04-settled, left).
- **A4** Goods taken draws the gold band, `TAKE THE GOODS`, one row per item (icon, `+ NAME`, its line), the shillings row, and MOVE ON on the brass plate (S-04-settled, middle).
- **A5** Card taken draws the card picture band, `TAKE A CARD`, the one card taken in `CombatCardFace` just above MOVE ON (S-04-settled, right).
- **A6** `verify:visual` shoots three new routes off a cave-cache fixture (`cw-6`, seed pinned): `cache` (the choice), `cache-goods` and `cache-card` (each after a TAKE), each compared with its third of the settled shot; a hermetic e2e under `axiomancer-mobile/state/e2e/` takes each choice and checks the outcome shows the rolled card or goods and that MOVE ON pays them.

## Open questions

- **[T to confirm #1]** The runes picture (row 14) is the cave's. Default: one card picture serves every cache until T supplies others, and the table takes a per-cache override, so a riverbank or gatehouse cache can get its own later. Or: every cache needs its own card picture before this ships.
- **[T to confirm #2]** Until row 14 exists, the card band shows the region plate alone, with no object over it. Or: the pale casket (`TREASURE_CHEST_PALE`) stands in; or the closed chest again.
- **[T to confirm #3]** The change from the choice to the outcome is a plain cut, as today. Or: the picture cross-fades from the chest to what was taken.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **174.1** The cache outcome knows what was taken, and the picture table · S · closes A1, A2 · needs — · alias: LC1a
  - Extend `CacheChoiceOutcomeVM` (card face, goods rows, purse after); keep `CacheChoiceOfferVM` as is. The picture table lives beside `assets/images/treasure/index.ts`. Presenter unit tests in `state/presenters/__tests__/cache.engine.test.ts`.
- [ ] **174.2** The cache screen, picture first · M · closes A3, A4, A5, A6 · needs 174.1 · alias: LC1b
  - Redraw `app/cache/index.tsx` on the brass plate and the picture band; add the look-table place; add the `cw-6` cache fixture and the three `verify:visual` routes; extend `cache-action-lines.screen.test.tsx` and add the outcome e2e. Regenerate `docs/feature-map/` if the route's couplings change (the card face brings `CombatBoard` back into `route:cache`).
