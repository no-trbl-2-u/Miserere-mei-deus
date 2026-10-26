# Combat — `MapEventKind: encounter` (incl. boss)

## 1. What this screen is for

An encounter node resolves to a `combat-prelude` event. `<CombatGate>` (`components/CombatGate.tsx`) engages it at once and pushes the full-screen **`/combat-encounter` route**, which mounts `<CombatEncounterPanel>` (`components/combat/encounter/CombatEncounterPanel.tsx`) running the hazard-pattern combat (Spec 26b: stage a card, power it with a die the Color Law allows, APPLY, END PHASE). The panel's own summary ends the fight and the route leaves. Rules live in `@mechanics`; the panel keeps engine state in local React state, so `state.combat` stays `null` for the whole fight (`app/(tabs)/exploration/index.tsx` Phase 200 comments).

## 2. Enter it directly

- Fixture: `/exploration?fixture=sage-bw-door-gate` — Sage L15 on bw-15, door fight **bw-17** one step away. No `arrive`, so you land on the map; tap `node-bw-17` → `node-confirm-go`. `fresh-start` gives the first fight (tap the first glowing node).
- `/dev` → open ENCOUNTERS (`dev-section-encounters-toggle`; every `/dev` section starts closed, `dev-section-<key>-toggle` opens it) → `debug-trigger-encounter-encounter` (gentlest foe) or `debug-trigger-encounter-boss`; `debug-enemy-map-<map>` then `debug-enemy-<enemyId>` for a specific foe. Both push `/(tabs)/exploration` and fire the prelude; `<CombatGate>` engages it and pushes `/combat-encounter`.
- `/combat-encounter` is the live fight and holds only a staged fight: opened cold it leaves for the map (`combat-encounter-empty` for that frame). Scripts enter a fight through `scripts/live-fight-entry.mjs`.
- Aftermath panels alone: `/devaftermath?panel=defeat|parley` (`devaftermath-panel`).
- Globals: `__AXM_COMBAT_SEED__` (the live fight's engine seed, dev builds only), `__AXM_DICE_INSTANT_SETTLE__` and `__AXM_JUICE_INSTANT__` (skip roll/juice animations).

## 3. Test IDs

| testID | what it is |
|---|---|
| `combat-encounter-live` | The live fight route (`/combat-encounter`) |
| `combat-reveal` | Pre-fight reveal (foe, phases, your vitae) |
| `combat-reveal-phase-<i>` | One phase card on the reveal |
| `combat-enter` | ENTER — starts the fight and rolls the first tray |
| `combat-withdraw` | WITHDRAW on the reveal — flee the fight |
| `combat-board` | The board |
| `combat-hud` | Enemy HUD block (vitae, intent) |
| `combat-intent` | Enemy intent icon |
| `combat-dice-tray` | Your rolled dice |
| `combat-die-<id>` | One die (`components/combat/encounter/CombatDie.tsx`); tap gesture is `combat-die-tap-<id>` |
| `combat-dice-skip` | Skip the roll ritual |
| `combat-hand` | Hand strip |
| `combat-hand-<uid>` | One card in hand; **tap reads it** (`combat-card-detail`), **drag to `combat-play-area` stages it** |
| `combat-play-area` | Stage area |
| `combat-staged-<uid>` | The staged card |
| `combat-staged-die` | The die socket on the staged card |
| `combat-apply-<uid>` | APPLY the powered card |
| `combat-trash` | Discard target |
| `combat-drop-reject` | Flash when a die is dropped on a wrong-colour card |
| `combat-signature-<id>` | Signature buttons |
| `combat-end-phase` | END PHASE (the wide button at the right of the footer dock) — closes your turn, enemy acts, tray re-rolls |
| `combat-end-consequence` | Consequence line shown above END on a dead tray |
| `combat-rail` / `combat-rail-vitae` / `combat-rail-vitae-bar` / `combat-ledger` | Footer dock: VITAE value, fill bar and phase ledger |
| `combat-player-medallion` | The player avatar at the left of the footer dock; tap opens `combat-pilgrim-modal` |
| `combat-pilgrim-log` / `combat-log` / `combat-pilgrim-log-back` / `combat-pilgrim-close` | Combat log, inside the pilgrim modal: LOG opens it, BACK returns to the stats |
| `combat-card-detail` / `combat-card-detail-close` | Card detail modal (deliberate; has a dismiss) |
| `combat-mercy` / `combat-mercy-spare` / `combat-mercy-exploit` | Mercy choice when the foe breaks |
| `combat-rewards` / `combat-reward-<cardId>` / `combat-reward-preview` / `combat-reward-preview-select` / `combat-reward-preview-close` / `combat-reward-confirm` / `combat-reward-skip` | SPOILS card pick |
| `combat-summary` / `combat-summary-close` | Post-fight summary; Continue ends the fight and the route leaves for the map (`app/combat-encounter/index.tsx` `onExit`; after a defeat the run resets first, keeping the character) |
| `combat-friendship-panel` / `combat-friendship-panel-part-as-friends` | Parley seal; only `/devaftermath?panel=parley` mounts it, not the live fight |
| `combat-defeat-panel` / `combat-defeat-panel-begin-again` | Defeat seal; only `/devaftermath?panel=defeat` mounts it, not the live fight |
| `combat-encounter-empty` | The route opened with no staged fight (it leaves at once) |

## 4. A correct play, step by step

1. Wait for the URL `/combat-encounter` then `combat-reveal`, then press `combat-enter`.
2. **Drag** a `combat-hand-<uid>` into `combat-play-area` → it becomes `combat-staged-<uid>`. A plain tap only opens `combat-card-detail` — close it with `combat-card-detail-close`.
3. **Drag** a `combat-die-<id>` whose colour matches the card onto `combat-staged-<uid>`; success shows `combat-staged-die`. A die whose aria-label says `MISS face` powers nothing — pick another. A wrong colour flashes `combat-drop-reject`. Use real pointer moves (down → several moves → up); `scripts/combat-round-e2e.mjs` `dragTo` is the reference.
4. Press `combat-apply-<uid>`. Repeat 2–4 while dice remain, or discard via `combat-trash`.
5. Press `combat-end-phase`; the enemy acts (its lunge plays and the damage floats rise), the tray re-rolls.
6. Repeat until the foe breaks. Answer `combat-mercy-spare`/`-exploit` if asked.
7. Pick a reward (`combat-reward-<cardId>` → `combat-reward-confirm`) or `combat-reward-skip`; press `combat-summary-close`. The route leaves at once and you are back on the map; no seal or carry-on panel follows.

## 5. Looks stuck but isn't

- Dead foe (0 vitae) with the board still up: SPOILS (`combat-rewards`) then `combat-summary` render over it; Continue closes it (PLAYTEST_BUGS_2026-09-18 "ruled out").
- `combat-card-detail` / `combat-reward-preview` covering the board are deliberate modals — use their `-close` (or `-select`).
- Dice do nothing right after ENTER / END PHASE: the roll ritual is animating (`state/combat/dice-roll-ritual.ts`); wait, or set `__AXM_DICE_INSTANT_SETTLE__` before boot. `combat-dice-skip` also ends it.
- Impact/shake/number-pop pauses (`lib/juice`): set `__AXM_JUICE_INSTANT__` or wait ~1 s.
- A die that will not drop on a card: colour mismatch (`combat-drop-reject`) — try another die or card, not the same one again.
- `setPointerCapture` console errors: artefacts of synthetic pointer events, not a bug.
- The header VITAE bar under the seal is hidden on purpose during combat.
- Reloading mid-fight restarts the same foe from the top (owner call 2026-09-25, `selectResumableFight`); not a loss of state.

## 6. Actually stuck

- `combat-reveal` never appears after tapping a boss/encounter node and the map is idle: no prelude fired — check `action/resolveCurrentMapEvent` and `game/world:moved` in the log.
- Board with no `combat-hand-*`, no dice, no `combat-end-phase`, and no overlay for > 5 s (with instant globals set).
- `combat-summary-close` pressed and the summary stays, or the URL stays `/combat-encounter`.
- `combat-encounter-empty` outside the sandbox, or `error-boundary-screen`.
Record: fixture/trigger used, foe name (`combat-reveal` or `combat-hud`), turn count, the last 30 `combat` + `action` log lines, a screenshot. If you must move on, call `globalThis.__AXM_SKIP_EVENT__()` (dev-only) and file that as a finding in its own right.

## 7. Read the log

`__AXM_LOG__.tail(50, { domains: ['combat', 'game', 'action'] })`:
- `combat/encounter-mounted`, `combat/encounter-exited` — the panel's lifetime.
- `combat/end-phase:begin`, `combat/end-phase:threat-resolved`, `combat/end-phase:tray-rolled`, `combat/end-phase:turn-closed` — one END PHASE.
- `game/combat:started`, `game/combat:ended`, `game/character:levelup`.
- `action/beginHazardEncounter`, `action/fleeEncounter`, `action/resolveCurrentMapEvent` (debug level).
- `error/react-boundary` means the panel crashed.
