# Hazard puzzle difficulty curve

Written by `npm run puzzle:sim -w axiomancer-mechanics` (phase HP6a). Do not edit by hand; re-run the script.

- **Commit:** `bf5efda9e`
- **Seed:** 1031
- **Plays per bot, per candidate:** 1000
- **Candidates:** 30, each played on its graded route with no unlock.

Two seeded bots play each candidate through the session's move functions. `random` picks uniformly
among the legal moves and confirm. `noisy-greedy` picks the move that leaves the smallest shortfall to
the goal (a move and its best single follow-up, such as a stage and its power, count as one placement),
confirms when no move shrinks it, and plays a random legal move 15% of the time. The score is the mean
of the two win rates: higher is easier. Rank 1 is the easiest. Ties go to more solver winning lines,
then to id. The solver columns are an exhaustive cross-check and are not in the score. This is a rough
measurement (D57), not a gated baseline, and not calibrated against human solve times.

| rank | id | label | intended | route goal | random | noisy-greedy | score | curve | solver lines | first plays that win |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `cand-hard-09` | two blanks and one red | hard | risk 14F + 5E | 8.8% | 89.8% | 49.3% | `##########..........` | 3 | 83.3% |
| 2 | `cand-hard-06` | wild die, three wrong homes | hard | risk 3F + 17E | 1.3% | 94.3% | 47.8% | `##########..........` | 3 | 66.7% |
| 3 | `cand-hard-05` | one blue die, three blue cards | hard | risk 3F + 15E | 6.5% | 88.1% | 47.3% | `#########...........` | 3 | 83.3% |
| 4 | `cand-hard-04` | four dice, three cards, exact | hard | safe 28 | 2.9% | 86.8% | 44.9% | `#########...........` | 2 | 87.5% |
| 5 | `cand-hard-01` | every die has a wrong card | hard | risk 7F + 21E | 1.5% | 81.2% | 41.4% | `########............` | 4 | 66.7% |
| 6 | `cand-hard-07` | two colour traps, exact sum | hard | safe 31 | 1.1% | 72.7% | 36.9% | `#######.............` | 3 | 77.8% |
| 7 | `cand-cost-medium-08` | two oaths, two tithes | medium | safe 29 | 0.2% | 69.3% | 34.8% | `#######.............` | 5 | 66.7% |
| 8 | `cand-hard-02` | two reds, force to the brim | hard | risk 21F + 3E | 0.9% | 64.5% | 32.7% | `#######.............` | 3 | 83.3% |
| 9 | `cand-cost-medium-10` | pawns and footings, paired | medium | safe 15 | 0.4% | 64.1% | 32.3% | `######..............` | 5 | 62.5% |
| 10 | `cand-cost-medium-04` | a tithe beside a sure footing | medium | risk 19F + 1E | 0.6% | 63.6% | 32.1% | `######..............` | 5 | 54.5% |
| 11 | `cand-cost-hard-10` | one wild, one red, an oath | hard | safe 27 | 0.1% | 54.7% | 27.4% | `#####...............` | 2 | 41.7% |
| 12 | `cand-cost-hard-07` | both overdrives, one wild die | hard | risk 20F + 4E | 0.0% | 51.2% | 25.6% | `#####...............` | 2 | 50.0% |
| 13 | `cand-hard-08` | an oath without gold, one purple | hard | risk 18F + 10E | 0.0% | 47.4% | 23.7% | `#####...............` | 3 | 87.5% |
| 14 | `cand-cost-hard-04` | an oath to power, a long escape | hard | risk 4F + 22E | 0.0% | 44.1% | 22.1% | `####................` | 1 | 40.0% |
| 15 | `cand-cost-hard-08` | the stones wait in reserve | hard | safe 19 | 0.1% | 42.1% | 21.1% | `####................` | 1 | 50.0% |
| 16 | `cand-cost-medium-09` | four costs and a wind | medium | safe 13 | 0.2% | 40.0% | 20.1% | `####................` | 18 | 81.8% |
| 17 | `cand-cost-hard-02` | a breakneck in the reserve | hard | risk 12F + 2E | 0.0% | 12.7% | 6.3% | `#...................` | 2 | 50.0% |
| 18 | `cand-hard-10` | a blank, a purple, two purple cards | hard | risk 18F + 4E | 1.2% | 8.2% | 4.7% | `#...................` | 3 | 83.3% |
| 19 | `cand-cost-hard-06` | three red cards, two red dice | hard | risk 19F + 1E | 0.0% | 8.8% | 4.4% | `#...................` | 1 | 61.5% |
| 20 | `cand-cost-medium-01` | two pawns and a wild die | medium | safe 17 | 0.1% | 8.1% | 4.1% | `#...................` | 6 | 72.7% |
| 21 | `cand-cost-hard-09` | one gold die, one oath | hard | safe 20 | 0.2% | 7.2% | 3.7% | `#...................` | 1 | 50.0% |
| 22 | `cand-cost-hard-01` | four costs, one blank die | hard | risk 8F + 14E | 0.0% | 4.8% | 2.4% | `....................` | 1 | 36.4% |
| 23 | `cand-cost-hard-05` | two hauls that cost escape | hard | risk 1F + 17E | 0.0% | 4.5% | 2.3% | `....................` | 1 | 44.4% |
| 24 | `cand-cost-medium-02` | an oath in the reserve, two faces to turn | medium | risk 10F + 10E | 0.0% | 3.8% | 1.9% | `....................` | 6 | 54.5% |
| 25 | `cand-cost-hard-03` | two stones, one face | hard | safe 10 | 0.0% | 3.7% | 1.8% | `....................` | 1 | 37.5% |
| 26 | `cand-hard-03` | a blank die and two purples | hard | risk 3F + 19E | 1.2% | 1.3% | 1.3% | `....................` | 3 | 85.7% |
| 27 | `cand-cost-medium-06` | two wild dice, a dive and a tithe | medium | risk 15F + 2E | 0.0% | 0.7% | 0.4% | `....................` | 6 | 60.0% |
| 28 | `cand-cost-medium-03` | two dives and a blank | medium | risk 15F + 4E | 0.0% | 0.4% | 0.2% | `....................` | 10 | 55.6% |
| 29 | `cand-cost-medium-05` | two tithes, one held back | medium | risk 6F + 12E | 0.0% | 0.4% | 0.2% | `....................` | 6 | 50.0% |
| 30 | `cand-cost-medium-07` | an oath in hand, a pawn beside it | medium | risk 15F + 8E | 0.0% | 0.0% | 0.0% | `....................` | 5 | 58.3% |

