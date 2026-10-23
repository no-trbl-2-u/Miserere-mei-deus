# Card ledger, Blood Price (the live trial set)

> [!NOTE]
> **The live trial set is revision 2 (below, D81):** 25 of the cards T kept
> on 2026-10-11 and five SACRIFICE cards T added the same day in place of
> the five Curse cards. T recorded the verdicts on 2026-10-11 (below) and
> Phase BT wired the kept cards in as a removable trial set (D75, D80;
> `plan/revamp/cards.md` → "The trial set"):
> `axiomancer-mechanics/src/Cards/library/blood-price.cards.ts`, registered
> by one `TRIAL_SETS` line in `cards.library.ts`, with the Blood Price lane
> and T's test deck. The cards are live content; this ledger is their
> record. The rest of the ballot stays cut, and any change to a card goes
> through a session with T (THE CARD HOLD, D37).

> Run as a paper rehearsal of Plan B (D73) on 2026-09-30 in an attended
> session with T. The ballot, its sandbox sims (branch
> `sandbox/blood-price-sims`) and T's verdicts led to the trial set.

## Session 0 — rulings (T, 2026-09-30)

| Call | Ruling |
|---|---|
| First family | **Blood Price**: "I pay in my own blood for power." |
| Family shape | **One family, three sub-lanes, about 10 cards each**: Payoff (benefits for sacrificing), Engine (helps trigger SACRIFICE), Misc (related utility; replaces the earlier Heal sub-lane) |
| First pool target | **30 cards** (3 × 10) plus grey. This replaces D73's "3 families × 1 lane" (≈36); the D73 amendment is filed in the decisions log |
| Bridges | Bridge cards join sub-lanes within a family (D73), so Blood Price can have them as soon as two sub-lanes exist |
| First slice | ~~Payoff~~ → **all three sub-lanes on one ballot** (T, 2026-09-30): 3 tabs × 10 slots × 3 candidates = 90 candidates, about 30 survivors |
| Other family fantasies (The Vigil, Rot and Omen, Loaded Dice) | Not picked; still open |
| §1 session rules | Not ratified; the rehearsal tests them |
| Scrap floor (T) | Scrapping any card gives 1 Conviction, so every card line must be worth more than that: no line gives only "gain 1 Conviction". Seven ballot candidates were revised to meet it (P-08a, P-08c, E-01a, E-01c, M-05a, M-05b, M-05c) |
| Global text template (T) | The duration is shown as badges (FREE ⏳3, PAID ∞), the text opens with a trigger from a closed set (⟳ turn start, 🩸 SACRIFICE, 📜 Curse played), and a PAID line shows only what changes. Applied to all 12 Global candidates (P-10, E-03, E-09, M-08). Details in `plan/revamp/cards.md` |

## Sub-lane pitches (draft slot roles, plain text)

### Payoff (being balloted)

| Slot | Type | Role |
|---|---|---|
| P-01 | Attack | SACRIFICE small, big DEAL |
| P-02 | Skill | SACRIFICE, big GUARD |
| P-03 | Attack | DEAL more at half VITAE or less |
| P-04 | Attack | A huge hit that only works at low VITAE |
| P-05 | Spell | VULNERABLE that grows with VITAE lost (capped) |
| P-06 | Skill | GUARD that grows with VITAE lost (capped) |
| P-07 | Attack | A finisher fed by what you have paid (capped) |
| P-08 | Skill | SACRIFICE for Conviction |
| P-09 | Spell | SACRIFICE n, the foe loses n (ignores GUARD) |
| P-10 | Global | Each SACRIFICE also hurts the foe |

### Engine (being balloted; ballot slot roles refined)

| Slot | Type | Role |
|---|---|---|
| E-01 | Spell | Add the grey Curse to hand; gain Conviction |
| E-02 | Skill | SACRIFICE 1, twice (counts as 2 sacrifices) |
| E-03 | Global | At the start of your turn, SACRIFICE 2 |
| E-04 | Spell | Your next SACRIFICE this turn costs 0 but still counts |
| E-05 | Skill | Play a Curse from hand at no VITAE cost |
| E-06 | Attack | DEAL, then SACRIFICE 3 |
| E-07 | Spell | Double your next SACRIFICE (and its payoffs) |
| E-08 | Skill | Return a Curse from discard to hand |
| E-09 | Global | When you play a Curse, gain 1 Conviction |
| E-10 | Spell | SACRIFICE any amount you choose (X) |

### Misc (replaces Heal, T 2026-09-30)

Related utility that is neither payoff nor engine.

