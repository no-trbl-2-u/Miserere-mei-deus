# Revamp — progression

> Part plan of [THE REVAMP](README.md). Phase **R9** (loop). Decision D55.
> Status: RATIFIED 2026-09-28 (D64).

## Where things stand

- Levels cost 1,000 XP each (`Game/game-mechanics.constants.ts:32`); quest
  rewards pay 30–65 XP (`Coastal-Village/maps.ts:340`,
  `Northern-Continent/maps.ts:753`).
- Since S3 (D40–D41) stats are the player's main growth: body/mind/heart
  scale every keyword family by `base × stat ÷ 5`; VITAE is
  `50 + 12·body + 6·mind + 6·heart`.
- Card upgrades are no longer parked: D8 is resolved by the UP1 brief
  (`plan/README.md`); the law shipped in UP1b, the
  grants follow in UP1d to UP1f.
- Parked, by owner rulings — not touched by the revamp: die growth
  `bonusTurnDice` / `dieUpgradeLevel` (D20, set only by
  `combat.stage-profiles.ts:257-258`), `bankedSouls` (D20, accrues, never
  spent).
- Card rewards: see [cards.md](cards.md) §Rewards.

## R9 — XP / level retune (loop)

T, 2026-09-28: a retune phase after the resets.

1. Runs after R3 (Act 1 is the whole world) and R7 (the engine is final).
2. Size the XP curve so a full Act 1 clear on the three survivors yields
   about **3–4 level-ups**, and check the resulting stat totals against the
   S3 curve (a Blow at the stage-expected body stat; the Doorwarden
   winnable but not free).
3. Evidence: the deck-matrix baseline is retired (D57). The phase may build
   a small survivors × grey deck × stage measurement for itself; if it does,
   that script becomes the new baseline only by T's call.
4. Touch only XP constants, quest/fight XP payouts and level-scaling of the
   survivors — no new content.
