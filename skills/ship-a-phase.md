# Skill: ship-a-phase

> **Full autonomy.** When invoked (manually, via `/ship-a-phase`,
> or under `/loop` / `/march`), you have authority to ship one
> phase of the build plan end-to-end with **no design checkpoint**:
> build, write tests, run the verify gate, commit, open a PR, watch
> its checks. T reviews and merges the PR (D84, D86); the loop never
> merges its own work.
>
> **The bar for asking is high.** If you would have asked, decide
> instead and document the call in the commit body. Stop only on
> §10 below.

## 1. Purpose

`plan/steps/01_build_plan.md` carves the build into phases. Each
phase is one self-contained slice that ships end-to-end: code +
tests + commit + a `loop:pr` PR onto `main` (the CI gate runs on
the PR). Pickable rows are the briefed, unattended `[ ]` rows
(`skills/march.md` §3 "Pickable phase"); briefs come from T through
`/plot` or attended `/plan-a-phase`.

This skill drives the build **autonomously, in a loop**, so a
single overnight run can move the project forward by several
phases.

## 2. Invocation

```
/ship-a-phase                       # next [ ] phase
/ship-a-phase phase 8               # specific phase by number
/ship-a-phase phase 8 dry-run       # read the brief, print the plan, no commit
/loop 30m /ship-a-phase             # autonomous, every 30 min
/loop /ship-a-phase                 # autonomous, self-paced
/march                              # outer dispatcher (preferred)
/loop /march                        # the autonomous-beast endgame
```

When invoked from `/loop` or `/march`, **do not pause for
review**. After the PR is open and its checks are watched, return
cleanly.

## 3. Autonomy contract

The user's standing instruction: **"more get-it-done, less ask
me questions."** Internalize this:

- **Design / scope ambiguity → decide.** Pick the choice most
  consistent with the phase's part plan (`plan/revamp/<area>.md`),
  its decisions (D-numbers in
  `plan/2026-09-25-refactor-strategy.decisions.md`), the canonical
  sibling phase and `bearings.md`.
  Document the call in the commit body under "Decisions". Never
  block.
- **Empty / missing content → render the empty state and ship.**
- **Missing brief → do not build.** The loop never authors a
  brief (R11). File one `plan/PHASE_CANDIDATES.md` row "needs a
  brief: `/plot <N>`" (skip if it exists) and return.
- **Verify failure → read the log + patch.** Iterate up to 3
  times on the same root cause.
- **Red PR check → same as verify.** Up to 3 same-root-cause
  iterations on the branch; past that, `pr-autofix` takes it.
- **External research needed → spawn a sub-agent.** Don't pollute
  main context with citations and source pages.

The only conditions that warrant stopping are §10.

## 4. Delegation

Spawn sub-agents aggressively. They protect main-agent context
and parallelize independent work.

- **`scout`** — every external research need.
- **`playtester`** — when the phase needs the running app driven
  and observed. See `.claude/agents/` for what else exists; the
  archived design agents (banner) are not options.
- **Parallel calls** when work is independent.

A design or balance decision is made inline by the main agent and
consults the truth-source MCPs first (AGENTS.md § Truth sources):
`axio-query` for the engine's live card/effect/keyword facts and
`kb-query` for external prior art, cited
`kb:<game-slug>/<doc> (src-NNN)`. A Decisions bullet with a
receipt beats one argued from model memory.

The main agent's job is wiring, code, decisions. Delegate
research.

## 5. The phase shape

A phase touches one or more of the monorepo's workspaces:

- `axiomancer-mechanics/` — the engine and all game data
  (`src/Cards`, `src/Combat`, `src/Enemy`, `src/Game`, `src/World`,
  …), vitest suites colocated.
- `axiomancer-mobile/` — the Expo app; it reads the engine through
  the `@mechanics` alias, jest suites colocated.

Its scope is the build-plan row plus the part plan it names. An
R-phase follows the reset rules in `plan/revamp/README.md` §5 (see
§8 below). Use the closest already-shipped phase touching the same
code as the canonical sibling for patterns; build any missing
helper in the package that owns it, tests colocated.

## 6. The procedure

### Step 0 — Re-sync state

```bash
git switch main 2>/dev/null; git pull --ff-only
```

If divergence, stop per §10. Then check the PR cap
(`skills/march.md` §3 "PR cap"): at 5 open `loop:pr` PRs, report
"waiting on T" and return without building.

### Step 1 — Pick the phase

