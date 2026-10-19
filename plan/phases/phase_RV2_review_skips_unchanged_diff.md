# Phase RV2 — The reviewer skips a head whose diff did not change

## Sources

- The `/plot` request from T, 2026-10-19 (attended), in T's words: "the review skill that gets fired on
  PRs, would it be at all possible to skip that check if it's just reviewing a merge conflict update?
  ie. Open PR → review → merge conflict → gets fixed → (here, no review here)".
- `scripts/pr-review.mjs` — `headMarker(sha)` writes `<!-- pr-review:head <sha> -->`, and `reviewWanted`
  skips only when a verdict comment already carries that exact marker (line 69). `reviewWanted` and
  `formatParentTests` are **pure**; only `main` reads GitHub. So a new fact reaches the decision as an
  argument, never by the function reaching for git itself.
- `skills/review.md` (the verdict comment template, the `<!-- pr-review:head <full head SHA> -->` line)
  — the reviewer, not the script, writes the marker. `scripts/loop-pr.test.mjs` pins that line's shape,
  so the skill and the pin change together or the pin fails.
- `.github/workflows/pr-review.yml`, job `review-wanted`: `actions/checkout@v4` with
  `sparse-checkout: scripts` and the default depth of 1. **This job has no history and no merge base.**
  Any design that needs `git merge-base` in it is wrong; see Decisions.
- Phase RV1 (`plan/phases/phase_RV1_pr_review_pipeline.md`): RV1a the gate, RV1b the shadow reviewer,
  RV1c the three lenses. This phase changes only *when* RV1b runs, never what it says.
- **D86** (nothing in the pipeline merges, auto-merges, closes or force-pushes) and **D87**
  (`pr-resolve` keeps a PR mergeable) both stand unchanged: this phase removes a review, not a gate.

## Outcome

A head that carries the same change as a head already reviewed is not reviewed again. A merge of `main`
into a branch, a rebase, and a force-push that alters nothing each stop costing a Claude review at
`effort: high` plus three Sonnet sub-agents, while a conflict *resolution* — which does change the
change — still gets reviewed.

Size: M

Measure: `node --test scripts/pr-review.test.mjs scripts/loop-pr.test.mjs` passes, and its cases include
a same-digest/different-SHA head skipped and a changed-digest head reviewed.

## Acceptance

- **A1** `scripts/pr-review.mjs` exports a digest helper that turns a unified diff into a stable
  identity using `git patch-id --stable`, reading the patch on **stdin**. It is verified to work in a
  repository-less, history-less environment: `git patch-id` is plumbing that needs no git directory, and
  `--stable` makes the digest independent of hunk line numbers (both confirmed by hand on 2026-10-19).
- **A2** `headMarker` carries the digest alongside the SHA, in one comment whose shape is still a single
  line and still greppable for the SHA alone. `skills/review.md`'s verdict template emits the same
  shape, and `scripts/loop-pr.test.mjs`'s pin asserts the new shape.
- **A3** `reviewWanted` takes the digest as a **fact in its argument object**, exactly as it takes
  `head` and `comments`, and stays pure. It skips when any verdict comment carries this digest, whatever
  SHA that comment names, and the returned `reason` names the digest so the skip is legible in the job
  log.
- **A4** The SHA rule survives: a comment carrying this exact head's SHA still skips, so nothing
  regresses for a PR reviewed before this phase ships.
- **A5 (backward compatibility)** A verdict comment written by the old reviewer carries a SHA and **no**
  digest. Such a comment must neither cause a skip of a different head nor throw. A test covers a
  comment set containing only old-shape markers.
- **A6** `main` computes the digest for the PR's current head from `gh pr diff <n>` piped into the
  digest helper, and writes it to `$GITHUB_OUTPUT` beside `go`, `pr` and `head`. The `review` job passes
  it to the reviewer so the reviewer never needs a `git patch-id` grant of its own — its `allowed_tools`
  list in `pr-review.yml` is unchanged by this phase.
- **A7** A `gh pr diff` that fails or returns empty is **not** a skip: the digest is absent, the
  decision falls back to the SHA rule, and the reason says the digest was unavailable. A missing digest
  never silences a review.
- **A8** The three lens sub-agents and the verdict format (RV1b, RV1c) are untouched, and
  `scripts/eval/seeded-review.mjs` plus `scripts/eval/seeded.test.mjs`, which build markers of their
  own, still pass.

Measure: the case matrix in Tests below is green, and `npm test` at the root is green.

## Scope

