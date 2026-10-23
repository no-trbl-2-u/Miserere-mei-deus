# Card ledger, the Elementalist (second family rehearsal)

> Run as a repeat of the Blood Price process (`rehearsal-blood-price.md`) in an
> attended session with T, started 2026-10-22. If it succeeds, T locks the
> process in (T: "If it's successful again, we can lock in the process").
> Paper only until T's verdicts; nothing here is live content (THE CARD HOLD,
> D37).

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
| Frost | Mainly defensive | **CHILL**: lowers the foe's damage by a flat amount; drops by 1 each round. **FROZEN** (below) |
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

Pending (T).
