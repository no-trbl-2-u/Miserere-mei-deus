---
date: 2026-11-10
---
## Edit plan/README.md
~~~ old
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
~~~
~~~ new
| # | Initiative | Spec | Status | Progress |
|---|---|---|---|---|
| 170 | Chapter 1's unmeasured numbers | [170-ms1-chapter1-unmeasured.md](170-ms1-chapter1-unmeasured.md) | planned | 2 left |
~~~

## Add plan/169-dl3-merged-pr-items.md
~~~ section Design
### The queue fills and ticks itself (T, `/plot`, 2026-11-10)

T asked how the deadline queue stays current by itself. Two parts of it can, from records the repo already holds.

- **Held rows are acts already.** Every line under **Held** in `plan/README.md` is a chunk only T can do, with an alias. The reminder and `LIVE_DEADLINES.md` list each open Held chunk as an act without anyone copying it into `plan/deadlines.md`: its name is the chunk's title, its hours are an `(N h)` in that title when it has one, and it ticks when the chunk ships. A Held chunk an Item already names in `Rows` appears once, as that Item. A Held chunk no Item names is placed after the hand-written acts of the first milestone and marked "from the build plan", so T sees it and can give it a place by writing an Item.
- **An act may carry a proof.** An Item's `Rows` cell may hold `T: <proof>`, where the proof is one of: `pr #N` (that pull request merged, read from the checkout's history as 169.1 does), `spec <alias family>` (a spec whose chunks carry that alias family exists, for a pitch-and-plot act), or `file <path>` (that path exists, for an image T picks). `node scripts/deadlines.mjs --write` ticks an act whose proof holds; the lint fails an act that is ticked while its proof does not hold, and a proof it cannot parse. A plain `T` stays hand-ticked.
- **What stays by hand.** A review, a play session and a decision leave no record, so their acts keep a plain `T`. The reminder says how many open acts are hand-ticked.
~~~
~~~ acceptance
- **A?held** An open Held chunk that no Item names appears in the reminder and in `LIVE_DEADLINES.md` as an act marked "from the build plan", counts in the forecast with the hours its title states (or under "no hours"), and leaves both when it ships. One an Item names appears once.
- **A?proof** An Item whose `Rows` is `T: pr #N`, `T: spec <family>` or `T: file <path>` is ticked by `--write` when the proof holds; the lint fails a ticked act whose proof does not hold and an unreadable proof; a plain `T` is untouched.
- **A?hand** The reminder states the number of open acts that only a hand can tick.
~~~
~~~ chunks
- [ ] **169.?held** Held chunks join the queue by themselves · M · closes A?held, A?hand · needs — · alias: DL3b
  - `scripts/deadlines-lib.mjs`: `queuePlan` takes the open Held chunks (`parseHeld`, already there) and adds the ones no Item names as acts of the first milestone, after the written ones.
  - The reminder and the live file mark them, and print the hand-ticked count.
  - `scripts/deadlines-queue.test.mjs`: a Held chunk with and without an Item, with and without hours, shipped and open.
  - `CLAUDE.md`, `AGENTS.md` and `skills/plot.md` 7.2: a plot no longer copies a Held chunk into the queue unless T wants it placed.
  - Measure: the new tests pass; the live reminder, quoted in the PR body, lists today's Held chunks that no Item names.
- [ ] **169.?proof** An act may carry a proof that ticks it · M · closes A?proof · needs 169.1 · alias: DL3c
  - `scripts/deadlines-lib.mjs`: parse `T: <proof>` in `Rows`; `derivedStatus` and `rewriteItemStatus` use it. The `pr` proof shares 169.1's reader of commit subjects.
  - `scripts/check-deadlines.mjs`: the two failures of A?proof.
  - Tests with fixture subjects, fixture specs and a scratch file; no network.
  - `plan/deadlines.md`: give each act that has one its proof (the pitch-and-plot acts, the travel images), in the same PR.
  - Measure: the tests pass; the PR body lists each act that gained a proof.
~~~
