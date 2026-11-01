# Iterate lanes

> This project's own `/iterate` audit dimensions. The kit
> re-syncs `skills/iterate.md` and never touches this file,
> so a dimension only this project audits lives here.

---

`skills/iterate.md` reads this file at one hook, through
`node scripts/plan/lanes.mjs iterate dimensions`, after its
stock dimensions. Each lane is one more dimension, lettered
back from Y (the first lane is Y, the next X, and so on) so
it never meets a stock letter. Its findings score on the
same scale and compete with the stock ones.

One block per lane. `when` is prose (the agent judges it) or
`script <path>` (exit 0 audits the dimension this tick);
absent, it always runs. `run` says what the audit reads and
what a finding looks like. `Lanes off: <name>` in
`plan/bearings.md` turns one off. No lane blocks here means
the stock dimensions only.

The example below sits inside a comment, so it is no lane.
Copy it out of the comment to make it one.

<!--
## lane: cross-links
- hook: dimensions
- when: a page shipped since the last audit
- run: every new page links to two older ones and is linked from one; each gap is a finding
- return: continue
-->

<!-- Moved from the v1 skills/iterate.md by nexus upgrade (2026-11-01): the text the kit never shipped, verbatim. Check each lane's hook and when. -->

## lane: content-content-file-only
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

#### A. Content (`content`, file only)

- Gaps or faults whose fix is new or rewritten content (§3).
  Record them so T sees them; never pick one.

## lane: spec-divergence-contract-drift
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

#### B. Spec divergence / contract drift (`divergence`, `contract`)

- Implementation diverging from the revamp part plans
  (`plan/revamp/`) or a live spec in `axiomancer-mechanics/specs/`.
  Where they disagree the revamp plan wins; a spec marked
  HISTORICAL is not a divergence source.
- Cross-package contracts (types, event shapes) drifting between
  the engine and the mobile app.

## lane: docs-debt-docs-debt
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

#### C. Docs / debt (`docs`, `debt`)

- Stale or missing docs; README drift.
- Known debt: TODO clusters, dead code, duplicated logic.

## lane: navigation-flow-gaps-gap
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

#### D. Navigation / flow gaps (`gap`)

- Screens or routes unreachable or dead-ended in the
  running expo-web build.
- References to content or encounters that don't exist.

## lane: accessibility-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "e. accessibility (a11y)"
- return: continue

#### E. Accessibility (`a11y`)

- Touchables without `accessibilityLabel` / `accessibilityRole`,
  contrast failures, touch targets too small to hit.

## lane: performance-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "g. performance (perf)"
- return: continue

#### G. Performance (`perf`)

- Heavy image assets, bundle size regressions, slow engine or
  simulation paths, needless re-renders in the app.

## lane: roster-health-gap-for-dangling-content
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

#### H. Roster health (`gap` for dangling, `content` for orphans)

Run `npm run roster-health -w axiomancer-mechanics -- --json`
(`World/roster-health.ts`, Phase RH1). Deduplicate against open
AUDIT rows by (lens, id) before filing.

- Each `dangling` finding (a reference to an id that does not
  exist) is a `gap`: impact 6; ease 8 for a one-line delete, 5 for
  a re-point that needs a test edit. The fix deletes or re-points
  the dangling reference and nothing else (D90).
- Each `orphans` finding (nothing in play reaches it) is a
  `content` row, filed only (D88), with `next: needs a brief T
  approves: stage it, grant it, or retire it`. Never picked.
- **Hard rule:** this audit never edits a library, pool, roster or
  dialogue tree. A `gap` fix touches only the dangling reference;
  it never adds or removes a roster entity, and an orphan is never
  staged, granted or retired by the loop.

## lane: scoring-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "scoring"
- return: continue

### Scoring

- Impact 0–10: how many players / screens / packages affected?
- Ease 0–10: cheap fix = 9. New module = 4. Save migration = 1.
- Score = `impact × ease / 10`, clamped 0–10.

Top 1 non-`content` finding wins. Tie-break: cascading
findings, older findings, cheapest-to-ship.

## lane: sync-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 0 — sync"
- return: continue

### Step 0 — Sync

```bash
git switch main 2>/dev/null; git pull --ff-only
```

