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
| **VULNERABLE +N% dM** | The bearer takes that much more damage from every hit, and more stacks it and refreshes the turns. On you, GUARD still blocks the larger hit. Heart scales N on a card; a foe's VULNERABLE on you does not scale. | grey-word; Blood Price P-05b, P-09b, M-07a; a foe move's `vulnerable` (Enemy keywords, below) |
| **LEECH N** | Each LEECH adds 3 turns and its number to the potency. At the start of its turn the bearer loses the potency in VITAE and the other side heals it, so race a LEECH on you. On the foe, a debuff with two numbers: each application, the first included, adds 3 turns (`LEECH_TURNS_PER_APPLICATION`) and adds N, heart-scaled when applied, to the potency. Each foe turn the foe loses the potency (unscaled, not a DEAL), you heal what it lost, and a turn ticks off. The potency never decays; at 0 turns LEECH ends and the potency resets. | Blood Price P-06d, E-03d, E-05n, M-01d, M-03d, M-08d; the Ruby Tithe and Open Vein signatures (Ruby Signet, Bleeding Signet); a foe move's `leech`, on you (Enemy keywords, below) |
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
round they were applied in; STORM never drops. Three signatures (the Elementalist's relics, LR1e) move
the weather: Eye of the Storm (the Signet, ◆6) clears your INFERNO and triggers the foe's STORM (it loses
its STORM now, no growth); Kindle the Gale (the Brooch, ◆4) turns only the foe-only INFERNO into STORM, so
the both-sides stack stays and you keep burning; Thaw into Thunder (the Belt, ◆3) turns all BLIZZARD into
STORM. Each is refused when it would change nothing.

| keyword | reminder text | carried by |
|---|---|---|
| **INFERNO N** | Both sides burn. At the start of its turn the foe loses N VITAE; at the start of yours you lose half of N, rounded down. Plain loss, not a DEAL, and yours can kill you. A "foe only" INFERNO burns only the foe; removing your INFERNO leaves the foe's. | the Elementalist trial set (EL1c) |
| **BLIZZARD N** | Each of the foe's attacks deals N less. | the Elementalist trial set (EL1c) |
| **FROZEN** | While the BLIZZARD is at least the foe's attack, the foe is FROZEN as it attacks: the next DEAL it takes is doubled, then FROZEN ends. The BLIZZARD stays, so it can freeze again. | the Elementalist trial set (EL1c) |
| **STORM N** | At the start of its turn the foe loses N VITAE (plain loss), then the STORM grows by 1. | the Elementalist trial set (EL1c) |

### The spikes

The Defender's answer to a foe strike (T, 2026-10-26; `src/Combat/combat.spikes.ts`). Each foe strike meets
THORNS first, then REFLECT; each is a DEAL, so VULNERABLE boosts it and a FROZEN foe takes it doubled. Neither
lowers the damage you take: GUARD still blocks your share. While GUARD holds (below), a card can make THORNS deal
double on that foe turn.

| keyword | reminder text | carried by |
|---|---|---|
| **THORNS N** | Each foe strike deals N back to the foe. THORNS drops by 1 at the end of each round after the one it was gained in. | the Defender trial set |
| **REFLECT N%** | Each foe strike sends N% of its damage before GUARD back to the foe. You still take the hit. Lasts 2 turns; a new REFLECT adds its % and refreshes to 2 turns. No cap. | the Defender trial set |

### The Merciful

The Merciful's heal-as-weapon words (T, 2026-10-29 and 2026-10-30; `src/Combat/combat.mercy.ts`). Heart scales the
numbers of RADIANCE and MERCY as it scales LEECH.

| keyword | reminder text | carried by |
|---|---|---|
| **RADIANCE N** | HEAL N, then DEAL what that heal restored: nothing at full VITAE. The hit is a DEAL, so VULNERABLE raises it and a FROZEN foe takes it doubled. Heart scales N. | the Merciful trial set (MF1d) |
| **MERCY N** | Heal the foe N, stopping at its max VITAE, and add N to its MERCY whatever the heal restored. The first MERCY starts a 3-turn clock; a new MERCY adds to the total and never resets the clock. When the clock runs out, at the start of the foe's turn, the MERCY bursts: the foe takes a DEAL of twice its MERCY, then the MERCY clears. Card text says "bursts", never "triggers". Heart scales N. | the Merciful trial set (MF1d) |
| **YIELDING** | While a foe is YIELDING you can befriend it whatever its VITAE. A card makes a foe YIELDING for as long as it has MERCY; the burst ends it. A foe that cannot be befriended stays so. | the Merciful trial set (MF1d) |

### Drawing

| keyword | reminder text | carried by |
|---|---|---|
| **DRAW N** | Draw N cards now. When your draw pile is empty, your discard is shuffled into it. | the Elementalist trial set (EL1c) |
| **RETRIEVE N** | Return N random cards from your discard to your hand. | the Defender trial set |

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

## Enemy keywords

