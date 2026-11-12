# 179 — Seven hazards, a true shillings floor, and tests that can fail

> The seventh Breakwater hazard and the two new loot caches (spec 178's chunk 178.3) leave three loose ends: wording that still says six hazards, a "26 shillings guaranteed" floor that is now wrong, and tests that pass without the change they guard. One small chunk closes them.

## Why

### Sources

- **T, 2026-11-12 (`/pilot 178`, from the review of pull request #1638):** the review of 178.3 passed with seven LOW findings left over. They are this spec; none blocks that merge.
- **Rules this rests on:** D88 (prices and content are T's: no price changes here), D153 (the Breakwater's six hazard nodes; a decision's wording is history, so it is amended, never rewritten).

### What exists today

- **Seven hazard nodes after 178.3.** `bw-l2` Clifftop chapel plays a seventh puzzle (`cand-cost-hard-06`, pinned at curve rank 19 in `BREAKWATER_PINNED_HAZARD_RANKS`, a placeholder until T's hazard swap). `breakwater-puzzles.ts` and the mobile `hazard-puzzle-node.engine.test.ts` already say seven. Still saying six: `docs/game-model.md` (the hazard paragraph), `axiomancer-mobile/docs/playtest-guides/hazard.md` (the fixture bullet) and two comments in `axiomancer-mobile/scripts/map-walk-e2e.mjs` ("one of the Breakwater's six puzzle nodes"). Decision D153 says "six hazard nodes ... evenly spaced"; that was true when it was made.
- **Five Breakwater caches after 178.3.** `COAST_LOOT_CACHES` holds 8, 12 and 6 shillings (the old three) and 12 (`bw-d5`) and 6 (`bw-p3`): 44 shillings, not the 26 two comments quote. The comments: `axiomancer-mechanics/src/Cards/card.removal.pricing.ts` ("a map's three authored loot-cache nodes grant a guaranteed 26 shillings on a full walk") and `axiomancer-mechanics/src/World/Blacksmith/blacksmith.engine.ts` ("measured loot-cache income (~26 shillings/act)"). Caches are not the only guaranteed money: every won fight pays `fightWage(level)`, 3 shillings a level (`Combat/combat.mercy-check.ts`), and a completed hazard puzzle pays its purse. The other three Act 1 maps' caches sum to 26 (Charcoal Wood 8 + 6 + 12), 26 (Beacon Crags 12 + 14) and 12 (Lantern Deep), so "26" was never one number.
- **Three assertions that cannot fail.** Review of 178.3 found: the route-audit test for `--resolve-start` (`axiomancer-mechanics/src/CLI/e2e/game.cli.route-audit.engine.test.ts`) checks the start node's scene but not the node's own event that follows; no mobile store test opens `bw-l2`'s puzzle; and the spent-start-node assert (`axiomancer-mobile/state/e2e/start-node-arrival.engine.test.tsx`) and the `bc-1` and `ld-1` scene-line asserts (`World/e2e/beacon-crags.engine.test.ts`, `lantern-deep.engine.test.ts`) pass on `main` without 178.3's change.

### The small version first

All of it is wording, one recount and test edits. No engine behaviour, no price and no content line changes, so one chunk.

## Design

### Seven, said once (A1)

- **Wording.** `docs/game-model.md`, `axiomancer-mobile/docs/playtest-guides/hazard.md` and the two `map-walk-e2e.mjs` comments say seven Breakwater hazard nodes (the curve rule's six, plus the pinned chapel). A repo-wide grep for "six" beside "hazard", "puzzle node" or "Breakwater" finds no use that means all of them; the curve rule's own "six" (what `pickChapterHazardPuzzles` picks) stays. A code comment cites no decision number (the comment lint).
- **D153 is amended, not rewritten.** The pending file adds a decision, "Amends D153", that says the Breakwater has seven hazard nodes: the six D153 describes plus `bw-l2`, whose puzzle is pinned at rank 19. D153's own line is untouched.

### The shillings floor, recounted (A2)

- **Recount from the tree, not from memory.** The chunk sums what a full Breakwater walk guarantees: the five cache purses, and `fightWage(level)` for each fight, elite and boss node from `BW_ENCOUNTER_FOES` (read each level, and check the reducer's victory path pays the wage on a win). Hazard purses are not guaranteed (a full completion only) and are named as upside, not floor. The result is one number with its parts.
- **Pin it.** A test computes the same sum from `COAST_LOOT_CACHES`, `LOOT_NODES` and `BW_ENCOUNTER_FOES` and fails when the figure the two comments state stops matching, so the citation cannot rot a second time.
- **Re-justify, don't reprice.** `card.removal.pricing.ts` and `blacksmith.engine.ts` state the recounted floor and say which parts it counts. The removal price (5, 10, 15, 20, 25) and the anvil prices (3, 5, 8, 5) stay. If the recount makes the stated reasoning false (for example "the fourth and fifth cut approach a full act's income" no longer holds), the comment says so plainly and the price question is [T to confirm #1].

### Tests that fail when the change is gone (A3)

- **The rule:** each assertion named below is shown to fail on a mutation of 178.3's change, and the PR body names the mutation for each (for example "put the scene back as the node's own cutscene event").
- **Route audit.** `--resolve-start` on `bw-w1` asserts the scene (`slot: 'before'`) and then the node's own event: the second resolve is logged with kind `none`, and the start node is spent only after it.
- **Mobile store.** A case in `axiomancer-mobile/state/e2e/hazard-puzzle-node.engine.test.ts` walks to `bw-l2`, plays its scene, continues, and finds the puzzle board open on `cand-cost-hard-06` with no route select.
- **Spent start node and the arrival scenes.** The `bw-w1` start-node test, and the `bc-1` and `ld-1` tests, assert what only a slot gives: after the first resolve the node is not in `consumedNodes`, its arrival is still owed and it is in `seenScenes`; after the second it is consumed. The scene lines stay asserted word for word.

### Decisions made upfront (do not ask)

- No price, content line, picture or engine behaviour changes. The seventh hazard's puzzle and the two caches' lines stay T's placeholders.
- This spec waits on 178.3: it edits what 178.3 adds, so it cannot start before that pull request merges.

### Out of scope

- Repricing the anvil or card removal (T's, D88).
- Replacing the placeholder puzzle or cache lines (T's hazard swap and loot pass).

## Acceptance

- **A1** No doc or comment says the Breakwater has six hazard nodes; a decision records seven, amending D153 and leaving its line as written.
- **A2** The shillings floor quoted in `card.removal.pricing.ts` and `blacksmith.engine.ts` is the recounted one, with its parts named; a test fails when the quoted figure and the tables disagree; no price changed unless T answered [T to confirm #1] otherwise.
- **A3** The route-audit `--resolve-start` test asserts the start node's own event after its scene; a mobile store test opens `bw-l2`'s puzzle; the start-node and `bc-1`/`ld-1` asserts each fail on the named mutation.

## Open questions

1. **[T to confirm #1]** If the recounted floor is far above 26 shillings, are the prices still right? Default: keep every price; update only the floor and its citations. Or: T sets new prices at the next tuning pass; or: a follow-up row proposes a curve for T to pick.

## Chunks

Measure: 3 open · 0 closed · next A4

- [ ] **179.1** Seven hazards said once, the shillings floor recounted, three tests made real · S · closes A1, A2, A3 · needs — · alias: SL1a
  - Wording: `docs/game-model.md`, `axiomancer-mobile/docs/playtest-guides/hazard.md`, `axiomancer-mobile/scripts/map-walk-e2e.mjs` (two comments); the pending file's amending decision.
  - Floor: recount in the `card.removal.pricing.ts` and `blacksmith.engine.ts` comments; a test in `axiomancer-mechanics` pins the figure to the tables; `plan/127-up1-card-upgrades.md` is history and stays.
  - Tests: `game.cli.route-audit.engine.test.ts`, `hazard-puzzle-node.engine.test.ts` (mobile), `start-node-arrival.engine.test.tsx`, `beacon-crags.engine.test.ts`, `lantern-deep.engine.test.ts`; each mutation named in the PR body.
  - Measure: `npm run verify` (both workspaces) and root `npm test` pass; the recount's parts are in the PR body.
