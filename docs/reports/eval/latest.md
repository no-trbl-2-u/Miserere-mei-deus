# Loop eval: how well the loop judges its own work

> Ledger stamp: commit `4043ba25` (2026-10-17T10:40:15Z)

A measurement, not a gate (phase EV1, `plan/phases/phase_EV1_loop_eval_ledger.md`). Each section is written by its own script between its markers.

<!-- eval:ledger:start -->

## Escape ledger (EV1a)

Window: `loop:pr` PRs merged 2026-10-12 to 2026-10-17. Stamp: commit `4043ba25` (2026-10-17T10:40:15Z). Regenerate with `node scripts/eval/escape-ledger.mjs`; the data is `docs/reports/eval/ledger.json`.

| Count | Value |
|---|---|
| PRs in the window | 42 |
| Merged before a check on the final head finished | 4 |
| No `verify-*` workflow ran on the final head | 5 |
| Changed code no `verify-*` filter covers | 16 |
| A triggered `verify-*` workflow absent on the final head | 0 |
| A fix or revert touched the same code within 7 days | 12 |
| Antagonist verdict on record at merge | 6 |
| Merged on an antagonist "not a pass" | 1 |
| Shadow review (`pr-review`) verdict on record at merge | 0 |
| Merged on a shadow review "not-pass" | 0 |

### Seeded escapes

| ID | Escape | Evidence | Gate that should have caught it | Status |
|---|---|---|---|---|
| S1 | #529 merged before CI finished on its final head | PR #529; head 9d44ca5e; merge 93f05dfe | merge gate (branch protection with required checks, not comment matching) | confirmed: finished after merge: verify-mobile; antagonist at merge: not-pass |
| S2 | `pr-resolve` merges cut `plan/CRITIQUE.md` rows apart on `main` | merge c95114a2; merge 49829988; repair 23f06828; repair 662aa10b | a structural lint for the plan queue files | confirmed: all four commits touch plan/CRITIQUE.md |
| S3 | Three tests that could not fail, their acceptance ticked `[x]` | PR #521 A4; PR #523 A6; PR #520 leaked `console.error` spy (near-miss) | a fail-on-parent check for new tests; an acceptance-ID-to-test map | seeded: 2 of 2 named ticks found in the PR bodies; "could not fail" is for EV1b to prove |
| S4 | #526 merged with only Cloudflare Pages run | PR #526; head efc7f371 | CI path filters (a path-coverage audit so no diff merges unverified) | confirmed: ran: Cloudflare Pages: axiomancer; uncovered: 3 file(s) |
| S5 | SF1's brief asked for a `verify:visual` shot of the callout; none was taken | PR #523; plan/phases/phase_SF1_sacrifice_floor_callout.md | the builder's own `[x]` (an acceptance-ID-to-test map) | confirmed: PR #523 body states verify:visual was not run |
| S6 | No gate runs on Android | .github/workflows/verify-*.yml | none exists (an Android smoke test on the preview APK) | confirmed: no verify-* workflow mentions Android |

### Every PR in the window

A follow-up is a fix or revert landing on `main` within 7 days that touched one of the PR's non-bookkeeping files. A shared file names a candidate, not a cause. "After merge" means the check finished after the PR merged, so the merge did not wait for it.

