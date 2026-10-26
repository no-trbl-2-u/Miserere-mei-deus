# Hazard — `MapEventKind: hazard`

## 1. What this screen is for

A hazard node starts a hazard session (`state/actions.ts` → `beginHazardAction`); `<HazardGate>` (`components/HazardGate.tsx`) pushes `/hazard` (`app/hazard/index.tsx`). Play: pick a route (safe/risk), the dice roll, then drag cards from your hazard deck up into the play area, drag dice onto them, apply, PLAY the round. The board is drag-only (`components/hazard/HazardBoard.tsx`, "Touch model"): a drag stages and powers, a tap only reads; meters and sub-quests resolve to an outcome and a rewards pick. Engine: `axiomancer-mechanics/src/World/Hazard/*`.

## 2. Enter it directly

- Fixture: `/exploration?fixture=l30-bw-hazard-arrive` — L30 kit on the Breakwater's bw-3, `arrive: true` → lands on `/hazard`. `l30-bw-hazard` is the same spot without `arrive` (you are on the map; the node is already consumed as "here", so use a neighbour or the dev button).
- `/dev` (every section starts closed; `dev-section-<key>-toggle` opens one): under MINIGAMES & REWARDS (`dev-section-rewards-toggle`) `debug-hazard-button` (BRAVE IT) or `debug-hazard-id-<id>` for a specific authored hazard; under ENCOUNTERS (`dev-section-encounters-toggle`) `debug-trigger-encounter-hazard`. To shape the deck first, boot a fixture (`?fixture=l30-bw-hazard`) — the deck-shaping leaf was cut on 2026-10-16.
- Globals: `__AXM_MINIGAME_SEEDS__.hazard = { seed, hazardId }` or legacy `__AXM_HAZARD_SEED__` / `__AXM_HAZARD_ID__` (harness default `424242`, `cracked-cliff`); `__AXM_JUICE_INSTANT__`.

## 3. Test IDs

| testID | what it is |
|---|---|
| `hazard-empty` | Route mounted with no session (the screen pops back) |
| `hazard-route-select` | Route pick screen |
| `hazard-route-safe` / `hazard-route-risk` | The two routes (`HazardRouteKey`) |
| `hazard-opening-hand` | Preview of the opening hand on route select |
| `hazard-dice-roll` | Dice-roll overlay (auto-finishes after `DICE_ROLL_OVERLAY_MS` → `finishHazardRolling`) |
| `hazard-board` | The board |
| `hazard-meters` | Meters strip |
| `hazard-deck-counts` | Draw/discard counts |
| `hazard-dice-tray` / `hazard-die-<id>` | Dice |
| `hazard-hand` | The hand fan |
| `hazard-hand-<uid>` | One hand card: drag it up into `hazard-play-area` to stage it; a tap opens `hazard-card-detail` |
| `hazard-play-area` / `hazard-staged-<uid>` | Stage area and the staged card (a tap, or a drag out, returns it to hand) |
| `hazard-apply-<uid>` | APPLY the powered card |
| `hazard-applied-<uid>` | A card already applied this round |
| `hazard-trash` | Discard target |
| `hazard-play-button` | PLAY — resolve the round |
| `hazard-resolve-flash` | Resolve flash overlay; it stays until you press it |
| `hazard-card-detail` | Card detail modal |
| `hazard-ledger` | Ledger |
| `hazard-outcome` / `hazard-outcome-continue` | Outcome overlay; CONTINUE |
| `hazard-rewards` / `hazard-offer-<cardId>` / `hazard-card-preview` / `hazard-preview-confirm` / `hazard-preview-cancel` / `hazard-rewards-confirm` / `hazard-rewards-skip` | Reward pick |
| `hazard-reward-<id>` / `hazard-consequence-<id>` / `hazard-rewards-penalty` | Reward / consequence rows, route-penalty line |
| `hazard-stat-key` | Stat key legend |
| `hazard-remove-grid` / `hazard-remove-tile-<cardId>` / `hazard-remove-confirm` / `hazard-remove-close` / `hazard-remove-blocked` / `hazard-remove-blocked-dismiss` | Deck-thinning grid (from `/hazard-deck`, `hazard-deck-open-remove`) |

## 4. A correct play, step by step

1. `hazard-route-select` → `hazard-route-safe` (safest happy path).
2. Wait for `hazard-dice-roll` to finish and `hazard-board` to appear.
3. **Drag** a `hazard-hand-<uid>` up into `hazard-play-area` → it becomes `hazard-staged-<uid>` (a plain tap only opens `hazard-card-detail`). **Drag** a `hazard-die-<id>` of the card's colour onto it; press `hazard-apply-<uid>`. Use real pointer moves (down → several moves → up); `scripts/hazard-e2e.mjs` is the reference.
4. `hazard-play-button`; press `hazard-resolve-flash` to close it.
5. Repeat 3–4 until `hazard-outcome`; `hazard-outcome-continue`.
6. `hazard-rewards`: tap `hazard-offer-<cardId>` → `hazard-preview-confirm` → `hazard-rewards-confirm` (or `hazard-rewards-skip`). You return to the map.

## 5. Looks stuck but isn't

- `hazard-dice-roll` is an animation; it calls `finishHazardRolling` itself after `DICE_ROLL_OVERLAY_MS`. Set `__AXM_JUICE_INSTANT__` before boot if you cannot wait.
- `hazard-resolve-flash` has no timer: it waits for a press (`components/hazard/HazardOverlays.tsx` `ResolveFlashOverlay`). Press it to move on.
- `hazard-play-button` disabled: nothing applied yet, or a staged card still needs a die. Apply or trash it.
- A die refusing a card: colour mismatch. Use another die.
- `hazard-remove-blocked`: the deck is at its floor; dismiss it.
- `hazard-empty` for a frame while the gate pops back to the map is normal after `claimHazardRewards`.
- `setPointerCapture` console errors: synthetic-pointer artefacts.

## 6. Actually stuck

- `hazard-board` with no `hazard-hand-*` and no `hazard-dice-tray` for > 5 s after the roll.
- `hazard-play-button` enabled, pressed, and no `hazard-resolve-flash`, no phase change, no `action/resolveHazardRound` in the log.
- `hazard-outcome-continue` or `hazard-rewards-confirm` pressed and the overlay stays / the map never comes back.
- `hazard-empty` persisting on `/hazard` with no map behind it.
Record: hazard id (route-select title), route, round number, meters (`hazard-meters` text), last 30 `action` log lines, screenshot. Only then `globalThis.__AXM_SKIP_EVENT__()` — and file that as a finding.

## 7. Read the log

`__AXM_LOG__.tail(50, { domains: ['action', 'minigame', 'game'] })` (debug level for `action`):
- `action/beginHazard`, `action/selectHazardRoute`, `action/finishHazardRolling`, `action/stageHazardCard`, `action/powerHazardCard`, `action/applyHazardCard`, `action/resolveHazardRound`, `action/continueHazardAfterResolve`, `action/acknowledgeHazardOutcome`, `action/claimHazardRewards`.
- `nav/route-changed {pathname:'/hazard'}` then back to `/exploration`.
- `game/world:processed` when the node is consumed.
