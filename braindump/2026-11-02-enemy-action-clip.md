# Enemy action clip always plays — 2026-11-02

## Surface question
"I'm not always seeing the enemy's attack. It seems like it's getting overridden with damage ticks they're taking at turn start. I want to determine a way to have them always show their attack animation"

## Better question surfaced
The ticks are not what hides the action. The pane's check for "the enemy swung" almost never passes, so on 16 of the 17 framed enemies no swing starts at all. A turn-start tick still triggers the flinch, which makes the flinch the only motion on that turn and reads as an override. So the work is two changes: make every enemy move start the action clip, then make sure no flinch can cut it, with that turn's flinch playing afterwards.

## Path taken this session
1. Opened converging: a named surface and a stated problem, with the cause assumed. A probe of the real engine replaced the assumed cause.
2. t1: "every attack plays its clip". t2: T added the flinch order (strict narrowing). t3: T widened "attack" to every move.
3. Parked: the lunge, shake, flash and medallion reaction, which wait on the same dead event; the false DENIED float.

## Raw material read
- `axiomancer-mobile/components/combat/frames/enemyAttackBeat.ts:53`: the swing check, `playerDamage > 0 || (threatFired && intentDamage > 0)`.
- `axiomancer-mobile/components/combat/encounter/CombatCombatantPane.tsx:554`: passes `enemy.intent.damage` on the commit where the phase has already advanced, so it describes the next move.
- `axiomancer-mobile/state/presenters/combat-encounter.engine.ts:1186`: `phases` foes always report intent damage 0.
- `axiomancer-mechanics/src/Combat/combat.engine.ts:1603`: `threat-fired` is emitted for any move that was not hindered. No engine site emits `damage-dealt` with target `self`.
- `axiomancer-mobile/components/combat/frames/useEnemyClipSelection.ts:152`: when both beats share a resolution, the flinch plays at once and the swing cuts in at 100 ms.
- `axiomancer-mobile/components/combat/encounter/__tests__/CombatCombatantPane.frames.test.tsx:82`: pane tests hand-write `damage-dealt` target `self`, which is why they stayed green.
- `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx:104`: `RESOLVE_LOCK_MS = 1100`, so input stays locked past the end of the action clip.
- `axiomancer-mobile/assets/images/enemies/frames.ts`: every set names `idle`, `struck` and `attacking`.

## Measured
Scratch probe, not committed: the real engine at 8a78eaed3, the 17 framed enemies, 24 turns each, no cards played. The swing column applies the pane's check by hand; the pane itself was not rendered.

| Finding | Data |
|---|---|
| Enemy turns | 408 |
| Turns with `threat-fired` | 408 |
| Turns where the move had a hit | 202 |
| Turns the current check would swing | 24, all Death Beholder |
| Framed enemies that would never swing | 16 of 17 |
| `damage-dealt` target `self` events | 0 |
| Action clip length | 8 frames at 12 fps, 667 ms (one set at 14 fps, 571 ms) |
| Flinch clip length | 8 frames at 16 fps, 500 ms |

Action plus its 100 ms offset ends at about 767 ms, inside the 1100 ms input lock, so a card played next turn cannot cut it. A flinch after it ends at about 1267 ms, slightly past the lock.

## Prior art consulted
The knowledge base search (cards scope) returned nothing on animation staging. Both cases are memory reads, not KB citations.
- **Slay the Spire — sequential action queue:** poison loss resolves at the start of the monster's turn and its move plays as a later queued step, so neither overlaps; no confident read on reception of this detail.
- **Hearthstone — sequenced combat phases:** triggered effects wait for the attack in progress to finish before they show; no confident read on reception of this detail.

## Rulings (T, this session)
- Every enemy has three clips: idle, flinch (`struck`), action (`attacking`) (t2).
- A flinch never interrupts the action clip. A DoT tick or thorns flinch plays after it (t2).
- Every move plays the action clip, including heals and buffs. This overturns the phase AN1b rule that a non-attack threat is not a swing (t3).

## Directions considered
### Option A — Action first, flinch after *(chosen by T's t2 ruling)*
On a turn with a fired threat, the action clip plays from its first frame and the flinch waits until it ends. **Trade-off:** a tick that happened first in the engine shows second on screen. **Telltale failure mode:** an enemy flinching with no visible cause after a heal, because the tick's number floated long before.
### Option B — Flinch in full, then action
Matches the engine's order. **Trade-off:** about 500 ms more per turn, and the hit feedback must wait too. **Telltale failure mode:** the VITAE bar drops before the enemy moves. Offered at t1; T's ruling points the other way.
### Option C — Action wins, no flinch that turn
The cleanest read. **Trade-off:** the enemy ignores poison on its own turn. **Telltale failure mode:** DoT feels weightless. Rejected at t2: T wants the flinch after.

## What proves it (not T, not the agent)
A jest suite in `axiomancer-mobile` that gets its events from `resolveThreatPhase`, not hand-written ones. A pass: for every framed enemy, each turn with `threat-fired` selects `attacking`, and that clip runs its full length with no `struck` until it ends.

## Player fantasy
The player believes they are facing something that takes its turn: it acts, and only then shows what the poison and thorns cost it.

## Telltale failure mode
A heal or buff looking like a strike, because every move uses a clip drawn as an attack. It would show first on the moves with no hit, such as `defend` and `status` intents.

## Content boundary
No cards, keywords or art change. The 17 frame sets are used as drawn. Whether a clip suits a non-attack move stays T's call on the device.

## Handoff to /plot
Task: Make the enemy's action clip play in full on every move it takes, with any flinch from that turn after it, so that T always sees the enemy act, proven by a jest suite driving real engine events.
Source: this file
Acceptance:
- A1 For each of the 17 framed enemies over 24 turns with no cards, every turn with `threat-fired` selects `attacking` (408 of 408 in the probe's setup; 24 today).
- A2 A hindered turn (no `threat-fired`) selects no action clip.
- A3 On a turn with a DoT tick and a fired threat, `attacking` runs its full clip length and `struck` starts only when it ends.
- A4 Thorns or REFLECT damage on the enemy's turn follows A3, and a tick plus thorns gives one flinch after the action.
- A5 A flinch on the player's own card play keeps today's wait for the board's card motion; reduced motion still selects no clip.
- A6 The new suite takes its events from `resolveThreatPhase`, not hand-written ones.
Measure: `npx jest components/combat` in `axiomancer-mobile`, with the A1 suite passing.
Decisions made upfront: three clips per enemy; a flinch never interrupts the action clip; every fired move plays it, overturning the AN1b rule and its test in `enemyAttackBeat.test.tsx`; clip only, no lunge, shake, flash or medallion work.
Out of scope: the lunge, shake, flash and medallion reaction, which wait on `damage-dealt` target `self`; the DENIED float at `CombatCombatantPane.tsx:587`, which by reading floats on Death Beholder hits that land; hand-written fixtures in the other pane tests.
To confirm: a tick and thorns on one turn give one flinch after the action, not two [T to confirm]; a move that kills the enemy through thorns may have its clip cut by the victory screen, default leave as is, not checked [T to confirm].
Suggested slot: asap, because the MVP demo due Nov 16 shows Chapter 1's enemies and the fix is small.
