# Partitioned review: baseline, manifests and the replay to run

> Stamp: 2026-10-20, branch `review/partition-and-merge` off `main`
> `be10cb65e`. Phase RV3 and D95. A measurement report with a baseline
> and a procedure; the recall numbers for the new reviewer are **not
> in it yet** (the reason is in §4) and the switch is shipped anyway
> on T's ratified decision of 2026-10-20, not on the numbers.

## 1. What changed

| Before (RV1c) | After (RV3) |
|---|---|
| Three fixed Sonnet lenses (Rules, Tests, Blast radius) on `risk:medium` and `risk:high`; one reviewer on `risk:low` | One Sonnet reader per module of changed source, from a manifest `scripts/pr-partition.mjs` derives from the diff; capped 2 / 4 / 7 by tier; each reader owns its files and their importers and carries a do-not-report list and the defect class the escape ledger says that module leaks |
| Every lens read the whole diff | A reader reads only what it owns; the Tests lens reads the tests and the PR body; a control adversary (medium, high) reads the whole diff unpartitioned, so the replay can tell whether the partition beats one strong reader |
| Overlap not measured | The verdict carries `<!-- pr-review:readers <n> overlap <k> -->`; a reader's finding on a file it was told not to report is dropped, not merged |
| Reviewer on `loop:pr` and `plot` only; T merges by hand (D86) | Every same-repo PR is reviewed; the `merge` job merges every non-plan PR whose verdict is `pass` (D95) |

## 2. Baseline: the three-lens reviewer, 2026-10-17 to 2026-10-20

