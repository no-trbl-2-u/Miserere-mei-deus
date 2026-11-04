# 148 — Plots settle again, and wide PRs get a full review

> Merged plots reach the roadmap, so `/next` and `/pilot` can pick specs 140 onward without naming ids, and a PR over 100 files is reviewed across all of them.

## Why

### Sources

- T, 2026-11-04, attended: "Do it", to running these as a `/bug`. Diagnosed by reading the code and the run logs, `/bug plot` mode.
- Run 41762242553 of `pr-resolve.yml` (the settle log), and the review verdicts on #1350.

### The first bug: plots stopped settling on 2026-11-01

- **Symptom.** `plan/README.md` was last settled by `8d22612cb` on 2026-11-01. `plan/pending/` on main holds 61 files, and specs 140 to 148 aren't in the roadmap table, so `pilot-waves` calls them "not in the roadmap table".
- **Root cause.** `pr-resolve.yml`'s scan runs on every push and calls `settleMain` (`scripts/pr-settle.mjs`), which runs the kit's settle. Settle skips each pending file carrying a footgun ("no identity/footguns.md to settle its footguns into"). `identity/` holds no `footguns.md`; Miserere keeps its list in `plan/reflexes.md`. Settle then exits 2, and `pr-settle.mjs:147` refuses the whole settle, so one such file holds back all of them. The workflow still reports success, so nobody sees it.
- **Second-order damage.** The log also shows `Edit plan/README.md: the old text isn't there`, so some pending edits have gone stale while waiting. Expect more, and expect cross-references among 61 files.
- **Siblings.** Any other refusal reason in `pr-settle.mjs` is equally silent on a green run.

### The second bug: wide PRs lose review coverage

- **Symptom.** #1350 touched 184 files, and the automatic partition gave `axiomancer-mobile` zero readers. The reviewer noticed and added them by hand; nothing guarantees that next time.
- **Root cause.** `changedFromPr` in `scripts/pr-partition.mjs` reads `gh pr view --json files`, which stops at 100 files, and it doesn't fail.
- **Siblings.** Any other script that reads a PR's files that way.

## Design

**Settle.** Give settle a footgun list to write to, so that every pending file can settle: the smallest route the kit allows, either adopting `identity/footguns.md` with `plan/reflexes.md`'s open lines or pointing settle at `plan/reflexes.md` through `plan/nexus.lock` configuration or `docs/nexus-deviations.md`. Editing the kit's own `scripts/plan/settle.mjs` is the last resort, since the weekly sync would overwrite it. Then settle the backlog once, re-quoting stale edits by hand against main. Make a refused settle visible: a failed step or a `plan/NEEDS_T.md` row, not a green run.

**Partition.** Read the full list, by paginating `gh api repos/{repo}/pulls/{n}/files` so that additions and deletions survive, and fail loudly if the count disagrees with the PR's `changed_files`.

### Decisions made upfront (do not ask)

- No pending file is deleted to get the settle through: each folds in, or is named in the PR with why it could not.
- A settle that refuses goes visibly red from now on (T, "Do it", on the finding that the run reports success).

### Out of scope

- Any change to a spec's content while re-quoting stale edits.
- The loop's `march` and `night` schedule.

## Acceptance

- **A1** A pending file carrying a footgun settles, and its footgun lands in the project's footgun list, with a test.
- **A2** The backlog is settled: `plan/pending/` on main holds only what open work needs, specs 140 onward are in the roadmap table, and plan-check and check-deadlines are green.
- **A3** A refused settle fails visibly, with a test on the refusal path.
- **A4** `pr-partition.mjs` covers every file of a PR over 100 files, with a test that fails on today's truncation, and any sibling script is fixed or named.

## Open questions

None.

## Chunks

Measure: 4 open · 0 closed · next A5

- [ ] **148.1** Review coverage reaches every file of a wide PR · S · closes A4 · needs — · alias: TL1a
- [ ] **148.2** A pending file with a footgun settles, and a refused settle shows · M · closes A1, A3 · needs — · alias: TL1b
- [ ] **148.3** The settle backlog folds in · M · closes A2 · needs 148.2 · alias: TL1c

### 148.1 (TL1a) — Review coverage reaches every file of a wide PR · S · closes A4 · requires —

- `changedFromPr` in `scripts/pr-partition.mjs`, and its siblings (`git grep -E "json [a-zA-Z,]*files" -- scripts .github`). Red test first.
- Measure: the partition's manifest for #1350 (184 files) includes `axiomancer-mobile`, and root `npm test` passes in CI.

### 148.2 (TL1b) — A pending file with a footgun settles, and a refused settle shows · M · closes A1, A3 · requires —

- Read `scripts/plan/settle.mjs`, `scripts/pr-settle.mjs`, `scripts/pr-resolve.mjs`, `.github/workflows/pr-resolve.yml`, `plan/nexus.lock`, `docs/nexus-deviations.md` and `plan/reflexes.md`. Run settle `--dry-run` only.
- Measure: `node scripts/pr-settle.mjs --dry-run` skips no file for want of a footgun list; a test covers the visible refusal.

### 148.3 (TL1c) — The settle backlog folds in · M · closes A2 · requires 148.2

- Run when the fix is on main, with no other plot merging (`skills/pilot.md` hard rule 7). A stale edit is re-quoted against main in a follow-up pending file, never by rewriting history. Name every file that needed a hand.
- Measure: `node scripts/plan/order.mjs --ref origin/main` lists specs 140 onward without `--mark`, and `node scripts/pilot-waves.mjs 146` no longer says "not in the roadmap table".
