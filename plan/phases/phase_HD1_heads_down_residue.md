# Phase HD1 — Clean up what the Breakwater heads-down run left

## Sources

- T, 2026-10-29 (attended session), when told what the BW1/NK1/MQ1/WR1/AL1 heads-down run had left over: "File them
  all as one plot, so we can just clean up it during a phase pass".
- The run's callout digest (each worker's `CALLOUTS:` block), and the mutation report on PR #1080 (BW1b).
- Decisions: D115 (art licence closed: every image is open source; a new third-party asset still records its
  licence), D112 (NK1: the eight node kinds; gathering cut, so `/event` lost its only map caller), D114 (BW1).
- Code read on `main` (68013ab99) while shaping this:
  - `axiomancer-mechanics/src/Items/shop.reducer.ts` (`buyItem`, `sellItem`, `defaultSellPrice`): exported from
    `Items/index.ts` and the package `index.ts`, called by nothing but its own test and a comment in
    `Items/item-grant.ts`. NK1c deleted `VillagePayload.shop`, `ShopInventory` and `FIXTURE_SHOP`; the village card
    shop does not use it.
  - `axiomancer-mobile/app/event` and `app/dialogue`: no map event opens either since NK1a. `/event` is reached by
    `state/presenters/event.engine.ts`, fixtures, `scripts/smoke-screens.mjs`, `fixture-gallery.mjs`,
    `critique-drive.mjs`, `fresh-eyes-capture.mjs`, `encounter-routing-e2e.mjs`; `/dialogue` by
    `StateFixture.stagedDialogue` and the dev jump `seatDialogue` (`state/dev/story-catalog.ts`). MQ1b built
    `DialogueChoice.effect.giveQuestStep`, the dialogue half of "give a quest anywhere".
  - Mechanics mutation survivors: `Game/game.migrate.ts:44` (the version-mismatch message), `World/act1-walk.ts`
    ~132-135 (the one-door / terminal-node exit checks, no coverage), `World/map.registry.ts:73/75` (createMapState
    road branch), `World/quest-nodes.ts:39` (settleQuestNodes sync), `World/MapEvents/resolve-map-event.ts`
    ~222-294 and `World/world.reducer.ts:251` (WR1b re-entry).
  - The mobile mutation leg (`scripts/eval/stryker/mobile.config.mjs`, run by `.github/workflows/pr-review.yml`)
    fails its dry run on every PR ("One or more tests resulted in an error") without naming the test.
  - `axiomancer-mobile/package.json`: `e2e:combat-round:boss`, `:withdraw`, `:levelup` use `VAR=x node ...`, which
    cmd.exe cannot run; `scripts/act1-walk-e2e.mjs` spawns `npx` without a shell, which fails on win32.
  - `axiomancer-mobile/scripts/ingest-art.mjs` defaults `license` to `'UNRESOLVED'` (line 114).
  - `World/MapEvents/content.ts`: `ACT1_ANVIL_NODES` (one node per map) and `ACT1_WAYPOINT_NODES` have no
    `breakwater` key; its comment says the Breakwater's two villages carry the Anvil too, but the lookup for them
    (`bw-t4`, `bw-m5`) is implicit.
- Already done, not planned here: `docs/reports/measured/latest.md` already names the new Breakwater ids
  (`bw-w2`, `bw-m1`, ...), so the BW1b callout about `bw-17` is settled.

## Outcome

The run's loose ends are closed in one pass: the code BW1/WR1 added is pinned by tests that kill its mutants, the
mobile mutation report produces a score instead of an error, dead shop and screen code is gone, the mobile scripts
run on T's Windows box, and new art can no longer be ingested as "UNRESOLVED".

Measure: the mutation report on HD1a's PR lists none of the survivors named under Sources, and the one on HD1b's PR
shows a mobile score row (not "failed"); `npm run e2e:combat-round:boss -w axiomancer-mobile` starts on Windows.

## Acceptance

- **A1** Each mechanics survivor named under Sources is killed by a test that asserts the behaviour (not the
  message text alone, except for `game.migrate.ts:44`, where the refusal message is the behaviour T sees). A test
  added for code already on `main` carries `// guard-test: <reason>` (fail-on-parent).
- **A2** `Items/shop.reducer.ts`, its test and `shop.types.ts` (if nothing else uses it) are deleted with their
  exports; `Character/types.ts` and `Items/item-grant.ts` comments no longer name them. `npm run verify -w
  axiomancer-mechanics` and the mobile gates stay green.
