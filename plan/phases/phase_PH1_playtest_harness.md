# Phase PH1 — One browser per playtester, seeds that survive the boot, and guides tested for truth

## Sources

- `/plot` for T, 2026-10-25 ("plot them all, one plot run, one PR"), run unattended on T's behalf. The task is the
  `plan/PHASE_CANDIDATES.md` candidate of the same title (`[owner] [score 5.5]`, filed by T's `/messy` of
  2026-10-24), part plan `plan/playtest-harness.md` phases 1 and 2. Phase 3 of that part plan (the Act 1 walk) is a
  separate candidate and a separate plot; nothing here touches it.
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md` §0 "Harness caveat". Four `playtester` agents
  shared one Playwright MCP browser and its one current-tab pointer: PT1 had 6 of 6 tab selects overridden, PT3's tab
  was navigated away and once closed by another agent, two agents lost the 414×896 viewport, every screenshot
  landed in the gitignored `.playwright-mcp/` because Playwright refused the scratchpad path, seeds set before the
  first `goto` were wiped by the reload, minigame seeds were not verifiable, and synthetic drags failed on the
  hazard board.
- Decisions: D84 (loop PR scope), D88 (content per surface: tooling, scripts and docs are loop surfaces), D93 (`/plot`
  splits a task and lands it by PR), D101 (only a `plot` PR waits for T). Phase 34 (2026-07-16) built
  `critique-drive.mjs`, the library-Playwright transport this phase copies.
- Code read while shaping this:
  - `.claude/agents/playtester.md` grants Read, Grep, Glob and fifteen `mcp__playwright__browser_*` tools: one
    shared browser, one current tab. It has no Bash, so today it cannot run a script of its own.
  - `axiomancer-mobile/scripts/critique-drive.mjs` imports the Playwright library, opens one context per viewport
    (`browser.newContext(contextOptions(viewport))`, `:367`), one page per screen (`:309`), seeds through
    `page.addInitScript` (`:323`, `:329`) and writes screenshots to a path it names (`:344`). It only captures; it
    does not play.
  - Seed globals: `__AXM_COMBAT_SEED__` is read by `app/combat-encounter/index.tsx:38-42` in dev builds;
    `__AXM_MINIGAME_SEEDS__` and the legacy per-minigame globals are read by `resolveMinigameSeed`
    (`state/minigame-seeds.ts:39-50`) for hazard, rest, cache and blacksmith; `scripts/minigame-seed-injector.mjs`
    already installs them all with one `context.addInitScript`; `scripts/live-fight-entry.mjs` enters a seeded
    live fight through `/dev`.
  - The combat seed is verifiable: `CombatEncounterPanel.tsx:404` logs `combat/encounter-mounted {enemy, seed}`.
    A minigame seed is not: `resolveMinigameSeed` logs nothing, so no log line says which seed a hazard, rest,
    cache or blacksmith used.
  - `scripts/playtest-guides.test.mjs` (root `npm test`) checks that each id in a guide's "Test IDs" table is a
    declared `testID` literal, that named fixture ids exist and that the seven sections are present. It reads no
    other part of a guide and cannot tell whether a sentence is true.
  - The three wrong lines, re-read on `171d85c64`: `hazard.md`'s Test IDs row "`hazard-hand` / `hazard-hand-<uid>` |
    Hand; tap to stage" and step 3 "Tap `hazard-hand-<uid>` → `hazard-staged-<uid>`", against
    `components/hazard/HazardBoard.tsx:6-12` ("Touch model (drag-only)": drag a hand card up to stage it, tap reads
    it); `hazard.md` §5 "`hazard-resolve-flash` likewise auto-clears", against `HazardOverlays.tsx:163`, a
    `Pressable` whose only exit is `onPress={onDone}` (the dice-roll overlay above it does have a timer,
    `DICE_ROLL_OVERLAY_MS`, `:83`, `:100`); `combat.md:48,61,78` name `combat-victory-panel-carry-on`, declared in
    `components/event/aftermath/CombatVictoryPanel.tsx:188`, a component no file under `app/` imports.
  - Missing ids: `card-upgrade-row-<cardId>` and `card-upgrade-confirm` (`components/upgrade/CardUpgradePicker.tsx:84,117`)
    appear in no guide; `dev-section-<key>-toggle` (`components/dev/DevToolsSections.tsx:101`) appears in no guide
    and not in `docs/dev-tools.md`.
  - Consumers of the agent: `skills/critique.md` §3.5 and §4 (attended passes delegate to `playtester` "with the
    Playwright MCP tools"), `skills/ship-a-phase.md:74,577`, `.claude/commands/critique.md`, `plan/bearings.md:236`
    (the agents table), and the playtest-guides `README.md` "Seed globals" fact (set them in a Playwright
    `addInitScript` before `page.goto`, which the MCP cannot do).

## Outcome

Each playtester drives its own browser through a session tool that seeds before boot and keeps the seed across
reloads, so four can play at once without touching each other's tabs. The field guides say only what the tree
does, and the guide test fails a guide that claims a timer, a tap or an id the tree does not have.

## Acceptance

- **A1** `axiomancer-mobile/scripts/playtest-session.mjs` (`npm run playtest:session -w axiomancer-mobile -- <cmd>`,
  plus a root alias of the same name) imports the Playwright library, not the MCP. `prepare` builds or reuses the
  stamped web export once (`ensureWebExport`). `start --agent <name> [--seed <n>] [--minigame-seeds <json>]
  [--fixture <id>] [--viewport mobile|desktop] [--base-url <url>]` starts a detached session process for that
  agent: its own browser, its own context (mobile is 414×896 with touch), its own static server on a free port
  unless `--base-url` is given, and context-level init scripts for `__AXM_FORCE_DEV_TOOLS__`, `__AXM_COMBAT_SEED__`
  and the minigame seeds (through `injectMinigameSeeds`). The commands `goto <path>`, `tap <testID>`,
  `drag <fromTestID> <toTestID>`, `snapshot` (visible testIDs and innerText), `shot <path>`, `eval <expr>`,
  `log [--tail <n>] [--domains <d,...>]`, `pages` and `stop` each print one JSON line. The session record lives in
  a gitignored `.playtest-sessions/<agent>.json`. A unit test covers argument parsing and the record's shape.
- **A2** Seeds survive the boot: in a session started with `--seed 1101`, `__AXM_COMBAT_SEED__` still reads 1101
  after a full reload and after a second `goto`. Covered by A4's e2e.
- **A3** A minigame seed is verifiable: `resolveMinigameSeed` logs `rng/minigame-seed {key, seed, source}` at info
  level, with `source` one of `explicit`, `unified`, `legacy`, `fallback`. A jest test covers all four sources and
  shows that a logger that throws does not change the seed returned.
- **A4** `npm run e2e:playtest-sessions -w axiomancer-mobile` runs `prepare` once, then starts four sessions in
  parallel with seeds 1101 to 1104. Each enters a live fight (the `enterLiveFight` path through `/dev`), and its own
  `log` returns `combat/encounter-mounted` with its own seed. Its `pages` lists only pages it opened. Its `shot`
  writes a file at the path it named, outside `.playwright-mcp/`. One session reloads and still reports its seed
  (A2). One session stands on a hazard with a minigame seed and its `log` shows `rng/minigame-seed` with that seed
  (A3). The script is registered in `scripts/ci-e2e-scope.mjs` the way `map-walk-e2e` and `feature-map-e2e` are.
- **A5** `.claude/agents/playtester.md` drives the game only through the session tool. Its `tools` line has `Bash`
  and no `mcp__playwright__*`. Its body tells the agent to start a session with the agent name and seed the caller
  gives, play through `tap`/`drag`/`snapshot`/`shot`/`log`, write screenshots to the path the caller gives, and
  `stop` at the end ("Always close the browser cleanly" becomes `stop`). Its hard rules allow Bash only for
  `playtest-session.mjs`. A root test (in the root `npm test`) checks that tools line and the Bash-only rule.
- **A6** Every caller says the same thing. In `skills/critique.md`, §4 and the "user IS present" paragraph of §3.5
  say the caller runs `prepare` once and hands each playtester an agent name, a seed and a screenshot directory, and
  that four can run at once. `skills/ship-a-phase.md` (`:74`, `:577`), `.claude/commands/critique.md` and the agents
  table in `plan/bearings.md` describe the session tool in place of the MCP grant. The playtest-guides `README.md`
  "Seed globals" fact names the `start` flags in place of a hand-written `addInitScript`.
- **A7** The guides match the tree. `hazard.md` says the board is drag-only: drag a hand card up to stage it, tap
  a hand card to read it, drag a die onto a staged card of its colour. It also says `hazard-resolve-flash` waits for
  a tap. `combat.md` names what the live combat route mounts after `combat-summary-close` (read from the route and
  `CombatEncounterPanel`), not `combat-victory-panel-carry-on`. `minigames.md` lists `card-upgrade-row-<cardId>`
  and `card-upgrade-confirm` for the rest-site upgrade sheet. `dev-section-<key>-toggle` is documented in
  `docs/dev-tools.md` and in the guides' `/dev` line.
- **A8** `playtest-guides.test.mjs` checks every backticked token shaped like a testID in sections 4 to 6 of each
  guide (the steps and both stuck lists), not only the Test IDs table, against the declared ids.
- **A9** A guide id fails the test when the module that declares it is not imported, directly or transitively, from
  any file under `axiomancer-mobile/app/`. The failure names the id and the module. On the old `combat.md` it names
  `combat-victory-panel-carry-on` and `CombatVictoryPanel.tsx`.
- **A10** If a guide line says an overlay auto-clears, auto-finishes or auto-dismisses, it must name in backticks a
  timer constant declared in the module that owns the id (as `DICE_ROLL_OVERLAY_MS`). If a line says "tap to
  <verb>" for an id, the element carrying that id must have an `onPress` handler in its module. Fixture strings
  copied from the three old lines make each new check fail, so the checks can fail on the parent (LG1d).

Measure: four sessions started at once with seeds 1101 to 1104 each report `combat/encounter-mounted` with their own
seed and list only their own pages (`npm run e2e:playtest-sessions -w axiomancer-mobile`). The root `npm test`
passes with the A8 to A10 checks, which fail on the three old guide lines.

## Phases

### PH1a — The session tool: one browser per caller, seeds before boot · M · closes A1, A2, A3, A4 · requires nothing
Measure: `npm run e2e:playtest-sessions -w axiomancer-mobile` passes: four parallel sessions, four own seeds, own
pages, named shots, a reload that keeps its seed, a verifiable hazard seed.
- Scope: new `axiomancer-mobile/scripts/playtest-session.mjs` (CLI and session process) and
  `scripts/playtest-sessions-e2e.mjs`; reuse `scripts/lib/web-export.mjs`, `scripts/lib/page-ready.mjs`,
  `scripts/minigame-seed-injector.mjs`, `scripts/live-fight-entry.mjs`, critique-drive's `contextOptions` and
  static server, and the drag sequence `scripts/hazard-e2e.mjs` uses on the hazard board.
  `state/minigame-seeds.ts` gains the A3 log line. `axiomancer-mobile/package.json` and the root `package.json` get
  the scripts. `.playtest-sessions/` goes in `axiomancer-mobile/.gitignore`. `scripts/ci-e2e-scope.mjs` gets the
  e2e entry.
- Consumers: none change behaviour. The agent switches in PH1b.
- Save / schema: none. Sessions are ephemeral runs, and fixtures never touch a save slot.
- Tests: a node unit test for the CLI's argument parsing and session record; a jest test for the A3 log line
  (`state/__tests__/minigame-seeds.test.ts` or the existing suite); the A4 e2e.
- Verify gate: `npm run verify -w axiomancer-mobile`; `npm run e2e:playtest-sessions -w axiomancer-mobile`; the root
  `npm test` (`ci-e2e-scope.test.mjs`).

### PH1b — The playtester uses its own browser · S · closes A5, A6 · requires PH1a
Measure: the A5 root test passes, and `.claude/agents/playtester.md` names no `mcp__playwright__` tool.
- Scope: `.claude/agents/playtester.md` (tools line, "The walk", "Sanctioned tools", "Screenshot discipline",
  "Hard rules", "Failure modes": "Playwright tools unavailable" becomes "the session would not start; report the
  `start` error"); `skills/critique.md` §3.5 and §4; `skills/ship-a-phase.md`; `.claude/commands/critique.md`;
  `plan/bearings.md` agents table; the playtest-guides `README.md` seed fact. The new root test is
  `scripts/playtester-agent.test.mjs`, added to the root `npm test`.
- Consumers: every attended `/critique` pass, HP2e's playtester solves, the W3 and W5 walks.
- Save / schema: none.
- Tests: `scripts/playtester-agent.test.mjs` checks the tools line, the Bash-only rule and the `stop` instruction.
- Verify gate: the root `npm test`; `node scripts/loop-pr.test.mjs` (skills edits).

### PH1c — Guides tested for truth · M · closes A7, A8, A9, A10 · requires nothing
Measure: the root `npm test` passes, and the A8 to A10 checks fail on the fixture strings copied from the three old
lines.
- Scope: `axiomancer-mobile/docs/playtest-guides/hazard.md`, `combat.md`, `minigames.md`;
  `axiomancer-mobile/docs/dev-tools.md`; `scripts/playtest-guides.test.mjs`. For A9, use the import scan in
  `scripts/feature-map.mjs` if it can be reused, otherwise write a small resolver for relative and `@/` imports.
  PH1c does not touch the guides' `README.md`, which PH1b owns.
- Consumers: every reader of the guides.
- Save / schema: none.
- Tests: `scripts/playtest-guides.test.mjs` gains the A8, A9 and A10 checks and the negative fixtures for each.
- Verify gate: the root `npm test`.

## Scope

- `axiomancer-mobile` scripts and docs, one mobile state module (`minigame-seeds.ts`, a log line only), the root
  test list, the `playtester` agent and the skills and bearings text that describe it. No engine change and no
  `axiomancer-mechanics` path, so the cross-package checklist does not apply. No game content: map, event and copy
  fixes belong to the Act 1 walk plot.

## Consumers to update

- `.claude/agents/playtester.md`, `skills/critique.md`, `skills/ship-a-phase.md`, `.claude/commands/critique.md`,
  `plan/bearings.md`, the playtest-guides `README.md` (all PH1b).

## Save / schema contracts

- None. No `game.migrate.ts` hop.

## Decisions made upfront — DO NOT ASK

- **The `playtester` agent gets its own Playwright and the swarm stays 4-up** (T, 2026-10-25, answering the part
  plan's open question). This follows `critique-drive.mjs`: the library import, a context per agent,
  `addInitScript` seeds and a screenshot path the agent names. The agent leaves the shared MCP browser; it does not
  run its swarm in series.
- **A session is a long-lived process with a CLI in front of it.** Each Bash call is a new process, and a browser
  context must outlive it. Playwright's `connect` closes a client's contexts when it disconnects, so the process
  that owns the context must persist. The session listens on `127.0.0.1` on a port the OS assigns and records it in
  `.playtest-sessions/<agent>.json`.
- **`prepare` exports once and `start` never exports.** Four agents starting together must not race four exports
  of `.smoke-dist`. When the export stamp does not match the tree, `start` refuses and its message names `prepare`.
- **Each session serves the export itself, on its own port.** This means no shared server to start, stop or lose.
  `--base-url` points a session at a dev server that is already running (`localhost:8081`) instead.
- **Mobile is 414×896 with touch,** the viewport the agent's walk already specifies. critique-drive's 375×812 is
  for capture and stays as it is.
- **A screenshot goes exactly where the caller names it,** with parent directories created. With no path it goes to
  `.playtest-sessions/<agent>/shots/<n>.png`, never into `.playwright-mcp/`.
- **A session left alone closes itself.** After 30 minutes without a command it closes its browser and removes its
  record, so a crashed agent leaves no Chromium running. `stop` is the normal end.
- **The minigame seed log line is info level in the `rng` domain.** Static exports buffer info and above by
  default, so the line is there without `__AXM_LOG_LEVEL__`, beside the `rng/seed-set` the combat seed already
  writes.
- **`drag` uses the pointer sequence `hazard-e2e.mjs` already drives on the hazard board,** because synthetic MCP
  drags failed there (swarm report §0).
- **The agent loses its MCP tools completely; it gets no fallback to them.** T chose its own browser over the
  shared one. The Playwright MCP server stays in `.mcp.json` for an attended main session's own use.
- **The agent gets `Bash`, restricted in its hard rules and by the A5 test to `playtest-session.mjs`.** The agent
  cannot run its own Playwright without a process. The frontmatter `tools` list takes tool names, so the narrower
  limit is written as a rule. `[T to confirm]`
- **The unattended `/critique` path keeps `critique:drive`.** This phase changes the attended path only.
- **The guide fixes are documentation, a loop surface under D88.** They change no game copy.
- **"Tap to <verb>" is checked as "the element carrying the id has an `onPress`".** Asking for the exact verb would
  mean understanding the handler, and a guide claims a tap only where it promises one.

## Tests matrix

- Added: the CLI unit test (PH1a); the minigame-seed log jest test (PH1a); `e2e:playtest-sessions` (PH1a);
  `scripts/playtester-agent.test.mjs` (PH1b); the A8, A9 and A10 checks with negative fixtures in
  `scripts/playtest-guides.test.mjs` (PH1c).
- Rewritten: none. The existing guide checks stay.

## Verify gate

`npm run verify -w axiomancer-mobile`; the root `npm test`; `npm run e2e:playtest-sessions -w axiomancer-mobile` for
PH1a.

## Commit body template

```
Phase PH1<a|b|c> — <title>

Closes <ids> of plan/phases/phase_PH1_playtest_harness.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1 to A10 ticked across PH1a, PH1b and PH1c.

## Follow-ups (out of scope)

- A real four-agent swarm on the session tool. The next attended swarm records in its report that each agent's
  `encounter-mounted` seed was its own. A4 is the mechanical stand-in.
- An unattended playtester. Bash grants reach sub-agents where MCP grants did not (`skills/critique.md` §3.5), so an
  unattended `/critique` could spawn `playtester` on the session tool. That is a doctrine change to §3.5 for T to
  ask for.
- The Act 1 walk (part plan phase 3): four doors, twelve kinds, `gathering` removed, node blurbs matched to their
  events. It is a separate candidate and plot.
- A frozen drag ghost after a failed synthetic drag on the hazard board (swarm report §0). If the session tool's
  `drag` still leaves one, file it to `plan/CRITIQUE.md`.
