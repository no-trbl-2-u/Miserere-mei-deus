# The Elementalist sims (lane-creator step 6)

> Step 6 of `docs/lane-creator.md` for the Elementalist
> (`rehearsal-elementalist.md`): T's 30 kept cards simulated against the Act 1
> fights, so the revisions session (step 7) has real numbers. A measurement,
> not a gate (D57). Sandbox only: this file lives on branch
> `sandbox/elementalist-sims`, which never merges. Run 2026-10-24 from
> `origin/main` at `9bc0d4e32`, 300 seeded runs per cell, seed 1.

## Headline

- **The Elementalist kills about twice as fast as T's targets.** As voted, the
  20-card test deck takes **2.1 turns** on Float-Eye (target about 3), **2.6**
  on the Green Jelly (about 5) and **3.7** on the Death Beholder (about 7). That
  is Blood Price's pace (2.1 / 2.6 / 3.9); the grey deck is the one that runs
  near the targets (3.0 / 4.2 / 6.8).
- **It wins every cell and is hardly touched**: 100% win rate in all 78 cells,
  lowest-VITAE p10 between 0.91 and 0.99 (grey 0.00 to 0.98, Blood Price 0.51
  to 0.91).
- **INFERNO never killed the player**: 0 self-kills in 23,400 test-deck fights
  (and 0 in the 30-card deck). Your INFERNO costs about 1.8 VITAE a fight (4.6
  on the Death Beholder), against 3.3 from the foe's hits.
- **FROZEN lands on 11% of foe turns** (18% against Float-Eye, 9% Green Jelly,
  1% Death Beholder) and doubles about 0.2, 0.1 and 0.03 DEALs a fight.
- **No dead card.** Every card's FREE line is played on 37% to 92% of its
  draws. Four PAID lines are near-dead: P-05 (0%, its PAID line is dominated by
  its own FREE line), M-02 (1 to 2%), M-01 (4%), M-07 (5%).
- **The adjustments** (22 printed numbers: DEAL and INFERNO halved, STORM
  trimmed, M-07 revived) slow the deck to **2.6 / 3.3 / 4.6 turns**. That is as
  far as numbers go without gutting the cards: the rest of the speed is the
  STORM's own growth, which no printed number controls (below).

## The setup

- **Measured the way the measured-truth report measures a lane**
  (`combat.measured-truth.ts`, `docs/reports/measured/latest.md`): the 26 Act 1
  ledger fights, the player at the level a full clear brings to each, the three
  stat spreads (even, body-mind, body), 300 runs per cell, the greedy witness.
  The harness is `axiomancer-mechanics/src/CLI/elementalist-sim.cli.ts`; it
  re-measured grey and Blood Price on this branch and got **every one of their
  156 cells identical** to `latest.md` (measured at `c82cafcc1`), so the sandbox
  engine changes leave the live lanes untouched.
- **Two decks**: `elementalist`, the provisional 20-card test deck (below), the
  deck the measured table carries; and `elementalist-30`, all 30 cards, for every
  card's play rate.
- **The prototype**: the cards are programs on today's live program system
  (`card-program.types.ts` `ProgramCtx`, `combat.card-program.ts`) with
  sandbox-only verbs for the new keywords (`inferno`, `blizzard`, `storm`,
  `draw`, `removeYourInferno`, `moveYourInferno`, `spendBlizzard`,
  `triggerStorm`, `doubleBlizzardAndStorm`, `swapElements`), the weather state
  in the program ledger (`combat.elements.ts`) and four engine hooks: the foe's
  turn start (INFERNO, then STORM, then STORM grows), the FROZEN check and
  BLIZZARD cut on the foe's hits, your turn start (your INFERNO, which can kill
  you) and the round boundary (drift). The old `combat.blood-price.ts` runtime
  was not revived. The cards are registered through the sandbox card registry,
  not `TRIAL_SETS` (THE CARD HOLD, D37).
