# Skill: expand

> **Plan-expansion pass.** Read accumulated signals and propose
> new phase candidates to `plan/PHASE_CANDIDATES.md`. The build
> plan ships well; this skill is how it *grows* well.
>
> **Posture-controlled.** Default is **bold** — the skill runs
> on schedule and surfaces candidates. Set to **strict** in
> `bearings.md` to make `/expand` a no-op (build plan grows only
> via manual `/plan-a-phase` or `/oversight`).

## 1. Purpose

The autonomous loop is good at consuming the build plan. It is
bad at noticing when the project has *outgrown* its plan:

- An audit finding scores 9 but can't ship in one fix.
- 4 GitHub issues all gesture at the same missing surface.
- The data layer grew records the plan never anticipated.
- A new design export landed that has no phase to integrate.
- `spec.md` was edited and the change implies new phases.

`/expand` is the lens that catches these patterns. It does
**not** abandon the spec or pre-empt deliveries. It surfaces
**candidates**; `/oversight` decides which become real phases.

The point isn't "ship more." The point is "notice when reality
has overtaken the plan."

## 2. Invocation

```
/expand                       # full pass — read signals, file candidates
/expand audit                 # bias toward AUDIT.md findings
/expand spec                  # bias toward spec drift
/expand design                # bias toward new design exports
/expand dry-run               # report candidates; do not commit
```

`/march` invokes `/expand` when its expand gate is due, and
`/iterate` falls through to `/expand` when its audit produces no
actionable findings. Both gates live in one place: `skills/march.md`
"Gates (the one home)".

## 3. Posture (read from `bearings.md`)

`bearings.md` should contain a section:

```markdown
## Plan expansion posture

- Mode: **bold** (default)
```

Two settings:

- **bold** (default) — `/expand` runs when its gate is due.
  Candidates land in `plan/PHASE_CANDIDATES.md`. `/oversight`
  promotes.
- **strict** — `/expand` is a **no-op**. Print
  `"expand: strict posture — skipping"` and exit 0. The
  `/march` dispatcher skips the expand gate entirely.

`/expand` never writes to `plan/steps/01_build_plan.md`; only
`/oversight` promotes a candidate to a phase.

If the bearings section is missing, default to **bold** and add
the section in the same commit (`bearings: add expand posture
(default bold)`).

## 4. Signal sources

Read in parallel where possible. Each finding type maps to
different "expansion shapes":

### A. Audit findings too big to be fixes

`plan/AUDIT.md` Pending rows. Shape:
- `impact ≥ 8` AND `ease ≤ 4` → too big for one tick.
- 3+ findings under the same category → suggests a refactor
  phase, not 3 fixes.

### B. Critique findings clustered

`plan/CRITIQUE.md` Pending rows. Shape:
- 3+ HIGH findings on the same URL/family → restructure phase.
- Repeated mobile-reflow findings across pages → "mobile audit"
  phase.

### C. Triage backlog patterns

GitHub issues labeled `triage:loop-queued` (or `triage:reviewed`)
sitting in queue. Shape:
- 4+ issues asking for the same feature → propose that feature
  as a phase.

### D. Spec drift

`git log -p --since="<last expand pass>" -- spec.md`. If the
spec has changed since the last expand pass:
- New feature paragraphs → propose phases for them.
- New non-goals removed → look for phases the loop avoided that
  may now be in scope.
- Audience or scope expansion → flag as a meta-candidate (may
  reshape multiple phases).

### E. Design landings

New / modified files in `axiomancer-mechanics/specs/`:
- A spec for a mechanic / character / story beat / region that
  doesn't have a phase → propose the phase.
- Spec modifications → check against `bearings.md`; propose
  alignment work.

**Excluded:** `axiomancer-mechanics/braindump/` (HISTORICAL) and
any spec marked HISTORICAL (in its own header or in the
`axiomancer-mechanics/specs/README.md` index). They are records,
not signals.

### F. Content growth

