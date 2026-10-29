# Testing Standard — Hermetic E2E by Default

> **Audience:** humans and AI agents writing or modifying code in this
> repo.
>
> **Rule of thumb:** every implementation lands with at least one
> hermetic end-to-end test that exercises the change through the
> highest-level public entry point that touches it. If you can't write
> one, you must explain why in the PR description (and ideally fix the
> architecture so you can).

> **Status note (2026-05):** Spec 01 — Test Harness Setup has shipped.
> `npm test` runs Jest via `jest-expo` and the hermetic-suite requirement
> is now binding for all subsequent specs. **Spec 03 — Presenter Layer
> has also shipped:** every screen now has a sibling `state/presenters/
> <screen>.engine.ts` that maps engine state to a view-model. See
> [`docs/presenters.md`](./presenters.md) for the contract.

---

## What "hermetic" means here

A test is **hermetic** if and only if all three of these hold:

1. **Self-contained.** No network requests, no real `AsyncStorage`,
   no real filesystem, no real font loader, no real `Animated` /
   Reanimated driver, no real timers, no real image fetching, no real
   subprocess. The test must run in plain `npm test` with no external
   service.
2. **Deterministic.** No reliance on wall-clock time, real
   `Math.random`, process IDs, or environment variables. Stub
   `Math.random` (and once the engine's seedable RNG ships, swap to
   that). Use `jest.useFakeTimers()` when timing matters.
3. **Isolated.** No shared mutable state across tests. `afterEach`
   restores any `jest.spyOn` mocks. Fixtures are deep-cloned by the
   code under test, not by the test.

If a test reads from the network, opens real `AsyncStorage`, depends
on the system clock, or fails intermittently when run in a different
order, it is not hermetic. Fix it.

## What "e2e" means here

A test is **end-to-end** if it drives the change through the
highest-level public entry point of its module — *not* through a
private helper. The test asserts on observable state (the view-model
returned by a presenter, the rendered text in a component tree, the
engine `GameState` after an action), not on intermediate function
calls.

Examples of e2e entry points by module:

| Module                      | Hermetic e2e entry point                                                              |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `app/combat-encounter/`     | `buildCombatViewModel(state)` in `state/presenters/combat-encounter.engine.ts`; the live route via `state/e2e/combat-route.screen.test.tsx` (`@testing-library/react-native`) |
| `app/(tabs)/character/`     | `selectCharacterViewModel(state)` in `state/presenters/character.engine.ts`            |
| `app/(tabs)/inventory/`     | `selectInventoryViewModel(state, localUi?)` in `state/presenters/inventory.engine.ts`  |
| `app/(tabs)/exploration/`   | `selectExplorationViewModel(state)` in `state/presenters/exploration.engine.ts`        |
| `app/event/`                | `selectEventViewModel(state)` in `state/presenters/event.engine.ts`                    |
| `app/(tabs)/_layout.tsx`    | `selectVisibleTabs(inCombat)` in `state/presenters/tabs.engine.ts`                     |
| Engine store lifecycle      | `createGameStore(memoryAdapter, …)` driven through `startCombat` / `endCombat` / `save` from `axiomancer-mechanics` |
| `components/<X>.tsx`        | `render(<X {...props} />)` → assert on `getByText` / `getByA11yLabel`. Only when the component has branching UI logic worth pinning. |

Unit tests for individual helpers are still welcome, but they do not
satisfy the hermetic-e2e requirement on their own.

## What CANNOT be tested hermetically (today)

- **Real device behaviour** (haptics, real fonts loading, real splash
  screen). Mock `react-native-haptic-feedback`, `expo-font`, `expo-splash-screen` in
  `jest.setup.ts`.
- **Reanimated worklets running on the UI thread.** Use
  `react-native-reanimated/mock` from the Jest config. Worklet timing
  is therefore not testable here.
- **Push notifications, deep links** — out of scope for hermetic
  tests; cover with manual smoke tests.

If your change touches any of the above, the hermetic e2e test must
target the underlying presenter / engine function. The screen
component test then becomes a thin "renders without crashing + shows
expected text" check.

## Mobile-specific testing considerations

Since Axiomancer Mobile is a React Native / Expo app, tests must account for platform differences and native module behavior that differs from web environments:

### Device simulation and platform differences

- **Platform-specific components:** Use React Native Testing Library's platform utilities to test platform-conditional rendering. Mock `Platform.OS` when needed:
  ```ts
  import { Platform } from 'react-native';
  jest.spyOn(Platform, 'select').mockReturnValue({ ios: 'iOS behavior', android: 'Android behavior' });
  ```
