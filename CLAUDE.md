See [AGENTS.md](./AGENTS.md) for the monorepo guide, package layout, and hard
rules.

The autonomous **nexus** loop is live at the repo root: read
[`plan/bearings.md`](./plan/bearings.md) for standing context and `skills/` for
the loop verbs (`/ship-a-phase`, `/march`, `/iterate`, `/oversight`, …). Domain
**design** skills and tuning/playtest commands live in `.claude/`. The loop
lands code as `loop:pr` pull requests (D84–D87); a PR merges when its
adversarial review is green, and T merges plan PRs by hand (D95).

**When T asks for loop work, use `/plot` or `/messy` (AGENTS.md rule 8).** If T
says they want something the loop should build ("let's add…", "the loop should
build…", "make a phase for…", "queue this"), run `/plot` for one known task or
`/messy` for a loose or many-themed dump, instead of hand-writing a build-plan
row, brief or `PHASE_CANDIDATES` row; ask first if the request is ambiguous.
When a brainstorm or design conversation ends with buildable direction, offer
it in one `AskUserQuestion`: "Want to use `/plot` to turn this into a phase?"
or "Want to use `/messy` to file this dump?". The loop never fires either.

**Deadlines (T, 2026-10-19).** `plan/deadlines.md` is the whole deadline plan; `LIVE_DEADLINES.md` is the
next two weeks of items that need T, regenerated daily (never edit it by hand). When a chat starts, the
session-start hook runs `node scripts/deadlines.mjs --remind` and prints a **DEADLINE REMINDER**: lead your
first reply to T with that list (what needs a plot, what needs T, and when it is due) before anything else.
It is silent in GitHub Actions, so loop ticks never see it. When you `/plot` a deadline item, replace its
`needs plot` in the Items table with the new phase ids; when T finishes a `T` task, tick its Status `[x]`.

Answering a **balance/measurement** question (win rates, engagement)? Read
`docs/reports/measured/latest.md` (phase R12a: the grey and Blood Price
decks across the Act 1 ledger) and name the commit its stamp gives. It is a
measurement, not a gated baseline (D57); a question it does not cover gets
"not measured". Never cite the retired deck-matrix baseline (it lives only
under the `archive-pre-revamp` tag) — see `docs/truth-sources.md` →
"Measured truth". Source-of-rules questions (cards, pricing, keywords) read
the current tree.

`telemetry/` is an append-only invocation log written by
`.claude/hooks/telemetry.mjs` (skills, slash commands, subagent spawns) —
data for the human, never a work queue. Each session writes only its own
shard, `telemetry/<YYYY-MM-DD>_<session-id>.md`, so two branches never touch
the same file and the log cannot cause a merge conflict (the single shared
`TELEMETRY.md` conflicted on nearly every merge until 2026-09-23; its rows
are frozen in `telemetry/legacy-to-2026-09-23.md`). Read it all as one
time-sorted table with `npm run telemetry` (`--since YYYY-MM-DD`,
`--tail N`). Commit a session's shard with the tick; never edit rows.

Each start row (`skill`, `subagent`, `slash-command`, and `script` for a
Bash run of `verify:visual`, `e2e:*`, `critique:drive`, `smoke:bundler` or
`baseline:approve`) pairs with an `-end` row carrying that call's duration
and outcome, and a tick that invoked
anything closes with a `tick-end` row. So a start row with no `-end` row
means the call never returned, and a `slash-prompt` followed straight by
`tick-end` means the tick genuinely did nothing. A conversational turn that
invokes no verb writes nothing at all — it is the user talking, not a tick.
A `verb-read` row (no `-end` pair) records a loop verb that `/march`
dispatched by reading `skills/<verb>.md`, once per verb per tick.
A `-` in any column means the value was not knowable when the row was
written — the hook never guesses. Behaviour is covered by
`node .claude/hooks/telemetry.test.mjs` and
`scripts/telemetry-view.test.mjs` (both in the root `npm test`).

A tick's `tick-end` row is written *after* that tick's own commit — nothing
can commit the record of its own ending — so it lands in the next tick's
commit. That is expected; do not chase it. It only strands rows when a
session ends, and stranded rows ride along with the next change. A CI
tick's session always ends with the runner, so `_claude-skill.yml`
commits whatever its tick left in `telemetry/` in a step after Claude
exits.

When doing a PR check-in or otherwise watching a PR (subscribed activity,
scheduled re-checks), a discovered merge conflict is something to fix, not
just report: fetch the base branch, merge (or rebase, per the repo's
convention) it into the PR head, resolve the conflicts, and push. Only fall
back to asking if a conflict is genuinely ambiguous (both sides changed the
same logic and picking one loses behavior).
