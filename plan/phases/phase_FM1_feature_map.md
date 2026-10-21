# Phase FM1 — The feature map: every feature, how they connect, which still need a pitch

## Sources

- T, attended session 2026-10-21: "map all the features in the game, how they
  connect, and ultimately, what still needs a pitch session. I don't need
  intricate details for all the features or numbers." T corrected "pilot" to
  "pitch" in the same session.
- A pitch session is `/pitch` (config `.claude/pitch.md`): it writes a
  converged design file to `braindump/` and hands off to `/plot`. On `main`
  today `braindump/` holds three: `2026-10-15-hazard-fixed-puzzle.md`,
  `2026-10-18-hazard-cost-utility-cards.md`, `2026-10-21-solve-time-backend.md`.
- T chose (2026-10-21): the map is generated in the repo and copied into the
  vault; slot anytime.
- Raw surfaces this phase reads instead of plan prose:
  - player-facing routes: the expo-router tree `axiomancer-mobile/app/`
    (27 files on `main` today, among them `(tabs)/{character,deck,exploration,
    inventory,memoir}`, `village`, `hazard`, `hazard-deck`, `labyrinth`,
    `combat-encounter`, `blacksmith`, `rest`, `cache`, `event`, `dialogue`,
    `cutscene`, `item-reward`, `saves`, `settings`, and the `dev*` routes);
  - engine areas: the top-level folders of `axiomancer-mechanics/src/`
    (`Cards`, `Character`, `Combat`, `Effects`, `Enemy`, `Game`, `Items`,
    `Log`, `NPCs`, `World`, …);
  - player-flow edges: navigation calls between routes (`router.push`,
    `router.replace`, `<Link href>`, `Redirect`);
  - coupling edges: imports from a route's module tree into engine areas, and
    between engine areas;
  - evidence: the e2e and critique drivers in `axiomancer-mobile/scripts/`
    (`critique-drive.mjs`, `map-walk-e2e.mjs`, `hazard-e2e.mjs`, …), test
    files, `braindump/`, `plan/*.decisions.md`.
- Vocabulary: `docs/game-model.md` section names (Cards, Dice, A fight, VITAE
  and stats, The foes, Befriend and mercy, The world).
- Vault conventions: `docs/vault.md`; `01 Map.md` is the thread map and is not
  this map.

## Outcome

T opens one picture on the phone and sees every feature of the game, what
leads to what, what feeds what, and which features have never had a pitch. It
is generated from the code, so it cannot drift, and the loop can refresh it.
No numbers and no per-feature specs.

## Size

Five phases: FM1a M, FM1b S, FM1c S, FM1d M, FM1e S.

## Acceptance

- **A1** `node scripts/feature-map.mjs` writes `docs/feature-map/features.json`:
  one entry per feature with id, display name, kind (`route` | `dev-route` |
  `engine-area`), group, and its source path.
- **A2** Every file route under `axiomancer-mobile/app/` (layouts excluded) and
  every top-level engine area under `axiomancer-mechanics/src/` (test and
  utility folders excluded by a named list) appears exactly once; a coverage
  test fails when one is missing or extra.
- **A3** Player-flow edges (route to route, from navigation calls) and coupling
  edges (route to engine area, engine area to engine area, from imports) are
  recorded as two distinct edge kinds; each edge names the file it was found
  in.
- **A4** Running the generator twice on an unchanged tree writes identical
  bytes; `node scripts/feature-map.mjs --check` exits non-zero when the
  committed output differs from a fresh run, and runs in the root `npm test`.
- **A5** Each feature carries evidence flags, each with its source: `reachable`
  (a player-flow path exists from the entry route `index`), `driven` (an e2e
  or critique driver visits it), `tested` (a test file imports or names it).
- **A6** Display names come from `docs/game-model.md` vocabulary through one
  small alias table, `scripts/feature-map.names.json`; an unaliased feature
  keeps its path-derived name and is listed in the README as unnamed.
- **A7** Each feature carries `needsPitch` (yes or no) and, when yes, the
  evidence that is missing, by this rule: a feature needs a pitch when no
  `braindump/` pitch file and no `plan/*.decisions.md` D-number names it by
  its display name or an alias. [T to confirm]
- **A8** `docs/feature-map/README.md` is generated: one line per feature
  (name, kind, reachable, driven, tested, needs pitch with the missing
  evidence), then an anomaly list: built but unreachable, routes with no
  outgoing player-flow edge other than back, and `game-model.md` sections that
  match no feature.
