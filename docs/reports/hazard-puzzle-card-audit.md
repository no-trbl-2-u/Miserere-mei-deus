# Hazard puzzle card audit

Written by `npm run puzzle:audit -w axiomancer-mechanics` (phase HP2a). Every card in `HAZARD_DECK`
plus CRACK, read the way a puzzle reads it. Do not edit by hand; re-run the script.

- **Ignored by puzzles:** `salvage`, `rarity`, `weight`. A puzzle has
  no bin and no random draw, so these change nothing in one.
- **Banned:** RE-CAST cards (a puzzle never rolls) and dead cards.
- **Group:** cards whose puzzle shape (colour, the four values, the utility and its amounts,
  `majorEffect`, `dead`) is equal; they play the same in every puzzle.
- **Library:** the card report across the demo library, both routes, with and without the
  declared unlocks: `required` in every win everywhere, `unused` in no win anywhere, `mixed`,
  or `absent` (no demo holds it). Read after the pool is applied.
- **Recommendation:** cut a banned card and every card after the first in its group; keep the
  rest. T approves the pool by merging it (`HAZARD_PUZZLE_CARD_POOL`); `HAZARD_DECK` and the live
  hazard are unchanged.

| card | colour | values | effect | dead | ignored fields set | banned | group | library | recommendation |
|---|---|---|---|---|---|---|---|---|---|
| DEAD-MAN HAUL (`haul`) | red | 3/0 free, 6/0 powered | - |  | salvage, rarity, weight |  | alone | mixed | keep: no other card plays like it |
| IRON GRIP (`grip`) | red | 5/0 free, 9/0 powered | - |  | salvage, rarity, weight |  | alone | mixed | keep: no other card plays like it |
| SCRAMBLE (`scram`) | blue | 0/3 free, 0/6 powered | - |  | salvage, rarity, weight |  | scram, runner | mixed | keep: stands for its group (scram, runner) |
| CLIFFRUNNER (`runner`) | blue | 0/3 free, 0/6 powered | - |  | salvage, rarity, weight |  | scram, runner | absent | cut: plays the same as scram in every puzzle |
| FAITH LEAP (`leap`) | blue | 0/5 free, 0/9 powered | - |  | salvage, rarity, weight |  | alone | mixed | keep: no other card plays like it |
| SURE FOOTING (`footing`) | purple | 2/2 free, 2/2 powered | draw (drawBase 1, drawPowered 2) |  | salvage, rarity, weight |  | alone | mixed | keep: no other card plays like it |
| READ THE WIND (`windread`) | purple | 2/2 free, 2/2 powered | convert |  | salvage, rarity, weight |  | alone | mixed | keep: no other card plays like it |
| BALANCE POLE (`pole`) | purple | 3/3 free, 3/3 powered | recast |  | salvage, rarity, weight | yes | alone | absent | cut: banned (RE-CAST: a puzzle never rolls, so re-casting has nothing to do) |
| UNBROKEN OATH (`oath`) | gold | 0/0 free, 6/6 powered | draw, major (drawBase 2, drawPowered 2) |  | salvage, rarity, weight |  | alone | absent | keep: no other card plays like it |
| PILGRIM'S BLESSING (`blessing`) | gold | 0/0 free, 7/7 powered | recast, major |  | salvage, rarity, weight | yes | alone | absent | cut: banned (RE-CAST: a puzzle never rolls, so re-casting has nothing to do) |
| WAYFARER'S TITHE (`tithe`) | purple | -2/-2 free, 0/0 powered | draw (drawBase 2, drawPowered 2, puzzleOnly true) |  | rarity, weight |  | alone | absent | keep: no other card plays like it |
| TURN THE STONES (`stones`) | red | -2/0 free, 2/0 powered | reroll (puzzleOnly true, rerollBase 1, rerollPowered 2) |  | rarity, weight |  | alone | absent | keep: no other card plays like it |
| PAWNED BREATH (`pawn`) | purple | -2/-2 free, -2/-2 powered | gainDie (drawBase 0, drawPowered 2, gainDieBase 1, gainDieKind gold, gainDiePowered 1, poweredEffect draw, puzzleOnly true) |  | rarity, weight |  | alone | absent | keep: no other card plays like it |
| BREAKNECK HAUL (`breakneck`) | red | 3/-1 free, 6/-3 powered | draw (drawBase 1, drawPowered 0, gainDieBase 0, gainDieKind blue, gainDiePowered 1, poweredEffect gainDie, puzzleOnly true) |  | rarity, weight |  | alone | absent | keep: no other card plays like it |
| HEADLONG DIVE (`headlong`) | blue | -1/3 free, -3/7 powered | reroll (gainDieBase 0, gainDieKind red, gainDiePowered 1, poweredEffect gainDie, puzzleOnly true, rerollBase 1, rerollPowered 0) |  | rarity, weight |  | alone | absent | keep: no other card plays like it |
| CRACK (`crack`) | purple | 0/0 free, 0/0 powered | - | yes | rarity | yes | alone | absent | cut: banned (dead: it does nothing and cannot be powered) |