Check the PR cap (`skills/march.md` §3 "PR cap"). At the cap, run
the audit only (`/iterate audit` behaviour) and report "waiting on
T".

## lane: audit-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 1 — audit (or read latest)"
- return: continue

### Step 1 — Audit (or read latest)

```markdown
# Site audit — <ISO date>

## Top 5 findings (scored)

### [8.1] <one-line description>
- category: <contract | divergence | debt | gap | content | docs | tests | a11y | perf | external-critique>
- impact: <0-10>
- ease: <0-10>
- next: <action — invocation, sub-agent, or follow-up>

### [2.0] roster: relic-bleeding-signet is granted by nothing (item-ungranted)
- category: content
- impact: 4
- ease: -
- next: needs a brief T approves: stage it, grant it, or retire it
```

## lane: pick-the-work-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 2 — pick the work"
- return: continue

### Step 2 — Pick the work

Top scored, skipping any finding an open `loop:pr` PR's title
names (`skills/march.md` §3 "Claims"). Before shipping on a finding a
sub-agent reported, read the whole AUDIT row and the live code: the
gap may already be closed (lesson `verify-gap-claims`). If `/iterate audit`, stop
here.

## lane: mirror-to-github-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 2.5 — mirror to github"
- return: continue

### Step 2.5 — Mirror to GitHub

Open a public GitHub issue mirroring the picked finding **before**
the work starts. The repo's Issues tab becomes a live timeline of
"what the loop is shipping right now"; the issue opens when work
starts and closes when the fix commit, carrying a `Closes #N`
trailer, reaches `main` (the `close-trailers` sweep, Step 5).

```bash
# 1. Build the body file from the finding row.
issue_body=$(mktemp)
cat > "$issue_body" <<EOF
**Source:** <pass description, e.g. "/critique pass 2 (playtester sub-agent)" or "/jot <date>" or "/iterate audit <date>">
**Severity:** <HIGH|MED|LOW> · **Category:** <category from row> · **URL:** <url-or-"general">

## Observation
<verbatim from row's "observation" field>

## Evidence
<verbatim from row's "evidence" field>

## Suggested fix
<verbatim from row's "suggested fix" field>

---
_Tracked by the autonomous loop. The fix lands as a PR whose last commit carries \`Closes #<this-issue>\`; the \`close-trailers\` workflow closes this issue when T merges it._
EOF

# 2. Map row severity → helper flag.
#    [HIGH] → high · [MED] → med · [LOW] → low
# 3. Map row "source" field → helper flag.
#    user → user · playtester → reader · audit/iterate → audit · external → external
#    ("reader" is the helper's label for critique findings, not the archived agent.)
# 4. Map row category → helper category.
#    visual / voice / navigation / mobile / external-critique → enhancement
#    content (copy/content gap) → content
#    a11y → a11y · docs → docs · perf → perf
#    bug-shaped (broken link, regression) → bug
#    Otherwise → enhancement.

# 5. Open the issue.
N=$(node scripts/loop-issue.mjs open \
    --severity <high|med|low> \
    --category <see mapping above> \
    --source <user|reader|audit|external> \
    --title "<one-line summary, ≤ 70 chars>" \
    --body-file "$issue_body")
echo "loop-issue: opened #$N"
```

## lane: delegate-or-implement-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 3 — delegate or implement"
- return: continue

### Step 3 — Delegate or implement

A fix that touches anything outside `plan/`, `telemetry/` and
`docs/reports/` (or `devlog/entries/`) starts on a branch cut from a fresh `origin/main`:
`git fetch origin main && git switch -c loop/iterate-<slug>
origin/main`. A plan-only fix (an AUDIT row correction, a doc under
`plan/`) stays on `main`.

Default delegation:
- Contract / divergence / debt / docs / gap / a11y / tests → main
  agent. The `kb-query` and `axio-query` MCP tools are callable
  directly when a fix needs prior art or an engine fact.
- Performance → main agent; may delegate to `scout` for
  external benchmarking.

## lane: verify-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 4 — verify"
- return: continue

### Step 4 — Verify

```bash
npm run verify
```

## lane: commit-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 5 — commit"
- return: continue

### Step 5 — Commit

Commit subject prefixes:
- `content:` — corrections to existing player-facing text (typos,
  stale names). Never new content (D88).
