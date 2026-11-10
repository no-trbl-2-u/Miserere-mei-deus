# Card upgrade screen ballot (2026-11-09)

T's `/pitch` for the card upgrade screen: eight looks, the first being today's.

Ballot: `upgrade.ballot.html` (id `upgrade-2026-11-09`). Shots: `upgrade/U-01<a-h>.webp`, 390x844 at 2x. `U-01a` is T's phone screenshot of the rest site's picker (status bar cropped). `b` to `h` are mockups drawn from the real kit art (`experience/brass/action-button-*`, the vellum panel, the campfire frame), the app's fonts and the cards' own art.

## What the screen is today

One component, `components/upgrade/CardUpgradePicker.tsx` (UP1d), hosted by the rest site (`app/rest/index.tsx`), the Anvil's UPGRADE A CARD and the elite reward. Its copy is `state/presenters/card-upgrade.copy.ts`; its rows and preview are `state/presenters/card-upgrade.engine.ts`. Tapping a row only previews (NOW, AFTER, a locked `???`); UPGRADE IT commits.

## What the ballot holds fixed

- The rules: one card, one copy of it, its next upgrade (`nextUpgradeId`). No look changes what may be upgraded or what it becomes.
- Every number in the mockups is the engine's, read through `cardUpgradePreviewVM` for the Chosen's deck on 2026-11-09 (for example Rose Wrap THORNS 3 to 4, Draw the Fever DEAL 4 to 6 and LEECH 2 to 3).
- One card face everywhere (D91): the mockups draw the card as the settled Shop (S-01d) does.
- T, 2026-11-09: one menu and button background across the app, the brass action button.

## Stand-in figures

From `Potential Assets/sorted-entity-library-base`, black ground removed. Art is T's (D88); these only hold the space.

| Role | Atlas entry | File | Look |
|---|---|---|---|
| Keeper at the fire | TOR-0424 Hermit | `portraits/Hermit A.png` | C, D |
| Smith | TOR-0821 Stonehead | `portraits/Stonehead.jpg` | G |
| The blade between | TOR-0268 Enchanted Sword | `items/Enchanted Sword.jpg` | E |
| The forge blade | TOR-0303 Fire Sword | `items/Fire Sword A.png` | G |
| The ledger's book | TOR-0205 Devil Book | `items/Devil Book.jpg` | F |
| The statue | TOR-0007 Ahimsa | `items/Ahimsa.jpg` | H |

## Open for the plot

- Whether the screen takes its host's keeper (the hermit at the fire, the smith at the Anvil) or stays host-free.
- The locked `???` slot: today's preview shows it; no mockup does.
- The spoken lines are placeholders for T's words (`[content]`).
