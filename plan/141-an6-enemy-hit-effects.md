# 141 — A landed enemy hit shows it landed

> When an enemy's move hurts the player, the lunge, board shake, red flash and medallion reaction fire. DENIED floats only when a move was really stopped, and a riposte makes the enemy flinch.

## Why

### Sources

- `/plot` from T, 2026-11-02, attended, on the follow-ups spec 140 left out of scope. T: "Yes, plot them"; asked about the
  full-pane flash and shown its numbers: "Yeah, plot it".

### What is wrong today (read 2026-11-02, at 13734f52a with PR #1333's branch)

The engine never says a hit landed. `resolveThreatPhase` lowers the player's health at `combat.engine.ts:1474` and emits
no event for it, while every hit effect waits on `damage-dealt` target `self`, which no engine site emits. Spec 140's
scratch probe measured it: 202 enemy turns whose move had a hit, 0 such events. Pane tests stayed green because they
hand-write the event.

What that leaves silent, by reading; none of it was watched on screen:

- `CombatCombatantPane.tsx:571`: the enemy's lunge, the board shake and the red flash.
- `CombatCombatantPane.tsx:359`: the medallion's recoil, flash, squash and contact slash, its `-N` float and heavy haptic.
- The combat log's "It deals N to you" (`combat-encounter.engine.ts:979`).

Three more readers are wrong for the same reason:

- **DENIED** (`CombatCombatantPane.tsx:584`) floats on `threatFired && enemy.intent.damage > 0`. By then the intent is
  the next move's, so it can float on a hit that landed, and it misses a full block when the next move is not an attack.
- **BLOCKED N** (`CombatCombatantPane.tsx:361`) is `enemyIntentDamage - dmg`, the next move's damage minus this hit. It
  has never shown, and would show a wrong number once hits report.
- **Riposte** (`riposte-fired`, `combat.engine.ts:1568`) is read by no one on the mobile side: no flinch, no float, no log line.

## Design

**The event.** Inside the `if (dmg > 0)` of `resolveThreatPhase`, once the death ward's clamp has run and the hit has
applied, push `{ kind: 'damage-dealt', cardId: enemy.id, target: 'self', amount: dmg, blocked }`. `blocked` is a new
optional field: what riposte's parry, GUARD and BARRIER took off this hit (`preSoakDmg - dmg`, before the clamp). A
delayed hit is already one of the move's effects, so it is covered. LEECH already reports as a `dot-tick` and stays one.

`cardId: enemy.id` finds no card, so the log reads "It deals N to you." with no suffix, and the `threat-fired` line
already names the move.

**The pane.**

- The existing `playerDmg > 0` and `dmg > 0` branches run untouched on the real event. The action clip and the lunge
  already share the impact beat.
- `landHit` takes its blocked number from the events' `blocked` sum, and `PlayerMedallion` loses `enemyIntentDamage`.
- DENIED floats on `denied || (playerDmg === 0 && the fired move's own effects hold a hit)`, read from
  `threat-fired.effects`, never from `enemy.intent`. A heal or buff move floats nothing.
- `riposte-fired` adds to the walk's `spikeDmg`, so its flinch follows spec 140's order, after the action clip.
- `selectCombatLogLines` gets a `riposte-fired` line in the spike line's shape: `RIPOSTE deals N back to the foe.`, float
  `RIPOSTE −N`.

| Case | What shows |
|---|---|
| Hit gets through | lunge, shake, flash, medallion reaction, `-N`, haptic, log line |
| Hit partly blocked | the same, plus `BLOCKED N` with the true number |
| Every hit fully blocked | DENIED, no hit effects |
| Stunned turn | DENIED, as today |
| Heal or buff move | action clip only |
| Riposte fires | DENIED for the blocked blow, `RIPOSTE −N`, flinch after the action clip |
| Reduced motion | no lunge, shake or flash; floats and log stay, as today |

### Decisions made upfront (do not ask)

- The red flash stays as built: a flat `HUE.woundVignette` tint over the whole pane, peak opacity 0.4 times the hit's
  share of max VITAE, floored at 0.04. T saw these numbers, 2026-11-02. Its look is for T's play, not this chunk.
- The engine reports the hit; the pane does not diff health. A diff could not tell a hit from a sacrifice or a tick
  (D?enemy-hit-event).
- No rule, number or outcome changes. The event is additive, and the kind is already in `COMBAT_EVENT_KINDS`.
- BLOCKED counts only hits that got through. A fully blocked hit is DENIED's business.
- The riposte float and log line ride along: T saw them listed before saying "Yeah, plot it".

### Out of scope

- Any change to how the flash, shake or lunge look.
- A medallion reaction for ticks, sacrifices or LEECH.
- The hand-written fixtures in other pane tests, which stay valid now that the event is real.

## Acceptance

- **A1** For each of the 17 framed enemies over 24 turns with no cards, the `amount`s of a turn's `damage-dealt` target
  `self` events plus its `dot-tick` target `self` events equal the player's health lost on that turn, from
  `resolveThreatPhase` (0 of 202 hit turns report today).
- **A2** Through a rendered `CombatCombatantPane` on engine events, a hit that gets through fires the enemy's lunge, the
  board shake and flash, and the medallion's reaction and `-N` float.
- **A3** A partly blocked hit floats `BLOCKED N` where N is what GUARD, BARRIER and the parry took, whatever the next
  move's damage is.
- **A4** DENIED floats on a hindered turn and on a fully blocked attack, and does not float on a hit that landed or on a
  move with no hit, whatever the next move is.
- **A5** A real riposte (the Defender's Riposte card) floats `RIPOSTE −N`, adds its log line, and flinches the enemy
  after the action clip.
- **A6** The log reads "It deals N to you." once per hit. `npm run verify -w axiomancer-mechanics` stays green with no
  edit to a rules test's expected outcome, and `docs/reports/measured/latest.md` is not regenerated by this chunk.
- **A7** Reduced motion selects no lunge, shake or flash, and the floats and log line still show.

## Open questions

None.

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **141.1** A landed enemy hit shows it landed · M · closes A1, A2, A3, A4, A5, A6, A7 · needs 140.1 · alias: AN6b

### 141.1 (AN6b) — A landed enemy hit shows it landed · M · closes A1-A7 · requires 140.1

- `axiomancer-mechanics/src/Combat/combat.encounter.types.ts`: `blocked?` on `damage-dealt`.
- `axiomancer-mechanics/src/Combat/combat.engine.ts`: the event in `resolveThreatPhase`'s landed branch, with an engine
  test for A1.
- `components/combat/encounter/CombatCombatantPane.tsx`: BLOCKED, DENIED and riposte, per Design.
- `state/presenters/combat-encounter.engine.ts`: the `riposte-fired` line.
- Tests: a pane suite beside `CombatCombatantPane.action-clip.test.tsx` that takes its streams from `endTurn` and
  `resolveThreatPhase` the same way.
- Measure: `npm run verify -w axiomancer-mechanics`, then `npm run verify -w axiomancer-mobile`. Run the mobile gate where
  no dev server has generated `axiomancer-mobile/expo-env.d.ts`: that file turns `tsc` red on `useDockDrag.tsx`.
- T judges the look at the Mid-MVP check.
