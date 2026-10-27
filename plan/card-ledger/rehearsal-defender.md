# Card ledger, the Defender (third family)

> Run with `/lane-creator` (`docs/lane-creator.md`, D102) in an attended session
> with T, started 2026-10-26. The third lane: character selection (CH1, D108)
> needs three registered lanes before its first character can exist, and T plans
> a fourth lane after this one. Paper only until the trial set is plotted and
> built (step 8); nothing here is live content.
>
> **Live (Phase DF1d, 2026-10-27):** the thirty cards are the removable trial set `axiomancer-mechanics/src/Cards/library/defender.cards.ts`
> (one `TRIAL_SETS` line), with lane `defender` and the test deck below. The numbers shipped are "The numbers" table's.

## Session 0 — rulings (T, 2026-10-26)

| Call | Ruling |
|---|---|
| Gate | Met: the Elementalist is measured (`docs/reports/measured/latest.md`, R12a, carries its columns) |
| Family | **The Defender** (working name; T names cards later, D99) |
| Fantasy | "I'm a turtle with spikes who discards random cards from my own hand for bigger payouts." |
| Family shape | **Payoff / Engine / Misc, about 10 each** (30 plus grey), the shape of Blood Price and the Elementalist |
| Not the Suppliant's Ring lane | T chose a new family over the healing, stalling and mercy lane pitched for the Suppliant's Ring; that ring stays in the library for a later lane |
| Order | One lane at a time: this lane's Session 0 and ballot first, then the fourth lane |

### The spikes (T)

The Defender hurts what hits it, through three things:

| Piece | Ruling |
|---|---|
| **GUARD** | Plain, shared GUARD (blocks that much of the next threat phase; unused GUARD is lost). No lasting shell keyword: the turtle rebuilds its shell each turn |
| **THORNS N** | Each foe strike deals N back to the foe. **Per strike**: a foe move of "Deal 3 three times" triggers THORNS three times. THORNS **drops by 1 each round**, like BLIZZARD |
| **REFLECT N%** | Each foe strike sends N% of **the whole attack** back to the foe (the strike's damage before GUARD). Per strike, like THORNS |

- **THORNS and REFLECT damage is a DEAL** (T, 2026-10-26): VULNERABLE boosts it, a FROZEN foe takes it doubled, and Crimson Pact's +n can ride on it. This is how the Defender pairs with Blood Price and the Elementalist.

### The discard (T)

- **"Discard N random cards from your hand" is a pure cost**: it pays for a bigger payout; a discarded card does nothing because it was discarded (no "when discarded" lines).
- **The discard sits only on a card's PAID line.** The FREE line never discards, so a Defender card is always playable FREE.
- **A PAID line you cannot pay cannot be played** (fewer other cards in hand than it discards). T's words on how it is refused:
  1. "They press 'apply' and they get a short vibration and the card shakes back and forth a little (to signify, no you can't do that)."
  2. "They press 'End turn' and they get the same treatment but the turn does not end."
- The discard is not a keyword: it prints in plain words, as DEAL does. The family's signature keywords are **THORNS** and **REFLECT** (the 1-2 per lane rule, `plan/revamp/cards.md` deck model).

### Open

- **REFLECT's number.** What N% a card can print, whether REFLECT stacks by adding (as the weather does) and how long it lasts (a turn, a round count, or all combat, as THORNS's decay?). The ballot prints a placeholder: REFLECT lasts this turn only and stacks by adding.
- **THORNS's scaling.** Whether a stat scales N (a lane card's colour is the stat its payoff scales with). The ballot pitches by job (`docs/lane-creator.md` "Pitching a colour"): THORNS-led cards are afflictions (purple, as TETHER was), REFLECT-led cards walls (blue), DEAL-led cards hits (red); see "Ballot" below.
- **REFLECT and GUARD order.** "Of the whole attack" means before GUARD; whether REFLECT still fires on a strike GUARD fully blocks is assumed yes (the sims watch it).
- **Pairs.** How the Defender pairs with Blood Price and the Elementalist (DEAL makes VULNERABLE, FROZEN and Crimson Pact reach it); T's pair identities, as the Elementalist's were ruled, are not set.
- **The illegal-PAID feedback is an engine and UI rule for every card**, not only the Defender's (an unpayable SACRIFICE PAID is refused the same way?). It is recorded here and filed at step 8's plot; whether it already exists for SACRIFICE is checked then.
- **The family relic** (step 7), and whether a Defender card can appear as a character's starting lane card (CH1, D108; no Spell or Global).

