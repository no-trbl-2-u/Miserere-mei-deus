# Card ledger, the Defender (third family)

> Run with `/lane-creator` (`docs/lane-creator.md`, D102) in an attended session
> with T, started 2026-10-26. The third lane: character selection (CH1, D108)
> needs three registered lanes before its first character can exist, and T plans
> a fourth lane after this one. Paper only until the trial set is plotted and
> built (step 8); nothing here is live content.

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
printed as lasting this turn and stacking by adding (Open, above). No candidate prints a cap ("max"):
T, 2026-10-26: "remove the '(max +n)' from every card. If there should be a max, I'll call it out."
