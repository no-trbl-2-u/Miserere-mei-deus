# 140 — The enemy's action clip always plays, with any flinch after it

> Every move an enemy takes plays its action clip from first frame to last. A flinch from that turn, whether a damage-over-time tick or thorns, waits until the clip ends.

## Why

### Sources

- `/pitch` then `/plot asap` from T, 2026-11-02, attended. The pitch is `braindump/2026-11-02-enemy-action-clip.md`.
  T's words:
  - "I'm not always seeing the enemy's attack. It seems like it's getting overridden with damage ticks they're taking
    at turn start. I want to determine a way to have them always show their attack animation"
  - "I just want to see their action animation without it being interupted by their flinch if they have DoT tick cause
    them to flinch. Thorns for instance, they can flinch again AFTER their action animation."
  - Asked which moves play the clip, T picked every move over damaging moves only.

### What is wrong today (read and probed 2026-11-02, at 8a78eaed3)

The ticks do not hide the action. The check for "the enemy swung" almost never passes, so most enemies start no swing
at all, and a turn-start tick's flinch is the only motion left on that turn.

`isEnemyAttackBeat` (`axiomancer-mobile/components/combat/frames/enemyAttackBeat.ts:53`) passes on
`playerDamage > 0 || (threatFired && intentDamage > 0)`, and both routes are broken:

- **`playerDamage`** counts `damage-dealt` with target `self`. No engine site emits that event, so it is always 0. Pane
  tests stayed green because they hand-write it (`CombatCombatantPane.frames.test.tsx:82`).
- **`intentDamage`** is `enemy.intent.damage` on the commit where the phase has already advanced
  (`CombatCombatantPane.tsx:554`), so it describes the next move. A `phases` foe always reports 0 there
  (`state/presenters/combat-encounter.engine.ts:1186`).

When both beats do fire, the flinch plays at once and the swing cuts in at 100 ms
(`useEnemyClipSelection.ts:152`), which is the reverse of T's order.

Scratch probe, not committed: the real engine, the 17 framed enemies, 24 turns each, no cards played, with the pane's
check applied by hand to each turn's events.

| Finding | Data |
|---|---|
| Enemy turns | 408 |
| Turns with `threat-fired` | 408 |
| Turns where the move had a hit | 202 |
| Turns the current check would swing | 24, all Death Beholder |
| Framed enemies that would never swing | 16 of 17 |
| `damage-dealt` target `self` events | 0 |

## Design

This is a presentation fix in `axiomancer-mobile`. No rules change, and the engine's events stay as they are.

**The action beat.** `threat-fired` is the one signal. `combat.engine.ts` emits it for any move that was not hindered,
so a stunned enemy fires nothing and plays nothing. `isEnemyAttackBeat` becomes `isEnemyActionBeat({ threatFired })`,
and the pane stops passing `playerDamage` and `intentDamage` to it. The clip name stays `attacking`, the manifest key
all 17 sets ship under, and the `attackBeat` counter keeps its name.

**The order, in `useEnemyClipSelection`.** The action clip starts at the existing impact offset
(`ENEMY_ATTACK_IMPACT_MS`). When a struck beat belongs to the same resolution, or arrives while an action clip is
pending or playing, the flinch is held and starts when the action clip's own length has run. The hook's play token
keeps one return to rest. Several struck beats held across one action give one flinch.