- **Screen dimensions:** Mock `Dimensions.get()` for layout-dependent components:
  ```ts
  import { Dimensions } from 'react-native';
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 812 });
  ```
- **SafeAreaProvider:** Components using `useSafeAreaInsets` require wrapping in `<SafeAreaProvider>` during render tests.

### Native module mocking strategy

All Expo modules and React Native native modules must be mocked for hermetic testing. Current mocks in `jest.setup.ts` include:

- **react-native-haptic-feedback:** Mocked to prevent actual device vibration during tests
- **expo-font:** Mocked to simulate font loading without real font files
- **expo-splash-screen:** Mocked to prevent splash screen API calls
- **AsyncStorage:** `@react-native-async-storage/async-storage/jest/async-storage-mock` (the package's in-memory mock) is wired app-wide in `jest.setup.ts`

When adding new native modules, follow this pattern:
```ts
// In jest.setup.ts
jest.mock('expo-new-module', () => ({
  functionName: jest.fn(),
  CONSTANT_VALUE: 'mocked-value',
}));
```

### React Native-specific test patterns

- **Navigation testing:** Use `expo-router/testing-library` utilities for route navigation tests
- **Animation mocking:** Reanimated animations are mocked via `react-native-reanimated/mock` - assert on final animated values, not intermediate frames
- **Touch events:** Use `fireEvent.press()` instead of web-oriented `fireEvent.click()` for touchable components
- **Text input:** React Native `TextInput` behavior differs from web inputs - use `fireEvent.changeText()` for text input simulation

### Performance testing considerations

- **Bundle size:** Metro bundler creates different artifacts than web bundlers - use `expo export` for realistic bundle analysis
- **Memory usage:** Native memory constraints are platform-specific and not easily mocked - focus on algorithmic efficiency in tests rather than absolute memory consumption
- **Startup time:** Test app initialization through `createGameStore()` lifecycle, not native app launch

## Browser playthroughs (the non-Jest tier)

Real pointer gestures, phase orchestration, and reanimated overlays
are covered by Playwright playthroughs against the exported web build:

- `npm run e2e:hazard` — `scripts/hazard-e2e.mjs`: both hazard routes,
  drag gestures, the no-re-cast dice doctrine.
- `npm run e2e:combat`, `e2e:encounters`, `e2e:exploration-roundtrip`,
  `e2e:combat-round` — the other `scripts/*-e2e.mjs` journeys.
- `npm run e2e:minigames` — all of the above, sharing one `expo export`.

They are deterministic (seeds pinned through the `__AXM_*` dev hooks)
and hermetic (everything runs against localhost). CI runs the affected
journeys in `.github/workflows/verify-mobile.yml` (scoped by
`scripts/ci-e2e-scope.mjs` at the monorepo root). When asserting
on copy that mounts behind a reanimated `entering` delay, poll
(`waitForCopy` in the scripts) instead of reading `innerText` once.

## The hermeticity guard

`state/e2e/hermeticity.audit.engine.test.ts` enforces this document
mechanically: no `.only` lands, spies restore, minigame engines and
presenters stay free of `Math.random()` / wall-clock reads, and only
an explicit allowlist of tests may touch disk. If you legitimately
need a new disk-reading guard test, add it to the allowlist in the
same PR and say why.

---

## File and naming conventions

> **NEVER put non-route files inside `app/`.** Expo Router's
> `require.context` walks every `.ts`/`.tsx` under `app/` and registers
> it as a route, layout, or API endpoint. A file named
> `_layout.engine.ts` is detected as a layout (because its
> basename-before-the-first-dot is `_layout`) and, in production builds,
> can win the layout-conflict tiebreak against the real `_layout.tsx` —
> producing the "Unmatched Route" screen for every child route. Test
> files (`*.test.ts`), mocks (`*.mock.ts`), and engine/presenter helpers
> all leak into the route tree the same way. See
> `state/e2e/route-tree.engine.test.ts` for the guard test that pins
> the allowed routes.

- **Location:**
  - `state/e2e/<feature>.engine.test.ts` for hermetic full-flow
    presenter / state tests. Companion code:
    `state/presenters/<feature>.engine.ts`.
  - `<module>/<file>.test.ts` (outside `app/`) for pure unit tests.
  - `components/__tests__/<Component>.test.tsx` for render tests of
    components with branching UI.
- **Fixtures / mocks** live in `state/mocks/<feature>.mock.ts` (or any
  location outside `app/`). They must be plain data — no `Math.random`,
  no environment reads.
- **Test utilities** live in `test-utils/` at the package root. Anything
  that references the `jest` global must never sit inside `app/`.

## Required test categories per implementation

For every non-trivial implementation, the e2e file should cover at
minimum:

1. **Happy path** — the typical success scenario, end-to-end.
2. **Boundary / branch conditions** — every terminal state the change
   can reach (e.g. the combat-encounter screen suite covers reveal,
   board, and terminal outcomes; inventory presenter covers
   empty / partial / full).
3. **Invariants** — properties that must hold throughout (HP bar
   percentage in `[0, 1]`, view-model strings never `undefined`,
   round counter monotonic, fixtures unmutated, no negative durations).
4. **Lifecycle integration** — at least one test that drives the
   change through the engine's `createGameStore(memoryAdapter, …)`
   lifecycle, asserting expected adapter calls
   (`jest.spyOn(memoryAdapter, 'save')`).

## Reference example (target shape)

The canonical reference tests are
[`state/e2e/character.engine.test.ts`](../state/e2e/character.engine.test.ts)
(Spec 05 — one focused presenter, real engine reads) and
[`state/e2e/cross-screen-integration.engine.test.tsx`](../state/e2e/cross-screen-integration.engine.test.tsx)
(a live fight engaged from the map and fought on its own route).
Together they demonstrate the top-of-file comment, deterministic
seeding, the suite split (happy path / invariants / store-lifecycle),
and asserting on observable state the presenter contract requires.

---

## Seeding state with fixtures (2026-09-08)

When a suite needs the player *somewhere* — a preset on a node, a map
already unlocked, a flag set — seat it through a **state fixture**
rather than `createMapState` + `setState` surgery. The fixture is the
same declarative document the CLI boots (`--fixture`) and the web build
deep-links (`?fixture=`), so the test cannot drift from what the app
would actually boot (`docs/state-fixtures.md` at the monorepo root).

```ts
import { createFixtureStore, arriveFromFixture } from '@/test-utils/fixtureStore';

// A committed registry fixture …
const { store, actions } = createFixtureStore('wanderer-staged-village');

// … or an inline one (give it a seed — determinism is the point).
const h = createFixtureStore({
    id: 'my-suite-door', seed: 'my-suite-door',
    world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' },
});
expect(arriveFromFixture(h)).toBe(true); // what <FixtureBoot> does for `arrive`
```

`createFixtureStore` returns `{ store, actions, adapter, state, fixture }`
over a `createMemoryAdapter` (pass your own to assert `saveCount`).
Exemplar conversion: `state/e2e/travel-door.engine.test.ts`. Pin any
new fixture field in `state/e2e/state-fixture.engine.test.ts` alongside
the gate it routes on.

## Copy-pasteable scaffold

```ts
/**
 * Hermetic E2E Tests — <Module / Feature>
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';

import { mockAlternatingRng } from '@/test-utils/rng';
// import the public entry point under test
// e.g. import { buildCombatViewModel } from '../combat-encounter.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

describe('<feature>: happy path', () => {
    it('drives the change through the public entry point', () => {
        mockAlternatingRng();
        // ...arrange, act, assert on observable state...
    });
});

describe('<feature>: invariants', () => {
    it('preserves <invariant> across N steps', () => {
        // ...
    });
});
```

## Component-test scaffold

```tsx
import { render } from '@testing-library/react-native';
import InventoryScreen from '@/app/(tabs)/inventory';
import { inventoryStateFixture } from '../inventory.mock';

describe('InventoryScreen render', () => {
    it('renders the empty-satchel prompt when no items are held', () => {
        const { getByText } = render(
            <InventoryScreen state={inventoryStateFixture('empty')} />
        );
        expect(getByText(/THY SATCHEL IS EMPTY/)).toBeTruthy();
    });
});
```

## PR self-check

Before opening a PR, confirm:

- [ ] At least one new (or modified) test under `state/e2e/`
      covers the change.
- [ ] The new test runs green via `npm test` — no flakes when run
      twice.
- [ ] Every randomness source is stubbed — no raw `Math.random` in the
      test.
- [ ] No network, no `AsyncStorage`, no real timers, no real fonts, no
      real Reanimated driver in the test path.
- [ ] `jest.restoreAllMocks()` runs in `afterEach`.
- [ ] If the change is screen-only, the underlying presenter logic was
      extracted and tested hermetically.
- [ ] `npx tsc --noEmit` and `npm test` are clean.

If you cannot satisfy this list, write a one-paragraph "Hermetic-test
debt" note in the PR description explaining why and what would unblock
it.
