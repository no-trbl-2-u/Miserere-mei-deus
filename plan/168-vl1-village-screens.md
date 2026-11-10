# 168 — The village as a hub of keepers

> The village stops being one long scrolling page. Arriving shows a host and one button per counter, each with its keeper; each button opens that counter's own screen: the paid rest, a shop that shows one card at a time from five, and a Blacksmith where the smith fills the screen and you work one die at a time.

## Why

### Sources

- **T, 2026-11-06** (`plan/card-ledger/ui-kit.md`, V-01): "The player, when entering the village, will have options: 'Rest', 'Card Shop', 'Blacksmith', any other options Village offers, the 'Exit'. Then, each of those options show a different screen with an NPC/Image for each, then what they offer."
- **T, 2026-11-09, `/pitch`:** five screens each for the Village, the Blacksmith and the Shop; "Use the same menu/button background across the app"; "use harmless looking NPC portraits from potential assets ... I can always replace the image with something better, but it'll help with spacing."
- **T's ballots, 2026-11-09** (`plan/card-ledger/village.md`, verdicts verbatim): the Village is **V-02b** (the host beside the buttons), the Blacksmith **B-02b** (the net beside him), the Shop **S-01d** (one card at a time), with "Let's start offering 5 cards instead of 3."
- **The pitch:** `braindump/2026-11-09-village-screens.md`. Ballot shots: `plan/card-ledger/village/` (PR #1558).

### What exists today (read 2026-11-09, at origin/main 1c63a1891)

- `axiomancer-mobile/app/village/index.tsx` renders every counter on one scroller (merchant voices, the paid rest, the card shop with removal, weapons and armor, the Anvil) with TAKE THE ROAD pinned below. The Anvil opens `/blacksmith`, and leaving it lands back on the village because the village stays the pending event.
- `axiomancer-mobile/app/blacksmith/index.tsx` runs intro, forging, card, outcome and upgrade-pick phases. Forging lists every die with HONE and TEMPER, then UPGRADE A CARD and any SWAP offers. A refused offer is greyed and names its reason.
- `axiomancer-mechanics/src/World/Village/village.content.ts` sets `cardShopSize: 3`. `World/MapEvents/handlers.ts:119` gives every village with a card shop a gear counter: up to two pieces the player does not carry, 40 shillings each (`EQUIPMENT_DROP_TUNING`).
- `BLACKSMITH_WITNESS_VARIANTS` is empty, so no smith offers a SWAP today.
- The brass action plate (`assets/images/experience/brass/action-button-idle|selected|disabled.webp`) is drawn nine-sliced by `components/experience/KitBackdrop.tsx` and worn by `components/menu/MenuButton.tsx` on the main menu and Settings.
- The reworked rest screen (ET1c, UK2i) is black with a looping campfire.

## Design

- **The hub (V-02b).** It shows the settlement's name and the purse, with a tall host portrait down the left edge and the host's line under the title. Below them sits one brass button per counter the village carries (REST, SHOP, BLACKSMITH), each shorter than the screen and with its keeper's portrait at the button's right end. TAKE THE ROAD is pinned at the foot.
- **Each counter is its own screen,** opened from the hub. Leaving it returns to the hub, and TAKE THE ROAD on the hub ends the village as today.
- **The Shop (S-01d)** shows one large card to read, with its neighbours peeking at the sides. A swipe moves between them and a counter shows the position (for example "2 of 5"). BUY carries the price. The merchant stands small at the foot beside REMOVE A CARD, and LEAVE THE SHOP closes it.
- **The Blacksmith (B-02b).** The smith fills the screen from the top. HEART, BODY and MIND tabs sit above the chosen die, which unfolds as a six-face cross net at his shoulder. Below come his line, HONE and TEMPER with their trade lines (MISS face → MANA, MANA face → BOON) and prices, UPGRADE A CARD, and TAKE THEM AND GO.
- **Every button** on the hub and the three screens wears the brass action plate, with the disabled plate for a refused one. A refused action still names its reason (owner UI doctrine).
- **Portraits come from one table keyed by role** (host, innkeeper, shopkeeper, smith), so T replaces an image in one place. The stand-ins T approved for spacing are TOR-0424 Hermit (host), Harbalist (innkeeper), TOR-0275 Evil Merchant (shopkeeper) and TOR-0821 Stonehead (smith), from `Potential Assets/sorted-entity-library-base/portraits`. Each is copied out with its black ground removed and recorded in `provenance.json` (AGENTS.md rule 9, D96).

### Decisions made upfront (do not ask)

- V-02b, S-01d and B-02b as voted. The ballot shots are the reference picture for each screen.
- The shop offers five cards. Prices and the removal price's climb are unchanged.
- SWAP stays hidden while no smith offers a variant, as today.
- The host's and keepers' spoken lines are placeholders marked `[content]` until T writes them (D88).
- Prices, refusals and every rule stay the engine's (`World/Village`, `World/Blacksmith`). The screens only present them.

### Out of scope

- New NPC art (T's, D88): the stand-ins hold the space.
- The spoken lines themselves.
- Shop and forge prices.
- Every screen outside the village. Whether the brass plate becomes the one button everywhere is call #5.

## Acceptance

- **A1** Arriving at a village opens the hub: the name, the purse, the host's portrait and line, and one brass button per counter the village carries with that keeper's portrait at its right end. TAKE THE ROAD is pinned at the foot. A counter the village lacks has no button (V-02b).
- **A2** Each hub button opens that counter's own screen. Leaving a counter's screen returns to the hub, and TAKE THE ROAD ends the village as today, from either width (375 and 1280).
- **A3** The Shop shows one card at a time from the village's cards, swipes between them with a position counter, buys with BUY and the price, and offers REMOVE A CARD at its rising price beside the shopkeeper's portrait (S-01d). Weapons and armor follow the cards in the same swipe [T to confirm #1]. A refused buy dims and names its reason.
- **A4** The Blacksmith shows the smith filling the screen, the HEART, BODY and MIND tabs, and the chosen die's six faces as a cross net at his shoulder. Under them come HONE and TEMPER with their trade line and price, UPGRADE A CARD, and TAKE THEM AND GO (B-02b). A refused verb dims and names its reason. The forge opens straight onto this screen, with no intro step [T to confirm #3]. The result, reckoning and card-upgrade steps keep their content and wear the brass plate.
- **A5** REST opens the paid rest as its own screen in the reworked rest screen's look [T to confirm #2]: the innkeeper's portrait, the price and what it restores, refused when VITAE is full with that reason, and back to the hub.
- **A6** One table keyed by role (host, innkeeper, shopkeeper, smith) supplies every keeper portrait. The four stand-ins live under `axiomancer-mobile/assets/images/` with a `provenance.json`, and nothing resolves a path into `Potential Assets/`.
- **A7** A village card shop offers five cards (`cardShopSize: 5`), seeded per run and node as today, at today's price [T to confirm #4].

## Open questions

- [T to confirm #1] Weapons and armor: sold inside the Shop, after the five cards in the same swipe. Or: their own hub button with their own keeper.
- [T to confirm #2] The paid rest: its screen reuses the reworked rest screen (black, the campfire) with the innkeeper and the price. Or: a keeper screen like the Shop's.
- [T to confirm #3] The forge's intro step is dropped, and the smith's line stands in for it. Or: keep SET THEM ON THE ANVIL as a first tap.
- [T to confirm #4] Five cards at today's 6 shillings each. Or: raise the card price.
- [T to confirm #5] The brass plate on these screens only, for now. Or: plot it as the one button across the whole app, replacing the vellum buttons on Travel, Spoils and New game.

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **168.1** Keeper portraits: one role table and the four stand-ins, copied out with provenance · S · closes A6 · needs — · alias: VL1a
- [ ] **168.2** The village card shop offers five cards · S · closes A7 · needs — · alias: VL1b
- [ ] **168.3** The village hub, and the paid rest as its own screen · M · closes A1, A2, A5 · needs 168.1 · alias: VL1c
- [ ] **168.4** The Shop, one card at a time · M · closes A3 · needs 168.2, 168.3 · alias: VL1d
- [ ] **168.5** The Blacksmith, the smith and one die at a time · M · closes A4 · needs 168.1 · alias: VL1e

168.3 moves today's card shop and gear sections, unchanged, onto the SHOP button's screen so nothing is unreachable; 168.4 then redraws that screen. Each chunk adds its screen's `verify:visual` baseline and a hermetic e2e under `axiomancer-mobile/state/e2e/` (hub navigation, a buy and a refused buy, a hone and a refused hone).
