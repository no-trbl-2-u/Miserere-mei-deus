# Merciful sims: voted, value witness, 300 runs, seed 1

## Fight length per foe (mean player turns to the end)

| foe | T's target | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|---|
| Float-Eye | about 3 | 2.86 | 2.04 | 2.67 | 2.57 | 2.17 | 2.76 |
| Green Jelly | about 5 | 3.77 | 2.46 | 3.22 | 3.03 | 2.76 | 3.55 |
| Death Beholder | about 7 | 6.29 | 3.59 | 4.44 | 4.04 | 4.31 | 5.98 |

Win rate and lowest-VITAE p10 (min over the foe's cells / mean):

| foe | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|
| Float-Eye | 100% min, p10 0.74 min / 0.91 mean | 100% min, p10 0.77 min / 0.87 mean | 100% min, p10 0.95 min / 0.97 mean | 100% min, p10 0.88 min / 0.93 mean | 100% min, p10 0.92 min / 0.95 mean | 100% min, p10 0.90 min / 0.94 mean |
| Green Jelly | 100% min, p10 0.25 min / 0.76 mean | 100% min, p10 0.69 min / 0.82 mean | 100% min, p10 0.90 min / 0.95 mean | 100% min, p10 0.79 min / 0.89 mean | 100% min, p10 0.84 min / 0.91 mean | 100% min, p10 0.81 min / 0.89 mean |
| Death Beholder | 35% min, p10 0.00 min / 0.27 mean | 100% min, p10 0.58 min / 0.69 mean | 100% min, p10 0.89 min / 0.91 mean | 100% min, p10 0.71 min / 0.76 mean | 100% min, p10 0.74 min / 0.79 mean | 100% min, p10 0.66 min / 0.73 mean |

VITAE the foe took from you per fight (mean):

| foe | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|
| Float-Eye | 11.0 | 3.1 | 2.7 | 5.9 | 9.2 | 8.6 |
| Green Jelly | 33.5 | 7.2 | 6.1 | 12.2 | 20.1 | 22.4 |
| Death Beholder | 135.3 | 27.4 | 16.7 | 34.9 | 74.6 | 93.8 |

## merciful-test

Per fight, averaged over the foe's ledger fights and spreads. Shares are of the foe VITAE taken (its start VITAE plus every heal on it).

| foe | turns | win | p10 | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | LEECH | other | MERCY healed the foe | overheal into MERCY | VULNERABLE added |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.17 | 100% | 0.95 | 9.2 | 1.7 | 62.2 | 25.4 (41%) | 4.7 (8%) | 32.1 (52%) | 0.0 (0%) | 0.0 (0%) | 11.8 | 7.2 | 0.0 |
| Green Jelly | 2.76 | 100% | 0.91 | 20.1 | 2.5 | 94.7 | 37.5 (40%) | 8.8 (9%) | 48.3 (51%) | 0.0 (0%) | 0.0 (0%) | 18.7 | 7.2 | 0.0 |
| Death Beholder | 4.31 | 100% | 0.79 | 74.6 | 4.5 | 230.8 | 102.1 (44%) | 25.4 (11%) | 103.3 (45%) | 0.0 (0%) | 0.0 (0%) | 51.9 | 7.7 | 0.0 |

MERCY and RADIANCE:

| foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on | RADIANCE / fight | RADIANCE whiffs (healed 0) | RADIANCE heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |
|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 0.93 (0.29 / 0.64) | 50 / 80 / 260 | 24 / 40 / 130 | 24 / 40 / 130 | 12% of 100% | 24% | 1.70 | 35% | 37% | 0.08 |
| Green Jelly | 1.17 (0.40 / 0.77) | 48 / 82 / 252 | 23 / 41 / 126 | 28 / 42 / 126 | 5% of 100% | 42% | 2.65 | 27% | 27% | 0.13 |
| Death Beholder | 1.97 (0.80 / 1.18) | 56 / 111 / 406 | 27 / 54 / 203 | 39 / 68 / 203 | 1% of 100% | 44% | 5.53 | 16% | 17% | 0.31 |

Other per-fight tallies: Float-Eye: healed 12.6, M-08 cut 0.00, M-09 returned 0.55, max VITAE added 4.11, debuffs cleared 0.00; Green Jelly: healed 23.4, M-08 cut 0.00, M-09 returned 0.76, max VITAE added 6.18, debuffs cleared 0.00; Death Beholder: healed 67.2, M-08 cut 0.00, M-09 returned 1.60, max VITAE added 10.08, debuffs cleared 0.00.

Runaway lines (one number per resolution; median / p90 / max, count):

| line | all foes | Death Beholder |
|---|---|---|
| E-03b FREE: extra VITAE healed that turn | 0 / 3 / 15 (5385) | 3 / 6 / 15 (806) |
| E-03b PAID: extra VITAE healed that turn | 6 / 14 / 61 (2017) | 8 / 17 / 61 (1259) |
| E-06a FREE: the converted HEAL's DEAL | 3 / 6 / 9 (601) | 3 / 8 / 9 (120) |
| E-06a PAID: RADIANCE DEAL that turn | 10 / 24 / 84 (1962) | 14 / 32 / 84 (797) |
| P-03 PAID: MERCY then burst now | 60 / 88 / 260 (17969) | 60 / 100 / 220 (2262) |
| P-05 FREE: the tick ran the clock out | 46 / 98 / 328 (2142) | 72 / 128 / 328 (735) |
| P-05 PAID: three-times burst | 36 / 72 / 261 (5096) | 45 / 99 / 261 (1233) |
| P-07 FREE: DEAL of all you healed this turn | 6 / 18 / 92 (14557) | 12 / 28 / 92 (3648) |
| P-07 PAID: DEAL of all you healed this turn | 16 / 32 / 98 (6270) | 24 / 44 / 98 (2015) |
| P-08 FREE: MERCY added (all you healed this turn, and its overheal) | 10 / 27 / 105 (16238) | 16 / 33 / 105 (4290) |
| P-08 PAID: MERCY added (all you healed this turn, and its overheal) | 13 / 23 / 76 (3848) | 16 / 27 / 76 (1564) |
| mc-m-05c: HEAL to full | 12 / 27 / 109 (10363) | 24 / 45 / 109 (2198) |

Play rate (share of the card's draws), and the foe VITAE the play took at once per fight:

| card | colour | type | PAID | FREE | PAID swing / fight | FREE swing / fight |
|---|---|---|---|---|---|---|
| P-01 | red | attack | 11% | 71% | 0.66 | 1.02 |
| P-04 | red | attack | 29% | 58% | 5.55 | 5.88 |
| P-06a | red | attack | 18% | 67% | 4.42 | 5.49 |
| P-07 | red | attack | 21% | 69% | 3.40 | 3.65 |
| E-04 | red | skill | 22% | 62% | 0.00 | 0.00 |
| M-07 | red | attack | 25% | 64% | 0.58 | 0.65 |
| M-10 | red | attack | 26% | 47% | 3.50 | 1.09 |
| P-08 | blue | skill | 12% | 67% | 0.01 | 0.02 |
| E-01 | blue | skill | 13% | 70% | 0.07 | 0.09 |
| E-03 | blue | spell | 9% | 72% | 0.00 | 0.00 |
| E-09 | blue | global | 38% | 51% | 0.00 | 0.00 |
| M-06 | blue | global | 24% | 64% | 0.00 | 0.00 |
| M-09 | blue | skill | 13% | 67% | 0.00 | 0.00 |
| P-03 | purple | spell | 48% | 43% | 19.76 | 0.00 |
| P-05 | purple | spell | 17% | 64% | 4.28 | 2.18 |
| P-10 | purple | global | 22% | 67% | 0.00 | 0.00 |
| E-02 | purple | skill | 15% | 66% | 0.00 | 0.00 |
| E-06 | purple | spell | 8% | 73% | 0.00 | 0.00 |
| E-08 | purple | skill | 18% | 61% | 0.22 | 0.51 |
| M-05 | purple | spell | 37% | 47% | 0.02 | 0.00 |

## merciful-29

Per fight, averaged over the foe's ledger fights and spreads. Shares are of the foe VITAE taken (its start VITAE plus every heal on it).

| foe | turns | win | p10 | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | LEECH | other | MERCY healed the foe | overheal into MERCY | VULNERABLE added |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.76 | 100% | 0.94 | 8.6 | 1.7 | 62.5 | 24.8 (40%) | 4.7 (8%) | 31.9 (51%) | 1.2 (2%) | 0.0 (0%) | 12.1 | 6.0 | 0.0 |
| Green Jelly | 3.55 | 100% | 0.89 | 22.4 | 2.2 | 95.0 | 34.6 (36%) | 10.0 (10%) | 48.6 (51%) | 1.8 (2%) | 0.0 (0%) | 19.0 | 6.0 | 0.0 |
| Death Beholder | 5.98 | 100% | 0.73 | 93.8 | 4.1 | 236.1 | 88.9 (38%) | 34.0 (14%) | 108.4 (46%) | 4.8 (2%) | 0.0 (0%) | 51.5 | 6.2 | 0.0 |

MERCY and RADIANCE:

| foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on | RADIANCE / fight | RADIANCE whiffs (healed 0) | RADIANCE heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |
|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 1.00 (0.35 / 0.65) | 42 / 74 / 176 | 20 / 37 / 88 | 21 / 37 / 88 | 10% of 100% | 27% | 2.76 | 55% | 63% | 0.06 |
| Green Jelly | 1.30 (0.48 / 0.82) | 42 / 76 / 348 | 20 / 38 / 174 | 24 / 40 / 174 | 3% of 100% | 42% | 4.01 | 42% | 46% | 0.10 |
| Death Beholder | 2.44 (1.18 / 1.27) | 44 / 90 / 394 | 22 / 44 / 197 | 33 / 56 / 197 | 0% of 100% | 42% | 8.27 | 24% | 24% | 0.28 |

Other per-fight tallies: Float-Eye: healed 12.4, M-08 cut 0.69, M-09 returned 0.56, max VITAE added 4.28, debuffs cleared 0.00; Green Jelly: healed 23.5, M-08 cut 1.15, M-09 returned 0.78, max VITAE added 5.76, debuffs cleared 0.00; Death Beholder: healed 76.6, M-08 cut 2.78, M-09 returned 1.47, max VITAE added 9.88, debuffs cleared 0.00.

Runaway lines (one number per resolution; median / p90 / max, count):

| line | all foes | Death Beholder |
|---|---|---|
| E-03b FREE: extra VITAE healed that turn | 0 / 3 / 15 (6444) | 1 / 6 / 15 (1095) |
| E-03b PAID: extra VITAE healed that turn | 8 / 19 / 52 (1001) | 10 / 22 / 52 (738) |
| E-06a FREE: the converted HEAL's DEAL | 3 / 4 / 6 (426) | 3 / 6 / 6 (59) |
| E-06a PAID: RADIANCE DEAL that turn | 8 / 18 / 74 (2243) | 12 / 24 / 74 (928) |
| P-03 PAID: MERCY then burst now | 56 / 86 / 210 (17027) | 52 / 90 / 210 (2534) |
| P-05 FREE: the tick ran the clock out | 34 / 60 / 388 (3185) | 42 / 84 / 388 (638) |
| P-05 PAID: three-times burst | 24 / 60 / 369 (5786) | 30 / 87 / 369 (1382) |
| P-07 FREE: DEAL of all you healed this turn | 4 / 15 / 128 (11052) | 9 / 24 / 128 (2508) |
| P-07 PAID: DEAL of all you healed this turn | 16 / 29 / 110 (5992) | 22 / 38 / 110 (2021) |
| P-08 FREE: MERCY added (all you healed this turn, and its overheal) | 7 / 23 / 181 (14311) | 12 / 28 / 181 (4016) |
| P-08 PAID: MERCY added (all you healed this turn, and its overheal) | 13 / 22 / 49 (2024) | 15 / 26 / 49 (1003) |
| mc-m-05c: HEAL to full | 12 / 23 / 195 (11110) | 21 / 50 / 195 (2260) |

Play rate (share of the card's draws), and the foe VITAE the play took at once per fight:

| card | colour | type | PAID | FREE | PAID swing / fight | FREE swing / fight |
|---|---|---|---|---|---|---|
| P-01 | red | attack | 10% | 74% | 0.49 | 0.66 |
| P-02 | blue | skill | 46% | 46% | 0.95 | 0.60 |
| P-03 | purple | spell | 60% | 33% | 16.91 | 0.00 |
| P-04 | red | attack | 43% | 47% | 6.72 | 3.82 |
| P-05 | purple | spell | 23% | 66% | 4.58 | 2.41 |
| P-06a | red | attack | 26% | 63% | 4.15 | 3.15 |
| P-06c | blue | skill | 26% | 64% | 0.00 | 0.00 |
| P-07 | red | attack | 23% | 66% | 2.99 | 2.26 |
| P-08 | blue | skill | 7% | 75% | 0.01 | 0.01 |
| P-09 | blue | skill | 11% | 73% | 0.00 | 0.00 |
| P-10 | purple | global | 16% | 72% | 0.00 | 0.00 |
| E-01 | blue | skill | 9% | 77% | 0.04 | 0.06 |
| E-02 | purple | skill | 21% | 65% | 0.00 | 0.00 |
| E-03 | blue | spell | 5% | 82% | 0.00 | 0.00 |
| E-04 | red | skill | 25% | 63% | 0.00 | 0.00 |
| E-06 | purple | spell | 10% | 74% | 0.00 | 0.00 |
| E-07 | red | attack | 44% | 48% | 2.78 | 1.50 |
| E-08 | purple | skill | 23% | 63% | 0.20 | 0.28 |
| E-09 | blue | global | 38% | 50% | 0.00 | 0.00 |
| E-10 | red | skill | 31% | 55% | 0.02 | 0.05 |
| M-01 | blue | skill | 41% | 51% | 0.00 | 0.00 |
| M-02 | purple | skill | 26% | 52% | 0.00 | 0.00 |
| M-04 | red | skill | 8% | 79% | 0.33 | 0.40 |
| M-05 | purple | spell | 43% | 43% | 0.00 | 0.00 |
| M-06 | blue | global | 18% | 71% | 0.00 | 0.00 |
| M-07 | red | attack | 27% | 60% | 0.54 | 0.50 |
| M-08 | purple | skill | 29% | 58% | 0.00 | 0.00 |
| M-09 | blue | skill | 19% | 66% | 0.00 | 0.00 |
| M-10 | red | attack | 28% | 49% | 2.96 | 0.69 |
