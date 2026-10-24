# Card ledger, the Elementalist (second family rehearsal)

> Run as a repeat of the Blood Price process (`rehearsal-blood-price.md`) in an
> attended session with T, started 2026-10-22. If it succeeds, T locks the
> process in (T: "If it's successful again, we can lock in the process").
> Paper only until T's verdicts; nothing here is live content (THE CARD HOLD,
> D37).
>
> **Live (Phase EL1c, 2026-10-24):** the 30 kept cards ship as a removable
> trial set at the sims' adjusted numbers, with placeholder names:
> `axiomancer-mechanics/src/Cards/library/elementalist.cards.ts`, lane
> `elementalist` (all 30 in its reward pool, T's best-played 20 as its test
> deck). T's revisions (lane-creator step 7) edit that file.

## Session 0 — rulings (T, 2026-10-22)

| Call | Ruling |
|---|---|
| Gate | The 2026-10-13 ballot rule ("no next family until Blood Price is measured, R12a") is met: R12a shipped 2026-10-13 (#505) and `docs/reports/measured/latest.md` carries Blood Price columns |
| Family | **The Elementalist**: "I bend the elements." |
| Elements | **Fire, Frost, Storm** for now; T is open to more |
| Colour | Unchanged: colours keep their current course (a lane card's colour is the stat its payoff scales with). Elements are not colours |
| Family shape | **Payoff / Engine / Misc, about 10 each** (30 plus grey), the Blood Price shape; elements cut across the sub-lanes |
| Keywords | Keywords can cross lanes: the family may use VULNERABLE, GUARD, LEECH, TETHER, HEAL and the rest, and other lanes may use its keywords |
| One element alone | Hard but not impossible, helped by cards from other lanes |

### The elements (T)

| Element | Role | Effect (working keyword) |
|---|---|---|
| Fire | Big damage, at the cost of both sides getting hurt | **INFERNO**: a DoT on both the player and the foe, more on the foe |
| Frost | Mainly defensive | **CHILL** (renamed **BLIZZARD**, T, 2026-10-24): lowers the foe's damage by a flat amount; drops by 1 each round. **FROZEN** (below) |
| Storm | The long game: offence and defence through utility and card draw | **STORM**: a DoT that starts low and rises by n each turn; plus **DRAW** |

### Pairs (T)

| Pair | Identity |
|---|---|
| Frost + Storm | Long-term, sustainable defence |
| Frost + Fire | Balanced damage |
| Fire + Storm | High-risk DPS |

### Keyword rulings (T, 2026-10-22)

- **INFERNO's tick on you is plain VITAE loss, and it can kill you.** It is not
  a SACRIFICE (it does not trigger Blood Price payoffs). Thematically, Blood
  Price's VITAE is part of casting the spell; fire is burning everybody.
- **FROZEN:** when CHILL is at least the foe's attack, the foe is FROZEN. FROZEN
  means the next DEAL it takes is doubled; then FROZEN ends, but the CHILL
  stays. (T's reason: if freezing only cancelled the attack, it would mean
  nothing against a foe whose CHILL already cuts a plain attack to 0.)
- **DRAW is added** as a new general keyword (no card verb draws today). Any
  lane may use it.
- **STORM grows by 1 each turn and lasts all combat** (T, 2026-10-22); Engine
  cards raise the growth.
- **FROZEN can re-trigger every foe turn** while CHILL stays at or above the
  foe's attack (T, 2026-10-22): the Frost + Fire "balanced damage" engine,
  watched in the sims.
- **The slot roles below are approved** (T, 2026-10-22).

### Open

- INFERNO's math (T, 2026-10-22: "I'm not sure of the exact math yet"). The
  ballot prints a placeholder, flagged on the sheet: you take half (rounded
  down), 3 turns per application, the foe's tick plain loss. The sims test it;
  T sets it before wiring.
- CHILL: whether it stacks (ballot assumes adding CHILL adds to the number);
  when the FROZEN check runs (proposed: at the start of the foe's threat phase,
  against the attack it is about to make).
- STORM's tick: plain loss (ballot assumes so, like LEECH: VULNERABLE and
  FROZEN do not touch it; P-05b is the DEAL route).
- Signature keywords: the 1-2-per-lane rule (`plan/revamp/cards.md` deck
  model) meets three element effects plus DRAW. Proposed: the family owns
  INFERNO, CHILL/FROZEN and STORM; DRAW is shared from the start.
- Global triggers are a closed set (⟳ turn start, 🩸 SACRIFICE, 📜 Curse
  played). Proposed: the Globals here use ⟳ only; no new trigger.

## Sub-lane pitches (draft slot roles, plain text)

Element tags: 🔥 Fire, ❄ Frost, ⚡ Storm; a slot with two tags is a pair bridge.

### Payoff (benefits for having the elements up)

| Slot | Type | Element | Role |
|---|---|---|---|
| P-01 | Attack | 🔥 | DEAL more for the foe's INFERNO (capped) |
| P-02 | Attack | 🔥 | A huge DEAL that also sets you burning (INFERNO on you) |
| P-03 | Skill | ❄ | GUARD equal to the foe's CHILL |
| P-04 | Attack | ❄ | Shatter: DEAL; PAID spends the CHILL for more |
| P-05 | Spell | ⚡ | Cash out: the foe loses VITAE equal to STORM's current strength |
| P-06 | Skill | ⚡ | GUARD that grows with STORM's strength |
| P-07 | Attack | 🔥❄ | A hit built for FROZEN: DEAL plus INFERNO (balanced damage) |
| P-08 | Skill | ❄⚡ | Sustain: GUARD and HEAL while both CHILL and STORM are up |
| P-09 | Attack | 🔥⚡ | High risk: DEAL that grows with your own INFERNO and the STORM |
| P-10 | Global | all | ⟳ Start of your turn: DEAL for each different element on the foe |

### Engine (puts the elements up and makes them grow)

| Slot | Type | Element | Role |
|---|---|---|---|
| E-01 | Spell | 🔥 | INFERNO (both burn) |
| E-02 | Attack | 🔥 | DEAL, then INFERNO |
| E-03 | Spell | ❄ | CHILL |
| E-04 | Skill | ❄ | GUARD and CHILL |
| E-05 | Spell | ⚡ | STORM |
| E-06 | Spell | ⚡ | STORM grows faster (raise n) |
| E-07 | Skill | ⚡ | DRAW 2, add STORM |
| E-08 | Spell | 🔥❄ | INFERNO and CHILL on the foe only (you do not burn this time) |
| E-09 | Global | ❄⚡ | ⟳ Start of your turn: CHILL 1 and STORM grows by 1 |
| E-10 | Spell | all | Bend: turn one element on the foe into another, keeping its number |

### Misc (related utility)

| Slot | Type | Element | Role |
|---|---|---|---|
| M-01 | Skill | 🔥 | Put yourself out: remove your INFERNO (the Fire safety valve) |
| M-02 | Skill | ❄ | HEAL that grows with the foe's CHILL |
| M-03 | Skill | ⚡ | DRAW 2 |
| M-04 | Spell | all | Extend: every element on the foe lasts longer |
| M-05 | Skill | all | Conviction for each element on the foe (scrap floor: never only 1) |
| M-06 | Skill | ❄ | GUARD, doubled while the foe is FROZEN |
| M-07 | Spell | ⚡ | VULNERABLE and STORM (a cross-lane keyword) |
| M-08 | Global | ⚡ | ⟳ Start of your turn: DRAW 1 |
| M-09 | Skill | 🔥 | Pass the flame: move your INFERNO onto the foe |
| M-10 | Skill | ⚡ | Eye of the storm: take less damage while STORM is up |

## Ballot

- **Ballot sheet:** [`rehearsal-elementalist.ballot.html`](rehearsal-elementalist.ballot.html),
  the Blood Price sheet's shell with new data: three tabs (Payoff, Engine,
  Misc), 10 slots × 3 candidates, 90 in all; element tags on every card;
  keywords coloured by element. Open it in a browser, tick the keepers, press
  Generate and paste the verdict text back.