| PR | Merged | Head | Ran on the final head | `verify-*` skipped | Uncovered code | Follow-ups (7d) | Antagonist | Review |
|---|---|---|---|---|---|---|---|---|
| #505 loop: measured-truth baseline — phase R12a | 2026-10-13T10:26Z | cdba0b85 | Cloudflare Pages: axiomancer success; verify-mechanics success | verify-drift, verify-mobile, verify-prose | 10: .github/workflows/measured-truth.yml, CLAUDE.md, docs/game-model.md, ... | f6bc4f19 fix: cap the combat dock's VITAE column on wide windows (CRITIQUE pass 85 footer dock) | none | none |
| #507 loop: roster-health lenses — phase RH1 | 2026-10-13T11:42Z | caee9f0b | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-prose success | verify-drift, verify-mobile | 3: docs/game-model.md, skills/iterate.md, skills/ship-a-phase.md | none | none | none |
| #509 loop: card-spec scaffold and card-rules lint — phase CS1 | 2026-10-13T10:27Z | cd8a8453 | Cloudflare Pages: axiomancer success (after merge); verify-drift success (after merge); verify-mechanics success (after merge); verify-prose success (after merge) | verify-mobile | 2: docs/card-spec.md, docs/truth-sources.md | none | none | none |
| #512 a11y: hide the faded title CTA under the menu (CRITIQUE pass 79 title a11y) | 2026-10-13T16:57Z | 577060dd | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | 4c2a08bf fix: critique drive waits for the title and dice to settle; EMBARK guard; dice springs rest (CRITIQUE pass 79 drive settle) | none | none |
| #514 fix: P-07b's printed max holds (AUDIT bug P-07b) | 2026-10-13T21:36Z | 18f01653 | Cloudflare Pages: axiomancer success; verify-mechanics success | verify-drift, verify-mobile, verify-prose | none | none | none | none |
| #516 fix: refuse a die on a card that cannot be played now (AUDIT RC2 die spent on blocked card) | 2026-10-14T01:13Z | 25480107 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | f0b58df3 fix: A Plain Blow wears its FREE pill (CRITIQUE pass 85 Blow FREE pill); 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | none | none |
| #520 feat: Globals stack as independent instances (experimental) — phase GS1 | 2026-10-14T02:42Z | 4b1ee463 | Cloudflare Pages: axiomancer success; verify-drift success; verify-mechanics success; verify-mobile success | verify-prose | 2: docs/card-spec.md, docs/game-model.md | f0b58df3 fix: A Plain Blow wears its FREE pill (CRITIQUE pass 85 Blow FREE pill); 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | pass | none |
| #521 feat(mobile): one card face (D91) — phase BT2a | 2026-10-14T02:47Z | d4812993 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | pass | none |
| #523 feat: the SACRIFICE floor points at the VITAE ring — phase SF1 | 2026-10-14T03:02Z | 5d5fac9b | close-trailers success; Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success | verify-drift, verify-prose | 2: scripts/loop-issue.mjs, scripts/loop-issue.test.mjs | f0b58df3 fix: A Plain Blow wears its FREE pill (CRITIQUE pass 85 Blow FREE pill); 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | pass | none |
| #526 fix(ci): pr-resolve resolves on a dispatched run, not on push (AUDIT infra pr-resolve) | 2026-10-14T03:24Z | efc7f371 | Cloudflare Pages: axiomancer success | verify-drift, verify-mechanics, verify-mobile, verify-prose | 3: .github/workflows/README.md, .github/workflows/pr-resolve.yml, scripts/loop-pr.test.mjs | 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge) | pass | none |
| #528 fix: sealed map nodes draw their mark (CRITIQUE pass 84 sealed node mark) | 2026-10-14T03:40Z | af2c11e5 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | pass | none |
| #529 feat(mobile): combat footer dock, full-width hand, intent top-left — phase BT2b | 2026-10-14T03:25Z | 9d44ca5e | Cloudflare Pages: axiomancer success; verify-mobile success (after merge) | verify-drift, verify-mechanics, verify-prose | none | f0b58df3 fix: A Plain Blow wears its FREE pill (CRITIQUE pass 85 Blow FREE pill); f6bc4f19 fix: cap the combat dock's VITAE column on wide windows (CRITIQUE pass 85 footer dock); 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); b5b395ad fix(combat): END keeps the dock's right edge on a wide window (CRITIQUE pass 87); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | not-pass (merged anyway) | none |
| #531 fix: village stall prices read SHILLINGS (CRITIQUE pass 84 village shillings) | 2026-10-14T04:11Z | 49829988 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #534 fix: A Plain Blow wears its FREE pill (CRITIQUE pass 85 Blow FREE pill) | 2026-10-14T08:21Z | cd785c17 | Cloudflare Pages: axiomancer success; verify-drift success; verify-mobile success | verify-mechanics, verify-prose | none | 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | none | none |
| #535 fix: cap the combat dock's VITAE column on wide windows (CRITIQUE pass 85 footer dock) | 2026-10-14T08:22Z | 731f08fe | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | 1: skills/march.md | b5b395ad fix(combat): END keeps the dock's right edge on a wide window (CRITIQUE pass 87) | none | none |
| #537 fix: critique drive waits for the title and dice to settle; EMBARK guard; dice springs rest (CRITIQUE pass 79 drive settle) | 2026-10-14T11:50Z | 7e216a55 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #539 a11y: the dock's phase ledger speaks as one line (CRITIQUE pass 85 ledger a11y) | 2026-10-14T12:39Z | beac7799 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | 5150c634 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge); b5b395ad fix(combat): END keeps the dock's right edge on a wide window (CRITIQUE pass 87); d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | none | none |
| #541 fix: forge prices read SHILLINGS (CRITIQUE anvil shillings) | 2026-10-14T12:40Z | 7a9478f5 | Cloudflare Pages: axiomancer success; verify-mobile success (after merge) | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #543 fix: pr-resolve union merge splits moved queue rows (AUDIT pr-resolve union merge) | 2026-10-14T16:07Z | a88a5f5c | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | 2: scripts/loop-pr.test.mjs, scripts/pr-resolve.mjs | d82f5365 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | none | none |
| #545 fix: hazard cast and stamp springs name mass and energyThreshold (AUDIT hazard springs mass 4) | 2026-10-14T16:08Z | f548516f | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #549 perf(mobile): Sentry performance on preview builds, combat drag spans — phase PF3 | 2026-10-15T18:23Z | 0fc16b28 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | 1: docs/logging.md | none | none | none |
| #553 perf(mobile): no exploration map under live combat — phase PF4 | 2026-10-15T00:19Z | 988640ae | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #555 fix(combat): END keeps the dock's right edge on a wide window (CRITIQUE pass 87) | 2026-10-15T05:55Z | cf090553 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #557 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | 2026-10-15T14:33Z | 1729a428 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #559 a11y: announce the SACRIFICE floor line on each refusal (CRITIQUE antagonist PR #523) | 2026-10-15T14:59Z | 0ac5eded | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #562 fix: a hazard scar mends at any rest, not only at an inn (AUDIT Scarred never clears) | 2026-10-15T15:05Z | 4ed594e9 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success; verify-prose success | verify-drift | none | none | none | none |
| #565 eval: the escape ledger — phase EV1a | 2026-10-15T19:25Z | 303a6e2d | Cloudflare Pages: axiomancer success | verify-drift, verify-mechanics, verify-mobile, verify-prose | 7: package.json, scripts/eval/escape-ledger.mjs, scripts/eval/escape-ledger.test.mjs, ... | none | none | none |
| #569 feat(mobile): live combat on its own route — phase CR1a | 2026-10-15T20:55Z | 8cd17724 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success | verify-drift, verify-prose | none | none | none | none |
| #571 feat(mechanics): level curve to 20 by the end of Act 1 — phase LV1 | 2026-10-15T21:29Z | c638aa7f | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success | verify-drift, verify-prose | 1: docs/game-model.md | none | none | none |
| #573 refactor(mobile): delete the encounter-overlay era, labyrinth combat e2e — phase CR1b | 2026-10-16T01:33Z | eb7e416e | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success | verify-drift, verify-prose | none | none | none | none |
| #576 eval: do the tests fail on the parent — phase EV1b | 2026-10-16T01:34Z | a0660ada | Cloudflare Pages: axiomancer success | verify-drift, verify-mechanics, verify-mobile, verify-prose | 4: package.json, scripts/eval/parent-replay-lib.mjs, scripts/eval/parent-replay.mjs, ... | none | none | none |
| #579 eval: planted defects, mutation scores and the miss-rate table — phase EV1c | 2026-10-16T12:19Z | 0a95567c | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success | verify-drift, verify-prose | 11: package.json, scripts/eval/miss-rates-lib.mjs, scripts/eval/miss-rates.mjs, ... | none | none | none |
| #581 feat: hazard puzzle layout and one-round session — phase B3a | 2026-10-16T12:20Z | ea9b16b0 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-prose success | verify-drift, verify-mobile | none | none | none | none |
| #583 eval: ranked fixes, success evidence and the /messy dump — phase EV1d | 2026-10-16T14:08Z | c33dca65 | Cloudflare Pages: axiomancer success | verify-drift, verify-mechanics, verify-mobile, verify-prose | 5: docs/truth-sources.md, package.json, scripts/eval/fixes-lib.mjs, ... | none | none | none |
| #584 feat: hazard puzzle solver and band check — phase B3b | 2026-10-16T14:04Z | 9215b1b3 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-prose success | verify-drift, verify-mobile | none | none | none | none |
| #587 feat: hazard puzzle outcome and claim — phase B3c | 2026-10-16T14:36Z | 2dfa7b89 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success; verify-prose success | verify-drift | none | none | none | none |
| #588 feat: hazard puzzle stat unlocks — phase B3d | 2026-10-16T15:01Z | c81b8258 | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-prose success | verify-drift, verify-mobile | none | none | none | none |
| #592 feat: three hazard demo puzzles and the dev-menu board — phase B3e | 2026-10-16T17:06Z | 3e632b5b | Cloudflare Pages: axiomancer success; verify-mechanics success; verify-mobile success; verify-prose success | verify-drift | 1: docs/game-model.md | none | none | none |
| #594 dev: slim the /dev menu — route-local open state, seven leaves cut, the wallet demoted | 2026-10-16T17:32Z | dd2ed682 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #596 ci: verify-gate, one always-reporting check with a derived risk label — phase RV1a | 2026-10-17T09:28Z | c00058f0 | Cloudflare Pages: axiomancer success; pr-review success | verify-drift, verify-mechanics, verify-mobile, verify-prose | 9: .github/workflows/README.md, .github/workflows/pr-review.yml, package.json, ... | none | none | none |
| #598 fix: map gesture line tells a mouse to scroll (CRITIQUE pass 91) | 2026-10-17T09:29Z | 36a45879 | Cloudflare Pages: axiomancer success; verify-mobile success | verify-drift, verify-mechanics, verify-prose | none | none | none | none |
| #600 fix: level presets hold the stat points their level can bank (CRITIQUE pass 90) | 2026-10-17T09:30Z | 57730523 | Cloudflare Pages: axiomancer success; pr-review success (after merge); verify-mechanics success (after merge) | verify-drift, verify-mobile, verify-prose | none | none | none | none |

