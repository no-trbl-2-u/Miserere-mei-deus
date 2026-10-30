# The Merciful sims (lane-creator step 6)

> Step 6 of `docs/lane-creator.md` for the Merciful (`rehearsal-merciful.md` on
> `origin/main` at `8f35a2c93`: the "As kept, with T's notes applied" table,
> then "Rulings after the vote", which overrides anything earlier, and
> Session 0): the 29 kept cards simulated against the Act 1 fights, so the
> revisions session (step 7) has real numbers. A measurement, not a gate (D57).
> Sandbox only: this file lives on branch `sandbox/merciful-sims`, which never
> merges and has no PR. Run 2026-10-30 from `origin/main` at `8f35a2c93`, 300
> seeded runs per cell, seed 1.

## Headline

- **The Merciful is the slowest lane after grey, and the 29 cards land closest
  to T's pace targets of any lane.** The session's 20-card test deck takes
  **2.17 turns** on Float-Eye (target about 3), **2.76** on the Green Jelly
  (about 5) and **4.31** on the Death Beholder (about 7). All 29 cards: **2.76 /
  3.55 / 5.98**. On this branch grey runs 2.86 / 3.77 / 6.29, Blood Price 2.04 /
  2.46 / 3.59, the Elementalist 2.67 / 3.22 / 4.44, the Defender (live test
  deck) 2.57 / 3.03 / 4.04.
- **It wins every cell and is hit harder than the other lanes**: 100% in all
  234 cells of both decks; lowest-VITAE p10 0.95 / 0.91 / 0.79 (test deck,
  mean; lowest cell 0.74), 0.94 / 0.89 / 0.73 (29 cards; lowest 0.66). It takes
  9.2 / 20.1 / 74.6 VITAE a fight from the foe (29: 8.6 / 22.4 / 93.8): about
  twice the Defender (5.9 / 12.2 / 34.9), half of grey (11.0 / 33.5 / 135.3).
- **MERCY bursts do half the killing.** Of the foe's VITAE (its start VITAE
  plus every heal on it), the test deck's bursts take 52% / 51% / 45%, plain
  DEAL 41% / 40% / 44%, RADIANCE only 8% / 9% / 11% (29 cards: bursts 51 / 51 /
  46%, RADIANCE 8 / 10 / 14%, LEECH 2%). MERCY gives the foe back 11.8 / 18.7 /
  51.9 VITAE a fight for that (29: 12.1 / 19.0 / 51.5).
- **MERCY bursts in almost every fight, mostly early.** It is applied in 100% of
  fights; only 9.8% of them end before it ever bursts (12% / 5% / 1% by foe;
  29 cards 8.0%). Bursts a fight 0.93 / 1.17 / 1.97, two thirds of them early
  (P-03b, P-05a) rather than on the clock. Burst DEAL median / p90 / max:
  50 / 80 / 260, 48 / 82 / 252, **56 / 111 / 406** on the door (29 cards: max
  176 / 348 / 394).
- **RADIANCE whiffs a lot.** 35% / 27% / 16% of RADIANCE resolutions heal 0 (the
  player is at full VITAE) in the test deck, and 29% of all RADIANCE heal is
  lost to full VITAE; in the 29 cards 55% / 42% / 24% whiff (half the heal lost).
  P-01 PAID is near-dead (10 to 11% of draws).
- **The runaways are the early bursts and "all you healed this turn".**
  Single-resolution max: P-05a PAID three-times burst **261** (29: 369), P-05a
  FREE's tick running the clock out 328 (388), P-03b PAID MERCY 15 then burst
  260 (210), M-05c PAID HEAL to full 109 (195), P-08b's MERCY 105 (181), P-07b
  PAID DEAL 98 (110), E-06a PAID's RADIANCE DEAL in a turn 84 (74), E-03b
  PAID's extra VITAE healed in a turn 61 (52). Taking P-03 and P-05 out of the
  test deck pushes the door's burst max to **694**: MERCY then piles up through
  P-08b and M-05c and bursts on the clock.