- Every line clears the scrap floor; every Global opens on ⟳ (no new trigger).

## Verdicts

### Sitting 1 — Payoff (T, 2026-10-23, pasted in session)

**Payoff is voted; Engine and Misc are not yet voted.** The pasted sheet printed
every Engine and Misc slot as "CUT slot" only because nothing there was ticked
yet; those slots are open, not cut.

T's verdict text, verbatim:

```text
REHEARSAL BALLOT — the Elementalist (second family rehearsal; not live cards)
kept 10 of 90
-- Payoff --
P-01: KEEP P-01b | cut: P-01a, P-01c
P-02: KEEP P-02b | cut: P-02a, P-02c
P-03: KEEP P-03a | cut: P-03b, P-03c | note: No Max to these values
P-04: KEEP P-04a | cut: P-04b, P-04c | note: Free should be Deal 3, Chill 2. No max on paid
P-05: KEEP P-05b | cut: P-05a, P-05c | note: Paid should read: Trigger the Foe's storm
P-06: KEEP P-06b | cut: P-06a, P-06c
P-07: KEEP P-07a | cut: P-07b, P-07c
P-08: KEEP P-08b | cut: P-08a, P-08c | note: Free has no max. Paid should be Double the foe's chill and storm
P-09: KEEP P-09a | cut: P-09b, P-09c | note: No max for paid
P-10: KEEP P-10b | cut: P-10a, P-10c | note: Globals should not read "instead". They should only have one paid line (reads exactly how you have the free line). The benefit of paying is that it's permanent
```

