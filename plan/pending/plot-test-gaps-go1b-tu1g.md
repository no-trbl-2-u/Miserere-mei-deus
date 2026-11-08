---
date: 2026-11-08
---

## Add plan/161-go1-second-death-game-over.md
~~~ acceptance
- **A?routepin** A test fails if `selectPacedEventRoute`'s run-over guard is removed: it holds a run-over state with a cutscene really pending, asserts that it is pending, and asserts the route is null.
~~~
~~~ section Sources
- **T, 2026-11-08,** on the review findings left open after `/pilot 159.6 161.1`: "Yes plot the test gaps". Review verdict on PR #1473, MED at `state/e2e/run-end-no-arrival.engine.test.tsx:100`, with the LOW at line 78.
- **Read 2026-11-08, at 42f80962c.** The test calls `actions.resolveCurrentMapEvent()` and never asserts a scene is pending. `selectPacedEventRoute` returns null first when `selectHasActivePacedEvent` is false, so with nothing pending the test passes without the guard. The first test does not pin it either: the map's own run-over guard keeps `mockPush` empty.
~~~
~~~ chunks
- [ ] **161.?routepin** The second run-end test really has a scene pending · S · closes A?routepin · needs — · alias: GO1b
  - Test only: `axiomancer-mobile/state/e2e/run-end-no-arrival.engine.test.tsx`, the case "the event gate names no route for a run-over state, even with a scene pending". No change to app code.
  - Put a cutscene in `event.pending` on the run-over state (through `actions.resolveCurrentMapEvent()` if that really leaves one, otherwise set it on the store), assert `store.getState().event.pending?.event.kind` is `cutscene` and `selectHasActivePacedEvent` is true, then assert the route is null.
  - Measure: delete the `state.runOver === true` line from `selectPacedEventRoute` and show the case red, restore it and show it green, both in the PR body. Jest on that file with `--maxWorkers=1`.
~~~

## Add plan/159-tu1-phone-touch-ups.md
~~~ acceptance
- **A?instantcta** A test fails if the reduced-motion branch of the title screen's Embark unmount is removed: with motion reduced, once the menu is up, the Embark block is gone without any timer advancing.
- **A?fontepoch** Tests fail if `FitText` stops measuring again: removing the font-load count or the width from the measuring twin's key, or the `loadingdone` listener or the `fonts.ready` bump, each turns a test red, and the listener is removed on unmount.
~~~
~~~ section Sources
- **T, 2026-11-08,** on the review findings left open after `/pilot 159.6 161.1`: "Yes plot the test gaps". Review verdict on PR #1474, MED at `components/__tests__/TitleScreen.test.tsx:113` and MED at `components/__tests__/FitText.test.tsx:1`.
- **Read 2026-11-08, at 42f80962c.** `TitleScreen.tsx`'s `ctaMounted` effect has an `instant` branch no test runs. `FitText.tsx`'s `useFontEpoch` and the twin's `key` have no test, and a test that only fires a layout event passes with or without the re-key.
~~~
~~~ chunks
- [ ] **159.?testgaps** The Embark unmount under reduced motion and FitText's re-measure get tests · S · closes A?instantcta, A?fontepoch · needs — · alias: TU1g
  - Tests only, unless a test finds a real fault. `components/__tests__/TitleScreen.test.tsx`: beside "unmounts the Embark block once its fade ends", a case with motion reduced (`useReducedMotion` true) where the Embark block is gone once the menu is up, with no `advanceTimersByTime`.
  - `components/__tests__/FitText.test.tsx`: stub `globalThis.document.fonts` (`addEventListener`, `removeEventListener`, `ready`) and restore it after each test. Pin that the twin is remounted on `loadingdone`, on `ready`, and when the wrapper's width changes; a remount has to be observed directly, because firing another layout event on the twin passes with or without the re-key. Pin that the listener is removed on unmount.
  - Measure: for each of the five mutations named in A?instantcta and A?fontepoch (the `instant` branch; `fontEpoch` out of the key; `width` out of the key; the `loadingdone` listener; the `ready` bump), show the case red and then green in the PR body. Jest on those two files with `--maxWorkers=1`.
~~~
