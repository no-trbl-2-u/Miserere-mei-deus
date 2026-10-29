# Card ledger, the Merciful (fourth family)

> Run with `/lane-creator` (`docs/lane-creator.md`, D102) in an attended session
> with T, started 2026-10-29, from T's prompt "A lane where healing can be
> offensive". The fourth lane T planned after the Defender. Paper only until the
> trial set is plotted and built (step 8); nothing here is live content.

## Session 0 — rulings (T, 2026-10-29)

| Call | Ruling |
|---|---|
| Gate | **Not met; T chose to go on anyway.** The Defender is live (DF1d) but `docs/reports/measured/latest.md` (measured at 3993f2a, 2026-10-29) carries no Defender deck columns, only its relic in the relic table |
| Family | **The Merciful** (working name; T names cards later, D99) |
| Fantasy | "My mending is a weapon." |
| Family shape | **Payoff / Engine / Misc, about 10 each** (30 plus grey), the shape of Blood Price, the Elementalist and the Defender |
| How healing hurts | Two routes: **heal also hits** (RADIANCE) and **heal the foe as a weapon** (MERCY) |
| Signature keywords | **MERCY** and **RADIANCE** (T: "We'll have RADIANCE and MERCY") |

### RADIANCE (T)

- T: "RADIANCE, however, is a straight 1:1 I heal, you take damage."
- **The hit is what you actually healed** (T picked "What you actually healed"): at full VITAE a RADIANCE heal
  hits for 0, so the lane wants you hurt.
- **The hit is a DEAL** (T picked "Yes, it's a DEAL"): VULNERABLE boosts it, a FROZEN foe takes it doubled, and
  Crimson Pact's +n can ride on it, as the Defender's THORNS does.
- **Printed "RADIANCE N"** (T, 2026-10-29, during the vote: "I don't want 'HEAL n with Radiance'. I just want 'RADIANCE n'"). RADIANCE N means HEAL N, then DEAL what that heal restored.

### Icons (T, 2026-10-29)

- **RADIANCE: the sun**, as the upper-left FREE cost mark (T: "the radiance Icon for the upper left free cost will be the sun").
- **MERCY: the dove** (T picked it from four pitched: dove, hourglass, open hand, candle).
- Wired at the trial set (step 8); the ballot faces keep their slot glyphs.

### MERCY (T)

- T: "MERCY does in fact heal the enemy, but then 2x the heal will hit the enemy in 3 rounds. Every new application
  of MERCY raises the total damage when it's recieved, but DOES NOT reset the MERCY clock."
- T's worked example: "MERCY 10 will heal the enemy for 10, then place the MERCY effect on them for 3 turns at 20
  damage. In 3 turns, at the start of their turn, they take the full 20. If the player uses another MERCY 10 on the
  enemy while there's 1 turn left, it goes up to MERCY 20 and then at the start of the enemy's turn, it'll take 40
  damage."
- So: MERCY N heals the foe N and sets a 3-turn clock; when the clock runs out, at the start of the foe's turn,
  the foe takes 2x the total MERCY. A new MERCY adds to the total and leaves the clock where it is.
- **Overheal on the foe bursts** (T picked "Overheal on the foe bursts" beside the MERCY mark): healing the foe past
  its max VITAE bursts as damage. How this sits beside MERCY is Open (below).
- T on befriending: "Between the two, it makes the "Befriend" mechanic easier to pull off, for sure. Plus it mixes
  with just about anything."

### Pairs (T)

- Left open (T picked "Leave pairs open"); see Open.

### Open

