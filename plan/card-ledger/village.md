# Village, Blacksmith and Shop ballot (2026-11-09)

T's `/pitch` for the village treatment: five screens each for the Village hub, the Blacksmith and the Shop, the first of each being today's.

Ballot: `village.ballot.html` (id `village-2026-11-09`). Shots: `village/<slot><a-e>.webp`, 390x844 at 2x. `V-01a` and `S-01a` are the app's baseline shot (`axiomancer-mobile/screenshots/baseline/village.png`), since today's shop is a section of the village page. `B-01a` is redrawn from `app/blacksmith/index.tsx`, because the web export would not finish on this machine (out of heap, then out of memory). `b` to `e` are mockups drawn from the real kit art and fonts.

## What the ballot holds fixed

- T, 2026-11-06 (`ui-kit.md`, V-01): the village is a hub of options (Rest, Card Shop, Blacksmith, any other offer, Exit), and each opens its own screen with an NPC.
- T, 2026-11-09: one menu and button background across the app, drawn here as the brass action button (`experience/brass/action-button-*`) that the main menu and Settings wear.
- T, 2026-11-09: harmless NPC portraits from `Potential Assets/sorted-entity-library-base`, as stand-ins T can replace. Art is T's (D88), so these only hold the space.

## Stand-in portraits

| Role | Atlas entry | File |
|---|---|---|
| Innkeeper | TOR Harbalist | `Harbalist A.png` |
| Shopkeeper | TOR-0275 Evil Merchant | `Evil Merchant A.png` |
| Smith | TOR-0821 Stonehead | `Stonehead.jpg` |
| Host (V-01d only) | TOR-0424 Hermit | `Hermit A.png` |

Each had its black ground removed for the mockups (flood fill from the edges), so the figure sits on the plate.

## Open for the plot

- Where weapons and armor go. Today they are their own village counter; S-01c draws them as a Gear tab.
- The Blacksmith's opening step. Today's flow opens on an intro with SET THEM ON THE ANVIL; every mockup puts the smith's line on the working screen and drops that step.
- The spoken lines are placeholders for T's words (`[content]`).

## Round 1 verdicts

Decided 2026-11-09 by T, pasted from the ballot. Verbatim:

```
BALLOT: village, blacksmith and shop (village-2026-11-09)
answered 3 of 3
V-01 The Village: KEEP V-01d (The host) | note: Let's see if we can do a combination of B + D
B-01 The Blacksmith: KEEP B-01e (The smith fills the screen) | note: What is "Swap gear"? I think this looks great, but before you plot anything, let's see if we can get a combination of E and C
S-01 The Shop: KEEP S-01d (One card at a time) | note: Let's start offering 5 cards instead of 3. Also, does the shop sell gear today?
```

The Shop is settled: S-01d, with five cards (`cardShopSize` is 3 in `World/Village/village.content.ts` today).

Answers from the code, 2026-11-09:

- **Swap gear** replaces a die's whole gear with a variant the smith offers (8 shillings), but `BLACKSMITH_WITNESS_VARIANTS` is empty, so no smith offers one and the button never appears in the game. Round 2 leaves it out.
- **Gear in the shop:** yes. Every village with a card shop also sells up to two weapons or armor pieces the player does not carry, 40 shillings each (`EQUIPMENT_DROP_TUNING`), as its own counter. Where it goes in the new Shop is still open.

## Round 2

Ballot: `village-2.ballot.html` (id `village-round-2-2026-11-09`). Five variations each: `V-02a` to `e` blend the Village's B and D, `B-02a` to `e` blend the Blacksmith's E and C. Shots: `village/<slot><a-e>.webp`.

## Round 2 verdicts

Open.