Read the "Status (at-a-glance)" block at the top of
`plan/steps/01_build_plan.md`. The next phase is the first
**pickable** row per `skills/march.md` §3 "Pickable phase": `[ ]`,
not attended, `Requires` ticked, has a brief, and no open `loop:pr`
PR names it. If the user passed `phase N`, ship that one regardless
of order (an attended session may ship an attended row). Skip rows
marked `[skipped]` (set by `/oversight`) and `[blocked: …]` rows —
the owner-led B-rows are `[blocked: owner-led]` and the loop never
starts them (D88).

### Step 2 — Read the brief

`plan/phases/phase_<N>_<topic>.md` (or the part-plan section the
row points to). If missing, the row is not pickable: file "needs a
brief: `/plot <N>`" and return (§3 above). Note the brief's
acceptance IDs (`A1…`) and its `Measure:` line; the PR body ticks
the IDs this phase closes.

**A row pointing at `§ <id>` of a shared brief** (one of several
phases `/plot` split a task into, D93) builds only that phase: read
the brief's shared sections (Sources, Outcome, Acceptance, Decisions)
and its own `### <id>` block under `## Phases`. Scope, Tests matrix
and Verify gate come from that block; the acceptance IDs it
`closes` are the only ones the PR ticks, and its own `Measure:`
line is the one to prove. Another phase's block is out of scope even
when the same files are open: it ships on its own tick (§7 rule 12).

### Step 2.4 — Claim check: is another tick already on this phase?

`/march` runs from more than one place — this session's `/loop`, the
scheduled CI cron, an attended session. Two ticks that pick the same
`[ ]` row build the same phase twice, and their edits collide in the
files the phase owns.

An open `loop:pr` PR whose title names `phase <N>` is the claim
(`skills/march.md` §3 "Claims"): if one exists, skip the row. The
mirror issue is the second, older claim for a tick that has not
opened its PR yet. Before starting work, check whether one is
already open **and recent**:

```bash
claimed=$(gh issue list --repo "$GH_REPO" --state open \
  --search "Phase <N> — in:title" --json number,createdAt \
  --jq '.[0] | select(. != null) | "\(.number) \(.createdAt)"')
```

- **No open mirror** — proceed; Step 2.5 opens it and the claim is yours.
- **Open mirror, created within the last ~2 hours, and this tick has
  not yet pushed a commit for the phase** — another tick is mid-flight.
  Do NOT build it. Skip to the next unclaimed `[ ]` row and note the
  skip in your summary. Racing produces two briefs, two mirrors, and a
  merge conflict in whatever the phase touches.
- **Open mirror, older than that** — a previous tick started and did not
  finish. Adopt it: the helper reuses the number, so continue the work.

A brief you already pushed for a phase you are yielding gets removed in
the same tick — two briefs for one phase is worse than none.

### Step 2.5 — Mirror the phase to GitHub

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

### Step 3 — Read the design + canonical sibling

```bash
# Design inputs
cat plan/revamp/<area>.md                           # the part plan the row names
cat plan/revamp/README.md                           # zero-state, reset rules, order
grep -n "D<nn>" plan/2026-09-25-refactor-strategy.decisions.md   # each decision it cites
ls axiomancer-mechanics/specs/                      # formal specs, if any touch this code
```

The part plan and its decisions are the design. Specs marked
HISTORICAL and `braindump/` are background, never authority; where
they disagree with a ruling, `docs/truth-sources.md` § hierarchy
decides. If nothing beyond the part plan covers the change,
proceed on the brief + canonical sibling + bearings and note it
in commit-body Decisions.

When the phase moves balance numbers or re-points or deletes game
data (cards, keywords, enemies, maps, events, dialogue), also pull
the truth sources first: `axio_overview` / `axio_cards` /
`axio_effects` / `axio_keywords` for the engine's own current
facts, and `kb_search` / `kb_find_games` / `kb_cards` /
`kb_keyword` for external prior art worth citing in the brief or
commit body. `axio-query` is an accelerator, not a dependency —
grep the libraries directly when it is absent or erroring.
`kb-query` is the only route to the external corpus: when it is
absent, the prior art is UNGROUNDED and must be labeled so.

### Step 4 — Build

Cut the branch first: `git fetch origin main && git switch -c
loop/ship-<N>-<slug> origin/main` (Step 10, `skills/march.md` §3
"Landing a change"). Every edit from here lands on it. Never build in
a tree another loop is using; on a shared machine work from your own
`git worktree` (lesson `shared-tree-sweep`).

Follow the part plan and the canonical sibling's patterns. Game
data and rules live in `axiomancer-mechanics/src/*`; mobile reads
them through the `@mechanics` alias and never duplicates engine
data in a component.