- **MERCY's payout: DEAL or plain loss?** RADIANCE is ruled a DEAL; MERCY's 2x payout is not ruled (VULNERABLE,
  FROZEN and Crimson Pact on a 40-point payout is the sims' first worry).
- **MERCY after the clock.** Whether the total resets to 0 once it pays (assumed), and whether a MERCY played with no
  clock running starts a fresh 3-turn clock (assumed).
- **MERCY's heal and the foe's max VITAE.** Whether MERCY's heal is capped at the foe's max, and whether the amount
  past the max is the overheal burst; whether the 2x counts the printed N or what was actually healed (T's example
  counts the printed N).
- **The overheal burst.** Its size (1:1 with the excess?), whether it is a DEAL, and whether it is a MERCY line or a
  separate effect.
- **Befriending.** T says MERCY and RADIANCE make befriending easier; today the mercy route is The Open Hand (the
  Suppliant's Ring signature, unsourced in a run), cast under a foe's `befriendabilityConfig.hpGate`. How this lane
  reaches it (a lane card that befriends? the ring as the family relic?) is not ruled.
- **Payoff cards that spend MERCY.** T ruled how MERCY pays by its clock; whether lane payoffs also read or consume
  the MERCY total (as T was offered) is not ruled.
- **Scaling.** Whether a stat (Heart, as THORNS, LEECH and TETHER?) scales MERCY and RADIANCE numbers (D110: a
  keyword scales a number, not a card's colour).
- **Pairs** with Blood Price (SACRIFICE makes room for RADIANCE), the Defender and the Elementalist (INFERNO's self-burn
  makes room too): T's pair identities, as the Elementalist's were ruled, are not set.
- **Global triggers.** The closed set (`plan/revamp/cards.md`: start of turn, SACRIFICE, Curse played) has no "when you heal" trigger; whether the lane's
  Globals use ⟳ start of turn only, or T opens a new trigger, is not ruled.
- **The family relic** (step 7), and whether a Merciful card can be a character's starting lane card (CH1, D108).

## Sub-lane pitches (slot roles, approved by T, 2026-10-29)

Approved as drafted (T, 2026-10-29: "Approve, build the ballot"). A slot marked *(Open)* leans on an Open line
above; the ballot prints a flagged placeholder for it. Globals use the start-of-turn trigger only.

### Payoff (paid for heals that land and MERCY that comes due)

| Slot | Type | Piece | Role |
|---|---|---|---|
| P-01 | Attack | RADIANCE | The core: HEAL, then DEAL what you healed |
| P-02 | Skill | RADIANCE | A big RADIANCE (huge when low, nothing when full) |
| P-03 | Skill | MERCY | The big wager: a large MERCY |
| P-04 | Attack | MERCY | DEAL more while the foe carries MERCY |
| P-05 | Spell | MERCY | Call it in: MERCY's clock ticks down 1 (pays sooner) |
| P-06 | Attack | MERCY | DEAL equal to the foe's MERCY total, without spending it *(Open: payoffs that read MERCY)* |
| P-07 | Attack | RADIANCE | Retribution: DEAL equal to all you healed this turn |
| P-08 | Skill | RADIANCE + MERCY | MERCY equal to what you healed this turn (your mending feeds its debt) |
| P-09 | Attack | heal | Wounded strike: DEAL more the more VITAE you are missing |
| P-10 | Global | RADIANCE | Start of your turn: RADIANCE |

### Engine (makes room to heal and keeps MERCY going)

| Slot | Type | Piece | Role |
|---|---|---|---|
| E-01 | Skill | heal | A plain HEAL (RADIANCE fuel) |
| E-02 | Skill | MERCY | A cheap small MERCY to start the clock |
| E-03 | Skill | heal | Your heals this turn heal more |
| E-04 | Attack | SACRIFICE | DEAL; SACRIFICE to make room (shared Blood Price keyword) |
| E-05 | Skill | MERCY | MERCY on a weak foe heals it less (bad timing costs less) *(Open: foe max VITAE)* |
| E-06 | Spell | RADIANCE | Your next plain HEAL is RADIANCE |
| E-07 | Skill | LEECH | LEECH: drains the foe, heals you (shared; RADIANCE fuel) |
| E-08 | Skill | RADIANCE + MERCY | Twin mending: HEAL you and MERCY the foe the same amount |
| E-09 | Global | MERCY | Start of your turn: MERCY 1 (adds to the total, never resets the clock) |
| E-10 | Skill | none | DRAW 2 |

### Misc (utility around it)

| Slot | Type | Piece | Role |
|---|---|---|---|
| M-01 | Skill | GUARD | GUARD, to live through MERCY's clock |
| M-02 | Skill | MERCY | Offer peace: spare a foe that carries MERCY *(Open: befriending)* |
| M-03 | Skill | DEAL | VULNERABLE (boosts the RADIANCE DEALs) |
| M-04 | Skill | heal | Cleanse: clear a debuff from yourself, then HEAL |
| M-05 | Skill | heal | Raise your max VITAE this combat (more room to heal into) |
| M-06 | Global | heal | Start of your turn: HEAL 1 |
| M-07 | Attack | none | A cheap poke: a small DEAL, DRAW 1 |
| M-08 | Skill | MERCY | Stall: the foe's next attack is weaker while MERCY ticks |
| M-09 | Spell | heal | Recall: return the last healing card you played to your hand |
| M-10 | Skill | overheal | Overflow: HEAL the foe past its max so the burst lands *(Open: overheal burst)* |

## Ballot

`rehearsal-merciful.ballot.html`, ballot id `merciful-2026-10-29`, opened 2026-10-29 (lane-creator step 3). Ninety
candidates, three per slot, no colour on any (D110; colours are split evenly within each sub-lane at the revisions
step). Globals open on the start-of-turn trigger only. No line prints a cap.

Numbers are placeholders for the sims (step 6), scaled from the grey cards (A Plain Blow: FREE DEAL 2, PAID DEAL 5).
"RADIANCE N" is T's RADIANCE: HEAL N, then DEAL what the heal actually restored (reworded from "HEAL N with RADIANCE" mid-vote, T, 2026-10-29). MERCY prints as T ruled it.
The sheet's legend prints these placeholders for Open lines above, for the sims to test and T to settle:

- MERCY's payout is plain VITAE loss, and the total resets once it pays.
- A heal on the foe stops at its max VITAE; anything past the max bursts 1:1 as a DEAL.
- A clock ticked to 0 (P-05) pays at the start of the foe's next turn.
- M-02's sparing uses the foe's own befriend gate in three forms (the Open "Befriending" line).

### Spells (T, 2026-10-29, mid-vote)

T: "I never see Spells (where the card is a Free: as-is, but Paid: <HUGE impact>. Exile.)". Ruled the same sitting,
and written into the lane-creator flow (`docs/lane-creator.md` "Spells"): a PAID line is huge by a bigger kind of
effect, about three times the numbers, or both (T: "Both"); two Spells per sub-lane (T: "2 per sub-lane"); this
ballot rewritten now as well as the flow (T: "Both"). "EXILE." now prints on the PAID line.

The ballot's twelve Spells became six Spells, two per sub-lane, with FREE lines unchanged and PAID lines rewritten:
P-03b (MERCY 15 and the clock runs out now), P-05a (the clock runs out now and MERCY pays three times), E-03b (heals this turn
HEAL three times as much), E-06a (HEALs this turn are RADIANCE and deal double), M-02c (spare a foe with any MERCY;
placeholder) and M-05c (+12 max VITAE, then HEAL to full). The other six (P-05b, E-05c, E-07a, E-08c, M-09a, M-09b)
are now Skills with their lines unchanged. Candidate ids are unchanged, so saved ticks stand.

T, same sitting, on the first rewrite of E-03b ("heals +3 for the rest of combat"): "No, "rest of combat" is just a
global. No to that one." E-03b and E-06a were rewritten to land this turn, and the flow now says a Spell's PAID is
never "for the rest of combat".