**Payoff as kept, with T's notes applied** (paper; numbers are the ballot's
until the revisions step):

| Slot | Kept | Type | FREE | PAID |
|---|---|---|---|---|
| P-01 | P-01b | Attack, Fire | DEAL 5. | DEAL 8, doubled if the foe is burning. |
| P-02 | P-02b | Attack, Fire | DEAL 6. | DEAL 18; INFERNO 8 (you and the foe both burn). |
| P-03 | P-03a | Skill, Frost | GUARD equal to the foe's BLIZZARD. | GUARD twice the foe's BLIZZARD. |
| P-04 | P-04a | Attack, Frost | DEAL 3, BLIZZARD 2. | Spend all the foe's BLIZZARD: DEAL 6, +2 per BLIZZARD spent. |
| P-05 | P-05b | Spell, Storm | STORM 1; DEAL equal to the foe's STORM. | Trigger the foe's STORM. |
| P-06 | P-06b | Skill, Storm | GUARD 3, DRAW 1. | GUARD 5, + the foe's STORM (max +12). DRAW 1. |
| P-07 | P-07a | Attack, Fire + Frost | DEAL 5, INFERNO 2. | DEAL 10, INFERNO 4; if the foe is FROZEN, the INFERNO is doubled too. |
| P-08 | P-08b | Skill, Frost + Storm | GUARD equal to the foe's BLIZZARD + STORM. | Double the foe's BLIZZARD and STORM. |
| P-09 | P-09a | Attack, Fire + Storm | DEAL 4, + your INFERNO (max +6). | DEAL 8, + your INFERNO + the foe's STORM. |
| P-10 | P-10b | Global, all | Start of your turn: if the foe has two or more elements, DEAL 5. | The same line, permanent (no "instead"). |

**T's rulings in the notes:**

- **Globals (T):** a Global's PAID line reads exactly as its FREE line; the
  benefit of paying is that it is permanent. No "instead" deltas. Applies to
  every Global on this ballot (P-10, E-09, M-08).
- **Caps removed** where T wrote "no max": P-03 (both lines), P-04 PAID, P-08
  FREE, P-09 PAID. P-06's PAID cap and P-09's FREE cap were not named and
  stand.
- **P-05 PAID** is "Trigger the foe's STORM": the foe takes its STORM tick now,
  as at the start of its turn. Whether the trigger also grows the STORM by 1, as
  the turn-start tick does, is open for the revisions step.

### Sitting 2 — Engine (T, 2026-10-23, pasted in session)

The second sheet repeats sitting 1's Payoff lines unchanged and adds Engine.
Misc is still not voted (its "CUT slot" lines are unticked slots, not cuts).
T's Engine lines, verbatim:

```text
-- Engine --
E-01: KEEP E-01b | cut: E-01a, E-01c
E-02: KEEP E-02c | cut: E-02a, E-02b | note: Remove the max
E-03: KEEP E-03b | cut: E-03a, E-03c
E-04: KEEP E-04c | cut: E-04a, E-04b | note: No max
E-05: KEEP E-05b | cut: E-05a, E-05c
E-06: KEEP E-06a | cut: E-06b, E-06c | note: Turn this into a global card where it reads the storm grows by 1 extra
E-07: KEEP E-07b | cut: E-07a, E-07c | note: No max
E-08: KEEP E-08c | cut: E-08a, E-08b
E-09: KEEP E-09b | cut: E-09a, E-09c | note: No max
E-10: KEEP E-10c | cut: E-10a, E-10b | note: free is draw 1, storm 1 instead
```

**Engine as kept, with T's notes applied:**

