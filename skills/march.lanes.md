# March lanes

> This project's own `/march` steps. The kit re-syncs
> `skills/march.md` and never touches this file, so a step
> that keeps your loop moving lives here, not there.

---

`skills/march.md` reads this file at two hooks, through
`node scripts/plan/lanes.mjs march <hook>`:

| Hook | Where in the tick | Yields to |
|---|---|---|
| `pre` | after Step 0 (sync, veto sweep), before triage | the Asap lane (and support rows): runs only when neither has a ready item |
| `queue` | after 3a (no ready chunk), before the next queue step | nothing: 3a already found no ready chunk |

One block per lane. `when` is prose (the agent judges it) or
`script <path>` (exit 0 runs the lane); absent, the lane
always runs. `return: end-tick` makes the lane the tick's
work; `continue` (the default) lets the tick go on.
`Lanes off: <name>, <name>` in `plan/bearings.md` turns a
lane off by name. No lane blocks here means stock dispatch.

The example below sits inside a comment, so it is no lane.
Copy it out of the comment to make it one.

<!--
## lane: weekly-snapshot
- hook: pre
- when: script scripts/lanes/snapshot-due.mjs
- run: node scripts/snapshot.mjs --write, then commit the snapshot
- return: end-tick
-->

<!-- Miserere's own /march steps, carried at the nexus v2 cut-over (phase NX1d, 2026-11-01) from the v1 skills/march.md, one lane per kept deviation (docs/nexus-deviations.md, "march" rows). The upgrader had moved the whole v1 procedure here as one lane; it is split into the three lanes below and the v1 phase pick is dropped for v2's (TAKE). -->

## lane: pr-watch
- hook: pre
- when: always (every tick, capped or not)
- run: list in the tick's output, never acting on them: each open `loop:pr` PR older than 7 days ("open 7d+, waiting on T"; the loop never closes one, D86); each PR labelled `loop:pr-stuck` (`pr-autofix` gave up after two runs, D87), with its number and failing check; each open row in `plan/NEEDS_T.md` (T's own moves, D94), one line each: its slug, what T does, and `seen N×`
- return: continue

## lane: pr-cap
- hook: pre
- when: 5 or more open `loop:pr` PRs (`gh pr list --state open --label loop:pr --json number --jq length`; D85, raised from 3 via /oversight 2026-10-17), and neither triage nor critique is due this tick (those two still run at the cap: they file findings only)
- run: report `waiting on T: PRs #a, #b, #c` and build nothing
- return: end-tick

## lane: report-sweep
- hook: pre
- when: always (phase RS1)
- run: `node scripts/report-sweep.mjs --file`, as the notes below say under "Report sweep"; it never dispatches a verb or ends the tick
- return: continue

## Notes: Miserere's landing, labels, PR body and retro (reference, not lanes)

The v1 `skills/march.md` §3 text for what the kit does not do: the PR
cap, landing a change, the size, area and review labels, the PR body,
acceptance proofs, the CI watch, gate distances and the retro. Every
`skills/march.md` §3 "<name>" reference in the repo now means the
section of that name below. No lane runs them; `/next` and the other
committing skills read them when they land. Since phase NX1e,
`skills/next/land.md` carries a marked local block that points here:
v2's contributor path (its §2, §4 and §6) is the base, and these notes
are what Miserere adds to it; v2's owner path (§1, §3) never runs.
Superseded at the cut-over and left out: the v1 "Pickable phase" and
"Claims" sections (v2's pick order, `scripts/plan/order.mjs`, and
claims, `scripts/claims.mjs`; TAKE), and the v1 procedure (v2's
`skills/march.md` §3).

### Report sweep

**Report sweep (phase RS1).** A hand-written report saved under a
package's `docs/reports/` reaches the loop here:

```bash
node scripts/report-sweep.mjs --file
```

It lists each `axiomancer-*/docs/reports/*.md` that is neither in
`plan/report-sweep-baseline.json` nor cited by path in
`plan/CRITIQUE.md` or `plan/AUDIT.md`, and adds one CRITIQUE Pending
row for each: "`[MED]` unfiled report `<path>`: read it and file its
findings", with the path as evidence. `/iterate` works that row like
any other. The root `docs/reports/` is the loop's own output and is
never swept. "no unfiled reports" changes nothing; filed rows are
plan-only queue bookkeeping (§3 "Landing a change"). The sweep never
dispatches a verb or ends the tick.

