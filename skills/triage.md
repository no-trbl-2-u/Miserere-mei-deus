# Skill: triage

> **Issue review for the autonomous loop.** Read open GitHub
> issues, classify, label, comment, route to the right backlog.
> **If there are no unlabeled issues, exit fast** — that's
> "keep humming."

## 1. Purpose

GitHub issues are the user's primary inbox to the loop. Without
triage, they pile up. With triage:

- User files an issue.
- Next `/march` tick reviews it, labels it, comments, routes
  it.
- Subsequent `/iterate` ticks drain the backlog.
- Addressing commit closes the issue automatically.

Cheap when idle (zero issues → exits in <1s). Non-blocking
when busy.

## 2. Invocation

```
/triage                       # all unlabeled open issues
/triage <issue-number>        # focused pass
/triage all                   # re-evaluate every open issue
/triage dry-run               # classify + report, no labels/comments
```

`/march` invokes `/triage` as the first dispatch step (cheapest
gate). Manual invocation also fine.

## 3. Auth

Triage needs `gh` CLI authenticated. The PAT lives in `.env`:

```
GH_TOKEN=github_pat_...
GH_REPO=no-trbl-2-u/Miserere-mei-deus           # optional; defaults to no-trbl-2-u/Miserere-mei-deus
```

`gh` auto-reads `GH_TOKEN`. Before any `gh` call, ensure env is
loaded:

```bash
export GH_TOKEN=$(awk -F= '/^GH_TOKEN=/ {sub(/^GH_TOKEN=/, ""); print; exit}' .env)
export GH_REPO=$(awk -F= '/^GH_REPO=/ {sub(/^GH_REPO=/, ""); print; exit}' .env)
GH_REPO=${GH_REPO:-no-trbl-2-u/Miserere-mei-deus}
gh auth status >/dev/null || { echo "GH_TOKEN missing/invalid"; exit 3; }
```

If `gh auth status` fails, exit per §8.

## 4. Label scheme

Triage applies one `triage:*` label to every processed issue.
Labels are the state — already-labeled issues skipped on
default pass.

| Label | Meaning |
|---|---|
| `triage:loop-queued` | The loop will address. Routed into the right backlog. |
| `triage:closed` | Won't fix / duplicate / spam. Issue is closed with a comment. |
| `triage:reviewed` | Seen but no action this pass. Re-eval on `/triage all`. |

There is no `triage:needs-user` route. THE OPEN GATE (2026-08-28,
`plan/bearings.md`) abolished owner gates: the loop decides and
documents the call. An issue still carrying the legacy
`triage:needs-user` label is not skipped by Step 1; re-route it
per Step 2 and remove the old label.

Plus a category label paired with `triage:loop-queued`:

- `bug`, `enhancement`, `content`, `docs`, `a11y`, `perf`

Auto-create labels on first encounter via `gh label create`
(idempotent).

## 5. The procedure

### Step 0 — Pre-flight

Load env, verify auth (§3). Exit 3 if missing.

### Step 1 — List candidates

```bash
gh issue list \
  --repo "$GH_REPO" \
  --state open \
  --search "-label:triage:loop-queued -label:triage:closed -label:triage:reviewed -label:loop:opened" \
  --json number,title,body,labels,author,createdAt,updatedAt,comments \
  --limit 50
```

The `-label:loop:opened` clause excludes issues the loop opened on
itself (per-finding mirror via `loop-issue.mjs open`, per-phase
mirror via `phase-open` — phase issues carry both `loop:opened`
and `loop:phase`, so this single exclusion catches both). Those
have a known provenance and don't need triage labeling.

If `[]`: print `"triage: 0 unlabeled open issues — humming
on."` and exit 0 **without committing anything**.

**The concierge lane:** additionally list open issues labeled
`loop:do` — the user's "this one, now" flag. They are
candidates even if already triaged. Route them per Step 2 at
[HIGH] with `- priority: user-flagged (loop:do)` on the
backlog row (worth +2 when `/iterate` scores it), comment that
the issue jumped the queue, then **remove the `loop:do`
label** — it is a signal, not a state.

### Step 2 — Classify each issue

For each issue, decide:

1. **Category**: `bug` | `enhancement` | `content` |
   `docs` | `a11y` | `perf`.
2. **Routing**:
   - `triage:loop-queued` if the loop can address it.
   - `triage:closed` if duplicate / spam / won't-fix.
   - `triage:reviewed` if waiting on something else, including
     every request that would need new content (item 4).

   Where a call is unclear, make the most reasonable one and say
   why in the comment. Nothing is parked for a user decision.
3. **Backlog target** (only `loop-queued`):
   - bug / a11y / perf / content / docs (including data-ish
     issues — game data, balance numbers) → `plan/AUDIT.md`
   - small enhancement → `plan/steps/01_build_plan.md`
     carry-overs section
   - large / off-strategy enhancement → a candidate in
     `plan/PHASE_CANDIDATES.md` citing the issue (`/expand`
     and `/oversight` weigh it there)
4. **Content filter (D88, D99).** A request for a new **card,
   keyword, art, enemy, relic, map, NPC or event** becomes a `[content]` candidate in
   `plan/PHASE_CANDIDATES.md` citing the issue, labelled
   `triage:loop-queued`, with a comment that it is built only once
   T plots it. A fix to existing content (a wrong gloss, a broken
   foe) is a normal `content` bug and routes to `plan/AUDIT.md`.

