# axiomancer-mechanics

The rules engine for Miserere Mei, Deus: a deterministic TypeScript library
with no UI, no database and no network. Combat draws its dice and shuffles
from the seedable `Rng` in [`src/Utils/rng.ts`](./src/Utils/rng.ts)
(`setSeed`, `getRng`), and a hazard session carries its own seed, so a
seeded run replays exactly.

The package is not published. It is a workspace in this monorepo, and
`axiomancer-mobile` consumes it as source through the `@mechanics` alias
(`axiomancer-mobile/tsconfig.json`). The public API is the barrel
[`src/index.ts`](./src/index.ts); `src/test-utils/e2e/public-barrel.engine.test.ts`
pins it. Node-only exports (the file persistence adapter and the fixture
loader) live in [`src/node.ts`](./src/node.ts), exported as
`axiomancer-mechanics/node`.

The rules of play, with the constants that hold them, are in
[`../docs/game-model.md`](../docs/game-model.md). This package's docs
describe the code, not the rules.

## Layout

| Directory | What it holds |
| --- | --- |
| `src/Cards/` | The card library (`src/Cards/library/`), card upgrades, card removal and its price. |
| `src/Character/` | `Character` types, experience and levels, worn equipment and dice gear reducers, character presets used by the CLIs and tests. |
| `src/Combat/` | The combat engine (`combat.engine.ts`): encounter state, dice, the turn loop, enemy decks and threats, signatures, rewards, plus the simulation and playtest harnesses (`combat.encounter.sim.ts`, `combat.playtest.ts`). |
| `src/Effects/` | Status effects: the buff and debuff libraries and the pure functions that apply and tick them. |
| `src/Enemy/` | The enemy library (`ENEMY_REGISTRY` in `enemy.library.ts`). |
| `src/Game/` | The game store, reducer, actions and events, save migration and persistence adapters, state fixtures (`src/Game/fixtures/`), and the Act 1 progression ledger. |
| `src/Items/` | Consumables, relics, equipment, item grants, the shop and loot caches. |
| `src/Log/` | The structured logger the CLIs attach with `--log-level` and `--log-file`. |
| `src/NPCs/` | NPC types and dialogue. |
| `src/Utils/` | The seeded `Rng` and shared helpers such as `deepClone`. |
| `src/World/` | Maps and their registry, map events, encounters, quests, and the hazard, labyrinth, rest, blacksmith and loot-cache sessions. Campaign maps are under `src/World/Continents/`. |
| `src/CLI/` | The command-line drivers. See [`docs/cli.md`](./docs/cli.md). |
| `src/test-utils/` | Test helpers: mock RNGs, card fixtures, fixture stores, combat autoplay. |

Tests sit next to the code as `*.test.ts`, with end-to-end tests in each
module's `e2e/` folder.

## Scripts

Run from this directory, or from the repo root with
`--workspace axiomancer-mechanics`.

| Script | What it does |
| --- | --- |
| `npm test` | Runs every `src/**/*.test.ts` once with vitest. |
| `npm run test:watch` | vitest in watch mode. |
| `npm run type-check` | `tsc --noEmit` over the library. |
| `npm run type-check:tests` | Type-checks the tests (`tsconfig.tests.json`). |
| `npm run type-check:cli` | Type-checks `src/CLI/` (`tsconfig.cli.json`). |
| `npm run lint` / `npm run lint:fix` | ESLint over every `.ts` file. |
| `npm run check` | Lint, then type-check. |
| `npm run build` | Compiles to `dist/` (`tsc` then `tsc-alias`). |
| `npm run clean` | Deletes `dist/`. |
| `npm run verify` | The full gate: the three type-checks, lint, tests and build. |
| `npm run verify:agent` | The same gate with the agent vitest reporter (`automation/agent-vitest-reporter.mjs`). |
| `npm run game`, `hazard`, `combat`, `labyrinth` | The game CLI and its subcommands. |
| `npm run combat-sim`, `act1-progression`, `combat-playtest` | Non-interactive simulation reports. |
| `npm run agent-e2e` | `automation/agent-e2e.mjs`: runs a scripted CLI walkthrough and asks the Claude API to grade it. Needs `ANTHROPIC_API_KEY`; not part of CI. |
| `npm run catalog:export` | `scripts/export-catalog.ts`: writes the card, enemy and effect libraries to `devlog/data/` for the DevLog catalog. |

The CLI scripts and their flags are documented in [`docs/cli.md`](./docs/cli.md).

## Read next

- [`../docs/game-model.md`](../docs/game-model.md): every rule of play.
- [`VISION.md`](./VISION.md): what the game is meant to feel like.
- [`docs/quickstart.md`](./docs/quickstart.md): run the CLI and the tests.
- [`docs/cli.md`](./docs/cli.md): every CLI command and flag.
- [`docs/combat.md`](./docs/combat.md): the combat engine as code.
- [`docs/keyword-atlas.md`](./docs/keyword-atlas.md): the keyword and system-term tables.
- [`docs/testing.md`](./docs/testing.md): the hermetic end-to-end test standard.