| Slot | Type | Role |
|---|---|---|
| M-01 | Skill | Plain healing |
| M-02 | Attack | DEAL and heal from it |
| M-03 | Skill | Stronger defence at low VITAE |
| M-04 | Spell | Get rid of a Curse |
| M-05 | Skill | Conviction for being at low VITAE |
| M-06 | Skill | Last stand: cannot drop below 1 |
| M-07 | Spell | Mark the foe; heal when you hurt it |
| M-08 | Global | Heal each turn |
| M-09 | Skill | Healing past max becomes GUARD |
| M-10 | Spell | Return the pain you took (capped) |

## Ballot

- **Ballot sheet:** [`rehearsal-blood-price.ballot.html`](rehearsal-blood-price.ballot.html).
  It has three tabs (Payoff, Engine, Misc) with 10 slots × 3 candidates each,
  90 candidates in all.
- **Format change from T:** on 2026-09-30 T replaced the one-question-per-slot
  ballot with this sheet: a card image per candidate, a checkbox, and a
  Generate button that produces the verdict text.
- **Purple drafts (2026-10-10):** eight heart proposals, option "d" in eight
  blue-only slots (P-06d, P-08d, E-02d, E-03d, E-10d, M-01d, M-03d, M-08d),
  built from TETHER, LEECH, VULNERABLE and the existing keywords, so a deck
  can reach 10 red / 10 blue / 10 purple. Added to the ballot for T.
- **Rulings (T, 2026-10-10):** "the foe loses n" is unscaled and not a DEAL;
  HEAL is a mind-scaled keyword capped at max VITAE, and "heal the damage
  dealt" heals the actual amount; a SACRIFICE triggered n times counts as
  n; WAIVE (next SACRIFICE this turn costs no VITAE, still counts); playing
  a Curse at no VITAE cost is a WAIVED SACRIFICE; TETHER and LEECH as in
  D80. Printed numbers stand (no tuning).

## Verdicts (T, 2026-10-11)

**Kept: 30 cards, one per slot** (11 red / 9 blue / 10 purple), plus the
grey Curse the E-01 cards add:

| Sub-lane | Kept |
|---|---|
| Payoff | P-01a, P-02a, P-03a, P-04c, P-05b, P-06d, P-07b, P-08d, P-09b, P-10c |
| Engine | E-01a, E-02d, E-03d, E-04c, E-05c, E-06b, E-07b, E-08b, E-09c, E-10d |
| Misc | M-01d, M-02b, M-03d, M-04c, M-05b, M-06c, M-07a, M-08d, M-09a, M-10a |

All eight purple "d" drafts are kept. **Cut:** every other option, 68 in
all (the 90 ballot proposals and 8 drafts, less the 30 kept). No merges.

**Test deck (20 cards, T):** E-09c, P-03a, M-04c, M-02b, E-06b, P-02a,
E-04c, E-05c, M-09a, M-06c, P-05b, M-07a, E-03d, M-01d, M-08d, E-08b,
M-05b, E-07b, M-10a, P-10c. It is the lane's test deck in the dev menu
(`/dev` → CARDS → TEST LANE DECK → Blood Price).

Card ids are `bp-<slot><option>` in lower case (`bp-p-01a`); the Curse is
`bp-curse`. Names are the placeholder "Blood Price P-01a" until T names
the cards.

## Outtakes

The 68 cut proposals (`rehearsal-blood-price.ballot.html`).

## Revisions

### Revision 2 (T, attended, 2026-10-11; Phase BT1, D81)

T approved every change below; THE CARD HOLD (D37) is satisfied for
exactly these.

**Cut (all Curse-specific):** E-01a, E-05c, E-08b, M-04c, E-09c. The grey
Curse stays defined for foes to add later, but no card adds it and it is in
no lane, deck or reward pool. Saves drop the cut ids on load
(`dropUnknownCardIds`).

**Added (placeholder names, in the cut slots):**

| Id | Name | Type, colour | FREE | PAID |
|---|---|---|---|---|
| `bp-e-01n` | Bloodletting | Spell, blue | SACRIFICE 3, gain 2 Conviction | SACRIFICE 6, gain 4 Conviction |
| `bp-e-05n` | Open Vein | Skill, purple | TETHER 2, SACRIFICE 2 | TETHER 3, SACRIFICE 4, LEECH 2 (reworded 2026-10-11, T: TETHER first so its own SACRIFICE lands) |
| `bp-e-08n` | Blood for Blood | Attack, red | SACRIFICE 3, DEAL 6 | SACRIFICE any amount X (max 12), DEAL 2X (body-scaled). Rank 5 (rare) since Phase UP1c, 2026-10-23: DEAL 9 FREE, 3X PAID. Upgrades (T, 2026-10-23): FREE DEAL 13 / 18 / 25; PAID X cap 15 / 18 / 21, and `+++` is 4X |
| `bp-e-09n` | Crimson Pact | Global, red | 🩸 When you SACRIFICE n: your next DEAL this turn deals +n. ⏳3 | the same, ∞ |
| `bp-m-04n` | Transfusion | Skill, blue | SACRIFICE 3, HEAL 6 at the start of your next turn | SACRIFICE 5, HEAL 12 at the start of your next turn |