### Gate distances (first-parent) and the critique and expand gates

Kept for the first-parent rule (MERGE, lesson `gate-commit-count`): v2's `skills/march.md` gates decide when critique and expand are due; where they count commits since a pass, count `main`'s first-parent history as below.

Every rate limit and eligibility test the loop uses is defined
here. `skills/critique.md`, `skills/expand.md` and
`skills/iterate.md` cite this section instead of carrying copies.

"N commits after `Last pass`" counts `main`'s own line:
`git rev-list --count --first-parent <sha>..origin/main`. A merged
PR's branch commits are not counted one by one, so a burst of merges
does not make a pass due an hour after the last one (lesson
`gate-commit-count`).

`GH_TOKEN` / `GH_REPO` are loaded in §4 Step 0. If `gh` isn't
installed or `GH_TOKEN` is missing, a `gh`-based gate reads as
"not met": log a warning and fall through. **Don't fail the
march** on a missing token. The PR cap is the exception: with no
`gh`, nothing can land by PR, so the tick builds no code (report it;
plan-only verbs still run).

#### Critique due

Read the metadata header at the top of `plan/CRITIQUE.md`:

```
> Last pass: <ISO-date> at commit <sha>
> Pass count: <N>
```

Due when **all three** hold:

1. The current commit is at least **12 commits after** `Last
   pass`, OR `Last pass` is more than **24 hours ago**, OR `Last
   pass` is "never" and at least one phase has shipped.
2. `npm run deploy:check` shows a green deploy.
3. No pending HIGH critique row is already queued in
   `plan/CRITIQUE.md` `## Pending`.

#### Expand due

Decides whether `/march` dispatches `/expand` (§4 Step 4) and
whether `/iterate` hands an empty tick to `/expand`
(`skills/iterate.md` §6, failure mode 6).