## The Breakwater six

Phase HP6b. `pickChapterHazardPuzzles` takes the middle third of the ranking (ranks 11-20 of 30), picks six
evenly spaced ranks and gives them to the six hazard nodes in story order, so each is harder than the one
before. `BREAKWATER_HAZARD_PUZZLES` holds this table; a test fails if the two drift.

| order | node | place | candidate | label | rank | score | curve |
|---|---|---|---|---|---|---|---|
| 1 | `bw-h4` | The wreck | `cand-cost-hard-10` | one wild, one red, an oath | 11 | 27.4% | `#####...............` |
| 2 | `bw-m2` | River meadow | `cand-hard-08` | an oath without gold, one purple | 13 | 23.7% | `#####...............` |
| 3 | `bw-p1` | Foothills | `cand-cost-hard-08` | the stones wait in reserve | 15 | 21.1% | `####................` |
| 4 | `bw-m4` | Manor road | `cand-cost-medium-09` | four costs and a wind | 16 | 20.1% | `####................` |
| 5 | `bw-t5` | Back lanes | `cand-hard-10` | a blank, a purple, two purple cards | 18 | 4.7% | `#...................` |
| 6 | `bw-d4` | Tower switchbacks | `cand-cost-medium-01` | two pawns and a wild die | 20 | 4.1% | `#...................` |
