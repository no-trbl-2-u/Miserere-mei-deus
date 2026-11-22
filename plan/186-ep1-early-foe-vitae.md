# 186 — The opening fights end sooner: lower foe VITAE at levels 1 to 3

> A fresh run's first fights (levels 1 to 3) scale their foe's VITAE by a smaller multiplier than the rest of the game, so the opening of Chapter 1 takes fewer turns.

## Why

### Sources

- **T, 2026-11-22 (attended, `/plot` after the Chapter 1 pacing measurement):** playtesting "feels a little like the start of the run takes a little long". Of the levers offered (an earlier first stat point, lower early foe HP, fewer forced opening fights, an early fork with stakes), T picked **lower early foe HP** only, slotted **Asap**.
- **The measurement** (report: https://claude.ai/artifact/QcnhGhWZEueUwRWrhMYhVL; a scratch harness around `axiomancer-mobile/sim`'s run driver at e67b6f4, 3,200 rewards-only runs, plus T's play-log API):
  - A fresh run's first five fights (bw-w2 Quay-Crab, bw-w3 Coralback, bw-h1 Net-Mender, bw-h2 Quay-Crab, bw-h3 Net-Mender; levels 1 to 3) take 6 to 7 turns each. That is 32 turns, about 12 of the chapter's modeled 53 minutes and 31% of its fight turns.
  - No player decision changes them: the stat, route, reward and cache variants all play these five fights in 32 to 35 turns.
  - Nine runs in ten keep 83% or more of their VITAE through them.
  - T's own first fights took a median of 5 turns at 20.7 seconds a turn (17 won fights).
  - This is a measurement, not a target (D57): nothing here grades the game.

### What exists today

- `axiomancer-mechanics/src/Combat/live-encounter.ts`: `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER = 2`, one constant for every live fight.
- `axiomancer-mobile/state/actions.ts`: `ENCOUNTER_ENEMY_HP_MULTIPLIER` re-exports it. `beginHazardEncounter` scales the foe with `withScaledEnemyHp` and records the value in the play log (`recordFightStart`, the fight row's `enemyHpMultiplier`).
- `axiomancer-mobile/state/presenters/event.engine.ts`: the encounter prelude previews the scaled VITAE with the same constant.
- `axiomancer-mechanics/src/Combat/combat.pacing.sim.ts`: the pacing sim scales by the constant unless `enemyHpMultiplier` is passed. The Atlas (`Atlas/atlas.data.ts`) and two CLIs (`lane-pacing.cli.ts`, `chapter1-enemies.cli.ts`) read the constant.

### The small version first

One function beside the constant, read at the three app sites that scale a live foe. Nothing new on screen. One chunk.

## Design

- **The rule.** `liveEncounterHpMultiplier(playerLevel)` in `live-encounter.ts` returns `EARLY_ENCOUNTER_ENEMY_HP_MULTIPLIER` when `playerLevel <= EARLY_ENCOUNTER_MAX_LEVEL`, else `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`.
  - Early multiplier: **1.5** [T to confirm #1].
  - Last early level: **3** [T to confirm #2].
  - `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER` stays 2 for every later fight.
  - The band is by the player's level, not by node. The fights at levels 1 to 3 are the opening five plus, on most routes, the bw-c1 elite. The elite takes the early multiplier too.
- **The app sites.** `beginHazardEncounter`, the prelude preview and the play log all read the multiplier for the player's level at the moment the fight starts, so the preview, the VITAE bar and the logged `enemyHpMultiplier` agree.
  - `ENCOUNTER_ENEMY_HP_MULTIPLIER` is kept for readers that mean the base value, or replaced. The builder picks one and fixes every reader (`test-utils/realFight.test.ts`, `lib/__tests__/fightRecorder.test.ts`).
- **The sims.** The pacing sim keeps its explicit `enemyHpMultiplier` option. Where it plays a fight at a known player level, its default is `liveEncounterHpMultiplier(level)`, so sim turn counts keep matching live fights.
  - The run driver (`axiomancer-mobile/sim`) plays through `beginHazardEncounter`, so it follows the app with no change.
  - The Atlas and the CLIs keep showing the base value. Each says it is the base value, for fights past level 3.
- **Measure, not grade (D57).** The PR reports the first five fights' median turns over 100 wanderer seeds, before and after. The run driver's `onStep` hook and the fight recorder give the counts, as the plot's evidence harness did. No test pins a turn count.

### Decisions made upfront (do not ask)

- No foe's authored `maxHealth` changes, and the engine's hermetic tests keep authored values.
- No XP, level-curve, map or reward change. T picked only the HP lever.
- The boss and every fight past level 3 keep ×2.

### Out of scope

- An earlier first stat point, fewer opening fights, an early fork with stakes: offered, not picked (T, 2026-11-22).
- Retiring the ×2 testing knob itself.

## Acceptance

- **A1** A live fight started at player level 1, 2 or 3 scales its foe's VITAE by the early multiplier. A fight at level 4 or more scales by ×2. The prelude preview, the combat VITAE bar and the play log's `enemyHpMultiplier` show the same scaled value for the same fight. Tests cover level 3 and level 4.
- **A2** The pacing sim's default follows the same rule. The Atlas and the two CLIs name the value they show as the base. The PR body reports the median turns of the first five fights over 100 wanderer seeds, before and after.

## Open questions

- [T to confirm #1] The early multiplier: 1.5 (default), or 1.25, or 1 (authored VITAE).
- [T to confirm #2] The last early level: 3 (default, the opening five and the bw-c1 elite), or 2 (the first four fights only).

## Chunks

Measure: 2 open · 0 closed · next A3
- [ ] **186.1** Foes at player levels 1 to 3 take the early VITAE multiplier · M · closes A1, A2 · needs — · alias: EP1a
  - Engine: the function and the two new constants in `live-encounter.ts`, exported through `Combat/index.ts` and `src/index.ts`, with tests at levels 3 and 4.
  - App: `beginHazardEncounter`, the encounter prelude preview and `recordFightStart` read the level-aware value. Every `ENCOUNTER_ENEMY_HP_MULTIPLIER` reader is updated.
  - Sims and readers: the pacing sim default, the Atlas and the two CLIs label the base value.
  - Check siblings: `docs/game-model.md` and `axiomancer-mobile/AGENTS.md` lines that state the ×2 knob; `realFight.test.ts` and `fightRecorder.test.ts`.
  - Measure: the mechanics and mobile verify gates pass. The PR body carries the before and after medians of the first five fights' turns.
