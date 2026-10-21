# Phase RV4 — The daily merge cap goes

## Sources

- `scripts/pr-policy.mjs` — `export const DAILY_CAP = 12`, commented "Merges by this
  job in any 24-hour window; the rest wait for T."
- `scripts/pr-merge.mjs` — the gate, `if (mergedToday >= DAILY_CAP) return { go: false,
  reason: ... }`; the hold list in its header comment; the pass-reason string
  `${mergedToday} of ${DAILY_CAP} today`; and `countAutoMerges`, which reads the
  `<!-- pr-merge:auto -->` marker off recently merged PRs.
- `scripts/pr-merge.test.mjs` — `the daily cap holds the thirteenth merge`, which asserts
  `DAILY_CAP === 12` and that the thirteenth is held.
- `plan/bearings.md` D95 — "a non-plan PR merges when its adversarial review is green".
  It records no cap.
- Commit `2adde5ff9`, "merge every non-plan PR on a green verdict (phase RV3, D95)" — the
  commit that introduced both the auto-merge and the cap.

## Outcome

A green, reviewed, non-plan PR merges when the policy says it does, not when a counter
says it has been a busy day. The counter stays; only the hold goes.

Size: S

## Acceptance

- **A1 (the hold goes)** `DAILY_CAP` is gone from `scripts/pr-policy.mjs`, and
  `mergeWanted` no longer returns `{ go: false }` for any count of prior merges. No
  remaining hold in that function depends on how many PRs merged earlier.
- **A2 (the count stays)** `countAutoMerges` and the `<!-- pr-merge:auto -->` marker are
  untouched, and the pass reason still names the day's auto-merge count, so the audit
  trail of how much the loop merged unattended survives the cap that used to read it.
  Removing the observation along with the limit would cost the only number that would
  tell T the loop had run away.
- **A3 (the test inverts rather than disappears)** `the daily cap holds the thirteenth
  merge` is replaced by a test asserting the opposite: a PR green on every other count
  merges whatever `mergedToday` says, including a large value. A deleted test would leave
  the regression unguarded; an inverted one pins the new rule.
- **A4 (D95 and the code agree)** `plan/bearings.md` D95 records that a non-plan PR
  merges on a green adversarial review with no daily limit, and names the rails that do
  still hold. The defect this phase fixes is that the code carried a rule the recorded
  decision never mentioned, so leaving bearings silent would reproduce it.
- **A5 (the remaining rails are named and intact)** A test or the header comment
  enumerates the holds that survive, and they still fire: the kill switch
  (`PR_AUTO_MERGE=off` or the `no-auto-merge` label), a plan PR, a `PIPELINE_PATHS` PR,
  `review:needs-T` / `loop:pr-stuck` / draft / fork, an untrusted verdict author, a moved
  head, a `not-pass` or missing verdict, and a `verify-gate` that is not green.

Measure: `node --test scripts/pr-merge.test.mjs` green with the inverted test; root
`npm test` green; `mergeWanted` returns `go: true` for a reviewed green PR with
`mergedToday: 99`.

## Scope

- `scripts/pr-policy.mjs`, `scripts/pr-merge.mjs`, `scripts/pr-merge.test.mjs`.
- `plan/bearings.md` — D95's wording.
- Not touched: `pr-review.mjs`, `pr-partition.mjs`, `pr-resolve.mjs`, the workflows, the
  5-open-PR cap (D85, `skills/march.md`), or any other hold.

## Save / schema contracts

None.

## Decisions made upfront — DO NOT ASK

- **T ruled it, attended, 2026-10-21.** Shown `DAILY_CAP = 12` after it held PR #725
  (phase AD1a) — green on every check including the adversarial review, GitHub
  `MERGEABLE` / `CLEAN` — with `PR 725 not merged: daily cap: 12 auto-merges in 24h`,
  T said "I don't want that". The hold blocked a chain of six dependent phases T was
  orchestrating in an attended session.
- **The cap was never a recorded decision.** It arrived inside `2adde5ff9` alongside the
  auto-merge it throttles, and D95 as written in bearings mentions no cap. Code and
  record disagreed, and T was never asked about the 12. That is the deeper fix, and is
  why A4 is an acceptance rather than a tidy-up.
- **The count is not the cap.** A2 keeps `countAutoMerges` deliberately: the useful part
  was always the number, and a cap is a crude way to act on it. Keeping the number in the
  pass reason means a runaway loop is still visible in the audit trail.
- **Why removing it is safe.** The cap was the only rail that triggered on volume rather
  than on a property of the PR in front of it. Every other hold still applies per PR, and
  **D85's 5-open-PR cap already bounds how much work is in flight** — the loop cannot
  have more than five unmerged claims at once, so it cannot merge a hundred things in an
  hour regardless. GitHub's own ruleset requiring `verify-gate` remains the last word.
- **This phase does not self-merge.** `scripts/pr-policy.mjs` and `scripts/pr-merge.mjs`
  are both in `PIPELINE_PATHS`, so its PR waits for T by the very rule it edits. That is
  correct and deliberate: a change to the merge policy should not merge itself.

## Tests matrix

- `scripts/pr-merge.test.mjs`: the inverted cap test (A3); the surviving-holds
  enumeration (A5); the existing verdict, head-moved, kill-switch and plan-PR cases
  unchanged.

## Verify gate

`npm test` at the root.

## Commit body template

```
review: a green PR merges on its review, not on the day's count

DAILY_CAP held a reviewed, green, mergeable PR because twelve others
had merged in the preceding 24 hours. The cap arrived inside the same
commit as the auto-merge it throttled and was never recorded in D95,
so the code carried a rule the decision did not. The hold is gone and
D95 now says so. The count it read stays, in the pass reason and the
audit marker, because the number is worth having and the limit was
not. Every per-PR hold is untouched, and D85's five-open-PR cap still
bounds what is in flight.
```

## DoD

A1–A5 ticked.

## Follow-ups (not in this phase)

- **The open-PR cap lives in prose, the merge policy in code.** D85's 5 is a sentence in
  `skills/march.md`; `DAILY_CAP` was a constant with a test. That asymmetry is why
  `/oversight` could raise one and not touch the other. Whether the loop's governance
  numbers should live in one place is a real question this phase does not open.
