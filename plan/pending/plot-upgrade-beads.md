---
date: 2026-11-10
---
## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **127.?beadswheel** · UP1i: the card upgrade screen as a string of beads, with the pair and the hold (T, `/pitch` then `/plot asap`, 2026-11-10)
- **127.?beadshosts** · UP1j: the rest site, the Anvil and the elite reward wear the beads (T, `/plot asap`, 2026-11-10; needs 127.?beadswheel, 168.5)

**Held** (waits on a person's word; never picked until the
~~~

## Add plan/127-up1-card-upgrades.md
~~~ section Design
### The string of beads (T, `/pitch` then `/plot asap`, 2026-11-10)

The shared upgrade screen (`components/upgrade/CardUpgradePicker.tsx`, UP1d) is reworked into the look T settled over two ballot rounds: `plan/card-ledger/upgrade.md` (both verdicts verbatim) and its settled shot `plan/card-ledger/upgrade/U-02-settled.webp`. The pitch is `braindump/2026-11-09-card-upgrade-screen.md`; its Handoff block is the source of the acceptance below. The rules do not change: one card, one copy, its next upgrade (`nextUpgradeId`), every number from `cardUpgradePreviewVM`.

Top to bottom, on the settled shot:

- The HUD's place name and purse, as today's hosts give them.
- A large figure at the top in a gold glow: a stand-in from `Potential Assets/sorted-entity-library-base` (TOR-0007 Ahimsa, `items/Ahimsa.jpg`, black ground removed), carried into the app's assets with a provenance entry like the village keepers' (168.1). Art is T's (D88); the stand-in only holds the space.
- B's pair: the card as it is (smaller, tilted, greyed) beside the card as it will be (upright, gold border and glow, the changed numbers in gold), with no AS IT IS or AS IT WILL BE label (T, 2026-11-10). Under the new card, one line names the change: `LEECH 4 → 5` (two changes join with ` · `) [T to confirm #9]. The cards are smaller than round 2's A (T's round 2 note) and use the one card face (D91).
- The wheel: a wide wheel whose top rim shows at the foot, one bead per upgradable card (the card's art in a ring of its colour). Only the bead at the top centre is offered. It is larger and wears the special border: a brass double ring and a gold notch above it.
- HOLD, the brass action button, under the wheel. Holding it fills a gold ring round the centre bead. Nothing sits under HOLD (T's round 2 note).

Calls for T, each with the default the build assumes (merging accepts an unanswered default):

- **[T to confirm #1]** The hold lasts 1 second.
- **[T to confirm #2]** Letting go before the ring closes empties it; nothing is upgraded.
- **[T to confirm #3]** The wheel wraps round: the last card sits next to the first.
- **[T to confirm #4]** Tapping a side bead turns the wheel to bring it to the centre; it never upgrades.
- **[T to confirm #5]** A card carried more than once shows its count on its bead (×3).
- **[T to confirm #6]** Today's locked `???` slot is dropped, replacing the UP1 decision "The ??? slot is shown, locked".
- **[T to confirm #7]** The rest site gets a way back out of the upgrade, like the Anvil's back row; today it has none once the picker opens.
- **[T to confirm #8]** The same stand-in figure stands at all three hosts until T supplies art.
- **[T to confirm #9]** With the labels gone, the change alone (`LEECH 4 → 5`) stays as one line under the new card.
~~~
~~~ acceptance
- **A?beadsonly** On the upgrade screen only the card on the centre bead can be upgraded. Dragging along the wheel's rim turns it and snaps a bead to the centre; no other control commits an upgrade.
- **A?beadspair** Above the wheel, the card as it is (smaller, tilted, greyed) sits beside the card as it will be (upright, gold border, changed numbers in gold), no AS IT IS or AS IT WILL BE label, and the change alone (`LEECH 4 → 5`) under it (#9); every number and the change line come from the card-upgrade presenter, so they cannot disagree with the card the player will draw.
- **A?beadshold** Holding HOLD fills a ring round the centre bead. Letting go before it closes empties it and commits nothing; a closed ring commits exactly one upgrade of one copy through the host's `onConfirm`.
- **A?beadsa11y** A screen reader can reach each bead, bring it to the centre and upgrade it without the hold, through an accessibility action on the centre bead.
- **A?beadshosts** The rest site, the Anvil and the elite reward all open the same screen. Each host keeps its own price line and way back, the rest site gains one (#7), and the card-upgrade engine and presenter tests pass unchanged.
- **A?beadslayout** The screen matches the settled shot: the figure at the top as large as the space allows, the smaller pair, the wheel's rim, HOLD with nothing under it, the brass action button; `verify:visual` holds a baseline of it at the rest site.
~~~
~~~ chunks
- [ ] **127.?beadswheel** The string of beads: the wheel, the pair and the hold · M · closes A?beadsonly, A?beadspair, A?beadshold, A?beadsa11y · needs — · alias: UP1i
  - Rework `CardUpgradePicker` into the string of beads, keeping its props (`rows`, `onConfirm`, `priceLine`) so the hosts do not change in this chunk. The presenter gains the change line (`LEECH 4 → 5`) from the before and after faces it already builds.
  - Tests: turning the wheel moves the centre bead (wrapping per #3); tapping a side bead turns it (#4); a release before the hold's end commits nothing; a full hold calls `onConfirm` once with the centre card; the accessibility action commits; the change line for a one-number and a two-number upgrade.
  - The figure is a slot the screen fills from a prop, so 127.?beadshosts can place it; this chunk renders the stand-in.
- [ ] **127.?beadshosts** The rest site, the Anvil and the elite reward wear the beads · M · closes A?beadshosts, A?beadslayout · needs 127.?beadswheel, 168.5 · alias: UP1j
  - The stand-in figure into the app's assets with provenance (#8); the rest site's way back (#7); the Anvil's price line and back row on the new screen, after 168.5 lands the reworked Blacksmith; the elite reward's panel hosts it with its one random card (UP1 decision), a wheel of one bead that sits at the centre and does not turn.
  - A `verify:visual` baseline of the screen at the rest site; host tests from real state.
~~~