Read `plan/bearings.md` → "Plan expansion posture", then the
metadata header at the top of `plan/PHASE_CANDIDATES.md` (same
shape as CRITIQUE's). Due when **all four** hold:

1. Posture is not **strict**.
2. The current commit is at least **20 commits after** `Last
   pass`, OR `Last pass` is more than **48 hours ago**, OR `Last
   pass` is "never" and at least **3 phases have shipped**.
3. There is at least one signal worth examining: `plan/AUDIT.md`
   has Pending rows, OR `plan/CRITIQUE.md` has Pending rows, OR
   `git log -p --since="<last pass>" -- spec.md plan/revamp/
   axiomancer-mechanics/specs/` shows changes (a spec marked
   HISTORICAL is not a signal).
4. No phase is pickable (below).


### PR cap (D85)

```bash
open_prs=$(gh pr list --repo "$GH_REPO" --state open --label loop:pr \
  --json number,title,createdAt,labels 2>/dev/null || echo '[]')
count=$(echo "$open_prs" | jq 'length')
```

At **5 or more** (D85, raised from 3 via /oversight 2026-10-17) the cap is reached: the tick runs triage (Step 1)
and, if due, critique (it files findings only and pushes `main`),
then reports
`waiting on T: PRs #a, #b, #c` and ends. Every tick, capped or not,
also lists in its output:

- each open `loop:pr` PR older than **7 days** ("open 7d+, waiting
  on T"); the loop never closes one (D86);
- each PR labelled `loop:pr-stuck` (`pr-autofix` gave up after two
  runs, D87), with its number and failing check;
- each open row in `plan/NEEDS_T.md` (T's own moves, D94), one line
  each: its slug, what T does, and `seen N×`.


### Landing a change (the PR flow, D84–D87, D119)

**Every change lands by PR** (D119, which ended D84's path split).
Code, and the plan changes that record it, go on a
`loop/<verb>-<slug>` branch (`loop/next-<chunk id>` for `/next`) as a
`loop:pr` PR the review merges (D95). `plot`, `review:rules-change` and
`nexus-sync` PRs wait for T (D93, D101, D119). `/plot` opens a `plot`
PR, not a `loop:pr` one (`skills/plot.md` §7.1), so it neither counts
toward the cap nor claims a row.

**Plan changes ride in the PR as `plan/pending/` files** (phase NX1e;
`plan/pending/README.md`, `skills/next/land.md` §2): a branch never
edits `plan/README.md`, a spec's chunk list or `ARCHIVE.md`. A chunk's
close is `plan/pending/<chunk id>.md`; a plot's roadmap row, Held lines
and new work for an open spec are `plan/pending/plot-<slug>.md`. After
the merge, the push to main runs `pr-resolve`'s scan, which settles
first (`node scripts/pr-merge.mjs settle`, `scripts/pr-settle.mjs`):
the kit's settle folds every pending file in, the archive line gets
the chunk's `(alias: …)` and `(#<PR>)`, and one `plan: settle <ids>`
commit is pushed to main. So two PRs never collide in the roadmap or a
spec. Until it settles, every reader (plan-check, `order.mjs`, the
deadline tools) counts a pending close as closed. What a Miserere
pending file leaves out: `footguns:` and `## Footguns` (no footgun list
here: a trap is a `plan/lessons.md` row), `## Decisions` (D-entries go
in the decisions log in the PR) and `## Notes`. A close of a Held chunk
carries an `## Edit plan/README.md` that takes its Held line out
(settle tidies only the Asap lane and the table). Files with a merge of
their own are still edited in the PR: a new file (a spec, a part plan),
the union queues, `plan/lessons.md`, `plan/NEEDS_T.md`,
`plan/deadlines.md` and the telemetry shard.

`node scripts/loop-land.mjs open` does the push and the `gh pr create`
below in one step: it refuses a HEAD off the named branch, pushes to an
open PR for it instead of opening a second, stops at the cap (exit 3,
"waiting on T") and hands the claim to the PR:

```bash
node scripts/loop-land.mjs open --verb <verb> --slug <slug> --size <S|M|L> \
  --area <area> [--area <area>] [--review <rules-change|plan-only|needs-T>] \
  --title "<subject naming the claim>" --body-file "$body" [--chunk <id>]
```

By hand, the same steps:

```bash
git fetch origin main
git switch -c "loop/<verb>-<slug>" origin/main     # before the first edit
# edit, verify, commit (plain bodies, AGENTS.md rule 2)
git push -u origin "loop/<verb>-<slug>"
gh label create loop:pr --repo "$GH_REPO" --color 0E8A16 \
  --description "Loop-opened PR; T merges (D84-D87)" 2>/dev/null || true
for s in S:C2E0C6:"under an hour, one workspace" M:FBCA04:"one focused tick" \
         L:D93F0B:"a full tick" multi-phase:5319E7:"a plot that splits into phases"; do
  gh label create "size:${s%%:*}" --repo "$GH_REPO" --color "$(echo "$s" | cut -d: -f2)" \
    --description "$(echo "$s" | cut -d: -f3-)" 2>/dev/null || true
done
# area:* (one or more) and review:* (zero or more): the rule below
for l in area:combat:1D76DB:"Combat engine, dice, stances, hazards" \
         area:cards:0052CC:"Card data, pricing, keywords, card-spec" \
         area:ui:006B75:"Screens, dock, map, title, styling" \
         area:mobile:5319E7:"Expo/mobile perf, gestures, native builds" \
         area:ci:B60205:"Workflows, pr-autofix, verify-*, hooks" \
         area:loop:0E8A16:"Loop skills, plan/ memory, telemetry, nexus docs" \
         review:rules-change:E99695:"Changes game rules or balance; needs T's design eye" \
         review:plan-only:EDEDED:"Only plan/, docs/, telemetry/ change; no code" \
         review:needs-T:FBCA04:"Blocked on a decision only T can make"; do
  gh label create "$(echo "$l" | cut -d: -f1-2)" --repo "$GH_REPO" \
    --color "$(echo "$l" | cut -d: -f3)" --description "$(echo "$l" | cut -d: -f4-)" 2>/dev/null || true
done
gh pr create --repo "$GH_REPO" --base main --head "loop/<verb>-<slug>" \
  --label loop:pr --label "size:<S|M|L>" --label "area:<area>" \
  --title "<subject naming the claim>" --body-file "$body"
gh pr checks "loop/<verb>-<slug>" --repo "$GH_REPO" --required --watch --fail-fast
```

- **One size label per PR** (T, 2026-10-14), so T can spot the
  estimate in the PR list: `size:S`, `size:M` or `size:L`, read from
  the brief the tick ships (its `Size:` line, or the `###` header of
  the `§ <id>` phase). A fix with no brief, or a brief from before
  this rule, is sized by the tick on the same scale
  (`skills/plot.md` Step 3) when it opens the PR. `size:multi-phase`
  belongs to `plot` PRs only.
- **Area and review labels (T, 2026-10-14)**, so T can tell at a
  glance in the PR list what a PR touches and how to read it. Every
  `loop:pr` and `plot` PR carries **at least one `area:*`** label,
  chosen from the files the diff touches (several when it spans
  areas): `area:combat` (`axiomancer-mechanics/src/Combat`, `Effects`,
  `Enemy`, hazards, dice), `area:cards` (`Cards`, `Items`, pricing,
  keywords, card-spec), `area:ui` (`axiomancer-mobile` screens, dock,
  map, title, styling), `area:mobile` (Expo config, perf, gestures,
  native builds), `area:ci` (`.github/`, `.claude/hooks`, `scripts/`
  verify tooling), `area:loop` (`skills/`, `plan/`, `telemetry/`,
  nexus docs). `review:*` labels are added only when they apply, any
  number: `review:rules-change` when the diff changes a card, rule,
  price, keyword or tuning value (T reads it with a design eye);
  `review:plan-only` when nothing outside `plan/`, `docs/`,
  `telemetry/` changes (a `plot` PR always carries it);
  `review:needs-T` when the PR body asks T a question the merge
  depends on. Add a label to an open PR with
  `gh pr edit <n> --repo "$GH_REPO" --add-label <label>`.
- **One PR per tick**, never one per fix. Each PR carries only this
  session's telemetry shard, so two PRs never add the same file
  (lesson `telemetry-add-add`). The plan-only commits that
  record the PR's own work (the pending close, the AUDIT or
  CRITIQUE row it closes, the retro) ride in the PR; unrelated queue
  bookkeeping is not this PR's.
- **Body template** (`scripts/loop-pr.test.mjs` pins its shape):

  ```markdown
  ## What shipped
  - <2-5 bullets>

  ## What T can now do
  - <1-3 bullets, player- or owner-facing>

  ## Decisions
  - <autonomous call: picked X over Y because ...>

  ## Acceptance
  - [x] A1 <the brief's text>, proven by `<path/to/x.test.ts>` or `npm run <script>`
  - [x] A2 <a doc-only or attended line> (no test: <reason>)

  ## Verify
  - `<command>` -> <summary>

  Closes #<mirror issue>
  ```

  `## Acceptance` lists the brief's IDs the PR closes; drop the
  section for a fix with no brief. **Each ticked line names its
  proof** (phase LG1c): a backticked test file or `verify:visual`
  shot that exists on the PR head (a full path, or a bare file name
  the head holds), or a backticked `npm`, `node` or `npx` command;
  or it ends with `(no test: <reason>)`, which `verify-gate`'s
  summary lists for T; the reason holds no parentheses of its own,
  or the line reads as naming no proof (ship BV3). A ticked line with neither, or naming a file
  the head lacks, turns `verify-gate` red. Check the body before
  opening the PR: `node scripts/pr-acceptance.mjs --body-file
  "$body"`. The step reads the body live, so after editing a red
  body, re-run the failed `verify-gate` job (`gh run rerun <id>
  --failed`). The `judge` job then **runs** each named test file and
  command on the head (phase LG1f) and `verify-gate` fails when one
  fails, so name a command that runs on a plain runner with no shell
  and no token (no `&&`, pipes or `$VAR`; one proof per backtick);
  anything else is `(no test: <reason>)`. Never write the bare root
  `npm test` in a ticked line, even as prose: the judge runs it in a
  shallow checkout, where the git-history tests
  (`scripts/eval/worktree-root.test.mjs` needs `HEAD~1`) fail (ship
  FM2b); name the one test file or `--check` that proves the line. Try a body's proofs before
  opening the PR: `node scripts/pr-judge.mjs run --body-file
  "$body"`. `Closes #<N>` is the last line, one
  issue per line; `close-trailers` reads it from the commit range of
  the merge push, so put the same trailer in the PR's last commit.
- **`gh pr checks --watch` replaces `deploy:check`** for the branch
  (the `verify-*` workflows run on `pull_request`). Red on this tick's
  own change: fix on the branch (push, never force), up to 3
  same-root-cause tries. Still red when the tick must end: leave it;
  `pr-autofix` takes it (two runs, D87).
- **A `visual: re-stamp` commit from CI on the PR** (phase VE1c) means
  the PR changed pixels: read the image diff in Files changed (and the
  `<!-- visual-smoke -->` comment) before merging; the merge approves the
  new baselines. Pull before the next push to that branch.
- **`verify-gate`** (`pr-review.yml`, phase RV1a) reports on every PR:
  green only when every triggered `verify-*` is, and it applies the
  derived `risk:*` label. The tick never sets a `risk:*` label itself;
  T merges as before (D86).
- **The adversarial review** (`skills/review.md`, phase RV1b, RV3)
  posts after `verify-gate` on every same-repo PR: inline MED/HIGH
  findings, one `## Review verdict` comment, and a `risk:*` raise with
  a reason. On a `pass` the `merge` job merges any PR but a `plot` PR
  (D95, D101); a `not-pass`, a `plot` PR or a hold label leaves it to T.
- **Never** merge the PR, close it, or force-push its branch yourself
  (D86): the `merge` job merges it on a green review, T merges the rest
  (D95).
- **Check the cap and claims before cutting the branch.**
- Attended sessions with T may still push `main` at T's word.

### Retro

Closes `ship-a-phase`, `iterate`, `critique`, `fix-ci` and `plot`,
even a tick that shipped nothing. Lesson format and the ladder live
in the `plan/lessons.md` header; `scripts/check-lessons.mjs` lints it.

0. **Whose move is the fix? (D94)** For each thing that bit, ask who
   can fix it. If only T can (rotate or renew a token or secret,
   finish an OAuth, a console click, a tool on T's machine), it is
   **not a lesson**: bump or add its row in `plan/NEEDS_T.md` (format
   in that file's header), use its workaround, and say so in the
   tick's output. It never climbs the ladder below, never becomes a
   `PHASE_CANDIDATES` automation row, and the loop ships no code to
   work around it. What the loop itself can change (a step, a script,
   a test) goes on to step 1. A mixed case splits: T's half to
   `NEEDS_T.md`, the loop's half (if any stands on its own) a lesson.
1. Did anything in this tick bite (a wrong assumption, a step that
   misled, a red check, a retry)? If it matches a lesson, bump its
   `seen N×` and `last` date; if not, add one under its `@domain:`.
2. A lesson now **seen 2×** is automated in this tick (a guard check,
   a test, a lint) and marked `guarded by <hook/test>`; if the
   automation is a phase of its own, file a `PHASE_CANDIDATES` row
   naming it.
3. A lesson seen **3× across verbs** may be promoted to
   `plan/reflexes.md` directly; `/oversight` reviews promotions after
   the fact (THE OPEN GATE).
4. If one of the verb's own steps misled you, tighten that step (it
   may only get safer or clearer).
5. "retro: clean" is a valid outcome and needs no commit. Otherwise
   commit `lessons: retro <verb> <N>` (plan-only: it rides the tick's
   PR if there is one, else pushes `main`).


### Shipping a chunk (the v1 ship-a-phase's mirror, PR and close steps)

The v1 `skills/ship-a-phase.md` retired at the cut-over (v2's `/next`
and `/ship-a-chunk` build a chunk; `docs/nexus-deviations.md` row
"ship-a-phase: TAKE the shape"). What it carried that the kit's land
step does not is kept here, and `skills/next/land.md`'s local block
points at it (phase NX1e): the phase mirror issue, the PR with its
labels and `Closes #N`, the deadlines rewrite on close (DL1b), the
check watch, the claim release and the retro. Read "phase" and "row" as
the chunk (its alias names it in titles). The close is v2's pending
file (Step 11), never an edit of the spec or `ARCHIVE.md`: settle takes
the chunk line out on main after the merge and writes the archive line
with its alias and PR. The truth-source, order of authority, save and
verify rules it pointed at are AGENTS.md § Building a phase.

#### Step 2.5 — Mirror the phase to GitHub

Open (or reuse, or reopen) the phase mirror issue. The repo's
Issues tab gets a public artifact for this phase the moment work
begins; the same artifact closes when the shipping commit lands.
The helper is **idempotent** — find-or-create-or-reopen keyed on
the title prefix `Phase <N> — `, so re-runs of the same phase (or
rapid-fire ticks) reuse the same number instead of spamming
duplicates.

```bash
# 1. Build the body file from the brief's Outcome / Why section.
#    Keep it user-readable: 1–2 lines goal summary, then a link
#    back to the phase brief in this repo.
issue_body=$(mktemp)
cat > "$issue_body" <<EOF
**Goal:** <one-line outcome from the brief's "Outcome" section>

<2–4 line summary of what shipping this phase delivers>

**Brief:** [\`plan/phases/phase_<N>_<topic>.md\`](https://github.com/no-trbl-2-u/Miserere-mei-deus/blob/main/plan/phases/phase_<N>_<topic>.md)

---
_Tracked by the autonomous loop. The phase PR names this issue in a \`Closes #<this-issue>\` trailer and the \`close-trailers\` workflow closes it when T merges the PR; deploy URL is posted as a follow-up comment._
EOF

# 2. Open / reuse / reopen.
PHASE_ISSUE=$(node scripts/loop-issue.mjs phase-open \
    --phase "<N>" \
    --title "Phase <N> — <topic>" \
    --body-file "$issue_body")
echo "phase mirror: #$PHASE_ISSUE"
```

`<N>` here is the phase identifier as it appears on the
`01_build_plan.md` row (e.g. `15a`, not `15`). The title format
**must** be `Phase <N> — <topic>` — the helper rejects mismatched
titles to keep prefix-match reuse working.

On **any failure** of `loop-issue.mjs phase-open` (auth, rate
limit, network, repo unreachable):

- Print stderr to the run log.
- Continue with the build. The mirror is best-effort, not gating
  (Hard rule §7 — phase mirror is non-gating).
- The next ship-a-phase tick on the same phase will retry.

If the open succeeded, capture `$PHASE_ISSUE` for use in Step 10
(commit trailer) and Step 12.5 (close-comment).


#### Step 10 — Branch, commit, open the PR

Land it per `skills/march.md` §3 "Landing a change". The branch
`loop/next-<chunk id>` (`/next`, `/ship-a-chunk`) is cut from a fresh
`origin/main` before the first edit (`skills/next/build.md` §1 with
`--branch loop/next-<id>`; it is described here once).

Stage explicitly. Conventional subject; body in 4–8 bullets
describing what shipped + what the user can now do, plus a
"Decisions" section listing autonomous design calls.

```bash
git add <explicit files>
git commit -m "<type>: <one-line summary> — phase <N>" -m "<bullets + Decisions>"
```

**No attribution trailers. No emojis** (AGENTS.md rule 2).

#### Step 11 — Close the chunk (inside the PR)

The PR's **last commit** is the close: `plan/pending/<chunk id>.md`
(`skills/next/land.md` §2; `close`, `date`, `says`), which counts the
chunk closed from that commit on and which the merge job settles on
main once the PR merges. The chunk's spec, `plan/README.md` and
`ARCHIVE.md` are not touched. In the same commit re-derive the deadline
Items' Status cells: the deadline tools read a pending close as done, so
if it finishes an Item, `scripts/check-deadlines.mjs` fails the root
`npm test` until `plan/deadlines.md` says so (phase DL1b). A chunk listed
under `## Unscheduled` loses that line in the same commit:

```bash
node scripts/deadlines.mjs --write && git checkout -- LIVE_DEADLINES.md
git add plan/pending/<chunk id>.md plan/deadlines.md
git commit -m "plan: close <chunk id> — <one-line>" -m "Closes #<phase-issue-number>"
git push -u origin "loop/next-<chunk id>"
gh pr create --repo "$GH_REPO" --base main --head "loop/next-<chunk id>" \
  --label loop:pr --label "size:<S|M|L>" --label "area:<area>" \
  --title "<type>: <summary> (<alias>)" --body-file "$body"
# or both lines at once: node scripts/loop-land.mjs open --verb next --slug <chunk id> ...
# area:* from the files touched (several if the phase spans areas), from the
# closed list in skills/march.md §3: combat, cards, ui, mobile, ci, loop; add
# --label review:rules-change when the phase changes cards, rules, prices
# or tuning values (skills/march.md §3 "Area and review labels")
```

The body follows the template in `skills/march.md` §3: What shipped,
What T can now do, Decisions, Acceptance (the brief's `A1…` IDs this
phase closes, ticked, each naming its proof or `(no test: <reason>)`;
`verify-gate` fails an unproven line, phase LG1c, and the `judge` job runs every named proof, phase LG1f), Verify (the Step 9 commands and results), and
`Closes #<phase-issue-number>` as the last line. The PR number is
never written by hand: settle reads it from the merge commit for the
archive line. Never predict it either (issues and other sessions share
the number sequence; ship RW1b guessed #946 and got #947).

#### Step 12 — Watch the PR's checks

```bash
# Checks take a few seconds to register after a push; --watch before then
# exits 0 on "no checks reported" (lesson `checks-not-yet-registered`).
# --required: only `verify-gate`, which waits on every verify-*; without it
# the watch also waits on the advisory `review / run` job (up to 40 min).
# Wait for the verify-gate row itself: with only advisory rows listed,
# --required --watch exits on "no required checks reported" (BV2b).
until gh pr checks "<PR>" --repo "$GH_REPO" 2>/dev/null | grep -q verify-gate; do sleep 10; done
gh pr checks "<PR>" --repo "$GH_REPO" --required --watch --fail-fast
```

Outcomes:

- **Green (or no check applies to the paths)** — continue to Step
  12.5. If the phase added a CI step, grep the job log for that
  step's own output before calling it green (lesson
  `green-is-not-ran`).
- **Red on this phase's change** — read the log, fix on the branch
  (push, never force), re-run from Step 9. Up to 3 same-root-cause
  iterations; then leave it for `pr-autofix` (D87) and say so in the
  tick's output.
- **Timeout** — surface it and continue; `pr-autofix` handles a later
  red.
- **`gh` unreachable** — stop per §10.

#### Step 12.5 — Phase mirror comment and claim release

If Step 2.5 captured `$PHASE_ISSUE`, comment the PR URL on the
mirror (best-effort):

```bash
gh issue comment "$PHASE_ISSUE" --repo "$GH_REPO" --body "PR opened: <pr-url>"
```

Release Step 2's claim: the PR is open, and the PR is the claim from
here on (`skills/march.md` §3 "Claims"). Best-effort, like the claim:
a tooling error is logged, and the claim expires 24 h after its last
renewal anyway.

```bash
node scripts/claims.mjs release "<N>" --owner "$owner"
```

A `/heads-down` worker releases too: its owner is the orchestrator's,
and the orchestrator's other claims are on other rows, so only this
row's entry goes.

The mirror closes when T merges: `close-trailers` reads the
`Closes #<N>` trailer from the merge push's commit range, and
`deploy-comment.yml` posts the deploy URL once `main`'s `verify-*`
runs go green. Do not call `loop-issue.mjs phase-close` before the
merge.

#### Step 12.9 — Retro

Run `skills/march.md` §3 "Retro" for this tick. A lessons commit
rides the PR (push it to the branch).

#### Step 13 — Done

Return cleanly with the PR URL. The loop's next tick picks up the
next unclaimed phase. If you ran outside the loop, summarize what
shipped + what's next in 2–3 lines. Do not pick up another `[ ]` row in this same
invocation — see §7 Hard Rule 12.


#### ship-a-phase §7. Hard rules

1. **No `Co-Authored-By:` in commits.** Plain message bodies.
2. **No emojis** anywhere in code, content, or commit messages.
3. **No `--no-verify`, no force-push, no destructive resets.**
   Never merge, close or enable auto-merge on a `loop:pr` PR (D86);
   the `pr-review.yml` `merge` job alone merges, on a green review (D95).
4. **Don't drag in stray working-tree changes.** `git status
   --short` first; stage explicitly.
5. **Don't restart the user's dev servers.** They keep dev up;
   the e2e harness uses a separate port.
6. **Tests alongside code** — never "add tests later".
7. **Small, focused components in folders.** Prefer 5 small
   files over 1 dense file.
8. **Content stays in mechanics `src/*` + mobile `*.copy.ts`.** No
   hardcoded copy/records in components.
9. **The game's canon** (the title, VITAE the one bar, the cut terms;
   D47, D63) is `identity/principles.md` P1 to P3.
10. **Phase issue mirror is best-effort, not gating.** If
    `loop-issue.mjs phase-open` fails, the phase still ships;
    log the stderr and continue. The mirror is a public timeline,
    not a verification step. Do not block phase delivery on
    GitHub issue API hiccups.
11. **Never end the turn waiting on a backgrounded research
    sub-agent or shell job** (a mutation run, a long replay: push
    the branch and open the PR before starting one, lesson
    `background-then-end-turn`). When a `/ship-a-phase` tick needs a sub-agent's
    findings (e.g. an `Explore` mapping a save-schema migration
    pattern) before code can be written, spawn it in the
    **foreground** (blocking) and synthesize before proceeding —
    do not spawn in the background and end the turn "waiting."
    Each loop invocation is a fresh session with no later turn to
    resume into; a backgrounded call's results are discarded when
    the runner tears down, and the next tick re-starts the same
    research from scratch. If the research is
    large enough to want backgrounding anyway, persist its
    findings to a scratch note under `plan/` before ending the
    turn, so the next tick can pick up cheaply instead of
    re-researching. Same rule as `skills/digest.md` §3.6/§4.7,
    extended to research sub-agents (not just `verify`/`deploy`).
12. **One phase per invocation — never chain.** Once Step 13's
    PR is open, stop: do not re-open `01_build_plan.md`
    looking for the next `[ ]` row, and do not start a second
    phase's brief/build/commit cycle in the same tick — even
    when the next row is a lettered sibling of the one just
    shipped (e.g. having just shipped `44a`, do not also ship
    `44b`), and even when the job's time budget looks like it
    has room left — chaining ends in a `timeout_minutes` kill. The
    job ceiling is deliberately a per-tick budget cap, not a
    per-phase one (`plan/bearings.md` § Operational notes: "a
    tick that genuinely needs more should be split, not have
    its cap raised silently") — the loop's next tick is the
    mechanism for continuing, not this one running longer.

#### ship-a-phase §8. Reset rules (every R-phase)

Canonical in `plan/revamp/README.md` §5; in short:

1. **Delete, don't park, unless the part plan says park.** Git
   history is the archive for source (D50) and for markdown
   (D66): there is no `plan/archive/`.
2. **Tests go with their subjects** (Step 7).
3. **Carrier rule (D45) runs last.** After removing a carrier,
   remove every glossary/atlas row, glyph, gloss and editor word
   left without one.
4. **Save compatibility** — AGENTS.md § Building a phase ("Save compatibility").
5. **Gates** — Step 9.
6. **Content per surface (D88).** An R-phase re-points and deletes.
   Any phase may author a card, keyword, art, enemy, relic, map, NPC
   or event only where its brief (T-written or T-approved) says to
   (D99).

#### ship-a-phase §9. Missing brief

The loop does not generate briefs (R11). A row without one is not
pickable; the tick files "needs a brief: `/plot <N>`" in
`plan/PHASE_CANDIDATES.md` and returns. T writes briefs with `/plot`
or attended `/plan-a-phase`; the format is `skills/plan-a-phase.md`
§4.

#### ship-a-phase §10. Failure modes — when to actually stop

These are the only conditions that warrant stopping the loop
and asking the user. Everything else: decide, ship, document.

Before any stop: if `scripts/notify.mjs` exists, fire it with
the stop reason (`--priority high`). Best-effort — a failed
notification never becomes its own failure.

Stops come in two shapes. **Repo-shaped** failures (the whole
loop is unsafe to continue) end the tick entirely.
**Phase-shaped** failures (this one phase can't ship; the rest
of the plan is fine) additionally mark the phase row
`[blocked: <short reason> <ISO-date>]` in
`plan/steps/01_build_plan.md`, commit + push that state
change, and return cleanly — the next `/march` tick dispatches
past the blocked row into still-shippable work, and
`/oversight` owns unblocking.

Repo-shaped — stop the tick:

1. **`npm run verify` fails ≥3 times on the same root cause.**
2. **The PR's checks fail ≥3 times on the same root cause**
   after `npm run verify` passes locally. Leave the PR open for
   `pr-autofix`; report it.
3. **`GH_TOKEN` missing or rejected** (no PR can open). Stop and ask
   the user to populate `.env`.
4. **A `git pull` produces a divergence.** Don't `--rebase`
   blind; stop and report.
5. **A deploy fails for an infrastructure reason** (env var
   missing, plugin incompatibility) and the fix isn't local
   code. Stop and report.

Phase-shaped — mark `[blocked: …]`, notify, return:

6. **The phase requires a paid service or API key that isn't
   configured.** Note which env var / runbook is missing in
   the blocked reason.
7. **The design contradicts an engine / save contract or a
   ruled decision (D-number)** in a way you can't reconcile by
   trusting the contract or the ruling.
8. **Phase scope is genuinely ambiguous after reading step 01 +
   the brief + the part plan + bearings + spec.md.** Decide inside
   the brief's bounds and record the call under Decisions; block
   (reason: "brief too thin: `/plot <N>` again") only if even that
   fails. Never rewrite the brief.
9. **The phase can only ship by creating content its brief does not
   authorize** (D88, D99). Name the missing brief in the blocked
   reason.

For everything else: **decide, ship, document.**