- **No card is dead on both lines; several PAID lines are near-dead** (under
  12% of draws, value witness): E-03b (5 to 9%), E-06a (8 to 10%), P-08b (7 to
  12%), E-01b (9 to 13%), P-01a (10 to 11%), M-04b (8%), P-09c (11%). M-04b's
  "clear a debuff" never fired: no Act 1 foe puts a debuff on you.
- **Cutting the early bursts slows the deck a little and trims the spikes**:
  P-03b PAID MERCY 15 to 8 and P-05a PAID three times to twice takes the test
  deck to 2.48 / 3.03 / 4.46 turns; adding M-05c PAID +12 to +6 and E-03b PAID
  three times to twice brings the door's burst max from 406 to 280. The
  suggested changes (below) are for the revisions; none is applied to the ledger.

## The setup

- **Measured the way the measured-truth report measures a lane**
  (`combat.measured-truth.ts`, `docs/reports/measured/latest.md`): the Act 1
  ledger fights (39 on today's ledger: 29 Float-Eye, 6 Green Jelly, 4 Death
  Beholder doors; the brief's "26" is the older ledger), the player at the
  level a full clear brings to each, the three stat spreads (even, body-mind,
  body), 300 runs per cell, the greedy witness. The harness is
  `axiomancer-mechanics/src/CLI/merciful-sim.cli.ts`.
- **The live lanes are untouched.** The harness re-measured grey, Blood Price
  and the Elementalist on this branch: **all 351 of their cells are identical**
  (win rate, mean turns, p10) to the last line of
  `docs/reports/measured/history.jsonl` (measured at `3993f2a`; no mechanics
  source changed between it and `8f35a2c93`). The Defender is live in main
  (DF1d) but not in the report; its 117 cells on this branch are identical to
  the same measurement on unmodified `origin/main` at `8f35a2c93`.
- **Two decks**: `merciful-test`, the session's 20-card test deck (below), and
  `merciful-29`, all 29 kept cards and nothing else (the Defender's 30-card
  deck was its 30 cards alone, with no grey base, so this one has none either).
- **The witness.** As in the Defender's and the Elementalist's sims, for the
  Merciful cards only the witness reads the program system's value estimate: a
  die goes to the card whose PAID line gains most over its FREE line, and the
  FREE drain plays the best FREE line first and holds one worth less than
  nothing. The plain hand-order witness was also run
  (`sandbox-results/merciful/voted-plain.md`): **2.51 / 3.06 / 4.63 turns** (29
  cards: 3.05 / 3.85 / 6.26), 100% wins, door p10 0.75 (0.66). Either witness
  reads the same story.
- **The prototype**: the cards are programs on the live program system
  (`card-program.types.ts`, `combat.card-program.ts`) with sandbox-only verbs
  (`radiance`, `mercy`, `burstMercy`, `tickMercy`, `healsPlus`, `healsTimes`,
  `nextHealRadiance`, `allHealsRadianceDouble`, `maxVitae`, `healToFull`,
  `clearDebuffs`, `weakenNextAttack`, `returnMercyCards`), the Merciful state on
  the program ledger (`combat.merciful.ts`), and two engine hooks in
  `combat.engine.ts`: the MERCY clock at the start of the foe's turn (after
  LEECH and the weather), and M-08a's cut to the foe's next attack. SACRIFICE
  and LEECH are Blood Price's live verbs. The cards are registered through the
  sandbox card registry (`src/Cards/sandbox/merciful.cards.ts`), not
  `TRIAL_SETS`.
- **The test**: `src/Combat/e2e/merciful.sandbox.engine.test.ts` (11 tests)
  pins RADIANCE (heal then DEAL what it restored, 0 at full VITAE, VULNERABLE
  applies), MERCY (the heal, overheal into the total, the 3-turn clock that a
  new MERCY does not reset, the burst for twice the total, the clear and the
  fresh clock), P-03b PAID (MERCY 15, the burst now, EXILE), P-05a (the tick,
  the three-times burst), E-03b, E-06a, M-08a and M-09c. It passes, as do the
  whole Combat and Cards suites (81 files, 1,107 tests, the measured-truth test
  among them).

### The rules as simulated (T's rulings)

