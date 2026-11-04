# 149 — The fix-ups left by specs 147 and 148

> The review pipeline holds a change to its own file reader and reads every PR whole, settle holds back only the file that would empty a spec, the memoir tooltip says only what its entry holds, and an item waiting on the reward screen survives an app close.

## Why

### Sources

- T, 2026-11-04, attended, at the end gate of `/pilot 147 148`: "/plot asap, one spec" for the fix-ups, and "Hold back only that file" for the settle refusal.
- T merged #1366 and #1368 before their review fixes landed; the reviews of #1366, #1368, #1369 and #1370 name what is left.

### What exists today (read 2026-11-04, at 704f1a0f8)

- `scripts/pr-policy.mjs`: `PIPELINE_PATHS` lacks `scripts/pr-files.mjs`, so a PR that changes the file reader the review relies on is not held as pipeline. `pr-partition.mjs` and `pr-review.mjs` read the files and the head in separate calls, so a push between them can pair a file list with the wrong head.
- Kept, uncommitted, in `.claude/worktrees/agent-a5446395c026ba65f` (branch `loop/next-148.1b`): `pr-files.mjs` gains `prSnapshot` (head, files, head again; bounded retry), used by `pr-partition.mjs` (`changedFromPr`) and `pr-review.mjs` (`fixView`), plus `pr-risk.mjs` edits and the `PIPELINE_PATHS` line. No tests yet, and `skills/review.md:64` still describes the old read.
- Still reading `--json files`, which stops at 100 without failing: `scripts/pr-merge.mjs:404,408` (the merge decision), `scripts/pr-risk.mjs:227` (`--replay`'s `pr list`), `scripts/plan/triage-match.mjs:128`.
- `scripts/plan/settle.mjs:1151`: when settling a pending file leaves a spec with no chunk, settle refuses the whole run and asks for a hand absorb (#1375 was one). Footgun `settle-order-false-empty`: a spec can read empty mid-run and refill later in the same run. `scripts/pr-settle.mjs` prints a raw stack trace for `--ref` without `--dry-run`, and its red path (the visible `::error::`) has no CLI test.
- Kept as local commit `0bf8b5085` in `.claude/worktrees/agent-a1bd792588a70c5ba`: `state/presenters/tooltip.engine.ts` names only what the `combat:ended` entry holds, a tooltip test over real memoir entries, and `app/__tests__/dialogue.screen.test.tsx`. Full verify not re-run.
- `axiomancer-mobile/state/item-reward/relic-sources.ts:28,63`: `carriedCovers` counts carried queue entries by item id only, so a quest reward and an elite drop of the same id can read as covered by one entry and one offer is lost. #1370's two tests for it could not fail.

## Design

**Pipeline.** Finish the kept edits: `prSnapshot` everywhere a PR's files and head are read together, `pr-files.mjs` in `PIPELINE_PATHS`, the `skills/review.md` line, and tests that fail on a moved head and on a 101-file PR. Then move the three remaining readers onto `prFiles` (`triage-match` reads per PR, only for PRs with pending files).

**Settle.** When a pending file would leave a spec with no chunk, judged on the run's end state, settle holds back that file alone, settles the rest, and says which file and why. The held file waits for the hand absorb; nothing else stalls. `--ref` without `--dry-run` fails with one plain line.

**Text.** Land `0bf8b5085` after both verify gates.

**Rewards.** `carriedCovers` counts per source as well as per id, with tests that fail on today's code. **A5, corrected (T, 2026-11-04: "Reword A5 only"):** it left this spec when 149.5 settled, reading "each reach the item reward screen once, through an app close". The close half was wrong, as #1379 found. A5 reads: an item waiting on the reward screen survives an app close, once, in the saved satchel; only the ceremony is missed, since the queue is not saved. Saved games don't change. Its other half goes under spec 151: an elite's drop rolls around a same-fight quest's item, so the two no longer make two offers or two copies.

### Decisions made upfront (do not ask)

- One spec, asap (T, 2026-11-04). Reuse the kept work; don't rewrite it.
- Settle holds back only the emptying file, never the run (T, 2026-11-04).
- No change to any card, rule, price or tuning value.

### Out of scope

- Renumbering the old D1-D3 decision clash: T's call, at the decisions-log merge (Nov 11).
- Automating the absorb itself.

## Acceptance

- **A2** `pr-merge`, `pr-risk --replay` and `triage-match` read whole file lists, each with a test past 100 files.

## Chunks

Measure: 1 open · 4 closed · next A6

- [ ] **149.2** The last 100-file readers read whole lists · S · closes A2 · needs — · alias: TL2b

### 149.1 (TL2a) — The pipeline holds its file reader and reads PRs whole and consistent · M · closes A1 · requires —

- Start from the uncommitted diff in `.claude/worktrees/agent-a5446395c026ba65f` (copy it onto a fresh branch from main). Files: `scripts/pr-files.mjs`, `pr-partition.mjs`, `pr-review.mjs`, `pr-risk.mjs`, `pr-policy.mjs`, `skills/review.md`, their tests.
- This PR changes pipeline paths, so it holds for T's merge.
- Measure: the new tests fail with `prSnapshot`'s head check removed; root `npm test` (3 known Windows `spawnSync tar EOF` failures aside).

### 149.2 (TL2b) — The last 100-file readers read whole lists · S · closes A2 · requires 149.1

- `scripts/pr-merge.mjs` (both `pr view` reads), `scripts/pr-risk.mjs` `--replay`, `scripts/plan/triage-match.mjs`, their tests.
- Measure: a test per reader with a 101-file PR; root `npm test`.

### 149.3 (TL2c) — Settle holds back only the file that empties a spec · M · closes A3 · requires —

- `scripts/plan/settle.mjs`, `scripts/pr-settle.mjs`, their tests; update `settle-order-false-empty` in `identity/footguns.md` if the guard closes it.
- Judge emptiness on the end state, never mid-run. The held file stays in `plan/pending/`.
- Measure: tests for the held file, the refill case, the red path and `--ref` misuse; `node scripts/plan/settle.mjs --dry-run` on main unchanged.

### 149.4 (MR4a) — The memoir tooltip says only what its entry holds · S · closes A4 · requires —

- Cherry-pick `0bf8b5085` from `.claude/worktrees/agent-a1bd792588a70c5ba`.
- Measure: both verify gates (mobile and `npm run verify -w backend`).

### 149.5 (MR4b) — Same item from a quest and an elite keeps both offers · S · closes A5 · requires —

- `axiomancer-mobile/state/item-reward/relic-sources.ts` and `state/e2e/` beside the 147.2 tests. Replace #1370's two could-not-fail tests.
- Measure: the tests fail on today's `carriedCovers`; both verify gates; `act1-walk-e2e`.