- **The rules** are T's final rulings for this sim (the brief, and
  `rehearsal-elementalist.md` "The weather" and "Stacking"): INFERNO burns the
  foe in full at its turn start and you by half (rounded down) at yours, plain
  loss; BLIZZARD n takes n off each foe hit; FROZEN when the BLIZZARD is at
  least the foe's attack (next DEAL doubled, then FROZEN ends, BLIZZARD stays,
  re-triggers every foe turn); STORM n: the foe loses n at its turn start, then
  STORM grows by 1; all three last the whole combat and stack by adding;
  INFERNO and BLIZZARD drop by 1 each round after the round they were applied
  in; DRAW n draws n; a Global's PAID line equals its FREE line (permanent,
  FREE is in play 3 turns); only ⟳ triggers; caps kept only on P-06 PAID (+12)
  and P-09 FREE (+6).
- **The test**: `src/Combat/e2e/elementalist.sandbox.engine.test.ts` (9 tests)
  pins each rule above on the engine.

## The colour assignment (placeholder; colour by job)

A hit is red (body), a wall, heal or utility card blue (mind), an affliction
(main payoff INFERNO, BLIZZARD, STORM or VULNERABLE) purple (heart). **9 red,
11 blue, 10 purple.** Ten red was not reachable without calling an affliction
a hit; the two borderline calls are P-05 and E-06, made red because their only
job is the foe's VITAE loss.

| Slot | Kept | Colour | Why |
|---|---|---|---|
| P-01 | P-01b | red | hit |
| P-02 | P-02b | red | hit |
| P-03 | P-03a | blue | wall |
| P-04 | P-04a | red | hit |
| P-05 | P-05b | red | cash-out: DEAL equal to the STORM / the foe takes its STORM |
| P-06 | P-06b | blue | wall and DRAW |
| P-07 | P-07a | red | hit |
| P-08 | P-08b | purple | PAID doubles BLIZZARD and STORM |
| P-09 | P-09a | red | hit |
| P-10 | P-10b | red | Global DEAL |
| E-01 | E-01b | purple | INFERNO |
| E-02 | E-02c | red | hit |
| E-03 | E-03b | purple | BLIZZARD |
| E-04 | E-04c | purple | BLIZZARD |
| E-05 | E-05b | purple | STORM |
| E-06 | E-06a | red | Global: the STORM grows faster (damage only) |
| E-07 | E-07b | blue | DRAW |
| E-08 | E-08c | purple | BLIZZARD and INFERNO |
| E-09 | E-09b | purple | Global BLIZZARD |
| E-10 | E-10c | blue | DRAW and the swap |
| M-01 | M-01a | blue | the Fire safety valve, HEAL |
| M-02 | M-02a | blue | HEAL |
| M-03 | M-03a | blue | DRAW |
| M-04 | M-04a | purple | all three elements |
| M-05 | M-05c | blue | DRAW and Conviction |
| M-06 | M-06a | blue | wall |
| M-07 | M-07b | purple | STORM / VULNERABLE |
| M-08 | M-08c | purple | Global STORM (and DRAW) |
| M-09 | M-09c | blue | moves your INFERNO, HEAL |
| M-10 | T's own | blue | Global HEAL (and STORM) |

## The provisional test deck (20; T picks the real one)

Chosen by role, as Blood Price's was: every payoff has its source in the deck,
7 red, 7 blue, 6 purple, no copies.

