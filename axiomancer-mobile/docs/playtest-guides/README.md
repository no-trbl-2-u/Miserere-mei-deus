# Playtest field guides

Short per-screen guides for an AI playtester (Read/Grep/Glob + the playtest
session tool `scripts/playtest-session.mjs`, no skills). Each one says what the screen is for, how to enter it directly,
which `testID`s exist, the minimal correct play, what only *looks* stuck,
what a real dead end looks like, and which `globalThis.__AXM_LOG__` lines
to read.

**Rule: read the guide for a screen before acting on it.** Landing on a
screen you have no guide for is itself a finding.

| Guide | `MapEventKind`s covered |
|---|---|
| [combat.md](./combat.md) | `encounter` (incl. boss) — prelude, hazard-pattern combat, aftermath |
| [hazard.md](./hazard.md) | `hazard` — route pick, dice, card board, outcome, rewards |
| [minigames.md](./minigames.md) | `rest`, `gathering`, `loot-cache`, `blacksmith` |
| [narrative.md](./narrative.md) | `village` (incl. its shop), `cutscene`, `narration`, `interaction` (dialogue) |
| [map.md](./map.md) | `travel`, the exploration tab, node reachability, camera/drag |

Shared facts (every guide assumes them):

- Fixture ids come from `axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts`;
  boot with `/exploration?fixture=<id>` (dev build, preview export, or
  `globalThis.__AXM_FORCE_DEV_TOOLS__ = true`). A fixture with `arrive: true`
  fires the node's event once navigation is ready (`components/FixtureBoot.tsx`)
  and stands down if a session already exists. The run is ephemeral — no save slot is read or written.
- `/dev` is reached from the SELF tab (`self-dev-tools-link`); its controls are
  catalogued in `docs/dev-tools.md`.
- Seed globals are read at bundle boot, so a session sets them before every
  page load: `playtest-session.mjs start --agent <name> --seed <n>` sets
  `__AXM_COMBAT_SEED__`, `--minigame-seeds '<json>'` sets
  `__AXM_MINIGAME_SEEDS__` and the legacy per-minigame globals, `--fixture <id>`
  sets `__AXM_FIXTURE__`, and dev tools are always on; all of them survive a
  reload. The rest have no `start` flag (a harness sets them in its own
  `addInitScript` before `page.goto`). Full list: `__AXM_MINIGAME_SEEDS__`
  (unified: `{hazard:{seed,hazardId}, rest:{seed}, cache:{seed}, blacksmith:{seed}}`),
  legacy `__AXM_HAZARD_SEED__`, `__AXM_HAZARD_ID__`, `__AXM_REST_SEED__`,
  `__AXM_CACHE_SEED__`, `__AXM_BLACKSMITH_SEED__`, plus `__AXM_COMBAT_SEED__`,
  `__AXM_JUICE_INSTANT__`, `__AXM_DICE_INSTANT_SETTLE__`,
  `__AXM_LOG_LEVEL__`, `__AXM_FIXTURE__`, `__AXM_THEME__`
  (`scripts/minigame-seed-injector.mjs`, `state/minigame-seeds.ts`,
  `app/combat-encounter/index.tsx`, `lib/juice/instant.ts`,
  `state/combat/dice-roll-ritual.ts`, `state/logging.ts`).
- The log bridge: `globalThis.__AXM_LOG__.tail(n, {domains:[...]})`,
  `.entries(filter)`, `.stats()`, `.prevSession()`. Domains:
  `combat game world minigame rng cli action nav persistence ui error`.
  Every store action is logged as `action/<actionName>` at **debug** level
  (set `__AXM_LOG_LEVEL__ = 'debug'` on a static export); every route change
  as `nav/route-changed {pathname}`; engine events as `game/<event type>`
  (`world:moved`, `world:processed`, `combat:started`, `combat:ended`,
  `dialogue:applied`, `inventory:changed`, `character:levelup`, `game:saved`, `game:loaded`).
- A dev-only skip hook `globalThis.__AXM_SKIP_EVENT__()` exists for a genuine
  dead end. Using it is not play: record it as a finding (screen, fixture,
  last log lines, what you tried).
- Guard test: `scripts/playtest-guides.test.mjs` (root `npm test`) checks that
  every `testID` in a guide's table exists in `app/` or `components/` and that
  every fixture id named in a guide is in the registry. Keep the tables honest.