- **RADIANCE N**: HEAL N, then DEAL what that heal actually restored (0 at full
  VITAE). The hit is a DEAL: VULNERABLE boosts it, FROZEN doubles it, a pending
  "+n to your next DEAL" (Crimson Pact's) rides on it.
- **MERCY N on the foe**: heal the foe N, capped at its max; the excess past its
  max adds to its MERCY total (no separate burst); then N adds to the total.
  The first MERCY starts a 3-turn clock; a new MERCY adds and leaves the clock.
  When the clock runs out, at the start of the foe's turn, MERCY **bursts**: the
  foe takes a DEAL of twice the total (VULNERABLE boosts it, FROZEN doubles it).
  The total clears to 0; the next MERCY starts a fresh clock.
- **Heart scales MERCY and RADIANCE** the way it scales THORNS and LEECH in the
  engine: `scaleFor(n, stats, 'heart', 'repeating')`, applied when played.
- **P-03b PAID**: MERCY 15 first, then the burst (the normal twice the total).
- **Spells** (P-03b, P-05a, E-03b, E-06a, M-05c): the PAID line EXILEs (D103).
  **Globals** (P-10c, E-09b, M-06c): start-of-turn trigger; FREE in play 3 turn
  starts, PAID for the rest of combat (the live Global rules).
- **Not modelled**: HURRY N and YIELDING (no kept card prints HURRY; M-02b's
  YIELDING is a befriend, not combat damage, so only its MERCY is modelled),
  the relics (the Suppliant's Ring and the two to pick), E-09's overheal-draw
  card (not yet a card).

### Modelling assumptions (the plainest reading; T to confirm)

1. **The clock counts foe-turn starts, the coming one included.** A MERCY played
   with no clock sets it to 3; it bursts at the start of the third foe turn
   from then (your turn, foe, your turn, foe, your turn, burst). T's "1 turn
   left" is the very next foe turn.
2. **MERCY on a foe at full adds 2N** (N for the MERCY, N again as overheal),
   the brief's literal reading. This is 6 to 8 MERCY a fight, about a quarter
   of the MERCY added on Float-Eye, where most MERCY lands on a full foe.
3. **"Bursts now" / "runs out now"** (P-03b PAID, P-05a PAID) bursts at once, on
   your turn; **P-05a FREE ticking the clock to 0** also bursts at once (the
   clock ran out).
4. **The foe has no GUARD in this engine**, so the burst's "GUARD blocks it" never
   applies. The burst is unscaled (twice the total as it stands).
5. **Derived numbers are unscaled**: P-08b's MERCY (all you healed this turn),
   P-06a/c (the foe's MERCY), P-07b's DEAL, P-09c's GUARD and its "+1 per 5",
   E-03b's +3. RADIANCE's HEAL is heart-scaled (not mind); a plain HEAL stays
   mind-scaled.
6. **E-03b** changes your HEALs and RADIANCE heals for the rest of the turn
   (times, then plus); not MERCY (that heals the foe) nor LEECH's heal (the
   foe's turn).
7. **E-06a FREE** turns the next plain HEAL into RADIANCE (a printed RADIANCE does
   not use it up). **E-06a PAID**: every HEAL is RADIANCE and every RADIANCE
   that turn, printed or converted, deals double.
8. **"All you healed this turn"** counts every heal on your turn, the turn-start
   Globals included.
9. **M-05c** raises max VITAE only (current VITAE stays); its PAID "HEAL to full"
   is a HEAL, so E-03b and E-06a apply to it.
10. **M-06c's "below half"** is strictly under half. **M-10c's "at max VITAE"** is
    the foe at its max.
11. **M-08a** takes n off the foe's next attack, from its strikes in order, before
    GUARD; a foe that does not attack keeps it for the next attack.
12. **M-09c's "MERCY card"** is a card whose played line gave MERCY; it returns
    the most recent ones still in your discard (an EXILEd one is skipped), and a
    returned card counts as drawn for the play rates.
13. **Colours** (dice that pay) are the session's provisional even split per
    sub-lane (T splits them at the revisions, D110): red P-01 P-04 P-06a P-07
    E-04 E-07 E-10 M-04 M-07 M-10; blue P-02 P-06c P-08 P-09 E-01 E-03 E-09
    M-01 M-06 M-09; purple P-03 P-05 P-10 E-02 E-06 E-08 M-02 M-05 M-08.
14. **The witness's weights are mine**: a burst one foe turn further off is
    worth 0.8 times; E-03b and E-06a are valued by the heal cards in hand,
    capped at the VITAE you are missing; M-08a at the coming hit. Grey, Blood
    Price, the Elementalist and the Defender are measured unchanged.

## The test deck (the session's pick, not T's)

T picks the test deck at the revisions. Shaped as T shaped the Defender's: every
Global and every Spell, each payoff with its setup, no copies, 7 red, 6 blue,
7 purple:

| Colour | Cards |
|---|---|
| red | P-01, P-04, P-06a, P-07, E-04, M-07, M-10 |
| blue | P-08, E-01, E-03, E-09, M-06, M-09 |
| purple | P-03, P-05, P-10, E-02, E-06, E-08, M-05 |

Left out: P-02, P-06c, P-09, E-07, E-10, M-01, M-02, M-04, M-08 (measured in the
29-card deck).

## Fight length per foe against T's targets

Mean player turns to the end, averaged over every ledger fight of the foe and
the three spreads. The four live lanes measured on this branch (identical to
`history.jsonl` at `3993f2a`, and the Defender to unmodified main).

| foe | T's target | grey | Blood Price | Elementalist | Defender | Merciful 20 | Merciful 29 |
|---|---|---|---|---|---|---|---|
| Float-Eye | about 3 | 2.86 | 2.04 | 2.67 | 2.57 | **2.17** | 2.76 |
| Green Jelly | about 5 | 3.77 | 2.46 | 3.22 | 3.03 | **2.76** | 3.55 |
| Death Beholder | about 7 | 6.29 | 3.59 | 4.44 | 4.04 | **4.31** | 5.98 |

The doors (even spread): bw-k2 4.09 (29: 5.68), cw-17 4.01 (5.60), bc-15 4.21
(5.84), ld-16 4.40 (6.11). Every fight and spread, with win rate and p10 for
all six decks, is in `axiomancer-mechanics/sandbox-results/merciful/table.md`.

The 29-card deck is slower than the test deck because it carries more cards
that do not hit (P-06c, P-09, M-01, M-02, M-08) and dilutes P-03 and P-05.

## Win rate, VITAE and the kill's split

Test deck (20), per fight, averaged over the foe's ledger fights and spreads.
Shares are of the foe VITAE taken (its start VITAE plus every heal on it):

| foe | turns | win | p10 (lowest) | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | MERCY healed the foe | overheal into MERCY |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.17 | 100% | 0.95 | 9.2 | 1.7 | 62.2 | 25.4 (41%) | 4.7 (8%) | 32.1 (52%) | 11.8 | 7.2 |
| Green Jelly | 2.76 | 100% | 0.91 | 20.1 | 2.5 | 94.7 | 37.5 (40%) | 8.8 (9%) | 48.3 (51%) | 18.7 | 7.2 |
| Death Beholder | 4.31 | 100% | 0.79 | 74.6 | 4.5 | 230.8 | 102.1 (44%) | 25.4 (11%) | 103.3 (45%) | 51.9 | 7.7 |

29-card deck (LEECH, from E-07, is the other 2%):

| foe | turns | win | p10 (lowest) | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | MERCY healed the foe | overheal into MERCY |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.76 | 100% | 0.94 | 8.6 | 1.7 | 62.5 | 24.8 (40%) | 4.7 (8%) | 31.9 (51%) | 12.1 | 6.0 |
| Green Jelly | 3.55 | 100% | 0.89 | 22.4 | 2.2 | 95.0 | 34.6 (36%) | 10.0 (10%) | 48.6 (51%) | 19.0 | 6.0 |
| Death Beholder | 5.98 | 100% | 0.73 | 93.8 | 4.1 | 236.1 | 88.9 (38%) | 34.0 (14%) | 108.4 (46%) | 51.5 | 6.2 |

VITAE taken from you per fight for comparison (Float-Eye / Green Jelly / Death
Beholder): grey 11.0 / 33.5 / 135.3, Blood Price 3.1 / 7.2 / 27.4, the
Elementalist 2.7 / 6.1 / 16.7, the Defender 5.9 / 12.2 / 34.9. The Merciful is
hit two to three times as hard as the Defender and heals it back (12.6 / 23.4 /
67.2 VITAE healed a fight in the test deck), which is what RADIANCE wants. No
VULNERABLE in the lane, so "VULNERABLE added" is 0.

## MERCY: bursts, sizes and the clock

| deck | foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on |
|---|---|---|---|---|---|---|---|
| test 20 | Float-Eye | 0.93 (0.29 / 0.64) | 50 / 80 / 260 | 24 / 40 / 130 | 24 / 40 / 130 | 12% | 24% |
| test 20 | Green Jelly | 1.17 (0.40 / 0.77) | 48 / 82 / 252 | 23 / 41 / 126 | 28 / 42 / 126 | 5% | 42% |
| test 20 | Death Beholder | 1.97 (0.80 / 1.18) | 56 / 111 / 406 | 27 / 54 / 203 | 39 / 68 / 203 | 1% | 44% |
| all 29 | Float-Eye | 1.00 (0.35 / 0.65) | 42 / 74 / 176 | 20 / 37 / 88 | 21 / 37 / 88 | 10% | 27% |
| all 29 | Green Jelly | 1.30 (0.48 / 0.82) | 42 / 76 / 348 | 20 / 38 / 174 | 24 / 40 / 174 | 3% | 42% |
| all 29 | Death Beholder | 2.44 (1.18 / 1.27) | 44 / 90 / 394 | 22 / 44 / 197 | 33 / 56 / 197 | 0% | 42% |

MERCY is applied in every fight (100% of fights in both decks). Across all
cells **9.8% of fights end before MERCY ever bursts** (29 cards: 8.0%), almost
all of them short Float-Eye fights. Two thirds of the bursts are early (P-03b
PAID, P-05a PAID or its FREE tick), so the clock rarely gets to be the threat
the fantasy wants; 24 to 44% of fights end with an unburst MERCY still on the
foe, which is VITAE handed to it for nothing. MERCY's heal is a real cost:
11.8 / 18.7 / 51.9 foe VITAE a fight, against bursts of 32.1 / 48.3 / 103.3.

## RADIANCE's whiffs

| deck | foe | RADIANCE / fight | whiffs (healed 0) | heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |
|---|---|---|---|---|---|
| test 20 | Float-Eye | 1.70 | 35% | 37% | 0.08 |
| test 20 | Green Jelly | 2.65 | 27% | 27% | 0.13 |
| test 20 | Death Beholder | 5.53 | 16% | 17% | 0.31 |
| all 29 | Float-Eye | 2.76 | 55% | 63% | 0.06 |
| all 29 | Green Jelly | 4.01 | 42% | 46% | 0.10 |
| all 29 | Death Beholder | 8.27 | 24% | 24% | 0.28 |

Over all cells, 28% of the test deck's RADIANCE resolutions whiff (29% of its
heal lost); 45% in the 29 cards (50% lost), which carry more RADIANCE (P-02,
M-04) and P-10c's start-of-turn RADIANCE 5, which fires whether or not you are hurt.
The witness plays a FREE RADIANCE worth 0 rather than hold it, as a hurried
player would; holding it would cut the whiffs, not raise RADIANCE's share much.
E-04b's SACRIFICE (1.7 to 4.5 VITAE a fight) is the lane's only way to make
room on purpose.

## Runaway numbers

One number per resolution (a turn for E-03b and E-06a), median / p90 / max:

| line | test 20, all foes | test 20, door | all 29, all foes | all 29, door |
|---|---|---|---|---|
| P-05a PAID: three-times burst | 36 / 72 / 261 | 45 / 99 / 261 | 24 / 60 / 369 | 30 / 87 / 369 |
| P-05a FREE: its tick ran the clock out (twice the total) | 46 / 98 / 328 | 72 / 128 / 328 | 34 / 60 / 388 | 42 / 84 / 388 |
| P-03b PAID: MERCY 15 then burst | 60 / 88 / 260 | 60 / 100 / 220 | 56 / 86 / 210 | 52 / 90 / 210 |
| E-03b PAID: extra VITAE healed that turn | 6 / 14 / 61 | 8 / 17 / 61 | 8 / 19 / 52 | 10 / 22 / 52 |
| E-03b FREE: extra VITAE healed that turn | 0 / 3 / 15 | 3 / 6 / 15 | 0 / 3 / 15 | 1 / 6 / 15 |
| E-06a PAID: RADIANCE DEAL that turn | 10 / 24 / 84 | 14 / 32 / 84 | 8 / 18 / 74 | 12 / 24 / 74 |
| E-06a FREE: the converted HEAL's DEAL | 3 / 6 / 9 | 3 / 8 / 9 | 3 / 4 / 6 | 3 / 6 / 6 |
| P-07b PAID: DEAL of all you healed this turn | 16 / 32 / 98 | 24 / 44 / 98 | 16 / 29 / 110 | 22 / 38 / 110 |
| P-07b FREE: the same | 6 / 18 / 92 | 12 / 28 / 92 | 4 / 15 / 128 | 9 / 24 / 128 |
| M-05c PAID: HEAL to full | 12 / 27 / 109 | 24 / 45 / 109 | 12 / 23 / 195 | 21 / 50 / 195 |
| P-08b FREE: MERCY added (all you healed this turn) | 10 / 27 / 105 | 16 / 33 / 105 | 7 / 23 / 181 | 12 / 28 / 181 |
| P-08b PAID: the same | 13 / 23 / 76 | 16 / 27 / 76 | 13 / 22 / 49 | 15 / 26 / 49 |

- **The early bursts are the biggest hits in the game**: a P-05a PAID on a
  MERCY of 87 to 123 is a 261 to 369 DEAL, more than a door's VITAE. P-03b PAID
  is the deck's biggest card (PAID on 48 to 60% of its draws, about 20 foe
  VITAE a fight at once).
- **"All you healed this turn" chains**: M-05c PAID (max VITAE +12, HEAL to full,
  up to 195 in one heal) feeds P-07b's DEAL (up to 128) and P-08b's MERCY (up to
  181, then twice that as a burst). E-03b PAID and E-06a PAID multiply the same
  turn's heals. Without P-03 and P-05 in the test deck (P-03, P-05 swapped for
  M-01, M-08) MERCY is no longer popped early, piles up through P-08b, and the
  door's biggest burst is 694.

