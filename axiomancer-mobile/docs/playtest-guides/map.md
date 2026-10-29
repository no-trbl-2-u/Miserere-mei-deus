# Map — `travel`, the exploration tab, reachability, camera

## 1. What this screen is for

`app/(tabs)/exploration/index.tsx` draws the current map (`selectExplorationViewModel`, `state/presenters/exploration.engine.ts`) inside a pannable/pinchable `<MapCanvas>` (`components/exploration/MapCanvas.tsx`). Tapping a glowing node opens `<NodeConfirmPanel>`; TRAVEL HERE calls `actions.moveTo` then `resolveCurrentMapEvent`, which hands off to the other guides. A `travel` node is a door: the engine moves you to the next map, the app toasts "You cross into <region>." and saves — nothing to play (`state/actions.ts`). The screen also settles owed arrivals (start node, reload mid-move) on mount.

## 2. Enter it directly

- Any fixture without `arrive` lands here: `sage-bw-door-gate` (bw-k1; chapter boss bw-k2 adjacent; the far-bank door bw-b2 lies past the bridge bw-b1), `fresh-start`, `broke-l1-bw-rest`, `l30-bw-hazard`.
- `/dev` (every section starts closed; `dev-section-<key>-toggle` opens one), under WORLD (`dev-section-world-toggle`): `debug-travel-map-<map>` (start node of any map), `debug-travel-node-<id>` (jump + fire that node's event; travel doors in red), `debug-map-reset-button`, `debug-map-complete-button`, `debug-aporia-act1|2|3` (→ `/labyrinth`).
- Node kinds (`ExplorationNode.kind`): `available` (glowing, tappable), `current`, `completed`, `locked`. Only `available` opens the confirm panel. Reachability is the no-back-travel rule: a node is available only if adjacent to where you stand and not yet walked.
- No seed globals; `__AXM_JUICE_INSTANT__` is irrelevant here.

## 3. Test IDs

| testID | what it is |
|---|---|
| `map-canvas-wrapper` / `map-canvas` | The viewport and the pannable canvas (pan gesture id `map-pan`) |
| `map-backdrop` / `map-vignette` | Art plate and vignette |
| `map-recenter` | RECENTRE — re-fit the camera on current + available nodes |
| `map-overlays-fixed` / `map-legend` / `map-legend-keys` / `map-legend-count` | Viewport-fixed legend |
| `node-<id>` | A map node; accessibility label says sealed / walked / here |
| `node-confirm-panel` | Selected-node sheet |
| `node-confirm-go` | TRAVEL HERE |
| `node-confirm-cancel` | Close the sheet |
| `exploration-node-toast` | 2 s toast ("This path is sealed." / "walked already" / "you stand here") |
| `combat-encounter-live` | A fight, on its own `/combat-encounter` route over the map (see combat.md) |
| `self-dev-tools-link` | On the SELF tab — the way to `/dev` |

## 4. A correct play, step by step

1. Read `map-legend-count` / node labels; find a `node-<id>` that is `available` (glowing, pulsing).
2. Tap it → `node-confirm-panel` shows its name and kind.
3. `node-confirm-go`. The move commits (`game/world:moved`), then the node's event fires — follow the matching guide. A `travel` door just toasts and redraws the next map.
4. After the event, you are back here with new `available` nodes. If they are off-screen, `map-recenter`.

## 5. Looks stuck but isn't

- Tapping a sealed/walked/current node "does nothing": it raises `exploration-node-toast` for 2000 ms, then clears (PLAYTEST_BUGS_2026-09-18 "ruled out").
- TRAVEL HERE is not lost: the move applies in-session; only persistence of it was BUG-03.
- Nodes off-screen after a move: the camera deliberately never fights a manual pan (issue #294); press `map-recenter`.
- Pinch/pan clamp: scale is clamped between `minScaleFor` (0.6, or lower on a big plate — never below the whole plate in frame) and 3; a pan that seems to "stop" hit nothing — there is no pan bound, so `map-recenter` if lost.
- A fixture boot (`?fixture=`) or a `/dev` JUMP owes no arrival — the map draws quietly; that is correct (only the start node and an interrupted move fire on mount).
- A `travel` node consumed nothing and left the old map "incomplete": travel never consumes; the region toast + save is the whole event.
- `setPointerCapture` console errors: synthetic pointer artefacts.

## 6. Actually stuck

- No `available` node, no open session, no overlay, and `node-confirm-go` never enabled (zero reachable nodes with the map not complete).
- `node-confirm-go` pressed, `action/moveTo` logged with `moved:false`, no toast.
- `game/world:moved` logged but the node's event never fires and the map never draws new options.
- `travel` door toast never appears and `vm.region` does not change.
Record: map id + node id (`node-<id>`), the set of node ids visible, `map-legend-count`, last 30 `action`+`game`+`nav` lines, screenshot of the whole canvas after `map-recenter`. `globalThis.__AXM_SKIP_EVENT__()` is for a stuck *event*, not a stuck map — if the map itself has no move, that is the finding.

## 7. Read the log

`__AXM_LOG__.tail(40, { domains: ['action', 'game', 'nav', 'persistence'] })`:
- `action/moveTo`, `action/resolveCurrentMapEvent`, `action/jumpToNode`, `action/travelToMap` (debug level).
- `game/world:moved` (the step), `game/world:processed` (node consumed), `game/game:saved` after a travel door.
- `nav/route-changed {pathname:'/exploration'}` (tab path may include `/(tabs)`).
- `persistence/fixture-boot` on a fixture run; `persistence/fixture-boot-ignored` means dev tools are off and the fixture was dropped.
