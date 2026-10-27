# The Defender sims (lane-creator step 6)

> Step 6 of `docs/lane-creator.md` for the Defender (`rehearsal-defender.md`,
> commit `4162d3bd6` on `plan/defender-verdicts`): T's 30 kept cards simulated
> against the Act 1 fights, so the revisions session (step 7) has real numbers.
> A measurement, not a gate (D57). Sandbox only: this file lives on branch
> `sandbox/defender-sims`, which never merges and has no PR. Run 2026-10-26 from
> `origin/main` at `72b0186b7`, 300 seeded runs per cell, seed 1.

## Headline

- **The Defender kills faster than every lane, about two and a half times T's
  targets.** The 20-card test deck takes **1.90 turns** on Float-Eye (target
  about 3), **2.21** on the Green Jelly (about 5) and **2.82** on the Death
  Beholder (about 7). The 30-card deck: 2.08 / 2.42 / 3.09. On this branch grey
  runs 3.03 / 4.19 / 6.82, Blood Price 2.10 / 2.56 / 3.75, the Elementalist
  2.76 / 3.32 / 4.58.
- **It wins every cell and is hardly touched**: 100% in all 78 cells of both
  decks, lowest-VITAE p10 0.79 to 0.98 (test deck). It takes 2.1 / 4.9 / 18.1
  VITAE a fight from the foe (grey 13.5 / 45.2 / 160.7), plus 0.9 / 1.3 / 2.2
  from E-09's self-loss, which never killed anyone.
- **DEAL does most of the killing, not the spikes.** Of the foe's VITAE, the
  test deck's DEALs take 67 to 73%, THORNS 24 to 25%, REFLECT 3 to 8% (30-card
  deck: THORNS 27 to 28%, REFLECT 9 to 20%). P-03 PAID alone is the biggest
  card (58% of its draws PAID, about 20 VITAE a fight), and VULNERABLE adds
  5.5 / 12.4 / 47.1 VITAE a fight, about a quarter of the door's VITAE.
- **THORNS runs away through P-06; REFLECT stacks high but fights are too short
  for M-10 to matter.** Each fight's highest THORNS: median 10 to 22, p90 27 to
  64, max 178 (test deck). Taking P-06 out drops the p90 to 16 to 22 and the max
  to 54; E-06's doubling is not the driver. Highest REFLECT: median 20 to 95%,
  p90 113 to 130%, max 295% (30-card deck: p90 to 200%, max 275%), from
  E-03 PAID 100% and P-04 PAID 75% stacking; M-10 adds 15% a turn and a fight
  lasts about 3.
- **A PAID discard line is never unpayable at turn start** (0 of 76,699
  checks). It is refused later in the turn, once the hand has emptied: of the
  3,548 times the witness played a discard card FREE with a die of its colour
  still unspent (0.15 a fight), 74% were because the PAID line could not pay.
- **No card is dead on both lines.** Near-dead PAID lines: M-07 (1%: there is
  rarely an exiled card), M-02, M-04 and M-05 (3 to 4%), E-01 and P-06 (6 to
  11%). M-09's FREE line is dominated by scrapping it (2% FREE: the scrap's
  THORNS 2 and Conviction beat GUARD 4).
- **Numbers alone do not reach the targets**, as with the Elementalist: halving
  every DEAL, P-03's VULNERABLE and every THORNS number still leaves the door at
  3.74 turns. The suggested changes (below) are for the revisions; none is
  applied to the ledger.

## The setup

- **Measured the way the measured-truth report measures a lane**
  (`combat.measured-truth.ts`, `docs/reports/measured/latest.md`): the 26 Act 1
  ledger fights, the player at the level a full clear brings to each, the three
  stat spreads (even, body-mind, body), 300 runs per cell, the greedy witness.
  The harness is `axiomancer-mechanics/src/CLI/defender-sim.cli.ts`. It
  re-measured grey, Blood Price and the Elementalist on this branch: **all 234
  of their cells are identical** (win rate, mean turns, p10) to the last line
  of `docs/reports/measured/history.jsonl` (measured at `c461f9e`, the code
  `72b0186b7` carries), so the sandbox engine changes leave the live lanes
  untouched.