## Each card's play rate (share of the card's draws)

Value witness. The rest of a draw is the card held, or the fight ending first;
a card M-09c returned counts as drawn again. "Swing" is the foe VITAE the play
took at once, per fight (a MERCY card shows 0: its damage comes at the burst).

| Card | Colour | Type | PAID (29) | FREE (29) | PAID (20) | FREE (20) | PAID swing / fight (20) |
|---|---|---|---|---|---|---|---|
| P-01a | red | attack | **10%** | 74% | **11%** | 71% | 0.7 |
| P-02b | blue | skill | 46% | 46% | | | |
| P-03b | purple | spell | 60% | 33% | 48% | 43% | 19.8 |
| P-04a | red | attack | 43% | 47% | 29% | 58% | 5.6 |
| P-05a | purple | spell | 23% | 66% | 17% | 64% | 4.3 |
| P-06a | red | attack | 26% | 63% | 18% | 67% | 4.4 |
| P-06c | blue | skill | 26% | 64% | | | |
| P-07b | red | attack | 23% | 66% | 21% | 69% | 3.4 |
| P-08b | blue | skill | **7%** | 75% | **12%** | 67% | 0 |
| P-09c | blue | skill | **11%** | 73% | | | |
| P-10c | purple | global | 16% | 72% | 22% | 67% | 0 |
| E-01b | blue | skill | **9%** | 77% | **13%** | 70% | 0.1 |
| E-02c | purple | skill | 21% | 65% | 15% | 66% | 0 |
| E-03b | blue | spell | **5%** | 82% | **9%** | 72% | 0 |
| E-04b | red | skill | 25% | 63% | 22% | 62% | 0 |
| E-06a | purple | spell | **10%** | 74% | **8%** | 73% | 0 |
| E-07b | red | attack | 44% | 48% | | | |
| E-08b | purple | skill | 23% | 63% | 18% | 61% | 0.2 |
| E-09b | blue | global | 38% | 50% | 38% | 51% | 0 |
| E-10b | red | skill | 31% | 55% | | | |
| M-01b | blue | skill | 41% | 51% | | | |
| M-02b | purple | skill | 26% | 52% | | | |
| M-04b | red | skill | **8%** | 79% | | | |
| M-05c | purple | spell | 43% | 43% | 37% | 47% | 0 |
| M-06c | blue | global | 18% | 71% | 24% | 64% | 0 |
| M-07c | red | attack | 27% | 60% | 25% | 64% | 0.6 |
| M-08a | purple | skill | 29% | 58% | | | |
| M-09c | blue | skill | 19% | 66% | 13% | 67% | 0 |
| M-10c | red | attack | 28% | 49% | 26% | 47% | 3.5 |