| Slot | Kept | Type | FREE | PAID |
|---|---|---|---|---|
| E-01 | E-01b | Spell, Fire | INFERNO 3, GUARD 2. | INFERNO 8, GUARD 5. |
| E-02 | E-02c | Attack, Fire | DEAL 5. | DEAL 8, then INFERNO equal to half the damage dealt. |
| E-03 | E-03b | Spell, Frost | BLIZZARD 2, DRAW 1. | BLIZZARD 6, DRAW 1. |
| E-04 | E-04c | Skill, Frost | BLIZZARD 3. | BLIZZARD 5, then GUARD equal to the foe's BLIZZARD. |
| E-05 | E-05b | Spell, Storm | STORM 1, DRAW 1. | STORM 3, DRAW 2. |
| E-06 | E-06a | **Global**, Storm (was a Spell) | The STORM grows by 1 extra. | The same line, permanent. |
| E-07 | E-07b | Skill, Storm | DRAW 2. | DRAW 2, then STORM equal to the cards in your hand. |
| E-08 | E-08c | Spell, Fire + Frost | BLIZZARD 2, INFERNO 2. | Steam: remove your INFERNO; the foe gains that much BLIZZARD and INFERNO. |
| E-09 | E-09b | Global, Frost + Storm | Start of your turn: BLIZZARD equal to half the foe's STORM. | The same line, permanent. |
| E-10 | E-10c | Spell, all | DRAW 1, STORM 1. | Swap the numbers of two elements on the foe. DRAW 1. |

Notes on applying them:

