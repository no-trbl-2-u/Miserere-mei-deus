# Keyword atlas — the live combat vocabulary

One row per keyword the game glosses: the word, the reminder text a player
reads the first time they meet it, and what carries it. The rules behind each
word are in [`docs/game-model.md`](../../docs/game-model.md).

**Sources of truth.** Reminder text lives in
`axiomancer-mobile/state/combat/keywords.ts`: card keywords in
`KEYWORD_GLOSS`, system terms in `SYSTEM_GLOSSARY`. This file is the index,
not the source. When a row disagrees with the code, the code wins and the row
is the bug. `scripts/content-drift.test.mjs` checks that every row here has a
gloss and every gloss has a row; `scripts/axio-mcp-server.mjs` serves these
tables as `axio_keywords`.

**The bar.** A word earns a row when a live card, item, hazard or die prints
it and its reminder text says more than the word does. A one-card mechanic
stays as plain rules text on that card. Every printed number is the number
the engine applies.

**Card and Rule keywords** (T, card-spec ballot §9, 2026-10-13). A Card
keyword lives on a card face. A Rule keyword appears on cards but names a
place on the board outside the deck: the EXILE pile, the GLOBAL space. The
complexity budget counts only Card keywords, and never DEAL or GUARD.

**The complexity budget by rank** (ratified as written, ballot §9).
Ash/Tooth carry at most 1 keyword beyond DEAL and GUARD and no condition;
Splinter/Rib at most 2 and one condition; Skull/Saint are unbudgeted. A
Global's trigger is a condition. `COMPLEXITY_BUDGET` in
`src/Cards/card-rules.ts` holds the bands and
`src/Cards/e2e/card-rules.engine.test.ts` enforces them.

---

## Card keywords

### Damage

| keyword | reminder text | carried by |
|---|---|---|
| **DEAL N** | Direct VITAE damage. Plain English on the face, so it has no gloss. | grey-strike (PAID); the Blood Price trial set |

### Afflictions

| keyword | reminder text | carried by |
|---|---|---|
| **VULNERABLE +N% dM** | The foe takes that much more damage from every hit. Adding more stacks it and refreshes the turns. Heart scales N. | grey-word; Blood Price P-05b, P-09b, M-07a |
| **LEECH N** | Each LEECH adds 3 turns and its number to the potency. At the start of its turn the foe loses the potency in VITAE and you heal what it lost. A debuff with two numbers: each application, the first included, adds 3 turns (`LEECH_TURNS_PER_APPLICATION`) and adds N, heart-scaled when applied, to the potency. Each foe turn the foe loses the potency (unscaled, not a DEAL), you heal what it lost, and a turn ticks off. The potency never decays; at 0 turns LEECH ends and the potency resets. | Blood Price P-06d, E-03d, E-05n, M-01d, M-03d, M-08d; the Ruby Tithe and Open Vein signatures (Ruby Signet, Bleeding Signet) |
| **TETHER N** | For that many turns, each SACRIFICE makes the foe take damage equal to the VITAE it paid (a DEAL: unscaled, VULNERABLE applies; a WAIVED SACRIFICE deals 0). | Blood Price P-08d, E-02d, E-05n, E-10d |
| **BLEED** | Each hit the bearer takes deals 3 more VITAE per Bleed stack, then removes a stack. | no live carrier: no card, foe, hazard or item applies `debuff_bleed`; the effect stays in `src/Effects/debuffs.library.json` and mobile still glosses it |

### Walls

| keyword | reminder text | carried by |
|---|---|---|
| **GUARD N** | Blocks that much incoming attack damage during the next threat phase. Unused Guard is lost. | grey-ward |

### Mending

| keyword | reminder text | carried by |
|---|---|---|
| **HEAL N** | Restores that much VITAE, up to your maximum. Mind scales N on a card; healing "the damage dealt" heals that amount, unscaled. | Blood Price M-01d, M-02b, M-04n, M-06c, M-07a, M-09a; the three healing potions (`src/Items/consumable.library.ts`) |

### The blood price

| keyword | reminder text | carried by |
|---|---|---|
| **SACRIFICE N** | Lose that much VITAE as a cost. It never takes you below 1, so a line you cannot pay cannot be played. Unscaled. A SACRIFICE that fires n times counts as n; one that "counts twice" is paid once and fires twice. Two signatures ride the next SACRIFICE: Crimson Return (the Crimson Circlet) makes it heal what it would have cost instead, and it still counts; Ruby Tithe (the Ruby Signet) makes it add LEECH equal to the VITAE paid, unscaled. | Blood Price P-01a, P-02a, P-05b, P-08d, P-09b, E-01n, E-02d, E-03d, E-05n, E-06b, E-08n, E-10d, M-04n and the grey Curse |
| **WAIVE** | Your next SACRIFICE this turn costs no VITAE but still counts. | Blood Price E-04c |