**Near-dead lines (no card is dead on both lines; no FREE line is under 33%):**

- **E-03b PAID (5 to 9%) and E-06a PAID (8 to 10%)**: three-times or
  double-RADIANCE heals only pay with heals in hand and room to heal; their FREE
  lines take the play. When paid they are the runaways above.
- **P-08b PAID (7 to 12%)**: HEAL 6 over HEAL 3 for the same "MERCY equal to all
  you healed", rarely worth a die.
- **E-01b PAID (9 to 13%)**: HEAL 5 over HEAL 2 when the deck is often near full.
- **P-01a PAID (10 to 11%)**: RADIANCE 7 at full VITAE is 0; the die goes to a
  card that hits.
- **M-04b PAID (8%)**: no Act 1 foe puts a debuff on you, so "clear" never fired
  (0 debuffs cleared); it plays as RADIANCE 2 / 5.
- **P-09c PAID (11%)**: GUARD X needs VITAE missing, and the deck heals it back.
- **M-08a**: its "next attack deals n less" took 0.7 / 1.2 / 2.8 VITAE off the
  foe's hits a fight (29 cards); it is mostly played as MERCY 3 / 5.

## The adjustments pass (trials, not applied)

Test deck, value witness, 300 runs a cell (`sandbox-results/merciful/trials/`):