<!-- eval:ledger:end -->

<!-- eval:parent-replay:start -->

## Do the tests fail on the parent? (EV1b)

Stamp: commit `5085b096` (2026-10-15T17:35:13-04:00), over the ledger at `86eea99d`. Regenerate with `node scripts/eval/parent-replay.mjs`; the data is `docs/reports/eval/parent-replay.json`.

Each test file a ledger PR added or changed runs twice in a detached worktree: at the PR's merge (the control), then at the merge's first parent with the PR's version of the file laid over. A file that passes on the parent could not fail: the code it pins was not there yet. A new case is a test title in the PR's version that the parent's version lacks; dynamic titles are not matched. A new case passing on the parent is not a defect by itself: a guard of behaviour the PR must not change (the other direction of a pinned rule) passes there by design.

| Count | Value |
|---|---|
| Test files replayed | 58 |
| Fail on the parent | 54 (11 do not load there) |
| Could not fail (pass on the parent) | 4 |
| Inconclusive (fail at their own merge) | 0 |
| New cases that pass on the parent | 11 |
| Ticked acceptance lines | 65 |
| Ticked lines naming no replayed test | 49 |
| Unproven ticks | 0 |

### Unproven ticks

A ticked acceptance line is unproven when it names at least one test (a file by name, or a new case by a backticked token in the line) and every test it names could not fail.

None.

### Seed S3

- #521 A4: names no replayed test, so the replay can neither prove nor clear it
- #523 A6: names no replayed test, so the replay can neither prove nor clear it

### Every replayed test file

