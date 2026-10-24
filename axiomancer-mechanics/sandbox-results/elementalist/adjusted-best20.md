# adjusted (300 runs, seed 1)

## Per foe (mean over every ledger fight and spread)

| deck | foe | target turns | mean turns | win | p10 (mean of cells) | worst p10 | self-burn / fight | self-kill | FROZEN / foe turn | FROZEN doubles / fight | foe INFERNO loss | foe STORM loss | BLIZZARD prevented |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| elementalist-best20 | float-eye | ~3 | 2.61 | 100% | 0.97 | 0.96 | 1.22 | 0% | 9% | 0.14 | 6.00 | 7.24 | 6.08 |
| elementalist-best20 | green-jelly | ~5 | 3.19 | 100% | 0.95 | 0.92 | 1.94 | 0% | 3% | 0.07 | 9.80 | 13.24 | 11.11 |
| elementalist-best20 | death-beholder | ~7 | 4.36 | 100% | 0.91 | 0.90 | 3.79 | 0% | 5% | 0.16 | 22.02 | 35.45 | 30.75 |

## Overall

- elementalist-best20: FROZEN on 7% of foe turns; self-burn 1.72 VITAE / fight against 4.53 from foe hits; highest self-kill rate in any cell 0%
  - float-eye: foe hits 2.17, INFERNO on you 1.22
  - green-jelly: foe hits 5.11, INFERNO on you 1.94
  - death-beholder: foe hits 14.60, INFERNO on you 3.79
  - doors, turns per cell: bw-17 even 4.36; bw-17 body-mind 4.29; bw-17 body 4.17; cw-17 even 4.51; cw-17 body-mind 4.28; cw-17 body 4.16; bc-15 even 4.59; bc-15 body-mind 4.36; bc-15 body 4.10; ld-16 even 4.92; ld-16 body-mind 4.43; ld-16 body 4.16

## Measured table (win rate / lowest-VITAE p10)

| fight | level | elementalist-best20 even | elementalist-best20 body-mind | elementalist-best20 body |
|---|---|---|---|---|
| bw-2/float-eye | L1 v L2 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 |
| bw-6/float-eye | L1 v L2 | 100% / 0.96 | 100% / 0.96 | 100% / 0.96 |
| bw-8/green-jelly | L2 v L3 | 100% / 0.92 | 100% / 0.92 | 100% / 0.92 |
| bw-10/float-eye | L3 v L2 | 100% / 0.96 | 100% / 0.97 | 100% / 0.97 |
| bw-14/float-eye | L4 v L2 | 100% / 0.96 | 100% / 0.97 | 100% / 0.97 |
| bw-17/death-beholder (door) | L4 v L1 | 100% / 0.91 | 100% / 0.91 | 100% / 0.91 |
| cw-5/float-eye | L6 v L2 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 |
| cw-7/float-eye | L7 v L2 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 |
| cw-10/float-eye | L7 v L2 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 |
| cw-12/green-jelly | L7 v L3 | 100% / 0.94 | 100% / 0.95 | 100% / 0.95 |
| cw-16/float-eye | L8 v L3 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 |
| cw-19/float-eye | L9 v L3 | 100% / 0.97 | 100% / 0.97 | 100% / 0.98 |
| cw-17/death-beholder (door) | L9 v L2 | 100% / 0.92 | 100% / 0.92 | 100% / 0.91 |
| bc-2/float-eye | L12 v L3 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| bc-8/green-jelly | L12 v L3 | 100% / 0.95 | 100% / 0.96 | 100% / 0.96 |
| bc-10/float-eye | L13 v L3 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| bc-11/float-eye | L13 v L4 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 |
| bc-13/float-eye | L13 v L4 | 100% / 0.97 | 100% / 0.97 | 100% / 0.97 |
| bc-15/death-beholder (door) | L14 v L3 | 100% / 0.92 | 100% / 0.92 | 100% / 0.91 |
| ld-3/float-eye | L16 v L3 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| ld-5/float-eye | L16 v L3 | 100% / 0.98 | 100% / 0.98 | 100% / 0.98 |
| ld-8/green-jelly | L16 v L3 | 100% / 0.96 | 100% / 0.97 | 100% / 0.97 |
| ld-11/float-eye | L17 v L4 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| ld-12/float-eye | L17 v L4 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| ld-13/float-eye | L17 v L4 | 100% / 0.97 | 100% / 0.98 | 100% / 0.98 |
| ld-16/death-beholder (door) | L18 v L4 | 100% / 0.92 | 100% / 0.91 | 100% / 0.90 |

