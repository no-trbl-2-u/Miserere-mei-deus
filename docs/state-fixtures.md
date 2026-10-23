# State fixtures — one declarative state for CLI, Jest, and the browser

> Added 2026-09-07. A **state fixture** is a small, versionless JSON/TS
> document that names the game state a test wants (preset, map, node,
> flags, …). The engine compiles it through its own builders, so the same
> fixture boots the mechanics CLI, seeds a Jest store, and deep-links the
> web build — and keeps working across `GAME_STATE_VERSION` bumps with no
> migration.

## Why not a raw `GameState` snapshot

A saved `GameState` is ~40 fields deep, rots on every schema bump, and is
unreadable in review. A fixture is the *intent* ("a Sage on fv-9 with a
hazard scar"); `buildStateFromFixture` turns intent into a
current-version state every time it runs.

## Layers, lowest → highest abstraction

| Layer | Where | What it does |
|---|---|---|
| `StateFixture` type | `axiomancer-mechanics/src/Game/fixtures/state-fixture.types.ts` | The document shape. Every field optional except `id`. |
| `validateStateFixture` / `parseStateFixture` | `…/state-fixture.validate.ts` | `unknown` → typed fixture, or one `StateFixtureError` listing **every** problem with its field path (`world.node: 'zz' is not on map 'fishing-village'`). Ids, presets, maps, nodes are checked against the live registries. |
| `buildStateFromFixture` | `…/state-fixture.builder.ts` | Pure pipeline: seed RNG → `createNewGameState` → preset → player overrides → world placement → flags → stamp `rngState`. Deterministic when `seed` is set (run id included). |
| `STATE_FIXTURES` registry | `…/state-fixture.registry.ts` | Committed, shared fixtures. `getStateFixtureById`, `listStateFixtureIds`. The engine suite builds every entry. |
| `placeOnNode` | `axiomancer-mechanics/src/World/world.reducer.ts` | The placement primitive fixtures and `/dev` JUMP share: stand on any node, mark it live, unlock its neighbours. |
| CLI `--fixture` | `axiomancer-mechanics/src/CLI/fixture-boot.ts`, `io.ts`, `game.cli.ts` | Registry id or `.json` path → boot state. `--fixture list` prints the registry. `arrive` ⇒ `--resolve-start`. |
| Mobile boot | `axiomancer-mobile/state/fixtures.ts` | Reads `__AXM_FIXTURE__` (global) or `?fixture=<id>` (URL), gated on `isDevToolsEnabled()`, compiles, memoises. |
| Mobile adapter | `axiomancer-mobile/state/persistence/fixtureBootAdapter.ts` | In-memory `PersistenceAdapter`: the store boots from the fixture and **never touches the AsyncStorage save slot**. |
| `<FixtureBoot>` | `axiomancer-mobile/components/FixtureBoot.tsx` | Honours `arrive`: fires the current node's event once navigation is ready, so `<EventGate>` pushes `/dialogue`, `/village`, `/cutscene`, `/event`. |
| Playwright | `axiomancer-mobile/scripts/fixture-injector.mjs` | `injectStateFixture(context, idOrObject)` / `forceDevTools(context)` — sibling of the minigame-seed injector. |
| Browser proof | `axiomancer-mobile/scripts/fixture-e2e.mjs` (`npm run e2e:fixture`) | Three cold boots: URL deep link, inline fixture with `arrive`, unknown-id fallback. Wired into both verify workflows on integration runs. |

## The document

```jsonc
{
  "id": "sage-bw-door-gate",          // kebab-case; the CLI flag / URL param / registry key
  "description": "…",                 // shown by `--fixture list`
  "seed": "fixture-sage-bw-door-gate",// engine RNG seed → reproducible run id + rolls
  "preset": "sage",                   // apprentice | wanderer | sage | kid-l1 | kid-l15 | kid-l30 | kid-l50
  "player": { "level": 7, "baseStats": { "body": 9 }, "health": 5, "currency": 33, "knownCards": ["thin-hymn"], "name": "Tester" },
  "world": { "continent": "coastal-continent", "map": "fishing-village", "node": "fv-9", "completedMaps": [] },
  "flags": ["hazard-scar:5"],         // appended to the new-game flags, deduped
  "arrive": true                      // fire the node's event on boot (CLI: --resolve-start; mobile: <FixtureBoot>)
}
```

Semantics worth knowing:

- `player.level` / `player.baseStats` **rebuild** the character through
  `createCharacter`, so max health, XP thresholds, and the relic kit stay
  consistent; `health` is then clamped to `[1, maxHealth]`.
- `world.node` defaults to the map's starting node. `completedMaps` are
  stamped on the continent first (and unlocked), then `map` is unlocked
  and entered fresh.
- An empty fixture (`{ "id": "x" }`) is byte-equal to a new game.

## Using one

**CLI**

```bash
npm run game -- --fixture list
npm run game -- --fixture sage-bw-door-gate --route fv-24 --auto-combat --json-events
npm run game -- --fixture ./my-fixture.json --route-audit fishing-village
```

**Jest (mobile)**

```ts
const boot = resolveBootFixture({ request: { source: 'url', ref: 'l30-bw-hazard' }, devToolsEnabled: true })!;
const store = createAppStore({ adapter: createFixtureBootAdapter(boot.state) });
// or, engine-side: createAppStore({ adapter: createMemoryAdapter(buildStateFromFixture(fixture)) })
```

**Combat tests (mobile Jest)** begin from a real fight, never a hand-built
foe (phase CT1): `startRealFight` in `test-utils/realFight.ts` boots a
fixture store on the Breakwater's bw-2 encounter, arrives, enters the fight
through `beginHazardEncounter` and returns the store, the staged foe and the
live combat state. `deck` and `seed` fix the hand; `player` sets exact save
fields (a known-card set, a health pool); `REAL_BOSS_FIGHT_FIXTURE` is the
door boss; `arriveAtRealFight` stops at the prelude. The old mock foe
(`state/mocks/combat.mock.ts`) is deleted, and
`test-utils/no-combat-mock.test.ts` fails if anything imports it again.

```ts
const { store, enemy, combat } = startRealFight(REAL_FIGHT_FIXTURE, {
    player: { knownCards: CARDS, health: 200, maxHealth: 200 },
    seed: 16,
});
```

**Web (dev build / preview export)**

```
http://localhost:8081/exploration?fixture=sage-bw-door-gate
```

**Playwright**

```js
import { injectStateFixture } from './fixture-injector.mjs'
await injectStateFixture(context, 'wanderer-staged-village')                 // registry id
await injectStateFixture(context, { id: 'x', seed: 1, preset: 'sage', arrive: true }) // inline
await page.goto(`${baseUrl}/`)
```

## Who consumes fixtures today (2026-09-08)

| Consumer | How |
|---|---|
| `/critique` unattended (`npm run critique:drive`) | `SCREENS` entries with a `fixture` key + `waitForPath` — dialogue, village, cutscene, rest, hazard, late-game hub |
| `/critique` attended (`playtester`) | URLs of the form `/exploration?fixture=<id>` (skill §3, agent "Entering at a known state") |
| `verify:visual` (`smoke-screens.mjs`) | `ROUTES` entries with `fixture` + `waitForPath` (dialogue, village, cutscene) in a forced-dev-tools context |
| Mobile Jest | `test-utils/fixtureStore.ts` → `createFixtureStore(ref)` / `arriveFromFixture(h)`; exemplar `state/e2e/travel-door.engine.test.ts`. Combat tests: `test-utils/realFight.ts` → `startRealFight(ref, opts)` |
| Mechanics Vitest | `src/test-utils/fixture-store.ts` → `createFixtureGameStore(ref)` |
| CLI | `--fixture <id|path.json|list>` |
| Playwright drivers | `scripts/fixture-injector.mjs` → `injectStateFixture` / `forceDevTools`; proof `npm run e2e:fixture` |

Arrival fixtures (one per state-gated screen) live in the registry
under the "Arrival fixtures" banner; `arrive` is what makes a gated
screen open cold.

## Guarantees and limits

- **Gate.** Mobile honours a request only when `isDevToolsEnabled()` is
  true; production builds (`devToolsEnabled: false`) ignore it and log
  `persistence/fixture-boot-ignored`. Pinned in
  `axiomancer-mobile/state/e2e/state-fixture.engine.test.ts`. A
  `BUILD_PROFILE=preview` export bakes dev tools **on**, which is what lets
  the browser proof run against it.
- **Ephemeral on mobile.** The fixture adapter never writes AsyncStorage;
  a tester's real slot survives a fixture session. In-session saves still
  round-trip in memory.
- **Fallback, never a crash.** An unknown id or an invalid document logs
  `persistence/fixture-boot-failed` (with the field-path problems) and the
  app boots normally. The CLI fails fast with the same message.
- **`arrive` is intent.** The engine records it; each consumer decides how
  to honour it (CLI route mode via `--resolve-start`; mobile once
  navigation is ready). An interactive CLI session ignores it.
- **Not covered (yet).** Quests, codex entries, faction standings, the
  labyrinth slice, and inventory items beyond a preset's consumables are
  not fixture fields. Reach them through the `/dev` menu after a fixture
  boot, or extend `StateFixture` + the builder + the validator together
  (all three, plus a registry entry that exercises the new field).

## Adding a registry fixture

1. Add an entry to `STATE_FIXTURES` (kebab-case id, `seed`, `description`
   naming the surface it exists for).
2. Run `npm test -w axiomancer-mechanics -- state-fixture` — the suite
   validates and builds every entry and pins `migrate` round-tripping.
3. Reference it from the CLI, a Jest suite, or a Playwright driver by id.
