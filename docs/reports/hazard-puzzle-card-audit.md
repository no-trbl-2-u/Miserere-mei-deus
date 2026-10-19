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
| CRACK (`crack`) | purple | 0/0 free, 0/0 powered | - | yes | rarity | yes | alone | absent | cut: banned (dead: it does nothing and cannot be powered) |

Recommended pool (7): `haul`, `grip`, `scram`, `leap`, `footing`, `windread`, `oath`.

Pool in `HAZARD_PUZZLE_CARD_POOL` (7): `haul`, `grip`, `scram`, `leap`, `footing`, `windread`, `oath`.
