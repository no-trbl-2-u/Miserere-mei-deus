# Phase PF3 — Sentry performance on preview builds, with combat drag spans

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-14). Tooling
> and instrumentation only: no gameplay, card, keyword or art change
> (D37, D88). Ship without asking; record judgment calls in the commit
> body.

## Sources

- T's request, 2026-10-14: "configure some type of performance analytics
  that could be logged somewhere so we can figure out what's going wrong
  where". T chose two layers of three: Sentry performance on preview
  builds, and per-drag spans. No profiling, no in-app perf log.
- `axiomancer-mobile/lib/monitoring.ts`: Sentry is already initialised on
  native with `tracesSampleRate: 0` ("crashes only"); the DSN and build
  profile come from `lib/buildProfile.ts`; `lib/monitoring.web.ts` is the
  web no-op twin.
- PR #510 (merged): the drag pipeline in
  `components/combat/encounter/CombatEncounterPanel.tsx` (`begin`, `end`,
  `finalizeDrag`, `useDragInterruptRecovery`) and the three drag kinds
  a/b/c named in `docs/perf/combat-drag-baseline.md`.
- Phase PF2 (`plan/phases/phase_PF2_combat_svg_raster.md`): this phase
  gives it field data from normal play.
- Decisions: **D77** (perf is measured and reported, never a gate),
  **D84** (code by `loop:pr` PR), **D37/D88** (no content touched).

## Outcome

Play on an EAS preview APK sends Sentry performance data: slow and frozen
frame counts per screen, app start time, and one span per combat drag
named by its kind, so the Sentry dashboard shows which screen and which
drag stutters. Production and web builds send no performance data.

## Acceptance

- **A1** `initCrashReporting` sets a non-zero `tracesSampleRate` only when
  `getBuildProfile() === 'preview'`; every other profile, a missing
  profile, and web stay at 0. The rate is one exported constant.
- **A2** Native frames tracking and app-start tracking are on whenever
  tracing is on (the SDK's integrations, enabled explicitly, not left to
  defaults).
- **A3** `monitoring.ts` exports `startDragSpan(kind)` returning an
  `end(outcome)` function; `kind` is `'hand-to-play' | 'die-to-card' |
  'play-to-hand'`; `outcome` is `'dropped' | 'cancelled' | 'interrupted'`.
  It returns a no-op when tracing is off, and never throws.
  `monitoring.web.ts` exports the same signature as a no-op.
- **A4** `CombatEncounterPanel` starts the span in `begin` and ends it
  exactly once on every exit path: a drop, a cancel, and
  `useDragInterruptRecovery`'s finalize. A drag never leaves a span open.
- **A5** Span names are `combat.drag.<kind>`, op `ui.drag`; no game state,
  card ids or player data in span attributes.
- **A6** Tests: `lib/__tests__/monitoring.test.ts` covers A1 (rate per
  profile, mocking `@sentry/react-native`) and A3 (no-op when off, no
  throw). A panel test asserts begin/end pairing for drop, cancel and
  interrupt with a mocked `startDragSpan`. The PR #510 commit-count
  tests stay green (the span adds no React commit).
- **A7** `docs/logging.md` gains a short "Performance (Sentry)" section:
  what is sent, from which builds, and where T reads it in Sentry.

**Measure:** `npm run verify -w axiomancer-mobile` passes with the new
tests; on T's next preview APK, the Sentry Performance page lists
`combat.drag.*` spans with slow/frozen frame data (T's observation).

## Scope

`axiomancer-mobile` only:
- `lib/monitoring.ts`, `lib/monitoring.web.ts`
- `components/combat/encounter/CombatEncounterPanel.tsx` (span start/end
  only)
- new `lib/__tests__/monitoring.test.ts`; a panel drag-span test beside
  the existing `__tests__/CombatEncounterPanel.drag-commits.test.tsx`
- `docs/logging.md`

## Consumers to update

None. `app/_layout.tsx` already calls `initCrashReporting`.

## Save / schema contracts

None.

## Carrier sweep

Not an R-phase. None.

## Decisions made upfront — DO NOT ASK

- **Preview only.** Production quota stays for crashes; web is covered
  by the Playwright harnesses (the existing `monitoring.ts` rationale).
- **Sample rate 1.0 on preview.** Only T and testers run preview APKs, so
  volume is small and every drag is worth seeing. If the Sentry free
  tier's span quota becomes a problem, lowering the constant is the
  fix; record that in the commit body. T confirmed 1.0 on 2026-10-19
  after the first week; lower it only if Sentry warns about quota.
- **No profiling, no in-app perf log.** T's choice, 2026-10-14.
- **Span kinds from the payload.** A card drag from the hand is
  `hand-to-play`, a card drag from play is `play-to-hand`, a die drag is
  `die-to-card`, whatever the drop target turns out to be; the outcome
  records where it ended.
- **Span start/end stay off the UI-thread drag path.** They run in the
  existing JS `begin` and `end` callbacks, never in a worklet, so the
  per-frame drag cost is unchanged.
- **Navigation spans** come from Expo Router only if the SDK's
  integration needs no new dependency; otherwise screen-level frames
  ride the default app-wide transaction and this is a follow-up.

## Tests matrix

- `lib/__tests__/monitoring.test.ts` (new): rate per build profile;
  `startDragSpan` no-op and no-throw.
- Panel drag-span test (new): one start and one end per drag on drop,
  cancel and interrupt.
- Existing: `CombatEncounterPanel.drag-commits.test.tsx`,
  `CombatBoard.drag-renders.test.tsx` unchanged and green.

## Verify gate

`npm run verify -w axiomancer-mobile`. Mechanics untouched.

## Commit body template

```
perf(mobile): Sentry performance on preview builds, combat drag spans

tracesSampleRate <rate> on preview only; native frames + app start on.
Spans: combat.drag.{hand-to-play,die-to-card,play-to-hand}, ended on
drop / cancel / interrupt. Acceptance A1-A7.
```

## DoD

A1 to A7 ticked.

## Follow-ups (out of scope)

- Hermes profiling on preview builds.
- A local `perf` domain in the AXM log for sessions Sentry does not see.
- Spans for the hazard and exploration screens.
