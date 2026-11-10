# The card upgrade screen: the string of beads — 2026-11-09

## Surface question
"Let's work on the card upgrade screen. Make another ballot where you have 8 recommendations, the first one being how it is today. Get creative." (T, 2026-11-09)

## Better question surfaced
Today's screen is a list of names: the player cannot see what an upgrade gains without tapping each row, and committing is a single tap on a button below a preview. The question became how to make the choice feel like a deliberate act at a shrine: one card offered at a time, its before and after side by side, and a commit that takes a held press so it cannot happen by accident.

## Path taken this session
1. Converge from the start: T named the surface (the shared upgrade screen) and asked for a ballot.
2. Round 1 (`upgrade-2026-11-09`, eight looks): T kept H, the string of beads, and asked for B's card pair and G's hold, with H as the main.
3. Round 2 (`upgrade-round-2-2026-11-09`, four layouts of that blend): T kept A, the rim at the foot, with smaller cards, no line under HOLD and a bigger figure at the top.
4. Parked: nothing.

## Raw material read
- `axiomancer-mobile/components/upgrade/CardUpgradePicker.tsx` (UP1d): today's shared screen; rows preview, `UPGRADE IT` commits through the host's `onConfirm`.
- `axiomancer-mobile/state/presenters/card-upgrade.engine.ts`: `cardUpgradeRowsVM` and `cardUpgradePreviewVM`, every number from the engine (`nextUpgradeId`, `detailStats`).
- `axiomancer-mobile/state/presenters/card-upgrade.copy.ts`: the screen's copy.
- Hosts: `app/rest/index.tsx` (no way back once the picker opens), `app/blacksmith/index.tsx` (a price line and a back row, `cancelBlacksmithCardUpgrade`), `components/combat/encounter/CombatRewardsOverlay.tsx` (the elite reward).
- `plan/card-ledger/upgrade.md`: both ballots, both verdicts verbatim, the stand-in figures.

## Measured
| Finding | Data |
|---|---|
| Upgrades the Chosen's deck can take (`cardUpgradePreviewVM`, 2026-11-09) | seven cards, each UPGRADE 1 OF 1; e.g. Siphon LEECH 4 → 5, Rose Wrap THORNS 3 → 4, Draw the Fever DEAL 4 → 6, LEECH 2 → 3 |
| Balance | not measurable before build, and not touched: a screen change, the rules stay the engine's |

## Prior art consulted
- **Slay the Spire — the smith's upgrade preview:** the card as it is and as it will be side by side, the changed numbers in green; widely liked as the clearest upgrade screen in the genre.
- **Destiny 2 — hold to dismantle:** irreversible actions need a held press with a filling ring; became a convention across console games for exactly this.
- **Animal Crossing: New Horizons — the tool ring:** items on a wheel, one selected at a time; well received for quick choice, criticised when the ring holds too many items.
- **iOS picker wheel:** a rotating drum where only the centre row is the value; familiar to every phone player.

## Rulings (T, this session)
- Round 1: H (the beads) is the main; B's card pair replaces H's text under the card; G's hold commits.
- The HOLD button's progress ring circles the centre bead.
- Only the centre bead is offered for upgrade, and it wears a special border.
- The player chooses by turning the wheel.
- Round 2: A, the rim at the foot, with smaller cards, no line under HOLD and a bigger figure at the top (`plan/card-ledger/upgrade/U-02-settled.webp`).

## Directions considered
### Option A — the rim at the foot *(chosen; inspired by the iOS picker wheel and Destiny's hold)*
A wide wheel with only its top rim showing; the centre bead under a notch, in a brass double ring; HOLD below. **Trade-off:** only five or six beads show at once, so a long deck takes turning. **Telltale failure mode:** players tap HOLD and nothing happens, or turn the wheel past the card they wanted.
### Option B — the whole wheel, HOLD in the hub
More beads visible; the hub crowds the foot. Not chosen.
### Option C — the statue behind the cards
Faint statue, halo on the bead. Not chosen.
### Option D — the wheel at the thumb, down the left edge
One-handed; squeezes the cards. Not chosen.

## Player fantasy
I lay one card before the statue, turn the beads until the right one sits under the notch, and hold until the blessing takes.

## Content boundary
The figure at the top (a stand-in, TOR-0007 Ahimsa), any spoken line and the card art are T's (D88). The plot builds the layout, the wheel and the hold around them.

## What proves it (not T, not the agent)
Component tests drive the wheel and the hold: turning moves the centre bead, a release before the ring closes commits nothing, a full hold commits exactly one upgrade through the host's `onConfirm`; the existing card-upgrade engine and presenter tests pass unchanged; `verify:visual` holds a baseline of the screen at the rest site. Then T plays an upgrade on the preview build at the rest site and at the Anvil.

## Handoff to /plot
Task: Rework the shared card upgrade screen (rest site, Anvil, elite reward) into the string of beads settled in `plan/card-ledger/upgrade.md` (U-02-settled): a big figure at the top, B's pair of cards, a wheel of beads at the foot where only the centre bead is offered, and a HOLD button whose ring circles that bead.
Source: this file
Acceptance:
- A1 Only the card on the centre bead can be upgraded; turning the wheel (a drag along the rim, snapping to a bead) brings another card there, and no other control commits.
- A2 Above the wheel, the card as it is (smaller, tilted, greyed) beside the card as it will be (upright, gold border), with the change named under it ("AS IT WILL BE · LEECH 4 → 5"); every number comes from `cardUpgradePreviewVM`.
- A3 Holding HOLD fills a ring round the centre bead; letting go before it closes empties it and commits nothing; a closed ring commits exactly one upgrade of one copy through the host's `onConfirm`.
- A4 The same component serves the rest site, the Anvil and the elite reward; the hosts keep their own price line and way back; no rule changes (the card-upgrade engine tests pass unchanged).
- A5 Layout as U-02-settled: smaller cards, no line under HOLD, the figure at the top as large as the space allows, the brass action button, card faces as D91.
- A6 A screen reader can pick a bead and upgrade it without the hold (an accessibility action on the centre bead).
Measure: the component tests in "What proves it", `verify:visual` with a new baseline for the screen, and T's play on the preview build.
Decisions made upfront: H is the main, with B's pair and G's hold; only the centre bead is offered and it wears a special border (a brass double ring and a notch above); the player turns the wheel to choose; the ring circles the centre bead; layout U-02a with T's round 2 changes.
Out of scope: the figure's final art and any spoken line (T's); upgrade rules; the dice side of the Anvil.
To confirm:
- The hold lasts 1 second [T to confirm].
- Letting go early empties the ring rather than keeping its progress [T to confirm].
- The wheel wraps round, so the last card sits next to the first [T to confirm].
- Tapping a side bead turns the wheel to it; it never upgrades [T to confirm].
- A card carried more than once shows its count on its bead (×3) [T to confirm].
- Today's locked `???` slot is dropped [T to confirm].
- The rest site gets a way back like the Anvil's back row, since today it has none [T to confirm].
- The figure at the top is the same stand-in at all three hosts until T supplies art [T to confirm].
Suggested slot: anytime; the screen is built and working today, and the overdue deadline rows (village, travel, loot cache, cutscene) come first.
