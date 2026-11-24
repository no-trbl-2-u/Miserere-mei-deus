# 189 — A passing review's MED findings go to the audit queue, not onto the PR

> When the review passes a PR, it merges as it is. Its MED findings are filed as rows in `plan/AUDIT.md` after the merge, and `/iterate` fixes them later in their own PR. Nobody pushes fixes for them onto the passed PR.

## Why

### Sources

- **T, 2026-11-24:** "can we just stop the follow up agent from doing work on the findings if it's only medium? If we do what you're suggesting, then PRs could be held indefinitely if they keep finding medium findings." Then, asked whether MEDs should still be recorded: "File MEDs to AUDIT".
- **What happened, 2026-11-24:** #1741 and #1742 each got a `pass` verdict that listed MED findings. The session watching each PR pushed fixes, but the merge job had already merged the PR at the reviewed head, so each fix needed a follow-up PR (#1742, #1744). In #1742 the follow-up removed a tap that the next review then showed was needed, so chasing MEDs on a passed PR also added a bug.

### What exists today (read 2026-11-24)

- **The reviewer** (`skills/review.md`) posts inline MED/HIGH findings and one `## Review verdict` comment whose table lists every finding with its severity. The verdict is `not-pass` only when a HIGH stands.
- **The merge job** (`.github/workflows/pr-review.yml` `merge`, `scripts/pr-merge.mjs mergeWanted`) merges a non-plan PR on `pass` (D95), whatever MEDs it lists.
- **The fixer** (`skills/review-fix.md`, the `fix` job, `scripts/pr-review.mjs fixWanted`) runs only on `not-pass`, and fixes HIGHs. It already ignores MEDs on a pass.
- **The gap:** no written rule stops a session or tick that watches its own PR from pushing for MEDs on a `pass`. The generic PR-watching guidance says to address review findings, and nothing records a passed PR's MEDs once it merges, so they are lost unless someone pushes.
- **`plan/AUDIT.md`** is `/iterate`'s queue: `### [ ] [<category>] <title>` rows with `category`, `impact`, `ease`, `detail` and `next` lines under `## Pending`. It already has its own merge driver.

## Design

- **The rule (189.1).** A `pass` verdict is final for that PR. No agent pushes to a passed PR for its MED or LOW findings: not a loop tick, not a session watching the PR, not `review-fix`. Written where the agents read it: `AGENTS.md` (the PR rules), `skills/march.lanes.md` (the adversarial review notes) and `skills/review-fix.md` (one line saying a pass is never its input). A HIGH still makes `not-pass` and the fixer still runs. A HIGH or MED that the owner wants fixed before merge is the owner's to hold with a hold label, as today.
- **The filing (189.2).** After the `merge` job merges a PR on `pass`, a new step reads the merged verdict comment's findings table. It appends one `plan/AUDIT.md` row under `## Pending` for each MED row and commits it to `main` with the job's token, the same way the settle step already writes plan files on `main`. Each row has:
  - **title:** the finding, cut to one line, plus `(PR #<n> review, <date>)`;
  - **category:** the first tag in the finding's brackets, mapped to an AUDIT category (`tests`, `logic` → `finding`, `control` → `process`, `seams` → `debt`), and `finding` when no tag maps;
  - **impact** 5 and **ease** 5, the same default every AUDIT row starts from;
  - **detail:** the `file:line` and the finding's full text, with a link to the verdict comment;
  - **next:** "`/iterate`: verify the finding on `main`, fix it or close it as not reproduced".

  LOW rows are not filed. A PR whose verdict lists no MED files nothing. A row whose `file:line` and text already sit in `plan/AUDIT.md` is not filed twice.
- **Nothing is held.** The merge does not wait on the filing. A filing that fails logs a warning in the job summary and never turns the merge red, because the PR is already merged.

### Decisions made upfront (do not ask)

- LOW findings are not filed (T's answer named MEDs).
- `/iterate` picks the rows by its usual score; filed MEDs get no extra weight.
- The filing is code in the merge job, not a model run, so it costs nothing and runs every time.

### Out of scope

- Changing what the reviewer calls MED or HIGH.
- Holding a PR on MED findings (T ruled it out: a PR could be held forever).
- Back-filing MEDs from PRs merged before this ships (#1741's and #1742's are already answered by #1744).

## Acceptance

- **A2** After the merge job merges a PR on `pass`, each MED row of that verdict's findings table becomes one `## Pending` row in `plan/AUDIT.md` on `main`, with its title, category, impact 5, ease 5, its `file:line`, the finding text, a link to the verdict and the `/iterate` next line. A test feeds a verdict comment with HIGH, MED and LOW rows to the parser and gets exactly the MED rows.
- **A3** A verdict with no MED files nothing; a MED already filed is not filed again; LOW rows are never filed. Each is a test case.
- **A4** A failed filing (a push rejected twice, an unparsable table) logs to the job summary and leaves the merge job green. A test pins that the filing step cannot fail the job.

## Open questions

none

## Chunks

Measure: 3 open · 1 closed · next A5

- [ ] **189.2** The merge job files a passed PR's MED findings to plan/AUDIT.md · M · closes A2, A3, A4 · needs — · alias: RQ1b