| PR | Test file | In the PR | Verdict | New cases passing on the parent |
|---|---|---|---|---|
| #505 | combat.measured-truth.test.ts | added | fails-on-parent (does not load on the parent) | 0 of 10 |
| #505 | act1-progression.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #505 | measured-compare.test.mjs | added | fails-on-parent (does not load on the parent) | 0 of 13 |
| #507 | roster-health.engine.test.ts | added | fails-on-parent (does not load on the parent) | 0 of 19 |
| #509 | card-rules.test.ts | added | fails-on-parent (does not load on the parent) | 0 of 15 |
| #509 | card-rules.engine.test.ts | added | fails-on-parent (does not load on the parent) | 0 of 15 |
| #509 | hermeticity.audit.test.ts | changed | could-not-fail (passes on the parent) | 0 of 0 |
| #509 | check-prose.test.mjs | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #509 | content-drift.test.mjs | changed | fails-on-parent (does not load on the parent) | 0 of 4 |
| #512 | TitleScreen.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #514 | blood-price.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #516 | CombatBoard.colorlaw.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 3 |
| #520 | blood-price.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 2 of 7: the draw fallback takes one deck copy out per instance in play; the witness values a copy with one already in play, and a stacked deck si... |
| #520 | CombatBoard.program-cards.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #521 | CombatBoard.handfan.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 3: the fixture fan overlaps at the phone width (non-vacuity) |
| #521 | CombatBoard.paid-column.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 12 |
| #521 | CombatBoard.playtest-2026-09-04.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 2: at the hand width (120) the ledger is the same single row |
| #521 | CombatCardFace.rarity-D4.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 3: does NOT print it on a small face — the name band is the name’s |
| #521 | CombatCardFace.seamless.test.tsx | added | fails-on-parent (a case fails on the parent) | 0 of 2 |
| #521 | CombatRewardsOverlay.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #523 | blood-price.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 4 |
| #523 | CombatBoard.colorlaw.test.tsx | changed | could-not-fail (passes on the parent) | 0 of 0 |
| #523 | CombatBoard.sacfloor.test.tsx | added | fails-on-parent (does not load on the parent) | 0 of 14 |
| #523 | card-program.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #523 | loop-issue.test.mjs | changed | fails-on-parent (does not load on the parent) | 0 of 3 |
| #526 | loop-pr.test.mjs | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #528 | ExplorationNode.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 2 |
| #529 | CombatBoard.S1-board.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 2 |
| #529 | CombatBoard.footer-dock.test.tsx | added | fails-on-parent (does not load on the parent) | 0 of 9 |
| #529 | CombatBoard.fresh-eyes-repair.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 2 |
| #529 | CombatBoard.handfan.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 4: a five-card fan at 375 shows the start of every covered name (A6) |
| #529 | CombatBoard.playtest-2026-09-04.test.tsx | changed | fails-on-parent (does not load on the parent) | 0 of 0 |
| #529 | CombatBoard.sacfloor.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #529 | CombatBoard.sig-column.test.tsx | added | fails-on-parent (does not load on the parent) | 0 of 7 |
| #529 | CombatEncounterPanel.log.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 5 |
| #531 | stall-price-shillings.critique-84.test.tsx | added | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #534 | card-program.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 0 |
| #534 | combat-card-vm.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 3 |
| #535 | CombatBoard.footer-dock.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #537 | TitleScreen.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #537 | critique-drive.test.mjs | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #537 | dice-roll-ritual.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 0 |
| #539 | CombatBoard.footer-dock.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #541 | forge-vocabulary.S5-talk-C12.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 2: spells the purse out in SHILLINGS, the unit the prices are in |
| #541 | blacksmith.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 0 |
| #543 | card-program.engine.test.ts | changed | could-not-fail (passes on the parent) | 0 of 0 |
| #543 | loop-pr.test.mjs | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #545 | HazardOverlays.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #549 | CombatEncounterPanel.drag-spans.test.tsx | added | fails-on-parent (a case fails on the parent) | 0 of 5 |
| #549 | monitoring.test.ts | added | fails-on-parent (a case fails on the parent) | 0 of 8 |
| #553 | EncounterModalOverlay.test.tsx | changed | fails-on-parent (a case fails on the parent) | 1 of 3: leaving it out changes nothing |
| #553 | map-under-combat-modes.engine.test.tsx | added | fails-on-parent (a case fails on the parent) | 2 of 3: prelude: the map stays mounted behind the modal; aftermath: the map comes back behind the modal |
| #553 | map-under-combat.engine.test.tsx | added | fails-on-parent (a case fails on the parent) | 1 of 5: no encounter: the map is mounted |
| #555 | CombatBoard.footer-dock.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 0 |
| #557 | legibility-sweep.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #559 | CombatBoard.sacfloor.test.tsx | changed | fails-on-parent (a case fails on the parent) | 0 of 1 |
| #562 | rest-shelter.engine.test.ts | changed | could-not-fail (passes on the parent) | 0 of 0 |
| #562 | hazard-scar-rest-recovery.engine.test.ts | changed | fails-on-parent (a case fails on the parent) | 0 of 3 |

<!-- eval:parent-replay:end -->

<!-- eval:seeded:start -->

## Planted defects (EV1c, A6)

Stamp: commit `b0ac22f8` (2026-10-16T02:49:04Z). Regenerate with `node scripts/eval/seeded-replay.mjs`; the data is `docs/reports/eval/seeded.json`.

Each real bug of 2026-10-14 is planted again by reverting its fix's source (not its tests) in a detached worktree that is never pushed. Each mechanical gate then meets it:

- **CI path filters**: a `verify-*` workflow triggers on the planted paths.
- **verify, tests as they stood**: the related tests at the fix's parent, where the bug lived.
- **verify, with the fix's tests**: the related tests at the fix, with its source reverted.

A related test that also fails at the unplanted fix (the control run) is noise and is dropped from both test gates; the JSON names it.