- `scripts/pr-review.mjs`: the digest helper, `headMarker`, `reviewWanted`'s new fact, and `main`'s
  extra output.
- `skills/review.md`: the verdict template's marker line.
- `.github/workflows/pr-review.yml`: the `review-wanted` job's outputs and what the `review` job passes
  into the prompt. **No change to `allowed_tools` or to any permission block.**
- `scripts/pr-review.test.mjs`, `scripts/loop-pr.test.mjs`, and `scripts/eval/seeded.test.mjs` if its
  fixture marker needs the new shape.
- Not touched: `verify-gate` (it runs on every head regardless, by design), the risk tiering, the lens
  fan-out, the verdict wording, `pr-autofix`, `pr-resolve`.

## Consumers to update

- `scripts/loop-pr.test.mjs` — the marker-shape pin.
- `.github/workflows/README.md` if it documents the once-per-head rule.
- `plan/phases/phase_RV1_pr_review_pipeline.md` — a pointer line noting RV2 changed the dedupe rule, so
  the RV1 brief does not read as current.

## Save / schema contracts

None. The marker is a PR comment, not persisted state, and an old-shape marker stays readable (A5).

## Decisions made upfront — DO NOT ASK

- **Identity by patch, not by "is it a merge commit".** Detecting a merge commit guesses at intent and
  is trivially wrong in both directions. The diff against the base *is* the review surface, so its
  identity is the honest key.
- **`gh pr diff`, not local git.** The `review-wanted` job is a sparse depth-1 checkout chosen to keep
  a label-only event cheap. Deepening it to `fetch-depth: 0` would put a full clone on every PR event to
  save some reviews — the wrong trade. `gh pr diff` gives the diff against the base GitHub itself
  computed, and `git patch-id` needs no repository, so the cheap job stays cheap.
- **A conflict resolution still reviews, and that is the point.** A resolution edits conflicted content,
  so the diff against the base changes, so the digest changes. This is not theoretical: on 2026-10-19
  two automated resolutions on PRs #644 and #645 each kept *both* copies of a duplicated
  `plan/lessons.md` row — a defect that existed only inside the resolution. A "skip merge commits" rule
  would have waved both through. Lesson `lessons-merge-dup-slug`.
- **The gate is never skipped, only the opinion.** `verify-gate` keeps running on every head. That is
  what covers the blind spot in Follow-ups.
- **A missing digest fails open** (A7). A review that does not happen is invisible; a review that
  happens twice merely costs money. When in doubt, review.
- **Slot: asap.** It is a live cost leak on every PR that ever needs a merge, it blocks no open row, and
  it is small.

## Tests matrix

`node --test scripts/pr-review.test.mjs` — `reviewWanted` cases:

| case | expected |
|---|---|
| same digest, different SHA | skip, reason names the digest |
| same SHA (old rule) | skip |
| changed digest, different SHA | review |
| comments carry only old SHA-only markers, different head | review, no throw (A5) |
| digest absent (A7) | falls back to the SHA rule, reason says unavailable |
| not `loop:pr` / `plot`, draft, closed, fork | unchanged from RV1b |

`node --test scripts/loop-pr.test.mjs` — the marker-shape pin matches `skills/review.md`.
Digest helper: a fixture patch hashes stably, and the same patch at different line numbers hashes equal.

## Verify gate

Root `npm test`.

## Commit body template

```
review: skip a head whose diff did not change

The reviewer deduped per head SHA, so a merge of main, a rebase or a
content-free force-push bought a second full review of an identical
change. The verdict marker now carries a `git patch-id --stable` digest
of the diff against the base, and reviewWanted skips any head whose
digest a verdict already names. A conflict resolution changes that diff,
so it still reviews. A missing digest falls back to the SHA rule: a
review never goes missing to save one.
```

## DoD

A1–A8 ticked.

## Follow-ups (out of scope)

- **The blind spot, stated not solved.** A diff-identical head on a *newer* base is not semantically
  identical: the base can move in a way that breaks the PR without changing the PR's own diff.
  `verify-gate` runs on every head and would catch a test-visible break; a review-visible one it would
  not. Whether a base move should re-arm the reviewer (say, when the merge brought changes to a file the
  PR also touches) is a separate question this phase does not answer.
- **The same dedupe for `pr-autofix`**, if it re-runs on content-free heads too. Not measured here.
- **`risk:*` re-derivation on a skipped head** — the risk label is derived by `verify-gate`, which still
  runs, so nothing is believed stale; worth confirming once in practice.