| trial | Float-Eye | Green Jelly | Death Beholder | door p10 | door burst p90 / max | P-03b PAID max | P-05a PAID max | M-05c HEAL to full max | P-07b PAID max | P-08b MERCY max | door DEAL / RADIANCE / burst |
|---|---|---|---|---|---|---|---|---|---|---|---|
| as kept | 2.17 | 2.76 | 4.31 | 0.79 | 111 / 406 | 260 | 261 | 109 | 98 | 105 | 44% / 11% / 45% |
| A: P-03b PAID MERCY 15 to 8, P-05a PAID three times to twice | 2.48 | 3.03 | 4.46 | 0.78 | 108 / 426 | 212 | 136 | 109 | 104 | 114 | 48% / 12% / 40% |
| B: A, and M-05c PAID +12 to +6, E-03b PAID three times to twice | 2.47 | 3.05 | 4.54 | 0.77 | 102 / 280 | 176 | 136 | 122 | 94 | 98 | 48% / 12% / 40% |
| P-03b, P-05a swapped for M-01b, M-08a | 3.08 | 3.36 | 5.07 | 0.78 | 126 / 694 | - | - | 125 | 114 | 206 | 56% / 13% / 32% |

Cutting the early bursts takes about 0.3 turns off the pace gap on Float-Eye and
the Jelly and halves P-05a's peak; it does not stop the biggest bursts, which
come from MERCY that P-08b and the heal chain pile up. Without the two
burst-now Spells the clock bursts carry it and the door's peak burst grows
(694). As with the other lanes, every card in hand is played every turn (FREE
with no die), so the test deck stays under T's 5 and 7; the 29 cards (5.98 on
the door) show that a deck with fewer hitters reaches the targets.