| Card | Colour | Role |
|---|---|---|
| P-01 | red | Fire payoff: DEAL doubled while the foe burns (sources E-01, P-02, P-07, M-04, E-08) |
| P-02 | red | Fire payoff: the big hit that sets both sides burning |
| P-04 | red | Frost payoff: shatter, spends the BLIZZARD (sources E-03, E-08, M-04, its own FREE) |
| P-05 | red | Storm payoff: the cash-out (its FREE line is its own source) |
| P-07 | red | Fire + Frost bridge: the FROZEN hit |
| P-10 | red | Global payoff: DEAL while two elements are up |
| E-06 | red | Storm engine: the STORM grows faster |
| P-03 | blue | Frost payoff: GUARD from the BLIZZARD |
| P-06 | blue | Storm payoff: GUARD from the STORM, DRAW |
| M-02 | blue | Frost sustain: HEAL from the BLIZZARD |
| M-06 | blue | Frost payoff: GUARD doubled while FROZEN |
| M-01 | blue | Fire safety valve: remove your INFERNO |
| E-07 | blue | Storm engine: DRAW, then STORM equal to the hand |
| M-10 | blue | Global sustain: STORM, then HEAL from the STORM |
| E-01 | purple | Fire source |
| E-03 | purple | Frost source (the road to FROZEN) |
| E-05 | purple | Storm source, DRAW |
| E-08 | purple | Fire + Frost source on the foe only; Steam |
| M-04 | purple | all three elements at once (P-10's enabler) |
| P-08 | purple | Frost + Storm payoff: doubles both |

Left out: P-09, E-02, E-04, E-09, E-10, M-03, M-05, M-07, M-08, M-09 (measured
in the 30-card deck).

## The measured table (win rate / lowest-VITAE p10)

Grey and Blood Price measured on this branch (identical to `latest.md` at
`c82cafcc1`); the Elementalist is the 20-card test deck, as voted and adjusted.
Blood Price's half-upgraded column is not repeated; the Elementalist has no
upgrade paths written, so it has none.

| fight | level | grey even | grey body-mind | grey body | blood-price even | blood-price body-mind | blood-price body | el. voted even | el. voted body-mind | el. voted body | el. adjusted even | el. adjusted body-mind | el. adjusted body |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bw-2/float-eye | L1 v L2 | 100% / 0.74 | 100% / 0.74 | 100% / 0.74 | 100% / 0.78 | 100% / 0.78 | 100% / 0.78 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 |
| bw-6/float-eye | L1 v L2 | 100% / 0.74 | 100% / 0.74 | 100% / 0.74 | 100% / 0.78 | 100% / 0.78 | 100% / 0.78 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 |
| bw-8/green-jelly | L2 v L3 | 100% / 0.25 | 100% / 0.25 | 100% / 0.25 | 100% / 0.69 | 100% / 0.69 | 100% / 0.69 | 100% / 0.95 | 100% / 0.95 | 100% / 0.95 | 100% / 0.93 | 100% / 0.93 | 100% / 0.93 |
| bw-10/float-eye | L3 v L2 | 100% / 0.76 | 100% / 0.77 | 100% / 0.77 | 100% / 0.81 | 100% / 0.82 | 100% / 0.82 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 |
| bw-14/float-eye | L4 v L2 | 100% / 0.77 | 100% / 0.78 | 100% / 0.87 | 100% / 0.82 | 100% / 0.83 | 100% / 0.83 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 |
| bw-17/death-beholder (door) | L4 v L1 | 21% / 0.00 | 27% / 0.00 | 68% / 0.00 | 100% / 0.51 | 100% / 0.54 | 100% / 0.57 | 100% / 0.91 | 100% / 0.92 | 100% / 0.92 | 100% / 0.91 | 100% / 0.92 | 100% / 0.92 |
| cw-5/float-eye | L6 v L2 | 100% / 0.79 | 100% / 0.88 | 100% / 0.90 | 100% / 0.85 | 100% / 0.86 | 100% / 0.87 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| cw-7/float-eye | L7 v L2 | 100% / 0.79 | 100% / 0.88 | 100% / 0.96 | 100% / 0.85 | 100% / 0.87 | 100% / 0.87 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| cw-10/float-eye | L7 v L2 | 100% / 0.79 | 100% / 0.88 | 100% / 0.96 | 100% / 0.85 | 100% / 0.87 | 100% / 0.87 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| cw-12/green-jelly | L7 v L3 | 100% / 0.55 | 100% / 0.73 | 100% / 0.75 | 100% / 0.77 | 100% / 0.79 | 100% / 0.82 | 100% / 0.96 | 100% / 0.97 | 100% / 0.97 | 100% / 0.95 | 100% / 0.96 | 100% / 0.95 |
| cw-16/float-eye | L8 v L3 | 100% / 0.87 | 100% / 0.89 | 100% / 0.89 | 100% / 0.84 | 100% / 0.86 | 100% / 0.87 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| cw-19/float-eye | L9 v L3 | 100% / 0.89 | 100% / 0.89 | 100% / 0.96 | 100% / 0.85 | 100% / 0.87 | 100% / 0.88 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| cw-17/death-beholder (door) | L9 v L2 | 50% / 0.00 | 83% / 0.00 | 99% / 0.37 | 100% / 0.58 | 100% / 0.63 | 100% / 0.65 | 100% / 0.91 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 |
| bc-2/float-eye | L12 v L3 | 100% / 0.90 | 100% / 0.97 | 100% / 0.96 | 100% / 0.88 | 100% / 0.89 | 100% / 0.90 | 100% / 0.98 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| bc-8/green-jelly | L12 v L3 | 100% / 0.78 | 100% / 0.89 | 100% / 0.89 | 100% / 0.83 | 100% / 0.87 | 100% / 0.87 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 | 100% / 0.96 | 100% / 0.97 | 100% / 0.97 |
| bc-10/float-eye | L13 v L3 | 100% / 0.91 | 100% / 0.97 | 100% / 0.96 | 100% / 0.88 | 100% / 0.89 | 100% / 0.90 | 100% / 0.98 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| bc-11/float-eye | L13 v L4 | 100% / 0.89 | 100% / 0.91 | 100% / 0.96 | 100% / 0.86 | 100% / 0.89 | 100% / 0.89 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| bc-13/float-eye | L13 v L4 | 100% / 0.89 | 100% / 0.91 | 100% / 0.96 | 100% / 0.86 | 100% / 0.89 | 100% / 0.89 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| bc-15/death-beholder (door) | L14 v L3 | 86% / 0.00 | 95% / 0.23 | 100% / 0.55 | 100% / 0.62 | 100% / 0.69 | 100% / 0.69 | 100% / 0.91 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 |
| ld-3/float-eye | L16 v L3 | 100% / 0.96 | 100% / 0.98 | 100% / 0.98 | 100% / 0.89 | 100% / 0.91 | 100% / 0.91 | 100% / 0.99 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.99 |
| ld-5/float-eye | L16 v L3 | 100% / 0.96 | 100% / 0.98 | 100% / 0.98 | 100% / 0.89 | 100% / 0.91 | 100% / 0.91 | 100% / 0.99 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.99 |
| ld-8/green-jelly | L16 v L3 | 100% / 0.91 | 100% / 0.93 | 100% / 0.96 | 100% / 0.86 | 100% / 0.89 | 100% / 0.90 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 |
| ld-11/float-eye | L17 v L4 | 100% / 0.93 | 100% / 0.98 | 100% / 0.96 | 100% / 0.89 | 100% / 0.91 | 100% / 0.91 | 100% / 0.98 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| ld-12/float-eye | L17 v L4 | 100% / 0.93 | 100% / 0.98 | 100% / 0.96 | 100% / 0.89 | 100% / 0.91 | 100% / 0.91 | 100% / 0.98 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| ld-13/float-eye | L17 v L4 | 100% / 0.93 | 100% / 0.98 | 100% / 0.96 | 100% / 0.89 | 100% / 0.91 | 100% / 0.91 | 100% / 0.98 | 100% / 0.99 | 100% / 0.99 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| ld-16/death-beholder (door) | L18 v L4 | 82% / 0.00 | 100% / 0.29 | 100% / 0.57 | 100% / 0.65 | 100% / 0.72 | 100% / 0.70 | 100% / 0.91 | 100% / 0.92 | 100% / 0.91 | 100% / 0.91 | 100% / 0.92 | 100% / 0.91 |

The 30-card deck reads the same: 100% everywhere, p10 0.88 to 0.99.

## Fight length per foe against T's targets

Mean player turns to the win (the engine's round count), averaged over every
ledger fight of the foe and the three spreads.

| foe | T's target | grey | Blood Price | Elementalist voted (20 / 30) | Elementalist adjusted (20 / 30) |
|---|---|---|---|---|---|
| Float-Eye | about 3 | 3.03 | 2.14 | 2.09 / 2.14 | 2.63 / 2.73 |
| Green Jelly (the Brine Hag) | about 5 | 4.19 | 2.61 | 2.55 / 2.60 | 3.25 / 3.34 |
| Death Beholder (the Doorwarden) | about 7 | 6.82 | 3.86 | 3.74 / 3.75 | 4.62 / 4.67 |

Per fight (even / body-mind / body):

| fight | grey (even) | Blood Price (even) | el. voted | el. adjusted |
|---|---|---|---|---|
| bw-2/float-eye | 4.38 | 2.46 | 2.37 / 2.37 / 2.37 | 2.87 / 2.87 / 2.87 |
| bw-8/green-jelly | 6.01 | 3.04 | 2.95 / 2.95 / 2.95 | 3.63 / 3.63 / 3.63 |
| bw-17/death-beholder | 7.90 | 4.06 | 3.84 / 3.72 / 3.63 | 4.56 / 4.44 / 4.36 |
| cw-12/green-jelly | 5.21 | 2.92 | 2.80 / 2.64 / 2.46 | 3.55 / 3.38 / 3.21 |
| cw-17/death-beholder | 7.62 | 4.15 | 3.95 / 3.66 / 3.49 | 4.76 / 4.56 / 4.36 |
| bc-8/green-jelly | 4.05 | 2.68 | 2.63 / 2.32 / 2.16 | 3.37 / 3.02 / 2.84 |
| bc-15/death-beholder | 6.92 | 4.21 | 4.06 / 3.69 / 3.39 | 4.93 / 4.66 / 4.34 |
| ld-3/float-eye | 2.60 | 2.13 | 2.12 / 1.86 / 1.71 | 2.66 / 2.38 / 2.15 |
| ld-8/green-jelly | 3.28 | 2.51 | 2.51 / 2.19 / 1.97 | 3.24 / 2.87 / 2.57 |
| ld-16/death-beholder | 7.06 | 4.37 | 4.27 / 3.73 / 3.38 | 5.25 / 4.77 / 4.40 |

(Every fight is in `axiomancer-mechanics/sandbox-results/elementalist/table.md`.)

**Why numbers alone do not reach the targets.** On the first door
(bw-17, even), as voted, the foe's VITAE went to INFERNO 39, STORM 22, then
P-02 21, P-01 15, P-05 12, P-07 11, P-10 11, P-04 7 (100 runs): the weather is
45% of the kill, and no single card is more than a sixth of it (taking any one
card's numbers to 1 adds at most 0.4 turns). Trials at 60 to 100 runs a cell:

| Trial (test deck) | Float-Eye | Green Jelly | Death Beholder |
|---|---|---|---|
| as voted | 2.04 | 2.51 | 3.73 |
| every DEAL at 60% | 2.35 | 2.88 | 4.21 |
| every DEAL at 45% | 2.50 | 3.07 | 4.43 |
| every DEAL, INFERNO and STORM number at 55% | 2.56 | 3.20 | 4.60 |
| the same at 35% | 3.01 | 3.66 | 5.11 |
| the same at 25% (FREE DEAL 5 becomes 1) | 3.30 | 3.90 | 5.49 |
| the same at 25%, and every DRAW 2 as DRAW 1 | 3.38 | 4.08 | 5.70 |

Even with the cards gutted the Death Beholder falls in under 6 turns. What
numbers cannot touch: the STORM grows by 1 every foe turn on its own (a STORM 1
put up on turn 1 takes 1 + 2 + 3 + 4 + 5 = 15 over five foe turns), E-07's PAID
line puts up STORM equal to the hand (4 to 6), the Globals add a STORM every
turn, every card in hand is played every turn (FREE when no die), DRAW keeps the
hand above five, and FROZEN doubles. In the adjusted set the STORM is the
biggest source on the door (43 VITAE a fight, up from 20 as voted, because
fights run longer). Reaching 5 and 7 turns is a revisions-step question about
the STORM's growth, E-07, and the FREE lines' budget, not a number tweak.

## INFERNO self-damage and self-kills

| deck | numbers | your INFERNO / fight (Float-Eye / Green Jelly / Death Beholder) | foe hits / fight (same) | self-kills |
|---|---|---|---|---|
| test 20 | voted | 1.17 / 2.08 / 4.59 | 0.95 / 2.64 / 14.51 | 0 of 23,400 fights |
| test 20 | adjusted | 1.24 / 1.96 / 3.40 | 1.56 / 4.40 / 17.68 | 0 |
| all 30 | voted | 0.90 / 1.70 / 4.00 | 1.28 / 3.37 / 15.95 | 0 |
| all 30 | adjusted | 1.11 / 1.64 / 3.01 | 2.26 / 5.79 / 19.01 | 0 |

The witness holds a FREE line worth less than nothing (an INFERNO that would
burn you to death, say), and **it never had to**: no card was ever held at a
phase end. No card self-kills in normal play, so no adjustment was needed for
it. The burn stays small because the player's VITAE is large next to the foe's
(194 against 129 on the first door) and fights are short.

## FROZEN

| deck | numbers | FROZEN on foe turns (all / Float-Eye / Green Jelly / Death Beholder) | DEALs doubled per fight (Float-Eye / Green Jelly / Death Beholder) |
|---|---|---|---|
| test 20 | voted | 11% / 18% / 9% / 1% | 0.19 / 0.13 / 0.03 |
| test 20 | adjusted | 12% / 18% / 9% / 2% | 0.29 / 0.19 / 0.06 |
| all 30 | voted | 11% / 17% / 8% / 3% | 0.18 / 0.13 / 0.09 |
| all 30 | adjusted | 13% / 17% / 10% / 5% | 0.29 / 0.22 / 0.19 |

FROZEN is a Float-Eye event: the door's hits outgrow any BLIZZARD the deck puts
up. BLIZZARD itself takes 3.9 / 6.9 / 17.5 off the foe's hits a fight as voted
(7.1 / 12.8 / 31.2 adjusted).

## Each card's play rate (all 30, as voted; share of the card's draws)

| Card | Colour | PAID | FREE | Card | Colour | PAID | FREE |
|---|---|---|---|---|---|---|---|
| P-01 | red | 30% | 54% | E-06 | red | 18% | 65% |
| P-02 | red | 56% | 37% | E-07 | blue | 50% | 38% |
| P-03 | blue | 15% | 68% | E-08 | purple | 13% | 73% |
| P-04 | red | 14% | 73% | E-09 | purple | 31% | 60% |
| P-05 | red | **0%** | 88% | E-10 | blue | 14% | 65% |
| P-06 | blue | 29% | 54% | M-01 | blue | **4%** | 76% |
| P-07 | red | 37% | 53% | M-02 | blue | **2%** | 77% |
| P-08 | purple | 31% | 56% | M-03 | blue | 27% | 54% |
| P-09 | red | 33% | 53% | M-04 | purple | 38% | 52% |
| P-10 | red | 26% | 71% | M-05 | blue | 11% | 72% |
| E-01 | purple | 28% | 57% | M-06 | blue | 21% | 62% |
| E-02 | red | 38% | 50% | M-07 | purple | **5%** | 75% |
| E-03 | purple | 27% | 58% | M-08 | purple | 50% | 43% |
| E-04 | purple | 29% | 58% | M-09 | blue | 14% | 71% |
| E-05 | purple | 26% | 60% | M-10 | blue | 35% | 54% |

The rest of a draw is the fight ending with the card still in hand. With the
adjustments: M-07 PAID 5% to 21%, P-04 PAID 14% to 6% (its DEAL halved, its
BLIZZARD cost unchanged); the rest move a few points. Test-deck rates are in
`sandbox-results/elementalist/voted.md` and `adjusted.md`.

**Dead cards: none.** Near-dead PAID lines:

- **P-05 PAID, 0%**: "Trigger the foe's STORM" (the foe loses its STORM) is
  dominated by the card's own FREE line ("STORM 1; DEAL equal to the foe's
  STORM": one more STORM, and a DEAL that FROZEN can double). No printed number
  on the PAID line to change; a structure question for T.
- **M-02 PAID, 2%, and M-01 PAID, 4%**: heals, and the Act 1 fights barely hurt
  this deck (p10 above 0.9), so a HEAL rarely has VITAE to restore. A number
  change would not revive them in these fights; left as voted.
- **M-07 PAID, 5%**: VULNERABLE +5% per STORM is small next to a STORM 2 FREE
  line. Adjusted (below): 21%.

## The adjustments

T authorised "minor adjustments to the cards' values": printed numbers only,
for fights far from the targets, dead cards, or INFERNO self-kills. The fights
were the only trigger that fired, plus one near-dead PAID line. The set halves
the DEAL and INFERNO numbers (rounded) and trims the STORM numbers above 1,
which keeps T's ratios between cards; defence (GUARD, HEAL, BLIZZARD), DRAW,
the caps and the derived numbers are untouched. **This is more than minor**, and
it still leaves the Green Jelly and the Death Beholder short of their targets
(see "Why numbers alone do not reach the targets"); T may prefer the as-voted
numbers and a structural answer at revisions.

| Card | Line | Before → after | Why |
|---|---|---|---|
| P-01 | FREE DEAL | 5 → 3 | fights about twice as fast as the targets |
| P-01 | PAID DEAL | 8 → 4 | same |
| P-02 | FREE DEAL | 6 → 3 | same |
| P-02 | PAID DEAL | 18 → 9 | same |
| P-02 | PAID INFERNO | 8 → 4 | same |
| P-04 | FREE DEAL | 3 → 2 | same |
| P-04 | PAID DEAL | 6 → 3 | same |
| P-07 | FREE DEAL | 5 → 3 | same |
| P-07 | FREE INFERNO | 2 → 1 | same |
| P-07 | PAID DEAL | 10 → 5 | same |
| P-07 | PAID INFERNO | 4 → 2 | same |
| P-09 | FREE DEAL | 4 → 2 | same |
| P-09 | PAID DEAL | 8 → 4 | same |
| P-10 | Global DEAL | 5 → 3 | same |
| E-01 | FREE INFERNO | 3 → 2 | same |
| E-01 | PAID INFERNO | 8 → 4 | same |
| E-02 | FREE DEAL | 5 → 3 | same |
| E-02 | PAID DEAL | 8 → 4 | same |
| E-05 | PAID STORM | 3 → 2 | same |
| E-08 | FREE INFERNO | 2 → 1 | same |
| M-07 | FREE STORM | 2 → 1 | same |
| M-07 | PAID VULNERABLE per STORM | +5% → +10% | PAID line near-dead (5% of draws): 21% after |

The table is `axiomancer-mechanics/src/Cards/sandbox/elementalist.adjustments.ts`;
T's numbers as voted are `AS_VOTED` in `src/Cards/sandbox/elementalist.cards.ts`.

## What is approximate or not modelled

- **The witness is not the plain greedy one.** The live greedy witness ranks a
  program card by its printed damage preview, which is 0 for every program
  card, so it plays them in hand order (that is how Blood Price is measured).
  For the Elementalist cards only, the witness reads the program system's own
  value estimate: a die goes to the card whose PAID line gains most over its
  FREE line, and the FREE drain plays the best FREE line first and holds one
  worth less than nothing. The estimate's weights (a three-round horizon for the
  weather, DRAW worth 3, FROZEN worth 6) are mine. Grey and Blood Price are
  measured unchanged.
- **FROZEN check:** at the start of the foe's turn, against the hits it is about
  to make (after the escalation clock and stage bonus, before GUARD): FROZEN
  when the BLIZZARD is at least every hit. A foe turn with no hit (a status-only
  threat, or a denied turn) never freezes.
- **Drift:** read as "a stack that was up when the round began drops by 1 when
  the round ends". A re-application tops the stack up but does not reset its
  drift. Each INFERNO stack (both-sides, foe-only, on-you) drifts on its own.
- **"Your INFERNO"** is half the both-sides INFERNO (rounded down) plus any
  INFERNO on you alone (no kept card puts INFERNO on you alone). "Remove your
  INFERNO" (M-01, Steam) turns the both-sides stack into a foe-only stack: you
  stop burning, the foe keeps its INFERNO. M-09 FREE moves half your INFERNO
  (rounded down) the same way and adds that much foe-only INFERNO.
- **Timing at your turn start:** your INFERNO burns first, then the ⟳ Globals
  fire. A Global's BLIZZARD or INFERNO applied at your turn start counts as
  applied that round.
- **P-05 PAID** "trigger the foe's STORM": the foe takes its STORM now and the
  STORM does not grow (open for revisions, per the ledger).
- **E-06** (Global, "the STORM grows by 1 extra"): read as a static while in
  play, so the STORM grows by 2 a foe turn (3 with two copies). A FREE E-06 is
  in play for 3 turn starts, as every FREE Global.
- **E-07 PAID** STORM equal to the hand after the DRAW (the played card is out
  of the hand). **E-10 PAID** swap: the witness picks the pair by a heuristic;
  an INFERNO swapped in keeps the both-sides / foe-only split it had.
- **Derived numbers are unscaled** ("GUARD equal to the foe's BLIZZARD", "+ your
  INFERNO", "DEAL equal to the STORM"), as the live system treats an
  already-resolved number. "Doubled" on P-01 and M-06 doubles the printed
  number before stat scaling.
- **INFERNO, BLIZZARD and STORM are unscaled; DEAL scales with body, GUARD and
  HEAL with mind, VULNERABLE with heart** (placeholders for revisions). The
  colours are the placeholder table above.
- **No upgrades:** the cards have no upgrade paths, so there is no
  Elementalist+half column. The relic and its signature skill do not exist yet
  and are not modelled; the signatures that exist (The Open Hand, Crimson
  Covenant) are available to the witness as in every measured deck.
- **DRAW** draws from the draw pile, reshuffling the discard when it runs out,
  with no hand limit; a DRAW with both empty draws nothing.
- **Names** are placeholders ("Elementalist P-01"); card names are T's (D99).
- The per-foe means average every ledger fight and spread equally.

## Files (branch `sandbox/elementalist-sims`)

- `axiomancer-mechanics/src/Combat/combat.elements.ts`: the weather state, drift, sim telemetry
- `axiomancer-mechanics/src/Combat/combat.card-program.ts`, `combat.engine.ts`, `src/Cards/card-program.types.ts`: the sandbox verbs and the four hooks
- `axiomancer-mechanics/src/Combat/combat.encounter.sim.ts`: the Elementalist witness
- `axiomancer-mechanics/src/Cards/sandbox/elementalist.cards.ts`, `elementalist.adjustments.ts`: the 30 cards, the colour table, the test deck, the adjustments
- `axiomancer-mechanics/src/Combat/e2e/elementalist.sandbox.engine.test.ts`: the rules pinned
- `axiomancer-mechanics/src/CLI/elementalist-sim.cli.ts`: the harness (`--numbers=voted|adjusted`, `--baseline`)
- `axiomancer-mechanics/sandbox-results/elementalist/`: raw results (`voted.json`, `adjusted.json`), summaries (`voted.md`, `adjusted.md`, `table.md`) and the tuning aids (`summarize.mjs`, `table.mjs`, `trial.mjs`, `probe.ts`, `trials/`)