## Sub-lane pitches (slot roles, approved by T, 2026-10-26)

The discard appears only on a PAID line. Approved as drafted (T, 2026-10-26: "Approve, build the ballot").

### Payoff (paid for spikes up, a shell held, cards thrown away)

| Slot | Type | Piece | Role |
|---|---|---|---|
| P-01 | Attack | THORNS | DEAL more for your THORNS |
| P-02 | Attack | GUARD | Shield bash: DEAL equal to your GUARD; PAID discards 1 for double |
| P-03 | Attack | discard | The big swing: DEAL; PAID discards 2 for much more |
| P-04 | Skill | REFLECT | GUARD; PAID discards 2 for a large REFLECT this turn |
| P-05 | Skill | THORNS | GUARD that grows with your THORNS |
| P-06 | Attack | THORNS + REFLECT | Retaliate: DEAL equal to what your spikes dealt last foe turn |
| P-07 | Spell | discard | Cast off: PAID discards N at random, then pays out per card discarded |
| P-08 | Skill | GUARD + THORNS | Spiked shell: GUARD; while it holds, THORNS deals double |
| P-09 | Attack | GUARD | Riposte: DEAL equal to the foe's telegraphed attack |
| P-10 | Global | THORNS | ⟳ Start of your turn: DEAL equal to your THORNS |

### Engine (puts the shell and the spikes up, keeps the hand stocked)

| Slot | Type | Piece | Role |
|---|---|---|---|
| E-01 | Skill | GUARD | A big GUARD; PAID discards 1 for more |
| E-02 | Skill | THORNS | THORNS |
| E-03 | Skill | REFLECT | REFLECT this turn |
| E-04 | Skill | GUARD + THORNS | GUARD and THORNS |
| E-05 | Spell | THORNS | THORNS; PAID discards 2 for a huge THORNS |
| E-06 | Skill | THORNS | Harden: THORNS skips its next drop |
| E-07 | Attack | THORNS | DEAL, then THORNS |
| E-08 | Skill | GUARD + REFLECT | GUARD and REFLECT |
| E-09 | Global | THORNS | ⟳ Start of your turn: THORNS 1 |
| E-10 | Skill | discard | Refill: DRAW 2 (fuel for the discards) |

### Misc (utility around it)

| Slot | Type | Piece | Role |
|---|---|---|---|
| M-01 | Skill | discard | DRAW 2 |
| M-02 | Skill | spikes | HEAL equal to what your spikes dealt last foe turn |
| M-03 | Skill | DEAL | VULNERABLE (from another lane: it boosts the spikes' DEALs) |
| M-04 | Skill | GUARD | Turtle up: GUARD equal to the foe's telegraphed attack |
| M-05 | Skill | discard | Conviction; PAID discards 1 for more (scrap floor: never only 1) |
| M-06 | Global | discard | ⟳ Start of your turn: DRAW 1 |
| M-07 | Skill | discard | Retrieve: return a randomly discarded card to your hand |
| M-08 | Attack | none | A cheap poke: a small DEAL, DRAW 1 |
| M-09 | Skill | discard | Plant: one card in hand is safe from the next random discard |
| M-10 | Skill | spikes | Withdraw: each foe strike deals less |

M-07 and M-09 soften the random discard (T dislikes stacked gamble mechanics).

## Ballot

`rehearsal-defender.ballot.html`, ballot id `defender-2026-10-26`, opened 2026-10-26 (lane-creator step 3). Ninety
candidates, three per slot. Every slot offers one red, one blue and one purple take, so the pitch is 30 / 30 / 30:

- **Red (hit):** the DEAL-led take.
- **Blue (wall, heal, utility):** the GUARD-, REFLECT-, HEAL- or DRAW-led take.
- **Purple (affliction):** the THORNS-led take, or VULNERABLE. THORNS is pitched an affliction as TETHER was in
  Blood Price: damage to the foe set off by what the foe does, lasting rounds. REFLECT is pitched a wall, since it
  answers each strike as GUARD does. T's slot notes overrule ("make it red").

Numbers are placeholders for the sims (step 6), scaled from the grey cards (A Plain Blow: FREE DEAL 2, PAID DEAL 5)
and the Elementalist's ballot; a PAID line that discards pays roughly half again over a plain PAID line. REFLECT is
printed as lasting this turn and stacking by adding (Open, above). The colours above were taken off the ballot by phase CL1
(D110, T, 2026-10-26): a card's colour is only which die pays for it, and the kept cards' colours are split evenly
within each sub-lane at the revisions step. THORNS scales with Heart (D110). No candidate prints a cap ("max"):
T, 2026-10-26: "remove the '(max +n)' from every card. If there should be a max, I'll call it out."

## Verdicts (T, 2026-10-26, pasted in session)

T voted the whole ballot in one sitting. The ballot's Submit could not reach the Worker (the `axiomancer-ballots`
Pages site is not up yet: phase BV1c, attended), so T generated the verdict and pasted it into the session; no
`final` row exists in D1 for `defender-2026-10-26`. The colour counts in the header are from the pre-CL1 ballot
page T voted on; colours are split afresh at the revisions step (D110). The `BALLOTS` entry stays `open`, as the
Elementalist's did, so T can still Submit the same verdict once BV1c puts the site up (a closed ballot drops the kit,
`scripts/ballot-kit.test.mjs`).

