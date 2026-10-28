---
description: T's orchestrated parallel shipping — map which build-plan rows can ship in parallel now and which wait for a merge, show T the waves with a model per worker, then launch one background /ship-a-phase worker per row in its own worktree, carry callouts between them, and start each next wave only after its prerequisite PR merges. Never builds itself; attended only; never fired by the loop.
---

You are invoked under the `heads-down` skill. Read `skills/heads-down.md`
end to end before touching anything else; it is the single source of
truth.

Argument handling:
- `<id> <id> ...` → these build-plan rows, and any open PR that claims one.
- `"<goal>"` → every open row the goal names.
- `peek <ids|goal>` → map the waves, print the plan, launch nothing.

Procedure: §2 of `skills/heads-down.md` (map the graph, pick verb and
model per worker, show T the plan and ask, launch the wave, keep the
callout bus, react and start the next wave on a merge, route new loop
work through `/plot`, wrap up). Hard rules: §3. A worker whose row
changes what is on screen puts before/after shots in its PR
description, hosted outside the repo (§4). Never build, merge or
push `main` yourself.

Argument: $ARGUMENTS
