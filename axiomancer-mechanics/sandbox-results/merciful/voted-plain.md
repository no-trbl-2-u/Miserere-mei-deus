# Merciful sims: voted, plain witness, 300 runs, seed 1

## Fight length per foe (mean player turns to the end)

| foe | T's target | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|---|
| Float-Eye | about 3 | 2.86 | 2.04 | 2.67 | 2.57 | 2.51 | 3.05 |
| Green Jelly | about 5 | 3.77 | 2.46 | 3.22 | 3.03 | 3.06 | 3.85 |
| Death Beholder | about 7 | 6.29 | 3.59 | 4.44 | 4.04 | 4.63 | 6.26 |

Win rate and lowest-VITAE p10 (min over the foe's cells / mean):

| foe | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|
| Float-Eye | 100% min, p10 0.74 min / 0.91 mean | 100% min, p10 0.77 min / 0.87 mean | 100% min, p10 0.95 min / 0.97 mean | 100% min, p10 0.88 min / 0.93 mean | 100% min, p10 0.90 min / 0.93 mean | 100% min, p10 0.89 min / 0.93 mean |
| Green Jelly | 100% min, p10 0.25 min / 0.76 mean | 100% min, p10 0.69 min / 0.82 mean | 100% min, p10 0.90 min / 0.95 mean | 100% min, p10 0.79 min / 0.89 mean | 100% min, p10 0.82 min / 0.89 mean | 100% min, p10 0.77 min / 0.86 mean |
| Death Beholder | 35% min, p10 0.00 min / 0.27 mean | 100% min, p10 0.58 min / 0.69 mean | 100% min, p10 0.89 min / 0.91 mean | 100% min, p10 0.71 min / 0.76 mean | 100% min, p10 0.69 min / 0.75 mean | 100% min, p10 0.53 min / 0.66 mean |

VITAE the foe took from you per fight (mean):

| foe | grey | blood-price | elementalist | defender | merciful-test | merciful-29 |
|---|---|---|---|---|---|---|
| Float-Eye | 11.0 | 3.1 | 2.7 | 5.9 | 12.7 | 11.8 |
| Green Jelly | 33.5 | 7.2 | 6.1 | 12.2 | 25.1 | 28.1 |
| Death Beholder | 135.3 | 27.4 | 16.7 | 34.9 | 84.6 | 105.8 |

## merciful-test

Per fight, averaged over the foe's ledger fights and spreads. Shares are of the foe VITAE taken (its start VITAE plus every heal on it).

| foe | turns | win | p10 | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | LEECH | other | MERCY healed the foe | overheal into MERCY | VULNERABLE added |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 2.51 | 100% | 0.93 | 12.7 | 2.4 | 66.0 | 31.0 (47%) | 7.6 (12%) | 27.3 (41%) | 0.0 (0%) | 0.0 (0%) | 15.6 | 5.7 | 0.0 |
| Green Jelly | 3.06 | 100% | 0.89 | 25.1 | 3.0 | 99.7 | 43.1 (43%) | 12.4 (12%) | 44.2 (44%) | 0.0 (0%) | 0.0 (0%) | 23.7 | 5.6 | 0.0 |
| Death Beholder | 4.63 | 100% | 0.75 | 84.6 | 5.6 | 240.9 | 106.7 (44%) | 31.0 (13%) | 103.2 (43%) | 0.0 (0%) | 0.0 (0%) | 61.6 | 5.9 | 0.0 |

MERCY and RADIANCE:

| foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on | RADIANCE / fight | RADIANCE whiffs (healed 0) | RADIANCE heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |
|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 0.90 (0.41 / 0.49) | 48 / 82 / 171 | 22 / 40 / 80 | 24 / 40 / 96 | 14% of 100% | 30% | 2.68 | 35% | 47% | 0.35 |
| Green Jelly | 1.14 (0.51 / 0.63) | 50 / 87 / 182 | 24 / 42 / 91 | 29 / 44 / 91 | 4% of 100% | 42% | 3.60 | 26% | 36% | 0.43 |
| Death Beholder | 1.95 (0.93 / 1.02) | 60 / 116 / 354 | 29 / 56 / 177 | 43 / 70 / 177 | 0% of 100% | 43% | 6.77 | 14% | 19% | 0.79 |

Other per-fight tallies: Float-Eye: healed 16.5, M-08 cut 0.00, M-09 returned 0.67, max VITAE added 4.72, debuffs cleared 0.00; Green Jelly: healed 26.6, M-08 cut 0.00, M-09 returned 0.91, max VITAE added 5.76, debuffs cleared 0.00; Death Beholder: healed 69.8, M-08 cut 0.00, M-09 returned 1.71, max VITAE added 9.53, debuffs cleared 0.00.

Runaway lines (one number per resolution; median / p90 / max, count):

| line | all foes | Death Beholder |
|---|---|---|
| E-03b FREE: extra VITAE healed that turn | 1 / 3 / 12 (9287) | 3 / 6 / 12 (1853) |
| E-03b PAID: extra VITAE healed that turn | 0 / 6 / 28 (8132) | 6 / 14 / 28 (1514) |
| E-06a FREE: the converted HEAL's DEAL | 3 / 6 / 18 (6209) | 3 / 6 / 18 (1316) |
| E-06a PAID: RADIANCE DEAL that turn | 8 / 20 / 66 (4231) | 14 / 30 / 66 (1059) |
| P-03 PAID: MERCY then burst now | 60 / 88 / 234 (9437) | 60 / 104 / 234 (1575) |
| P-05 FREE: the tick ran the clock out | 50 / 84 / 252 (4667) | 60 / 114 / 252 (925) |
| P-05 PAID: three-times burst | 36 / 87 / 246 (5707) | 45 / 111 / 246 (1178) |
| P-07 FREE: DEAL of all you healed this turn | 7 / 18 / 139 (23661) | 12 / 28 / 139 (5445) |
| P-07 PAID: DEAL of all you healed this turn | 16 / 31 / 78 (5252) | 24 / 44 / 78 (1189) |
| P-08 FREE: MERCY added (all you healed this turn, and its overheal) | 10 / 24 / 136 (17572) | 16 / 33 / 136 (4482) |
| P-08 PAID: MERCY added (all you healed this turn, and its overheal) | 12 / 21 / 70 (5952) | 16 / 26 / 70 (1647) |
| mc-m-05c: HEAL to full | 13 / 26 / 153 (8407) | 25 / 60 / 153 (1497) |

Play rate (share of the card's draws), and the foe VITAE the play took at once per fight:

| card | colour | type | PAID | FREE | PAID swing / fight | FREE swing / fight |
|---|---|---|---|---|---|---|
| P-01 | red | attack | 26% | 63% | 0.80 | 1.33 |
| P-04 | red | attack | 23% | 67% | 5.22 | 8.79 |
| P-06a | red | attack | 23% | 67% | 3.38 | 8.83 |
| P-07 | red | attack | 24% | 67% | 2.74 | 6.00 |
| E-04 | red | skill | 28% | 63% | 0.00 | 0.00 |
| M-07 | red | attack | 29% | 61% | 0.76 | 0.74 |
| M-10 | red | attack | 22% | 67% | 1.69 | 1.61 |
| P-08 | blue | skill | 27% | 61% | 0.01 | 0.04 |
| E-01 | blue | skill | 30% | 59% | 0.02 | 0.27 |
| E-03 | blue | spell | 31% | 60% | 0.00 | 0.00 |
| E-09 | blue | global | 27% | 65% | 0.00 | 0.00 |
| M-06 | blue | global | 23% | 68% | 0.00 | 0.00 |
| M-09 | blue | skill | 30% | 57% | 0.00 | 0.00 |
| P-03 | purple | spell | 22% | 72% | 11.00 | 0.00 |
| P-05 | purple | spell | 24% | 67% | 4.48 | 4.32 |
| P-10 | purple | global | 26% | 66% | 0.00 | 0.00 |
| E-02 | purple | skill | 23% | 67% | 0.00 | 0.00 |
| E-06 | purple | spell | 25% | 64% | 0.00 | 0.00 |
| E-08 | purple | skill | 23% | 65% | 0.28 | 0.83 |
| M-05 | purple | spell | 25% | 64% | 0.13 | 0.00 |

## merciful-29

Per fight, averaged over the foe's ledger fights and spreads. Shares are of the foe VITAE taken (its start VITAE plus every heal on it).

| foe | turns | win | p10 | VITAE taken from you | SACRIFICE paid | foe VITAE taken | plain DEAL | RADIANCE | MERCY bursts | LEECH | other | MERCY healed the foe | overheal into MERCY | VULNERABLE added |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 3.05 | 100% | 0.93 | 11.8 | 2.0 | 64.9 | 26.2 (40%) | 7.1 (11%) | 30.2 (47%) | 1.3 (2%) | 0.0 (0%) | 14.5 | 5.8 | 0.0 |
| Green Jelly | 3.85 | 100% | 0.86 | 28.1 | 2.6 | 98.7 | 36.6 (37%) | 13.0 (13%) | 47.2 (48%) | 1.9 (2%) | 0.0 (0%) | 22.7 | 5.7 | 0.0 |
| Death Beholder | 6.26 | 100% | 0.66 | 105.8 | 4.7 | 242.5 | 89.7 (37%) | 37.6 (15%) | 110.6 (46%) | 4.7 (2%) | 0.0 (0%) | 57.4 | 6.0 | 0.0 |

MERCY and RADIANCE:

| foe | bursts / fight (on the clock / early) | burst DEAL median / p90 / max | MERCY total at burst median / p90 / max | highest MERCY a fight median / p90 / max | fights with MERCY that end before it bursts | ...that end with MERCY still on | RADIANCE / fight | RADIANCE whiffs (healed 0) | RADIANCE heal lost to full VITAE | HEALs made RADIANCE (E-06a) / fight |
|---|---|---|---|---|---|---|---|---|---|---|
| Float-Eye | 0.98 (0.51 / 0.47) | 45 / 76 / 160 | 22 / 37 / 80 | 23 / 38 / 80 | 9% of 100% | 28% | 3.53 | 50% | 62% | 0.23 |
| Green Jelly | 1.26 (0.64 / 0.62) | 46 / 78 / 183 | 22 / 39 / 83 | 26 / 41 / 83 | 3% of 100% | 41% | 4.79 | 39% | 48% | 0.28 |
| Death Beholder | 2.42 (1.32 / 1.10) | 48 / 94 / 330 | 23 / 46 / 165 | 36 / 58 / 191 | 0% of 100% | 37% | 9.11 | 20% | 26% | 0.56 |

Other per-fight tallies: Float-Eye: healed 15.4, M-08 cut 0.86, M-09 returned 0.59, max VITAE added 4.58, debuffs cleared 0.00; Green Jelly: healed 27.1, M-08 cut 1.32, M-09 returned 0.79, max VITAE added 5.58, debuffs cleared 0.00; Death Beholder: healed 79.2, M-08 cut 2.86, M-09 returned 1.50, max VITAE added 8.78, debuffs cleared 0.00.

Runaway lines (one number per resolution; median / p90 / max, count):

| line | all foes | Death Beholder |
|---|---|---|
| E-03b FREE: extra VITAE healed that turn | 0 / 3 / 12 (6359) | 3 / 6 / 12 (1383) |
| E-03b PAID: extra VITAE healed that turn | 0 / 7 / 36 (5755) | 4 / 17 / 36 (1197) |
| E-06a FREE: the converted HEAL's DEAL | 3 / 4 / 9 (2395) | 3 / 6 / 9 (624) |
| E-06a PAID: RADIANCE DEAL that turn | 8 / 20 / 58 (4080) | 12 / 24 / 58 (1148) |
| P-03 PAID: MERCY then burst now | 60 / 90 / 268 (10230) | 56 / 96 / 268 (1860) |
| P-05 FREE: the tick ran the clock out | 42 / 66 / 190 (4656) | 44 / 84 / 190 (893) |
| P-05 PAID: three-times burst | 30 / 72 / 291 (4734) | 24 / 93 / 291 (1201) |
| P-07 FREE: DEAL of all you healed this turn | 6 / 16 / 111 (14819) | 10 / 23 / 111 (3704) |
| P-07 PAID: DEAL of all you healed this turn | 14 / 34 / 99 (5280) | 22 / 42 / 99 (1442) |
| P-08 FREE: MERCY added (all you healed this turn, and its overheal) | 8 / 21 / 180 (15684) | 14 / 28 / 180 (3737) |
| P-08 PAID: MERCY added (all you healed this turn, and its overheal) | 9 / 19 / 148 (5972) | 14 / 26 / 148 (1633) |
| mc-m-05c: HEAL to full | 12 / 23 / 230 (9508) | 20 / 59 / 230 (1640) |

Play rate (share of the card's draws), and the foe VITAE the play took at once per fight:

| card | colour | type | PAID | FREE | PAID swing / fight | FREE swing / fight |
|---|---|---|---|---|---|---|
| P-01 | red | attack | 35% | 54% | 0.82 | 0.64 |
| P-02 | blue | skill | 33% | 57% | 0.67 | 0.94 |
| P-03 | purple | spell | 31% | 64% | 10.55 | 0.00 |
| P-04 | red | attack | 29% | 64% | 4.94 | 6.34 |
| P-05 | purple | spell | 27% | 66% | 3.51 | 4.32 |
| P-06a | red | attack | 25% | 67% | 2.94 | 5.24 |
| P-06c | blue | skill | 28% | 65% | 0.00 | 0.00 |
| P-07 | red | attack | 28% | 63% | 2.64 | 3.41 |
| P-08 | blue | skill | 29% | 64% | 0.00 | 0.04 |
| P-09 | blue | skill | 29% | 64% | 0.00 | 0.00 |
| P-10 | purple | global | 31% | 62% | 0.00 | 0.00 |
| E-01 | blue | skill | 28% | 64% | 0.05 | 0.11 |
| E-02 | purple | skill | 27% | 64% | 0.00 | 0.00 |
| E-03 | blue | spell | 26% | 64% | 0.00 | 0.00 |
| E-04 | red | skill | 33% | 60% | 0.00 | 0.00 |
| E-06 | purple | spell | 31% | 62% | 0.00 | 0.00 |
| E-07 | red | attack | 28% | 66% | 1.99 | 2.32 |
| E-08 | purple | skill | 28% | 65% | 0.29 | 0.44 |
| E-09 | blue | global | 25% | 68% | 0.00 | 0.00 |
| E-10 | red | skill | 34% | 56% | 0.06 | 0.11 |
| M-01 | blue | skill | 30% | 64% | 0.00 | 0.00 |
| M-02 | purple | skill | 27% | 65% | 0.00 | 0.00 |
| M-04 | red | skill | 28% | 64% | 0.55 | 0.54 |
| M-05 | purple | spell | 33% | 59% | 0.18 | 0.00 |
| M-06 | blue | global | 25% | 68% | 0.00 | 0.00 |
| M-07 | red | attack | 24% | 67% | 0.48 | 0.59 |
| M-08 | purple | skill | 29% | 63% | 0.00 | 0.00 |
| M-09 | blue | skill | 32% | 60% | 0.00 | 0.00 |
| M-10 | red | attack | 25% | 66% | 1.51 | 1.14 |