- **A3** The Breakwater's Anvil villages are explicit: either `ACT1_ANVIL_NODES` and `ACT1_WAYPOINT_NODES` gain a
  `breakwater` entry the code reads, or a comment names `bw-t4` and `bw-m5` and a test pins that both carry
  `anvil`. The Breakwater has no empty waypoint, and that is stated.
- **A4** The mobile Stryker dry run passes: the failing test is named, fixed or excluded from the mutation run with
  a reason in `scripts/eval/stryker/mobile.config.mjs`, and a `npx stryker run --dryRunOnly` (or the config's
  equivalent) exits 0 locally and on the PR.
- **A5** `/event` is deleted with every caller (presenter, fixtures, scripts); `/dialogue` stays, with a comment
  at its route naming its live callers (fixture, dev jump, `giveQuestStep`) and T's flavour follow-up as its next
  user [T to confirm #1].
- **A6** The mobile npm scripts that set env vars use a cross-platform form (`node --env` style or a wrapper that
  sets `process.env`), and scripts that spawn `npx` pass `shell: true` on win32; each touched script still runs on
  CI's Linux.
- **A7** `ingest-art.mjs` refuses to run without `--license` (no default), and its help text no longer offers
  UNRESOLVED; a `--license` value of `UNRESOLVED` is rejected with a line citing D115 [T to confirm #2].

## Phases

### HD1a — Mechanics: survivors, the dead shop, the Breakwater Anvil lookup

closes A1, A2, A3. Size: M. Requires nothing.

- Scope: `axiomancer-mechanics/src/{Game/game.migrate.ts, World/act1-walk.ts, World/map.registry.ts,
  World/quest-nodes.ts, World/MapEvents/resolve-map-event.ts, World/world.reducer.ts}` (tests only, unless a
  survivor shows dead code, which is then deleted); `Items/shop.*`; `World/MapEvents/content.ts`.
- Consumers: `Items/index.ts`, package `index.ts`, `Character/types.ts`, `Items/item-grant.ts`; any mobile import
  of `buyItem`/`sellItem` (none on 68013ab99).
- Save/schema: none.
- Tests: one per survivor; one pinning the Breakwater Anvil villages (A3).
- Verify gate: `npm run verify -w axiomancer-mechanics`, root `npm test`.
- Measure: HD1a's PR mutation report lists none of the A1 survivors.

### HD1b — Mobile and scripts: Stryker, `/event`, Windows scripts, art ingest

closes A4, A5, A6, A7. Size: M. Requires nothing.

- Scope: `scripts/eval/stryker/mobile.config.mjs`; `axiomancer-mobile/app/event*`, `state/presenters/event.engine.ts`
  and its fixtures; `axiomancer-mobile/scripts/*.mjs` named under Sources; `axiomancer-mobile/package.json`;
  `axiomancer-mobile/scripts/ingest-art.mjs`.
- Consumers: `features.json` and the feature map (regenerate: `node scripts/feature-map.mjs` and
  `node scripts/feature-map-render.mjs`); visual baselines if `/event` had one.
- Save/schema: none (`/event` holds no saved state; check `pendingEvent` kinds still route).
- Tests: the routing tests that named `/event`; a test that `ingest-art.mjs` refuses without `--license`.
- Verify gate: `npm run verify -w axiomancer-mobile`, root `npm test`, `npm run smoke:bundler`.
- Measure: HD1b's PR mutation report shows a mobile score row.

## Decisions made upfront — DO NOT ASK

1. One brief, two phases split by workspace, so each is one tick and neither waits on the other.
2. Survivor tests go in this PR with `// guard-test:` markers where the fail-on-parent rule needs them; never
   weaken the rule.
3. `/event` is deleted; `/dialogue` is kept, because MQ1b's `giveQuestStep` and T's coming flavour follow-up are its
   users [T to confirm #1].
4. `ingest-art.mjs` requires an explicit licence; the D115 string is not a default, because a new third-party file
   must record its own licence [T to confirm #2].
5. The measured-truth report is not touched: it already uses the new ids.

## Definition of done

Both rows ticked with their PR numbers; the A1 survivors and the mobile dry-run error gone from the next PRs'
mutation reports.

## Follow-ups

- Wider mutation coverage beyond the survivors named here is not in scope.
- Story and flavour text for the Breakwater is T's own follow-up (BW1d and T's flavour pass), not this phase.
