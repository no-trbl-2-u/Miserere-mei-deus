# Audit

> Findings queue for `/iterate`. Each row is scored
> `impact x ease / 10` (see `skills/iterate.md` §4). The Pending
> section is the loop's drain target; `/iterate` picks the
> highest score, ships one fix, moves the row to Done. Categories:
> see `plan/bearings.md` § "AUDIT category taxonomy".
>
> Seeded 2026-07-03 from the retired per-package harness
> (`/archive`) during nexus re-onboarding — stale/pre-monorepo
> findings were dropped; these were re-validated as still
> plausibly live. Verify each against current code before
> shipping; re-file or drain as reality dictates.

> **Bias: revamp support (set via /oversight 2026-09-28; replaces the
> 2026-09-17 backlog-drain banner, which weighed rows against the content
> steward rotation that R0 archived).** Until RC (the Act 1 checkpoint
> release, `plan/revamp/checkpoint.md`) ships, `/iterate` weights
> `[tests]`, `[debt]`, `[docs]`, `[contract]` and `[divergence]` rows 1.5x
> and **skips `[content]` rows and content `[gap]` rows** (people, story,
> art, new enemies/cards/relics/maps): they stay filed for R11 and the
> owner-led B-rows, and D58 forbids the loop authoring them. A row whose
> subject an R-phase deletes is closed by that phase, not fixed first.
> Any `next:` line that routes to `/adjust-*`, `/forge`, `content-curator`,
> `card-expert`, `mechanics-expert`, `reader` or the archived design skills
> is void (archived in R0); read the row's detail and route it to the
> R-phase that owns the subject or leave it for R11. T answered the
> `/oversight` ballot "Revamp-support bias".

> Pass narrative through the eleventh pass (2026-09-24) and resolved rows
> moved verbatim to `archive-pre-revamp:plan/archive/AUDIT_2026.md` (TRIM THE FAT T4, 2026-09-25).

### [loop-call] 2026-10-28 — the cache's TAKE THE GOODS reveals its rolled goods (CRITIQUE pass 108, issue #1041)
- call: show the goods before the pick rather than rewrite the copy to say "sight unseen". RW1b (A8) treated a blind TAKE A CARD as a defect (CRITIQUE RC2 item 11) and left TAKE THE GOODS untouched without ruling it hidden; the goods are rolled at session creation, so the reveal is presentation only and makes the one-way pick symmetric.
- reversible by T: drop the offer's `goods` chips in `cache.engine.ts` and the copy can say the box is blind.

# Site audit — 2026-10-25

## Top 5 findings (scored)

The bias banner above reads "until RC ships"; RC shipped 2026-10-02, so this
pass scores without its 1.5x. The banner stays until `/oversight reset`.

### [3.6] CRITIQUE pass 100 [MED]: covered hand-fan names at 375 all read "A PLAIN …"
- category: external-critique
- impact: 6
- ease: 6
- next: `/iterate`: T ruled 2026-10-27 (via /oversight): rename the grey starters, dropping "A Plain" (see the `[content]` Pending row "Rename the grey starters"); BT2a A3's one-line names stand

### [3.0] CRITIQUE pass 89 [LOW]: the rest and cache spent-node line mixes tenses (picked; issue #911)
- category: external-critique
- impact: 3
- ease: 10
- next: shipped on `loop/iterate-rest-tense`

### [2.4] CRITIQUE pass 100 [LOW]: the critique-drive hazard capture is unseeded
- category: external-critique
- impact: 3
- ease: 8
- next: `/iterate`: inject a fixed seed with `minigame-seed-injector.mjs`

### [2.1] CRITIQUE [LOW]: the opening hand never reaches the fight's event stream (BE2f)
- category: external-critique
- impact: 3
- ease: 7
- next: `/iterate`: the recorder stamps one `hand-drawn` at ms 0

## Pending

### [ ] [content] measured drift: bw-8/green-jelly grey winRate 100% -> 83% (even, 2026-10-28)
- issue: #1029
- category: content
- impact: 4
- ease: 3
- detail: the measured-truth run moved winRate for bw-8/green-jelly with the grey deck (even spread) from 100% at 160385b to 83% at 6ba3c34 (`docs/reports/measured/history.jsonl`, `latest.md`).
- next: T's call. A balance drift is fixed by retuning a card, deck or enemy, which `/iterate` may not do (D88, D99); this row waits for a brief T approves. `/iterate` may bisect the commits between the two history lines and add what it finds here, nothing more.
- evidence 2026-10-28: body-mind 100% -> 83% at 6ba3c34
- evidence 2026-10-28: body 100% -> 83% at 6ba3c34

### [ ] [content] measured drift: bw-8/green-jelly grey lowestVitaeFractionP10 0.25 -> 0.00 (even, 2026-10-28)
- issue: #1030
- category: content
- impact: 4
- ease: 3
- detail: the measured-truth run moved lowestVitaeFractionP10 for bw-8/green-jelly with the grey deck (even spread) from 0.25 at 160385b to 0.00 at 6ba3c34 (`docs/reports/measured/history.jsonl`, `latest.md`).
- next: T's call. A balance drift is fixed by retuning a card, deck or enemy, which `/iterate` may not do (D88, D99); this row waits for a brief T approves. `/iterate` may bisect the commits between the two history lines and add what it finds here, nothing more.
- evidence 2026-10-28: body-mind 0.25 -> 0.00 at 6ba3c34
- evidence 2026-10-28: body 0.25 -> 0.00 at 6ba3c34

### [ ] [content] Rename the grey starters: drop "A Plain" from every name (T, via /oversight 2026-10-27)
- category: content
- impact: 6
- ease: 6
- detail: CRITIQUE pass 100 [MED]: at 375 the hand fan covers every card but the
  last, and BT2a A3 (one-line names, T 2026-10-13) leaves only "A PLAIN W…"
  visible, so Blow, Word and Ward look the same. T's call: keep A3 and rename
  the cards instead, dropping the "A Plain" prefix (`A Plain Blow` -> `Blow`,
  `A Plain Ward` -> `Ward`, `A Plain Word` -> `Word`, and any other "A Plain"
  card). Source: `axiomancer-mechanics/src/Cards/library/starters.cards.ts`;
  pinned at least in `cards-sandbox.engine.test.ts`. Grep the tree (mobile
  copy, glossary, guides, ballots, critique fixtures) for the old names. T
  authored this content call, so D58 does not block it; the bias banner's
  `[content]` skip does not apply to an owner-ruled rename. "Let's try this":
  re-capture the 375 hand fan after the rename and note in the Done line
  whether the covered names now read apart.
- next: `/iterate` (rename + tests + a 375 capture).

