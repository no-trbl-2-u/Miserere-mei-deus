# The Village, the Shop and the Blacksmith — 2026-11-09

## Surface question
"Let's get crackin' on pitching the village UX/UI treatment. Including the blacksmith and the shop, both of which are inside the village." Five screens each, today's first, one menu and button background across the app, harmless NPC portraits from `sorted-entity-library-base`.

## Better question surfaced
Today the village is one long scrolling page: rest, card shop, gear and the Anvil stacked as text rows, with no one standing behind any of them. T ruled on 2026-11-06 that it becomes a hub of options, each opening its own screen with a keeper. So the question was what the hub, the Shop and the Blacksmith look like when a person in the world offers each one, and the Blacksmith's die work had to stay readable while the smith fills the screen.

## Path taken this session
1. Opened converge: T named the surfaces, the count and the art source, so this session made the screens to vote on.
2. Round 1 (`village-2026-11-09`): five screens each, today's first. T kept Shop D outright and asked for two blends: Village B + D, Blacksmith E + C.
3. Round 2 (`village-round-2-2026-11-09`): five blends each. T kept Village V-02b and Blacksmith B-02b.
4. Parked: none.

## Raw material read
- `axiomancer-mobile/app/village/index.tsx`: today's single scroller of counters with TAKE THE ROAD pinned; the Anvil opens `/blacksmith` and returns to the village.
- `axiomancer-mobile/app/blacksmith/index.tsx`: intro, forging, card, outcome and upgrade-pick phases; HONE and TEMPER per die, UPGRADE A CARD, SWAP; refused offers greyed with a reason.
- `axiomancer-mechanics/src/World/Village/village.content.ts`: `cardShopSize: 3`.
- `axiomancer-mechanics/src/World/MapEvents/handlers.ts:119`: every village with a card shop also gets the gear counter (`villageEquipmentShopFor`).
- `axiomancer-mechanics/src/Items/equipment-drop.ts`: `shopCount: 2`, `shopPrice: 40`.
- `axiomancer-mechanics/src/World/Blacksmith/blacksmith.engine.ts`: hone 3, temper 5, swap 8, card upgrade at the temper price.
- `axiomancer-mechanics/src/World/Blacksmith/blacksmith.content.ts`: `BLACKSMITH_WITNESS_VARIANTS` is empty, so SWAP never shows in play.
- `axiomancer-mobile/components/menu/MenuButton.tsx`, `components/experience/KitBackdrop.tsx`: the brass action plate and its nine-slice.
- `plan/card-ledger/village.md`: both rounds, verdicts verbatim; shots in `plan/card-ledger/village/` on branch `village-ballot` (PR #1558).

## Measured
| Finding | Data |
|---|---|
| A layout pick | Not measurable before build: the ballots measure T's taste, not play |
| Card shop size today | 3 (`cardShopSize`); T's ruling makes it 5 |
| Prices the screens show | rest 6, card 6, removal 5 rising, HONE 3, TEMPER 5, card upgrade 5, gear 40 each (2 pieces) |

## Prior art consulted
- **Darkest Dungeon — the Hamlet:** a town hub of buildings, each opening its own screen with a keeper; memory read, not a KB citation; no confident read on reception of the hub itself.
- **Slay the Spire — the Merchant:** one screen with the merchant beside the wares and a card-removal service; memory read, not a KB citation; no confident read.
- **Hades — the Well of Charon:** a single keeper with a short line and a small fixed stock; memory read, not a KB citation; no confident read.

## Rulings (T, this session)
- The village is a hub of options, each its own screen with an NPC (T, 2026-11-06, `ui-kit.md` V-01; restated at the open).
- One menu and button background across the app (open): drawn as the brass action button the main menu and Settings wear.
- NPC portraits are stand-ins from `sorted-entity-library-base`; T swaps them later (open).
- Village: V-02b, the host beside the buttons (round 2).
- Blacksmith: B-02b, the net beside him (round 2).
- Shop: S-01d, one card at a time (round 1).
- The shop offers five cards, not three (round 1).

## Directions considered
### Village
V-01a to e and V-02a to e (ballots). Kept V-02b: a tall host down the left with a line under the title, three shorter brass buttons (REST, SHOP, BLACKSMITH) with each keeper at the right end, TAKE THE ROAD pinned. **Trade-off:** the buttons are narrower, so a long label crowds its keeper. **Telltale failure mode:** a label overlaps the keeper at 375pt.
### Blacksmith
B-01a to e and B-02a to e. Kept B-02b: the smith fills the screen from the top, die tabs (HEART, BODY, MIND) above the selected die unfolded as a six-face cross net at his shoulder, the smith's line, HONE and TEMPER with their trades and prices, UPGRADE A CARD, TAKE THEM AND GO. **Trade-off:** one die at a time costs a tap to compare dice. **Telltale failure mode:** the net covers the smith's face, or a refused verb shows no reason.
### Shop
S-01a to e. Kept S-01d: one large card to read with its neighbours peeking, swipe between, BUY with the price, the merchant small at the foot with REMOVE A CARD, LEAVE THE SHOP. **Trade-off:** you see one card at a time. **Telltale failure mode:** the swipe position is unclear without the "2 of 5" counter.

## What proves it (not T, not the agent)
`verify:visual` baselines for the hub, the Shop and the Blacksmith drawn from these screens, plus e2e tests that walk hub to each screen and back. T reads the built screens against the ballot shots at the Nov 11 review.

## Handoff to /plot
Task: Rebuild the village as a hub whose options each open their own screen with a keeper: the hub as ballot V-02b, the Shop as S-01d with five cards, the Blacksmith as B-02b, every button on the brass action plate.
Source: this file; ballots and verdicts in `plan/card-ledger/village.md` (branch `village-ballot`, PR #1558)
Acceptance:
- A1 Arriving at a village opens the hub: name, purse, the host's portrait and line, a brass button for each counter that village carries with its keeper's portrait at the button's right end, and TAKE THE ROAD pinned at the foot (V-02b). A counter the village lacks has no button.
- A2 Each hub button opens that counter's own screen, leaving it returns to the hub, and TAKE THE ROAD ends the village as today.
- A3 The Shop shows one card at a time from five (`cardShopSize` 5), swipes between them with a position counter, buys with BUY and the price, and offers REMOVE A CARD with its rising price beside the merchant's portrait (S-01d). A refused buy dims and names its reason.
- A4 The Blacksmith shows the smith filling the screen, HEART, BODY and MIND tabs, the chosen die's six faces as a cross net at his shoulder, HONE and TEMPER with their trade line and price, UPGRADE A CARD, and TAKE THEM AND GO (B-02b). A refused verb dims and names its reason, and the forge's intro step is gone.
- A5 Every button on the hub and the three screens wears the brass action plate (`action-button-idle`, `-selected`, `-disabled`).
- A6 Each keeper's portrait comes from one table keyed by role (host, innkeeper, shopkeeper, smith), so T replaces an image in one place.
Measure: `npm run verify:visual --workspace axiomancer-mobile` with new baselines for the hub, the Shop and the Blacksmith, plus a hermetic e2e per screen (hub, shop buy and refusal, blacksmith hone and refusal); then T's review on Nov 11.
Decisions made upfront: hub of options, each its own NPC screen; V-02b, S-01d, B-02b; five shop cards; brass action plate on every button; stand-in portraits (Hermit as host, Harbalist as innkeeper, Evil Merchant as shopkeeper, Stonehead as smith) until T swaps them; SWAP stays hidden while no smith offers a variant (today's behaviour).
Out of scope: new NPC art (T's, D88); the host's and keepers' lines (T writes them; placeholders marked `[content]`); shop and forge prices; the Rest screen's own pitch beyond the default below.
To confirm:
- Weapons and armor: default sold inside the Shop, after the five cards in the same swipe [T to confirm]
- The village's paid rest: default its screen reuses the reworked rest screen (night passes, ET1c) with the innkeeper's portrait and the price [T to confirm]
- The Blacksmith's intro step: default dropped, the smith's line stands in for it [T to confirm]
- Five shop cards at 6 shillings each: default no price change; the sim checks the economy after the build [T to confirm]
Suggested slot: asap — the Nov 11 review reads the reworked village screens and the Nov 16 MVP demo shows the new event UI.