Open Vein runs in printed order: its own SACRIFICE comes before its TETHER,
so it does not feed that TETHER. Crimson Pact's +n is unscaled, stacks
across SACRIFICES, goes to the next DEAL (TETHER's hit is a DEAL and takes
it), and expires at the end of the turn.

**Buffs (only these numbers):** P-01a DEAL 5→7 (FREE), 12→16 (PAID);
P-02a GUARD 5→7, 12→16; P-09b the foe loses 4→6 (FREE), 8→12 (PAID, keeps
its VULNERABLE); E-06b DEAL 4→6 (FREE), 7→9 twice (PAID); P-05b VULNERABLE
+15%→+20% (FREE), +40%→+50% (PAID). Costs unchanged.

**Globals changed:** M-08d is now 🩸 "When you SACRIFICE: LEECH 1."
(FREE ⏳3, PAID ∞, no PAID line). E-03d is "⟳ Start of your turn:
SACRIFICE 2, LEECH 1." (was LEECH 2; PAID ∞, the same text).

**LEECH, new rule (replaces the decaying one):** a debuff on the foe with
turns and potency. Each LEECH n adds 3 turns and adds n (heart-scaled when
applied) to the potency, the first application included. At the start of
each foe turn the foe loses the potency in VITAE (plain loss, not a DEAL)
and you HEAL what it lost (capped at max VITAE); then a turn ticks off. At
0 turns LEECH ends and the potency resets. The potency never decays.

**The lane:** the 25 kept and the 5 added, 30 cards: 11 red, 8 blue, 11
purple.

**The relic (same session):** the Bleeding Signet (placeholder), +20 max
VITAE while worn, grants Crimson Covenant (4 Conviction: TETHER 3, and the
next SACRIFICE this turn counts twice). It is worn beside the Suppliant's
Ring (a character wears three trinkets). Not in shops, loot or rewards.

**The test deck (20, chosen by role, not by sim score):** 13 cards
SACRIFICE; every payoff has its SACRIFICE source in the deck; no Curse or
half-VITAE card; 7 red, 6 blue, 7 purple; no copies.

| Card | Role |
|---|---|
| P-01a | SACRIFICE 2/4 for DEAL 7/16: the main hit, and a SACRIFICE source |
| E-06b | DEAL 6 (PAID 9 twice), then SACRIFICE: damage that also feeds the payoffs |
| E-08n Blood for Blood | SACRIFICE 3 or X for DEAL 6 or 2X: the sink for spare VITAE |
| P-09b | SACRIFICE 4/8, the foe loses 6/12: damage GUARD cannot stop |
| E-09n Crimson Pact | Payoff Global: each SACRIFICE n adds +n to the next DEAL |
| P-10c | Payoff Global: each SACRIFICE n is GUARD n (FREE) or DEAL n (PAID) |
| M-02b | DEAL 6 and heal what it dealt: red damage that pays VITAE back |
| P-02a | SACRIFICE 2/4 for GUARD 7/16: the wall, and a SACRIFICE source |
| E-01n Bloodletting | SACRIFICE 3/6 for 2/4 Conviction: a trigger that funds Crimson Covenant |
| M-04n Transfusion | SACRIFICE 3/5 now, HEAL 6/12 next turn: a trigger that refunds itself |
| M-09a | HEAL 4/10, overflow to GUARD: sustain |
| E-04c | WAIVE the next SACRIFICE: a free trigger for Pact, P-10c and M-08d |
| E-07b | Double the next SACRIFICE: doubles a payoff turn |
| E-05n Open Vein | SACRIFICE, then TETHER 2/3 (PAID adds LEECH 2): turns later SACRIFICES into damage |
| E-02d | SACRIFICE 1 twice (PAID: TETHER 2, three times): many instances for per-SACRIFICE payoffs |
| E-10d | TETHER 1 with its own SACRIFICE (PAID: any amount): TETHER that feeds itself |
| E-03d | ⟳ Global: SACRIFICE 2, LEECH 1 each turn: the automatic trigger |
| P-08d | SACRIFICE 2 for Conviction (PAID: TETHER 3, then SACRIFICE 4) |
| P-05b | SACRIFICE 3/6 for VULNERABLE +20/50%: multiplies DEAL and TETHER |
| M-08d | 🩸 Global: each SACRIFICE adds LEECH 1: the LEECH stacker |

**Fight length (T's target):** Float-Eye about 3 player turns, Brine Hag
about 5, the Doorwarden about 7. The measured table and the proposed number
changes are in D81; card numbers change only when T approves.