## Suggested changes (for the revisions; not applied to the ledger)

1. **P-03b PAID**: MERCY 15 to **8** (trial A). It is the deck's biggest card
   (PAID on half its draws, about 20 foe VITAE a fight at once), and the
   burst-now skips the clock the lane is built on.
2. **P-05a PAID**: "three times" to **twice** (trial A: its peak 261 to 136), or
   keep three times and drop "runs out now" so it only raises the coming burst.
3. **P-08b**: "MERCY equal to **half** all you healed this turn" (or "equal to
   this card's HEAL"). It is the MERCY runaway (up to 181 MERCY in one play, a
   362 burst), and the door's 694 when nothing pops MERCY early.
4. **M-05c PAID**: +12 max VITAE to **+6**, or "HEAL 12" instead of "HEAL to full"
   (up to 195 in one heal, which then feeds P-07b and P-08b).
5. **E-03b PAID**: three times to **twice** (trial B, with 4: door burst max 406 to
   280). It is rarely paid (5 to 9%) but is a runaway when it is.
6. **RADIANCE at full VITAE** (28 to 45% whiffs; P-01a PAID 10%; P-10c fires
   whether or not you are hurt): not a number. Options for T: more ways to make room (SACRIFICE on a
   payoff, as E-04b), or a rider ("if you are at full VITAE, DEAL n").
