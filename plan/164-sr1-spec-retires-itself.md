# 164 — A finished spec retires itself at settle

> When a spec's last chunk closes, settle refuses to empty it and waits for a hand that never comes, so finished specs read "1 left" and `pr-resolve` goes red. This spec makes that close say where the spec's lasting rules went, and settle then retires the spec.

## Why

### Sources

- **T, 2026-11-09:** "I want to discuss what we can do to prevent every spec from always having one chunk left", then, shown the cause and the choice, "Yes, /plot it" on settle retiring an emptied spec, with the builder's last close carrying any lasting rule as a Decision.

### What exists today (read 2026-11-09, at 7c7e5ada2)

- **The hold** (`scripts/plan/settle.mjs`, `holdReason`, `holdBack`, D168): a file that would leave a spec with no chunk, judged on the run's end state, is held back alone and waits for a hand absorb.
- **Nobody does the hand absorb.** The steps are in `skills/next/land.md` §1 and §3, owner-only, and Miserere's local block there says every run takes §4 and §6. It was done by hand in #1375, #1392 and #1542.
- **What that cost:** 15 finished specs sat held from Nov 5 to Nov 9, and `pr-resolve` failed 168 of its 200 runs before #1542.
- **The precedent:** settle already removes the ladder spec when it empties (`closeLadderRows`, the `specFile === ladderFile` branch).
- **What the hand absorb found** (#1542): of the 15 specs, 3 held a rule recorded nowhere else (132, 137, 162) and 5 had `Follow-ups` sections (111, 112, 121, 132, 137). So a retire with no thought at all would lose real things, and that is why the close has to answer for it.

## Design

- **A close of a spec's last chunk carries `absorb:`** in its front matter: where the spec's lasting rules went, as `D?<slug>` decisions in the same file, a file named, or `none`. Its text is copied to the archive line.
- **Settle retires the spec** when the run's end state leaves it empty and the file that emptied it carries `absorb:`. The file is deleted, its row and lane entries go (the ladder's path), and `· NN · spec complete: <the row's title> · <absorb> · deleted in (this commit)` is archived.
- **`Follow-ups` carry themselves.** Any `#`-level section whose heading contains `Follow-ups` is copied verbatim to `plan/CANDIDATES.md` as an `[owner]` entry under `## Pending`.
- **No `absorb:`, no retire.** A last-chunk close without it is held exactly as today, and the message says to add the line ([T to confirm #1]).
- **The builder does the reading.** `skills/next/land.md`, in its Miserere local block, says: closing a spec's last chunk, re-read the spec's Design, Decisions and Open questions, record each rule a future builder could break unknowingly as a `## Decisions` entry, unless a test or lint already enforces it, and name that test in `absorb:`. `plan/pending/README.md` documents the key.
- D168 is amended by a `(proposed)` decision here.

### Decisions made upfront (do not ask)

- The end-state judgement stays: a spec a later file refills is not retired.
- The ladder spec keeps its own path and needs no `absorb:`.
- A spec's text stays in git; the archive line is the pointer.

### Out of scope

- Specs that stay open on T's own chunks (spec 166 takes the check-style ones).
- Scoring or reviewing what a builder wrote in `absorb:` beyond the normal PR review.

## Acceptance

- **A1** A last-chunk close carrying `absorb:` retires its spec in that settle: file deleted, roadmap row and lane entries gone, and the spec-complete line in `ARCHIVE.md` holding the `absorb:` text, with the close's own line shaped as usual by `pr-settle`.
- **A2** A spec's `Follow-ups` section lands verbatim in `plan/CANDIDATES.md`, and `check-plan-queues` stays clean. A spec without one writes nothing there.
- **A3** A last-chunk close without `absorb:` is held as today, and its message names the missing key.
- **A4** A spec emptied by one file and refilled by a later file in the same run stands, and nothing is archived.
- **A5** After a retire, `plan-check` and `check-deadlines` are green, and `pr-settle` pushes and reports no failure.
- **A6** `skills/next/land.md` and `plan/pending/README.md` tell the builder what `absorb:` is, and `scripts/loop-pr.test.mjs` pins the sentence.

## Open questions

1. [T to confirm #1] A last-chunk close with no `absorb:` stays held and turns `pr-resolve` red. Default: yes, since a builder leaving it out is the failure worth seeing. Or: retire anyway and write `absorb: not stated` in the archive.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **164.1** Settle retires an emptied spec whose last close says where its rules went · M · closes A1, A2, A3, A4, A5, A6 · needs — · alias: SR1a
  - `scripts/plan/pending.mjs` `KEYS` takes `absorb`, and the parsed result carries it. `scripts/plan/settle.mjs`: `holdReason` returns null when the emptying file has it, and the retire runs beside the ladder's branch, sharing its row tidy.
  - `docs/nexus-deviations.md` gets a row (settle now differs from the kit), and the kit's sync must keep it: use the marked-local-block form if settle allows one, and say in the PR body if it does not.
  - Tests alongside settle's and in `scripts/pr-merge.test.mjs`. Its held-back cases have no `absorb:`, so they should stand unchanged.
  - Measure: the root `npm test`, and a rehearsal `node scripts/pr-settle.mjs --dry-run --ref <branch>` on a branch whose fixture close has `absorb:`, its output in the PR.