- `docs:` — documentation.
- `fix:` — bug fixes, broken flows, regressions.
- `a11y:` — accessibility.
- `test:` — test additions or fixes only.
- `perf:` — performance work.
- `refactor:` — structural cleanup, no behavior change.

```
# Trailer in commit body — the close-trailers sweep reads it
- Closes #42
```

The `- Closes #<N>` trailer is **mandatory** in the commit body
when the row carries an issue number; it is the closing mechanism.
GitHub's native parser does not act on it in this repo (Phase 48).
`.github/workflows/close-trailers.yml` sweeps every push to `main`,
reads the closing keywords out of each commit in the range, and
closes the named issues through the API. Multiple issues can be
closed in a single commit by listing one trailer line per issue.

```bash
git add <explicit files>
git commit -m "<category>: <subject>"
```

Push comes in Step 6, after the tick commit, so the PR carries both.

## lane: tick-the-audit-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 6 — tick the audit"
- return: continue

### Step 6 — Tick the audit

```bash
git add plan/AUDIT.md plan/CRITIQUE.md
git commit -m "audit: finding [<id>] addressed" -m "Closes #<N>"
git push -u origin loop/iterate-<slug>
gh pr create --repo "$GH_REPO" --base main --head loop/iterate-<slug> \
  --label loop:pr --label "size:<S|M|L>" --label "area:<area>" \
  --title "<category>: <subject> (AUDIT <id>)" --body-file "$body"
# area:* from the files touched; add --label review:rules-change when the
# fix changes a card, rule, price or tuning value (skills/march.md §3)
```

The tick commit rides the PR, so T's merge ticks the row. The body
follows `skills/march.md` §3 "Landing a change" (no `## Acceptance`
for a fix with no brief); the title names the claim (`AUDIT <id>` or
`CRITIQUE <id>`). A plan-only fix pushes `main` instead and skips
the PR.

## lane: watch-the-pr-s-checks
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

### Step 7 — Watch the PR's checks

```bash
gh pr checks loop/iterate-<slug> --repo "$GH_REPO" --required --watch --fail-fast
```

Right after `gh pr create` the `verify-gate` row is not listed yet, and
`--required --watch` exits at once on "no required checks" (lesson
`checks-not-yet-registered`): poll `gh pr checks <n>` until `verify-gate`
appears, then watch.

Red on this fix: fix on the branch (push, never force), up to 3
same-root-cause tries; then leave it to `pr-autofix` and report it.
If the row carries `- issue: #N`, comment the PR URL on the issue
(best-effort). The issue closes when T merges (`close-trailers`
reads the trailer); `deploy-comment.yml` posts the deploy URL once
`main` is green. Do not call `loop-issue.mjs close-comment` before
the merge.

## lane: retro
- hook: dimensions
- when: as the section below says (moved verbatim from the v1 skills/iterate.md)
- run: the section below
- return: continue

### Step 7.5 — Retro

Run `skills/march.md` §3 "Retro". A lessons commit rides the PR.

## lane: done-notes
- hook: dimensions
- when: as the paragraphs below says (moved verbatim from the v1 skills/iterate.md)
- run: the paragraphs below, which amended the kit's step "step 8 — done"
- return: continue

### Step 8 — Done

Return cleanly with the PR URL. Loop's next tick re-audits.

## Notes from the v1 skills/iterate.md (reference, not lanes)

The v1 skill's own words outside its procedure: what its loop did
and why. No lane runs them; read them when a lane above needs the
context.

## 1. Purpose

A quality pass on already-shipped surfaces: bugs, drift, debt,
docs, tests, accessibility, performance. It fills nothing in —
new content needs a brief T wrote or approved (D88), so a finding
whose fix would be content is **filed, not shipped** (§3). Code
lands by a `loop:pr` PR that T merges (`skills/march.md` §3
"Landing a change").

`/march` dispatches `/iterate` as its default step when nothing
else is due (`skills/march.md` §4 Step 5).

## 2. Invocation

```
/iterate                    # full audit, ship the top finding
/iterate audit              # audit-only; emit plan/AUDIT.md
/iterate <focus>            # bias toward one category (see below)
/loop 1h /iterate           # autonomous improvement loop
```