- **A9** `docs/feature-map/Map.canvas` is a valid JSON Canvas file: one node per
  feature, laid out deterministically in groups (tabs, world routes, minigames,
  dev routes, engine areas); player-flow and coupling edges in two colours;
  node colour marks `needsPitch`.
- **A10** A browser drive from a fresh save reaches every non-dev route the map
  marks `reachable`; a reachable route the drive cannot reach fails it, and a
  route the drive reaches that the map lacks fails it.
- **A11** The drive's report lists every player-flow edge as crossed or
  uncrossed; uncrossed edges are listed, never failed.
- **A12** `/vault` copies `docs/feature-map/Map.canvas` to
  `vault/Feature Map.canvas` and the README's feature table to
  `vault/02 Features.md`, overwriting only those two files; `docs/vault.md`
  lists both as generated files.

Measure: `node scripts/feature-map.mjs --check` passes in the root `npm test`
and `vault/Feature Map.canvas` opens on T's phone showing every feature and its
pitch flag.

## Decisions made upfront — DO NOT ASK

- **The map lives in the repo and is copied to the vault** (T, 2026-10-21).
  The loop runs in GitHub Actions and cannot see `vault/`, a separate repo.
- **Slot anytime** (T, 2026-10-21): after Phase AD1b, the last open row.
- **"Needs a pitch" rule** as A7. [T to confirm]
- **A feature is a route or an engine area**, not a card, keyword, item or foe.
  Card, keyword and art content is never planned for the loop (D37, D88); the
  Cards engine area appears on the map as a node like any other.
- **No numbers and no specs** on the map (T): names, flags, edges.
- **Not `01 Map.md`**: that is the vault's thread map (`docs/vault.md`); the
  feature table goes to `02 Features.md`.
- No new npm dependency: imports and navigation calls are read with the
  TypeScript compiler API already in the workspace or a plain parser; no
  dependency-cruiser or madge.
- Dev routes are on the map, grouped apart, and excluded from A10.

## DoD

Every acceptance ID closed by its phase; the five rows ticked; the Measure
line met.

## Follow-ups (out of scope)

- Finer features (befriend, mercy, LEECH, individual events) once the route and
  area map has been read by T.
- A `/pitch` entry point that starts from a `needsPitch` feature.
- A history of the map (what changed week to week).

## Phases

### FM1a — The inventory and the edges · M · closes A1, A2, A3, A4 · requires nothing
Measure: `node scripts/feature-map.mjs --check` passes in the root `npm test`
with the coverage test green.

Scope: `scripts/feature-map.mjs`, `scripts/feature-map.test.mjs`, generated
`docs/feature-map/features.json`, root `npm test` list. Consumers: none.
Save/schema: `features.json` shape is this phase's contract; later phases add
fields, never rename. Tests: coverage (missing and extra), both edge kinds on a
fixture tree, determinism, `--check` drift. Verify gate: root `npm test`.

### FM1b — Evidence, names and the pitch flag · S · closes A5, A6, A7 · requires FM1a
Measure: `features.json` carries `reachable`, `driven`, `tested` and
`needsPitch` for every feature, each with its source.

Scope: the evidence pass, `scripts/feature-map.names.json`, the A7 rule.
Tests: each flag on fixtures, including a feature named only through an alias.
Verify gate: root `npm test`.

### FM1c — The README and the canvas · S · closes A8, A9 · requires FM1b
Measure: `docs/feature-map/Map.canvas` parses as JSON Canvas and holds one node
per `features.json` entry.

Scope: generated `docs/feature-map/README.md` and `Map.canvas`. Tests: canvas
validity, node count equals features, edge colours by kind, layout
determinism, anomaly list on a fixture. Verify gate: root `npm test`.

### FM1d — The reachability drive · M · closes A10, A11 · requires FM1b
Measure: the drive reaches every non-dev `reachable` route on CI's Linux
Chromium and writes the crossed/uncrossed edge list.

Scope: a drive script in `axiomancer-mobile/scripts/` reusing
`ensureWebExport` and the ready signal (VE1a, VE1b), an `e2e:feature-map`
script entry; wired where the other e2e drivers run. Tests: the drive itself;
a unit test of its pass/fail rule against a fake visit list. Verify gate:
`npm run e2e:feature-map` in the mobile workspace.

### FM1e — Into the vault · S · closes A12 · requires FM1c
Measure: after `/vault`, `vault/Feature Map.canvas` and `vault/02 Features.md`
match the repo's generated files.

Scope: `.claude/commands/vault.md` (a copy step after `ensure`),
`docs/vault.md` (generated-files list), a copy helper in `scripts/vault.mjs`
with a test against a temp vault. Verify gate: root `npm test`.