- **Two decks**: `defender`, T's 20-card test deck (below), and `defender-30`,
  all 30 cards, for every card's play rate.
- **The witness.** The plain greedy witness ranks a program card by its printed
  damage preview, 0 for every program card, so it plays them in hand order
  (that is how `latest.md` measures Blood Price and the Elementalist). As in the
  Elementalist's sims, for the Defender cards only the witness reads the program
  system's value estimate: a die goes to the card whose PAID line gains most
  over its FREE line (never a line it cannot pay), the FREE drain plays the best
  FREE line first, and it scraps a card whose discard rider is worth more than
  its FREE line (M-09). A random discard is valued at the mean FREE value of the
  cards in hand. The plain hand-order witness was also run
  (`sandbox-results/defender/voted-plain.md`): **2.19 / 2.59 / 3.40 turns**
  (30 cards: 2.32 / 2.71 / 3.57), 100% wins, p10 0.74 to 0.97. Either witness
  reads the same story.
- **The prototype**: the cards are programs on the live program system
  (`card-program.types.ts`, `combat.card-program.ts`) with sandbox-only verbs
  (`thorns`, `doubleThorns`, `reflect`, `reflectOnAttack`,
  `thornsDoubleWhileUnhurt`, `holdGuard`, `discardRandom`, `discardHand`,
  `retrieve`, `unexileRandom`, `loseVitae`), a card property `onDiscard`
  (M-09), the Defender state on the program ledger (`combat.defender.ts`) and
  five engine hooks in `combat.engine.ts`: P-09's REFLECT as the foe starts to
  attack, THORNS and REFLECT on each strike, M-04's held GUARD, the round-end
  drift, and the M-09 rider on a scrap. The cards are registered through the
  sandbox card registry (`src/Cards/sandbox/defender.cards.ts`), not
  `TRIAL_SETS`.
- **The test**: `src/Combat/e2e/defender.sandbox.engine.test.ts` (7 tests) pins
  THORNS per strike and its drift, REFLECT's share and that it never cuts your
  damage, REFLECT's add-and-refresh, the refused discard line (P-03, P-07), the
  M-09 rider on a random discard and on a scrap, M-04's held GUARD and E-09's
  self-loss. It passes, as do the card, weather and measured-truth suites.

### The rules as simulated

T's rulings (Session 0, the verdicts, and the rulings sent to the sims on
2026-10-26):

- **THORNS n**: each foe strike deals n back, per strike. A DEAL: VULNERABLE
  applies, a FROZEN foe takes it doubled. Drops by 1 each round after the round
  it was applied in (BLIZZARD's drift). Stacks by adding. Heart-scaled
  (repeating, as LEECH) when applied (D110); derived THORNS (P-06, E-06) is
  unscaled.
- **REFLECT n%**: each foe strike sends n% of its damage before GUARD back as a
  DEAL. **It never reduces the damage you take** (T: 10 damage against 100%
  REFLECT, both take 10; your share is still cut by GUARD). Lasts 2 turns; a new
  REFLECT adds its % and refreshes to 2 turns. **No cap** (T). Unscaled.
- **The discard**: "Discard n cards at random" sits only on PAID lines; a PAID
  line with fewer other cards in hand than it discards is refused. **P-07 PAID
  with no other card in hand is refused too** (T, overriding the brief's
  default); its FREE line plays.
- **M-09's rider** is a card property on both lines and fires on a random
  discard **and on a scrap** (the manual discard, `discardCombatCard`, +1
  Conviction) (T).
- **P-08**: on the foe's turn, while GUARD holds (you have taken no damage that
  foe turn), each THORNS trigger deals double (T).
- **P-09 PAID**: if the foe attacks on its turn, REFLECT 50% is in place before
  its first strike (T).