`<focus>` is one of the §4 category tokens: `external-critique`,
`divergence`, `contract`, `docs`, `debt`, `gap`, `a11y`, `tests`,
`perf`. (`content` is audited but never picked, so it is not a
focus.)

## 3. Autonomy contract

- **Many findings → one shipped fix per tick.** Multi-fix
  commits are unreviewable.
- **No content fixes.** A finding whose fix would create or
  rewrite content — cards, keywords, enemies, relics, maps, NPCs,
  events, art, dialogue or flavor prose — is written to
  `plan/AUDIT.md` with `next: file — content (D88)` and never
  picked; content ships only as a briefed phase (D99 makes cards,
  keywords and art no exception). Correcting a broken
  reference or a typo in existing UI text is a fix, not content.
- **A defect found while shipping is fixed in this tick (D90).** If
  the fix uncovers a separate defect (a broken test, a wrong
  reference, a latent bug on the path you touched), fix it in the
  same PR in **its own commit**, never parked for a later tick. One
  finding per tick still holds for what you *pick*.
- **Trivial fix → still ships through verify.**

## 6. Failure modes

1. **`npm run verify` fails ≥3 times on same root cause.**
2. **The PR's checks fail ≥3 times on same root cause.** Leave
   the PR open for `pr-autofix`; report it.
3. **`GH_TOKEN` missing.**
4. **Finding requires schema migration > 20 records.** Push to
   `/plan-a-spec`.
5. **Finding requires owner-flavored judgment.** Decide it (THE
   OPEN GATE, `plan/bearings.md`, 2026-08-28), file the call to
   AUDIT.md as `[loop-call]` with reasoning, and ship — or, if the
   evidence genuinely cannot support a call this tick, file the
   `[loop-call]` with the leading option named and ship next. A
   call about content or card work is never the loop's: file it
   (§3).
6. **No actionable iterate work** (top non-`content` score
   < 3.0). Read `plan/bearings.md` "Plan expansion posture":
   - **bold** posture → dispatch to `/expand` instead of
     stopping. "Make things brilliant when delivery is not."
     Log "no actionable iterate work — handing to expand" and
     execute `skills/expand.md` procedure end-to-end.
   - **strict** posture → stop and report.
7. **`git pull` divergence.**

## 7. Hard rules

1. **One fix per tick.**
2. **Verify gate must pass.** No `--no-verify`.
3. **No emojis. No attribution trailers** (AGENTS.md rule 2).
4. **No content.** Content findings are filed, never shipped
   (§3, D88, D99).
4a. **Code lands by PR; never merge, close or auto-merge it** (D84,
   D86; the `pr-review.yml` `merge` job alone merges, on a green
   review, D95). One PR per tick.
5. **Don't audit blindly when work is queued.** If
   `plan/CRITIQUE.md` has Pending rows, prefer draining those
   over a fresh audit.
6. **Never delete shipped content silently.** Archive +
   update routing.
7. **Issue mirror is best-effort, not gating.** If
   `loop-issue.mjs open` fails (auth, rate limit, network), note
   `- issue: [mirror-failed: <ISO timestamp>]` on the row and ship
   the fix anyway. Likewise, PR-URL comment failures are warnings,
   not blockers. The mirror is a
   public timeline, not a verification step.

## 8. Quick reference

```bash
# Read
plan/AUDIT.md                            # latest findings
plan/CRITIQUE.md                         # external-critique queue
plan/bearings.md                         # voice + standing decisions

# Sub-agents
Agent({ subagent_type: "scout", prompt: "..." })            # web research

# Verify + branch + commit + PR + checks (skills/march.md §3)
npm run verify
git switch -c loop/iterate-<slug> origin/main
git add <explicit files>
git commit -m "<category>: <subject>"
git push -u origin loop/iterate-<slug>
gh pr create --label loop:pr --label "size:<S|M|L>" --label "area:<area>" --base main ...
gh pr checks loop/iterate-<slug> --required --watch --fail-fast

# Issue mirror
node scripts/loop-issue.mjs open --severity ... --category ... \
  --source ... --title "..." --body-file "$(mktemp)"
node scripts/loop-issue.mjs close-comment --number N --commit SHA \
  --deploy-url <ci-run-url>
```