For each new data read pattern, add a helper to the package that
owns the data, with colocated tests.

### Step 5 — Wire the surface

Update every consumer of what changed: engine exports
(`axiomancer-mechanics/src/index.ts`), mobile screens and
navigation, catalog/devlog exporters. Anything removed from a player's save ships with a
migration in `axiomancer-mechanics/src/Game/game.migrate.ts` and a
test (`plan/revamp/README.md` §5 rule 4).

### Step 6 — Output schema / contracts (where applicable)

Keep shared type contracts, event shapes, and save-data
schemas in sync per the brief's output-schema section.

### Step 7 — Tests

- **Mechanics:** vitest suites colocated with the code they pin.
- **Mobile:** jest suites colocated; the `e2e:*` scripts are the
  hermetic UI legs and run in CI (`verify-mobile.yml`).
- **Tests go with their subjects.** A test pinned to a deleted
  thing is deleted or rewritten to the survivors; never weaken a
  test to keep a deleted thing alive (`plan/revamp/README.md` §5
  rule 2).

### Step 8 — Reset-rule pass (R-phases)

Before verifying an R-phase, walk §8: delete rather than park
unless the part plan says park, run the carrier sweep last, and
confirm nothing new was authored. Non-R phases skip this step.

### Step 9 — Verify gate

Scope the gate to the workspace(s) the phase touches
(`plan/bearings.md` § Verify gate):

```bash
npm run verify --workspace axiomancer-mechanics
npm run verify --workspace axiomancer-mobile
npm run verify                                      # both, when in doubt
```

A change to mechanics' public surface also runs the mobile gate
— the `@mechanics` alias couples them. Any change to source also
runs root `npm test`: its `check-comments` lint rejects a decision
number (`D88`) in a code comment, and the workspace gates never run it
(lesson `brief-dnum-in-comments`). An R-phase additionally runs the revamp gates
(`plan/revamp/README.md` §5): root `npm test`,
`npm run lint:content` and `node scripts/check-lexicon.mjs`.
`baseline:check` is retired (D57). All legs are hard. Iterate up
to 3 times on the same root cause; otherwise stop per §10.

### Step 10 — Branch, commit, open the PR

Land it per `skills/march.md` §3 "Landing a change". The branch
`loop/ship-<N>-<slug>` is cut from a fresh `origin/main` before
Step 4's first edit (do it there; it is described here once).

Stage explicitly. Conventional subject; body in 4–8 bullets
describing what shipped + what the user can now do, plus a
"Decisions" section listing autonomous design calls.

```bash
git add <explicit files>
git commit -m "<type>: <one-line summary> — phase <N>" -m "<bullets + Decisions>"
```

**No attribution trailers. No emojis** (AGENTS.md rule 2).

### Step 11 — Tick the DoD (inside the PR)