## Turns per fight

| fight | elementalist-best20 even | elementalist-best20 body-mind | elementalist-best20 body |
|---|---|---|---|
| bw-2/float-eye | 2.85 | 2.85 | 2.85 |
| bw-6/float-eye | 2.85 | 2.85 | 2.85 |
| bw-8/green-jelly | 3.62 | 3.62 | 3.62 |
| bw-10/float-eye | 2.83 | 2.75 | 2.75 |
| bw-14/float-eye | 2.83 | 2.75 | 2.63 |
| bw-17/death-beholder | 4.36 | 4.29 | 4.17 |
| cw-5/float-eye | 2.75 | 2.58 | 2.46 |
| cw-7/float-eye | 2.75 | 2.58 | 2.45 |
| cw-10/float-eye | 2.75 | 2.58 | 2.45 |
| cw-12/green-jelly | 3.48 | 3.28 | 3.15 |
| cw-16/float-eye | 2.85 | 2.65 | 2.59 |
| cw-19/float-eye | 2.85 | 2.64 | 2.48 |
| cw-17/death-beholder | 4.51 | 4.28 | 4.16 |
| bc-2/float-eye | 2.76 | 2.48 | 2.30 |
| bc-8/green-jelly | 3.28 | 2.96 | 2.78 |
| bc-10/float-eye | 2.76 | 2.48 | 2.24 |
| bc-11/float-eye | 2.97 | 2.66 | 2.44 |
| bc-13/float-eye | 2.97 | 2.66 | 2.44 |
| bc-15/death-beholder | 4.59 | 4.36 | 4.10 |
| ld-3/float-eye | 2.65 | 2.31 | 2.04 |
| ld-5/float-eye | 2.65 | 2.31 | 2.04 |
| ld-8/green-jelly | 3.16 | 2.80 | 2.51 |
| ld-11/float-eye | 2.82 | 2.50 | 2.22 |
| ld-12/float-eye | 2.82 | 2.50 | 2.22 |
| ld-13/float-eye | 2.82 | 2.50 | 2.22 |
| ld-16/death-beholder | 4.92 | 4.43 | 4.16 |

## Cards

### elementalist-best20

| slot | colour | draws | PAID / draw | FREE / draw | held at phase end | foe VITAE / fight, FREE | foe VITAE / fight, PAID |
|---|---|---|---|---|---|---|---|
| P-10 | body | 20631 | 31% | 65% | 0 | 0.00 | 0.00 |
| P-02 | body | 26304 | 51% | 44% | 0 | 3.03 | 10.46 |
| P-07 | body | 25514 | 25% | 66% | 0 | 4.26 | 2.81 |
| P-05 | body | 25648 | 0% | 91% | 0 | 7.93 | 0.00 |
| E-02 | body | 25353 | 29% | 59% | 0 | 3.75 | 2.76 |
| P-04 | body | 25305 | 4% | 84% | 0 | 3.46 | 0.64 |
| P-09 | body | 25678 | 32% | 58% | 0 | 3.26 | 5.94 |
| M-10 | mind | 20029 | 46% | 48% | 0 | 0.00 | 0.00 |
| E-07 | mind | 24545 | 50% | 40% | 0 | 0.00 | 0.00 |
| M-09 | mind | 24888 | 14% | 69% | 0 | 0.00 | 0.00 |
| P-03 | mind | 24536 | 8% | 78% | 0 | 0.00 | 0.00 |
| P-06 | mind | 24124 | 25% | 60% | 0 | 0.00 | 0.00 |
| M-05 | mind | 23940 | 9% | 75% | 0 | 0.00 | 0.00 |
| M-06 | mind | 25877 | 17% | 69% | 0 | 0.00 | 0.00 |
| M-08 | heart | 20284 | 52% | 43% | 0 | 0.00 | 0.00 |
| E-09 | heart | 21038 | 28% | 66% | 0 | 0.00 | 0.00 |
| M-04 | heart | 25333 | 37% | 54% | 0 | 0.00 | 0.00 |
| P-08 | heart | 24657 | 31% | 59% | 0 | 0.00 | 0.00 |
| E-04 | heart | 24577 | 30% | 57% | 0 | 0.00 | 0.00 |
| E-05 | heart | 24742 | 20% | 66% | 0 | 0.00 | 0.00 |