T's verdict text, verbatim:

```text
BALLOT — the Family (ballot shell; sample candidates)
kept 29 of 90: 4 red · 12 blue · 13 purple
-- Payoff --
P-01: KEEP P-01a (red) | cut: P-01b, P-01c | note: No max
P-02: KEEP P-02b (blue) | cut: P-02a, P-02c | note: No max
P-03: KEEP P-03c (purple) | cut: P-03a, P-03b | note: Put the Vulnerable before the DEAL strikes. Free: Vulnerable 25%, DEAL 4 ; Paid: Discard 2 cards at random. VULNERABLE 100%, DEAL 15
P-04: KEEP P-04a (red) | cut: P-04b, P-04c | note: Free: REFLECT 25%, THORNS 2 ; Paid: Discard 1 card at random. DEAL 5, REFLECT 75%
P-05: KEEP P-05c (purple) | cut: P-05a, P-05b
P-06: KEEP P-06c (purple) | cut: P-06a, P-06b | note: Free: Gain THORNS equal to the damage you've done this turn ; Paid: Gain THORNS equal to twice the damage you've done this turn.
P-07: KEEP P-07c (purple) | cut: P-07a, P-07b | note: Free: Guard 4 ; Paid: Discard your hand. Gain THORNS 3 for each card discarded. Exile
P-08: KEEP P-08b (blue) | cut: P-08a, P-08c | note: Same mechanic, but change the wording to: "Guard n. If you took no damage this turn, deal your next THORNS damage twice"
P-09: KEEP P-09b (blue) | cut: P-09a, P-09c | note: Same mechanic, but change the wording to: "If the foe attacks on their turn, REFLECT 50% before they DEAL damage"
P-10: KEEP P-10b (blue) | cut: P-10a, P-10c
-- Engine --
E-01: KEEP E-01c (purple) | cut: E-01a, E-01b
E-02: KEEP E-02b (blue) | cut: E-02a, E-02c
E-03: KEEP E-03b (blue) | cut: E-03a, E-03c
E-04: KEEP E-04a (red) | cut: E-04b, E-04c
E-05: KEEP E-05c (purple) | cut: E-05a, E-05b
E-06: KEEP E-06c (purple) | cut: E-06a, E-06b | note: Spell - Free: THORNS 3 ; Paid: Double your THORNS. Exile.
E-07: KEEP E-07c (purple) | cut: E-07a, E-07b | note: Paid: Discard 1 card at random. DEAL 10, THORNS 5
E-08: KEEP E-08b (blue) | cut: E-08a, E-08c
E-09: KEEP E-09c (purple) | cut: E-09a, E-09b | note: Start of your turn: Lose 3 VITAE, THORNS 3 (Can't wrap yourself in roses and expect not to get pricked)
E-10: KEEP E-10c (purple) | cut: E-10a, E-10b
-- Misc --
M-01: KEEP M-01b (blue) | cut: M-01a, M-01c | note: Free: DRAW 1, GUARD 4  ; Paid: DRAW 2 GUARD 8
M-02: KEEP M-02b (blue) | cut: M-02a, M-02c | note: Free: HEAL equal to your guard ; Paid: HEAL equal to your GUARD + your THORNS
M-03: KEEP M-03b (blue) | cut: M-03a, M-03c | note: Replace Vulnerable with percentages like the other cards (right? Or am I misremembering?)
M-04: KEEP M-04b (blue) | cut: M-04a, M-04c | note: Free: GUARD 4 ; Paid: You don't lose your GUARD at the end of the enemy's turn this turn.
M-05: KEEP M-05c (purple) | cut: M-05a, M-05b
M-06: KEEP M-06b (blue) | cut: M-06a, M-06c
M-07: KEEP M-07c (purple) | cut: M-07a, M-07b | note: Free: RETRIEVE 1 (new keyword, this will be available for all lanes, like draw. "Return a random card from your discard to your hand") ; Paid: Return a random exiled card to your draw pile.
M-08: KEEP M-08c (purple) | cut: M-08a, M-08b | note: Free: DEAL 2, THORNS 2 ; Paid: DEAL 4, THORNS 2, DRAW 1
M-09: KEEP M-09a (red) | cut: M-09b, M-09c | note: Free: GUARD 4 ; Paid: DEAL 10, GUARD 4. If this card is discarded, THORNS 2 (This happens if they manually discard it or if it's discarded randomly)
M-10: CUT slot | note: Change this card entirely to a Global that reads: "Start of your turn: REFLECT 15%"
general: I want to note that each REFLECT that's stacked on top of another REFLECT will do this:
Refresh back to 2 turns
+n to the effectiveness
So if the player HAS 25% reflect with 1 turn left, then gives themselves 50% reflect from a card, they now have 75% reflect for 2 turns. 1 turn passes, they have 75% reflect for 1 turn left. They get 25% reflect from a card, and now it's up to 100% for 2 turns.
```