7. **MERCY on a full foe adds 2N** (assumption 2): about a quarter of the MERCY
   added on Float-Eye. If T meant "the excess replaces the heal", MERCY at full
   adds N; worth ruling before the trial set.
8. **E-01b PAID**: HEAL 5, DRAW 1 to **HEAL 5, DRAW 2**, so paying buys a card
   even at full VITAE (9 to 13% PAID). P-09c PAID can stay rare as a comeback
   line; P-08b PAID is covered by 3.
9. Not numbers (structure, for T): M-04b's debuff clear (no Act 1 foe
   debuffs you), M-08a (played as MERCY, its attack cut is small), and the unburst
   MERCY left on the foe at the end of 24 to 44% of fights (VITAE given away).

## What is approximate or not modelled

- **The witness** (above) is the Defender precedent's value witness for the
  Merciful cards; its weights are mine. Grey, Blood Price, the Elementalist and
  the Defender are measured unchanged.
- **Scaling**: the spreads keep Heart near 5 (neutral), so Heart's scaling of
  MERCY and RADIANCE barely moves these numbers.
- **The burst's DEAL** is twice the total after VULNERABLE and FROZEN, before
  the foe's VITAE cap (the sizes above are before the cap).
- **YIELDING, HURRY N, the relics and E-09's overheal-draw card** are not
  modelled; the existing signatures are available to the witness as in every
  measured deck.
- **No upgrades**: the cards have no upgrade paths. Names are placeholders
  ("Merciful P-01").
- The per-foe means average every ledger fight and spread equally.

## Files (branch `sandbox/merciful-sims`)

- `axiomancer-mechanics/src/Combat/combat.merciful.ts`: the Merciful state, the clock's constants, sim telemetry
- `axiomancer-mechanics/src/Combat/combat.card-program.ts`, `combat.engine.ts`, `src/Cards/card-program.types.ts`: the sandbox verbs and hooks
- `axiomancer-mechanics/src/Combat/combat.encounter.sim.ts`: the Merciful witness and the fight-end tally
- `axiomancer-mechanics/src/Cards/sandbox/merciful.cards.ts`: the 29 cards, the numbers table, the colours, the test deck
- `axiomancer-mechanics/src/Combat/e2e/merciful.sandbox.engine.test.ts`: the rules pinned
- `axiomancer-mechanics/src/CLI/merciful-sim.cli.ts`: the harness (`--numbers=voted|<file>.json`, `--witness=value|plain`, `--baseline`, `--deck=`)
- `axiomancer-mechanics/sandbox-results/merciful/`: raw results (`voted-value.json` with the four lanes' baseline, `voted-plain.json`), summaries (`voted-value.md`, `voted-plain.md`, `table.md`), the trials (`trials/`) and the tools (`summarize.mjs`, `table.mjs`, `trials.mjs`)