Read from the verdict comments of the 16 most recent reviewed PRs
(#637 to #665), by `gh pr view --json comments`.

| Measure | Value |
|---|---|
| Verdict comments | 31 on 16 PRs (re-reviews on new heads) |
| `pass` / `not-pass` | 24 / 7 |
| Finding rows (MED+ and LOW), tagged | 45 |
| Rows by lens | `[tests]` 27, `[blast]` 10, `[rules]` 6, untagged (low tier) 2 |
| Rows carrying two tags (the only overlap the format could record) | 1 (`[tests][blast]`, #650) |
| Verdicts with zero findings | 13 of 31 |
| Planted-defect recall of this reviewer (`seeded.json` `review` block) | **never run**: the `--judge review` replay has no result for D1 to D4 |

So the baseline overlap is 1 row in 45, which is low, and the lens
mix says the Tests lens did most of the talking: the Rules lens, the
one that would have caught D1 (`riderPairs`), posted 6 rows in 31
verdicts. The planted-defect recall of the three-lens reviewer was
never measured, so the "at least equal recall" bar of the brief has no
measured left-hand side yet. Both sides are measured by the same
procedure in §4.

## 3. The manifests the partition produces

From `node scripts/pr-partition.mjs --files ... --tier ...` on the
planted defects' changed files (`docs/reports/eval/seeded.json`) and
`--pr <n>` on the open PRs, at the stamp. "Leaks" is the ledger count of
merged PRs with a post-merge follow-up that touched the owned file.

| Diff | Tier | Assignments | Readers | Owned module (class) | Consumers read / counted | Leaks |
|---|---|---|---|---|---|---|
| D1 (#534: `riderPairs`) | medium | 3 | 5 | `state/presenters` (rules-logic); `components/combat` (ui-layout); `scripts` (tooling-uncovered) | 1 / 14; 0 / 1; 0 / 0 | 11; 1; 1 |
| D2, D3 (#523, #529: `CombatBoard.tsx`) | medium | 1 | 3 | `components/combat` (ui-layout) | 0 / 3 (the file alone fills the ceiling) | 5 |
| D4 (#543: `pr-resolve.mjs`) | high | 1 | 3 | `scripts` (tooling-uncovered) | 0 / 0 | 1 |
| #665 difficulty features | high | 2 | 4 | `mechanics/src` (rules-logic); `src/World + src/CLI` (rules-logic) | 13 / 214; 7 / 7 | 2; 0 |
| #663 ready signal, determinism | high | 4 | 6 | `.claude/hooks`; `mobile/scripts`; `mobile/app + scripts/lib` (ui-layout); `scripts` | 0; 0; 1; 0 | 0 |
| #661 one web export | high | 3 | 5 | `mobile/scripts + lib`; `mobile/scripts` (split at the ceiling); `scripts` | 0 | 0 |
| #658 hazard puzzle move log | high | 2 | 4 | `components/hazard` (ui-layout); `state/presenters + lib` (rules-logic) | 2; 7 | 0 |
| #655 title plate gate | medium | 1 | 3 | `mobile/scripts` (tooling-uncovered) | 0 | 0 |

What the table says about the planted set: each of D1 to D4 lands in
exactly one reader whose first hunt is that defect's class (D1's
presenter logic under rules-logic with the two leakiest files in the
ledger named as such; D2 and D3's layout under ui-layout; D4's union
merge under tooling-uncovered). Under RV1c the same defects were one
of three questions every lens asked of the whole diff.

Cost: the reader count per PR in this sample is 3 to 6, against a
fixed 3 before (plus the control, which is the price of being able to
measure). The ceiling is 120k characters of owned source per reader.

## 4. The replay to run, and why it is not in this report

The reviewer runs `main`'s copy of `skills/review.md` (the job's
`pre_run` restores it, so a PR cannot rewrite its own review). A replay
of the new reviewer therefore needs this PR merged first. The procedure,
to run once on `main`:

```bash
node scripts/eval/seeded-replay.mjs --judge review        # plants D1-D4 as eval:seed drafts, dispatches pr-review.yml, scores
node scripts/eval/escape-ledger.mjs && node scripts/eval/miss-rates.mjs
```

and then fill this table from `docs/reports/eval/seeded.json` (the
`review` block per seed) and the `pr-review:readers` markers of the
verdicts it produced:

| Measure | Three-lens (RV1c) | Partitioned (RV3) | Control adversary alone | Pass |
|---|---|---|---|---|
| Planted defects flagged MED+ (D1 to D4) | not run | | | RV3 >= RV1c, and >= 3 of 4 (Part 4 of the research report) |
| Findings per clean control PR | not run | | | <= 1 MED+, 0 HIGH |
| Overlap rows per verdict (two or more tags) | 1 in 45 rows | | n/a | <= baseline rate |
| Readers that did not finish | 0 recorded | | | <= 1 per run |
| Run time, p90 | 9m28s on #665 (three lenses) | | | <= 20 min |

The three-lens column can be measured too: dispatch the same seeds
from a branch that restores the RV1c skill, or read the column as "not
run" and compare RV3 against the Part 4 thresholds directly. Either is
honest; the second is cheaper.

The merge job has no model in it and is measured by its tests instead
(`scripts/pr-merge.test.mjs`): a BLOCKED, BEHIND, DIRTY, UNSTABLE or
UNKNOWN PR holds on a `pass`; the kill switch holds before anything is
read; a forged `pass` marker in the PR body is never read (only
comments are), one in a comment posted before this run's review
started is ignored, and one for another head is ignored; a `plot:` or
`plan:` title or a `plot` / `review:plan-only` label holds; the
thirteenth merge in 24 hours holds. The live negative test (a PR with a
red `verify-gate` and the ruleset active) is the first red PR after
this merges: the audit comment will be absent and the Actions log will
carry the ruleset's refusal.

## 5. What was done on the repository (T's ratified decision, 2026-10-20)

- `allow_auto_merge` turned on.
- Ruleset `main requires verify-gate` created, active (id 25469169).
  It went up with no bypass actors; the fourth review of #666 pointed
  out that a required check with no bypass also refuses the loop's
  direct pushes to `main` (plan-only, telemetry, `fix-ci`), which have
  no PR to earn the check on. Putting T back on the bypass list is a
  repository-settings call this session was not allowed to make; it is
  T's row in `plan/NEEDS_T.md`. Until then every push to `main` from
  the loop will be refused. The merge job does not depend on the
  ruleset: it reads the head's `verify-gate` check run itself.
- Label `no-auto-merge` present (holds one PR); the repository variable
  `PR_AUTO_MERGE=off` holds all of them.
- `plan/NEEDS_T.md` rows `verify-gate-ruleset` and `pr-review-stage-2`
  cleared: both are done by this decision.
