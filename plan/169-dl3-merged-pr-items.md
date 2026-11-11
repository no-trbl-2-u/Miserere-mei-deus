# 169 — An open deadline Item that names a merged pull request fails the lint

> A deadline Item that asks T to merge a pull request stays open after the pull request merges, because a `T` Item is only ever ticked by hand. This spec makes `scripts/check-deadlines.mjs` fail on it, so the reminder stops leading every session with work that is done.

## Why

### Sources

- **T, 2026-11-10:** asked for this lint (`/plot the lint`) after a delivery audit of the repo's raw records showed the case below, and said "There are other deadline items that might be done."
- **The case (read 2026-11-10, at 697e2f80):** the Item "Merge PR #1409, the six Breakwater enemy frame sets ... `main`'s verify-mobile is red until spec 157's EN3c lands, and every open PR is gated behind it" was due 2026-11-07. PR #1409 merged 2026-11-07T00:36Z (`git log origin/main --grep 'Merge pull request #1409'`), EN3c closed the same day (`plan/ARCHIVE.md`, 157.3, #1437), and `verify-mobile` on `main` went green at 00:53Z. The Item stayed `[ ]` until 2026-11-10 and led every session's DEADLINE REMINDER as overdue, with a blocker that no longer existed.
- **`CLAUDE.md`, Deadlines:** "It cannot see an Item whose premise is gone". This is one premise the lint can see offline.

### What exists today

- **`scripts/check-deadlines.mjs`** (in the root `npm test`): fails on an Item naming a missing row, a date outside its window, a stale phase Status, a loop row in an Item's `Rows`. It reads `plan/deadlines.md` and the build plan only. It never reads git history.
- **`scripts/deadlines-lib.mjs`:** parses the Items table (Status, Due, Item, Rows, Waits on).
- **A `T` or `needs plot` Item's Status** is set by hand and by nothing else.
- **Merged pull requests on `main`:** a merge commit's subject is `Merge pull request #N from ...`; a squash merge's subject ends `(#N)`.

## Design

- **The rule.** An Item whose Status is open and whose Item text names `PR #N` fails when the checkout's history of `main` holds a commit that merged `#N`. The message names the Item's due date, the pull request and the merge commit, and says to tick the Item or rewrite it.
- **The source is the checkout, never the network.** A pure function takes the parsed Items and a list of commit subjects and returns the failures. The command feeds it `git log --format=%s` of `origin/main` when that ref exists, else `HEAD`. The test feeds it fixture subjects, so the root `npm test` stays hermetic.
- **Not found means no failure.** A shallow checkout that does not reach the merge, or a checkout with no git at all, passes: the lint never guesses.
- **Only merges.** A pull request closed without merging leaves no commit, so the lint cannot see it offline and does not try.
- **[T to confirm #1]** Every open Item that names a merged `PR #N` fails, whatever its verb. An Item that should stay open after the merge (for example "review what PR #N shipped") is rewritten to drop the number.

### Decisions made upfront (do not ask)

- No GitHub API call, in the lint or its test.
- No automatic tick: the lint fails and a person or a session ticks the Item, as today.
- This spec changes neither `LIVE_DEADLINES.md` nor the reminder (the queue rewrite of 2026-11-10 gave them their shape); they read the table the lint keeps honest.

### Out of scope

- Items that are done but name no pull request (a pitch held, an image found, a review made). Nothing in the repo records those acts.
- Pull requests closed without merging.

### The queue fills and ticks itself (T, `/plot`, 2026-11-10)

T asked how the deadline queue stays current by itself. Two parts of it can, from records the repo already holds.

- **Held rows are acts already.** Every line under **Held** in `plan/README.md` is a chunk only T can do, with an alias. The reminder and `LIVE_DEADLINES.md` list each open Held chunk as an act without anyone copying it into `plan/deadlines.md`: its name is the chunk's title, its hours are an `(N h)` in that title when it has one, and it ticks when the chunk ships. A Held chunk an Item already names in `Rows` appears once, as that Item. A Held chunk no Item names is placed after the hand-written acts of the first milestone and marked "from the build plan", so T sees it and can give it a place by writing an Item.
- **An act may carry a proof.** An Item's `Rows` cell may hold `T: <proof>`, where the proof is one of: `pr #N` (that pull request merged, read from the checkout's history as 169.1 does), `spec <alias family>` (a spec whose chunks carry that alias family exists, for a pitch-and-plot act), or `file <path>` (that path exists, for an image T picks). `node scripts/deadlines.mjs --write` ticks an act whose proof holds; the lint fails an act that is ticked while its proof does not hold, and a proof it cannot parse. A plain `T` stays hand-ticked.
- **What stays by hand.** A review, a play session and a decision leave no record, so their acts keep a plain `T`. The reminder says how many open acts are hand-ticked.

## Acceptance

- **A4** An open Held chunk that no Item names appears in the reminder and in `LIVE_DEADLINES.md` as an act marked "from the build plan", counts in the forecast with the hours its title states (or under "no hours"), and leaves both when it ships. One an Item names appears once.
- **A6** The reminder states the number of open acts that only a hand can tick.

## Open questions

1. **[T to confirm #1]** Should every open Item naming a merged pull request fail? Default: yes. Or: only Items whose text starts with "Merge PR".

## Chunks

Measure: 2 open · 4 closed · next A7

- [ ] **169.2** Held chunks join the queue by themselves · M · closes A4, A6 · needs — · alias: DL3b
  - `scripts/deadlines-lib.mjs`: `queuePlan` takes the open Held chunks (`parseHeld`, already there) and adds the ones no Item names as acts of the first milestone, after the written ones.
  - The reminder and the live file mark them, and print the hand-ticked count.
  - `scripts/deadlines-queue.test.mjs`: a Held chunk with and without an Item, with and without hours, shipped and open.
  - `CLAUDE.md`, `AGENTS.md` and `skills/plot.md` 7.2: a plot no longer copies a Held chunk into the queue unless T wants it placed.
  - Measure: the new tests pass; the live reminder, quoted in the PR body, lists today's Held chunks that no Item names.