### Step 3 — Apply labels + comment + (close)

```bash
gh issue edit "$NUM" --repo "$GH_REPO" --add-label "triage:loop-queued,bug"

gh issue comment "$NUM" --repo "$GH_REPO" --body "$(cat <<'EOF'
Triaged → bug. The loop will address this; tracked in
[plan/AUDIT.md](https://github.com/no-trbl-2-u/Miserere-mei-deus/blob/main/plan/AUDIT.md)
under external-issue category. A future /iterate tick will ship
the fix and reference this issue's number in the commit body.
EOF
)"

# Only for triage:closed:
gh issue close "$NUM" --repo "$GH_REPO" --reason "not planned"
```

### Step 4 — Append to the backlog

`plan/AUDIT.md` Pending row:

```markdown
### [user-issue #<N>] [HIGH|MED|LOW] <title>
- category: external-issue
- impact: <0-10>
- ease: <0-10>
- next: /iterate will pick up; reference #<N> in commit body.
```

### Step 5 — Commit + push (if any backlog changes)

```bash
git add plan/AUDIT.md plan/steps/01_build_plan.md plan/PHASE_CANDIDATES.md
git commit -m "$(cat <<'EOF'
triage: <K> issues processed (<L> queued, <M> reviewed, <N> closed)

- #<num> → loop-queued (bug, plan/AUDIT.md)
- #<num> → loop-queued (enhancement, plan/PHASE_CANDIDATES.md)
- #<num> → reviewed (content request, waits for an owner-led session)
- #<num> → closed (duplicate of #X)

Labels applied. Comments posted on each.
EOF
)"
git push origin main
```

If no file changes (all `triage:closed` or `triage:reviewed`),
**no empty commit** — exit with a one-line summary.

### Step 6 — Confirm deploy

```bash
npm run deploy:check
```

### Step 7 — Done

```
triage processed: <K>. queued: <L>. reviewed: <M>. closed: <N>.
plan/AUDIT.md +<X> rows.
loop next: <iterate | ship-a-phase | march>.
```

## 6. Closing the loop (when iterate ships a fix)

A downstream skill that addresses a triaged issue names it in
the commit body (`- Closes #<N>: <fix description>`). Closing
is then owned by `.github/workflows/close-trailers.yml`: on
every push to `main` it sweeps the pushed commit range and
closes each issue the commits name, idempotently. Read that
workflow's header for the closing contract and why GitHub's
native parser is not relied on. Triage adds nothing to it.
The richer deploy comment is `skills/iterate.md`'s job.

## 7. Hard rules

1. **Labels are the state.** Never re-process labeled issues
   on default pass.
2. **One commit per triage pass.** No empty commits.
3. **Idempotency.** Re-running with no new issues = no-op.
4. **Honest comments.** Don't promise specific fix dates.
5. **Never close without a comment** explaining why.
6. **Don't over-classify.** When in doubt, pick the closest
   existing category and say so in the comment; never invent
   one.
7. **Content routing per surface (D88, D99).** Card, keyword, art,
   enemy, relic, map, NPC and event requests are `[content]`
   candidates (Step 2 item 4); never a build-plan row.
8. **No emojis. No attribution trailers** (AGENTS.md rule 2).
9. **`gh` calls only.** No raw curl unless `gh` is unavailable.

## 8. Failure modes

1. **`gh` not installed.** Exit 3. Loop continues
   (non-blocking).
2. **`GH_TOKEN` missing or rejected.** Exit 3. Loop continues.
3. **Rate limit hit.** Exit 2. Retry next tick.
4. **Ambiguous classification after reading title + body +
   comments.** Make the most reasonable call and state the
   doubt in the comment; if nothing actionable can be read
   out of it, `triage:reviewed` with a comment asking the
   author for the missing detail.
5. **`gh issue edit` fails** (label doesn't exist). Auto-create
   label via `gh label create`, retry once.
6. **Network failure mid-pass.** Persist what's done; next
   tick resumes.

Otherwise: classify, label, comment, ship.

## 9. When `/march` invokes `/triage`

`/march` runs triage as Step 1 of every dispatch tick. Cheap
check:

```bash
gh issue list --repo "$GH_REPO" --state open \
  --search "-label:triage:loop-queued -label:triage:closed -label:triage:reviewed -label:loop:opened" \
  --json number --jq 'length'
```

If `> 0`, dispatch to `/triage`. If `== 0`, fall through to
the next gate.

If `gh` / token unavailable, **don't fail the march** — log
warning and fall through. Triage is non-blocking by design.

## 10. Quick reference

```bash
# Auth
export GH_TOKEN=$(awk -F= '/^GH_TOKEN=/ {sub(/^GH_TOKEN=/, ""); print; exit}' .env)
export GH_REPO=$(awk -F= '/^GH_REPO=/ {sub(/^GH_REPO=/, ""); print; exit}' .env)
GH_REPO=${GH_REPO:-no-trbl-2-u/Miserere-mei-deus}

# Operations
gh issue list --repo "$GH_REPO" --state open --search "..."
gh issue edit <N> --repo "$GH_REPO" --add-label "..."
gh issue comment <N> --repo "$GH_REPO" --body "..."
gh issue close <N> --repo "$GH_REPO" --reason "not planned"
gh label create "triage:..." --repo "$GH_REPO" --color "..." 2>/dev/null || true

# Commit
git add <files>
git commit -m "triage: ..."
git push origin main
npm run deploy:check
```
