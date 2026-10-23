---
description: The loop's outer dispatcher — triage, critique, the PR cap, the next briefed phase, expand, otherwise iterate. Code lands by loop:pr PRs that T merges.
---

You are invoked under the `march` skill — the outer loop. Full
autonomy, no review checkpoint. Read `skills/march.md` end to end
first; this stub is only the doorway.

Procedure (§4 of the skill; the gates are in §3, "Gates (the one
home)"). First match wins:
1. Unlabeled or `loop:do` issues → `/triage`. Either way, then
   run the report sweep (`node scripts/report-sweep.mjs --file`).
2. Critique due (rate-limited, green deploy) → `/critique`.
3. PR cap (3 open `loop:pr` PRs) → report "waiting on T", end.
4. Next pickable phase (first `[ ]` row, not attended, `Requires`
   all `[x]`, has a brief, not claimed by an open PR) →
   `/ship-a-phase`.
5. Expand due (rate-limited, bold posture) → `/expand`.
6. Otherwise → `/iterate`.

Red `main` is not a march step; the `ci-autofix` workflow runs
`/fix-ci` on it, and `pr-autofix` on a red `loop:pr` PR. `/plot`
and `/messy` are never dispatched: only T fires them.

You delegate by reading the relevant skill file and following
its procedure end-to-end. The march skill itself is the
dispatcher.

This command is **designed for `/loop`**. After the child opens
its PR (or pushes a plan-only commit) and runs its Retro, return
cleanly.

Argument: $ARGUMENTS
