---
description: T's parallel orchestrator — nexus's heads-down frame (plan from origin, every question up front, claims, a ledger, resume, the end gate) around Miserere's waves of background /next workers, one per chunk in its own worktree, with a callout digest between waves. Never builds itself; attended only; never fired by the loop.
argument-hint: "[<chunk id | alias | spec NN> ... | \"<goal>\" | peek [<scope>] | resume]"
---

You are invoked under the `pilot` skill. Read `skills/pilot.md` end to
end before touching anything else; it is the single source of truth.

Argument handling:
- `<id|alias|NN> ...` → these chunks or specs, and any open PR for one.
- `"<goal>"` → every open chunk the goal names.
- No argument → every ready chunk, in pick order.
- `peek [<scope>]` → `node scripts/pilot-waves.mjs <scope>` and the plan around it; launch nothing, claim nothing, write no ledger.
- `resume` → take the latest fallen or parked `kind: pilot` ledger (`node scripts/ledger.mjs list`, then `take`), renew its claims, drive live PRs, relaunch dead workers from their saved prompts, continue from the first unfinished wave (`skills/pilot.md` §2 "Resume").

Procedure: §2 of `skills/pilot.md` (who, what and the waves; the verb
and model per worker; the question gate: every question before the
first launch; open the ledger, claim the wave and launch it; the
callout bus; react and start the next wave on a merge; route new loop
work through `/plot`; the end gate: ask the parked questions and wrap
up). Workers run `/next <id>` and never ask T: they take the default and
park. Hard rules: §3. Never build, merge or push `main` yourself.

Argument: $ARGUMENTS