- **E-06** becomes a Global by T's note: while it is in play the STORM grows by
  2 a turn instead of 1. Read as "each turn" (the STORM's own growth plus one);
  confirm at the revisions step.
- **E-09** follows sitting 1's Global rule (PAID equals FREE, permanent) and
  T's "no max", so its PAID "instead" delta and both caps are gone.
- **E-10**'s kept card is the swap, not BEND (E-10a/b). The family's "bend"
  fantasy is carried by E-08c's Steam and E-10c's swap; BEND is not a keyword
  for now.
- Caps removed: E-02 PAID, E-04 PAID, E-07 PAID, E-09. **Every cap T has met
  on this ballot so far, T has cut** except P-06 PAID and P-09 FREE, which T
  did not name.

### Sitting 3 — Misc (T, 2026-10-24, pasted in session)

The third sheet carries Misc only; its Payoff and Engine "CUT slot" lines are
unticked slots in that sitting, not cuts (sittings 1 and 2 stand). T's Misc
lines and general note, verbatim:

```text
-- Misc --
M-01: KEEP M-01a | cut: M-01b, M-01c | note: Switch paid to: Heal for twice your inferno. Remove your inferno
M-02: KEEP M-02a | cut: M-02b, M-02c | note: No maximum
M-03: KEEP M-03a | cut: M-03b, M-03c | note: Paid is: Draw 2, chill 2, guard 2
M-04: KEEP M-04a | cut: M-04b, M-04c | note: Free: Inferno 1, chill 1, storm 1; Paid: Inferno 3, Chill 3, Storm 3. We need to discuss what it means to stack these keywords.
M-05: KEEP M-05c | cut: M-05a, M-05b | note: Each unique element?
M-06: KEEP M-06a | cut: M-06b, M-06c
M-07: KEEP M-07b | cut: M-07a, M-07c | note: No max
M-08: KEEP M-08c | cut: M-08a, M-08b | note: For globals, paid and free should typically be the same. This should be: Paid: Start of your turn: Storm 1, DRAW 1
M-09: KEEP M-09c | cut: M-09a, M-09b | note: Paid should read: Heal for your inferno. Move your inferno on to the foe
M-10: CUT slot
general: I didn't select a 10th card because I'd like a new, different global: Paid: Start of your turn: Storm 1 then heal equal to the amount of storm on the foe
```

**Misc as kept, with T's notes applied:**

| Slot | Kept | Type | FREE | PAID |
|---|---|---|---|---|
| M-01 | M-01a | Skill, Fire | Remove your INFERNO. | HEAL twice your INFERNO, then remove your INFERNO. |
| M-02 | M-02a | Skill, Frost | HEAL 2, + the foe's BLIZZARD. | HEAL 4, + twice the foe's BLIZZARD. |
| M-03 | M-03a | Skill, Storm | DRAW 2. | DRAW 2, BLIZZARD 2, GUARD 2. |
| M-04 | M-04a | Spell, all | INFERNO 1, BLIZZARD 1, STORM 1. | INFERNO 3, BLIZZARD 3, STORM 3. |
| M-05 | M-05c | Skill, all | DRAW 1; gain 1 Conviction. | DRAW 1; gain 2 Conviction per different element on the foe. |
| M-06 | M-06a | Skill, Frost | GUARD 4, doubled if the foe is FROZEN. | GUARD 9, doubled if the foe is FROZEN. |
| M-07 | M-07b | Spell, Storm | STORM 2. | VULNERABLE +5% per STORM on the foe, for 2 turns. |
| M-08 | M-08c | Global, Storm | Start of your turn: STORM 1, DRAW 1. | The same line, permanent. |
| M-09 | M-09c | Skill, Fire | Move half your INFERNO onto the foe. | HEAL equal to your INFERNO, then move your INFERNO onto the foe. |
| M-10 | **new (T)** | Global, Storm | Start of your turn: STORM 1, then HEAL equal to the foe's STORM. | The same line, permanent. |

Notes on applying them:

- **M-04** changes its job: it was "extend the elements already up" and is now
  all three elements at once. That makes it the card that asks what stacking
  means (Open, below).
- **M-05**, "each unique element?": yes. It counts the different elements on
  the foe (INFERNO, BLIZZARD, STORM), so the PAID line tops out at 6 Conviction
  with all three up; the printed cap is dropped as redundant.
- **M-08 and M-10** follow the Global rule, now worded by T as "paid and free
  should *typically* be the same": the default, with room for an exception T
  names.
- **M-10** is T's own card, written in the general note; no candidate was kept
  for the slot.
- Caps removed: M-02 (both lines), M-07 PAID.

### The kept family (after three sittings)

29 kept candidates and one card of T's: 10 Payoff, 10 Engine, 10 Misc. The cards
are paper until the revisions step (`docs/lane-creator.md` step 7).

### Open


### Stacking (T, 2026-10-24, after sitting 3)

T asked "what it means to stack these keywords" (M-04 note). Ruled:

- **INFERNO adds**: INFERNO 4 burning plus INFERNO 3 is INFERNO 7. (T first
  answered "add potency and turns"; the whole-combat ruling below leaves no
  turns to add.)
- **BLIZZARD adds**: BLIZZARD 3 plus BLIZZARD 2 is BLIZZARD 5, which then drops by 1 a
  round. Big stacks are the road to FROZEN.
- **STORM adds**: STORM 2 plus STORM 3 is STORM 5, and it keeps growing by 1 a
  turn from there.
- Whether "Globals PAID = FREE, permanent" and "no max" are rules for this
  family only or for every lane. The Blood Price Globals already live carry
  PAID deltas (P-10c, E-03d), so a lane-wide Global rule would revise them.

### The weather (T, 2026-10-24)

T: "I'm imagining them controlling and changing the weather." The family's
fantasy, "I bend the elements", is read as weather: the Elementalist sets and
shifts the weather the foe fights in.

- **CHILL is renamed BLIZZARD.** Every applied table above reads BLIZZARD; T's
  verbatim verdict blocks keep the word T voted on. FROZEN keeps its name and
  rule (BLIZZARD at least the foe's attack: the next DEAL it takes is doubled).
- **INFERNO's split: you take half, rounded down.** INFERNO 7 on the foe burns
  you for 3.
- **All three elements last the whole combat.** No element has a turn count.
- **BLIZZARD and INFERNO drop by 1 every round after the one they were applied
  in**; STORM grows by 1 every turn. An element that drops to 0 is gone.
- With the stacking rulings: a new application adds to the number, and the
  weather then drifts on its own (fire and snow die down, the storm builds).

Still open for the revisions step: the scaling stat of INFERNO, BLIZZARD and
STORM (colours follow each card's job, BV3), names, the test deck and the family
relic with its signature skill.

### Notes from play (T, 2026-10-24, after the first preview build)

T: "elementalist cards are great!!" Notes, none of them built yet:

- **BLIZZARD is too powerful.** T's direction: it should drop by the damage the
  foe does (what it absorbs) instead of by 1 a round. **Held: T is still
  testing ("Don't do it yet").**
- **A Global shown as a Skill or Spell.** T saw a non-Global card reading "At the
  start of turn..."; every Elementalist line with that trigger is a Global in
  the code (P-10, E-06, E-09, M-08, M-10), so this is likely a display bug. T is
  to point at the card (a screenshot or the play logs).
- **Spells exile on PAID** (all lanes): D103, built by Phase SP1. This family's
  eight Spells change.
- **Some Skills may become Spells**, with EXILE, once T has play logs (BE2's
  `card-usage` and `card-gaps` reports). Not decided.