Crimson Pact (E-09n) prints its rule in full on the card ("🩸 When you
SACRIFICE n: your next DEAL this turn deals +n."), so it has no row: the +n
is unscaled, stacks across SACRIFICES, goes to the next DEAL (a card's, a
Global's or TETHER's) before VULNERABLE, and expires at the end of the turn.

### The weather

The Elementalist's elements (Phase EL1a, `src/Combat/combat.elements.ts`).
All three last the whole combat, stack by adding and are unscaled; an
element at 0 is gone. BLIZZARD and INFERNO drop by 1 every round after the
round they were applied in; STORM never drops.

| keyword | reminder text | carried by |
|---|---|---|
| **INFERNO N** | Both sides burn. At the start of its turn the foe loses N VITAE; at the start of yours you lose half of N, rounded down. Plain loss, not a DEAL, and yours can kill you. A "foe only" INFERNO burns only the foe; removing your INFERNO leaves the foe's. | the Elementalist trial set (EL1c) |
| **BLIZZARD N** | Each of the foe's attacks deals N less. | the Elementalist trial set (EL1c) |
| **FROZEN** | While the BLIZZARD is at least the foe's attack, the foe is FROZEN as it attacks: the next DEAL it takes is doubled, then FROZEN ends. The BLIZZARD stays, so it can freeze again. | the Elementalist trial set (EL1c) |
| **STORM N** | At the start of its turn the foe loses N VITAE (plain loss), then the STORM grows by 1. | the Elementalist trial set (EL1c) |

### Drawing

| keyword | reminder text | carried by |
|---|---|---|
| **DRAW N** | Draw N cards now. When your draw pile is empty, your discard is shuffled into it. | the Elementalist trial set (EL1c) |

### The dice

| keyword | reminder text | carried by |
|---|---|---|
| **PIP** | Each threat phase a Reserve die survives, it gains one pip, capped at 2 (`RESERVE_PIP_CAP`). Each pip spent adds +2 intensity (`PIP_INTENSITY_BONUS`), or +5 Guard on a defend card (`PIP_GUARD_BONUS`). | banked Reserve dice |
| **BOON** | A die's BOON face powers a card of its color and grants Conviction. Its equipped gear sets how much (2 by default, `SPECIAL_CONVICTION_DEFAULT`). | the special face of every die (the engine calls it `'special'` and the die prints SPECIAL) |
| **HONE** | A blacksmith upgrade: adds a mana face to a die's gear, so more of its rolls power a card. | the Anvil (turns a miss face to mana) |
| **TEMPER** | A blacksmith upgrade: turns a mana face into a BOON face. A colored die caps at 2 boon and 1 miss, gold at 1. | the Anvil |

---

## Rule keywords

Printed on cards, but each names a place on the board, not a card's own
effect (ballot §9). The budget does not count them.

| keyword | reminder text | carried by |
|---|---|---|
| **EXILE** | The card leaves combat instead of going to your discard. | Every trial-lane Spell's PAID line (the Spell law: Blood Price P-04c, P-05b, P-09b, E-01n, E-04c, E-07b, E-10d, M-07a, M-10a; Elementalist P-05, E-01, E-03, E-05, E-08, E-10, M-04, M-07), Blood Price P-07b and M-06c, and the grey Curse (PAID lines) |
| **GLOBAL** | A card type: stays in play and fires on its trigger (⟳ start of your turn, 🩸 when you SACRIFICE n, 📜 when you play a Curse): 3 turns played FREE, all combat played PAID. Copies stack as independent instances, each firing and expiring on its own (experimental, T 2026-10-14). | Blood Price P-10c, E-03d, E-09n, M-08d |

---

## Enemy keywords (none)

No enemy carries a keyword (`EnemyKeyword = never`). The three foes fight
with plain damage from their decks.

---

## System terms (printed, glossed, not keywords)

These get popups but are engine systems rather than card vocabulary; they live
in `SYSTEM_GLOSSARY`.

| term | what it is |
|---|---|
| CONVICTION ◆ | A spend-anytime resource banked from unspent dice and overflow. It never decays. |
| RESERVE & PIPS | Up to 2 dice held between phases instead of played. Each gains +1 pip per phase it survives, spent for extra intensity or Guard. |
| WILD / X | A WILD die (the gold die) counts as any color. A dead X die (a miss face) powers nothing. |
| CURSE | A card type: a dead card that holds a hand slot until played. It cannot be scrapped. The grey Curse is defined, but no card adds it and it is in no lane, deck or reward pool (foes will add Curses later). |

---

## Wiring a keyword

A new keyword touches each of these. A keyword that misses a step does not
ship.

1. The mechanic: a `CardSpecialMechanic` member in
   `axiomancer-mechanics/src/Cards/types.ts`, or a status in
   `axiomancer-mechanics/src/Effects/debuffs.library.json` /
   `buffs.library.json` with its payload in `src/Effects/types.ts`.
2. Resolution in `axiomancer-mechanics/src/Combat/combat.engine.ts` and face
   text in `axiomancer-mechanics/src/Combat/combat.cards.ts`. Both switches
   have `default:` arms, so a kind that skips them type-checks clean while
   doing nothing; a carrier card is what catches it.
3. A carrier in `axiomancer-mechanics/src/Cards/library/`.
4. The gloss in `axiomancer-mobile/state/combat/keywords.ts`, the headline
   in `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`, and a
   glyph in `axiomancer-mobile/components/combat/statusGlyphs.ts` /
   `glyphShapes.ts`, mirrored in `scripts/build-catalog.mjs`.
5. A row in this atlas.
