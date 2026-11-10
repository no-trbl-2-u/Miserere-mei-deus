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
- `LIVE_DEADLINES.md` and the reminder are unchanged; they read the table the lint now keeps honest.

### Out of scope

- Items that are done but name no pull request (a pitch held, an image found, a review made). Nothing in the repo records those acts.
- Pull requests closed without merging.

## Acceptance

- **A1** With an open Item naming `PR #N` and a commit subject on `main` that merged `#N` (merge or squash form), `scripts/check-deadlines.mjs` exits non-zero and its message names the Item's due date, `#N` and the commit.
- **A2** The same Item ticked `[x]`, or an open Item naming a pull request with no merge in the history, passes. A checkout without git history passes.
- **A3** The check's test runs with no network and no dependence on this repo's own history (fixture subjects only), inside the root `npm test`.

## Open questions

1. **[T to confirm #1]** Should every open Item naming a merged pull request fail? Default: yes. Or: only Items whose text starts with "Merge PR".

## Chunks

Measure: 3 open · 0 closed · next A4

- [ ] **169.1** The deadline lint fails an open Item naming a merged pull request · S · closes A1, A2, A3 · needs — · alias: DL3a
  - `scripts/deadlines-lib.mjs`: a pure `mergedPrItems(items, subjects)` returning one failure per open Item naming a merged `PR #N`; both subject forms matched, `#14` never matching `#1409`.
  - `scripts/check-deadlines.mjs`: reads the subjects with `git log --format=%s` (`origin/main`, else `HEAD`; an error reads as an empty list) and adds the failures to its report.
  - `scripts/check-deadlines.test.mjs`: fixture cases for A1-A3, including the prefix case and the no-git case.
  - `CLAUDE.md` and `AGENTS.md`, Deadlines: one clause adding this to what the lint fails on.
  - Measure: the test's new cases pass; `node scripts/check-deadlines.mjs` is clean on `main`; the PR shows the failure message produced by re-opening the #1409 Item in a scratch copy.
