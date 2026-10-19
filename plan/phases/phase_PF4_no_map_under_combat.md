# Phase PF4 — No exploration map under live combat

> Agent-facing brief, plotted by T (`/plot`, 2026-10-14). Performance
> only: no rule, card, keyword, art or copy change (D37, D88). Ship
> without asking; record judgment calls in the commit body.

## Sources

- T's request, 2026-10-14: "I no longer want the exploration map
  rendering underneath combat", after T reported hazard drags are smooth
  on the Android APK while combat drags stay choppy.
- The session's comparison (2026-10-14): hazard is its own
  `fullScreenModal` route (`app/_layout.tsx`, `hazard/index`), so the
  native stack stops drawing the map behind it. Live combat is
  `<CombatEncounterPanel>` inside `<EncounterModalOverlay>`, rendered
  inside `app/(tabs)/exploration/index.tsx` on top of a still-mounted
  `MapCanvas` (sheet SVG, `NodeGrid`, a `withRepeat` pulse per node in
  `ExplorationNode.tsx:84`), `NodeConfirmPanel`, `EventBadge` and the
  region header. PR #510's agent report named the same layer.
- `components/event/EncounterModalOverlay.tsx`: modes `prelude`,
  `combat`, `aftermath`; the backdrop is `AXM.nodeBg` faded 0 to 1 over
  280ms; its comment cites the design target "map persists at 35%
  opacity behind every modal".
- Decisions: **D77** (perf measured and reported), **D84** (code by
  `loop:pr` PR), **D93** (this plot lands by PR), **D37/D88** (no content
  touched).

## Outcome

While a fight is on screen, the exploration screen mounts nothing but the
encounter overlay: no map canvas, no node grid or pulses, no confirm
panel, badge or header. The prelude and aftermath panels keep the map
behind them as designed, and the map comes back fitted on the player when
the encounter closes.

Size: S

## Acceptance

- **A1** `EncounterModalOverlay` reports its mode to its host through a
  new optional `onModeChange(mode)` prop, called on mount and on every
  mode change; omitting it changes nothing (the labyrinth and event
  hosts stay as they are).
- **A2** In `app/(tabs)/exploration/index.tsx`, while the overlay's mode
  is `combat`, `MapCanvas` (with `NodeGrid` and `MapOverlays`),
  `NodeConfirmPanel`, `EventBadge`, `NodeToast` and the region header are
  not mounted. A test asserts `map-canvas-wrapper` is absent in combat
  mode.
- **A3** In `prelude` and `aftermath` modes the map is mounted behind the
  overlay exactly as today. A test asserts `map-canvas-wrapper` is
  present in both.
- **A4** When the encounter closes (victory, defeat, flee, befriend) the
  map remounts and its camera fits the player's current node, the same
  fit a fresh visit gets. A resumed fight (`resumeFight`) after a reload
  enters combat mode with the map unmounted from the first frame.
- **A5** No store, save or engine change: the exploration view model and
  every selector are untouched. `npm run verify -w axiomancer-mobile`,
  `scripts/exploration-combat-roundtrip-e2e.mjs`,
  `scripts/combat-round-e2e.mjs` and `scripts/combat-encounter-e2e.mjs`
  pass.

**Measure:** `npm run verify -w axiomancer-mobile` and the three e2e
journeys pass with the new mode tests; on T's next preview APK, a combat
drag feels like a hazard drag (T's observation; the PF3 Sentry spans,
once live, give the numbers).

## Scope

`axiomancer-mobile` only:
- `components/event/EncounterModalOverlay.tsx`: the `onModeChange` prop.
- `app/(tabs)/exploration/index.tsx`: hold the reported mode; gate the
  map-side children on it.
- Tests beside the existing ones:
  `components/event/__tests__/EncounterModalOverlay.test.tsx` (A1) and a
  new or extended exploration-screen test (A2, A3, A4).

## Consumers to update

None. `app/labyrinth/index.tsx` and `app/event/index.tsx` also host the
overlay; they do not pass `onModeChange` and keep today's behaviour.

## Save / schema contracts

None.

## Carrier sweep

Not an R-phase. None.

## Decisions made upfront — DO NOT ASK

- **Hide during `combat` only, keep the map behind prelude and
  aftermath.** The 35% map behind every modal is a stated design target
  (`EncounterModalOverlay.tsx` backdrop comment), and the jank T reports
  is in the fight, where the combat panel covers the full screen.
- **Unmount, not hide with opacity or `display: none`.** Unmounting stops
  the node pulses and the SVG sheet outright; a hidden tree on Android
  can still animate and hold its views.
- **The camera re-fits on return.** `MapCanvas` keeps its camera in local
  shared values, so a pan the player made before the fight is not kept;
  the fit on the player's node is what a fresh visit shows, and after a
  fight the player is standing on that node. (T confirmed 2026-10-19)
- **Not a separate route.** Moving live combat to its own
  `fullScreenModal` like hazard would also work, but it moves the
  encounter state machine, the prelude/aftermath flow and the resume
  path. Gating the map is the smallest change that removes the cost.
- **`StatusCard`** is already hidden while the modal is up; it stays so.

## Tests matrix

- `EncounterModalOverlay.test.tsx`: `onModeChange` fires with `prelude`,
  then `combat` on fight, then `aftermath`; and with `combat` on mount
  when `resumeFight` is set.
- Exploration screen test: `map-canvas-wrapper` absent in combat mode,
  present in prelude and aftermath, present again after close.
- Existing e2e journeys unchanged and green.

## Verify gate

`npm run verify -w axiomancer-mobile`;
`node scripts/exploration-combat-roundtrip-e2e.mjs`;
`node scripts/combat-round-e2e.mjs`; `node scripts/combat-encounter-e2e.mjs`.
Mechanics untouched.

## Commit body template

```
perf(mobile): no exploration map under live combat

The overlay reports its mode; the exploration screen unmounts the map
canvas, node grid, confirm panel, badge, toast and header while the
fight is on screen. Prelude and aftermath keep the map behind them.
Acceptance A1-A5.
```

## DoD

A1 to A5 ticked.

## Follow-ups (out of scope)

- The labyrinth room scene under its encounter overlay
  (`app/labyrinth/index.tsx`; the Labyrinth is parked).
- Combat card art and the size of a pickup/drop re-render, the next two
  suspects from the 2026-10-14 comparison.