The build-plan row stays `[ ]` with a `- pr: #<PR>` field (the
`- issue:` field's shape) while the PR is open. The PR's **last
commit** flips it to `[x] (#<PR>)` so T's merge ticks it, and in the
same commit re-derives the deadline Items' Status cells: if the flip
finishes an Item, `scripts/check-deadlines.mjs` fails the root `npm
test` until `plan/deadlines.md` says so (phase DL1b):

```bash
node scripts/deadlines.mjs --write && git checkout -- LIVE_DEADLINES.md
git add plan/steps/01_build_plan.md plan/deadlines.md
git commit -m "plan: phase <N> shipped — <one-line>" -m "Closes #<phase-issue-number>"
git push -u origin "loop/ship-<N>-<slug>"
gh pr create --repo "$GH_REPO" --base main --head "loop/ship-<N>-<slug>" \
  --label loop:pr --label "size:<S|M|L>" --label "area:<area>" \
  --title "<type>: <summary> — phase <N>" --body-file "$body"
# area:* from the files touched (several if the phase spans areas); add
# --label review:rules-change when the phase changes cards, rules, prices
# or tuning values (skills/march.md §3 "Area and review labels")
```

The body follows the template in `skills/march.md` §3: What shipped,
What T can now do, Decisions, Acceptance (the brief's `A1…` IDs this
phase closes, ticked, each naming its proof or `(no test: <reason>)`;
`verify-gate` fails an unproven line, phase LG1c), Verify (the Step 9 commands and results), and
`Closes #<phase-issue-number>` as the last line. Record the PR number
on the row in the same commit if you know it, or leave `- pr:` for
the next tick to fill.

### Step 12 — Watch the PR's checks

```bash
# Checks take a few seconds to register after a push; --watch before then
# exits 0 on "no checks reported" (lesson `checks-not-yet-registered`).
until gh pr checks "<PR>" --repo "$GH_REPO" 2>/dev/null | grep -q .; do sleep 5; done
gh pr checks "<PR>" --repo "$GH_REPO" --watch --fail-fast
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

### Step 12.5 — Phase mirror comment

If Step 2.5 captured `$PHASE_ISSUE`, comment the PR URL on the
mirror (best-effort):

```bash
gh issue comment "$PHASE_ISSUE" --repo "$GH_REPO" --body "PR opened: <pr-url>"
```

The mirror closes when T merges: `close-trailers` reads the
`Closes #<N>` trailer from the merge push's commit range, and
`deploy-comment.yml` posts the deploy URL once `main`'s `verify-*`
runs go green. Do not call `loop-issue.mjs phase-close` before the
merge.

### Step 12.9 — Retro

Run `skills/march.md` §3 "Retro" for this tick. A lessons commit
rides the PR (push it to the branch).

### Step 13 — Done

Return cleanly with the PR URL. The loop's next tick picks up the
next unclaimed phase. If you ran outside the loop, summarize what
shipped + what's next in 2–3 lines. Do not pick up another `[ ]` row in this same
invocation — see §7 Hard Rule 12.

## 7. Hard rules

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
9. Product title is "Miserere Mei, Deus" in player/doc-facing prose (the
   `axiomancer-*` workspaces, repo and scheme keep the former title as
   internal identifiers); VITAE copy canon. **VITAE is the one
   bar:** emptying the foe's VITAE wins; befriending through The Open
   Hand (the Suppliant's Ring signature, made a real befriend in R4)
   opens the mercy choice, the only non-lethal ending (D47, D63).
   RELENT and CONDEMN are cut (R7 deletes their engine code); never
   reintroduce them or Pressure Tracks <!-- lexicon-ok: pressure-tracks, retired-keyword -->
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

## 8. Reset rules (every R-phase)

Canonical in `plan/revamp/README.md` §5; in short:

1. **Delete, don't park, unless the part plan says park.** Git
   history is the archive for source (D50) and for markdown
   (D66): there is no `plan/archive/`.
2. **Tests go with their subjects** (Step 7).
3. **Carrier rule (D45) runs last.** After removing a carrier,
   remove every glossary/atlas row, glyph, gloss and editor word
   left without one.
4. **Save compatibility** — a migration plus a test for anything
   removed from a save (Step 5).
5. **Gates** — Step 9.
6. **Content per surface (D88).** An R-phase re-points and deletes.
   Any phase may author a card, keyword, art, enemy, relic, map, NPC
   or event only where its brief (T-written or T-approved) says to
   (D99).

## 9. Missing brief

The loop does not generate briefs (R11). A row without one is not
pickable; the tick files "needs a brief: `/plot <N>`" in
`plan/PHASE_CANDIDATES.md` and returns. T writes briefs with `/plot`
or attended `/plan-a-phase`; the format is `skills/plan-a-phase.md`
§4.

## 10. Failure modes — when to actually stop

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

## 11. Quick reference

```bash
# Where you read
plan/steps/01_build_plan.md                  # status + scope
plan/phases/phase_<N>_<topic>.md             # brief
plan/revamp/<area>.md                        # the part plan (design)
plan/revamp/README.md                        # zero-state, reset rules, order
plan/2026-09-25-refactor-strategy.decisions.md  # D-numbers
plan/bearings.md                             # stack + conventions
axiomancer-mechanics/specs/                  # design specs (optional; HISTORICAL ones are background)
spec.md                                      # product spec

# Sub-agents
Agent({ subagent_type: "scout", prompt: "..." })
Agent({ subagent_type: "playtester", prompt: "..." })

# Truth-source MCPs (main agent holds the grants)
# axio-query: axio_overview / axio_cards / axio_effects / axio_keywords
# kb-query:   kb_overview / kb_find_games / kb_search / kb_read_doc / kb_cards / kb_keyword

# Verify (scoped) + branch + commit + PR + checks (skills/march.md §3)
npm run verify --workspace <pkg>
git switch -c loop/ship-<N>-<slug> origin/main
git add <explicit files>
git commit -m "<subject>"
git push -u origin loop/ship-<N>-<slug>
gh pr create --label loop:pr --label "size:<S|M|L>" --label "area:<area>" --base main ...
gh pr checks loop/ship-<N>-<slug> --watch --fail-fast
```