- **VULNERABLE** (T's numbers, 2026-10-26): P-03 FREE "+50% for 1 turn, then
  DEAL 4", PAID "Discard 2 at random. +150% for 2 turns, then DEAL 15"; M-03
  FREE "GUARD 3, +50% for 1 turn", PAID "GUARD 6, +75% for 2 turns". P-03 puts
  the VULNERABLE on before its DEAL.
- **Globals** (P-10, E-09, M-06, M-10): the PAID line equals the FREE line and
  paying makes it permanent; FREE is in play 3 turn starts.

### Provisional assumptions (T is still settling these)

- VULNERABLE's durations are the provisional "1 turn FREE, 2 turns PAID"; T
  thought it lasted 3 turns. The P-03 / M-03 play rates and what VULNERABLE adds
  are reported below so T can pick numbers.
- P-06's "damage you've done this turn" is the VITAE your DEALs took off the foe
  during your current turn (THORNS and REFLECT happen on the foe's turn).
- E-09's "lose 3 VITAE" is a self-loss GUARD does not block; it can kill (it
  never did).
- A foe killed by THORNS or REFLECT mid-attack makes no further strikes. THORNS
  fires before REFLECT on each strike; both fire on a strike GUARD fully blocks.
- M-07 PAID returns the exiled card to a random place in the draw pile.
  RETRIEVE draws from the discard (the played card is not yet there).
- Colours (dice that pay), T's approved even split: red P-01 P-03 P-06 E-04 E-07
  E-10 M-03 M-05 M-08 M-09; blue P-02 P-08 P-09 P-10 E-01 E-03 E-08 M-01 M-02
  M-04; purple P-04 P-05 P-07 E-02 E-05 E-06 E-09 M-06 M-07 M-10.
- The Spells (P-07, E-05, E-06) are printed as the ledger has them; no Spell-law
  step is added on top.

## The test deck (T, 2026-10-26)

Every Global and every Spell, 7 red, 6 blue, 7 purple, one copy each:

| Colour | Cards |
|---|---|
| red | P-01, P-03, P-06, E-04, E-07, M-08, M-09 |
| blue | P-02, P-08, P-10, E-01, E-03, M-01 |
| purple | P-07, E-05, E-06, E-09, M-06, M-07, M-10 |

Left out: P-04, P-05, P-09, E-02, E-08, E-10, M-02, M-03, M-04, M-05 (measured in
the 30-card deck).

## Fight length per foe against T's targets

Mean player turns to the win, averaged over every ledger fight of the foe and
the three spreads. Grey, Blood Price and the Elementalist measured on this
branch (identical to `history.jsonl` at `c461f9e`).

| foe | T's target | grey | Blood Price | Elementalist | Defender 20 | Defender 30 |
|---|---|---|---|---|---|---|
| Float-Eye | about 3 | 3.03 | 2.10 | 2.76 | **1.90** | 2.08 |
| Green Jelly | about 5 | 4.19 | 2.56 | 3.32 | **2.21** | 2.42 |
| Death Beholder | about 7 | 6.82 | 3.75 | 4.58 | **2.82** | 3.09 |

Per fight (even / body-mind / body):

| fight | grey (even) | Blood Price (even) | Elementalist (even) | Defender 20 | Defender 30 |
|---|---|---|---|---|---|
| bw-2/float-eye | 4.38 | 2.40 | 3.04 | 2.11 / 2.11 / 2.11 | 2.26 / 2.26 / 2.26 |
| bw-8/green-jelly | 6.01 | 2.96 | 3.76 | 2.55 / 2.55 / 2.55 | 2.70 / 2.70 / 2.70 |
| bw-17/death-beholder | 7.90 | 3.94 | 4.63 | 3.00 / 2.98 / 2.90 | 3.17 / 3.18 / 3.12 |
| cw-12/green-jelly | 5.21 | 2.86 | 3.61 | 2.34 / 2.25 / 2.15 | 2.52 / 2.50 / 2.41 |
| cw-17/death-beholder | 7.62 | 4.03 | 4.83 | 2.89 / 2.84 / 2.75 | 3.14 / 3.11 / 3.04 |
| bc-8/green-jelly | 4.05 | 2.62 | 3.42 | 2.17 / 2.06 / 2.00 | 2.39 / 2.32 / 2.23 |
| bc-15/death-beholder | 6.92 | 4.04 | 4.90 | 2.76 / 2.81 / 2.68 | 3.03 / 3.13 / 3.01 |
| ld-3/float-eye | 2.60 | 2.10 | 2.81 | 1.82 / 1.74 / 1.62 | 1.98 / 1.95 / 1.85 |
| ld-8/green-jelly | 3.28 | 2.46 | 3.25 | 2.02 / 1.99 / 1.88 | 2.24 / 2.23 / 2.07 |
| ld-16/death-beholder | 7.06 | 4.21 | 5.24 | 2.74 / 2.81 / 2.65 | 3.02 / 3.16 / 3.02 |

Every fight, and the measured table of win rate / lowest-VITAE p10 for all five
decks and three spreads, is in `axiomancer-mechanics/sandbox-results/defender/table.md`.

## Win rate, VITAE and the damage split

Test deck (20), per fight, averaged over the foe's ledger fights and spreads:

| foe | turns | win | p10 (lowest) | VITAE taken from the foe | E-09 self-loss | foe VITAE to THORNS | to REFLECT | to DEAL | THORNS share | REFLECT share | VULNERABLE added | foe strikes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 1.90 | 100% | 0.94 | 2.05 | 0.88 | 12.7 | 1.8 | 38.6 | 24% | 3% | 5.5 | 1.21 |
| Green Jelly | 2.21 | 100% | 0.87 | 4.91 | 1.30 | 19.0 | 4.0 | 53.0 | 25% | 5% | 12.4 | 1.55 |
| Death Beholder | 2.82 | 100% | 0.79 | 18.14 | 2.20 | 42.9 | 13.8 | 115.4 | 25% | 8% | 47.1 | 2.31 |

30-card deck:

| foe | turns | win | p10 (lowest) | VITAE taken from the foe | E-09 self-loss | foe VITAE to THORNS | to REFLECT | to DEAL | THORNS share | REFLECT share | VULNERABLE added | foe strikes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.08 | 100% | 0.95 | 1.65 | 0.63 | 14.1 | 4.7 | 34.2 | 27% | 9% | 6.4 | 1.47 |
| Green Jelly | 2.42 | 100% | 0.90 | 4.73 | 0.94 | 21.6 | 9.3 | 45.2 | 28% | 12% | 13.4 | 1.90 |
| Death Beholder | 3.09 | 100% | 0.82 | 18.28 | 1.76 | 47.8 | 34.5 | 91.7 | 27% | 20% | 45.7 | 2.73 |

VITAE taken from the foe per fight, for comparison (Float-Eye / Green Jelly /
Death Beholder): grey 13.5 / 45.2 / 160.7, Blood Price 3.5 / 8.1 / 30.4, the
Elementalist 3.0 / 6.5 / 17.4. The Defender is hit about as little as the
Elementalist, mostly because the foe gets only 1.2 to 2.7 strikes a fight before
it dies; the spikes have few strikes to answer. "DEAL" counts every DEAL of a
card or Global, including P-01's "+1 per THORNS" and P-02's "DEAL equal to your
GUARD", which turn the shell into DEAL. "VULNERABLE added" is the part of the
DEAL, THORNS and REFLECT damage that VULNERABLE made.

## How big THORNS and REFLECT get

Each fight's highest THORNS and REFLECT (median / p90 / max over the fights):

| deck | foe | THORNS | REFLECT |
|---|---|---|---|
| test 20 | Float-Eye | 10 / 27 / 97 | 20% / 113% / 180% |
| test 20 | Green Jelly | 13 / 34 / 100 | 49% / 115% / 180% |
| test 20 | Death Beholder | 22 / 64 / 178 | 95% / 130% / 295% |
| all 30 | Float-Eye | 10 / 23 / 80 | 73% / 138% / 255% |
| all 30 | Green Jelly | 12 / 29 / 98 | 83% / 160% / 275% |
| all 30 | Death Beholder | 18 / 49 / 205 | 117% / 200% / 275% |

**THORNS' runaway is P-06, not E-06.** Test-deck variants at 100 runs a cell:

| variant | turns (Float-Eye / Green Jelly / Death Beholder) | THORNS p90 / max on the door |
|---|---|---|
| as voted | 1.90 / 2.21 / 2.82 | 64 / 178 |
| P-06 swapped for M-03 | 1.90 / 2.17 / 2.78 | 22 / 54 |
| E-06 swapped for E-02 | 1.87 / 2.16 / 2.76 | 59 / 174 |

P-06's FREE line turns the turn's whole DEAL into THORNS, after a P-03 PAID
(DEAL 15 at +150%) one FREE play can put up 30 or more THORNS, and its PAID line
doubles that; E-06 then doubles a stack that is already large. Without
P-06 the deck is no slower: THORNS is a quarter of the kill, and the rest is DEAL.

**REFLECT stacks high because E-03 PAID (100%) and P-04 PAID (75%) stack**; the
2-turn refresh keeps it up. M-10's +15% a turn is small at these fight lengths
(about 3 turns, so +45% at most from one M-10). If the revisions bring fights to
T's targets, a PAID M-10 from turn 1 reaches 105% on its own by turn 7 and keeps
growing, uncapped; REFLECT never cuts the damage you take, so its size is bounded
only by the foe's own hits. That is the line to watch once fights are longer.

## The discard lines

| deck | PAID unpayable at turn start | discard card played FREE with a die of its colour unspent | of those, because PAID could not pay | cards discarded / fight | M-09 riders / fight |
|---|---|---|---|---|---|
| test 20 | 0% (of 76,699 checks) | 3,548 (0.15 a fight) | 74% | 1.57 | 0.25 |
| all 30 | 0% (of 75,398) | 3,897 (0.17 a fight) | 62% | 1.52 | 0.20 |

At the start of a turn the hand always had enough other cards, so no discard
line was ever refused then; the refusal is a late-turn event, after the hand has been
played down. RETRIEVE (M-07 FREE) returns 0.35 cards a fight; M-07 PAID returns
an exiled card 0.01 times a fight. P-08's doubled THORNS fires 0.25 times a fight.

## Each card's play rate (share of the card's draws)

The rest of a draw is the card discarded at random, scrapped, or the fight ending
first. "Swing" is the foe VITAE the play took right away, per fight (THORNS and
REFLECT land on the foe's turn, so a spikes card shows 0).

| Card | Colour | Type | PAID (30) | FREE (30) | PAID (20) | FREE (20) | PAID swing / fight (20) |
|---|---|---|---|---|---|---|---|
| P-01 | red | attack | 34% | 46% | 30% | 43% | 5.2 |
| P-02 | blue | skill | 42% | 36% | 40% | 38% | 3.1 |
| P-03 | red | attack | 66% | 25% | 58% | 32% | 20.1 |
| P-04 | purple | attack | 36% | 48% | | | |
| P-05 | purple | skill | 30% | 48% | | | |
| P-06 | red | skill | **7%** | 61% | **6%** | 60% | 0 |
| P-07 | purple | spell | 16% | 62% | 10% | 54% | 0 |
| P-08 | blue | skill | 31% | 49% | 23% | 45% | 0 |
| P-09 | blue | skill | 37% | 40% | | | |
| P-10 | blue | global | 35% | 46% | 26% | 46% | 0 |
| E-01 | blue | skill | **11%** | 62% | **6%** | 60% | 0 |
| E-02 | purple | skill | 28% | 50% | | | |
| E-03 | blue | skill | 33% | 46% | 35% | 41% | 0 |
| E-04 | red | attack | 35% | 45% | 30% | 42% | 2.1 |
| E-05 | purple | spell | 12% | 62% | 9% | 59% | 0 |
| E-06 | purple | spell | 24% | 52% | 16% | 54% | 0 |
| E-07 | red | attack | 42% | 39% | 33% | 44% | 4.1 |
| E-08 | blue | skill | 38% | 42% | | | |
| E-09 | purple | global | 49% | 29% | 53% | 24% | 0 |
| E-10 | red | skill | 23% | 56% | | | |
| M-01 | blue | skill | 28% | 47% | 27% | 42% | 0 |
| M-02 | blue | skill | **3%** | 68% | | | |
| M-03 | red | skill | 43% | 36% | | | |
| M-04 | blue | skill | **3%** | 69% | | | |
| M-05 | red | skill | **4%** | 62% | | | |
| M-06 | purple | global | 40% | 37% | 34% | 40% | 0 |
| M-07 | purple | skill | **1%** | 67% | **1%** | 62% | 0 |
| M-08 | red | attack | 26% | 52% | 22% | 50% | 1.0 |
| M-09 | red | attack | 48% | **2%** | 48% | **2%** | 6.0 |
| M-10 | purple | global | 41% | 38% | 35% | 39% | 0 |

**P-03 and M-03 (for T's VULNERABLE numbers):** P-03 is played PAID on 58% of
its draws in the test deck (66% in the 30) and FREE on 32% (25%); M-03 PAID 43%,
FREE 36% (30-card deck). VULNERABLE adds 5.5 / 12.4 / 47.1 foe VITAE a fight
(test deck; 6.4 / 13.4 / 45.7 in the 30), almost all of it from P-03 PAID's
+150% for 2 turns, which boosts the DEAL 15 it rides on and the next turn's
DEALs, THORNS and REFLECT. With P-03 at +25% / +75% (trial B below, where the DEALs are also halved)
VULNERABLE adds 5.6 / 9.3 / 26.1. A 3-turn VULNERABLE would cover most of a fight at these
lengths.

**Dead and dominated:**

- **M-07 PAID, 1%**: "return a random exiled card" has nothing to return in
  most fights (three Spells, short fights). Not a number; a structure question.
- **M-09 FREE, 2%**: dominated by scrapping the card (the scrap's THORNS 2 and
  +1 Conviction beat GUARD 4). That may be the design (the card wants to be
  thrown away); M-09 PAID (DEAL 10, GUARD 4) is played on 48% of draws.
- **M-02 PAID, M-04 PAID, 3%**: the deck is barely hurt (2 to 18 VITAE a
  fight), so a HEAL rarely has room and a held GUARD rarely meets a second foe
  turn. A number would not revive them in these fights.
- **M-05 PAID, 4%**: a discard for 2 more Conviction and 1 more THORNS.
- **E-01 PAID, 6 to 11%**: a discard for GUARD 10 over GUARD 4 that the small
  incoming hits do not need; THORNS 2 over 1 is the only gain.
- **P-06 PAID, 6 to 7%**: its FREE line already does the job (60%); the PAID
  doubling competes for a red die with P-03, P-01 and E-07.
- **E-05 PAID (9 to 12%) and P-07 PAID (10 to 16%)** are the expensive discard
  Spells; they are played, but rarely.

## The adjustments pass (trials, not applied)

Trials on the test deck at 300 runs a cell (`sandbox-results/defender/trials/`):

| trial | Float-Eye | Green Jelly | Death Beholder | THORNS / REFLECT / DEAL share on the door |
|---|---|---|---|---|
| as voted | 1.90 | 2.21 | 2.82 | 25% / 8% / 67% |
| A: every printed DEAL halved | 2.15 | 2.51 | 3.25 | 37% / 14% / 50% |
| B: A, and P-03's VULNERABLE halved (FREE +25%, PAID +75%) | 2.27 | 2.68 | 3.55 | 39% / 16% / 44% |
| C: B, and every THORNS number halved (P-07 3 to 2 per card) | 2.42 | 2.85 | 3.74 | 33% / 21% / 47% |

Halving the DEALs makes THORNS and REFLECT the bigger share of the kill (the
turtle's fantasy) but barely slows the deck: DEAL that reads the shell (P-01's
"+n per THORNS", P-02's "DEAL equal to your GUARD") and P-06's THORNS from the
turn's damage carry it. As with the Elementalist, even C leaves the door under
4 turns: every card in hand is played every turn (FREE when no die), each die a
turn pays a PAID line, and DRAW, RETRIEVE and M-06 keep the hand full.
Reaching 5 and 7 turns is a revisions question about the FREE lines' budget and
the shell-to-DEAL converters, not a number tweak.

## Suggested number changes (for the revisions; not applied to the ledger)

1. **P-03**: PAID VULNERABLE +150% to **+75%** (FREE +50% to **+25%**), or keep
   the % and shorten the PAID to 1 turn. It is the deck's biggest card and
   VULNERABLE adds a quarter of the door's VITAE.
2. **Every printed DEAL about halved**: P-01 4/8 to 2/4, P-03 4/15 to 2/8, P-04
   PAID 5 to 3, E-04 3/5 to 2/3, E-07 2/10 to 1/5, M-08 2/4 to 1/2, M-09 PAID 10
   to 5. Moves the kill toward THORNS and REFLECT; door 2.82 to 3.25 turns.
3. **P-06**: FREE "THORNS equal to **half** the damage you've done this turn",
   PAID "equal to the damage" (was equal / twice). It is the THORNS runaway
   (door p90 64, max 178 with it; 22 / 54 without).
4. **P-01**: "+1 per THORNS" / "+2 per THORNS" are the shell-to-DEAL converter
   with no ceiling; consider "+1 per 2 THORNS" on the FREE line and "+1 per
   THORNS" on the PAID line.
5. **THORNS numbers** (trial C's halving) only if 1 to 4 still leave fights
   short; THORNS is already only a quarter of the kill.
6. **E-01 PAID**: dominated; THORNS 2 to **3** (or drop the discard) so the
   discard buys something the deck needs.
7. **M-04 PAID**: add **GUARD 4** to the PAID line ("GUARD 4. You don't lose your
   GUARD at the end of the enemy's turn"), so paying is never worse than FREE.
8. **M-10**: no change in Act 1, but if fights reach the targets consider
   REFLECT **10%**, or "refreshes without adding" on the PAID line; uncapped
   +15% a turn reaches 105% by turn 7.
9. Not numbers (structure, for T): M-07 PAID (nothing to un-exile), M-09 FREE
   (dominated by its own scrap), M-02 / M-05 PAID (no room to heal, Conviction).

## What is approximate or not modelled

- **The witness** (above) is the Elementalist precedent's value witness for the
  Defender cards; its weights (THORNS over a three-foe-turn horizon with drift,
  REFLECT over 2 turns at 85%, a discard at the mean FREE value of the hand,
  DRAW and RETRIEVE worth 3, an un-exile 6) are mine. Grey, Blood Price and the
  Elementalist are measured unchanged.
- **THORNS' Heart scaling** is the LEECH convention (repeating, scaled when
  applied); the spreads keep Heart near 5, so it barely moves.
- **REFLECT's base** is the strike after the escalation clock, stage bonus and
  BLIZZARD, before RIPOSTE, GUARD and BARRIER.
- **Drift**: THORNS drops by 1 at the end of each round it was up at the start
  of; REFLECT's 2 turns count down at the round boundary (a REFLECT played on
  your turn covers this foe turn and the next).
- **The relics** (Thornback Signet, Mirror Brooch, Carapace Belt) and their
  signature skills are not modelled; the existing signatures (The Open Hand,
  Crimson Covenant) are available to the witness as in every measured deck.
- **No upgrades**: the cards have no upgrade paths, so there is no Defender+half
  column. Names are placeholders ("Defender P-01").
- **The illegal-PAID feedback** (the shake and vibration) is UI; the sim only
  refuses the play.
- The per-foe means average every ledger fight and spread equally.

## Files (branch `sandbox/defender-sims`)

- `axiomancer-mechanics/src/Combat/combat.defender.ts`: the Defender state, drift, sim telemetry
- `axiomancer-mechanics/src/Combat/combat.card-program.ts`, `combat.engine.ts`, `src/Cards/card-program.types.ts`: the sandbox verbs and hooks
- `axiomancer-mechanics/src/Combat/combat.encounter.sim.ts`: the Defender witness
- `axiomancer-mechanics/src/Cards/sandbox/defender.cards.ts`: the 30 cards, the numbers table, the colours, the test deck
- `axiomancer-mechanics/src/Combat/e2e/defender.sandbox.engine.test.ts`: the rules pinned
- `axiomancer-mechanics/src/CLI/defender-sim.cli.ts`: the harness (`--numbers=voted|<file>.json`, `--witness=value|plain`, `--baseline`, `--deck=`)
- `axiomancer-mechanics/sandbox-results/defender/`: raw results (`voted-value.json`, `voted-plain.json`), summaries (`voted-value.md`, `voted-plain.md`, `table.md`), the trials (`trials/`) and the tools (`summarize.mjs`, `table.mjs`)