The words a `phases` foe's move may carry (D116; Phases EN1d and EN1e). Each is a field
on `EnemyMove` (`src/Enemy/types.ts`), listed in `ENEMY_KEYWORDS`
(`src/Enemy/enemy-keywords.ts`) and resolved in
`src/Combat/combat.enemy-words.ts` and `combat.enemy-words.resolve.ts`. Every
number but VULNERABLE's, TANGLE's and BARNACLE's scales with the foe's level the
way its damage does (`scaleMoveNumber`); UNDERTOW names a die, not a number. The player's own VULNERABLE and LEECH can also land on
the player from a foe's move (the `vulnerable` and `leech` fields); their
rows are above, and their glosses read for either side. VULNERABLE on you is
`debuff_vulnerable` for the foe's next `turns` attacks; LEECH on you mirrors
the foe LEECH (3 turns per application, the potency stacks), ticks at the start of your
turn past GUARD, and the foe heals what you lost.

| keyword | reminder text | carried by |
|---|---|---|
| **WARD N** | The foe's GUARD: it soaks your DEALs before its VITAE and is gone at the start of its next turn. VULNERABLE, LEECH and INFERNO get past it. WARD meets only the part of a DEAL before VULNERABLE (FREE, PAID, a program DEAL, TETHER, a MERCY burst); a plain VITAE loss skips it. It lands after the move's hits, so the spikes those hits drew never meet it. `EnemyMove.ward`. | the Float-Eye (Shut Lid, and its Afterimage copies your GUARD), the Gallows Crow (Take Wing), the Crane-Hook (Lock the Brake), the Brine-Widow (Black Veil), the Lamprey-Knot (Knot Up), the Green Jelly (Settle), the Curfew-Ringer (Bar the Door), the Wreck-Picker (Hide in the Hoard), the Smokehouse Gutter (Smoke Lash), the Tithe-Collector (Ledger Shield, Foreclose) |
| **MEND N** | The foe heals that much VITAE, up to its maximum. Counter it with burst: damage dealt in one turn outruns the heal. The existing `enemyHeal`. `EnemyMove.enemyHeal`. | the Net-Mender (Mend the Net), the Gallows Crow (Carrion Dive under half VITAE), the Lamprey-Knot (Knot Up), the Smokehouse Gutter (Hang to Cure) |
| **SCOUR N** | The foe strips that many statuses off itself, the last one too: LEECH first, then INFERNO, STORM and its afflictions. Lay more statuses than it can strip. Its afflictions go newest first; a both-sides INFERNO leaves you your half. MERCY is not a status it strips. `EnemyMove.enemyCleanse`. | the Net-Mender (Mend the Net) |
| **BRINE N** | Each GUARD you gain is cut by that much until the end of your next turn. Gain your GUARD in one big play, not many small ones. Each gain is cut on its own (a PAID play's pips included, a HEAL's overflow into GUARD too); it fades at the start of the foe's next turn. `EnemyMove.brine`. | the Brine-Widow (Keening) |
| **TANGLE N** | Your next N cards cannot use their FREE line. Pay for them with dice. A FREE play is refused and costs nothing; each landed PAID play counts one card off, and what is left fades at the start of the foe's next turn. N is a count and does not scale with level. `EnemyMove.tangle`. | the Net-Mender (Cast Net, The Whole Catch), the Gallows Crow (Shiny Thing with no die banked), the Curfew-Ringer (Hush), the Smokehouse Gutter (Choking Smoke) |
| **UNDERTOW** | One named die (body, mind or heart) does not roll on your next turn. A Reserve die you banked is not on the tray, so bank one to cover it. The tray's base die of that colour is dropped (an act-reward or floating die of the colour still rolls); it lasts one turn. `EnemyMove.undertow`. | the Crane-Hook (Hoist, the body die), the Wreck-Picker (Gull-call, a random die) |
| **BARNACLE** | A Barnacle Curse joins your hand. It cannot be played or scrapped, and it holds a slot until you spend a body die on a card, which knocks one off. It is the engine's `barnacle` card, outside the player library; no program line can play or exile it. The count does not scale with level. `EnemyMove.barnacle`. | the Net-Mender (Gill-hook), the Smokehouse Gutter (Gut Hook), the Tithe-Collector (Lien) |

---

## System terms (printed, glossed, not keywords)

These get popups but are engine systems rather than card vocabulary; they live
in `SYSTEM_GLOSSARY`.

| term | what it is |
|---|---|
| CONVICTION ◆ | A spend-anytime resource banked from unspent dice and overflow. It never decays. |
| RESERVE & PIPS | Up to 2 dice held between phases instead of played. Each gains +1 pip per phase it survives, spent for extra intensity or Guard. |
| WILD / X | A WILD die (the gold die) counts as any color. A dead X die (a miss face) powers nothing. |
| HOLDS | GUARD holds: you have taken no damage this turn. A card that works "while GUARD holds" stops the moment a hit gets through. |
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
   An enemy word is instead a field on `EnemyMove` (`src/Enemy/types.ts`), its
   id in `ENEMY_KEYWORDS` (`src/Enemy/enemy-keywords.ts`) and `moveKeywords`,
   its threat effect built in `moveThreatAction` (`src/Combat/combat.threat.ts`)
   and resolved in `src/Combat/combat.enemy-words.resolve.ts`.
4. The gloss in `axiomancer-mobile/state/combat/keywords.ts`, the headline
   in `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`, and a
   glyph in `axiomancer-mobile/components/combat/statusGlyphs.ts` /
   `glyphShapes.ts`, mirrored in `scripts/build-catalog.mjs`.
5. A row in this atlas.