### The kept family, with T's notes applied

Thirty cards: twenty-nine keepers and M-10 rewritten by T as a Global. Paper; numbers are T's where T wrote them and
the ballot's otherwise, until the revisions and the sims. VULNERABLE prints as a percentage for a number of turns, as
the live library prints it (Blood Price: "VULNERABLE +25% for 1 turn"); T remembered it right (M-03).

| Slot | Kept | Type | FREE | PAID |
|---|---|---|---|---|
| P-01 | P-01a | Attack | DEAL 4, +1 per THORNS you have. | DEAL 8, +2 per THORNS you have. |
| P-02 | P-02b | Skill | GUARD 4. | Discard 1 card at random. GUARD 8, then DEAL equal to your GUARD. |
| P-03 | P-03c | Attack | VULNERABLE 25%, then DEAL 4. | Discard 2 cards at random. VULNERABLE 100%, then DEAL 15. |
| P-04 | P-04a | Attack | REFLECT 25%, THORNS 2. | Discard 1 card at random. DEAL 5, REFLECT 75%. |
| P-05 | P-05c | Skill | THORNS 2, then GUARD equal to your THORNS. | THORNS 3, then GUARD twice your THORNS. |
| P-06 | P-06c | Skill | THORNS equal to the damage you've done this turn. | THORNS equal to twice the damage you've done this turn. |
| P-07 | P-07c | Spell | GUARD 4. | Discard your hand. THORNS 3 for each card discarded. EXILE. |
| P-08 | P-08b | Skill | GUARD 4. If you took no damage this turn, deal your next THORNS damage twice. | GUARD 9. The same rider. |
| P-09 | P-09b | Skill | GUARD 3, REFLECT 25%. | GUARD 6. If the foe attacks on their turn, REFLECT 50% before they DEAL damage. |
| P-10 | P-10b | Global | Start of your turn: GUARD equal to your THORNS. | The same line, permanent. |
| E-01 | E-01c | Skill | GUARD 4, THORNS 1. | Discard 1 card at random. GUARD 10, THORNS 2. |
| E-02 | E-02b | Skill | GUARD 3, THORNS 1. | GUARD 5, THORNS 3. |
| E-03 | E-03b | Skill | REFLECT 50%. | REFLECT 100%. |
| E-04 | E-04a | Attack | DEAL 3, GUARD 2, THORNS 1. | DEAL 5, GUARD 4, THORNS 2. |
| E-05 | E-05c | Spell | THORNS 3. | Discard 2 cards at random. THORNS 8. EXILE. |
| E-06 | E-06c | Spell | THORNS 3. | Double your THORNS. EXILE. |
| E-07 | E-07c | Attack | DEAL 2, THORNS 2. | Discard 1 card at random. DEAL 10, THORNS 5. |
| E-08 | E-08b | Skill | GUARD 3, REFLECT 25%. | GUARD 6, REFLECT 50%. |
| E-09 | E-09c | Global | Start of your turn: lose 3 VITAE, THORNS 3. | The same line, permanent. |
| E-10 | E-10c | Skill | DRAW 1, THORNS 1. | DRAW 2, THORNS 2. |
| M-01 | M-01b | Skill | DRAW 1, GUARD 4. | DRAW 2, GUARD 8. |
| M-02 | M-02b | Skill | HEAL equal to your GUARD. | HEAL equal to your GUARD + your THORNS. |
| M-03 | M-03b | Skill | GUARD 3, VULNERABLE as a % (was VULNERABLE 1). | GUARD 6, VULNERABLE as a % (was VULNERABLE 2). |
| M-04 | M-04b | Skill | GUARD 4. | You don't lose your GUARD at the end of the enemy's turn this turn. |
| M-05 | M-05c | Skill | Gain 1 Conviction. THORNS 1. | Discard 1 card at random. Gain 3 Conviction. THORNS 2. |
| M-06 | M-06b | Global | Start of your turn: DRAW 1. | The same line, permanent. |
| M-07 | M-07c | Skill | RETRIEVE 1. | Return a random exiled card to your draw pile. |
| M-08 | M-08c | Attack | DEAL 2, THORNS 2. | DEAL 4, THORNS 2, DRAW 1. |
| M-09 | M-09a | Attack | GUARD 4. | DEAL 10, GUARD 4. If this card is discarded, THORNS 2. |
| M-10 | (T's) | Global | Start of your turn: REFLECT 15%. | The same line, permanent. |

### T's rulings in the notes

- **REFLECT lasts 2 turns and stacks (T, general note).** A new REFLECT adds its % to the one you have and
  refreshes the duration to 2 turns: 25% with 1 turn left, plus a 50% card, is 75% for 2 turns; a turn later 75% for
  1 turn; plus a 25% card, 100% for 2 turns. This settles Session 0's Open line on REFLECT's duration and stacking.
- **RETRIEVE n is a new keyword for every lane, as DRAW is (T, M-07):** "Return a random card from your discard to
  your hand."
- **A "when discarded" line (T, M-09):** "If this card is discarded, THORNS 2 (This happens if they manually discard
  it or if it's discarded randomly)." This overrules, for this card, Session 0's "a discarded card does nothing
  because it was discarded".
- **M-10 becomes a Global (T):** the withdraw slot is cut and replaced by "Start of your turn: REFLECT 15%".
- **P-03: VULNERABLE before the DEAL** (T), so the strike it rides on is boosted.
- **No max (T, P-01, P-02).** Neither line prints a cap; recorded so none is added.
- **Globals:** a Global's PAID line reads as its FREE line and the benefit of paying is that it is permanent (T's
  Elementalist ruling, 2026-10-23), applied to P-10, E-09, M-06 and M-10.