Recommended pool (12): `haul`, `grip`, `scram`, `leap`, `footing`, `windread`, `oath`, `tithe`, `stones`, `pawn`, `breakneck`, `headlong`.

Pool in `HAZARD_PUZZLE_CARD_POOL` (12): `haul`, `grip`, `scram`, `leap`, `footing`, `windread`, `oath`, `tithe`, `stones`, `pawn`, `breakneck`, `headlong`.

## Candidates

Every candidate in `HAZARD_PUZZLE_CANDIDATES`, on its nominated route with no unlock: its winning
outcomes and best surplus, then its decision pressure (optional cards, required cards of all the
cards it holds, the first plays that can still win and those that cannot, and a `forced` or `free`
finding).

| candidate | band | route and goal | wins | best surplus | optional | required | first plays that win | first plays that lose | finding |
|---|---|---|---|---|---|---|---|---|---|
| `cand-hard-01` | hard | risk [7, 21] | 4 | 0 | 1 | 3 / 4 | 8 | 4 | - |
| `cand-hard-02` | hard | risk [21, 3] | 3 | 0 | 2 | 3 / 5 | 5 | 1 | - |
| `cand-hard-03` | hard | risk [3, 19] | 3 | 0 | 1 | 4 / 6 | 6 | 1 | - |
| `cand-hard-04` | hard | safe 28 | 2 | 0 | 1 | 4 / 5 | 7 | 1 | - |
| `cand-hard-05` | hard | risk [3, 15] | 3 | 0 | 2 | 2 / 4 | 5 | 1 | - |
| `cand-hard-06` | hard | risk [3, 17] | 3 | 0 | 2 | 2 / 4 | 6 | 3 | - |
| `cand-hard-07` | hard | safe 31 | 3 | 0 | 1 | 5 / 6 | 7 | 2 | - |
| `cand-hard-08` | hard | risk [18, 10] | 3 | 1 | 1 | 4 / 5 | 7 | 1 | - |
| `cand-hard-09` | hard | risk [14, 5] | 3 | 0 | 2 | 3 / 5 | 5 | 1 | - |
| `cand-hard-10` | hard | risk [18, 4] | 3 | 1 | 1 | 4 / 5 | 5 | 1 | - |
| `cand-cost-medium-01` | medium | safe 17 | 6 | 0 | 0 | 4 / 5 | 8 | 3 | - |
| `cand-cost-medium-02` | medium | risk [10, 10] | 6 | 0 | 2 | 3 / 6 | 6 | 5 | - |
| `cand-cost-medium-03` | medium | risk [15, 4] | 10 | 0 | 1 | 4 / 6 | 5 | 4 | - |
| `cand-cost-medium-04` | medium | risk [19, 1] | 5 | 0 | 1 | 3 / 5 | 6 | 5 | - |
| `cand-cost-medium-05` | medium | risk [6, 12] | 6 | 0 | 1 | 4 / 6 | 6 | 6 | - |
| `cand-cost-medium-06` | medium | risk [15, 2] | 6 | 0 | 1 | 4 / 6 | 6 | 4 | - |
| `cand-cost-medium-07` | medium | risk [15, 8] | 5 | 0 | 1 | 3 / 6 | 7 | 5 | - |
| `cand-cost-medium-08` | medium | safe 29 | 5 | 0 | 0 | 3 / 4 | 6 | 3 | - |
| `cand-cost-medium-09` | medium | safe 13 | 18 | 0 | 0 | 4 / 5 | 9 | 2 | - |
| `cand-cost-medium-10` | medium | safe 15 | 5 | 0 | 0 | 3 / 4 | 5 | 3 | - |
| `cand-cost-hard-01` | hard | risk [8, 14] | 1 | 0 | 0 | 4 / 6 | 4 | 7 | - |
| `cand-cost-hard-02` | hard | risk [12, 2] | 2 | 0 | 0 | 5 / 6 | 5 | 5 | - |
| `cand-cost-hard-03` | hard | safe 10 | 1 | 0 | 0 | 3 / 5 | 3 | 5 | - |
| `cand-cost-hard-04` | hard | risk [4, 22] | 1 | 0 | 0 | 4 / 5 | 4 | 6 | - |
| `cand-cost-hard-05` | hard | risk [1, 17] | 1 | 0 | 0 | 3 / 4 | 4 | 5 | - |
| `cand-cost-hard-06` | hard | risk [19, 1] | 1 | 0 | 0 | 5 / 6 | 8 | 5 | - |
| `cand-cost-hard-07` | hard | risk [20, 4] | 2 | 0 | 0 | 4 / 5 | 6 | 6 | - |
| `cand-cost-hard-08` | hard | safe 19 | 1 | 0 | 0 | 4 / 5 | 5 | 5 | - |
| `cand-cost-hard-09` | hard | safe 20 | 1 | 0 | 0 | 4 / 5 | 5 | 5 | - |
| `cand-cost-hard-10` | hard | safe 27 | 2 | 0 | 0 | 4 / 6 | 5 | 7 | - |