### [ ] [ci] The shadow review burns runs on cancel-in-progress: 418 of ~1000 `pr-review.yml` runs cancelled (2026-10-17..27) (T, via /oversight 2026-10-27)
- category: ci
- impact: 5
- ease: 6
- detail: R11 watch count for the window since the 2026-10-17 oversight:
  `pr-review.yml` 506 success, 73 failure, 418 cancelled, 3 blank. The job's
  concurrency `pr-review-<PR>` with `cancel-in-progress: true` (brief RV1)
  throws away a review whenever a new head lands mid-run (autofix, merges of
  main into the PR head, the loop's own follow-up pushes). Measure how many
  cancelled runs had already reached the Claude step (the paid part), then
  pick the fix: debounce (wait N minutes for the head to settle before the
  Claude step), skip the review on heads that only merge `main`, or let a run
  finish once Claude has started. File the choice as `[loop-call]` residue.
- next: `/iterate` (measure, then the workflow change).

### [x] [ci] SG1 leaves `route:item-reward` with no play path and no dev seam (feature-map drive red on PR #928) — CLOSED 2026-10-26 (fixed on the PR in e7a1033c8: the dev REWARDS row's RELIC REWARD offers the Bleeding Signet through `offerItemRewardAction`, and `SEAMS['route:item-reward']` reaches the route through it; `e2e:feature-map` passes locally)
- category: ci
- impact: 4
- ease: 5
- detail: run 40262955599 (`verify-mobile`, head 8a810580, branch
  `loop/ship-SG1-no-starting-ring`) and `verify-mechanics` fail the
  `e2e:feature-map` drive: `reachable route not reached: route:item-reward`
  ("no play path and no dev seam reaches route:item-reward"). Root cause:
  the reward screen was reached only through the first-node relic hand-over
  (`ItemRewardGate` first-node arm), which SG1 deleted. The screen now opens
  only for equipment with a signature or modifiers (`qualifiesForItemRewardScreen`),
  and the cache, gathering, fight and hazard in the drive's play walk queue
  none. The dev chips wear relics directly (SG1), so no `SEAMS` entry in
  `scripts/feature-map-e2e.mjs` can open it. Fix needs a seam decision: a dev
  control that offers a signature relic through `offerItemRewardAction`, or a
  state-fixture field that stages a pending reward with `arrive` → `/item-reward`
  (the fixture builder cannot stage the transient `itemReward` slice today).
  Not a one-line fix, so it is filed here, not suppressed. Note the SEAMS
  table and the feature map `driven` / `reachable` values for item-reward
  must move with whichever seam lands.
- proposed: add the dev seam, add a `SEAMS['route:item-reward']` entry, rerun
  `npm run e2e:feature-map -w axiomancer-mobile` and `npm run verify -w axiomancer-mobile`.

### [x] [contract] The Blood Price art index breaks the trial-set-removal contract (UP1a art, 2026-10-22) — CLOSED 2026-10-25 (already fixed in 3b4e618c, phase UP1b: `trial-set-removal.engine.test.ts` allowlists `axiomancer-mobile/assets/images/cards/index.ts`, since Metro needs a literal id per painting and an unmapped id falls back; the test passes on main; found unticked this pass)
- category: contract
- impact: 5
- ease: 6
- detail: `src/Cards/e2e/trial-set-removal.engine.test.ts` pins that no code
  outside `blood-price.cards.ts` and its own test names a `bp-` card id, so
  deleting that one file and its `TRIAL_SETS` line is a clean removal.
  `feat(art): torio paintings for the 30 Blood Price cards` (7726a5730,
  2026-10-22) added a `'bp-e-01n': require(...)` style dictionary to
  `axiomancer-mobile/assets/images/cards/index.ts`, one entry per card, which
  the test's whole-repo scan now flags: `npm run verify` is red on `main`
  (confirmed on a clean checkout, unrelated to anything else). The PR that
  shipped this only touched `axiomancer-mobile/assets/**`, so it never
  triggered `verify-mechanics` (the workflow that runs this test) and
  nothing caught it before merge — the mobile-vs-mechanics path-filter gap
  LG1b was built to close, from the other direction (a mechanics-owned test
  reads a mobile-owned path).
- next: `/iterate` — decide whether the art index should key off a card's
  art lookup type instead of its literal id string (so the scan stops
  matching it), or whether the trial-set contract now only needs to hold for
  `axiomancer-mechanics/src` since the Blood Price set is no longer slated
  for removal post-D99; either way, read `plan/revamp/cards.md` ("The trial
  set") before changing the rule, not just the index.

### [x] [debt] The escape ledger classifies past PRs against today's verify-* filters, so verify-root reads as expected-but-not-run on every older scripts/ PR (LG1b, 2026-10-22) — CLOSED 2026-10-25 (iterate: `escape-ledger.mjs` classifies each PR against `verifyWorkflowsAt(mergeCommit)`, the merge tree's `verify-*` files parsed by the new pure `verifyWorkflowsFrom` in `ledger-lib.mjs`; the ledger header and the Android seed keep today's filters; seed S4, which read unconfirmed once verify-root covered #526's paths, confirms again; `escape-ledger.test.mjs` pins it)
- issue: #909
- category: debt
- impact: 4
- ease: 7
- detail: `scripts/eval/escape-ledger.mjs` reads the live `.github/workflows/verify-*.yml` filters once and classifies every merged PR in the window with them (`classifyPaths`, then `expectedNotRun`). Phase LG1b added `verify-root.yml`, which owns `scripts/`, `.github/`, `skills/` and the top-level files, so the next ledger run lists `verify-root.yml` as triggered but not run on every PR merged before it existed (#526 among them) and stops counting those paths as uncovered. Any earlier filter change had the same skew, just smaller. Reading each workflow's filter at the PR's merge commit (`git show <sha>:.github/workflows/<file>`, skipping a file that did not exist there) keeps the history as it was. The seeded replay should keep the live filters: it measures today's gate.
- next: `/iterate` — a `verifyWorkflowsAt(sha)` in `escape-ledger.mjs` with a fixture test in `scripts/eval/escape-ledger.test.mjs`.

### [ ] [tests] No state fixture wears a relic or boots a dying board, so the critique drive cannot see the relic icons or the DY1d skull (iterate 2026-10-28)
- category: tests
- impact: 4
- ease: 6
- detail: The critique drive now opens the satchel (`sage-bw-door-gate`) and `/death-return`, but every preset's `equipment` resolves to nothing (`Character/presets.ts`, "a run starts with none"), so the satchel shows only phials and IT1b's relic icons stay unseen; and no fixture stages a fight with the player dying, so DY1d's skull on the combat panes has no capture. Fix: a registry fixture with a `player.equipment` (or relic) override wearing one live relic, and one whose fight boots at 1 VITAE with `dying` set; then point the drive's `satchel` entry at the first and add a `combat-dying` entry. Fixture test data only, no roster change.
- source: iterate (CRITIQUE pass 107 HIGH, follow-up)

### [ ] [finding] Five reachable routes have no play path from a fresh save, only shell-gate edges (FM1d drive, 2026-10-21)
- category: finding
- impact: 4
- ease: 5
- detail: The feature map marks blacksmith, rest, village, dialogue and labyrinth reachable because every shell gate (BlacksmithGate, RestGate, EventGate, LabyrinthGate) is mounted at the root layout, so each route gets a flow edge from every other. The FM1d drive reaches all five only through a dev seam or a state fixture: the Act 1 walk does not pass a rest or anvil node, Act 1 stages no NPC and no shop (R7e, the STORY dev section lists 0 NPCs), and the labyrinth is late-game. The map's `reachable` is therefore "a gate exists", not "a player gets there". A finer reachability (node kinds on the start maps, staged events) would make the flag honest; until then the drive report marks these routes "dev seam or state fixture only".

### [x] [debt] pr-resolve's union merge splits a row one side moved Pending to Done and bloats CRITIQUE.md (iterate 2026-10-14) — CLOSED 2026-10-14 (80ea6f44: line order from `git merge-file --union`, the three-way count trim drops a trimmed heading's body first, blank runs capped; loop-pr.test.mjs pins it; CRITIQUE.md repaired)
- issue: #542
- category: debt
- impact: 8
- ease: 8
- detail: `unionMerge` placed theirs' lines by an anchor walk, so shared generic lines jumped the anchor ahead. Every pr-resolve merge with clean inputs left a headerless body in Pending, appended its header near the end of the file and added about 85 blank lines; one AUDIT.md merge (5790525d) spliced a `[loop-call]` row into another row. Reproduced byte for byte on beac7799.

### [x] [infra] pr-resolve never resolves a non-union conflict: its Claude job fails "Unsupported event type: push" every time (expand pass 33, 2026-10-14) — CLOSED 2026-10-14 (761da24c: the push run's scan starts one workflow_dispatch run of pr-resolve.yml per conflicted PR, and the Claude resolve runs only there; loop-pr.test.mjs pins it. First live proof is the next non-union conflict)
- issue: #524
- category: infra
- impact: 7
- ease: 7
- detail: `pr-resolve.yml` runs on `push` to `main`. Its `scan` job merges
  main into conflicting `loop:pr` branches and hands any non-union conflict
  to the `resolve` job, which calls `_claude-skill.yml`
  (`anthropics/claude-code-action@v1` with a `prompt`). That step exits in
  about 0.3s with `Action failed with error: Unsupported event type: push`.
  All 6 failed runs in the last 45 are this (runs 38494524908 and
  38502443273 checked: PRs #520 and #523), so no conflict has ever been
  resolved by the Claude step; #520's was settled by hand (`fc4aa159`).
  `ci-autofix` and `pr-autofix` work because they run on `workflow_run`.
- next: give the resolve step an event the action accepts (have `scan`
  start one `workflow_dispatch` run per item, or move `resolve` into a
  `workflow_run` workflow keyed on pr-resolve), then prove it on a staged
  conflict. Infra only; nothing about merging, closing or force-pushing
  changes (D86).

### [x] [bug] The hazard dice cast's springs inherit Reanimated 4's mass 4, so they swing for many seconds (2026-10-14) — CLOSED 2026-10-14 (784d6a1e: TumblingDie uses DICE_ROLL_TIMING's springs; the stamp gets STAMP_SPRING, mass 1, threshold 0.01; HazardOverlays.test.tsx pins it under a second. The cast's 1700ms timer never waited on the springs)
- issue: #544
- category: bug
- impact: 4
- ease: 8
- source: iterate (found while fixing the combat tray's dice springs, branch loop/iterate-drive-settle)
- detail: `components/hazard/HazardOverlays.tsx` `TumblingDie` (~:49-50, :113)
  calls `withSpring` with only damping and stiffness, the same configs the
  combat tray used. Reanimated 4.1 fills an unset `mass` with 4 and
  `energyThreshold` with 6e-9, so a damping-6 spring takes about 12s to
  finish. On the combat tray this hung each die tilted above the tray and
  kept the tap-to-skip layer over the dice for about 20s (fixed by naming
  `mass: 1, energyThreshold: 0.01` in `DICE_ROLL_TIMING`). Whether the
  hazard cast's interstitial waits on these callbacks is unchecked.
- next: name mass and energyThreshold on the three hazard springs (or share
  `DiceSpring` values), then check the cast's timing on the built app.

### [content] map copy: Breakwater node blurbs that do not match their events (AW1b, 2026-10-26)
- category: content
- impact: 3
- ease: -
- source: Phase AW1b, `axiomancer-mobile/state/exploration-maps/__tests__/node-blurb-event.test.ts` (`PINNED_MISMATCHES`); the swarm's R13 in `docs/reports/playtest-elementalist-act1-2026-10-24.md`.
- detail: three Breakwater nodes share no content word between the map blurb (`axiomancer-mobile/state/exploration-maps/breakwater.layout.ts`) and the event copy the node opens (`axiomancer-mechanics/src/World/MapEvents/content.ts`). The two caches draw from the shared `COAST_LOOT_CACHES` rotation, not copy written for the place; the Anvil uses the one `ANVIL_LINE` every region shares.
  - [ ] bw-5 The Smugglers' Cove (loot-cache). Blurb: "Boats beached under the cliff. Their owners are elsewhere." Event: "A waterlogged strongbox wedged under the pilings."
  - [ ] bw-15 The Clifftop Chapel (loot-cache). Blurb: "An empty chapel over the sea. The poor box is not." Event: "A purse of shillings snagged in the netting, its owner long gone."
  - [ ] bw-16 The Fishing Hamlet (blacksmith). Blurb: "Fish dry on the racks. Nobody is watching them." Event: "A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice."
- next: T's call per node (map copy, D88): rewrite the blurb, give the node event copy of its own, or rule the pair fine. The test's pin for a node goes in the same change, or the stale-pin case fails.

### [content] map copy: Charcoal Wood node blurb that does not match its event (AW1b, 2026-10-26)
- category: content
- impact: 3
- ease: -
- source: Phase AW1b, `axiomancer-mobile/state/exploration-maps/__tests__/node-blurb-event.test.ts` (`PINNED_MISMATCHES`).
- detail: one Charcoal Wood node shares no content word between its map blurb (`charcoal-wood.layout.ts`) and its event copy (`World/MapEvents/content.ts`, the shared `ANVIL_LINE`).
  - [ ] cw-18 The Well (blacksmith). Blurb: "A covered well. The cover is rotten." Event: "A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice."
- next: T's call (map copy, D88): a blurb that names the forge, an Anvil line of its own for the well, or the pair ruled fine. The pin goes in the same change.

### [content] map copy: Beacon Crags node blurb that does not match its event (AW1b, 2026-10-26)
- category: content
- impact: 3
- ease: -
- source: Phase AW1b, `axiomancer-mobile/state/exploration-maps/__tests__/node-blurb-event.test.ts` (`PINNED_MISMATCHES`).
- detail: one Beacon Crags node shares no content word between its map blurb (`beacon-crags.layout.ts`) and its event copy (`World/MapEvents/content.ts`, the shared `ANVIL_LINE`).
  - [ ] bc-12 The Gorge Falls (blacksmith). Blurb: "The water has cut the seam open. The iron is free." Event: "A lean-to forge, coals still breathing. The smith looks up from the anvil and nods at your dice."
- next: T's call (map copy, D88): a blurb that names the forge, an Anvil line of its own for the falls, or the pair ruled fine. The pin goes in the same change.

### [content] map content: the seven Act 1 gathering nodes grant materials nothing spends (AW1b, 2026-10-26)
- category: content
- impact: 4
- ease: -
- source: Phase AW1b (A10); `plan/phases/phase_AW1_act1_walk.md` Sources; `plan/playtest-harness.md` "Where things stand".
- detail: `kind: 'gathering'` is live, not minigame residue: it replaced the retired Gleaning minigame (save v18 to v19), grants one named material through the paced `/event` receipt, advances `collect` quest objectives and feeds the hazard puzzle outcome and the labyrinth pools. Seven Act 1 nodes carry it: bw-4, bw-11 (Breakwater), cw-4, cw-8, cw-14 (Charcoal Wood), bc-7 (Beacon Crags), ld-7 (Lantern Deep). But no code in mechanics or mobile spends a material, so every grant is a dead end for the player.
- next: T's call (map content, D88), one of: (a) keep the nodes as they are; (b) give materials a use (a brief T approves: the Anvil, a quest, a shop); (c) re-point the seven nodes to another kind. The plot's leading option is (a) with (b) to follow.

### [content] roster: the Bleeding Signet is granted by nothing (item-ungranted, RH1, 2026-10-13)
- category: content
- impact: 4
- ease: -
- detail: `npm run roster-health -w axiomancer-mechanics` reports
  `relic-bleeding-signet` (`Items/relic.library.ts`) as an orphan: no
  cache, shop, loot table, starting loadout or reward carries it; only the
  dev menu's GET ALL RELICS hands it over. Pinned in
  `World/e2e/roster-health.engine.test.ts` (`PINNED_ORPHANS`).
- next: needs a brief T approves: stage it, grant it, or retire it (D88).
  The pin changes in the same change.

### [content] Card-rules fence: 18 Blood Price cards pinned over the complexity budget (Phase CS1, 2026-10-13)
- category: content
- impact: 4
- ease: 6
- source: Phase CS1 (`axiomancer-mechanics/src/Cards/e2e/card-rules.engine.test.ts`, rule `complexity-budget`); pinned in `card-rules.exemptions.json`.
- detail: every Blood Price card is rank 1 (Ash), and the budget T ratified (ballot §9) allows Ash 1 keyword beyond DEAL and GUARD and no condition; a Global's trigger counts as a condition. One item per pinned card:
  - [ ] P-03a: 1 condition (at half VITAE), max 0.
  - [ ] P-04c: 1 condition (at half VITAE), max 0.
  - [ ] P-05b: 2 keywords (SACRIFICE, VULNERABLE), max 1.
  - [ ] P-08d: 2 keywords (SACRIFICE, TETHER), max 1.
  - [ ] P-09b: 2 keywords (SACRIFICE, VULNERABLE), max 1.
  - [ ] P-10c: 1 condition (trigger: sac), max 0.
  - [ ] E-02d: 2 keywords (SACRIFICE, TETHER), max 1.
  - [ ] E-03d: 2 keywords (LEECH, SACRIFICE), max 1; 1 condition (trigger: turn), max 0.
  - [ ] E-04c: 2 keywords (SACRIFICE, WAIVE), max 1.
  - [ ] E-05n (Open Vein): 3 keywords (LEECH, SACRIFICE, TETHER), max 1.
  - [ ] E-09n (Crimson Pact): 1 condition (trigger: sac), max 0.
  - [ ] E-10d: 2 keywords (SACRIFICE, TETHER), max 1.
  - [ ] M-01d: 2 keywords (HEAL, LEECH), max 1.
  - [ ] M-03d: 1 condition (at half VITAE), max 0.
  - [ ] M-04n (Transfusion): 2 keywords (HEAL, SACRIFICE), max 1.
  - [ ] M-05b: 1 condition (at half VITAE), max 0.
  - [ ] M-07a: 2 keywords (HEAL, VULNERABLE), max 1; 1 condition (each time), max 0.
  - [ ] M-08d: 2 keywords (LEECH, SACRIFICE), max 1; 1 condition (trigger: sac), max 0.
- next: T's next card session (D37). Ballot §3 ("rank follows complexity") points at re-ranking these cards rather than cutting keywords; either way the change is a card change. Re-seed the fixture after it (`docs/card-spec.md` §17). The loop does not touch these cards.

### [content] Card-rules fence: 22 Elementalist cards pinned over the complexity budget, one over the Global template (Phase EL1c, 2026-10-24)
- category: content
- impact: 3
- ease: 6
- source: Phase EL1c (`axiomancer-mechanics/src/Cards/e2e/card-rules.engine.test.ts`); pinned in `card-rules.exemptions.json`.
- detail: every Elementalist card is rank 1 (Ash), as Blood Price. Most print two or three weather keywords (BLIZZARD, DRAW, INFERNO, STORM, FROZEN, HEAL, VULNERABLE) where Ash allows 1, and the ⟳ Globals and the "if the foe is burning / FROZEN" lines carry a condition where Ash allows none:
  - [ ] Over on keywords: P-06, P-08, P-09, E-03, E-05, E-07, E-08, E-10, M-01, M-02, M-03, M-04 (3), M-07, M-09.
  - [ ] Over on conditions: P-01, M-06 (`if`); E-06 (trigger).
  - [ ] Over on both: P-07, P-10, E-09, M-08, M-10.
  - [ ] Global template: E-06 prints "(while in play)" in its body, a duration word (T's note's wording).
- next: T's revisions (lane-creator step 7): re-rank or trim, as for Blood Price. Re-seed the fixture after it.

### [content] Card-rules fence: 5 atlas words pinned under the carrier rule or the admission bar (Phase CS1, 2026-10-13)
- category: content
- impact: 3
- ease: 7
- source: Phase CS1 (`card-rules.engine.test.ts`, rule `carrier-rule`); pinned in `card-rules.exemptions.json`.
- detail: one item per pinned word:
  - [ ] BLEED: an atlas row with no carrier (B4 F1). T ruled it retired (ballot §8, Residue 3); the pin goes when that fix lands.
  - [ ] WAIVE: 1 card (E-04c), the admission bar needs 2 cards or 2 enemies.
  - [ ] BOON: 0 cards; carried only by the dice (every die's special face).
  - [ ] HONE: 0 cards; carried only by the anvil.
  - [ ] TEMPER: 0 cards; carried only by the anvil.
- next: T's next card session (D37). BOON, HONE and TEMPER fail the bar because the atlas files them as Card keywords (the dice section) while no card prints them: T either moves them to Rule keywords or adds them to the bar's system exemptions (CONVICTION, RESERVE, WILD, PIP today). WAIVE needs a second carrier or a cut. Re-seed after.

### [ ] [tests] `combat-encounter`'s first capture in a full `verify:visual` run differs by one pixel (2026-10-20)
- category: tests
- impact: 5
- ease: 5
- detail: VE1b's `SMOKE_RUNS=5` (PR #663) found the one nondeterministic route. In a full 13-route run, the first
  live-fight capture differs from runs 2-5 at (127,64), the antialiased top-left corner of a 1px `blood` rounded
  border (rgb 210,84,64 vs 204,81,62). It is byte-stable shot alone, after one other route, and in a standalone
  probe, and no CSS animation is running at the ready signal. It stays under the 0.5% gate, but it blocks VE1's
  "0 nondeterministic routes" Measure and any parallel capture.
- next: once VE1c's CI step runs `SMOKE_RUNS=2`, read whether the CI renderer shows it. If it does, bisect the
  preceding routes (`SMOKE_ONLY` with growing prefixes) to find the one that leaves state behind, and fix that
  leak or give the live fight a fresh browser.

### [x] [loop-call] RV1 A7's seeded-branch push is still `[T to confirm]` (2026-10-19) — RATIFIED via /oversight 2026-10-27 (T confirmed the eval/* draft pushes as written; the brief records it, and the seeded-replay row below is unblocked on that side)
- category: loop-call
- impact: 3
- ease: 9
- detail: brief `plan/phases/phase_RV1_pr_review_pipeline.md` (Decisions, "A7 pushes seeded branches, as drafts,
  and deletes them") amends EV1's "planted defects never leave the machine" for the review judge and is marked
  `[T to confirm]`. RV1c shipped (#610). T's 2026-10-19 decision round confirmed every other open default but
  was not asked this one. The seeded replay row below depends on it, since it pushes eight `eval/*` branches.
- next: `/oversight` asks T once; record the answer in the brief (`(T confirmed <date>)` or the change).

### [ ] [tests] Run the seeded review replay on the three-lens reviewer once RV1c is on `main` (2026-10-17)
- category: tests
- impact: 6
- ease: 8
- detail: phase RV1c (#610) shipped `node scripts/eval/seeded-replay.mjs
  --judge review` and the three lenses in `skills/review.md`, but the
  `review` job runs `main`'s copy of the skill (its `pre_run`), so neither
  the fan-out nor its replay can be measured before T merges RV1c. The
  seeded-review section of `docs/reports/eval/latest.md` reads "not
  measured" until then. Once RV1c is on `main`: run the command (it pushes
  eight `eval/*` branches, opens them as `eval:seed` drafts, dispatches
  `pr-review.yml` on each, waits up to 35 min, then closes every PR and
  deletes every branch), commit `docs/reports/eval/seeded.json` and
  `latest.md`, and check `gh pr list --label eval:seed` is empty. This
  also proves brief RV1 A7 and the RV1c Measure line (lens tags on a
  verdict: read any medium or high `loop:pr` PR's verdict after the merge).
- next: `/iterate` (a measurement run, plan-only diff under `docs/reports/`).

### [ ] [tooling] The guard's post-write lexicon check reports false findings in a worktree (2026-10-11)
- category: tooling
- impact: 4
- ease: 7
- detail: editing `plan/revamp/loop.md`, `plan/revamp/README.md` and
  `plan/steps/01_build_plan.md` from a `.claude/worktrees/*` session made
  the `post-write` hook (`.claude/hooks/guard.mjs` `postWrite`) block with
  28 retired-term findings, all on lines the edit did not touch, printed as
  `../.claude/Axiomancer/<worktree>/plan/...`. `node
  scripts/check-lexicon.mjs` run inside the worktree on the same files is
  clean. Likely cause: the hook runs from the main checkout
  (`$CLAUDE_PROJECT_DIR`), so `check-lexicon`'s `ROOT` is the main
  checkout and the worktree file's repo-relative path starts with `../`,
  which no dated-record zone matches. Every worktree edit to a zoned file
  trips it, and the noise trains sessions to ignore a real gate.
- next: in `postWrite`, run `check-lexicon` with `cwd` set to the git
  toplevel of the written file (`git -C <dir> rev-parse --show-toplevel`),
  and pass the path relative to that root; add a `guard.mjs self-test`
  case for a worktree path. R11's first retro is a natural home.

### [x] [bug] P-07b's printed "(max 30)" does not cap its paid line (RC2 walk, 2026-10-11) — CLOSED 2026-10-13 (0cd35985: DEAL body-scaled the resolved VITAE lost, 30 became 114; both lines now DEAL it `exact`, unscaled, like "HEAL the damage dealt"; blood-price.engine.test.ts pins the caps at body 19)
- issue: #513
- source: RC2 walk 2026-10-11 (eb75f451, Blood Price test deck, attended; accepted for the v0.2.0 tag by T, D83)
- category: bug
- impact: 8
- ease: 7
- detail: Leg 4 logged P-07b ("DEAL all the VITAE you lost this combat (max 30). EXILE.") paid plays dealing 114 (seq 3063, a Float-Eye at ld-11, after far less than 114 VITAE lost), 114 again on the Doorwarden (seq 3428), 48 and 32. Printed numbers elsewhere scale with stats, but the cap does not scale and 114 is not a scaled 30 either. Printed must equal applied.
- next (`/iterate`): find where the card program resolves "VITAE lost this combat" and its cap in `axiomancer-mechanics/src/Combat/` (P-07b in the Blood Price library); check whether the cap is skipped on the paid line or scaled after capping; pin it with an engine test at the printed cap. Card numbers are D37-held: fix the code to match the printed card, never the card text.

### [x] [loop-call] A DEAL of VITAE lost lands unscaled; other derived DEALs still body-scale (2026-10-13) — RATIFIED via /oversight 2026-10-17
- category: contract
- impact: 4
- ease: -
- detail: fixing P-07b (0cd35985) the loop ruled that a DEAL whose amount is
  VITAE already lost ("DEAL all the VITAE you lost") lands that number
  unscaled, matching "HEAL the damage dealt" and TETHER's hit, so the
  printed max holds. Two other derived DEALs still body-scale: Blood for
  Blood's "DEAL 2X" (pinned "body-scaled" in blood-price.engine.test.ts)
  and P-10c PAID's "DEAL n instead" (n = the VITAE sacrificed). Neither
  prints a cap the scaling breaks, so they were left alone.
- next: T confirms the ruling, or says derived DEALs should all scale (then
  P-07b caps after scaling instead). A card-number question, so T's call (D37).

### [x] [bug] A die is spent on a staged card that cannot be played (RC2 walk, 2026-10-11) — CLOSED 2026-10-13 (8efb0375: the die drop, die tap and loose drop skip a card whose PAID line is blocked and refuse loudly with the engine's reason; a card neither of whose lines can be played now, a second copy of a Global included, is refused at the stage)
- issue: #515
- source: RC2 walk 2026-10-11 (eb75f451, Blood Price test deck, attended; accepted for the v0.2.0 tag by T, D83)
- category: bug
- impact: 7
- ease: 7
- detail: Leg 3: above half VITAE, stage Blood Price P-04C (marked "ONLY AT HALF VITAE OR LESS") and drag the WILD die onto it. The die is accepted and goes "spent" with no rejection flash, APPLY does nothing, and the card stayed staged from turn 2 to turn 7 of the Doorwarden fight while every END logged "Refused - only at half VITAE or less." A wrong-colour drop is refused loudly; this one loses the die. Same root as a second copy of a Global staging.
- next (`/iterate`): refuse the die drop (and the stage) when the card's play condition fails, with the same loud reject flash as the colour rule (owner UI doctrine: illegal actions prevented loudly); unstaged cards return to the hand. Mobile combat drop handlers in `axiomancer-mobile/components/combat/`; add a test.

### [x] [bug] Scarred ("until you next rest at an inn") never clears (RC2 walk, 2026-10-11) — CLOSED 2026-10-15 (3d953081: every rest, inn or camp, mends banked scars; the gloss reads "until you next rest"; hazard-scar-rest-recovery.engine.test.ts pins camp and unmarked rests mending. See the [loop-call] below)
- issue: #561
- source: RC2 walk 2026-10-11 (eb75f451, Blood Price test deck, attended; accepted for the v0.2.0 tag by T, D83)
- category: bug
- impact: 6
- ease: 7
- detail: Leg 4: a lost hazard (ld-4 North Aqueduct) applied Scarred (-5 max VITAE, 302 to 297). Act 1 has no inn. Two rest nodes (ld-10, ld-2) and a reload left max VITAE at 297. In practice the scar is permanent, and the gloss names a place the game does not have.
- next (`/iterate`): decide in code what lifts a scar in Act 1 (any REST node is the reading closest to the gloss), make it so and update the gloss to match; test it. If lifting it needs a design call, file a `[loop-call]` with the choice made.

### [x] [loop-call] A hazard scar mends at any rest; the inn keeps only its wording (2026-10-15) — RATIFIED via /oversight 2026-10-17
- category: contract
- impact: 4
- ease: -
- detail: fixing "Scarred never clears" (issue #561) the loop ruled that
  every rest, inn or camp, mends banked hazard scars. The options were
  (a) any rest mends, (b) keep the mend inn-only and word the gloss as
  permanent past the Breakwater, (c) author inns in later regions
  (content, D88). Picked (a): `docs/game-model.md` already says "until the
  next rest", Act 1's only inns are the Breakwater's, and a -5 scar on a
  ~300 pool is small. It retires Phase 52b's "inn-only privilege"; the
  `shelter` marker stays and still words an inn night as a bed.
- next: T confirms, or rules scars inn-only (then the gloss must say a
  scar outlives every camp, or later regions get an inn by brief).

### [bug] "SACRIFICE any amount" never asks the player for an amount (RC2 walk, 2026-10-11)
- source: RC2 walk 2026-10-11 (eb75f451, Blood Price test deck, attended; accepted for the v0.2.0 tag by T, D83)
- category: bug
- impact: 6
- ease: 5
- detail: Leg 1: Blood Price E-10d ("SACRIFICE any amount (max 15)") played with a die sacrificed 1 with no prompt (log seq 78, `vitae-sacrificed amount:1`), and Blood for Blood chose its X itself. The card's main decision is taken from the player.
- next (`/iterate`): add an amount picker (a stepper or slider, 1..max, capped by VITAE) when a card has a variable SACRIFICE, and feed the chosen amount to the engine; engine test that the amount is honoured, mobile test for the picker.

### [balance] The Brine Hag keeps 152 VITAE in every region (RC2 walk, 2026-10-11)
- source: RC2 walk 2026-10-11 (eb75f451, Blood Price test deck, attended; accepted for the v0.2.0 tag by T, D83)
- category: balance
- impact: 5
- ease: 6
- detail: All four walk Hags had 152 VITAE (Breakwater to Lantern Deep), while Float-Eye scaled 92 to 108 to 124 and the Doorwarden 258 to 312 to 368 to 422 as the pilgrim went from level 1 to 6. Honest Hag fights averaged 3.25 turns against D82's target of about 5; three of four ended through mercy at about 30%.
- next (`/iterate`): check `scaleEnemyToLevel` and the map pins: is the elite missing its region scale (a bug: fix it and re-run the lane pacing sim), or is 152 pinned on purpose? Any retune of the Hag's numbers is T's call (attended, as D82 was); file a `[loop-call]` if it is ambiguous.

### [x] [perf] firstScreenMs budget breach: 306 ms vs 303 ms (2026-10-11) — CLOSED 2026-10-11 (afcd727c: a runner artifact. The run was on an Intel Xeon 8573C and the budgets were seeded on an AMD EPYC 9V74. Re-measured on the AMD at 52fabfbf: firstScreenMs 248, lcpMs 288, tbtMs 81, all under budget. Timing budgets now apply only on the seeding CPU)
- issue: #489
- category: perf
- impact: 5
- ease: 5
- detail: the weekly performance audit measured firstScreenMs at 306 ms against a budget of 303 ms. Commit 9ae519f; previous history line at ca2e13d (`docs/reports/perf/history.jsonl`).
- next (`/iterate`): bisect the commits between the two history lines; fix or raise the budget with T.

### [x] [perf] lcpMs budget breach: 352 ms vs 351 ms (2026-10-11) — CLOSED 2026-10-11 (afcd727c: a runner artifact. The run was on an Intel Xeon 8573C and the budgets were seeded on an AMD EPYC 9V74. Re-measured on the AMD at 52fabfbf: firstScreenMs 248, lcpMs 288, tbtMs 81, all under budget. Timing budgets now apply only on the seeding CPU)
- issue: #490
- category: perf
- impact: 5
- ease: 5
- detail: the weekly performance audit measured lcpMs at 352 ms against a budget of 351 ms. Commit 9ae519f; previous history line at ca2e13d (`docs/reports/perf/history.jsonl`).
- next (`/iterate`): bisect the commits between the two history lines; fix or raise the budget with T.

### [x] [perf] tbtMs budget breach: 112 ms vs 100 ms (2026-10-11) — CLOSED 2026-10-11 (afcd727c: a runner artifact. The run was on an Intel Xeon 8573C and the budgets were seeded on an AMD EPYC 9V74. Re-measured on the AMD at 52fabfbf: firstScreenMs 248, lcpMs 288, tbtMs 81, all under budget. Timing budgets now apply only on the seeding CPU)
- issue: #491
- category: perf
- impact: 5
- ease: 5
- detail: the weekly performance audit measured tbtMs at 112 ms against a budget of 100 ms. Commit 9ae519f; previous history line at ca2e13d (`docs/reports/perf/history.jsonl`).
- next (`/iterate`): bisect the commits between the two history lines; fix or raise the budget with T.

### [x] [tests] Root `npm test` is red on main: `check-comments` flags two "D41" decision-number comments (2026-10-10) — CLOSED 2026-10-10 (cbe0fa47: both comments state the rule without the decision number; check-comments clean, root `npm test` 224/224)
- category: tests
- issue: #480
- impact: 5
- ease: 9
- detail: 9ccba038 added comments citing a decision number to
  `axiomancer-mechanics/src/Combat/combat.engine.ts:941` ("Card statuses
  land uncapped (D41)") and `src/Combat/e2e/fate-engine.engine.test.ts:46`
  ("VULNERABLE is uncapped (D41)"). `node scripts/check-comments.mjs`
  exits 1 on both, so the root `npm test` fails. CI's `verify-*` legs do
  not run the guard, so `main` shows green.
- next (`/iterate`): state the rule without the decision number (or move
  the citation to `docs/game-model.md`), then run `node
  scripts/check-comments.mjs` and the root `npm test`.

### [x] [tooling] `tick-end` telemetry rows never land for any `/march`-dispatched tick (digest, 2026-10-09) — CLOSED 2026-10-09 (53a0c39b: `_claude-skill.yml` commits whatever the tick left in `telemetry/` in a best-effort step after Claude exits; the first CI tick after it should show a `telemetry: tick-end rows` commit)
- issue: #476
- category: debt
- impact: 7
- ease: 6
- detail: `CLAUDE.md` and the hook's own header describe `tick-end` as
  reliable modulo a rare edge case — "it only strands rows when a session
  ends," landing in the next tick's commit otherwise. In practice, no
  shard ever produced by a `/march` dispatch has a `tick-end` row, going
  back at least to 2026-09-24 (every `slash-prompt | /march` shard checked
  has exactly one row, the prompt itself). The 14 `tick-end` rows that do
  exist in `telemetry/*.md` all sit after a `subagent`/`subagent-end` pair
  from attended, interactive sessions — none follow a bare `/march`
  dispatch.
  Root cause: `.claude/settings.json`'s `Stop` hooks run `guard.mjs stop`
  before `telemetry.mjs tick-end` (lines 218-231). `guard.mjs`'s
  `stopCheck` (guard.mjs:245) only blocks the stop (forcing a continuation
  turn that could commit a straggler row) when `NEXUS_STRICT_STOP=1`; that
  env var is set nowhere in the repo (checked every `.yml`/`.md`), so in
  CI `stopCheck` always just warns and returns 0. By the time
  `telemetry.mjs tick-end` appends its row, the turn's last commit has
  already happened and the GH Actions runner is torn down at job end with
  no later step that commits stragglers (`_claude-skill.yml` has no
  post-Claude git step). The row is written to a shard file that is never
  pushed, on infrastructure that has been GH-Actions-per-tick since
  `march.yml`'s introduction — this is not a recent regression, it is
  true of every tick the workflow has ever run. `node
  .claude/hooks/telemetry.test.mjs` is green throughout (16/16): it tests
  the hook's local file-append logic in isolation and never models
  whether that write reaches a commit, so it cannot see this gap.
  Consequence: nobody can use `tick-end`/leaked-row detection to tell a
  crashed `/march` tick from a clean one, and this digest's own "While you
  were out" pulse (skills/digest.md §3.2) has to reconstruct tick outcomes
  from `git log` and `gh run list` instead of reading the ledger it was
  told to trust.
- next: the Stop-hook ordering can't fix this alone (swapping it still
  only warns, never blocks, without strict mode). The workable fix likely
  lives in the skills themselves: have `/march` (and other verb-dispatch
  points) write and commit their own `tick-end` row as part of their
  existing final commit, rather than relying on a post-hoc Stop hook that
  structurally always fires one commit too late on ephemeral CI runners.
  Re-verify against both the CI cadence and an attended session before
  shipping, since the latter's `tick-end` rows currently work by accident
  of session continuity, not by design, and must not regress.

### [perf] Map SVG fix is unproven on a device (perf audit, 2026-10-03)
- category: bug
- impact: 8
- ease: 6
- detail: T reported the `v0.1.0-checkpoint` preview APK as laggy everywhere.
  The audit found the Act 1 map drawing its roads in one canvas-wide `<Svg>`
  (2400dp square), which `react-native-svg` on Android rasterises into one
  ARGB bitmap of the view's size: 92MB at density 2, 159MB at 2.625, 207MB at
  3, mounted under every screen. Roads and halos now draw in per-road strips
  (12 to 17MB per map at density 3; `MapCanvas.raster.test.tsx` holds the
  budget). The JS thread was ruled out on the web build (no long task at
  idle or on node select, one 60ms task on travel). No Android device or
  emulator was available, so the cause is proven from the library source and
  arithmetic, not from a frame trace.
- next: build a preview APK from the fix and play it on T's phone. If it
  still lags, capture `adb shell dumpsys gfxinfo com.axiomancer.mobile` and
  `dumpsys meminfo` on the map screen before looking elsewhere.

### [perf] The fallback map sheet still mounts a canvas-wide SVG (perf audit, 2026-10-03)
- category: debt
- impact: 3
- ease: 5
- detail: `MapCanvas` keeps one whole-canvas `<Svg>` for the chart texture
  (hatch and contour hills) when a sheet sets `chartTexture`. Only
  `FALLBACK_SHEET` (936x1040dp, about 27MB at density 2.625) does; no Act 1
  map uses it. The same defect class as the row above at a seventh of the
  size.
- next: before any map ships with `chartTexture: true`, draw the texture as
  a tiled image or drop it; extend the raster test to the fallback sheet.

### [x] [tooling] `npm ci` in a fresh worktree leaves mobile typecheck red (perf audit, 2026-10-03) — CLOSED 2026-10-11 (911cacb4: `@types/react` 19.2.17 is a root devDependency, so npm 11 no longer skips it as an optional peer; a fresh worktree `npm ci` + mobile `tsc --noEmit` is green under npm 11.21.0, red before, and under npm 10.9.9)
- issue: #495
- category: debt
- impact: 4
- ease: 6
- detail: the lockfile marks the hoisted `node_modules/@types/react`
  (19.2.17) `optional` and `peer`, and npm 11.16 skips it on a clean install.
  `react-native` is hoisted to the root and then resolves `react` with no
  types, so `tsc --noEmit` reports 4138 errors (`'View' cannot be used as a
  JSX component`) on untouched files. `AGENTS.md` says to `npm install` in a
  worktree first; that does not fix it. Copying the package from the main
  checkout does.
- next: make `@types/react` resolvable from the root in a clean install (a
  root devDependency or an override pinned to mobile's 19.1 line), then
  confirm `npm ci && npm run verify -w axiomancer-mobile` is green in a
  fresh worktree.

### [x] [copy] Combat die a11y label still says "SPECIAL face" (R10c3, 2026-10-02) — CLOSED 2026-10-10 (already fixed in bcb76681, issue #466: `combatDieA11yLabel` speaks "BOON face", matching the lexicon; found unticked this pass)
- category: copy
- impact: 2
- ease: 9
- detail: `combatDieA11yLabel` in
  `components/combat/encounter/CombatDie.tsx` (~69) speaks "SPECIAL" for a
  special face. `axiomancer-mechanics/docs/lexicon.json` retires "SPECIAL
  face" for BOON, and the board's comments now say BOON. A screen reader
  hears the retired word.
- next: decide the spoken word (BOON per the lexicon, or "special" per
  `docs/game-model.md` § Dice, which still writes it lowercase) and make the
  label, its test and the game model agree.

### [x] [tooling] `combat-sim`'s default loadout names two deleted cards (R10c, 2026-10-02) — CLOSED 2026-10-09 (the default is `DEFAULT_LOADOUT`, the `GREY_OFFICE_CARDS` ids; a docs-examples test resolves it and every documented `--loadout` id through `getCardById`)
- issue: #472
- category: tooling
- impact: 4
- ease: 8
- detail: the default `--loadout` in `src/CLI/combat-sim.cli.ts` is
  `slippery-slope,brace-for-impact`; neither id is in the card library, so
  `npm run combat-sim` with no flag plays no real card and every column
  reads 0. Found writing `docs/cli.md`, which tells readers to pass a
  loadout for now.
- next (`/iterate`): default to the grey cards (`GREY_OFFICE_CARDS` ids),
  with a test that the default loadout resolves through `getCardById`; then
  drop the caveat from `docs/cli.md`.

### [contract] Pre-purge saves keep purged card ids; combat throws on them (B4 F2, 2026-10-01) — RESOLVED 2026-10-02 (b09e1de0, RC session: `dropUnknownCardIds` runs on every load, mobile and CLI, with tests)
- category: contract
- impact: 6
- ease: 6
- detail: no `game.migrate.ts` hop drops player card ids the P1 purge
  deleted. A pre-purge save keeps them in `knownCards` /
  `combatRewardCards`; `buildCombatDeck` (`combat.deck.ts:71`) deals them
  and `executeCard` throws `not found in library` (`card.engine.ts:105`).
  Traced by reading, not run. `plan/revamp/card-rules-inventory.md` §14.
- next (`/iterate`): reproduce with a v26-era fixture save; add a hop that
  filters both lists through `getCardById` (re-seed `STARTING_CARD_IDS` if
  `knownCards` empties), with a migration test.

### [x] [contract] The pip pass caps VULNERABLE at 30, cutting a stack above it (B4 F3, 2026-10-01) — CLOSED 2026-10-10 (9ccba038: the pip pass adds with no clamp, card statuses land uncapped per D41; fate-engine.engine.test.ts pins a printed 40 + 2 pips at 42)
- issue: #477
- category: contract
- impact: 5
- ease: 7
- detail: `combat.engine.ts:977` clamps the pip intensity bonus to
  `MAX_EFFECT_INTENSITY = 30`. A Plain Word at heart >= 7 lands VULNERABLE
  above 30 (uncapped, D41), so a pipped play would lower it to 30. Traced
  by reading; no test covers pips on VULNERABLE. Inventory §7.
- next (`/iterate`): write the failing test first, then skip the clamp for
  uncapped effects (the FREE path already passes `uncapped: true`, `:762`).

### [tests] The carrier rule (D45) has no enforcer; BLEED has no carrier (B4 F1, 2026-10-01)
- category: tests
- impact: 5
- ease: 5
- detail: nothing checks that an atlas row, gloss, silhouette or status
  glyph has a live carrier. BLEED is registered in all four with none (the
  "Bleeding" hazard never applies `debuff_bleed`). Dead rows also sit in
  `KEYWORD_FAMILY`, `EFFECT_GLYPHS` and `FREE_KW_GLYPH`. Inventory §8, §9.
- next (`/iterate`): add a carrier walk to `scripts/content-drift.mjs`
  (cards, enemy decks, items, hazards, map events, dice, anvil), delete
  the rows it fails (deletion only, D58), and keep it in root `npm test`.

### [infra] A reconciled merge commit reached main with no verify-* run, tripping the deploy gate fail-closed (2026-09-29)
- category: infra
- impact: 5
- ease: 5
- detail: HEAD `19446f42` ("merge: reconcile with concurrent skip-comment
  gate fix", #417) touches gated paths but no `verify-mechanics` /
  `verify-mobile` workflow ever ran for it — only `ci-autofix` (skipped),
  `deploy-comment` and `close-trailers` did. `npm run deploy:check` fails
  closed against it ("grace window" expired, no gated workflow found),
  with its own hint: a push made with the default `GITHUB_TOKEN` (as
  opposed to the repo's `GH_PAT`) never triggers further workflow runs.
  Not new to tonight — `709d6c2d` (PR #412's merge commit) shows the same
  gap in `gh run list`, while `9dd4512e` (PR #411) got a full verify set —
  so this looks like an intermittent gap around merge commits specifically
  (a manual `git merge` conflict-resolution push, per the root CLAUDE.md's
  PR check-in convention, rather than a `gh pr merge`), not a one-off.
  The underlying commits (`aa12ff58`, `f47fb4c9`) were each verified green
  before the merge, and this digest's own `npm run verify` (§3 step 6)
  covers the same tree, so nothing is unverified in substance — only the
  merge commit's own CI record is missing.
- next (`/iterate` or `/fix-ci`): find why some merge-commit pushes don't
  trigger `verify-*` (token identity used for the push, branch-protection
  required-checks config, or a workflow trigger filter) and either fix the
  trigger or teach `deploy:check` to treat a merge commit whose parents
  are both already green as satisfied without its own run.

### [x] [tests] Root `npm test` is red on main: the DevLog marginalia assertion (2026-09-28) — CLOSED 2026-09-29 (confirmed by this digest)
- category: tests
- impact: 4
- ease: 6
- detail: `scripts/build-devlog-public.test.mjs:117` ("nothing that
  carries meaning sits behind a script") fails on a clean `main` worktree
  at `3c7e897`: the built post it picks has no `<details class="marg">`.
  No CI workflow runs this file, so no check goes red; only the root
  `npm test` shows it. Found by the keyword-purge PR's gate run (D45); not
  caused by it.
- next (`/iterate`): decide whether the newest DevLog entry should carry
  marginalia or the test should pick a post that has them, then add the
  file to a CI job so it cannot rot silently again.
- **CLOSED 2026-09-29:** fixed as a side effect of phase R1 (`0cfea70c`,
  "the marginalia case picked the front page ... instead of a post");
  this digest re-ran root `npm test` clean on current `main` (213 pass, 0
  fail) to confirm before closing. The "add it to a CI job" half of
  `next:` is still undone — no workflow runs the root suite, so a similar
  regression would rot silently again.

### [content] Consumable buffs borrow unrelated keyword glosses on their status chips (2026-09-28)
- category: content
- impact: 3
- ease: 6
- detail: `SUPPORT_KEYWORD` in `axiomancer-mobile/state/combat/keywords.ts`
  maps consumable and engine buffs to the closest live keyword, so a crit
  or status-chance buff shows a MARK chip with Mark's gloss, and haste
  shows DRAW. The chip then explains a mechanic the buff does not have.
  The keyword purge (D45) removed the FORETELL label from
  `buff_accuracy_up`, which now shows its own effect name.
- next (`/iterate` or `/adjust-equipment`): give each mapped buff its own
  effect-name label (as `buff_accuracy_up` now does) unless it really
  applies the keyword, and pin the mapping with a test.

### [debt] Engine faces still print RIPOSTE / FORETELL / PIERCE words that have no gloss (2026-09-28)
- category: debt
- impact: 2
- ease: 5
- detail: after D45 the `riposte` and `foretell` kinds and the
  `deal.pierce` flag stay in the engine, and the mobile presenter still
  names them on a face (`combat-encounter.engine.ts`: the riposte face
  kind, the foretell headline fallback, the FREE rider pairs, the
  `VITAE · PIERCE` sub-line). No live card reaches those paths, so nothing
  prints today. A card that returns one of them in a guided session (D37)
  must re-add the gloss and glyph in the same PR, or the face prints an
  undefined word.
- next (guided card session): treat as part of re-admitting the keyword;
  no loop action while no card carries it.

### [x] [ui] Post-purge: a staged A Plain Word wraps "+25%" mid-token to "+2/5%" (2026-09-27) — CLOSED 2026-10-10 (8d579f67: the PAID value keeps one line at a computed size on every small face, `paidLedgerFit`; CRITIQUE pass 74 MED, issue #479)
- category: ui
- impact: 4
- ease: 6
- detail: found in the P1 playtest (browser pane, 375 wide). The PAID
  hero value on the narrow staged card breaks inside the token. This is
  the same family as CRITIQUE pass 49's DoT chip wrap ("8/p"/"ay"), now
  on a card every run deals. (Its FREE rail also read "×10" for a
  percent status. That was fixed in the residue PR: `percentIntensity`,
  `combat-encounter.engine.ts`.)
- next (`/iterate`): give the hero value text `numberOfLines={1}` with
  `adjustsFontSizeToFit` (or a min width) on the staged card, and pin it
  with a visual capture of a staged grey-word.

### [balance] Post-purge: the level-3 King of Revenge is 0/40 against the grey deck (2026-09-27)
- category: balance
- impact: 6
- ease: 4
- detail: measured in the P1 matrix (baseline stamp `c6fd758c`: early
  60%, mid 83%, late 99%, impossible 67%). fishing-village's boss, reached
  around level 3 with Blow 5 / Ward 3 / Word 2 and at most a few grey
  rewards, wins 0 of 40 sims. The stage bands are healthy, so this is one
  foe, not the curve. The fix is enemy-side (its phase count or VITAE) or
  waits for the card agent's library (D37). Do not shrink numbers (pillar
  1); buff the neighbours or re-pin the foe.
- next: `/adjust-enemies`. Re-run the King's cell with `npm run
  baseline:check` fresh, then decide re-pin vs wait. Record the choice here.

### [x] [debt] Post-purge: WOUNDING has no payload — 13 foes carry it, its gloss promises a WOUND card that no longer exists (2026-09-27) — CLOSED 2026-10-11 (stale: the enemy keyword code went in R2b, 872de5a7; no `wounding` remains in `axiomancer-mechanics/src`; found unticked this pass)
- category: debt
- impact: 5
- ease: 6
- detail: D17 made WOUNDING's payload the curse card `the-wound`, and P1
  purged every curse. The enemy keyword (`Enemy/enemy-keywords.ts` ~147,
  gloss "puts a WOUND in your deck") still prints on 13 foes and does
  nothing. That breaks the bug-detector law (a keyword with no effect).
- next: `/adjust-enemies`. Either strip `wounding` from those foes and
  retire the keyword with its gloss, or give it a non-card payload (for
  example a short BLEED). The first is loop-shippable; the second is a
  keyword design call for the card agent's session (D37).

### [content] Post-purge: the colour systems are dormant, but the Momentum tutorial still teaches them (2026-09-27)
- category: content
- impact: 4
- ease: 5
- detail: every live card is grey ("Any die can power this card"), so
  momentum, surge and colour yields never fire for the player. The
  first-combat Momentum tutorial still explains that system, so a new
  player learns a rule they cannot use. The systems stay (the card agent
  may bring colour back, D37). The copy is the problem.
- next: gate the Momentum tutorial on the deck holding a coloured card,
  and leave the system code alone. Revisit when coloured cards return.

### [gap] Old Marrow's quest payoff can never be reached: no choice leads to `thanks`, and he stands before the boss on a forward-only map
- category: gap
- impact: 5
- ease: 5
- detail: filed 2026-09-28 by `/adjust-npcs` pass 21, from a reachability
  walk over every staged tree (root to `nextNodeId`). The `thanks` node on
  Old Marrow's tree (`Coastal-Village/maps.ts`, ~line 86) has four
  `questCompleted: 'starting-quest'` replies. They pay 25 or 12 gold, set
  `marrow_pressed`, or start `get-to-forest` via `next_steps`. No choice
  anywhere points at `thanks`, and a pickaxe search of the history
  (`-S"nextNodeId: 'thanks'"`) finds that none ever did. The map rules out a
  simple link as a fix. Marrow is staged only at `fv-2` (column 1). The King
  of Revenge is at `fv-6` (column 8), and fishing-village's graph only moves
  forward, so the player never meets Marrow after the kill. The knock-on
  effects: `marrow_pressed` is never set, so Captain Blackwater's Phase 53e
  read-back (`marrow_pressed_recognition`) never shows. `get-to-forest` is
  granted by the `fv-10` travel door instead, as `content.ts` ~990 notes.
  The quest's own `reward` still pays on completion, so the player loses no
  money, only the beat. This is related to pass 58's pending "the village
  still points at the breakwater" row: Marrow's `offer` line is part of the
  same rework.
- why not shipped in the steward tick: this is not a small fix. It needs a
  post-boss Marrow node on fishing-village's graph, which displaces a node
  and changes the map's kind spread and its e2e pins. It also needs a
  `questCompleted`-gated greet reply into `thanks` and new prose, so it is
  cross-surface and "large" under THE GROWTH FLOOR ¶2. The alternative is
  to retire `thanks`/`next_steps` and the Blackwater read-back as dead
  content. Pick one once the fishing-village breakwater-line row is worked,
  because both edit Marrow's tree.
- next (`/iterate`): either (a) re-stage Marrow at a column-9 node beside
  the `fv-10` door and add a gated greet reply into `thanks`
  (`content-curator` for the line), or (b) retire `thanks`, `next_steps`
  and `marrow_pressed_recognition` as unreachable. Pin whichever you choose
  with a reachability test.

### [gap] Act 1 has no shop, so the relic kit the 2026-09-23 owner call put "on the road" is five maps away
- category: gap
- impact: 6
- ease: 6
- detail: filed 2026-09-27 by `/adjust-equipment` pass 21. The owner call of
  2026-09-23 (THE VERY START) made a fresh run seed no relics. Only the
  Suppliant's Ring comes at the first node, and "the markets sell them".
  `nfForestMarket` (`MapEvents/content.ts` ~129, Glen Market, `nf-8`) says
  in its comment that "the first market on the road stocks the Phase-19
  starter kit's weapon, armor and charm, so the intended opening loadout is
  buyable before the forest deepens". The map revamp moved that road. Across
  the Breakwater, the Charcoal Wood, the Beacon Crags, the Lantern Deep
  (M3a–M3d) and fishing-village, there is no `village` node and no `shop:`
  (the only `shop:` payloads are northern-forest's and later maps'). So a
  new game plays all of Act 1 plus fishing-village with one signature
  (the ring). It has nowhere in Act 1 to spend its loot-cache and fight
  currency; fishing-village's blacksmith swaps gear variants but sells no
  relic. Glen Market is the sixth map. The Lantern Deep even has a "market grotto"
  landmark (`ld-10`), but it is staged as a camp: "The traders let you sleep
  behind the stalls."
  Prior art: `kb:slay-the-spire-the-board-game/rules/actions` (src-006).
  Shops that sell potions and relics are part of every act's map there, not
  something saved for later acts.
- why not shipped in the steward tick: the fix changes the kind spread of
  maps authored under T's D21–D35 rulings, along with their e2e kind pins. That
  makes it a cross-surface change, which is "large" under THE GROWTH FLOOR
  ¶2. No new item, keyword or art is needed.
- next (`/iterate`): stage one Act 1 `village` node with a merchant-less
  `shop:` (`VillagePayload.merchants` may be empty, so D29 and the Act 1
  people session (rows below) aren't touched). Stock it with the starter
  kit (`relic-overwhelming`, `relic-read`, `relic-press-the-point`) plus
  `minor-healing-potion`. There are two readings. (a) `ld-10`, the market
  grotto: this is truest to the plate, but it comes late (map 4) and turns
  one of three camps into a village. (b) A node in the Charcoal Wood (map 2):
  the kit comes early, but no landmark there is named for a market. Pick
  (a) unless a playtest shows the kit arriving too late. Update Glen
  Market's comment and the map's kind-spread comment and test, and add an
  e2e that pins a `shop:` reachable in Act 1 from the default start.

### [content] A pinned unique pays a full level of XP in Act 1 (the Charcoal Wood's kudan)
- category: content
- impact: 3
- ease: 5
- detail: filed 2026-09-26 (M3e residue). `cw-7` stages `kudan`, a `unique`
  foe (native level 10), pinned at level 2. `scaleEnemyToLevel` rescales its
  default XP to 2 x 500 = 1,000, so this one fight is worth a full level:
  more than the rest of the Charcoal Wood (410) and about a third of all of
  Act 1 (~2,870). Every other Act 1 fight is `simple`/`normal`/`elite` (10 to
  200 XP). D30 allows one elite per region; it says nothing about uniques, so
  `act1-elites.engine.test.ts` does not catch it.
- next: `/adjust-enemies` (enemies are in the steward rotation): swap cw-7 to
  a `normal` foe from the northern forest roster, or pin its XP; then add a
  "no `unique` in Act 1" case to `act1-elites.engine.test.ts`.

### [gap] The Breakwater has no people of its own — an attended story-spec session (D34) [parked: R11 — via /oversight 2026-09-28]
- parked: people, story and art are content (D58). T parked this legacy
  `[needs-user-call]` row via `/oversight` 2026-09-28; it returns with R11
  (people, story) or B8 (art), after RC. `/iterate` skips it.
- category: gap
- impact: 5
- ease: 4
- detail: filed 2026-09-26. T chose (D34) to give the Breakwater NPCs of its
  own rather than move fishing-village's there. Until then a new game meets
  its first NPC and first quest (Old Marrow's starting quest, Phase 53c)
  only after all of Act 1, in fishing-village, and
  `quest-giver-reachable.engine.test.ts` pins `startMap: 'fishing-village'`,
  so nothing checks the default start. The Breakwater's "What happens here"
  in `content/story/story-overview.md` is still open, and hard rule 3 forbids
  inventing a named character alone, so this is not a loop phase.
- next: an attended `story-spec`/`character-spec` session with T: settle what
  happens at the Breakwater, draft 1–2 people for T's sign-off, then stage
  them (`npcs:` on the map, dialogue via `content-curator`) and point
  `quest-giver-reachable` at the default start.

### [gap] The rest of Act 1 has no people either: the Charcoal Wood, the Beacon Crags, the Lantern Deep [parked: R11 — via /oversight 2026-09-28]
- parked: people, story and art are content (D58). T parked this legacy
  `[needs-user-call]` row via `/oversight` 2026-09-28; it returns with R11
  (people, story) or B8 (art), after RC. `/iterate` skips it.
- category: gap
- impact: 5
- ease: 4
- detail: filed 2026-09-27 by `/adjust-npcs` pass 20. M3b–M3d shipped the
  three maps with `npcs: []`, as D29 requires ("No new enemies, NPCs or
  events in the map PRs … a need the pools can't meet is filed to
  `adjust-npcs`"). Each trips the steward's "map with fewer than 2 staged
  NPCs → CREATE" signal. With the Breakwater row above, that makes all four
  Act 1 maps empty of people. A new game crosses four maps before its first
  conversation (fishing-village). Each map's "What happens here" in
  `content/story/story-overview.md` names the open question as a person:
  "Who the burners are" (Charcoal Wood), "Who keeps the beacon, and who it
  signals" (Beacon Crags), "Who carried the lanterns down" (Lantern Deep).
  These are personhood calls, and hard rule 3 forbids inventing them alone.
  D34 set the precedent for the Breakwater (its own people, from a
  story-spec session, not moved from fishing-village), so this is the same
  shape rather than a loop phase.
- next: fold into the Breakwater's attended `story-spec` session (one Act 1
  people session, not four): answer each map's "who" line, draft 1–2 people
  per map for T's sign-off, then stage them (`npcs:` on the map, dialogue via
  `content-curator`). Or T rules that some Act 1 maps stay deliberately
  unpeopled, and that ruling gets recorded as a D-row so the steward stops
  re-flagging them.

### [debt] Source comments still name the retired `/deck-tuning` loop (2026-09-25)
- category: debt
- impact: 2
- ease: 8
- detail: D10 retired `/deck-tuning` in T5 (#378). The instruction surfaces
  were repointed to `/adjust-cards`, but about 30 provenance comments in
  `axiomancer-mechanics/src/` still name it as the tuning loop. They were
  left alone deliberately to keep the T5 PRs collision-free. Examples:
  `combat.engine.ts:147-215`, `combat.playtest.ts`, `cards.pricing.ts`,
  `cards.sandbox.ts`, `combat.objective.ts`, and the e2e headers.
- next: `/iterate`, bundled with the next mechanics-source PR that
  re-stamps the baseline anyway. Reword to `/adjust-cards`, or to "the
  tuning loop (rebuild pending, jot `1fc33003`)" where the old loop's
  A/B surface is meant.

### [debt] T5 Tier 2 docs — named for archive but still have consumers (2026-09-25; archive part resolved, effects/enemy rewrite open)
- **Context:** trim T5 archived the Tier 2 docs rows
  (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/`). Six files the spec named have inbound
  pointers the trim could not repoint, because the pointers live under
  `.claude/` (classifier-blocked for autonomous runs; see the T5 hand-off
  item 2). Kept in place per the trim standing frame ¶1; the spec's Tier 2
  row over-counted them.
- `axiomancer-mechanics/docs/effects.md`, `docs/enemy.md` — cited by
  `.claude/skills/brainstorm-mechanics/SKILL.md:40,42` and
  `.claude/skills/world-spec/SKILL.md:44`, plus live docs (`quickstart.md`,
  `api.md`, `combat.md`, `world.md`, `morality.md`, mobile
  `asset-conventions.md`) and a `public-barrel.engine.test.ts` comment. These
  are reference docs kept current in place (effects.md's API table was edited
  in T3); their stale bodies are already filed in the "stale docs" row
  below. Rewrite in place, do not archive.
- **Resolved 2026-09-25 (attended, post-T5):** `profane-canon.md`, spec 10
  and spec 35 archived to `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/`.
  The `.claude/` citations were repointed: `card-expert.md` and
  `combat-playtest.md` now cite the archive paths, and the three design
  skills cite the live `docs/morality.md` in place of spec 10. So were
  `skills/adjust-cards.md`, `skills/forge.md`, spec 34, the big-numbers
  prompt, bearings and the `combat.objective.ts` comment. The
  `swap-pool-fanout` ledger went in the T5 residue. Only the
  `effects.md` / `enemy.md` rewrite-in-place item above stays open.
- **Hazard duplicates (spec row "hazard docs ×3"):** only one was a true
  copy — the mobile mirror `design/encounters/hazard-card-library.md`,
  archived in T5 (the mechanics file is the one copy). The mobile
  `design/encounters/hazard.md` and `design/hazard-minigame-mobile.md` are
  distinct mobile-UX docs that already point at the mechanics rules docs;
  kept.

### [debt] T2b dice-flag collapse — live content the OFF path was carrying (2026-09-25)
- **Context:** D7 deleted the Upgradeable-Dice OFF path (stance draft, hidden read, STAKE, v1 wheel, fate-X powering). The shipped model already ignored all of these; the items below were already inert in players' builds and are now visibly so.
- **Fate cards — RESOLVED (adjust-cards pass 20, 2026-09-26):** `the-note-falls-due`, `miserere`, `dead-pledge` folded `fate` -> off-colour `dieBonus` (recoil moved into the rider). Still open: the `fate` field has zero carriers but remains in `types.ts`, `cards.pricing.ts`, `combat.cards.ts`, `card-upgrades.ts`, `combat.card-complexity.ts`, `card-keywords.ts` and the tests. Deleting it is a small cross-surface cleanup. Also `it-gets-up-again` (`float_x_die`) is priced at 4.5 but almost always pays only its +1 Conviction fallback; that is an owner call alongside the `reroll_spent` item below.
- **Advantage buffs:** `buff_haste`, `buff_accuracy_up`, `buff_critical_damage_up` and kin grant advantage through the deleted read, so they do nothing in combat. Retire or re-hook (`/adjust-keywords`).
- **`reroll_spent` relic mechanic** still rerolls from the legacy face bag (`rerollSpentDice`/`COMBAT_DIE_FACES`), so it can mint X or faceless dice. `float_x_die` always pays +1◆ now.
- **Sim:** the `blind` policy now plays identically to `greedy` (kept so the matrix keeps its column); retire or redefine it at the next `/combat-playtest`.
- **Stale copy — RESOLVED (adjust-cards pass 20):** "drafted die" in `the-unpaid-sexton`'s face now reads "rolled dice". *(The FORGE, GHOST and WILD/X atlas rows were synced to `KEYWORD_GLOSS` by adjust-keywords pass 19, 2026-09-26.)*
- **Vestigial params:** `card-played.advantage` is always `'neutral'`; `scalePlayerHit`'s `readMult` is always 1.
- **Card faces print a dead read:** status card faces still show ▲/▼ read numbers, but every play lands at read `'none'`. Mobile froze `READ_ADVANTAGE_INTENSITY_BONUS` / `READ_DISADVANTAGE_DURATION_PENALTY` (both 1) as local constants atop `combat-encounter.engine.ts` so it compiles; delete them with a card-face pass.
- **CLARITY is inert:** its `forceWildOnNextDie` flag was only read on the deleted OFF path.
- **Wrong copy (predates T2b):** the dead-tray END line says unusable dice "are discarded" (`endTurn` banks one unspent die when the Reserve has room); the CONVICTION ◆ glossary says it is banked "from unspent dice" (unspent dice earn nothing); the momentum info popup still describes the v1 wheel ("light all three").
- **Coverage gap:** `upgradeable-dice-e2e.mjs` was the only browser run walking Press Fate, the momentum chip and blacksmith HONE; it was deleted with the flag. The other e2e scripts boot the model but do not walk those steps.
- **`MAX_PERMANENT_WILD_DICE`** (`Combat/combat.dice.ts`) is documented as the cap on `permanentWildDice` but nothing enforces it — missing clamp or dead constant (T3 barrel pass kept it).
- **adjust-keywords pass 19 (2026-09-26) — more trim fallout, filed not shipped:**
  - *Fate re-hook option:* Dawncaster's Blood ("sacrifice your own blood instead of Energy", `kb:dawncaster/keywords/blood.okf.md`) is the design `fate` was reaching for: a dead X die plus `recoilHp` as a substitute payment. It only works if X dice exist in ordinary play, and the Spec 33 tray never rolls one (only `reroll_spent` can mint one). So the card fold (`fate` -> `dieBonus`, `/adjust-cards`) is still the honest small fix.
  - *Nine inert support buffs:* besides the three named above, `buff_critical_rate_up`, `buff_liars_gambit` and `buff_abyssal_presence` (advantage-only, fed to `advantageGrants`, which nothing reads), plus `buff_haste`, `buff_haste_surge`, `buff_all_stats_up` and `buff_status_chance_up` (a positive roll modifier, which is only ever read as a penalty on the enemy). They are unobtainable and pinned for old saves. Stale copy reachable from a legacy save: `tooltip.engine.ts:349-358` and `village.engine.ts:175-176`, and `SUPPORT_KEYWORD` maps them to unrelated glosses.
  - *`debuff_curse` has no live applier* (its only source, the threat-clock enchant, was trimmed). It was also the only negative roll modifier, so the enemy roll-penalty deny path (`combat.engine.ts` ~3415/4913/5057), `isStatDebuff` and mobile's 'weaken' class never see any input. Retire it (about six test fixtures to repoint), or give the path a new feeder. `debuff_nettle_sting` has also been orphaned since `84ef85bd`.
  - *`resistedBy` / `resistDR` are dead data.* They are copied at `card.engine.ts:330`, `Effects/index.ts:81` and `game.reducer.ts:329`, and nothing reads them. Removing them touches exported types and saved state. (The `docs/effects.md` resist-roll prose was fixed in pass 19.)
  - *Tier-1 leftovers:* `MIND_MARK_ID = 'tier1_mind_mark'` / `getStudyMarkIntensity` (`Combat/effects.ts:21-27`, barrel-exported) point at an id in neither library. There is also a matching glyph at `statusGlyphs.ts:117`.
  - *Seven player mechanic kinds have zero carriers:* `strip_random_buff`, `befriend_attempt`, `refresh_die`, `convert_die_color`, `overheat`, `spend_all_pips`, `echo_next_spell`. These are wired but unused, so they are remove candidates. Retiring one touches the union, pricing, engine, mobile, editor and tests, so each is large. `befriend_attempt` sits on the befriend path and needs an owner call.
  - *OMEN's `omenClaim` is never sent by mobile,* so OMEN always falls back to a die-derived stance with a 1-phase window.

### [debt] TRIM THE FAT T2a merged unverified — finish list (2026-09-25)
- **Context:** owner call 2026-09-25 — T2a merged mid-work without re-running the gates. Full hand-off: `plan/2026-09-25-trim-t2a-handoff.prompt.md`.
- **Still open:** write-never `MapState.hazardOutcomes` / `HazardNodeOutcome` — left in place (a v26 hop to strip a harmless field is churn; strip it the next time a save hop lands for another reason). `buff_all_stats_up` / `debuff_curse` carry only an inert `rollModifier` and nothing applies them — `/adjust-keywords` call (deprecated-effects list).
- **Deviation from the spec, kept deliberately:** `combat.autoplay` moved to `src/test-utils/` (three surviving tests use it); `isRouteBlocked` kept (live movement check); `validateInteractions` kept (guards the live interaction registry).

### [content] The shipped Drowned Parish opening contradicts the ruled story — attended session needed (2026-09-24)
- category: content
- impact: 8
- ease: 3
- detail: `story-overview.md` rulings 7 and 10–12: play begins as X, a grown
  man, flees the Drowned Parish with The Covenant tracking him. The player
  knows nothing else at the start; the prologue arrives later as memories.
  The shipped map (`axiomancer-mechanics/src/World/Continents/Coastal-Village/maps.ts`,
  `src/World/MapEvents/content.ts` `FISHING_VILLAGE_NEW_PLAYER_POOLS`)
  instead opens at the docks (`fv-1` `fvArrival`). Old Marrow hires a local
  boy to kill the King of Revenge (`fv-2`, `starting-quest`; boss `fv-6`),
  and three dinner-table dilemmas give him a father (`fv-4`
  stranger's net, `fv-14` what do I tell father, `fv-16` borrowed hook).
  The other 18 nodes (rest, hazard, loot, gathering, monster encounters) do
  not depend on the story and can stay.
- next: an attended `/story-spec` session on the Drowned Parish opening. One
  was started 2026-09-24 and paused by T before any answer. It had put four
  questions to T: who pressures X on the map (Covenant guards, the village,
  or both), what happens to Old Marrow, what the three dilemma nodes become,
  and what `fv-1` shows. Not loop-drainable: THE STORY IS THE ROAD forbids
  inventing canon the overview does not carry.

### [content] Legacy story threads that likely contradict the new rulings: `boy-*` flags and the ribbon/advisor-selection rite (2026-09-24)
- category: content
- impact: 5
- ease: 3
- detail: two shipped threads assume the discarded story.
  (1) The `boy-*` flags (25 references in `src/World/MapEvents/content.ts`,
  6 in `Coastal-Village/maps.ts`) assume a child; X is now a grown man who
  served The Covenant. Renaming is engine work (THE BLANK PAGE ¶2).
  (2) The ribbon/advisor-selection rite: the river court at `cr-9`, the
  village-green rite at `tar-4` (sets `sweetheart-was-nominated`,
  `content.ts` ~2000/2015), and the capital's Herald and Ribbon-Picker
  (`Northern-Continent/maps.ts` ~838/906, gated on that flag). It gives
  people a different reason to go to the capital than ruling 11 (the last
  refuge from The Covenant). Confidence 70 that it conflicts; T has not ruled.
- next: T call on the ribbon thread (keep, rewrite, or cut) in an attended
  session. The flag rename follows whatever the Drowned Parish rewrite
  decides.

### [content] Story systems the new rulings require that the game does not have (2026-09-24)
- category: content
- impact: 7
- ease: 3
- detail: `story-overview.md` rulings name five things with no representation
  in the build:
  - the opening world-framing (ruling 11: The Covenant occupies nearly the
    whole world; the capital is the last bastion of hope);
  - a **memories** section in the Memoir tab, organized chronologically
    (ruling 12; `axiomancer-mobile/app/(tabs)/memoir/` lists quests only),
    through which the prologue reaches the player;
  - The Covenant itself (rulings 13–14) — no faction, guard enemies or
    Covenant roster exists (`src/Enemy/enemy.library.ts`);
  - X's inherited money debt (ruling 8);
  - the pursuing guards (ruling 7).
- next: the memories section and the opening framing are systems work that
  can be designed now (what triggers a memory, the chronological scheme).
  What each memory *says* waits on the prologue's delivery plan. Route to
  `/expand` as phase candidates. The Covenant roster waits on the Drowned
  Parish session deciding who pressures X.

### [docs] Live docs whose bodies describe retired systems — banner-only pass, rewrites owed (2026-09-23)
- category: docs
- impact: 5
- ease: 4
- detail: the 2026-09-23 comments/docs accuracy audit (PR from branch
  `claude/comments-docs-audit-95f2sz`) fixed every single-fact error it could
  prove, but these files describe whole retired subsystems and were only given
  a dated `> **Superseded (2026-09-23)**` banner naming the live truth. Each
  line: file — what the body still describes — live source of truth.
  - `axiomancer-mechanics/docs/effects.md` — 88-effect catalogue, tier tables,
    `src/Combat/phases/scenario.ts` call sites — `src/Effects/buffs.library.json`
    (19), `src/Effects/debuffs.library.json` (10), `src/Combat/effects.ts`.
  - `axiomancer-mechanics/docs/effects/README.md` + per-effect files under
    `docs/effects/{buffs,debuffs}/` — ids that no longer exist, scenario.ts
    pointers — same sources.
  - `axiomancer-mechanics/docs/enemy.md` — 15/30-enemy library,
    `enemy.logic.ts`, six AI strategies, `decideEnemyAction` — the 79-entry
    `src/Enemy/enemy.library.ts`, `src/Enemy/types.ts`, `src/Combat/combat.engine.ts`.
  - `axiomancer-mechanics/docs/combat.md` — six legacy sections (Tier 1
    auto-effects, Spec 03 proc matrix, Damage Resistance sample using
    `calculateSkillDamage`, Phase 60 friendship table naming enemies that no
    longer exist, Combat Mechanics API `rollSkillCheck`/`getSkillDamageType`,
    Card terminology `SKILLS_LIBRARY`) — `src/Combat/combat.engine.ts`
    (`deal`), `src/Combat/index.ts`, `src/Enemy/enemy.library.ts`
    (11 `friendshipReward` entries).
  - `axiomancer-mechanics/docs/api.md` — Cards section (`canUseSkill`,
    `SkillTier`, "21-card library") and the Phase 46 alignment-gate paragraph
    — `src/Cards/library/*.cards.ts`, `src/Cards/card.engine.ts`, `src/index.ts`.
  - `axiomancer-mechanics/README.md` — module-table rows for Enemy / Items /
    Skills and the "Hazard public API" paragraph name exports that do not exist
    — `src/index.ts` barrel.
  - `axiomancer-mechanics/docs/quickstart-world.md` — sample calls
    `resolveMapEvent(state, 'fv-2')` and kinds discovery/dialogue/trade/puzzle
    — `src/World/MapEvents/resolve-map-event.ts` (`(state, rng?)`),
    `src/World/MapEvents/types.ts` (eleven kinds).
  - `axiomancer-mechanics/docs/oaths.md` "Authoring gates" card-gate bullet —
    `SkillLearningRequirement.requiresAlignment`, `learnSkill`, `LEARN_SKILL`
    — `src/Cards/card.engine.ts` (gate removed 2026-07-08).
  - `axiomancer-mobile/docs/engine-integration-architecture.md` — code
    examples on `state.combat` / `selectStance` / `resolveCombatRound` /
    `choosing_stance` — `docs/combat.md`,
    `state/presenters/combat-encounter.engine.ts`.
  - ~~`axiomancer-mobile/specs/10-navigation-and-app-shell.md`,
    `11-asset-pipeline.md`, `12-accessibility-and-theming.md`~~ — archived
    2026-09-25 (trim T5) with the whole mobile `specs/` folder to
    `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mobile/specs/`; no rewrite
    needed.
  - `.claude/agents/playtester.md` Path A steps 3-5 and Path B — prelude modal
    / FIGHT-FLEE / stance / STAND-DO-CLASH-LET round loop —
    `axiomancer-mobile/docs/combat.md`,
    `components/combat/encounter/CombatEncounterPanel.tsx`.
- status (2026-10-02): every doc above is closed. Phase R10c rewrote or
  deleted the mechanics ones; Phase R10c3 deleted
  `engine-integration-architecture.md`. Only `.claude/agents/playtester.md`
  remains open.
- next: one `/iterate` tick per file (or per section for combat.md): rewrite
  the body from the named live source, drop the banner. Also dated-record
  drift the audit saw but did not touch, for the same pass if cheap:
  (the mobile `specs/README.md` DONE-date drift is moot: archived 2026-09-25,
  trim T5); `axiomancer-mobile/docs/E2E_INVENTORY.md` is stamped against commit
  12a485d; `axiomancer-mechanics/docs/world.md:306,393,414` still says
  "all 8 MapEventKind" (union is eleven); `docs/hazard-minigame-api.md`
  names a `HazardCardEffect` type that does not exist.

### [debt] Five code-side defects surfaced by the 2026-09-23 comments audit (2026-09-23)
- category: debt
- impact: 4
- ease: 6
- detail: comment-vs-code mismatches where the CODE is the stale side. Each
  was left untouched by the docs PR (the two one-liners it did fix:
  `verify-drift.yml` now triggers on `enemy-keywords.ts`;
  `check-naming-law.mjs` now sweeps `apocrypha.cards.ts`).
  1. `axiomancer-mechanics/scripts/export-catalog.ts:106-113` —
     `parsePricingComments` reads `src/Cards/cards.library.ts`, which is the
     aggregator since THE BIG NUMBERS REWRITE; the `// pts:` blocks live in
     `src/Cards/library/*.cards.ts`, so catalog pricing is always empty.
     Confidence 60.
  2. `axiomancer-mechanics/src/CLI/combat-sim.cli.ts:11-13,43-45` — usage
     text and default loadout name `slippery-slope`, `brace-for-impact`,
     `festering-argument`, `soft-word`; none exist in the card library.
     Confidence 50 that the default path is broken (may fall through).
  3. `axiomancer-mechanics/src/Effects/world-tick.ts` —
     `processWorldEffectTick` has no caller outside tests in mechanics or
     mobile; `World/world.reducer.ts:206` used to point at a
     `Game/world.orchestrator.ts` that does not exist. Either wire it into
     `moveToNode` or delete it. Confidence 60.
  4. `axiomancer-mechanics/src/Effects/index.ts:167-190` —
     `TIER1_EFFECT_MAP` maps to `tier1_*` ids absent from both effect
     libraries (the deprecated-effects test bans them), so
     `applyTier1CombatEffect` always returns `noChange`; likewise
     `Enemy/enemy.library.ts:89-92` `T1_DEFAULT`. Delete or re-point.
     Confidence 80.
  5. `scripts/axio-mcp-server.mjs:39-62` — `ensureFresh` stats only
     `Cards/cards.library.ts` and `Effects/effects.library.ts`; an edit to
     `Cards/library/*.cards.ts` does not bump the mtime, so the "mid-session
     edit is caught" claim in its header is false for card edits.
     Confidence 50.
  Also observed: `scripts/check-baseline-freshness.mjs:33-41` says
  `World/Continents/**` is import-disjoint from Combat/Cards/Enemy/Character,
  but `Enemy/index.ts` and `Enemy/types.ts` type-import `MapName` from
  `../World/map.library` (runtime-erased, so the sweep numbers are unaffected).
- next: `/iterate` — verify each with a failing test first (1, 4 and 5 are
  cheap to witness), then fix or delete; 3 is a design call (wire or remove)
  and needs a `[loop-call]` note in the commit body.
- note 2026-09-25 (T4 compaction): items 3 (`Effects/world-tick.ts`) and 4
  (`TIER1_EFFECT_MAP`, `T1_DEFAULT`) no longer exist — deleted in T2a. Items 1, 2
  and 5 re-read live at `d615a35d`.

### [x] [loop-call] `plan/bearings.md` still says there is no hosted web surface, and a second Pages project is about to exist (2026-09-20) — RATIFIED via /oversight 2026-09-23
- category: divergence
- impact: 5
- ease: 9
- detail: bearings L35-37 states "**No hosted web surface.**" as a standing
  decision. It was already in tension with the game's Cloudflare project (the
  open divergence row above); T's 2026-09-20 reversal makes a SECOND project
  deliberate policy. The sentence was not edited in this branch because the
  project does not exist yet and editing a record ahead of the tree is the
  precise fault the burn-day audit was called to clean up.
- next: when the Pages project is created (`docs/devlog-public-deploy.md` step
  8), correct bearings' sentence and the § Surface paragraph in the same commit
  that records the URL. Not before.
- **RATIFIED via /oversight 2026-09-23:** correctly deferred as filed. No
  action until the triggering event (Pages project creation).

### [x] [loop-call] The local verify gate and CI disagree about what green means: the Playwright journeys run only in CI (2026-09-20) — DECIDED via /oversight 2026-09-23
- category: process
- impact: 7
- ease: 6
- detail: filed by the burn-day audit 2026-09-19, found by the audit running
  against itself. `npm run verify --workspace axiomancer-mobile` does not run
  the Playwright journeys; `e2e:fixture`, `e2e:combat`, `e2e:encounters`,
  `e2e:exploration-roundtrip` and the rest are separate scripts that only the
  `verify + affected Playwright journeys` and `mechanics + affected consumers`
  workflows invoke. Row 3.1 shipped behind a green foreground mobile gate
  (308 suites / 2950 tests) and turned CI red on `e2e:fixture` case A: the
  generalised arrival derivation treated a fixture placement as an unanswered
  arrival, so `node-fv-9` never rendered. Five consecutive fix agents each ran
  the full package gate before committing and none could have caught it. The
  fix (`9f2bf6c`) is unrelated to this row; the gap is that a contributor's
  definition of "gate green" excludes a suite that can reject their push.
  This is the mirror of the existing observation that five root `npm test`
  files run in no workflow (burn-day audit section 4, B-7): there, guards that
  CI never runs; here, guards that only CI runs. Phase 57's own guard had the
  same shape until row 3.6 wired `check-baseline-freshness` and
  `regen-deck-matrix-baseline` into `verify-mechanics.yml` (`d8428d5`).
- options: (a) add an opt-in `verify:journeys` script and name it in AGENTS.md
  alongside the standing gate, so the reachable local command exists even if it
  is not run every time; (b) fold the journeys into `npm run verify` and accept
  the added minutes plus the browser dependency on every contributor run;
  (c) leave the split and document it loudly in AGENTS.md so nobody again reads
  a green package gate as a green tree. The audit did not choose — the cost of
  (b) is a real change to every contributor's inner loop and is the loop's call
  to weigh, not this session's to impose while shipping fourteen other rows.
- source: burn-day audit 2026-09-19, section 9 residue
- **DECIDED via /oversight 2026-09-23:** option (a) — add an opt-in
  `verify:journeys` script, named in AGENTS.md alongside the standing gate,
  so the reachable local command exists without adding minutes/a browser
  dependency to every contributor's default `npm run verify`. Ready to ship;
  routing to the next `/iterate` pass, tag dropped.

### [x] [loop-call] Two layers own save policy: the engine's DURABLE_ACTIONS allowlist and mobile's hand-placed checkpoints behind a deflecting adapter (2026-09-20) — DECIDED via /oversight 2026-09-23
- category: contract
- impact: 6
- ease: 5
- detail: filed by the burn-day audit 2026-09-19, row 3.7. The engine gates
  autosave to a curated `DURABLE_ACTIONS` set (`axiomancer-mechanics/src/
  Game/store.ts`, Phase 51 `4972f9a`). Mobile then makes that gate
  unreachable: `wrapDeflectingAdapter` (`axiomancer-mobile/state/store.ts`)
  swallows every engine autosave — durable actions included — unless it is
  inside the passthrough that the explicit `store.save()` verb opens. So no
  durable action has ever written on mobile, and persistence there is
  carried entirely by hand-placed checkpoints: 15 `getState().save()` call
  sites outside tests — `components/SaveOnExit.tsx`, `state/actions.ts`
  (the exposed verb, the move checkpoint, the map crossing),
  `state/combat/store-actions.ts` ×3, `state/hazard/store-actions.ts` ×3,
  `state/blacksmith/store-actions.ts` ×2, `state/cache/store-actions.ts`,
  `state/labyrinth/store-actions.ts`, `state/rest/store-actions.ts`. That
  is 13 checkpoints plus the verb plus the exit flush. Neither layer knows
  about the other, and nothing written down says which wins or where a new
  checkpoint belongs — which is how Phase 99 came to justify a correct fix
  with a rationale that named the wrong owner (PLAYTEST_BUGS_2026-09-18
  BUG-03). The call: pick one owner (add the mobile verbs to the engine
  allowlist and drop the wrapper, or keep the wrapper and say so in the
  engine docs), or keep both and write the rule. Whichever way it goes, the
  ownership as it stands today is now guarded — `axiomancer-mobile/state/
  e2e/exploration.engine.test.ts`, "mobile owns save timing" — so the
  decision has to be taken deliberately rather than drifted into.
- next: /oversight
- **DECIDED via /oversight 2026-09-23:** keep `wrapDeflectingAdapter`; mobile
  stays the sole owner of save timing via its hand-placed checkpoints — least
  churn, matches the already-shipped guard test
  (`axiomancer-mobile/state/e2e/exploration.engine.test.ts`, "mobile owns
  save timing"). Write this down explicitly as the ratified rule in the
  engine's own docs (where `DURABLE_ACTIONS` is defined) so the next reader
  doesn't mistake the allowlist for live behavior on mobile. Ready to ship
  as a docs-only fix; routing to the next `/iterate` pass, tag dropped. The
  companion mid-encounter persistence fix (`plan/PHASE_CANDIDATES.md`'s
  "No single owner for save/persistence policy" row, second phase) stays
  open — this decision unblocks it but does not implement it.

### [content][gap] Three of four Northern-Continent maps carry only 1 staged NPC — DECIDED, needs an attended character-spec/story-spec session (2026-09-05)
- category: content (found during `/adjust-npcs` pass 1's structural audit —
  Step 1's "map with fewer than 2 staged NPCs → CREATE" signal)
- detail: `caverns` (`theDelver` only), `connecting-river` (`theBoatwoman`
  only), and `town-across-river` (`theSweetheart` only) each carry exactly
  one rostered NPC; only `northern-city` (`theGateClerk`, `theShipwright`)
  clears the skill's own ≥2 threshold. Read against the maps' own in-file
  design commentary (Phase W3/W4, `Northern-Continent/maps.ts`'s header
  block), this reads as deliberate rather than an oversight: each singleton
  is explicitly the "guaranteed quest-giver on every route" pattern
  (the fv-2/Old Marrow precedent, scaled to a sparser map), and
  town-across-river is named in-file as "a homecoming, not a new front" —
  deliberately small. No `specs/characters/` or `specs/story/` document
  asks for additional voices on any of the three maps. Per this skill's
  hard rule 3 ("don't invent a named character's personhood autonomously")
  and Step 2's carve-out, filling this gap — even partially — means
  designing 1-3 new named characters' full personhood (voice, motive,
  history, at minimum a dialogue tree), which is `character-spec`/
  `story-spec`'s interactive job, not something this autonomous tick can
  responsibly improvise. Filed rather than actioned or silently dropped:
  a future `/adjust-npcs` pass re-reads this row before treating the
  signal as "already handled."
- score: n/a — routing item, not a scored fix. Needs a user call on
  whether Northern-Continent's minimalism is intentional (in which case
  this row should be closed as "by design" and the skill's threshold
  signal caveated) or whether one or more of the three maps should get a
  `character-spec`/`story-spec` session for a second voice.

**DECIDED via /oversight 2026-09-15:** not by design — needs more voices.
Authorize `character-spec`/`story-spec` sessions to design 1-3 new named
NPCs for `caverns`, `connecting-river`, and/or `town-across-river`. This is
an attended-session task, not autonomously shippable (hard rule 3): tag
changed from `[needs-user-call]` to `[gap]`, ready for `/march` to dispatch
to an interactive `character-spec`/`story-spec` session next time T is
present. Row stays open until that session runs.

### [content] 30 of 73 roster enemies (41%) carry no aftermath prose (`finalBlowLines`/`causeLines`) (2026-09-05)
- category: content (found during `/adjust-enemies` pass 1's structural
  audit — Step 1's "aftermath prose missing" signal)
- detail: Phase 71 (GH#65 ask 1) added `finalBlowLines`/`causeLines`/
  `pactLines` to the `Enemy` schema and authored them for most of the
  roster, but 30 of the original 2026-07-06 52-painting batch never got a
  pass (GraveLarva, ChatteringSkull, FootStealer, CursedHead, Ghast,
  DoomEgg, TheButcher, Wichtlein, BullBegger, WeepingHead, GoblinShaman,
  Sugata, PaleBrood, Mabadi, FrayedOne, BoneTotem, BoneWizard, CursedPaladin,
  VampireThrall, JeweledTree, OgreNaga, Sidelle, AshenBoneDrake, Zoma,
  MabadiUndrowned, TriEyesHollowed, BlackDeath, TheUnnameable, FireGiant,
  GreaterDevil — grep `finalBlowLines:`/`causeLines:` absence in
  `enemy.library.ts` to reproduce). Not a crash or a broken invariant —
  `types.ts` documents the field as optional with a consumer-side fallback
  (mobile presenter's `derive*Phrase` helpers render a generic line) — so
  verify stays green and nothing is silently wrong in play. It is a real
  flavor-completeness gap spanning nearly half the roster, including
  several elites/mid-roster names (Sugata, CursedPaladin, VampireThrall,
  FireGiant, GreaterDevil) that deserve a unique kill/death line as much as
  their siblings that already have one. Sized at ~30 enemies x 6 lines
  (brutal/quiet/ironic x2) in house voice (spec 34 §2.5) — a `content-curator`
  job, not a routine single-enemy edit, and too large to fold into this
  pass alongside its other two findings (the caverns CREATE and the Aporia
  portrait backfill) without diluting quality. No owner decision needed —
  purely executional — so filed here as `[content]`, not `[loop-call]`.
- score: impact 4 x ease 5 / 10 = 2.0

### [gap] Art pipeline: two queued owner calls block everything [parked: B8 — via /oversight 2026-09-28]
- parked: people, story and art are content (D58). T parked this legacy
  `[needs-user-call]` row via `/oversight` 2026-09-28; it returns with R11
  (people, story) or B8 (art), after RC. `/iterate` skips it.
- category: gap
- impact: 8
- ease: 9
- detail: filed 2026-08-22 by the content-pipelines audit. (1)
  `plan/ideas/AI_ART_PIPELINE_OPTIONS.md` §9 "Decision needed"
  (A gpt-image / B ComfyUI+FLUX / C hosted / Hold) has been unanswered
  since 2026-07-19 — one line unblocks art-1. (2)
  `Potential Assets/MCP-Axiomancer/images/` holds 116 painted card-art
  PNGs keyed by live card names ("V7 fuel" per the masterplan) with no
  license/provenance line — unusable until origin is stated. Also
  loop-doable regardless of the calls: write the asset naming/ingest
  convention doc, add a provenance-completeness + registry-drift test,
  commit the alpha-matte/WebP post-process recipe (currently tacit
  knowledge recorded only in provenance.json prose) behind a phase case.
- next: /oversight
- **PARTIAL 2026-08-22:** the loop-doable half shipped — conventions
  doc at `axiomancer-mobile/docs/asset-conventions.md` (recipe written
  down), acquisition pipeline queued as build-plan Phase 71.
- **RESOLVED 2026-08-22 (walkthrough), both owner calls answered:**
  (1) §9 route — T picked **Option 1, A-then-B** (hosted gpt-image-2
  behind a swappable adapter, local LoRA later if style drift binds);
  filed in `plan/bearings.md` § "ART PIPELINE ROUTE", the options doc
  §9, and queued as **Phase 73**. Needs an OpenAI key in `.env` before
  the generate leg runs. (2) The 116 paintings — T: **"Online as open
  source art."** That rules out an unlicensed-scrape risk but does NOT
  by itself license them: the per-image license and source are still
  unrecorded, so no truthful `provenance.json` entry can be written
  yet. NARROWED follow-up (not blocking any phase): recover the source
  site / asset-pack name — the loop may trace them itself and wire any
  image whose license it can evidence. See the bearings row.

### [contract] Cross-package impact checklist misses the world/enemy surfaces mobile consumes
- category: contract
- impact: 8
- ease: 7
- detail: filed 2026-08-22 by the content-pipelines audit. AGENTS.md's
  impact checklist + `scripts/ci-e2e-scope.mjs` omit `src/Enemy/**`,
  `src/World/MapEvents/**`, `src/World/Continents/**`,
  `src/World/map.registry.ts` / `map.library.ts`, `src/NPCs/**`,
  `src/World/Labyrinth/**`, `src/World/Blacksmith/**` — all consumed by
  mobile (e.g. an engine map-node change breaks mobile's
  `layout-engine-parity.test.ts` and CI never runs it; `portraitAsset`
  renders via two presenters). The checklist's `src/World/Rest/**` entry
  points at a directory that no longer exists (`RestChoice/` is the live
  successor, unguarded). Extend checklist + classifier, delete the dead
  entry.
- next: /iterate
- **RESOLVED 2026-08-22 (same PR):** AGENTS.md checklist extended
  (Enemy, NPCs, all of World/**) with the dead Rest entry replaced;
  `scripts/ci-e2e-scope.mjs` classifier updated (Enemy → combat +
  encounters; NPCs + all remaining World/** → encounters) with new
  test cases in `ci-e2e-scope.test.mjs`, runnable via the new root
  `npm test`.

### [content] Engine-generated "the enemy" strings survived the phase-40 card-text grammar pass
- category: content
- impact: 3
- ease: 5
- detail: filed 2026-08-23 by phase 40 (card-text grammar + full copy
  pass). That phase fixed the FIXED VOCABULARY rule ("the foe", not "the
  enemy") across every AUTHORED string: `cards.library.ts`
  `paidSummary`/`persistentEffect` (31 cards) and mobile
  `state/combat/keywords.ts` `KEYWORD_GLOSS`/`SYSTEM_GLOSSARY` (17
  entries), each now lint-enforced. Two adjacent surfaces still say "the
  enemy" and were deliberately left out of that pass (bounded scope, not
  an oversight): the ENGINE's own generated strings in
  `axiomancer-mechanics/src/Combat/combat.cards.ts`
  (`statePredicateText`'s `UNMOVED`/`enemy-drew-blood` clauses, the hex
  `Attaches to the enemy.` suffix, the `lock_stance` and
  `boost_all_dots` mechanic-text lines — 7 total sites) and the mobile
  presenter's per-mechanic `verbLine` prose in
  `axiomancer-mobile/state/presenters/combat-encounter.engine.ts`
  (`mechanicHeadline`, ~30 entries, several also carrying stray em
  dashes/semicolons the phase-40 lint never reached). Neither surface has
  a lint today. A future pass: rename the 7 mechanics sites (cheap,
  bounded — plus its `choir-card-wording.engine.test.ts` assertions that
  pin `UNMOVED (the enemy dealt you no damage last round)` / `the enemy
  drew blood since your last turn` / `Attaches to the enemy.` literally),
  then decide whether `mechanicHeadline`'s much larger prose set is worth
  a dedicated sweep or a standing lint of its own.
- next: /iterate

### [contract] Allowlist omits the commands the skills instruct — attended ticks prompt-wall
- category: contract
- impact: 6
- ease: 8
- detail: filed 2026-08-22 by the content-pipelines audit. CI is masked
  by skip-permissions, but local/attended ticks stall on:
  `npm run baseline:check` / `baseline:regen` (the latter being
  guard.mjs's own prescribed escape hatch for its baseline write-block),
  the minigame CLIs (`npm run hazard` / `gathering` / loot-cache /
  quest-board), `critique:drive`, `devlog:build` / `catalog*`,
  `npx expo|playwright|tsx|vitest`, `check-lexicon.mjs` invocations, and
  every tuning skill's PR-delivery verbs (`git checkout -b`,
  `git push -u origin <branch>`, `gh pr create` — only
  `git push origin main` is allowlisted). Also: the `reader` agent
  declares `mcp__claude-in-chrome__*` tools granted nowhere (dead in
  CI), and CI grants no kb-query/axio-query MCP tools. Extend
  `.claude/settings.json` + `_claude-skill.yml` grants.
- next: /iterate
- **BLOCKED-THEN-QUEUED 2026-08-22:** the remote liberation session
  was permission-blocked from editing `.claude/settings.json` itself
  (the harness protects self-expanding allowlists — reasonable).
  Queued as build-plan Phase 72 with the exact grant list, to land
  from an attended/local session. The root `npm test` script (part of
  the gap) DID ship.

### [gap] `npx playwright install chromium --with-deps` hung on an unreachable apt mirror, killing a full `march` tick
- category: gap
- impact: 5
- ease: 5
- detail: filed 2026-08-19 (digest pulse). Run `32226765299` (the
  2026-08-19 07:12 scheduled `march` tick) hung inside the shared
  `_claude-skill.yml` setup step (`npx playwright install chromium
  --with-deps`, used by both `march` and `night`) — its underlying
  `apt-get update` retried `azure.archive.ubuntu.com` for over an hour
  (07:13:53 -> 08:27:49, zero progress the entire window, log lines
  `Ign:2..23` repeating) before the job's `timeout_minutes: 75` ceiling
  force-cancelled it. No commit resulted; the tick is a total loss, not
  a partial one — distinct from the already-filed "march ticks are
  creeping toward the job timeout" row above (that one is real work
  outgrowing the ceiling; this one is an idle apt-mirror hang eating
  the whole budget while nothing runs). `verify-mechanics.yml` and
  `verify-mobile.yml` carry their own copy of the same install command,
  so the exposure isn't march-specific, just unluckiest there because
  that job runs unattended on the longest cadence.
- next: /iterate. `--with-deps` re-runs `apt-get update && apt-get
  install` on every invocation with no cache and no timeout around the
  network call; caching the installed apt packages (or the Playwright
  browser + its system deps together, keyed on the pinned Playwright
  version) removes the network dependency from the common path
  entirely. A cheaper interim fix: wrap the install step in a short
  step-level `timeout-minutes` so a mirror hang fails fast and loud
  instead of silently eating the whole job ceiling.
- recurrence (2026-08-21 digest pulse): run `32290461478` (the
  2026-08-19 18:59 scheduled `march` tick) hit the identical signature —
  `apt-get update` stuck retrying `azure.archive.ubuntu.com` from
  18:59:49 with zero progress until the ceiling force-cancelled it at
  20:14:33, another total loss. Second confirmed occurrence in 12 hours;
  still unfixed, still `/iterate`-shaped, not re-scored.

### [divergence] Bearings says there is no hosted web surface; Cloudflare Pages has been publishing one — RULED via /oversight 2026-08-10: incidental, scope it down — CONFIRMED LIVE EXPOSURE via /oversight 2026-08-12, impact raised
- category: divergence
- impact: 8
- ease: 6
- detail: filed 2026-08-09 (first-map audit follow-up, offered to T at the
  close of PR #186 and accepted). `plan/bearings.md` L35-37 states, as a
  standing decision, "**No hosted web surface.** The product ships as a
  mobile app via manual EAS builds; `main` does not auto-deploy," and
  § Surface reinforces it: "This is not a website... an expo-web build used
  only for dev/e2e/playtesting." Observed during PR #186: Cloudflare Pages
  publishes a preview per branch. The repo already knows this in one
  place — `.github/workflows/build-devlog.yml` L6 commits generated DevLog
  HTML to `main` explicitly "so the existing Cloudflare Pages integration
  can serve them" — so the integration is not a surprise to the tooling,
  only to the doctrine file every skill reads first.
- **confirmed first-party while this row was being filed.** PR #190 reports
  two check runs, and one of them is named **`Cloudflare Pages`** —
  `conclusion: success`, `details_url` pointing at
  `dash.cloudflare.com/.../pages/view/axiomancer/<deployment>`. Pages is not
  merely integrated; it builds and publishes on pull requests, and reports
  back as a required-looking status check on the same PR list a reviewer
  reads. Whatever the doctrine says, the repository has a deploy surface
  with a per-PR URL.
- **the URL shape, observed rather than inferred.** The Pages bot comments
  on the PR with both addresses and edits the comment in place as the build
  finishes:
  - per-deployment: `https://<deploy-hash>.axiomancer.pages.dev`
  - **per-branch: `https://<branch-slug>.axiomancer.pages.dev`** — for this
    row's own branch, `https://claude-first-map-audit-minig.axiomancer.pages.dev`.
    The slug is the branch name truncated, so the address is guessable from
    a branch name alone.
  That answers the "name the URL shape" half of this row for free. Still
  open, still needing a ruling: whether these are intended and what is safe
  to publish there. **Knowing the address is not deciding the door should be
  open** — do not read this bullet as draining the question above it.
- one thing deliberately NOT done while filing: the row asks whether
  anything unintended is reachable without auth, the private DevLog being
  the obvious candidate since `build-devlog.yml` commits its generated HTML
  to `main` specifically for Pages to serve. Probing a live host for
  unauthenticated private content is a deliberate act, not a side effect of
  filing a row. Whoever drains this should do it knowingly.
- why this matters beyond bookkeeping: the "no hosted surface" premise is
  load-bearing in at least two places. `/critique` and the `reader`
  subagent are built to visit a live site as a stranger; a doctrine that
  says no such site exists tells them there is nothing to visit. And the
  `[needs-user-call]` product-name row above weighs "Axiomancer" under a
  whole-product pivot — a decision that reads differently if branch
  previews are already public URLs versus if nothing is published at all.
- `[needs-user-call]` on which way to reconcile: whether the previews are
  intended (bearings should describe them, name the URL shape, and say
  what is safe to publish there) or incidental (the Pages integration
  should be scoped or turned off). Do not "fix" this by editing bearings
  to match observed reality — the sentence is a standing decision, and
  only T can restate it. What /iterate CAN do without a ruling is confirm
  the current publish scope: which branches build, what the URLs are, and
  whether anything unintended (the private DevLog among them) is reachable
  without auth.
- **RULING (T via /oversight 2026-08-10):** incidental — not an intended
  public surface. Scope it down (restrict Cloudflare Pages to
  internal/preview-only use, or turn it off) rather than rewrite
  bearings to describe a public site. Bearings' "no hosted web surface"
  sentence stands as the target state; this row stays open until the
  Pages integration actually matches it.
- next: /iterate or a small phase — confirm current publish scope first
  (which branches build, whether the private DevLog is reachable
  without auth per the bullet above), then restrict/disable the
  Cloudflare Pages integration (`.github/workflows/build-devlog.yml`'s
  Pages-serving comment, and/or the Cloudflare project's build settings,
  which live outside this repo). This is an infra/config change, not a
  plan edit — `/oversight` does not make it directly.
- **CONFIRMED via /oversight 2026-08-12** (the "next" scoping step
  above, done knowingly per this row's own instruction). The ruling's
  scope-down action has NOT happened yet — no Cloudflare config exists
  in-repo, `.github/workflows/build-devlog.yml` is unchanged since
  2026-08-08 and still commits DevLog HTML to `main` for Pages to
  serve. Live check: `https://axiomancer.pages.dev` (production domain)
  returns the live site with no auth wall, and the DevLog it serves at
  `/devlog/log.html` — generated HTML whose own header literally reads
  "A private index of the game's content and the nightly development
  log" — is reachable at that URL **right now, unauthenticated**.
  Content labeled private is live on the public production domain.
  Impact raised 6→8 on the strength of this confirmation; the fix
  itself (restrict/disable Pages) is unchanged from the "next" note
  above and still needs an infra/config actor, not `/oversight`.
- **QUEUED via /oversight 2026-08-15 — build-plan Phase 57.** Shown that
  the 2026-08-10 ruling had produced no change in five days precisely
  because this row routed its whole fix to an actor outside the repo, T
  ruled: queue the in-repo half now. Phase 57 stops
  `.github/workflows/build-devlog.yml` committing DevLog HTML to `main`
  for Pages to serve, and adds a check that fails if it reappears in the
  served tree — which takes the private content out of what Pages
  publishes without needing dashboard access. **This row stays open
  after Phase 57 ships.** The Cloudflare project itself (production
  domain, and the guessable per-branch
  `https://<branch-slug>.axiomancer.pages.dev` previews) still needs a
  human at the dashboard to restrict or disable; that is the remaining
  half and the reason the row does not close on the phase alone.
- **Phase 57 SHIPPED.** The in-repo half is drained: generated DevLog
  HTML/data/catalog-art are untracked and gitignored,
  `build-devlog.yml`'s commit-to-main step is deleted, `/digest` no
  longer commits generated output, and `scripts/check-devlog-not-served.mjs`
  guards against regression (pre-commit hook + weekly
  `check-devlog-served.yml`). Post-deploy, the previously-live DevLog
  URLs should 404. **Row stays open** — the Cloudflare project itself
  (production domain, guessable per-branch previews) still needs a
  human at the dashboard, per the text above.
- **CONTENT POLICY REVERSED by T, 2026-09-20 — the row's shape changes.**
  The DevLog, its evidence and the full catalog are now deliberately public
  (`archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-20-devlog-public-publish.prompt.md`), so "content labeled
  private is live on a public domain" is no longer the finding. What remains
  of this row is unchanged and still open: bearings' "no hosted web surface"
  sentence versus a Cloudflare project nobody in-repo controls, and the
  guessable per-branch previews. Both still need a human at the dashboard.
  The reversal did NOT loosen phase 57's mechanism: generated output stays
  untracked, the guard stays wired, and publication happens at deploy time
  from `dist/devlog-public/` (`npm run site:public`), a directory the guard
  now also covers. Bearings' sentence is the one record that must change
  when the second Pages project exists — filed below as a loop-call rather
  than edited blind, because the project does not exist yet.
- **ACTED ON by T, 2026-10-19 — the `axiomancer` Pages project is deleted.**
  T ruled in an attended session that the per-branch previews were not worth
  their cost: their only consumers were audits and agents, T plays on local
  builds and EAS preview APKs, and the project auto-built **every pushed
  branch** into a public URL — a standing accident path while the art
  licensing is still in flight (it is why the `new-assets-extract` reskin,
  full of extracted Buriedbornes 2 art, was never pushed). The project and
  its deployments were deleted with `wrangler pages project delete`;
  `axiomancer-devlog` is untouched and still builds. So the guessable
  per-branch preview half of this row is **closed**, not scoped: there is no
  longer a project to guess at.
- **Still open, and still only T's to write:** bearings' "No hosted web
  surface" sentence. It remains inaccurate — `axiomancer-devlog` is a hosted
  public surface, deliberately so since the 2026-09-20 reversal. Deleting the
  game project removed the *unintended* surface, not the sentence's error.
  Per this row's own standing instruction, that sentence is a standing
  decision and is not edited to match observed reality by anyone but T.
- a replacement for what the previews were actually good for: Cloudflare built
  from a clean clone, which is a real check — it is how the `Potential Assets`
  sealing was confirmed on hardware that never had the directory (PR #645).
  That proof is now unmanned. Worth a loop-call: an export step inside
  `verify-gate` that builds the web bundle and publishes nothing.

### [x] The loop's own docs still call the `Closes #N` trailer the closing mechanism — RESOLVED 2026-10-06 (9d86edbe)
- category: docs
- issue: #449
- impact: 6
- ease: 9
- detail: filed 2026-08-08 by Phase 48. `skills/ship-a-phase.md:325`,
  `skills/iterate.md:315` and `scripts/loop-issue.mjs:10` describe the
  trailer as a "belt-and-suspenders backup", and `skills/iterate.md:193`'s
  issue-body template promises "this issue auto-closes when the commit
  pushes to main". Phase 48 proved the trailer is inert here and has never
  closed anything. Those sentences are now TRUE for the first time — but
  because `close-trailers.yml` runs the sweep, not because GitHub parses the
  trailer. Reword them to name the sweep, or the next reader re-derives the
  same wrong mental model this row's parent already cost five days to.

### The Phase-169 loadout path is dead in the shipped runtime
- category: debt
- impact: 5
- ease: 5
- detail: filed 2026-08-08 by Phase 52a. `createNewGameState` seeds only the
  2 `STARTING_CARD_IDS` loadout flags and mobile never writes loadout flags
  afterward, while `initializeCombatEncounter` calls `buildCombatDeck(player)`
  with no flags at all. 52a's loadout reconciliation is correct and tested,
  but nothing exercises it end to end. Pairs with the row above.

### `specs/README.md` has no row for spec 34
- category: docs
- impact: 3
- ease: 10
- detail: filed 2026-08-08 by Phase 42; the authoring agent's file ownership
  forbade editing the index. One-line add.

### Fixture player rebuild seeds the relic kit a real new game no longer has
- category: divergence
- impact: 3
- ease: 7
- detail: filed 2026-09-23 (docs-consistency pass after PR #360). Since
  PR #360 `createNewGameState()` seeds NO relics (the very start).
  `applyPlayer` in
  `axiomancer-mechanics/src/Game/fixtures/state-fixture.builder.ts`
  still rebuilds any fixture that overrides `level` or `baseStats` with
  `createCharacter({ ..., inventory: current.inventory,
  seedStartingRelics: true })`. So a preset-less fixture such as
  "fresh game at level 3" boots wearing the full Phase-19 kit, a state
  no real player can reach. When a preset is applied first, its
  inventory already holds relics and the rebuild prepends a second
  kit; that duplicate is unverified here. `docs/state-fixtures.md`
  describes the code accurately; the code and the new-game contract
  disagree.
- next: decide whether a fixture rebuild should mirror the real start
  (no kit unless the preset supplied one) and add a builder test
  pinning the choice. Not fixed in the docs pass (code, out of scope).

### 2026-07-20 missing-layers survey — unpromoted findings (audio, settings, a11y, perf, flags, save export)
- category: gap
- impact: 5
- ease: 3
- detail: filed 2026-07-20 (owner missing-layers survey session; "file
  the residue"). The session surveyed all cross-cutting infrastructure
  layers; the owner promoted TWO (in-house crash capture → candidate;
  central juice layer → Phase 38) and deliberately did NOT promote the
  rest. Recording those findings here as signal, NOT as candidates —
  the owner saw this list and chose; do not self-promote, let `/expand`
  re-propose when context changes. The unpromoted findings:
  (1) **Audio — fully absent.** No expo-av/expo-audio, no SFX/music/
  volume anywhere; haptics (~20 call sites) are the entire sensory
  layer. The biggest player-facing absence for a mobile game.
  (2) **Settings screen — absent.** No settings route; theme switching
  lives in the SELF tab (`components/ThemeSwitcher.tsx`); nowhere to
  put audio volume, a11y toggles, or data management. Partially blocks
  (1) and (3).
  (3) **A11y depth.** Reduced-motion + a11y labels exist; font scaling
  (`allowFontScaling` largely unused), color contrast, and screen-
  reader flow validation do not (`specs/12-accessibility-and-theming.md`
  is the spec surface).
  (4) **Feature-flag registry.** Flags are scattered per-feature
  env + `__AXM_*` global reads (`state/combat/flags.ts` the pattern);
  fine at ~3 flags, painful at 10; no central registry.
  (5) **Perf instrumentation.** One perf regression test + font-bundle
  splitting exist; no frame-budget hooks, no bundle-size CI gate.
  (6) **Save export/backup.** Single-slot save is mature (migrations,
  corruption modal) but there is no manual export/backup/restore.
  Deliberate non-goals confirmed same session (do not re-file): product
  analytics, i18n (copy doctrine cuts against it), backend/auth/cloud
  saves (offline by design, `plan/bearings.md` § Auth).
- next: /expand — re-propose individual items as candidates when their
  blockers move (a settings screen unlocks audio + a11y toggles; the
  flag registry becomes worth it at the next 2-3 flags).
- update 2026-09-23 (PR #360): (2) **settings screen now exists**
  (`/settings`; the theme picker moved there from the SELF tab) and (3)
  gained a **text-size** step plus a reduced-motion override. (1) audio
  is still absent — music/SFX volumes are persisted but nothing plays.
  (6) saves are now **three slots** (`@axiomancer/save:v2:slot-*`);
  export/backup is still absent. (4) and (5) unchanged. Row stays open
  for (1), (4), (5), (6).

### hazard/gathering "paradox-token" reward vocabulary outlives the card category — OWNER CALL MADE 2026-08-08: rename to QUANDARY
- category: divergence
- impact: 2
- ease: 4
- **decision (owner, /oversight 2026-08-08 — this row is no longer a
  `[needs-user-call]`, it is a ready-to-ship /iterate row):** RENAME, do
  not remove and do not leave. The reward economy stays exactly as it is;
  only the vocabulary changes. **"paradox token" → "QUANDARY".** Removal
  was explicitly declined — the token is a live reward tail in two
  minigames, so deleting it is an economy change needing its own phase,
  not an /iterate row. Leaving it was declined too: the word points at
  nothing in the game after phase 37.
- rename target vetting (done at the call): `quandary`, `conundrum` and
  `sophism` are all zero-hit across `axiomancer-mechanics/src`,
  `axiomancer-mobile/state` and `axiomancer-mobile/components`, so none
  collides. `aporia` was ruled OUT — it is already W-01's continent
  (`specs/world/W-01-aporia-labyrinth-continent.md`) and also appears in
  C-01 and spec 32. QUANDARY chosen: same cold/archaic register, no
  collision, and it means what the paradox token meant without pointing
  at a retired card category.
- scope when /iterate takes it (5 sites, all mobile, no engine change):
  `HAZARD_TOKEN_FLAG_PREFIX` + its doc comment
  (`state/hazard/store-actions.ts` ~L76/L484), the gathering flag prefix
  + doc comment (`state/gathering/store-actions.ts` ~L64/L269), the two
  reward blurbs `+${r.amount} paradox token(s)`
  (`state/presenters/hazard.engine.ts` ~L369,
  `state/presenters/gathering.engine.ts` ~L241), and the
  `case 'paradox'` glyph (`components/hazard/glyphs.tsx`). Persisted
  flag prefixes are save-visible — check whether the change needs a
  `GAME_STATE_VERSION` migration before renaming the prefix strings, or
  keep the prefix and rename only player-facing copy. Re-grep first;
  distinguish from the `arrow-paradox` card id and `Item.category`
  (both unrelated, both stay).
- detail: filed 2026-07-18 (phase 37 planning residue). Phase 37 retires
  the `fallacy`/`paradox` card **category** + the dead `combatResources`
  token pool, but deliberately leaves the separate hazard/gathering
  **reward** system that still speaks "paradox": `HAZARD_TOKEN_FLAG_PREFIX`
  = `'hazard-token-banked:'` + the `token` reward doc'd as banking a
  "paradox-token flag" (`axiomancer-mobile/state/hazard/store-actions.ts`
  ~L76-77/L484, `state/gathering/store-actions.ts` ~L64/L269), and the
  reward-blurb strings "+N paradox token(s)"
  (`state/presenters/hazard.engine.ts` ~L369, `gathering.engine.ts` ~L241,
  `components/hazard/glyphs.tsx` case `'paradox'`). These are a live reward
  token, NOT the removed card category — but once phase 37 lands, "paradox"
  survives ONLY as this reward vocabulary, which will read as an orphaned
  reference to a concept the game no longer has. needs-user-call: rename the
  reward token (to what?) vs. remove it vs. leave it. Do NOT bundle into
  phase 37 (owner scoped it out). Re-grep before acting; distinguish from the
  `arrow-paradox` card id (unrelated) and `Item.category` (unrelated).
- next: /iterate — the owner call is made (rename → QUANDARY); execute it.

### `deploy:check` is unusable from remote web sessions — 401 "Token rejected"
- category: debt
- impact: 4
- ease: 5
- detail: filed 2026-07-18 (oversight session residue). Running
  `npm run deploy:check` from a Claude Code web session fails with
  `GitHub Actions API error: 401 Unauthorized / Token rejected` — the
  script needs the repo-scoped `GH_TOKEN` from `.env`, which is
  gitignored and absent in remote containers. The session fell back to
  the GitHub MCP Actions API (which authenticates fine) to confirm
  CI-green, but nothing records that fallback, so every skill step that
  says "run `npm run deploy:check`" (oversight §7, ship-a-phase §10,
  bearings' deploy gate) silently dead-ends in web sessions. Fix
  options: teach `scripts/deploy-check.mjs` to fall back to a
  `GITHUB_TOKEN`-style env var when `GH_TOKEN` is absent, and/or state
  the MCP fallback in bearings' deploy-gate section so remote sessions
  know the sanctioned path.
- next: /iterate (deploy-check.mjs env fallback + a bearings note)

### Worktree sessions resolve the wrong TypeScript — mechanics verify gate fails with TS5095
- category: debt
- impact: 4
- ease: 7
- detail: surfaced 2026-07-17 during the starter-deck-presets rename.
  `npm run verify` in `axiomancer-mechanics` fails from any
  `.claude/worktrees/*` checkout with `TS5095: Option 'bundler' can
  only be used when 'module' is set to 'preserve' or es2015+`. Root
  cause: the mechanics tsconfig (module `commonjs` +
  moduleResolution `bundler`) is accepted by TypeScript 6.0.3
  (installed at `axiomancer-mechanics/node_modules`) but rejected by
  5.9.3 (repo-root `node_modules`); worktrees have no local install,
  so Node walks up past the worktree into the root and picks 5.9.3.
  Every worktree session must hand-invoke the 6.0.3 `tsc.js` to run
  the gate. Fix options: align the root TypeScript devDependency to
  6.x, make the tsconfig valid under both (e.g. module `preserve` or
  moduleResolution `node`), or install per-worktree. A task chip was
  also filed from the session.

### Telemetry attribution is best-effort; CI logging path unverified
- category: debt
- impact: 3
- ease: 4
- detail: TELEMETRY.md (shipped 2026-07-17, commit 03969cea) scrapes
  model and main-vs-subagent from the transcript tail because hooks
  don't expose either directly — expect `unknown` cells and possible
  misattribution near sidechain boundaries; a call racing a sidechain
  boundary can be attributed to the wrong side. Also unverified: in
  cloud ticks, skills arrive as '/command' prompts and should land as
  slash-prompt rows via UserPromptSubmit — confirm rows appear (and
  ride the tick's commit) after the first few cloud runs. If the
  harness later exposes agent id / model in hook input, replace the
  transcript-tail scrape in .claude/hooks/telemetry.mjs.
- next: /iterate (verify after next cloud tick; upgrade when harness
  allows)

### kb-query MCP could surface kb/ sync age
- category: gap
- impact: 2
- ease: 8
- detail: kb-sync.mjs now stamps kb/.sync-meta.json (2026-07-17) and
  the session-start hook reports age, but design sessions that go
  straight to the kb-query MCP server / skill never see it. Adding the
  stamp's age to kb_overview output (and a staleness warning >14d)
  would put corpus freshness in front of the consumer that actually
  cites it.
- next: /iterate

### [1.2] Skipped enemy stat-budget test (content decision — RESOLVED via oversight 2026-07-08)
- category: content
- impact: 4
- ease: 3
- detail: `src/Enemy/e2e/new-enemies.engine.test.ts` skips its
  `enemyStatBudget` assertion — the 30 authored enemies match the
  budget at levels 1-4 but drift up to 2x at level 50 (authored
  under old constants with gear-tier scaling baked into raw
  stats). Decision (via `/oversight` 2026-07-08): the budget curve
  is canon; the 30 authored enemies need re-authoring to comply
  (reconstruct per-enemy gear-tier inputs so raw stats match the
  budget formula through level 50), then unskip the assertion.
  Promoted to `plan/PHASE_CANDIDATES.md` as a real content phase —
  see "Enemy stat rewrite to budget-curve compliance".
- next: /oversight (promote candidate to a build-plan phase when
  queue has room)

### [2.0] Mobile `as any` clusters at the state boundary
- category: debt
- impact: 4
- ease: 5
- detail: cast clusters at state/test boundaries, esp. the
  `state/actions.ts` engine-store bridge. Recurring drain target,
  not a single fix.
- update (verified via /oversight 2026-08-12): the originally-cited
  `state/actions.ts` bridge is now clean of live `as any` casts (only a
  resolution comment remains, citing the [2.5] event-audit fix);
  `event.engine.ts` and `exploration.engine.ts` show the same pattern.
  Remaining `as any` in `axiomancer-mobile/state/` is almost entirely
  test-file mock casts plus one production line
  (`state/persistence/migrations.ts:50`). Staying open as the
  recurring-drain bucket it was always framed as, not because the
  cited example is still broken.
- next: /iterate

### [1.6] Mobile accessibility gaps
- category: a11y
- impact: 4
- ease: 4
- detail: focus management + a11y labels surfaced repeatedly in
  prior critique. Ongoing drain.
- next: /iterate

### [1.5] Unbounded keepsake/death flag growth on long saves
- category: debt
- impact: 3
- ease: 5
- detail: `night-keepsake:`, `hazard-scar:`, `hazard-death:`,
  `gleaning-token-banked:` accumulate with no consumer/cap. A
  long-save soak test could trip on this.
- next: /iterate

### [1.5] `HazardBoard.tsx` file-length outlier (~815 lines)
- category: debt
- impact: 3
- ease: 5
- detail: extraction candidate; several other mobile files are
  length outliers. Extract sub-components with their own tests.
- next: /iterate

### [2.1] Two agent-e2e walkthroughs describe a deleted engine surface
- category: gap
- impact: 3
- ease: 7
- detail: spotted 2026-07-10 during the `/consolidate` terminology
  sweep design (phase 25). `axiomancer-mechanics/automation/scripts/
  walkthroughs/skill-learning.goal.md` names
  `learnSkill(character, skillId)` from `src/Skills/skill.engine.ts`;
  `tier2-skill-chain.goal.md` narrates `executeSkill`/`basePower` in
  the same retired vocabulary (`base-power` and `src-skills-path` are
  both live `lexicon.json` rows for exactly this concept). Neither
  `src/Skills/` nor `learnSkill` exist in `axiomancer-mechanics/src`
  today. Both files sit in `automation/`, a lexicon-exempt
  dated-record zone, so `check-lexicon` never sees them, and their
  paired `.json` scripts may already be dead too (`node
  automation/agent-e2e.mjs skill-learning` / `tier2-skill-chain`
  would confirm). Left un-deleted per the janitor mandate's
  suspected-dead-file rule — the automation/README.md inventory
  table and the harness owner should confirm dead-vs-superseded
  before removal.
- next: /iterate
- update (`/iterate` investigation, 2026-09-11, no code shipped — this
  tick's one fix went to the [1.8] tray-die a11y row instead): confirmed
  dead, not superseded — `axiomancer-mechanics/docs/lexicon.json`'s own
  `retired` registry (`src-skills-path`, since "2026-07 (PR #48 deleted
  the dead src/Skills/ ability system; see CHANGELOG 'De-conflation')")
  already rules this: the whole `src/Skills/` tier-ability system
  (`learnSkill`, `executeSkill`, `SkillLookup`, `skillLibrary`) is gone
  from `src/`, replaced by the SignatureSkill family (a separate living
  concept). Both goal.md/json walkthrough pairs are safe to delete next
  pick, per the row's own scoped ask. **Wider scope found while
  checking:** `learnSkill`/`executeSkill` are NOT confined to these two
  automation files — `README.md`'s Skills feature-table row,
  `docs/testing.md`, `docs/oaths.md`, and specs 06/14/25/31 all still
  describe the retired system in detail, several citing Phase
  30-66-numbered work as if current. That is a much larger, higher-risk
  doc-rewrite than this row's "two automation files" framing (touches
  the canonical feature-table, not a lexicon-exempt dated-record zone)
  — filed here rather than attempted blind; a future pick should treat
  the automation-file deletion and the README/specs rewrite as two
  separate scoped fixes, not one.

### [content] "Blank Indenture" violates NL-8 and is grandfathered, not renamed
- category: content
- impact: 2
- ease: 7
- detail: filed 2026-08-27 by Phase 70. The naming-law sweep that phase wired
  into CI found exactly one violation across 114 shipped card and enemy names:
  the card "Blank Indenture" begins with BLANK, a locked die-face word, which
  NL-8 forbids ("a name may not be or begin with a locked/registry word"). The
  card shipped before the naming law existed. Phase 70 put it on
  `GRANDFATHERED_NAMES` in `scripts/check-naming-law.mjs` with its reason, so
  the gate protects every new name while this one stays visible — the sweep
  prints the exemption on every run rather than hiding it.
- next: rule on the rename. It is a small, player-visible content change (the
  card name plus one reference in `recoil-x.engine.test.ts`), and the name
  carries real meaning — a blank contract — so a replacement should keep that
  ("Unwritten Indenture", "Unsigned Indenture") rather than reach for a new
  image. Removing the entry from GRANDFATHERED_NAMES is what closes this row.

### [tooling] `guard.mjs` greps the whole command string, so quoted text trips its rules
- category: tooling
- impact: 4
- ease: 5
- detail: three confirmed instances of one shape. The 2026-08-22 content-pipelines
  audit found two: an emoji inside quoted CARD TEXT read as a commit-trailer
  violation, and `backgroundedGate`'s regex catching any command containing the
  word "test". A third hit 2026-08-27 during Phase 72: a `git commit` was
  rejected for a forbidden push flag that appeared only as QUOTED PROSE inside
  the heredoc message — the brief was documenting which verbs stay denied. The
  guard cannot tell a command from text inside a command.
- why it matters: each instance costs a retry and teaches the loop to avoid
  writing about the rules it enforces, which is the opposite of what the plan
  files are for. The failure is silent-ish (a blocked tool call, not a wrong
  result), so it accumulates rather than being fixed.
- next: parse before matching. The push-flag and trailer rules should apply to
  the command's own argv, not to heredoc bodies or `-m` message contents; the
  `-m` body already has its own dedicated lint pass, so the general grep can
  exclude it. `backgroundedGate` should match a test COMMAND, not the substring.

### [tooling] Concurrent `/march` ticks race for the same build-plan phase
- category: tooling
- impact: 5
- ease: 6
- detail: observed 2026-08-27. A local `/loop /march` and the scheduled CI
  `/march` both picked Phase 74 within ~30 seconds of each other. Both wrote a
  brief (`phase_74_north_star_ratification.md` and
  `phase_74_north_star_into_spec.md`); the CI tick also opened mirror #252. The
  local tick noticed on its push rejection, yielded, and deleted its duplicate
  brief — but only because the push happened to race. Had both pushed cleanly,
  two agents would have edited spec 34 §2 concurrently.
- root cause: `ship-a-phase` picks "the first `[ ]` row" with no notion of a
  claim. The mirror issue is a perfect claim token — it is opened at start and
  closed at ship — but it was only ever consulted as find-or-create, never as
  "is someone else already here?".
- MITIGATED 2026-08-27: `skills/ship-a-phase.md` gains Step 2.4, a claim check
  that reads the open mirror before building and dispatches past a phase
  another tick started in the last ~2 hours. An older open mirror is adopted
  rather than skipped, so a crashed tick still gets finished.
- residual: the check is advisory (a skill instruction, not a lock) and has a
  ~30-second race window of its own — two ticks that check simultaneously both
  see no mirror. Closing that properly needs an atomic claim, e.g. the mirror
  opened BEFORE the brief is written and treated as a lock. Left open: the
  cheap fix covers the observed failure, and a real lock is a bigger change to
  a flow that is otherwise working.

### [x] [loop-call] Timing perf budgets hold only on the CPU they were seeded on (2026-10-11) — RATIFIED via /oversight 2026-10-17
- category: perf
- impact: 5
- ease: 8
- detail: the PF1 brief said "Budgets still apply" across a runner change.
  The first weekly run landed on an Intel Xeon 8573C, about 20% slower on
  every timing than the AMD EPYC 9V74 the budgets were seeded on. That is
  the same as the budget headroom, so it filed three load breaches (#489,
  #490, #491). An AMD re-measure at the same code was flat against the seed
  line. The loop chose to have `budgets.json` record its seeding CPU, check
  timing budgets only on that CPU and note the skip in the history line.
  Byte budgets always apply (commit afcd727c; PF1 brief rule 6 amended). Cost:
  an Intel week checks no timing at all, so a real regression shows only on
  the next AMD week.
- next: `/oversight` ratifies or reverses. Alternatives: per-CPU budget sets
  (seed each CPU once), or keep budgets everywhere and raise the headroom to
  cover the slower runner.

## Done

### [x] [content] The title screen still shows the painted "AxiomanceR" wordmark after the Phase 67 rename — CLOSED 2026-10-11 (T, attended)
- category: content
- impact: 6
- ease: 2
- detail: filed 2026-08-27 by Phase 67. The rename to "Miserere Mei, Deus"
  shipped everywhere it could reach as a string — store/web metadata, CLI
  banners, published site chrome, the doc set. The one surface it cannot
  reach is the one a player actually sees first: the title screen's wordmark
  is painted into `axiomancer-mobile/assets/images/title-embark.jpg`
  (1024x1024 key art, wordmark near the top edge), and
  `components/TitleScreen.tsx` renders that image with `contentFit="contain"`
  specifically so the painted "A" and "R" are not cropped. There is no text
  node to rename. Net effect today: the browser tab and store listing say
  "Miserere Mei, Deus" while the first screen says "AxiomanceR".
- next: new key art carrying the new wordmark, through the art pipeline
  (build-plan Phases 71 / 73). A text-overlay stopgap is NOT the fix — it
  would double the wordmark against the painted one. Until then this is a
  known, deliberate inconsistency, not drift.
- resolution: T asked for both fixes in an attended session. The splash now
  reads "Miserere Mei, Deus" in the game's own Pirata One. The AI key art is
  retired from the title screen and every launcher icon. In its place is a
  public-domain Doré plate (Purgatorio I, acquired through
  `scripts/acquire-art.mjs` with its licence read from Commons) under a typeset
  wordmark that the splash, the title screen and the main menu share
  (`state/presenters/title.engine.ts`).

### [x] combat — user crash on ACCEPTING post-combat card reward (unreproduced, PR #216) — CLOSED 2026-10-11 via /oversight (blind)
- category: external-critique
- impact: 9
- ease: 6
- next: body says "LIKELY THE SAME BUG — RESOLVED 2026-09-04 (verify
  before closing)" (the rune-column/worklet fix may already cover it) —
  get the owner's device log (SELF -> dev tools -> DIAGNOSTICS -> PREV
  SESSION, domain ERROR) to confirm before closing; can't be shipped
  blind on web alone.
- evidence 2026-09-27 (post-purge playtest): `combat-round-e2e.mjs`
  `MODE=live PRESET=sage` won four fights (seeds 16 and 8). Each run tapped
  an offer, then CHOOSE THIS, then TAKE CARD, with no page error, and the
  Deck tab showed the pick (10 → 11 cards). The web accept path is clean on
  the grey pool; the device log is still the only way to close this.
- resolution: T closed it blind via `/oversight` 2026-10-11 as covered by the 2026-09-04 rune-column/worklet fix, without the device log. The 2026-09-27 web runs accepted rewards cleanly. If the crash recurs on a device, file a fresh row with the DIAGNOSTICS PREV SESSION log.

### [x] [loop-call] The level prints in arabic everywhere; roman numerals stay for chronicle counts only (2026-10-09) — RATIFIED 2026-10-11 via /oversight
- category: divergence
- impact: 2
- ease: 9
- detail: RC walk item 11 (`plan/CRITIQUE.md`) found the level printed two
  ways: "LVL 4" on SELF, the combat pilgrim line, StatusCard and "XP TO LVL
  N", but "level iv" on AscendStrip, LevelReadyStrip and LevelUpModal, whose
  comments cited the design bundle's lowercase-roman numeral rule. The loop
  chose arabic for the three level-up surfaces (commit 8c8b1701, issue #473):
  the level is a number the player compares against "XP TO LVL N", four
  surfaces and every accessibility label already print it in arabic, and
  `state/presenters/roman.ts` stays the home for round and encounter-seal
  counts.
- next: `/oversight` ratifies or reverses. Reversing means making the SELF
  medallion, "XP TO LVL N", the combat line and StatusCard roman instead.
- resolution: T ratified the arabic level via `/oversight` 2026-10-11. Keep it; do not re-file.

### [x] [tests] Root `npm test` is red on main: the comment guard false-positives on in-game "phase N of M" copy (digest, 2026-10-07) — CLOSED 2026-10-07 (6a41768c)
- category: tests
- impact: 7
- ease: 8
- detail: `scripts/check-comments.mjs`'s `phase-number` rule
  (`/\b[Pp]hases? (?:R?\d|[A-Z]\d)/`) exists to catch comments narrating
  build-plan history ("Phase R7c deleted..."). It also matches plain
  digits, so the doc comment landed by `67fc1541` (phase ledger fix,
  2026-10-07) — "so a narrow phone shows 'phase 1 of 5' as a row, never a
  column" in `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:244`
  — trips it: that "phase 1 of 5" is the combat screen's own on-screen
  copy, not a reference to a build-plan phase. Root `npm test` (one of
  the RC release gates, `plan/revamp/checkpoint.md` §"Gate") has been red
  on main since that commit; neither `axiomancer-mechanics` nor
  `axiomancer-mobile`'s own `verify` runs this root-level suite, so the
  shipping PR's gate stayed green and nobody caught it before merge.
- next: either reword the comment to avoid the literal phrase ("so a
  narrow phone shows the ledger as a row, never a column" reads the
  same without tripping the rule), or tighten the regex to require a
  phase-id shape (`R\d`, a bare capital-letter+digit, or a digit
  immediately after a capitalized "Phase") rather than any digit after
  "phase"/"Phase". Re-run `npm test` after either fix; it should also run the fix against the regex's own test file (`scripts/check-comments.test.mjs`) to confirm no existing case breaks.
- issue: #454
- resolution: reworded the `railLedgerStacks` doc comment ("so a narrow phone still
  reads the ledger as a row, never a column"); the guard's regex is unchanged
  so it still catches real phase narration. Root `npm test` 224/224.

### [x] [bug] Memoir chronicle reads the event buffer in the wrong order (R10c3, 2026-10-02) — CLOSED 2026-10-06 (09161ae7)
- category: bug
- impact: 5
- ease: 8
- detail: `state/store.ts` (~375) prepends each event to `_recentEvents`
  (newest first), but `buildChronicle` in
  `state/presenters/memoir.engine.ts` (~285) treats the buffer as
  oldest-first and reverses it. The live chronicle shows the 12 oldest of
  the 20 buffered events, oldest first, and the continent-change check walks
  backwards in time. The tests pass only because their fixtures are
  oldest-first. Found by the R10c3 comment sweep; the JSDoc now states the
  mismatch.
- next: drop the reverse (or make the buffer append), and add a test that
  feeds the buffer through the store's real handler.
- issue: #448
- resolution: `buildChronicle` walks a reversed copy of the newest-first
  buffer, then emits the newest 12 newest-first; fixtures use the store's
  order and a new test feeds events through the store's emitter handler.

### [x] [docs] Phase 44a deferred its `lexicon.json` registrations to the phases that actually rename each concept
- category: docs
- impact: 4
- ease: 8
- detail: filed 2026-08-09 by Phase 44a. The build-plan row and spec 34 §5.9
  item 2 both ask 44a to register the fifteen §5.2 renames, the six rank
  names, and the V-1 word list in `axiomancer-mechanics/docs/lexicon.json`
  right now, even though 44a ships ZERO renames. `scripts/check-lexicon.mjs`
  scans every live `.md` file outside `plan/` (except `bearings.md`) — about
  240 files — and every one of those existing rows was added at the commit
  that actually retired the concept from code, never earlier (see the four
  shipped rows' `since` dates). Registering now, while ~40 live docs
  (`axiomancer-mechanics/docs/philosophy.md`, `morality.md`,
  `keyword-atlas.md`, `card-frame-legend.md`, `combat.md`, `api.md`,
  `effects.md`, `gameloop.md`, `npcs.md`, `quickstart.md`, `testing.md`,
  `hazard-minigame.md`, `references/*`, `axiomancer-mechanics/CLAUDE.md`,
  `axiomancer-mechanics/README.md`, plus mobile docs and `.claude/`
  agent/skill prompts) still correctly describe the pre-retheme system,
  would force premature rewrites of accurate docs or blanket
  pragma-tagging dozens of files for a guard that protects nothing yet.
  **Fix:** each of 44b (the §5.2 keyword/system-term renames), 44c (the rank
  ladder), and 44g/44h (the broader V-1 prose vocabulary) adds its own
  `lexicon.json` rows in the same commit that performs its rename, and
  triages whatever `check-lexicon.mjs` then flags the normal way (fix
  wording / HISTORICAL banner / `<!-- lexicon-ok -->` pragma). See
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_44a_rename_infrastructure.md` "Decisions made upfront"
  for the full reasoning.
- update (verified via /oversight 2026-08-12): 44b and 44c followed the
  fix exactly — `lexicon.json` carries dated rows for all of R-1–R-14.
  44g explicitly documented a reasoned skip (no renames in scope, same
  reasoning as 44f). **44h shipped real renames (spec 10→GRACE, spec
  14→THE OATHS, the three alignment axes→CREED/AUGURY/TROTH,
  `src/Philosophy/`→`src/Ledger/`) and registered zero `lexicon.json`
  rows, with no documented rationale like 44f/44g gave.**
  `check-lexicon.mjs` still passes clean today only because no row
  exists to check the renamed terms against, and no live doc currently
  misuses the old names — so there's no active prose leak yet — but
  44h broke the registration discipline this row asked every renaming
  phase to follow, silently. Worth a follow-up /iterate pick: register
  44h's renames retroactively (or document why not, matching 44f/44g's
  pattern) before the next rename phase treats the gap as precedent.
- closed: moot (R10b2, 2026-10-02): the 44b/44c renamed concepts (CHARGE, PLEA, OATH, HEX and kin) were themselves deleted in the revamp; R10b2 registered them in `lexicon.json` as retired.

### [x] [tooling] The card editor's restored fields have no form controls
- category: tooling
- impact: 3
- ease: 5
- detail: filed 2026-08-27 by Phase 69. That phase made `theme`,
  `persistentEffect`, `paidSummary`, `intentionallyAsymmetric` and `glyph`
  survive an editor save, and the round-trip test holds them there. What it did
  NOT do is give them editing UI — they round-trip verbatim from the source
  literal. So a card's theme or paid line can only be changed by editing
  `cards.library.ts` by hand, which is a strange seam in a tool whose whole
  purpose is to avoid that.
- next: form controls for the four with obvious shapes (`theme` a select over
  `CARD_THEMES`, `paidSummary` and `persistentEffect` text areas,
  `intentionallyAsymmetric` a checkbox). `glyph` needs a design call first —
  it is a discriminated payload union with a cap, and no live card uses it.
- closed: moot (R10b2, 2026-10-02): the card editor was deleted in R1 (D56).

### [x] [debt] Phase R3b's purge commit shipped only its staged deletions (red main, 2026-09-29) — CLOSED 2026-09-29 (R3b follow-up commit)
- category: debt
- detail: filed by `/fix-ci` (run 36586564144). `25a6c5e7` carried only the
  `git rm` deletions: the tick staged and committed in one shell command
  whose message came from a file, the guard hook rejected the message-file
  flag and so blocked the whole command (staging included), and the retried
  inline commit took the index as it stood.
  The full tree had passed every gate locally (mechanics and mobile verify,
  root `npm test`, `lint:content`, `check-lexicon`) before the commit.
- **CLOSED 2026-09-29:** the follow-up commit stages the rest of R3b's tree
  (the consumer edits, the v28->v29 migration, the Anvils, the test tail
  across both packages). Lesson: stage and commit in separate commands, and
  check `git show --stat HEAD` before pushing.

### [x] [docs] Trim-the-fat spec names `.claude/agents/mechanics-expert.md` as a delete candidate, but four live skills spawn it (2026-09-25) — CLOSED 2026-09-28 (R0)
- **Found by:** T1 of `plan/2026-09-25-trim-the-fat.spec.md` (Tier 1 "Docs" list, last bullet: "Rewrite or delete").
- **Consumer the audit missed:** `skills/ship-a-phase.md:68,536`, `skills/iterate.md:245,399`, `skills/adjust-cards.md:216`, `skills/adjust-keywords.md:192` all name `mechanics-expert` as the design-second-opinion subagent. Deleting the agent file breaks those spawns.
- **Action taken:** kept (standing frame ¶1). Spec row stands corrected: this is a *rewrite* (its philosophy-theme / stance-proc doctrine is retired), not a delete. Rewrite is design work, out of T1 scope.
- **CLOSED 2026-09-28 (R0):** addressed by R0. D58 archived `mechanics-expert` with the stewards, and R0 repointed the skills that spawned it, so there is no live consumer left to break.

### [x] [contract] New-keyword wiring drifts silently across seven surfaces — CLOSED 2026-09-28 (R0)
- category: contract
- impact: 6
- ease: 6
- detail: filed 2026-08-22 by the content-pipelines audit. The two
  switches that matter (`combat.engine.ts` mech switch,
  `combat.cards.ts` mechanicText) carry explicit defaults so a new kind
  type-checks clean while inert; no assertNever exists in mechanics.
  Untested sync surfaces: glyph tables triplicated across mobile
  `glyphShapes.ts` / editor `CardFace.tsx` / `scripts/build-catalog.mjs`;
  the editor's independent `wx.ts` KEYWORDS vocabulary (still lists dead
  spec-32-v2 words); `axio_keywords` hand-parses `docs/keyword-atlas.md`
  and hardcodes "/30" (unlike axio_cards/axio_effects which auto-regen);
  mobile KW-2 iterates a hardcoded 17-kind array, not the union.
  card-expert's keyword checklist stops at mechanics (omits mobile
  gloss, CARD_EFFECT_SET, atlas, retheme-map.json, editor surfaces).
  Derive the lists, add drift tests, extend the checklist.
- next: /iterate
- **PARTIAL 2026-08-22 (same PR):** card-expert's wiring checklist
  extended to 12 steps covering every listed surface (with the
  silent-`default:` warning); the drift TESTS are queued as build-plan
  Phase 68.
- **CLOSED 2026-09-28 (R0):** moot. The loop no longer adds keywords (D37, D58); the card editor and its `wx.ts` vocabulary are deleted (D56); R7 deletes the carrier-less kinds the silent defaults guarded (D50). Keyword wiring is recorded for the card sessions in the B4 inventory (`plan/revamp/cards.md`).

### [x] [tests] No growth doctrine for pinned content counts [needs-user-call] — CLOSED 2026-09-28 (R0)
- category: tests
- impact: 6
- ease: 8
- detail: filed 2026-08-22 by the content-pipelines audit. Five
  hardcoded 57-card pins, `new-enemies.engine.test.ts`'s exactly-52
  roster, glossary pinned at 42, and `curated-library.engine.test.ts`
  pinning `addedIn === '2026-08-08'` for every card (a card added today
  fails the suite). Deliberateness gates are good, but nothing documents
  that bumping them is the expected part of a content add vs. forbidden
  tampering — the loop must edit the test that guards growth with no
  doctrine for when that is legitimate. Needs a one-line ruling (e.g. "a
  content add updates its pins in the same commit, citing this ruling"),
  then bake it into the add-a-card / add-an-enemy checklists.
- next: /oversight
- **RESOLVED 2026-08-22 (same PR):** THE PIPELINE LIBERATION ¶4 rules
  it exactly so — pins are growth ledgers, updated in the same commit
  citing the ruling; editing a pin with no content change stays
  forbidden. The `addedIn === '2026-08-08'` pin relaxed to
  ISO-date >= 2026-08-08 in `curated-library.engine.test.ts`; the
  doctrine is baked into card-expert's file map note.
- **CLOSED 2026-09-28 (R0):** moot. Resolved on 2026-08-22 as noted above, and the growth it governed is closed: the loop creates no content during the revamp (D58).

### [x] [docs] `skills/digest.md` §3b still reads baseline health against the win-rate doctrine curve Phase 43 retired — CLOSED 2026-09-28 (R0)
- category: docs
- impact: 5
- ease: 8
- detail: filed 2026-08-09 (digest). §3b instructs: "READ the new numbers
  against the locked doctrine curve (early ~80 / mid ~50 / late 25-35 /
  impossible 0, blind policy-pick): each band that moved gets a line in
  the Tuning proposals panel, and a doctrine violation ... gets a
  `plan/AUDIT.md` row." `46b5a5df` (phase 43, "objective function v2 — the
  Combat Quality Index", 2026-08-08) retired win rate as a grading term
  outright — "Win rate is not a term at all: the doctrine curve grades
  WHETHER a deck should win, CQI grades HOW the fight played, and a 0%-win
  cell scoring well is pinned as correct" — and the already-filed
  `plan/AUDIT.md` row "`/deck-tuning` and `/combat-playtest` still name
  `statusEngagement` as the objective function" flags the identical drift
  in those two skills. `skills/digest.md` was outside phase 43's file
  ownership (same as those two) and has the same problem: followed
  literally tonight, §3b would have filed a doctrine-violation row against
  early 54.5% / mid 8.3% / late 0% / impossible 0% — a live reading of a
  retired law. This digest read `combatQuality.index` instead (see the
  now-resolved CQI-baseline row above) and skipped the win-rate violation
  filing on that basis, but the skill text itself still says otherwise for
  next time.
- next: repoint §3b at `combatQuality.index` (spine/arc/width/identity
  weights, 0.40/0.25/0.20/0.15) once spec 35 or Phase 43's follow-up
  defines what "moved" or "violates" means for CQI — there is no CQI band
  yet to grade against, only the first stamped reading, so this may need a
  design ruling (what CQI range is "good") before the skill text can be
  rewritten, not just a search-and-replace of the metric name.
- **CLOSED 2026-09-28 (R0):** moot. The deck-matrix baseline and its nightly re-measure are retired until the retune (D57), and R0 drops CQI and the preset curve from `skills/digest.md`.

### [x] Three mobile source comments still name cards the Profane Canon deleted — CLOSED 2026-09-28 (R0)
- category: docs
- impact: 3
- ease: 9
- detail: filed 2026-08-08 by Phase 42's survey, scope-checked. Comments in
  `state/combat/store-actions.ts:69`, `state/actions.ts:775` and
  `state/selectors/combat-cards.ts:13` explain the starter path in terms of
  `slippery-slope` and `brace-for-impact`, neither of which exists in the
  library since `84ef85b`. **Live code is unaffected — these are comments
  only** (checked; no runtime reference survives). Same root as the
  `combat-sim` default-loadout row above, which IS a live defect.
- **CLOSED 2026-09-28 (R0):** moot as a standalone row. The purge replaced the whole library with the grey cards (D36); the surviving references to deleted ids (`state/selectors/combat-cards.ts:13` and the mobile test fixtures) are swept by R7's fixture rewrite and R8's mobile follow-through.

### [x] `dominantCardShare` is broken post-strike-death — CLOSED 2026-09-28 (R0)
- category: debt
- impact: 7
- ease: 5
- detail: filed 2026-08-08 by Phase 43. The raw attribution ledger's
  `dotDamage` is filled at SUMMARY time, so the ledger itself carries direct
  damage only and collapses onto whichever signature burst last — it reads
  ~100% on nearly every matrix cell. CQI's identity term routes around it
  (cards from the sim's per-line HP swing), so the new metric is unaffected,
  but the standalone stat is wrong wherever else it is read. Left untouched
  because other suites consume it; repair is separate work.
- **CLOSED 2026-09-28 (R0):** moot. The matrix it was read on is retired (D57) and the tooling reset (R1) removes the preset/policy readings; if the stat survives R1, it is dead code for R7 (D50).

### [x] `npm run combat-sim`'s default loadout no longer exists — CLOSED 2026-09-28 (R0)
- category: debt
- impact: 6
- ease: 9
- detail: filed 2026-08-08 by Phase 43. The default is
  `slippery-slope,brace-for-impact` — both cards deleted by the Profane Canon
  (`84ef85b`). Every default-invocation run therefore reports 0% win, 0%
  statusEngagement, cqi ~29%. Pre-existing rot, not caused by Phase 43, and
  outside its "surface the new metric additively" scope. Anyone reading a
  bare `combat-sim` run right now is reading noise.
- **CLOSED 2026-09-28 (R0):** moot as filed. Its readings (statusEngagement, CQI) measure retired law (D57); R7 rewrites every fixture that decks deleted cards onto the grey cards (D50), which covers this default.

### [x] The Surge meter is the least-used locked system, and most rolled dice never power a line — CLOSED 2026-09-28 (R0)
- category: divergence
- impact: 5
- ease: 3
- detail: filed 2026-08-08 by Phase 43's first CQI reading. Chain completion
  is 35% matrix-wide (the chain breaks ~2x for every surge), the lowest
  locked sub-score everywhere; `dice-spent` is 29% against a 0.5 reference.
  **Information, not work** — bearings' "the current card library is
  transitional" rule forbids tuning against it. Re-read after the redesign.
- **CLOSED 2026-09-28 (R0):** moot. The reading came from the CQI matrix over the purged library (D36, D57); it was information, not work, and the library it described no longer exists.

### [x] `/combat-playtest` still names `statusEngagement` as the objective function — HALF-RESOLVED via Phase 66 (2026-08-27) — CLOSED 2026-09-28 (R0)
- category: docs
- impact: 6
- ease: 9
- detail: filed 2026-08-08 by Phase 43. The skill files in `skills/` and
  `.claude/commands/` were outside that phase's ownership. They should be
  repointed at `cqi` / spec 35, or the next tuning pass will optimise the
  dead law the phase exists to retire.
- update 2026-08-27 (Phase 66): `.claude/commands/deck-tuning.md` was
  already reconciled (its §North star reads "CQI (spec 35), not the
  retired status-dominance law"). `.claude/commands/combat-playtest.md`
  was not, and Phase 66's `status-primacy-doctrine` row flagged it: its
  north-star section is now repointed at CQI and its "low status-effect
  engagement is a balance failure" closing line replaced. What remains
  open is the §Purpose comparison table's question cell ("Is status play
  the FUN path at every stage?") and the skill's own one-line description
  in the harness registry — same claim, but a rewrite there changes what
  the skill IS FOR, which wants a design call rather than a lint fix.
- **CLOSED 2026-09-28 (R0):** addressed by R0. `.claude/commands/combat-playtest.md` is rewritten around the S3 questions (stat growth against the stage curve, survivors winnable or at risk); status primacy, presets and CQI are gone from it.

### [x] Dead id-keyed engine hooks survive the retired spec-32 library — CLOSED 2026-09-28 (R0)
- category: debt
- impact: 5
- ease: 6
- detail: filed 2026-08-08 by Phase 42. Engine hooks still keyed to
  `achilles-and-the-tortoise`, `the-closing-word`, `circular-reasoning` —
  cards the Profane Canon (`84ef85b`) deleted. Dead, and now actively
  misleading: Phase 44c's build-plan row cites those same ids as its scope.
  Related stale registry rows: `SYSTEM_TERM_COVERED_BY` names a nonexistent
  `CLARITY` keyword, and mobile fixtures still deck `slippery-slope` /
  `straw-mans-jab`.
- **CLOSED 2026-09-28 (R0):** moot. R7 (the engine purge, D50) deletes every carrier-less mechanic, its handlers and its stale id-keyed comments; the mobile fixtures follow in R8.

### [x] Playtest harness has no victory-only rounds-to-victory metric — CLOSED 2026-09-28 (R0)
- category: gap
- impact: 4
- ease: 7
- detail: surfaced 2026-07-17 by the ultracode price-vs-win-rate
  playtest. `CombatSimStats.avgRounds`
  (src/Combat/combat.encounter.sim.ts) averages `state.round` over ALL
  outcomes (defeats + retreats included), so there is no way to answer
  "how many rounds to WIN" — the owner asked exactly that and it forced
  a bespoke harness
  (axiomancer-mechanics/scratch/price-experiment/price-winrate.harness.ts)
  that re-derives it from per-run `runOneEncounter` returns. The raw
  `rounds`+`outcome` already exist per run; they are just discarded at
  aggregation. Add `avgRoundsToVictory` (victory-only, null when ~0
  victories) to `CombatSimStats` + the stage summary so kill-speed is a
  first-class witness for /deck-tuning. Related: the "Doctrine-curve
  check in the nightly baseline" candidate (PHASE_CANDIDATES.md) would
  absorb this harness's per-stage cells — this is the engine-side metric
  that check depends on. (The other residue of this session — the
  mid-collapse quartet foundry/standstill/grace/augury ≈0% mid, and the
  tempo/alt-win pricing conclusions — is already tracked there and in
  Phases 36a/36b, so it is not re-filed here.)
- next: /iterate (retain victory-only rounds in
  simulateHazardPatternCombatDetailed; surface in PlaytestStageSummary +
  the report formatter)
- **CLOSED 2026-09-28 (R0):** moot. It served `/deck-tuning` (retired in T5) and the preset doctrine curve (retired with the presets, D36, and the baseline, D57); the retune can file a fresh row if it needs kill speed.

### [x] [tests] No Playwright journey walked a map node to node — RESOLVED 2026-09-26
- filed 2026-09-26 (M3a residue; an attended session had walked the
  Breakwater with a throwaway script). `axiomancer-mobile/scripts/
  map-walk-e2e.mjs` (`npm run e2e:map-walk`) now plays a new game node to
  node: the windmill arrival scene, the first relic, the bw-5 cache, the bw-4
  gathering, the bw-6 fight on the black scene played to its end (a defeat
  restarts the run at the windmill), and lands on the bw-3 hazard intro
  (playing the board stays `hazard-e2e.mjs`'s). It runs in `verify-mobile`
  with the encounter suite, which `src/World/**` and the map layouts already
  select. Moved here per D9.

### [x] T's calls on the Breakwater and the Charcoal Wood — RESOLVED 2026-09-26
- filed 2026-09-26 (M3a and M3b residue): the Breakwater's five agent calls
  (no boss; the windmill rest start; no combat plate; the "breakwater" name
  overlap; no NPCs) and fishing-village's difficulty order. Answered by T as
  D30–D35 and applied to all three built maps in #394: one elite per region
  on its last fight column; an arrival-scene start; plain black combat; the
  King rises from the harbour wall; the Breakwater's people via a story-spec
  session (new Pending row); fishing-village retuned after M3d (build-plan
  row M3e). Moved here per D9.

### [x] Map revamp owner ballot — four calls before M1 — RESOLVED 2026-09-25
- filed 2026-09-25 (T5 residue). Answered by T in the kickoff session as
  D21–D24 (four new Act 1 maps; plain 2× resize; coast → forest → mountains
  → underworld; the underworld's vault door, open on arrival), plus D25 (a
  node on every landmark). Moved here per D9.

### [x] `RELEASES.md` and `CHANGELOG.md` describe the retired `healFraction` as current — RESOLVED by archiving
- filed 2026-08-08 by Phase 52b (docs, impact 2, ease 9). Both logs are now
  archived with a HISTORICAL banner: `RELEASES.md` in trim T1,
  `CHANGELOG.md` in trim T5 (2026-09-25,
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/CHANGELOG.md`). No
  live file describes `healFraction` as current.

### [x] [3.2] `CardSpecialMechanic` deprecated-name not exported — stale/resolved
- drained 2026-07-14 via scheduled oversight: current `main` exports
  `CardSpecialMechanic` from both `axiomancer-mechanics/src/Cards/index.ts`
  and the package barrel `axiomancer-mechanics/src/index.ts`. The root
  three-workspace `npm run verify` gate passed at `96421aa8`, confirming
  the preferred import is live for package consumers.

### [x] [world] Map-event content has no coverage guard against unreachable authoring — RESOLVED via Phase 53a
- source: first-map audit 2026-08-08 (finding F5). `fv-1` carried a fully
  authored encounter pool that no player could ever see, because map events
  fire on ARRIVAL and `createMapState` places the player ON the start node.
  It sat there undetected across at least two content passes, and the
  all-25-nodes pool test passed the whole time — it drives `resolveMapEvent`
  at each node id directly, which proves the pool is REGISTERED, not that a
  player can reach it.
- the general defect: nothing asserts that authored content is reachable by
  legal play. `auditMapTraversal` (shipped in the same pass) now walks every
  legal route and could answer this — a test that intersects "nodes any route
  can visit" with "nodes carrying a pool" would have caught fv-1 immediately,
  and would catch the next one.
- scored low-ease/high-impact: the walker exists, so this is one test file.
  Left unfiled as a fix only because the audit pass had already closed the
  live instance and adding a second invariant belonged in its own tick.
- resolved 2026-08-16 via Phase 53a: the same defect, widened from node
  topology to NPC dialogue. `auditNarrativeReachability` (`src/World/
  narrative-reachability.ts`) cross-checks every `interaction` node's
  `npcName` against its map's roster and flags rostered NPCs no node routes
  to; a registry-wide hermetic test
  (`src/World/e2e/narrative-reachability.engine.test.ts`) asserts the
  invariant holds across `MAP_REGISTRY`. The narrative-encounter audit
  (2026-08-09) found this had already claimed eleven of fourteen authored
  dialogue trees on the coastal maps — `nf-7` named a nonexistent 'Forest
  Hermit' instead of the rostered 'Hermit Sage', and `nf-14`/`nf-23` named
  scenery ('Ancient Stone Marker', 'Echo Stone') as if they were people.
  All three are fixed; `fv-19` stays a declared exception until Phase 53c
  reclaims it. `MapDefinition.unstagedNpcs` lets a map declare an NPC as
  deliberately not-yet-placed (with a reason) so the guard can tell that
  apart from a lost NPC.

### [x] fishing-village CLI + spec08 e2e drive legacy combat — RESOLVED (mislabeled header fixed via /oversight 2026-08-12)
- drained 2026-07-03 (monorepo cleanup): stale — the legacy
  `resolveCombatRound` no longer exists anywhere in
  `axiomancer-mechanics/src`; no fv-15/spec08 script remains in
  package.json. The finding predated the resolver removal.

### [x] Hazard v2 engine ownership (DIV-MECH-002) — RESOLVED (mislabeled header fixed via /oversight 2026-08-12)
- resolved via `/oversight` 2026-07-03: mechanics absorbs
  mobile's duplicate `state/hazard/` engine. Promoted to
  `plan/PHASE_CANDIDATES.md` -> build plan Phase 13, shipped
  (re-verified live via /oversight 2026-08-12: `01_build_plan.md`
  Phase 13 is `[x]`, mobile's local hazard engine is gone).

### [x] [2.0] `combatMana` slice deprecated but still load-bearing — RESOLVED (mislabeled header fixed via /oversight 2026-08-12)
- drained 2026-07-08 (build-plan Phase 7): stale — the slice was
  actually retired by mobile commit `6ef5f989` (2026-06-20,
  "remove the vestigial client mana model") and its container
  (`state.combat`) fully removed by `160ae907`/mechanics `4cb504a5`
  (2026-06-30/07-01). "Phase 156" was never the migration (that
  number is the unrelated status-effect interaction engine); the
  audit row was carried into the monorepo re-onboard without being
  re-validated against code that had already changed nine days
  earlier. No live `combatMana` reference remained; Phase 7 deleted
  the one dead type (`CombatManaState`) and fixed four stale
  comments still narrating the retired slice.