### Open (for the revisions)

- P-03 and M-03: VULNERABLE's duration (the live cards print "for 1 turn" or "for 2 turns"), and M-03's percentages.
- P-08: what "this turn" means for a GUARD played on your turn (the damage comes on the foe's turn).
- P-09: whether "before they DEAL damage" means REFLECT lands before the strike resolves (it can kill the foe first).
- M-09: whether the "if discarded" rider prints on both lines (it is a card property) and what "manually discard" is
  (the engine has no discard-by-choice yet).
- REFLECT: whether it stops at 100% (the No caps rule says it grows unless T names a cap); M-10 adds 15% every turn
  and refreshes, so it grows each turn the Global is in play.
- P-07 PAID with no other cards in hand: payable (it discards nothing) or refused.

## Revisions (T, 2026-10-26, in session)

Settled in the same sitting as the verdicts; the sims (`sandbox/defender-sims`, `plan/card-ledger/defender-sims.md`)
ran alongside and inform the number changes the trial-set plot carries.

### Rules

| Call | Ruling |
|---|---|
| REFLECT and your damage | T: "the player still takes the damage the enemy does, regardless of reflect. So 10 dmg vs. 100% reflect means both entities take 10 dmg." REFLECT never reduces the hit; GUARD still blocks your share. |
| REFLECT cap | **No cap** (T). REFLECT grows without limit; above 100% it sends back more than the hit. |
| P-08 | **While GUARD holds** (T): on the foe's next turn, every THORNS hit deals double while you have taken no damage that turn. T: "that would mean 'holds' would have to be added to the glossary." |
| P-09 PAID | **REFLECT is up in time** (T): the 50% is in place before the foe's first strike lands, so it reflects that strike too. |
| VULNERABLE | T thought VULNERABLE lasted 3 turns; it lasts 1 or 2, so T chose bigger numbers: **P-03** FREE "VULNERABLE +50% for 1 turn, then DEAL 4", PAID "Discard 2 cards at random. VULNERABLE +150% for 2 turns, then DEAL 15"; **M-03** FREE "GUARD 3, VULNERABLE +50% for 1 turn", PAID "GUARD 6, VULNERABLE +75% for 2 turns". |

### Colours (proposed by the session, approved by T as is)

Ten per colour, split within each sub-lane:

| Colour | Payoff | Engine | Misc |
|---|---|---|---|
| Red | P-01, P-03, P-06 | E-04, E-07, E-10 | M-03, M-05, M-08, M-09 |
| Blue | P-02, P-08, P-09, P-10 | E-01, E-03, E-08 | M-01, M-02, M-04 |
| Purple | P-04, P-05, P-07 | E-02, E-05, E-06, E-09 | M-06, M-07, M-10 |

### Names (drafted by the session, approved by T)

| Payoff | Engine | Misc |
|---|---|---|
| P-01 Bristling Blow | E-01 Studded Guard | M-01 Hunker Down |
| P-02 Shield Bash | E-02 Barbed Wall | M-02 Mend the Shell |
| P-03 Cracking Swing | E-03 Mirrorhide | M-03 Crack the Armour |
| P-04 Mirror Barb | E-04 Hedge Strike | M-04 Turtle Up |
| P-05 Thornwall | E-05 Briar Surge | M-05 Prickly Resolve |
| P-06 Spite Growth | E-06 Overgrowth | M-06 Steady Shell |
| P-07 Shed the Shell | E-07 Thorn Lash | M-07 Rummage |
| P-08 Spiked Shell | E-08 Polished Shell | M-08 Nettle Poke |
| P-09 Riposte | E-09 Rose Wrap | M-09 Loose Spine |
| P-10 Bramble Carapace | E-10 Gather Thistles | M-10 Lacquered Shell |

### The family relics (drafted by the session on LR1's pattern, approved by T)

One elite-only relic and two quest relics, as LR1 gives Blood Price and the Elementalist
(`plan/phases/phase_LR1_lane_relics.md`). Signature names and descriptions are plain, for T to rewrite.

| Relic | Signature (cost in Conviction) | Stats | Source |
|---|---|---|---|
| Thornback Signet | THORNS equal to your GUARD (5) | +5 Heart, +20 max VITAE | elite only |
| Mirror Brooch | REFLECT 50% (3) | +5 Mind | quest |
| Carapace Belt | Your GUARD isn't lost at the end of the foe's next turn (4) | +5 Body | quest |

### The test deck (20, T: "Include all globals and all spells in the trial deck I can get from the dev menu")

Every Global (P-10, E-09, M-06, M-10) and every Spell (P-07, E-05, E-06); every payoff has its setup in the deck;
no copies; 7 red, 6 blue, 7 purple.

| Colour | Cards |
|---|---|
| Red | P-01, P-03, P-06, E-04, E-07, M-08, M-09 |
| Blue | P-02, P-08, P-10, E-01, E-03, M-01 |
| Purple | P-07, E-05, E-06, E-09, M-06, M-07, M-10 |

### Two more rules (T, same sitting)

| Call | Ruling |
|---|---|
| M-09 "if discarded" | T: "There's definitely a discard by choice. There's a trash can icon to the left in combat. It nets you 1 conviction." The manual discard is the scrap (`discardCombatCard`); M-09's THORNS 2 fires on a scrap and on a random discard. It is a property of the card, printed once, whichever line would have been played. |
| P-07 with no other card | T: "Not Paid you can't. The free line can be played without discarding." PAID is refused (the shake) when no other card is in hand, as every PAID discard line is; FREE plays. |

## Sims (lane-creator step 6)

Branch `sandbox/defender-sims` (head `2cafd40df`, cut from `origin/main` at `72b0186b7`), report
`plan/card-ledger/defender-sims.md` on that branch; never merged. 300 seeded runs per cell, the 26 Act 1 ledger fights,
the three stat spreads; grey, Blood Price and the Elementalist re-measured on the branch match the last measured line
exactly. The relics are not modelled.

- **The Defender kills faster than every lane**: the test deck takes 1.90 / 2.21 / 2.82 turns on Float-Eye, the Green
  Jelly and the Death Beholder (T's targets about 3 / 5 / 7); the 30-card deck 2.08 / 2.42 / 3.09. Grey 3.03 / 4.19 /
  6.82, Blood Price 2.10 / 2.56 / 3.75, the Elementalist 2.76 / 3.32 / 4.58.
- **100% wins in all 78 cells**, lowest-VITAE p10 0.79 to 0.98; E-09's self-loss never killed.
- **DEAL does most of the killing** (67 to 73%), THORNS about a quarter, REFLECT 3 to 20%. P-03 PAID is the biggest
  card; VULNERABLE adds about a quarter of the Death Beholder's VITAE.
- **THORNS runs away through P-06** (p90 27 to 64, max 178); **REFLECT** peaks at p90 113 to 200%, max 295%, from E-03
  refreshing; M-10 hardly matters in fights of about 3 turns.
- **A PAID discard is never unpayable at turn start**; it is refused later in a turn once the hand empties.
- **No card is dead on both lines.** Near-dead PAID lines: M-07, M-02, M-04, M-05, E-01, P-06. M-09's FREE line loses
  to scrapping it.
- Numbers alone do not reach T's targets: halving every DEAL leaves the Death Beholder at about 3.3 turns.

### The numbers (T, 2026-10-27: "Ship the sims' fixes")

T chose the sims' suggested changes 1, 2, 3, 4, 6 and 7 for the trial set; THORNS numbers (5) and M-10 (8) unchanged.

| Card | Was (as revised) | Ships |
|---|---|---|
| P-01 | DEAL 4, +1 per THORNS / DEAL 8, +2 per THORNS | DEAL 2, +1 per 2 THORNS / DEAL 4, +1 per THORNS |
| P-03 | VULNERABLE +50% 1 turn, DEAL 4 / VULNERABLE +150% 2 turns, DEAL 15 | VULNERABLE +25% 1 turn, DEAL 2 / VULNERABLE +75% 2 turns, DEAL 8 |
| P-04 | PAID DEAL 5 | PAID DEAL 3 |
| P-06 | THORNS equal to / twice the damage you've done this turn | THORNS equal to half / equal to the damage you've done this turn |
| E-01 | PAID GUARD 10, THORNS 2 | PAID GUARD 10, THORNS 3 |
| E-04 | DEAL 3 / DEAL 5 | DEAL 2 / DEAL 3 |
| E-07 | DEAL 2 / DEAL 10 | DEAL 1 / DEAL 5 |
| M-04 | PAID: keep your GUARD | PAID: GUARD 4, and keep your GUARD |
| M-08 | DEAL 2 / DEAL 4 | DEAL 1 / DEAL 2 |
| M-09 | PAID DEAL 10 | PAID DEAL 5 |

### Still open (after the trial set is played)

- The pace: even with these numbers the Defender runs under T's targets.
- Structure: M-07 PAID rarely has an exiled card to return; M-09 FREE loses to scrapping it; M-02 and M-05 PAID are
  rarely worth paying.