| Case | What plays |
|---|---|
| Move, no damage to the enemy | action, then idle |
| Tick at the enemy's turn start, then its move | action, then flinch, then idle |
| Move, thorns or REFLECT answer it | action, then flinch, then idle |
| Tick and thorns on one turn | action, then one flinch, then idle [T to confirm #1] |
| Stunned turn with a tick | flinch only, on today's wait for the board's card motion |
| Player's own card lands | flinch on today's wait for the board's card motion |
| Reduced motion | no clip, as today |

The timing fits the existing lock. An action clip of 8 frames at 12 fps runs 667 ms, ending at about 767 ms with its
offset, inside `RESOLVE_LOCK_MS` (1100 ms), so a card played next turn cannot reach it. A flinch after it ends at about
1267 ms and can be replaced by the player's next card, as flinches already are.

### Decisions made upfront (do not ask)

- Every enemy has three clips: idle, flinch (`struck`), action (`attacking`). T, 2026-11-02.
- A flinch never interrupts the action clip. T, 2026-11-02.
- Every fired move plays the action clip, heals and buffs included. This overturns the phase AN1b rule that a
  non-attack threat is not a swing, and the test pinning it flips. T, 2026-11-02 (D?enemy-action-clip).
- Clip only. T: "I just want to see their action animation".

### Out of scope

- The lunge, board shake, red flash and player medallion reaction, which wait on `damage-dealt` target `self`
  (`CombatCombatantPane.tsx:346,574`). By reading, they do not fire on a real enemy hit. They are a follow-up.
- The DENIED float at `CombatCombatantPane.tsx:587`, which still reads `enemy.intent.damage`. By reading, it floats on
  Death Beholder hits that land. Also a follow-up.
- Rewriting the hand-written fixtures in other pane tests.
- Cards, keywords and art (D88, D99). The frame sets are used as drawn; whether the clip suits a non-attack move is
  T's call on the device.

## Acceptance

- **A1** For each of the 17 framed enemies over 24 turns with no cards, every turn with `threat-fired` is an action
  beat (24 of 408 today).
- **A2** A hindered turn (no `threat-fired`) selects no action clip.
- **A3** On a turn with a damage-over-time tick and a fired threat, `attacking` runs its full clip length and `struck`
  starts only when it ends.
- **A4** Thorns or REFLECT damage on the enemy's turn follows A3, and a tick plus thorns gives one flinch after the
  action. [T to confirm #1]
- **A5** A flinch on the player's own card play keeps today's wait for the board's card motion, and reduced motion
  still selects no clip.
- **A6** The tests for A1 to A4 take their events from `resolveThreatPhase`, not hand-written ones, at least once
  through a rendered `CombatCombatantPane` on a framed enemy.

## Open questions

1. A tick and thorns on one turn give one flinch after the action, not two. [T to confirm #1]
2. A move whose thorns kill the enemy may have its action clip cut by the victory screen. Default: leave it as is; not
   checked by this plot. [T to confirm #2]

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **140.1** The enemy's action clip always plays, with any flinch after it · M · closes A1, A2, A3, A4, A5, A6 · needs — · alias: AN6a

### 140.1 (AN6a) — The enemy's action clip always plays, with any flinch after it · M · closes A1-A6 · requires —

- `components/combat/frames/enemyAttackBeat.ts`: the gate becomes `isEnemyActionBeat({ threatFired })`; update its
  header comment and `index.ts`'s export path if needed.
- `components/combat/encounter/CombatCombatantPane.tsx`: the walk at the fx effect calls it with `threatFired`. The
  lunge, shake, flash and DENIED branches stay untouched.
- `components/combat/frames/useEnemyClipSelection.ts`: hold the flinch behind the action clip, per Design's table, and
  rewrite the header's "THE ORDER OF THE TWO" paragraph to match.
- Tests:
  - `frames/__tests__/enemyAttackBeat.test.tsx`: the non-attack case flips; the dead-signal cases go.
  - `frames/__tests__/useEnemyClipSelection.test.tsx`: "flinches first, then swings" becomes action, then flinch.
  - A new pane suite beside `CombatCombatantPane.crane-hook.test.tsx`, reading the live cell's row the way that file
    does, with events from `resolveThreatPhase` (A6).
  - A table test over `EnemyLibrary`'s framed enemies for A1.
- Measure: `npx jest components/combat` in `axiomancer-mobile`, then `npm run verify -w axiomancer-mobile`.
- T checks it on the preview build at the Mid-MVP check.
