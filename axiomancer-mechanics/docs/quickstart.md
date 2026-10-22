# Quickstart

How to run the engine's CLI and tests, and where the code lives. The rules
of play are in [`../../docs/game-model.md`](../../docs/game-model.md).

## Install

From the repo root:

```bash
npm install
```

Every command below runs from `axiomancer-mechanics/`. From the repo root,
add `--workspace axiomancer-mechanics` instead (for example
`npm test --workspace axiomancer-mechanics`).

## Run the CLI

The CLIs run straight from source through `ts-node`; no build is needed.

```bash
npm run game                    # the tabbed game loop: map, journal, cards, codex, inventory, character, dev, begin again, save, load
npm run game -- --fixture list  # list the state fixtures you can boot from
npm run game -- --fixture apprentice-bw-rest

npm run combat                  # one fight, played at the terminal (default enemy float-eye)
npm run combat -- --auto --seed 42 --enemy green-jelly

npm run hazard -- --auto --seed 42 --runs 1 --hazard cracked-cliff --route top
npm run labyrinth               # the Aporia, room by room

npm run combat-sim              # win rates for the bot against the sim roster
npm run act1-progression        # the Act 1 XP ledger and per-door win table
npm run combat-playtest         # the stage x policy x deck matrix
```

Every interactive CLI can also be driven by a script (`--script <path>`, a
JSON array of answers) or by an agent over stdin (`--stdin`), with
`--json-events` for a machine-readable event stream and `--state-log <path>`
for a JSONL trace. The full flag list is in [`cli.md`](./cli.md).

## Run the tests

```bash
npm test                 # vitest, every src/**/*.test.ts once
npm run test:watch       # watch mode
npx vitest run src/Combat                 # one directory
npx vitest run -t "befriend"              # tests whose name matches
npm run verify           # type-checks (library, tests, CLI), lint, tests, build
```

`npm run verify` is the gate a change must pass. Tests are hermetic: no
disk, network, clock or unseeded randomness. The standard and the mock RNGs
in `src/test-utils/rng.ts` are described in [`testing.md`](./testing.md).

## Where things live

| You want | Look in |
| --- | --- |
| The public API | `src/index.ts` (Node-only exports in `src/node.ts`) |
| Cards | `src/Cards/library/` |
| Enemies | `src/Enemy/enemy.library.ts` (`ENEMY_REGISTRY`) |
| The combat engine | `src/Combat/combat.engine.ts`, described in [`combat.md`](./combat.md) |
| Status effects | `src/Effects/` |
| Maps and map events | `src/World/Continents/`, `src/World/MapEvents/`, `src/World/map.registry.ts` |
| Hazards | `src/World/Hazard/` (`HAZARD_LIBRARY` in `hazard.content.ts`) |
| The labyrinth | `src/World/Labyrinth/` |
| The game store and reducer | `src/Game/store.ts`, `src/Game/game.reducer.ts` |
| State fixtures | `src/Game/fixtures/`, described in [`../../docs/state-fixtures.md`](../../docs/state-fixtures.md) |
| Shared numbers | `src/Game/game-mechanics.constants.ts`, `src/Combat/resolution.constants.ts` |
| Keywords | [`keyword-atlas.md`](./keyword-atlas.md) |
| The CLIs | `src/CLI/`, described in [`cli.md`](./cli.md) |

The package layout and every npm script are listed in
[`../README.md`](../README.md).
