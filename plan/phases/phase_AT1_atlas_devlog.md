# Phase AT1 — The Miserere Atlas in the private DevLog

## Sources

- The `/plot` request (T, attended, 2026-10-29): rebuild the Miserere Atlas,
  a hand-built architecture page T asked for that session, as a tab of the
  DevLog, data-driven so it cannot go stale. T picked "data-driven" over "a
  static port" after the cost estimate.
- The prototype: `plan/phases/phase_AT1_prototype.html` (the published
  artifact's built page, committed here as the reference, as
  `phase_BT2_prototype.diff` was). Its twelve plates, by section id:
  `context`, `containers`, `engine`, `domain`, `combat`, `dice`, `cards`,
  `relics`, `stats`, `world`, `loop`, `drift`. Its look (the Ashen Gold
  palette, the IM Fell English SC, Alegreya Sans and JetBrains Mono faces, the
  animated dashed edges, the Trace buttons, the click inspector, the
  reduced-motion fallback) is the target. Its numbers and its `drift` list
  were true on 2026-10-29 and are not to be copied: this phase generates them.
- Phase 57 (`archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_57_devlog_pages_scopedown.md`):
  the DevLog's generated output is gitignored and never served from `main`'s
  tree; `scripts/check-devlog-not-served.mjs` guards it.
- `devlog/README.md`: the private index (`npm run site:build`): a hub
  (`index.html`) linking the Catalog and the DevLog; the catalog is generated
  from the engine by `export-catalog.ts` then `build-catalog.mjs`.
