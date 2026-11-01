# Playtest harness and the Act 1 walk — part plan

> Filed by `/messy` on 2026-10-24 from the Elementalist swarm
> (`docs/reports/playtest-elementalist-act1-2026-10-24.md`). Owner: T.
> The harness is tooling and docs (open to the loop as briefed phases); the
> Act 1 walk touches maps, events and copy (D88).

## Where things stand

- **One browser for four agents.** `.claude/agents/playtester.md` grants the
  `mcp__playwright__*` tools, which expose one shared browser and one current
  tab. Four agents in parallel raced on it (6 of 6 tab selects overridden for
  one agent; a tab navigated away and closed under another). Every agent
  recovered by installing an in-page `BroadcastChannel` relay guarded by its
  own seed, which cost two of them the 414×896 viewport and all of them the
  scratchpad screenshot path (Playwright refused it; shots landed in the
  gitignored `.playwright-mcp/`). `/critique`'s unattended path does not have
  this problem: `critique-drive.mjs` owns its Playwright with one context per
  viewport (`:323`) and a page per screen (`:265`), but it only captures, it
  does not play. Attended passes delegate to `playtester` (`skills/critique.md`
  §4) because MCP grants do not reach sub-agents' sub-agents.
- **Seeds.** The guides say set `__AXM_*` globals in `addInitScript` before
  `goto`; the MCP has no init-script tool, so a global set after boot is wiped
  by the first full reload. Combat seeds set after boot were honoured
  (`rng/seed-set`); minigame seeds were not verifiable. Same seed + same deck
  replays exactly; a different deck changes the dice (the shuffle consumes RNG
  first).
- **Guides that lie.** `hazard.md:26,45` say tap to stage and `:53` says the
  round flash auto-clears; the board is drag-only (`HazardBoard.tsx:6-12`)
  and the flash is a `Pressable` with no timer (`HazardOverlays.tsx:153-197`).
  `combat.md:48,61` name `combat-victory-panel-carry-on`, which never mounts on
  the live route. `minigames.md` lacks the rest upgrade sheet's
  `card-upgrade-row-*` / `card-upgrade-confirm`; `dev-section-*-toggle` is
  undocumented. `scripts/playtest-guides.test.mjs` checks that a named testID
  exists and that the seven sections are present; it cannot check that a
  sentence is true.
- **Coverage the feature map calls driven, or not.** `features.json` has
  `driven=false` for route:blacksmith, route:item-reward, route:event,
  route:saves and the four dev routes; "driven" is a name match against an
  e2e or critique script (`scripts/feature-map.evidence.mjs:8-20`), not proof
  of a walk. `e2e:map-walk` covers one map (Breakwater: arrival, cache,
  gathering, a fight to defeat, the hazard intro) and crosses no door. The W3
  Item "Event-node audit and fixes (all twelve kinds)" (`plan/deadlines.md:136`)
  is `needs plot`; the W5 "Playtester walk of all four regions" likewise.
  `kind: 'gathering'` is a live kind, not a survivor of the retired minigame
  (corrected by phase AW1b, 2026-10-26): it is the Gleaning minigame's
  deliberate replacement (save v18 to v19), grants one named material through
  the paced `/event` receipt, advances `collect` quests and feeds the hazard
  puzzle outcome and the labyrinth pools. The real finding is that nothing
  spends a material; that question is T's, a `[content]` row in
  `plan/AUDIT.md`. A node blurb was compared with the event it opens by no
  test ("The Sea Cave — the tide comes in faster than you leave" opened THE
  CREEPING ROT, a hazard board drawn at random); phase AW1b's
  `node-blurb-event.test.ts` now pairs them and pins the mismatches for T.

## Proposed phases

1. **One browser per playtester.** The `playtester` agent drives its own
   Playwright (the `critique-drive.mjs` way: a library import, a context per
   agent, `addInitScript` for the seed globals, screenshots to a path the
   agent names) instead of the shared MCP browser, or the swarm runs in
   series. Done when four agents with four seeds each report
   `encounter-mounted {seed}` equal to their own and no agent reports a tab
   it did not open.
2. **Guides that are tested for truth.** The three wrong lines fixed, the
   missing ids added, and `playtest-guides.test.mjs` gains one check per
   claim that can be mechanised: a guide that says "auto-clears" names the
   timer constant; a guide that says "tap to stage" names a `Pressable`
   handler on the hand id.
3. **The Act 1 walk, proven.** `e2e:map-walk` (or a sibling) crosses all four
   doors and resolves every node kind it meets; the twelve-kind audit the W3
   Item asks for rides on it; a drift test pairs each node blurb with its
   event's copy (AW1b). `gathering` stays a live kind: whether materials get a
   use, or the seven nodes are re-pointed, is T's `[content]` row, not this
   item's (corrected 2026-10-26).

## Open questions

- ~~Does `playtester` keep the MCP (and the swarm runs in series), or get its
  own Playwright like the drive?~~ **Answered by T, 2026-10-25:** its own
  Playwright (the `critique-drive.mjs` way: library import, a context per
  agent, `addInitScript` seeds, a named screenshot path), keeping a 4-up swarm.

## Plotted

- Phases 1-2 were plotted on 2026-10-25 as PH1a (the session tool), PH1b (the
  agent switches to it) and PH1c (guides tested for truth). Brief
  `plan/README.md`. Phase 3 is a separate candidate.