Game content vs. when the plan was written:
- A content family (encounters, dialogue, items) grew far past
  what the planned surfaces assume → may warrant its own
  surface that wasn't planned.
- Cross-reference graphs that grew complex → may warrant a
  browse / codex phase.

### G. Commit-pattern signals

`git log --since="<last expand pass>" --pretty=format:'%s'`:
- 5+ commits in a row touching the same surface with `fix:` →
  may be a refactor candidate.
- A phase that took 3+ retries to ship → may have been
  underspec'd; propose a brief-refresh phase.

### H. Existing plan gaps

`plan/steps/01_build_plan.md` review:
- Phases marked `[skipped]` — may now be ship-able if context
  changed.
- Cross-cutting phases (polish, perf) sitting at the end with
  many sub-tasks accumulated — may warrant a split.

### I. Knowledge-base reception evidence

The KB corpus, via the `kb-query` MCP tools (`kb_find_games`
filtered by better-if label, `kb_search`) — the only route to it; no
local snapshot exists. See AGENTS.md § Truth sources. Shape:
- A reception complaint recurring across 3+ corpus games (e.g.
  runaway-leader, onboarding friction, dead turns) that
  Miserere Mei, Deus's shipped systems plausibly share → propose a
  phase that addresses it before players file it themselves. Cite the
  `kb:<game-slug>/<doc> (src-NNN)` receipts as the signal.
- A wishlist gap the loop filed (a `wishlist`-labeled issue on
  `no-trbl-2-u/game-knowledge-base`) that the KB's scout has since
  answered with coverage → the design work it was filed for may now
  be unblocked; re-propose it.

## 5. Scoring candidates

Each candidate gets `expand_score` 0–10:

| Factor | Adjustment |
|---|---|
| Signal multiplicity (≥2 source types pointing same way) | +1 to +3 |
| Urgency (spec/design changed in last 7 days) | +2 |
| Cheap-and-impactful (estimated 1 phase, high-leverage surface) | +2 |
| Expensive-or-uncertain (estimated 3+ phases or unclear scope) | -2 |
| Conflicts with `bearings.md` URL contract or non-goals | -3 |
| Conflicts with `spec.md` non-goals (explicit "we don't do this") | -5 (drop unless score still > 3) |

Top **3 candidates per pass** ship. Others get a one-line note
under `## Considered (below threshold)` for the next pass to
re-evaluate.

## 6. The procedure

### Step 0 — Re-sync

```bash
git pull --ff-only
```

Read `bearings.md` for posture. If **strict** → exit 0
immediately with a one-line log. No commit.

### Step 1 — Read signals (in parallel)

Per §4. Each source is a separate read; main agent merges.

### Step 2 — Synthesize candidates

For each signal cluster, draft a candidate:

```markdown
### [ ] [score X.Y] <one-line description>
- proposed: <ISO date>, expand pass <N>
- source signals:
  - <signal 1>
  - <signal 2>
- rationale: <why this is real, not noise>
- proposed scope: <1-phase | N-phase mini-plan>
- estimated phases: <N>
- conflicts: <with spec / contract / existing plan; or "none">
```

Score per §5. Sort. Take top 3.

### Step 3 — Self-assess

For each top candidate, ask:

1. **Is this real demand or model imagination?** Multiple
   independent signals = real. One audit row = wait.
2. **Does it conflict with `spec.md` non-goals?** If yes, drop
   unless the user has explicitly broadened scope.
3. **Is the scope honest?** "Add comments" = N phases minimum;
   don't pretend it's one.
4. **Does the loop have the capacity to ship this?** A
   candidate that requires schema migration of 100 records
   deserves to be phase-promoted but only by `/oversight`.
5. **Which content surface? (the D88 filter)** A candidate for a
   **card, keyword, art** (D99), **enemy, relic, map, NPC or event**
   may be filed (D89: bold proposes from every source), marked `[content]`, with the line
   "built only once T plots it (`/plot`) or `/oversight` promotes it
   with a brief T approves". It is never built from the candidate
   alone.

After assessment, you should have **2–4 candidates**, not 3
mechanically.

