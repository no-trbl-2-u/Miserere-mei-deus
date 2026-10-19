# Phase CT1 — Combat tests start from a real fight

## Sources

- T, attended decision round 2026-10-19, on the combat tests that build a fight from `createMockEncounterEnemy`:
  "Replace with real-fight tests".
- `plan/phases/phase_CR1_combat_route.md` (live combat on its own route; the decision that kept these tests, now
  annotated with T's ruling).
- `docs/state-fixtures.md` (registry fixtures, `createFixtureStore`, `arriveFromFixture`). D84, D93.

## Outcome

Every mobile combat test starts from a real encounter reached through game state (a fixture save arriving at an
encounter node), and the test-only mock foe is deleted.

## Acceptance

- **A1** `test-utils/realFight.ts` exports `startRealFight(ref?)`: it boots a fixture store, arrives at an Act 1
  encounter node and enters combat through the real store actions, returning the store handle and the live combat
  state. It uses an existing registry fixture whose arrival opens an encounter, or adds one to the registry. A test
  checks the fight's foe and deck come from the encounter node, not from a hard-coded enemy.
- **A2** The 12 tests under `state/e2e/`, `state/presenters/__tests__/` and `components/__tests__/CombatGate.test.tsx`
  that import `state/mocks/combat.mock.ts` start from `startRealFight` instead, with the same assertions passing.
- **A3** The 25 tests under `components/combat/encounter/__tests__/` do the same.
- **A4** `state/mocks/combat.mock.ts` is deleted, and a test fails if any file imports `state/mocks/combat.mock`
  again.

Measure: `npm run verify -w axiomancer-mobile`; no file imports the mock; the suite count is unchanged.

## Scope (shared)

- `axiomancer-mobile/test-utils/`, `state/fixtures.ts` (a fixture only if none fits), the 37 test files, the mock.
- Not touched: production code (the mock has no production caller), mechanics.

## Consumers to update

- `docs/state-fixtures.md`: `startRealFight` as the way combat tests begin.

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **A real fight means reached through game state**: a fixture save, an encounter node, the real enter-combat
  actions. A test that needs a specific foe or hand gets it from a fixture (or a seed), never from a hand-built
  enemy.
- **Assertions stay the same**: a test whose numbers change because the real foe differs is updated to the real
  foe's numbers, and the commit names each such change.
- **Slot:** anytime. Test quality, no live defect, blocks no row.

## Tests matrix

- The helper's own test; the 37 migrated suites; the no-import guard.

## Verify gate

`npm run verify -w axiomancer-mobile`.

## Commit body template

```
<id>: <one line>

Closes A<n> of plan/phases/phase_CT1_real_fight_tests.md.
<what changed, one paragraph>
Verify: <commands run, results>
```

## DoD

A1–A4 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- Mechanics' own combat tests (Vitest) keep their engine-level setups; only mobile used the mock.

## Phases

### CT1a — The real-fight helper and the state tests · M · closes A1, A2 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; the helper test and the 12 migrated suites pass.
- Scope: `test-utils/realFight.ts`, a fixture if needed, the 12 files.
- Verify gate: mobile verify.

### CT1b — The combat board tests and the mock's deletion · M · closes A3, A4 · requires CT1a
Measure: `npm run verify -w axiomancer-mobile`; the 25 suites pass, the mock is gone, the guard passes.
- Scope: the 25 files, the mock, the guard test, `docs/state-fixtures.md`.
- Verify gate: mobile verify.
