---
description: External-observer pass — play the local expo-web build as a first-time player, file fresh-eyes findings to plan/CRITIQUE.md
---

You are invoked under the `critique` skill — the external-observer
pass. Read `skills/critique.md` end to end first.

This skill produces feedback; it does **not** ship code. Findings
flow into `plan/CRITIQUE.md`, which `/iterate` reads as one of
its audit sources. Together: **critique → iterate → fix**.

Argument handling:
- No argument → full pass (~6 representative screens).
- `<url>` → focused pass on a single screen / route. State-gated
  routes take a fixture query: `/exploration?fixture=<id>` (ids from
  `npm run game -w axiomancer-mechanics -- --fixture list`; contract in
  `docs/state-fixtures.md`).
- `mobile` → 375×800 viewport only.
- `desktop` → 1280×800 only.

Procedure: §5 of `skills/critique.md`. Hard rules: §6. Failure
modes: §7. Who plays depends on whether a user is present
(skill §3.5):

- **Unattended** (`/loop`, `/march`, cron): **never spawn
  `playtester`.** Run `npm run critique:drive` and read its
  screenshots, text and errors yourself.
- **Attended** (a user is present): delegate the playthrough to
  the `playtester` sub-agent, which plays the web export in its
  own browser through the playtest session tool
  (`playtest-session.mjs`, not the Playwright MCP) with the
  fresh-eyes mandate. Run `npm run --silent playtest:session --
  prepare` once, then give each playtester an agent name, a seed
  and a screenshot directory; four can run at once.

Either way your job is orchestration, self-assessment, filtering,
committing.

Pre-flight: if `npm run deploy:check` reports no green deploy yet,
defer. Critiquing a build that doesn't pass CI is noise.

Argument: $ARGUMENTS