### Step 4 — Write to `PHASE_CANDIDATES.md`

Append under `## Pending`. Update metadata header (last pass,
pass count).

### Step 5 — Commit + push

```bash
git add plan/PHASE_CANDIDATES.md
git commit -m "$(cat <<'EOF'
expand: pass <N> — <K> candidates filed

Top candidates:
- [score X.Y] <one-line>
- [score X.Y] <one-line>

Source signals: <brief — audit / critique / triage / spec / design / data / commits>.
Posture: bold. Promotion gated by /oversight.
EOF
)"
git push origin main
```

If **zero** candidates score above threshold: still update the
metadata header, commit `expand: pass <N> — no candidates`. The
pass counter is what `/march` reads to rate-limit.

### Step 6 — Confirm deploy

```bash
npm run deploy:check
```

Plan-only commits trigger rebuilds; verify no regression.

### Step 7 — Done

Print 3-line summary:

```
expand pass <N>: <K> candidates filed (<L> dropped below threshold).
plan/PHASE_CANDIDATES.md updated.
oversight will review and promote.
```

## 7. Hard rules

1. **Never modify code.** Plan adjustments only.
2. **Cap at 3 filed candidates per pass.** Boldness != flooding.
3. **Don't promote spec non-goals silently.** If spec.md says "no
   comments thread" and external signals demand one anyway, the
   loop DECIDES (THE OPEN GATE, `plan/bearings.md`, 2026-08-28):
   either uphold the spec (default) or amend the spec in the same
   pass with the evidence, filing the call as `[loop-call]` in the
   candidate's `conflicts` field for after-the-fact review.
4. **Cite the signals.** Every candidate must list ≥1 concrete
   signal source (audit row, critique finding, issue number,
   spec diff line, design file, kb reception doc with its
   src-NNN).
5. **Honest scope.** A 3-phase candidate is not a 1-phase
   candidate just because that fits more comfortably.
6. **One commit per pass.**
7. **No emojis. No attribution trailers** (AGENTS.md rule 2).
8. **Strict posture is real.** If posture is `strict`, exit 0
   with no-op. Don't sneak candidates in.
9. **Content candidates per surface (D88, D89, D99).** A card,
   keyword, art, enemy, relic, map, NPC or event candidate is filed
   `[content]` and waits for T
   (§6 Step 3, question 5). `/expand` is plan-only: it pushes
   `main` and never opens a PR.

## 8. Failure modes

1. **Posture not in `bearings.md`.** Default to bold; add the
   section in the commit. Not a failure.
2. **`git pull` divergence.** Stop and report.
3. **No signals to expand on** (very early in the project,
   nothing has moved). Update metadata, commit "no candidates,"
   exit 0.
4. **All candidates conflict with spec.** Decide per hard rule 3
   (THE OPEN GATE): uphold or amend, file `[loop-call]` rows.

## 9. When `/march` invokes `/expand`

The dispatch conditions (posture, commit/time spacing, signal
check, and `/iterate`'s fall-through) live in `skills/march.md`
"Gates (the one home)". Do not restate them here.

## 10. Quick reference

```bash
# Read
plan/bearings.md                              # posture
plan/AUDIT.md                                 # audit signals
plan/CRITIQUE.md                              # critique signals
plan/PHASE_CANDIDATES.md                      # current state
plan/steps/01_build_plan.md                   # existing phases
spec.md                                       # spec drift

# Git diffs (signals)
git log -p --since="<last pass>" -- spec.md
git log -p --since="<last pass>" -- axiomancer-mechanics/specs/   # skip HISTORICAL specs
git log --since="<last pass>" --pretty=format:'%s'

# Issues (signals — if gh available)
gh issue list --repo $GH_REPO --label "triage:loop-queued" --json number,title

# Write
plan/PHASE_CANDIDATES.md                      # candidates (never the build plan)

# Commit + push + confirm
git add <files>
git commit -m "expand: pass <N> — ..."
git push origin main
npm run deploy:check
```