The related tests are the test files beside a planted file whose names start with its name, plus the files the fix itself changed. The antagonist, `/critique` and the merge gate are agent or session judges and are scored from the ledger, not replayed (brief Decisions).

| Seed | Bug | Fix | Planted paths | CI path filters | verify, tests as they stood | verify, with the fix's tests |
|---|---|---|---|---|---|---|
| D1 (#534) | `riderPairs` ignored damage riders, so A Plain Blow drew no FREE pill | 4080f4a0 | axiomancer-mobile/components/combat/glyphShapes.ts, axiomancer-mobile/state/presenters/card-program.engine.ts, axiomancer-mobile/state/presenters/combat-encounter.engine.ts, scripts/build-catalog.mjs | missed (verify-drift.yml, verify-mobile.yml triggers, and its related tests pass) | missed | caught (card-program.engine.test.ts, combat-card-vm.test.ts) |
| D2 (#523) | a loose die drop refused at the SACRIFICE floor showed no VITAE ring callout (#523's own follow-up) | cfadbf7a | axiomancer-mobile/components/combat/encounter/CombatBoard.tsx | missed (verify-mobile.yml triggers, and its related tests pass) | missed | caught (CombatBoard.sacfloor.test.tsx) |
| D3 (#529) | the leftmost hand card's FREE pill was clipped at the screen edge (#529's final head) | 9d44ca5e | axiomancer-mobile/components/combat/encounter/CombatBoard.tsx | missed (verify-mobile.yml triggers, and its related tests pass) | missed | caught (CombatBoard.handfan.test.tsx) |
| D4 (#543) | the `pr-resolve` union merge split moved queue rows | 80ea6f44 | scripts/pr-resolve.mjs | missed (no `verify-*` workflow triggers on these paths) | missed | caught (loop-pr.test.mjs) |

CI path filters: 0 of 4 caught; verify, tests as they stood: 0 of 4 caught; verify, with the fix's tests: 4 of 4 caught.

<!-- eval:seeded:end -->

<!-- eval:seeded-review:start -->

## The shadow reviewer on planted defects (RV1c, A7)

Not measured yet: `node scripts/eval/seeded-replay.mjs --judge review` has not run against the three-lens reviewer on `main`.

Each seed is pushed as a draft `eval:seed` PR whose diff reverts its fix's source (the planted defect), and its fix as a second draft (the clean control). `pr-review.yml` is dispatched on each; a seed counts as flagged when a MED or HIGH row of the verdict names a planted line (within 3 lines of a hunk). Both PRs are closed and their branches deleted when the run ends. Thresholds: `docs/reports/pr-review-research.md` Part 4.

| Measure | Pass | Value | Verdict |
|---|---|---|---|
| Planted defects flagged MED+ (D1-D4) | >= 3 of 4 | not measured | not measured |
| Findings per clean control PR (the unplanted fix) | <= 1 MED+, 0 HIGH | not measured | not measured |
| Run time, p90 of the four | <= 20 min | not measured | not measured |

<!-- eval:seeded-review:end -->

<!-- eval:mutation:start -->

## Mutation scores (EV1c, A5)

Stamp: commit `15a2fa76` (2026-10-16T07:25:59Z). Regenerate with `npm run eval:mutation`; the data, with every survivor, is `docs/reports/eval/mutation.json`.

StrykerJS mutates the named files and runs the workspace's own tests against each mutant, in a detached worktree. The score is killed plus timed-out mutants over every mutant that compiled, uncovered ones included. A survivor is a change to the code that no test noticed. Never part of `verify`.

| Target | Files | Mutants | Killed | Timed out | Survived | No coverage | Score | Run |
|---|---|---|---|---|---|---|---|---|
| mechanics: combat resolution | 6 | 842 | 623 | 3 | 161 | 33 | 76.3% | ok, 738s |
| mobile: combat presenters | 0 | 2276 | - | 2 | 6 | - | n/a | over budget (1380s): 564 of 2276 tested, 6 survived, 1380s |

### Per file

| File | Mutants | Survived | No coverage | Score |
|---|---|---|---|---|
| axiomancer-mechanics/src/Combat/combat.dice.ts | 109 | 25 | 5 | 72.5% |
| axiomancer-mechanics/src/Combat/effect-modifiers.ts | 133 | 13 | 17 | 77.3% |
| axiomancer-mechanics/src/Combat/effects.ts | 370 | 71 | 2 | 80.2% |
| axiomancer-mechanics/src/Combat/health.ts | 27 | 2 | 6 | 70.4% |
| axiomancer-mechanics/src/Combat/resist.ts | 17 | 5 | 0 | 70.6% |
| axiomancer-mechanics/src/Combat/stat-scaling.ts | 186 | 45 | 3 | 71.1% |

### Survivors: mechanics: combat resolution

| File:line | Mutator | Replacement | Status |
|---|---|---|---|
| combat.dice.ts:22 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:22 | ConditionalExpression | `false` | Survived |
| combat.dice.ts:22 | EqualityOperator | `color !== 'body'` | Survived |
| combat.dice.ts:22 | StringLiteral | `""` | Survived |
| combat.dice.ts:22 | ConditionalExpression | `false` | Survived |
| combat.dice.ts:22 | EqualityOperator | `color !== 'mind'` | Survived |
| combat.dice.ts:22 | StringLiteral | `""` | Survived |
| combat.dice.ts:36 | ArrayDeclaration | `["Stryker was here"]` | Survived |
| combat.dice.ts:40 | CallExpression | `;` | Survived |
| combat.dice.ts:58 | MethodExpression | `colors` | Survived |
| combat.dice.ts:59 | BooleanLiteral | `true` | Survived |
| combat.dice.ts:71 | ConditionalExpression | `false` | Survived |
| combat.dice.ts:71 | StringLiteral | `""` | Survived |
| combat.dice.ts:72 | BooleanLiteral | `false` | NoCoverage |
| combat.dice.ts:72 | ConditionalExpression | `false` | Survived |
| combat.dice.ts:72 | StringLiteral | `""` | Survived |
| combat.dice.ts:80 | BlockStatement | `{}` | NoCoverage |
| combat.dice.ts:81 | MethodExpression | `dice` | NoCoverage |
| combat.dice.ts:81 | ArrowFunction | `() => undefined` | NoCoverage |
| combat.dice.ts:86 | EqualityOperator | `d.state !== 'available'` | Survived |
| combat.dice.ts:86 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:86 | StringLiteral | `""` | Survived |
| combat.dice.ts:106 | LogicalOperator | `d.state === 'spent' \|\| d.color === color` | Survived |
| combat.dice.ts:106 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:106 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:107 | LogicalOperator | `d.state === 'spent' \|\| d.color === 'wild'` | Survived |
| combat.dice.ts:107 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:107 | ConditionalExpression | `true` | Survived |
| combat.dice.ts:108 | MethodExpression | `dice` | Survived |
| combat.dice.ts:116 | BlockStatement | `{}` | NoCoverage |
| effect-modifiers.ts:31 | ConditionalExpression | `false` | Survived |
| effect-modifiers.ts:32 | ConditionalExpression | `false` | Survived |
| effect-modifiers.ts:32 | EqualityOperator | `result.amplificationValue <= INTERACTION_AMPLIFICATION.MIN_MEANINGF...` | Survived |
| effect-modifiers.ts:35 | ConditionalExpression | `true` | Survived |
| effect-modifiers.ts:35 | EqualityOperator | `clamped >= current` | Survived |
| effect-modifiers.ts:123 | ConditionalExpression | `true` | Survived |
| effect-modifiers.ts:123 | EqualityOperator | `flat >= 0` | Survived |
| effect-modifiers.ts:146 | ConditionalExpression | `false` | Survived |
| effect-modifiers.ts:149 | ConditionalExpression | `false` | Survived |
| effect-modifiers.ts:149 | EqualityOperator | `raw <= INTERACTION_AMPLIFICATION.MIN_MEANINGFUL_AMPLIFICATION` | Survived |

154 more in `mutation.json`.

### Survivors: mobile: combat presenters

No report (over budget (1380s): 564 of 2276 tested, 6 survived).

<!-- eval:mutation:end -->

<!-- eval:miss-rates:start -->

## Miss rate per judge (EV1c, A7)

Stamp: commit `4043ba25` (2026-10-17T10:40:15Z). Regenerate with `node scripts/eval/miss-rates.mjs`; inputs: ledger at `4043ba25`, parent replay at `5085b096`, planted defects at `b0ac22f8`, mutation at `15a2fa76`.

| Judge | Missed | Of | Rate | Rows it comes from | How it is counted |
|---|---|---|---|---|---|
| CI and its path filters | 4 | 4 | 100% | D1 (#534), D2 (#523), D3 (#529), D4 (#543) | 1 of 4 planted defects trigger no `verify-*` workflow (D4). Path coverage: 16 of 42 ledger PRs changed code no filter covers (#505, #507, #509, #520, #523, #526, #535, #543, #549, #565, #571, #576, #579, #583, #592, #596). |
| `verify` | 4 | 4 | 100% | D1 (#534), D2 (#523), D3 (#529), D4 (#543) | Tests as they stood at each fix's parent. Each fix's own tests catch its defect: 4 of 4. Mutation: mechanics: combat resolution: 76.3% (194 of 842 mutants survive or are uncovered); mobile: combat presenters: over budget (1380s): 564 of 2276 tested, 6 survived. |
| The antagonist | 4 | 5 | 80% | #520 (S3), #521 (S3), #523 (S3, S5), #526 (S4) | Denominator: PRs carrying a seeded escape that the antagonist reviewed before merge. It reviewed 6 of 42 ledger PRs; 1 drew a "not a pass". |
| The shadow reviewer (`pr-review`) | not measured | - | - | - | no ledger PR has a `pr-review` verdict before its merge yet (the reviewer starts with phase RV1b); the Part 4 shadow table reads 20. |
| `/critique` | not measured | - | - | - | it plays the deployed web build after merge and no ledger row records what a pass saw against what had escaped, so it has no denominator. Context: 5 follow-up fix(es) in the ledger cite a critique pass. |
| The merge gate | 4 | 42 | 9.5% | #509, #529, #541, #600 | A miss is a merge before every check on the final head finished, or over an antagonist "not a pass" (S1). |
| The builder's own `[x]` | 3 | 65 | 4.6% | #521 A4 (S3), #523 A6 (S3), #523 verify:visual (S5) | Misses: ticks the parent replay found unproven (0), the seeded S3 ticks and S5's missing shot. 49 of 65 ticks name no test, so the replay can neither prove nor clear them. |

Android has no gate at all (S6), so it has no rate (brief Decisions).

<!-- eval:miss-rates:end -->

<!-- eval:fixes:start -->

## Ranked fixes and how to tell they worked (EV1d, A8-A10)

Stamp: commit `a712832a` (2026-10-16T12:21:07Z). Regenerate with `node scripts/eval/fixes.mjs`; inputs: miss rates at `0c18f2f7`, ledger at `86eea99d`, parent replay at `5085b096`, planted defects at `b0ac22f8`, mutation at `15a2fa76`. The data is `docs/reports/eval/fixes.json`; the frozen set is `docs/reports/eval/frozen-set.json`.

### Ranked fix list (A8)

Score: the A7 misses a fix would have prevented, per size point (S 1, M 2, L 3). "Adds" counts the misses no fix ranked above it already covers. "Found" marks a fix the evidence suggested beyond the brief's list. No fix is built here.

| Rank | Fix | Gate | Size | Prevents | Score | Adds | Why | Exposure beyond the misses |
|---|---|---|---|---|---|---|---|---|
| 1 | F1 branch protection with required status checks, replacing comment matching | The merge gate | S | 3: #509, #529, #541 | 3 | 3 | every merge-gate miss is a merge before a check on the final head finished; a required check refuses that merge | 3 of 26 ledger PRs merged before a check finished (S1) |
| 2 | F2 a path-coverage audit so no diff merges unverified | CI and its path filters | S | 2: D4 (#543), #526 (S4) | 2 | 2 | a planted defect no `verify-*` workflow triggers on, and #526, which merged with only Cloudflare Pages run, both fail a check that every changed path has a gate | 9 of 26 ledger PRs changed code no filter covers |
| 3 | F4 an acceptance-ID-to-test map | The builder's own `[x]` | M | 3: #521 A4 (S3), #523 A6 (S3), #523 verify:visual (S5) | 1.5 | 3 | each builder miss is a ticked line with no test or shot behind it; a map that refuses a tick naming no test catches all three | 49 of 65 ticked lines name no test |
| 4 | F3 a structural lint for the plan queue files | The plan queue files | S | 1: D4 (#543) | 1 | 0 | the `pr-resolve` defect shows as split queue rows on `main`; a lint on the queue files fails that push even though no test covers the merge script | S2: merge c95114a2, merge 49829988, repair 23f06828, repair 662aa10b |
| 5 | F6 builder/judge separation | The builder's own `[x]` | L | 3: #521 A4 (S3), #523 A6 (S3), #523 verify:visual (S5) | 1 | 0 | a judge that is not the builder re-runs each acceptance line; it catches what F4 catches only if it runs the checks, since the antagonist, already separate, passed 4 of 5 escapes | the antagonist missed 4 of 5 |
| 6 | F9 a per-pass critique record (commit range played, findings filed) so `/critique` gets a denominator (found) | `/critique` | S | 0 | 0 | 0 | it catches nothing itself; it turns the one "not measured" judge into a measured one | 5 follow-up fix(es) in the ledger cite a critique pass. |
| 7 | F5 a fail-on-parent check for new tests | verify | M | 0 | 0 | 0 | it refuses a test that passes before the change; the replay found no tick that rests only on such a test, so it prevents no measured miss yet | 4 of 58 replayed test files could not fail; 11 new cases pass on the parent |
| 8 | F7 an Android smoke test on the preview APK | Android | L | 0 | 0 | 0 | no gate exists, so no miss is on record to prevent (S6) | S6: no `verify-*` workflow runs on Android |
| 9 | F8 diff-scoped mutation testing on a PR's changed lines (found) | verify | L | 0 | 0 | 0 | the tests as they stood caught none of the planted defects, and survivors sit in the combat code; whether mutants on the diff would have flagged them is not measured | mechanics: combat resolution: 194 of 842 mutants survive or are uncovered |

### Success evidence (A9)

**Frozen past-PR set.** Frozen at commit `a712832a` and never regenerated: a gate fix works when, replayed on each head below, it blocks every "block" row and passes every "pass" row. 7 escapes, 9 known-good.

| Ref | Head | Expected | Why |
|---|---|---|---|
| #520 | 4b1ee463 | block | S3: block: a ticked acceptance line whose test could not fail |
| #521 | d4812993 | block | S3: block: a ticked acceptance line whose test could not fail |
| #523 | 5d5fac9b | block | S3: block: a ticked acceptance line whose test could not fail; S5: block: a ticked acceptance line whose `verify:visual` shot was not taken |
| #526 | efc7f371 | block | S4: block: no `verify-*` workflow ran on code it changed |
| #529 | 9d44ca5e | block | S1: block: merged before `verify-mobile` finished on its final head, over a "not a pass" |
| c95114a2 | c95114a2 | block | S2: a `pr-resolve` merge that cut `plan/CRITIQUE.md` rows apart |
| 49829988 | 49829988 | block | S2: a `pr-resolve` merge that cut `plan/CRITIQUE.md` rows apart |
| #514 | 18f01653 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #528 | af2c11e5 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #537 | 7e216a55 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #545 | f548516f | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #553 | 988640ae | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #555 | cf090553 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #557 | 1729a428 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #559 | 0ac5eded | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |
| #562 | 4ed594e9 | pass | known-good: no follow-up in 7 days, every path covered, every check done before the merge |

**Seeded-defect catch-rate target.** On the next 4 real bugs fixed on `main` after this stamp, replayed by `node scripts/eval/seeded-replay.mjs`: every planted defect triggers at least one `verify-*` workflow (target 100%, now 75% of 4), and CI or the tests as they stood at the defect's parent catch at least 50% (now 0%). The fix's own tests are not counted; they are written after the bug is known.

**Change-failure baseline.** Of the last 20 PR merges on `main` that changed code (merges that touch only `plan/`, `telemetry/`, `docs/reports/` or `devlog/entries/` are left out), 0 drew a fix or revert touching the same files within 7 days: 0%, an upper bound, since a shared file names a candidate, not a cause. Reverts alone, the floor: 0 (0%). 20 of the 20 merges are under 7 days old at the stamp, so their window is still open; rerun on or after 2026-10-23, when the newest window closes, for the final baseline. Compare the next 20 code merges by the same method, read from `git log --first-parent` alone.

| PR | Merge | Merged | Follow-ups (7d) | Window |
|---|---|---|---|---|
| #581 feat: hazard puzzle layout and one-round session — phase B3a | 4f29f34e | 2026-10-16T08:20 | none | open |
| #579 eval: planted defects, mutation scores and the miss-rate table — phase EV1c | a3df0db6 | 2026-10-16T08:19 | none | open |
| #577 Sentry: screen load times, JS stalls and tap transactions on preview | 356547ff | 2026-10-16T08:19 | none | open |
| #576 eval: do the tests fail on the parent — phase EV1b | 6b5e2b6d | 2026-10-15T21:34 | none | open |
| #575 Sentry: per-build releases, native symbols, crash test buttons | e1ceefbd | 2026-10-15T21:33 | none | open |
| #573 refactor(mobile): delete the encounter-overlay era, labyrinth combat e2e — phase CR1b | eec2e423 | 2026-10-15T21:33 | none | open |
| #571 feat(mechanics): level curve to 20 by the end of Act 1 — phase LV1 | 2f2a6c69 | 2026-10-15T17:29 | none | open |
| #569 feat(mobile): live combat on its own route — phase CR1a | 71fc062e | 2026-10-15T16:55 | none | open |
| #565 eval: the escape ledger — phase EV1a | 4893340f | 2026-10-15T15:25 | none | open |
| #563 plot: B3 — the hazard as a fixed puzzle | f9cfb37c | 2026-10-15T14:34 | none | open |
| #549 perf(mobile): Sentry performance on preview builds, combat drag spans — phase PF3 | 48aa808f | 2026-10-15T14:23 | none | open |
| #562 fix: a hazard scar mends at any rest, not only at an inn (AUDIT Scarred never clears) | 44719db2 | 2026-10-15T11:05 | none | open |
| #559 a11y: announce the SACRIFICE floor line on each refusal (CRITIQUE antagonist PR #523) | 691ec550 | 2026-10-15T10:59 | none | open |
| #557 fix(combat): HUD clock line in full at 11px (CRITIQUE pass 88) | d82f5365 | 2026-10-15T10:33 | none | open |
| #555 fix(combat): END keeps the dock's right edge on a wide window (CRITIQUE pass 87) | b5b395ad | 2026-10-15T01:55 | none | open |
| #553 perf(mobile): no exploration map under live combat — phase PF4 | 1df5499e | 2026-10-14T20:19 | none | open |
| #551 loop: size labels on plot and loop:pr PRs | 5a5b73e6 | 2026-10-14T15:16 | none | open |
| #547 loop: T's own moves go to plan/NEEDS_T.md, never lessons (D94) | 7877633c | 2026-10-14T15:09 | none | open |
| #546 loop: /plot splits a task into one-tick phases and lands by a plot PR (D93) | cef98c11 | 2026-10-14T13:35 | none | open |
| #545 fix: hazard cast and stamp springs name mass and energyThreshold (AUDIT hazard springs mass 4) | ba23efa7 | 2026-10-14T12:08 | none | open |

## For `/messy`

One theme per gate, raw, for T to paste into `/messy`. EV1 builds none of it.

```text
CI and its path filters: missed 4 of 4 (D1 (#534), D2 (#523), D3 (#529), D4 (#543)). Candidate fixes: a path-coverage audit so no diff merges unverified (S, prevents 2, ranked 2 of 9).

verify: missed 4 of 4 (D1 (#534), D2 (#523), D3 (#529), D4 (#543)). Candidate fixes: a fail-on-parent check for new tests (M, prevents 0, ranked 7 of 9); diff-scoped mutation testing on a PR's changed lines (L, prevents 0, ranked 9 of 9).

The antagonist: missed 4 of 5 (#520 (S3), #521 (S3), #523 (S3, S5), #526 (S4)). No candidate fix aims at this gate.

/critique: not measured: it plays the deployed web build after merge and no ledger row records what a pass saw against what had escaped, so it has no denominator. Context: 5 follow-up fix(es) in the ledger cite a critique pass. Candidate fixes: a per-pass critique record (commit range played, findings filed) so `/critique` gets a denominator (S, prevents 0, ranked 6 of 9).

The merge gate: missed 3 of 26 (#509, #529, #541). Candidate fixes: branch protection with required status checks, replacing comment matching (S, prevents 3, ranked 1 of 9).

The builder's own [x]: missed 3 of 65 (#521 A4 (S3), #523 A6 (S3), #523 verify:visual (S5)). Candidate fixes: an acceptance-ID-to-test map (M, prevents 3, ranked 3 of 9); builder/judge separation (L, prevents 3, ranked 5 of 9).

The plan queue files: not one of the A7 judges. Candidate fixes: a structural lint for the plan queue files (S, prevents 1, ranked 4 of 9).

Android: not one of the A7 judges. Candidate fixes: an Android smoke test on the preview APK (L, prevents 0, ranked 8 of 9).

Evidence for every line: docs/reports/eval/latest.md (EV1a-EV1d) and its JSON beside it.
```

<!-- eval:fixes:end -->
