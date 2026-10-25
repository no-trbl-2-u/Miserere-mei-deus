# Phase AW1 — The Act 1 walk, proven: four doors, twelve kinds, node blurbs matched to their events

## Sources

- `/plot` from T, 2026-10-25 ("plot them all, one plot run, one PR"), run unattended on the
  `plan/PHASE_CANDIDATES.md` candidate "The Act 1 walk, proven: four doors, twelve kinds, `gathering` gone, node
  blurbs matched to their events" (filed by T's `/messy` of 2026-10-24, the Elementalist swarm, finding R13).
- Part plan: `plan/playtest-harness.md`, "Proposed phases" item 3 and "Where things stand" (coverage, `gathering`,
  the blurb drift).
- Deadline: `plan/deadlines.md` W3 Item "Event-node audit and fixes (all twelve kinds)", `needs plot`, due
  2026-11-17. This plot answers it with AW1a and AW1b (see Decisions).
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md` row R13 ("The Sea Cave — the tide comes in
  faster than you leave" opened THE CREEPING ROT; "The Clifftop Chapel" opened a purse in the netting);
  `docs/feature-map/features.json` (`route:blacksmith` and `route:event` `driven=false` at 171d85c64;
  `route:item-reward` is now driven by `critique-drive.mjs`).
- Decisions: D88 (maps and events are content: built only from a brief T approves; copy fixes go to T), D90 (a
  defect found while shipping is fixed in the same tick), D84-D87 and D93 (plot lands by PR), D57 (a walk is
  evidence, not a tune).
- Code read while shaping this:
  - `axiomancer-mobile/scripts/map-walk-e2e.mjs` walks one map (Breakwater: bw-1 arrival, bw-5 cache, bw-4
    gathering, bw-6 fight to a defeat, bw-3 hazard route select) and crosses no door. It runs in
    `verify-mobile.yml` ("Map walk", encounter scope), classified by `scripts/ci-e2e-scope.mjs:88`.
  - The four doors: each Act 1 region's exit sits behind its Death Beholder door fight
    (`World/Continents/door-gate.engine.test.ts`): bw-17 → bw-18, cw-17 → cw-20, bc-15 → bc-17, ld-16 → ld-18.
    bw-18, cw-20 and bc-17 are `travel` events (`World/MapEvents/content.ts`); ld-18, the deep stair, is a sealed
    cutscene and the end of Act 1 (no end-of-run state).
  - Kinds carried by the Act 1 pools (`content.ts` kind-spread comments): encounter, rest (inn and camp),
    loot-cache, gathering, hazard, blacksmith (one Anvil per region), cutscene (arrivals and the two sealed Lantern
    Deep doors), travel. `interaction`, `village` and `narration` have no Act 1 carrier ("Act 1 stages no NPC, shop
    or narration", `content.ts:6-9`; their witnesses are the `Game/fixtures/` tests), and `labyrinth` has none
    (the vault door ld-15 is sealed scenery while the Labyrinth is parked).
  - The dev seam the walk needs already exists: `globalThis.__AXM_SKIP_EVENT__` (`state/dev/skip-event.ts`)
    resolves a live fight as a VICTORY through the real `endCombat` reducer (HP toll capped at half max VITAE,
    never fatal) and a hazard as a median crossing, gated on dev tools, which a browser harness forces with
    `__AXM_FORCE_DEV_TOOLS__` (`lib/buildProfile.ts:15`). `encounter-routing-e2e.mjs` and `hazard-e2e.mjs` already
    use both. Ending phases cannot win a door fight (map-walk's bw-6 fight ends in a defeat).
  - The feature map's `driven` flag is a name match: a driver in `axiomancer-mobile/scripts/` that names the
    route's href (`scripts/feature-map.evidence.mjs:8-20`). The root `npm test` runs
    `node scripts/feature-map.mjs --check`.
  - **`gathering` is not minigame residue.** The Gleaning minigame was retired cleanly (save v18 → v19,
    `Game/game.migrate.ts:282`, pinned by `gathering-retirement-migration.engine.test.ts`). `kind: 'gathering'` is
    the node that replaced it: it grants one named material, opens the paced `/event` receipt the player must
    acknowledge (`state/e2e/gathering-acknowledgement.engine.test.ts`), advances `collect` quest objectives
    (`resolve-map-event.ts:348`), and is read by the hazard puzzle outcome for a region's material
    (`World/Hazard/puzzle/hazard-puzzle.region.ts`) and by the labyrinth pools. Seven Act 1 nodes carry it
    (Breakwater 2, Charcoal Wood 3, Beacon Crags 1, Lantern Deep 1). What is true is that a material has no use:
    nothing in mechanics or mobile spends one.
  - Node blurbs live in the mobile layouts (`state/exploration-maps/<map>.layout.ts`: `label`, `description`);
    the event copy lives in the engine pools (payload `description`, a cutscene's `lines`). Nothing compares them;
    `layout-engine-parity.test.ts` checks node ids only. A hazard node's board is drawn from `HAZARD_LIBRARY` by
    seed (`state/hazard/store-actions.ts:177-184`), so no hazard node can match its blurb today; the W2 routing
    (a random puzzle from the thirty) keeps it random, and T's "hazard swap" (`plan/deadlines.md`, T Item
    2026-11-13) is what pins one puzzle per node.

## Outcome

A browser walk crosses all four Act 1 doors from a new game and resolves every event kind Act 1 carries, the
audit of all twelve kinds says which work and which have no Act 1 carrier, and a test catches a node blurb that
does not match the event it opens.

## Acceptance

- **A1** `npm run e2e:act1-walk -w axiomancer-mobile` boots a new game at bw-1 and crosses all four doors: it wins
  the door fights at bw-17, cw-17, bc-15 and ld-16, crosses the travel events at bw-18, cw-20 and bc-17 (arriving
  on the Charcoal Wood, the Beacon Crags and the Lantern Deep arrival scenes), and ends on ld-18's sealed stair. It
  exits 0, never sees a defeat, and prints its duration.
- **A2** The walk's path through each region is derived at run time from the engine's map graph and node kinds,
  never a hand-listed node sequence, and the walk fails, naming the kind, if any kind the Act 1 pools carry is
  never met on the path. Today that set is encounter, rest, loot-cache, gathering, hazard, blacksmith, cutscene
  and travel.
- **A3** Each kind met is resolved through its own screen by testID, the way a player does: a cache by taking an
  offer, a gathering by acknowledging the `/event` receipt, a cutscene by advancing it, a rest by REST on `/rest`,
  the Anvil by a choice on `/blacksmith`, a door by its crossing. Fights (door fights included) and hazard boards
  are resolved with `__AXM_SKIP_EVENT__`, only after the walk has asserted the reveal or the route select mounted;
  every skip is logged and the run summary counts nodes resolved by screen and by skip, per kind.
- **A4** The walk script names the `/blacksmith` and `/event` hrefs, and `node scripts/feature-map.mjs` (then the
  renderer) regenerates `docs/feature-map/` with `route:blacksmith` and `route:event` `driven=true`, sourced from
  the walk; the regenerated files are committed and the root `npm test` (`feature-map.mjs --check`) passes.
- **A5** `verify-mobile.yml` runs the walk beside "Map walk" under the same encounter scope, and
  `scripts/ci-e2e-scope.mjs` routes the new script to that journey, with a case in `ci-e2e-scope.test.mjs`.
- **A6** `docs/reports/act1-event-audit.md` holds the twelve-kind table: for each kind, its Act 1 carrier nodes
  (count and ids, read from the pools), how the walk resolved it (screen or skip), the result, and the defects
  found. `interaction`, `village`, `narration` and `labyrinth` read "no Act 1 carrier" and name the hermetic test
  that witnesses each. `gathering` reads "live: a material grant with an acknowledged receipt", with the
  no-sink finding.
- **A7** Every defect the walk meets is routed: a code defect that stops a kind resolving is fixed in AW1a in its
  own commit (D90), or, if it is bigger than the tick, filed as a `plan/CRITIQUE.md` row and the phase blocked per
  `skills/ship-a-phase.md`; a map or copy defect is filed as a `[content]` row in `plan/AUDIT.md` for T (D88) and
  not changed. The audit report links each row.
- **A8** `axiomancer-mobile/state/exploration-maps/__tests__/node-blurb-event.test.ts` checks every node of the
  four Act 1 maps whose event carries copy authored for that node (a payload `description`, a cutscene's `lines`
  or `description`): the layout's `label` plus `description` must share at least one content word with that copy
  (case folded, a trailing plural `s` dropped, a short stop-word list removed). A node that fails must be listed in
  a `PINNED_MISMATCHES` table in the test, each entry naming its `plan/AUDIT.md` row; an unlisted mismatch fails,
  and so does a listed node that now matches (the pin is stale).
- **A9** The same test lists the hazard nodes apart, as unpairable while the board is drawn at random, pins that
  set, and fails when a hazard node is added or removed without updating it. Every mismatch pinned when AW1b ships
  (the Clifftop Chapel's purse among them) is filed in `plan/AUDIT.md` as a `[content]` row for T, one per region
  that has any, each listing node, blurb and event copy.
- **A10** One `[content]` row in `plan/AUDIT.md` puts the `gathering` question to T: the seven Act 1 gathering
  nodes grant materials nothing spends; keep them as they are, give materials a use, or re-point the nodes to
  another kind (map content, D88). `plan/playtest-harness.md` item 3 is corrected: `gathering` is a live kind, not
  a survivor of the retired minigame.

Measure: `npm run e2e:act1-walk -w axiomancer-mobile` exits 0 across all four doors with every Act 1 kind met, and
`npm test -w axiomancer-mobile` runs the blurb test green with its pins filed in `plan/AUDIT.md`.

## Phases

### AW1a — The four-door walk and the twelve-kind audit · L · closes A1, A2, A3, A4, A5, A6, A7 · requires nothing
Measure: `npm run e2e:act1-walk -w axiomancer-mobile` exits 0, ending on ld-18; `docs/reports/act1-event-audit.md`
accounts for all twelve kinds; `node scripts/feature-map.mjs --check` passes with `route:blacksmith` and
`route:event` driven.
- Scope: new `axiomancer-mobile/scripts/act1-walk-e2e.mjs` (export, static server and Playwright boot shared with
  or copied from `map-walk-e2e.mjs` the way the other drivers do; `ensureWebExport`), `e2e:act1-walk` in
  `axiomancer-mobile/package.json`; `.github/workflows/verify-mobile.yml` (one step);
  `scripts/ci-e2e-scope.mjs` and its test; regenerated `docs/feature-map/` files;
  `docs/reports/act1-event-audit.md`; any code fix A7 requires, in `axiomancer-mechanics/src/World/**` or the
  mobile event screens.
- Consumers: `e2e:map-walk` stays as it is (the quick one-map check). A mechanics fix under `src/World/**` is on the
  cross-package checklist: `npm run verify -w axiomancer-mobile`.
- Save / schema: none, unless a fix needs one; then the migration rides the fix with its test.
- Tests: the walk itself; a `ci-e2e-scope.test.mjs` case; a hermetic test beside any fix, failing on its parent.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run verify -w axiomancer-mechanics` if mechanics
  changed; the root `npm test`; `npm run e2e:act1-walk -w axiomancer-mobile` and `npm run e2e:map-walk -w
  axiomancer-mobile` foreground.

### AW1b — Node blurbs matched to their events · S · closes A8, A9, A10 · requires nothing
Measure: `npm test -w axiomancer-mobile` runs `node-blurb-event.test.ts` green; every entry in its
`PINNED_MISMATCHES` names a `[content]` row present in `plan/AUDIT.md`.
- Scope: new `axiomancer-mobile/state/exploration-maps/__tests__/node-blurb-event.test.ts`; `plan/AUDIT.md` (the
  A9 and A10 rows); `plan/playtest-harness.md` (the A10 correction). No layout, pool or copy change.
- Consumers: none.
- Save / schema: none.
- Tests: the blurb test, with one case proving it fails on a seeded mismatch (a fixture pair, not real content).
- Verify gate: `npm run verify -w axiomancer-mobile`; the root `npm test` (`check-plan-queues` lints the new AUDIT
  rows).

## Scope

- `axiomancer-mobile` (a new e2e driver, a new jest test), CI wiring, the feature map's generated files, one
  report, plan rows. `axiomancer-mechanics` only if the walk finds a code defect (A7).
- Not touched: map graphs, node layouts and blurbs, pool copy, hazard selection, the `gathering` kind.

## Consumers to update

- `verify-mobile.yml` and `scripts/ci-e2e-scope.mjs` (AW1a). `docs/feature-map/` regenerated (AW1a).

## Save / schema contracts

- None planned. A fix found by the walk that touches save data carries its own `game.migrate.ts` hop and test.

## Decisions made upfront — DO NOT ASK

- **Map and event copy fixes are content, and go to T (T, 2026-10-25; D88).** Neither phase edits a blurb, a pool
  description, a cutscene line or a map graph. They are filed as `[content]` rows in `plan/AUDIT.md`, and the blurb
  test pins them so it ships green, as RH1 pinned the orphan relic.
- **This plot answers the W3 Item "Event-node audit and fixes (all twelve kinds)" (T, 2026-10-25).** AW1a is the
  audit and its code fixes; the content fixes are T's rows. The Item is renamed to say so in `plan/deadlines.md`.
- **Two phases, as the candidate proposed.** The walk is a full tick (four maps, CI wiring, an audit report, fixes
  riding on what it finds); the blurb test is a different kind of work (a jest test over static data) and needs
  nothing from the walk, so neither requires the other.
- **A new sibling script, not a longer `map-walk`.** `e2e:map-walk` stays the quick check every World change runs;
  `e2e:act1-walk` is the four-door journey. Both run under the encounter scope.
- **Fights and hazard boards are skipped through the dev seam, after their screen is proven to mount.** Winning
  four door fights by script would need a combat bot (`combat-round-e2e.mjs` owns playing a round, and
  `hazard-e2e.mjs` owns the board); the walk proves routing, resolution and crossings. The skip goes through the
  same store actions the screens use (`skip-event.ts`), so node consumption, rewards and checkpoints land as live.
- **The walk covers every kind, not every node.** Seventy-odd nodes by browser is slow for CI; one path per region
  that meets every kind the region carries, then the door, is what "every node type resolves" asks for. The path
  is derived from the engine, so a new kind or node is picked up without editing the script (A2).
- **Twelve kinds are audited, eight are walked.** The other four have no Act 1 carrier today; the report says so
  and names their hermetic witnesses rather than inventing a carrier (that would be map content, D88).
- **Duration budget: the walk should finish within six minutes in CI** (the `verify-mobile` job has 45). Over
  budget is a finding in the report, not a failure.
- **`gathering` stays [T to confirm].** The candidate's premise, that the kind survived the retired minigame, does
  not hold: it is the minigame's deliberate replacement, wired into quests, hazard outcomes and the labyrinth
  pools. Removing it or re-pointing its seven nodes changes Act 1's maps, which is T's call (D88). The leading
  option is recorded: keep the kind, and put the real finding (materials have no use) to T as a `[content]` row
  (A10).
- **The blurb check is a shared-word test, not a judgement of meaning.** It catches the wholesale mismatches the
  swarm found (a chapel opening a purse) without ruling on tone. A node with no per-node event copy (most
  encounters, which show the foe) is not paired; the report counts them.
- **Hazard nodes are unpairable until the hazard swap.** The board is drawn by seed today and will be drawn from
  the thirty after the W2 routing; pairing returns when T's swap pins one puzzle per node (Follow-ups).

## Tests matrix

- Added: `act1-walk-e2e.mjs` (A1-A3); a `ci-e2e-scope.test.mjs` case (A5); `node-blurb-event.test.ts` with a
  seeded-mismatch case (A8, A9); a hermetic test beside each code fix the walk forces (A7).
- Rewritten: none. Deleted: none.

## Verify gate

`npm run verify -w axiomancer-mobile`; `npm run verify -w axiomancer-mechanics` when mechanics changed; the root
`npm test`; `npm run e2e:act1-walk -w axiomancer-mobile` and `npm run e2e:map-walk -w axiomancer-mobile`, run in
the foreground.

## Commit body template

```
Phase AW1<a|b> — <title>

Closes <ids> of plan/phases/phase_AW1_act1_walk.md.
<what changed; for AW1a, the kinds walked, skips counted, defects fixed and filed>
Verify: <commands and results>
```

## DoD

A1-A10 ticked across AW1a and AW1b; the Measure met.

## Follow-ups (out of scope)

- Blurb pairing for hazard nodes, once T's hazard swap pins one puzzle per node: drop them from the unpairable set
  and pair each blurb with its puzzle's title.
- A player-shaped walk that wins its fights rather than skipping them: the W5 "Playtester walk of all four
  regions" Item (`needs plot`) and the playtester harness phases in `plan/playtest-harness.md`.
- The `[content]` rows AW1a and AW1b file: T's to rule, then a brief T approves (D88).
- A use for materials, or the `gathering` nodes re-pointed: T's answer to the A10 row.
- Node-kind icons too small to read at default zoom (R13's second half): a map legibility row, not this plot.
