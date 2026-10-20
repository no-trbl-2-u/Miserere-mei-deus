# AGENTS.md — Project Orientation

## Project overview

Axiomancer Mobile is the **React Native / Expo client** for the Axiomancer
TTRPG. It is a thin presentation layer on top of the
[`axiomancer-mechanics`](../axiomancer-mechanics/) sibling workspace
(consumed as local source via the `@mechanics` alias): all game rules,
state shape, and randomness live there. This package
owns screens, navigation, theming, fonts, SVG/asset placeholders, and the
glue (selectors / presenters) that maps engine state to UI props.

See [`README.md`](./README.md) for architecture docs.

## Load-bearing UI evidence doctrine

- The canon combat term is `VITAE`; do not approve `HEALTH` regressions. The stance layer was removed (D65, R7d), so no player-facing copy says "stance"; card and die colour are "colour". The HP-only combat model does not by itself repeal this — keep `VITAE` for player-facing combat copy unless T explicitly approves a narrower `Health`/`HP` exception for enemy or accessibility labels.
- `npm run verify:visual` exit 1 with clean export and zero console errors is a baseline-vs-regression judgment on the renderer of record (CI's Linux Playwright Chromium; a Windows or macOS run is advisory, `screenshots/baseline/README.md`), not automatically a product failure: inspect the screenshot diffs and decide approve-vs-regression. Missing baselines are baseline debt. Console/runtime errors ARE product failures — fix or reproduce before baseline approval.
- A `/combat` smoke screenshot showing only the empty-field state instead of the seeded active encounter is route/state-initialization evidence; do not approve it as a new baseline unless T explicitly decides that state is intended.
- E2e harness failures waiting on retired selectors are **harness drift, not product failure** — verify against current route truth (dev controls: SELF → `self-dev-tools-link` → `/dev`; combat: the current HP-only board selectors) before claiming a screen is broken.
- Evidence that reaches a board in place proves **entry only**; do not claim full combat resolution until card/die controls complete an outcome.
- If typecheck errors cite newly shipped engine fields, remember mechanics is consumed as **local source** via `@mechanics` (no installed package) — check the sibling working tree state before changing mobile tests.

## Key development commands

| Task | Command |
|---|---|
| Start dev server (Metro) | `npm start` |
| Start on Android | `npm run android` |
| Start on iOS | `npm run ios` |
| Start on web | `npm run web` |
| Lint (Expo's ESLint config) | `npm run lint` |
| Type-check | `npx tsc --noEmit` |
| Test (Jest) | `npm test` |
| Full local verify | `npm run verify` |

## Technical constraints

- **Path alias `@/*` resolves to this package's root** — see `tsconfig.json`.
- **SVGs are placeholders.** Every SVG in this codebase is a coded
  placeholder. The swap contract is documented in
  [`SVG_ASSET_SPEC.md`](./SVG_ASSET_SPEC.md).
- **Fonts must finish loading before splash screen hides.** See
  `app/_layout.tsx`. Tests should mock `expo-font`'s `useFonts` to return
  `[true]` so screens render synchronously.
- **Reanimated requires a Babel plugin.** Test harness includes
  `react-native-reanimated/mock` for test compatibility.

## Testing standard

See [`docs/testing.md`](./docs/testing.md) for the complete hermetic e2e
testing standard. Every implementation requires hermetic test coverage
at the presenter/engine level (`state/e2e/`) or component level
(`components/__tests__/`).

## Observability

App-wide structured logging (AXM Log) is documented in
[`../docs/logging.md`](../docs/logging.md): `state/logging.ts` boots it,
agents read `globalThis.__AXM_LOG__` from Playwright, the crash tail
lives under `@axiomancer/logtail:v1`, and the `/dev` route has a
DIAGNOSTICS log viewer. Log through `getLogger()` from `@mechanics` —
never raw `console.*` in shipped code.