- D88 (content is T's): the atlas reads content and authors none.
- D57 and `docs/truth-sources.md` "Measured truth": the atlas shows no win
  rates; balance numbers live in `docs/reports/measured/latest.md`.

## Outcome

The private DevLog hub has a third tile, **Atlas**, opening one generated page
whose card, relic, signature, foe, region, quest and XP plates are drawn from
the engine at build time and whose drift plate lists where the docs disagree
with the engine today.

## Acceptance

- **A1** `npm run catalog:export` also writes `devlog/data/atlas.json`:
  `cards` (id, name, lane id, colour, type, rank, keywords, a Global's trigger),
  `lanes` (each `CARD_LANES` entry and its card ids), `relics` (id, name, lane,
  `relicSource`, stat lines, signature id), `signatures` (id, name, cost,
  description), `enemies` (id, name, level, difficulty, VITAE and live VITAE
  under `LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER`), `regions` (continent, map name,
  node count, node count by kind, whether it is reachable in Act 1), `questlines`
  (id, steps with objective and reward), `xp` (levels 1-50:
  `experienceToNext` and the running total), `formulas` (`PLAYER_VITAE_BASE`,
  `RESOURCE_MULTIPLIERS`, and a `scaleAmount` table for base 10 at stats 0-20,
  one-shot and repeating) and `meta` (commit, date).
- **A2** `buildAtlasData()` (`axiomancer-mechanics/src/Atlas/atlas.data.ts`) is
  pure and builds that object from the libraries; `export-catalog.ts` only
  writes it. It is not exported from `src/index.ts`.
- **A3** `atlas.data.test.ts` pins the export against the libraries, never
  against typed-in counts: every `relicLibrary` entry and every
  `SIGNATURE_SKILLS` entry appears once; every relic's signature id is in
  `signatures`; every card appears once with the lane `getCardLane` gives it;
  `xp` equals `experienceToNext` level by level; `formulas.scaling` equals
  `scaleAmount` for every row.
- **A4** `npm run site:build` writes `devlog/atlas.html`: one self-contained
  page (inline CSS and JS, `atlas.json` inlined at build, no network request
  but the Google Fonts stylesheet the prototype uses), and the hub
  (`devlog/index.html`) shows a third tile, Atlas, with live counts (cards,
  relics, regions). Root `npm test` runs `scripts/build-atlas.test.mjs` on a
  fixture `atlas.json` (no engine run): the page holds every generated plate
  and every fixture card, relic and region.
- **A5** The generated plates render from `atlas.json` alone: the cards plate
  (lane to keyword graph, counts by type and colour, Global triggers, keyword
  heat map, the filterable card ledger), the relics plate (relic to signature
  to lane, the reward-pool flow), the stats plate (the max-VITAE and scaling
  calculators read `formulas`; the XP curve reads `xp`) and the world plate
  (the region chain with node counts, every authored questline). Removing a
  card or relic from the library and re-running `npm run site:build` changes
  the page with no edit to the page's source.
- **A6** The hand-authored plates are ported from the prototype as static SVG
  with the prototype's animation, Trace buttons, inspector and reduced-motion
  fallback: `context`, `containers`, `engine`, `domain`, `combat`, `dice`,
  `loop`. Each carries a "hand-drawn, last checked <date>" line.
- **A7** `devlog/atlas.html` is gitignored and `check-devlog-not-served.mjs`
  treats it as generated; its test covers the new path.
- **A8** `scripts/atlas-drift.mjs` exports `findDrift(atlas, docs)`, which reads
  `atlas.json` and the text of `docs/game-model.md` and `spec.md` and returns
  findings: the relic count `game-model.md` states against `relics.length`;
  every relic and signature name missing from `game-model.md`; every keyword on
  a card missing from `game-model.md`; a signature count `spec.md`'s Shipped
  list states against `signatures.length`; a `devlog/data/meta.json` commit that
  is not the commit `atlas.json` was built at. Each finding names the file, the
  claim and the engine value.
- **A9** The drift plate is generated from `findDrift` at build: one row per
  finding (severity, file, claim, engine value), or "no drift found at
  <commit>". The check is advisory: it never fails a build or a test on a
  finding [T to confirm #1].
- **A10** Root `npm test` runs `scripts/atlas-drift.test.mjs` on fixture
  JSON and fixture docs: a doc that says "Four relics" against five fixture
  relics yields one finding, a matching doc yields none, and the fixture page
  built by `build-atlas.mjs` shows the finding on its drift plate.

Measure: `npm run site:build` then open `devlog/atlas.html`: the hub's third
tile opens it, its card ledger lists every card in `atlas.json`, and its drift
plate lists what `findDrift` returns; `npm test` and `npm run verify -w
axiomancer-mechanics` pass.

## Scope

- `axiomancer-mechanics/src/Atlas/` (new): `atlas.data.ts`,
  `atlas.data.test.ts`.
- `axiomancer-mechanics/scripts/export-catalog.ts`: one `writeFileSync` for
  `atlas.json`.
- `scripts/build-atlas.mjs` (new), `scripts/build-atlas.test.mjs` (new),
  `scripts/atlas-drift.mjs` (new), `scripts/atlas-drift.test.mjs` (new).
- `scripts/build-devlog.mjs`: the hub's third tile.
- Root `package.json`: `atlas:build`; `site:build` runs it; `npm test` lists the
  two new tests.
- `.gitignore`, `scripts/check-devlog-not-served.mjs` and its test:
  `devlog/atlas.html`.
- `devlog/README.md`: the hub links three pages; the Atlas section.
- Not touched: the public DevLog (`build-devlog-public.mjs`,
  `dist/devlog-public/`), the mobile app, any card, relic or map content.

## Consumers to update

- The hub (`build-devlog.mjs`). Nothing in the app or the public DevLog reads
  `atlas.json`.

## Save / schema contracts

None. `atlas.json` is generated, gitignored and read only by `build-atlas.mjs`;
its shape is pinned by `atlas.data.test.ts` and the fixture in
`build-atlas.test.mjs`.

## Decisions made upfront — DO NOT ASK

- **Private index only** (T, 2026-10-29: the recommended option, "private index
  tab"). The atlas shows the loop, PRs and drift, which are not player-facing.
  The public DevLog is a follow-up, not this phase.
- **A tile on the hub, not an in-page tab.** The hub already links the Catalog
  and the DevLog as pages; the Atlas is the third, the same way.
- **The data builder lives in the engine package as source** (`src/Atlas/`),
  where vitest already runs and the type checker sees every library type;
  `export-catalog.ts` stays the one place that writes `devlog/data/`. The
  module imports from the domain modules and nothing imports it.
- **The page is zero-dependency Node**, like `build-catalog.mjs`, and shares
  `devlog-shell.mjs`'s `escapeHtml`, but keeps the prototype's own palette and
  faces: the atlas is a poster, not a catalog page. It does not switch to the
  catalog's chrome.
- **Card lanes, colours, types and keywords come from the engine**, not from
  `cards.json`, which carries face text and chips only.
- **The formulas are exported, not retyped.** The calculators read
  `formulas`; nothing in the page restates 50, 12, 6 or the scaling divisors.
- **Hand-drawn plates stay hand-drawn.** C4 context, containers and engine
  components, the UML class, state and sequence diagrams, the dice flow and the
  loop diagrams describe structure the libraries do not hold; generating them
  is not this phase. Each says when it was last checked, so a stale one is
  visible.
- **The drift check is advisory** [T to confirm #1]: findings are listed on the
  page and printed by `node scripts/atlas-drift.mjs`, never a failing test.
  A gate on doc wording would block unrelated PRs whenever content moves.
- **Breakwater.** `regions` reads `MAP_REGISTRY` as it is at build time, so the
  BW1 rebuild shows up when it lands; nothing here special-cases it.
- **No measured numbers.** The atlas shows no win rates or engagement; it links
  `docs/reports/measured/latest.md` (D57).

## Tests matrix

- `axiomancer-mechanics/src/Atlas/atlas.data.test.ts` (new, vitest): A3.
- `scripts/build-atlas.test.mjs` (new, `node --test`): A4-A5 on a fixture
  `atlas.json`, and that each A6 plate's section id is present.
- `scripts/atlas-drift.test.mjs` (new, `node --test`): A8-A10 on fixture docs.
- `scripts/check-devlog-not-served.test.mjs`: A7, one case added.

## Verify gate

`npm run verify -w axiomancer-mechanics` (AT1a), root `npm test` (every
phase), `npm run site:build` with `devlog/atlas.html` opened in a browser at
1280px and 400px, light and dark, with no console error and no horizontal
scroll (AT1b, AT1c).

## Commit body template

```
devlog: <phase id> — <title>

<what the phase adds, in two or three plain sentences>.
Closes <acceptance IDs>.
```

## DoD

A1-A10 ticked.

## Follow-ups (out of scope)

- A public, trimmed atlas (no loop, PR or drift plates) on the public DevLog,
  after T decides what of it is a spoiler.
- Generating the engine-components plate from the import graph
  (file counts and edges from `src/`), so the last hand-drawn numbers go too.
- Turning a drift finding into an `AUDIT.md` row automatically.

## Phases

### AT1a — The atlas data · M · closes A1, A2, A3 · requires nothing
Measure: `npm run catalog:export` writes `devlog/data/atlas.json`, and
`npm run verify -w axiomancer-mechanics` passes with `atlas.data.test.ts`.
- Scope: `src/Atlas/atlas.data.ts`, its test, the `export-catalog.ts` write.
- Consumers: none yet.
- Tests: `atlas.data.test.ts`.
- Verify: `npm run verify -w axiomancer-mechanics`; root `npm test`.

### AT1b — The atlas page · L · closes A4, A5, A6, A7 · requires AT1a
Measure: `npm run site:build` writes `devlog/atlas.html`, the hub's Atlas
tile opens it, and every generated plate draws from `atlas.json`.
- Scope: `scripts/build-atlas.mjs` and its test, the hub tile, `atlas:build`
  and `site:build`, `.gitignore`, `check-devlog-not-served.mjs` and its test,
  `devlog/README.md`. The drift plate is left out of this phase's page (AT1c
  adds it).
- Consumers: the hub.
- Tests: `build-atlas.test.mjs`; the not-served case.
- Verify: root `npm test`; the page opened at 1280px and 400px, both themes.

### AT1c — The drift plate · M · closes A8, A9, A10 · requires AT1b
Measure: `node scripts/atlas-drift.mjs` prints the findings, the page's drift
plate lists the same, and `atlas-drift.test.mjs` passes in root `npm test`.
- Scope: `scripts/atlas-drift.mjs` and its test; `build-atlas.mjs` renders the
  plate; root `npm test` lists `atlas-drift.test.mjs`.
- Consumers: the atlas page.
- Tests: `atlas-drift.test.mjs`.
- Verify: root `npm test`; the page's drift plate checked against the
  script's output.
