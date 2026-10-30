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

## Verdicts (T, 2026-10-29, pasted in session)

T submitted the ballot and pasted its Generate text in chat. D1 `ballot_verdicts` held no row for
`merciful-2026-10-29` (the table was empty at the check), so T's paste is the verdict. 29 kept of 90: 28 slots
kept, two slots cut (E-05, M-03), and P-06 keeps two cards.

T's verdict text, verbatim:

```text
BALLOT — The Merciful (merciful-2026-10-29)
kept 29 of 90
-- Payoff --
P-01: KEEP P-01a | cut: P-01b, P-01c
P-02: KEEP P-02b | cut: P-02a, P-02c
P-03: KEEP P-03b | cut: P-03a, P-03c | note: Paid: Trigger the Foe's MERCY. EXILE.
P-04: KEEP P-04a | cut: P-04b, P-04c
P-05: KEEP P-05a | cut: P-05b, P-05c | note: This is a great opportunity to introduce a global keyword: HURRY which ticks down all effects. We'll be able to trigger MERCY more often but it'll make other status effects weaker.
P-06: MERGE P-06a + P-06c | cut: P-06b | note: I want both, don't mix them.
P-07: KEEP P-07b | cut: P-07a, P-07c
P-08: KEEP P-08b | cut: P-08a, P-08c
P-09: KEEP P-09c | cut: P-09a, P-09b | note: Guard x where X is equal to your VITAE missing
P-10: KEEP P-10c | cut: P-10a, P-10b | note: Same but RADIANCE 5
-- Engine --
E-01: KEEP E-01b | cut: E-01a, E-01c
E-02: KEEP E-02c | cut: E-02a, E-02b
E-03: KEEP E-03b | cut: E-03a, E-03c
E-04: KEEP E-04b | cut: E-04a, E-04c
E-05: CUT slot | note: None
E-06: KEEP E-06a | cut: E-06b, E-06c
E-07: KEEP E-07b | cut: E-07a, E-07c
E-08: KEEP E-08b | cut: E-08a, E-08c | note: Mercy first then RADIANCE
E-09: KEEP E-09b | cut: E-09a, E-09c | note: Whenever you heal past your max, draw a card
E-10: KEEP E-10b | cut: E-10a, E-10c
-- Misc --
M-01: KEEP M-01b | cut: M-01a, M-01c
M-02: KEEP M-02b | cut: M-02a, M-02c | note: A new global keyword opportunity: BEFRIENDABLE (I'm open to other words though)
M-03: CUT slot
M-04: KEEP M-04b | cut: M-04a, M-04c
M-05: KEEP M-05c | cut: M-05a, M-05b
M-06: KEEP M-06c | cut: M-06a, M-06b | note: 2 / 5
M-07: KEEP M-07c | cut: M-07a, M-07b
M-08: KEEP M-08a | cut: M-08b, M-08c | note: Otherwise, mercy 3/5
M-09: KEEP M-09c | cut: M-09a, M-09b
M-10: KEEP M-10c | cut: M-10a, M-10b
```

### As kept, with T's notes applied

Paper; numbers are the ballot's until the revisions step. A note whose reading is not certain is applied as
written and listed under "Open from the vote" below.

