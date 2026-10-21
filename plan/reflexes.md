# Reflexes

> The always-read core. ≤50 lines, total — this file is loaded
> in full by every skill's Step 0, so it stays small on
> purpose. A reflex is a lesson from `lessons.md` seen 3× across
> verbs; the Retro step promotes it (`skills/march.md` §3 "Retro")
> and `/oversight` reviews the promotion after the fact. Promoting it
> here means every skill sees it without a domain lookup. `lessons.md`'s header states the
> caps and the drain path (reflex → skill procedure edit).

1. Commit and push are one atomic act. No unpushed commits
   sit at the end of a turn — plan-only work is on
   `origin/main`, code is on its pushed `loop/*` PR branch, and
   the next tick reads both (open `loop:pr` PRs are the claims).
2. Blocked is loud. Before a skill stops on a failure-mode
   condition, it surfaces an issue or a mirror comment first
   — silence is the failure, not the blocker itself.
3. PR labels come from `gh label list`, never guessed. A label
   the repo lacks makes `gh pr create` open nothing, and
   `area:*` is the fixed six (`cards combat mobile ui ci
   loop`), never a workspace or tree name.

## Promotion log

- <ISO> — promoted from `lessons.md` `<!-- @domain:<NAME> -->`
  entry #<N>: "<one-line summary>".
- 2026-10-21 — promoted from `lessons.md` `<!-- @domain:loop -->`
  `loop-pr-label-missing` (seen 3× across ship and plot, latest
  ship AD1b guessing `area:tooling`): "take `area:*` from `gh
  label list`, never a workspace name".

## Drain log

- <ISO> — drained into `skills/<NAME>.md` §<N>: "<one-line
  summary>" (the reflex became a procedure step, not a
  reminder).
- 2026-08-02 — drained "verify gate is foreground, never
  `--no-verify`" (was reflex #1): now hard-blocked at the
  harness by `.claude/hooks/guard.mjs`'s `no-verify`,
  `force-push`, and `backgroundedGate` checks (PreToolUse),
  not just warned. The rule survives as AGENTS.md standing
  rule 3 / bearings.md hard rule 3; a guard hook enforcing a
  hard block fully supersedes the reflex's reminder purpose.