| Slot | Kept | Type | FREE | PAID |
|---|---|---|---|---|
| P-01 | P-01a | Attack | RADIANCE 3. | RADIANCE 7. |
| P-02 | P-02b | Skill | RADIANCE 4. GUARD 2. | RADIANCE 9. GUARD 5. |
| P-03 | P-03b | Spell | MERCY 5. | MERCY 15, then the foe's MERCY bursts now. EXILE. (T's note, worded per the rulings below) |
| P-04 | P-04a | Attack | DEAL 3, or DEAL 6 if the foe has MERCY. | DEAL 6, or DEAL 12 if the foe has MERCY. |
| P-05 | P-05a | Spell | MERCY's clock ticks down 1. | MERCY's clock runs out now, and the foe takes three times its MERCY instead of twice. EXILE. |
| P-06 | P-06a | Attack | DEAL equal to the foe's MERCY. | DEAL twice the foe's MERCY. |
| P-06 | P-06c | Skill | GUARD equal to the foe's MERCY. | GUARD twice the foe's MERCY. |
| P-07 | P-07b | Attack | HEAL 2. DEAL equal to all you healed this turn. | HEAL 4. DEAL twice all you healed this turn. |
| P-08 | P-08b | Skill | HEAL 3. MERCY equal to all you healed this turn. | HEAL 6. MERCY equal to all you healed this turn. |
| P-09 | P-09c | Skill | GUARD 2, +1 per 5 VITAE you are missing. | GUARD X, where X is the VITAE you are missing. (T's note; PAID only, ruled below) |
| P-10 | P-10c | Global | ⟳ Start of your turn: if the foe has MERCY, RADIANCE 5. (T's note) | |
| E-01 | E-01b | Skill | HEAL 2. DRAW 1. | HEAL 5. DRAW 1. |
| E-02 | E-02c | Skill | MERCY 2. DRAW 1. | MERCY 4. DRAW 1. |
| E-03 | E-03b | Spell | Your heals this turn HEAL +3. | Your heals this turn HEAL three times as much. EXILE. |
| E-04 | E-04b | Skill | SACRIFICE 3. DRAW 2. | SACRIFICE 4. DRAW 3. |
| E-05 | cut | | | |
| E-06 | E-06a | Spell | Your next HEAL this turn is RADIANCE instead. | Your HEALs this turn are RADIANCE instead, and each deals double. EXILE. |
| E-07 | E-07b | Attack | DEAL 2. LEECH 1. | DEAL 4. LEECH 2. |
| E-08 | E-08b | Skill | MERCY 2, then RADIANCE 3. (T's note) | MERCY 4, then RADIANCE 6. |
| E-09 | E-09b | Global | ⟳ Start of your turn: MERCY 1 and HEAL 1. | |
| E-10 | E-10b | Skill | DRAW 1. HEAL 2. | DRAW 2. HEAL 4. |
| M-01 | M-01b | Skill | GUARD 3, or GUARD 5 if the foe has MERCY. | GUARD 7, or GUARD 11 if the foe has MERCY. |
| M-02 | M-02b | Skill | MERCY 2. While the foe has MERCY, it is YIELDING. | MERCY 5. While the foe has MERCY, it is YIELDING. (worded per the rulings below) |
| M-03 | cut | | | |
| M-04 | M-04b | Skill | Clear one debuff from yourself, then RADIANCE 2. | Clear every debuff from yourself, then RADIANCE 5. |
| M-05 | M-05c | Spell | +4 max VITAE this combat. DRAW 1. | +12 max VITAE this combat, then HEAL to full. EXILE. |
| M-06 | M-06c | Global | ⟳ Start of your turn: HEAL 2, or HEAL 5 if you are below half VITAE. (T's note) | |
| M-07 | M-07c | Attack | DEAL 1. MERCY 1. DRAW 1. | DEAL 2. MERCY 2. DRAW 1. |
| M-08 | M-08a | Skill | If the foe has MERCY, its next attack deals 2 less; otherwise MERCY 3. (T's note) | If the foe has MERCY, its next attack deals 5 less; otherwise MERCY 5. |
| M-09 | M-09c | Skill | Return the last MERCY card you played this combat to your hand. | Return the last two MERCY cards you played this combat to your hand. |
| M-10 | M-10c | Attack | If the foe is at max VITAE, DEAL 4; otherwise MERCY 2. | If the foe is at max VITAE, DEAL 9; otherwise MERCY 5. |

### Open from the vote (for the revisions, step 7)

Answered the same day; see "Rulings after the vote" below.

- **HURRY** (T, P-05): "a global keyword: HURRY which ticks down all effects. We'll be able to trigger MERCY more
  often but it'll make other status effects weaker." Which effects it ticks (both sides? the foe's only?), by how
  much, and which cards print it are not ruled. Being global, it is engine work for the trial-set plot.
- **BEFRIENDABLE** (T, M-02): "A new global keyword opportunity: BEFRIENDABLE (I'm open to other words though)". Its
  name, and whether it replaces M-02b's "counts as under its befriend gate" line, are not ruled.
- **P-09c's PAID line.** T's note sets GUARD X, X = the VITAE you are missing; whether that is the FREE line, the
  PAID line or both, and what the other line reads, is not ruled.
- **E-09's note** (T: "Whenever you heal past your max, draw a card"). Whether it replaces E-09b's body, is added
  to it, or is a new card; and "when you heal" is not in the closed Global trigger set (the Session 0 Open line
  "Global triggers").
- **M-05c** was kept as voted. Its PAID raises max VITAE for the combat, the question put to T after the "rest of
  combat" ruling; not yet answered.
- **P-03b's PAID** now triggers the foe's MERCY; whether that pays twice the MERCY now (the clock run out) and
  resets it, as P-05a's PAID does, is the same placeholder.

## Rulings after the vote (T, 2026-10-29)

T answered the vote's Open lines and the remaining Session 0 Open lines in four batches, in session.

### Words

- **Nothing "triggers".** T: "nothing "triggers". (MERCY doesn't "trigger" it "bursts" when it's over)". MERCY
  **bursts** when its clock runs out; card text says "the foe's MERCY bursts", never "trigger". (A Global's opening
  trigger, `docs/card-spec.md` §15, is a separate term.)

### MERCY

- **The burst is a DEAL** (T picked "A DEAL"): GUARD blocks it, VULNERABLE boosts it, FROZEN doubles it. This
  replaces the ballot placeholder (plain VITAE loss); the sims are where a runaway burst shows up.
- **After the burst, the MERCY clears and the next one starts fresh** (T picked "Clears; next starts fresh"): the
  total goes to 0, and the next MERCY starts a new 3-turn clock. The placeholder stands as ruled.
- **Overheal adds to MERCY** (T picked "Overheal adds to MERCY"): healing the foe past its max VITAE adds the excess
  to its MERCY. There is no separate overheal burst. M-10 (Overflow) reads against this at the revisions.
- **P-03b's PAID: MERCY 15 first, then the burst** (T picked "MERCY 15 first"): "MERCY 15, then the foe's MERCY
  bursts now. EXILE." The burst is the normal twice the total.

### New keywords

- **HURRY N** (T, ballot note on P-05; T picked "Both sides" and "HURRY N"): every status on you and the foe ticks
  down N turns. MERCY comes due N turns sooner, and every other status fades N turns faster. Engine work for the
  trial-set plot; which cards print it is for the revisions.
- **YIELDING** (T picked the name over BEFRIENDABLE and SPARED; then "Spare it now"): while a foe is YIELDING, you
  can befriend it whatever its VITAE. It replaces M-02b's "counts as under its befriend gate" line.

### Cards

- **P-09c** (T picked "PAID only"): FREE keeps "GUARD 2, +1 per 5 VITAE you are missing"; PAID is GUARD X, where X
  is the VITAE you are missing.
- **E-09** (T picked "A new card"): E-09b stays "MERCY 1 and HEAL 1"; "Whenever you heal past your max, draw a card"
  becomes its own card at the revisions. "When you heal" is not in the closed Global trigger set, so the new card's
  form (a Global under a new trigger, or not a Global) is the revisions' call.
- **M-05c** (T picked "Keep it"): "+12 max VITAE this combat" stands on a Spell; max VITAE is not a lasting effect in
  the "rest of combat" sense.

### Scaling, relic, pairs, starter

- **Heart scales MERCY and RADIANCE** (T picked "Heart"), as it does THORNS, LEECH and TETHER.
- **Family relic: the Suppliant's Ring, plus two more to pick** (T: "Suppliant's Ring + 2 more", then "Ring, plus 2
  to pick"). The session pitches several at the revisions and T picks two.
- **Pairs.** T: "Do the other lanes pair? Ultimately this healing lane could pair with any of them. But Blood price
  and Defender was what I had in mind for the first character". No pair identities are set; the lane pairs with any.
- **A Merciful starting lane card** (T picked "Decide at CH1"): settled when the character is authored (CH1e).

### Still open for the revisions (step 7)

- The two extra family relics (pitches, T picks).
- The overheal-draw card that E-09's note became.
- Which cards print HURRY N and YIELDING.
- Names (D99), colours (split evenly per sub-lane), the test deck, and the sims' number changes.
