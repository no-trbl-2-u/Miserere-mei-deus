# Walkthroughs — scripted CLI traces for the agent-graded harness

Each walkthrough is a pair: `<name>.json` (scripted input replayed
through `npm run game --script`) plus `<name>.goal.md` (the test goal
the agent grader checks the resulting state log against). Together
they pin a single CLI surface under hermetic, replayable conditions.

Drive a walkthrough through the harness:

```
node automation/agent-e2e.mjs <name>
```

The harness loads the JSON script, optionally allocates a temp save
slot, invokes the CLI with the right flags, then hands the state log
and the goal file to the grader for pass/fail.

## Inventory

| Script | Surface under test | Preset | Enemy / scene | Required flags | Exit expectation |
|---|---|---|---|---|---|
| `boss-encounter` | Debug-tab `debugSpawn` driving a long combat loop against a boss-tier enemy | `sage` | `coastal-tyrant` (debug-spawned) | — | Combat ends (`scriptExhausted` after the final attack); player either victorious or scripted past the kill |
| `character-sheet` | Character tab — fields, derived stats, equipment, knownSkills (Phase 26 unit 3) | `apprentice` | — | — | `quit` reason; state log captures the Character tab render |
| `item-use` | In-combat `item` action consuming a `healing-potion` mid-fight (Spec 05b consumables) | `wanderer` | `sandbag` (debug-spawned) | — | Inventory decrements by one `healing-potion`; combat ends or script exhausts |
| `map-events` | Map tab + `resolveMapEvent` dispatcher firing on `bw-4` (a Breakwater gathering) | `apprentice` | — | — | `quit` reason after the node resolves; state log shows the MapEvent payload |
| `save-load` | Save / Load CLI tabs + `--save-file` slot (Phase 27 unit 2 + Phase 31): save at bw-4, move to bw-5, load rolls back to bw-4 | `apprentice` | — | `--save-file <path>` (the harness allocates a temp path) | `quit` reason; map state rolls back to the save slot, not the autosave |
| `skills-in-combat` | In-combat `skill` action (Phase 26 unit 1) — `ad-hominem-strike` mid-fight | `wanderer` | `wet-hound` (debug-spawned) | — | `quit` reason after combat; skill resource cost + damage applied |
| `stat-allocation` | Character-tab stat-allocation prompt loop (Phase 29 `db7c26f` — spend `availableStatPoints`) | `sage` | `coastal-tyrant` (long combat to generate XP / level-ups) | — | Combat ends; allocation prompt fires; `availableStatPoints` decrements |
| `endgame-loadout` | Phase 64 — endgame interactions: Tier 3 skill use (Phase 33/44), equipped-skill rotation (Phase 18+30), enemy alignment AI bias (Phase 45), enemy-skill caster path (Phase 49), boss combat resolution (Phase 15 phases). Drives `bootstrap-paradox` against the Coastal Tyrant. | `sage` | `coastal-tyrant` (debug-spawned) | — | Demonstration-grade — combat in progress at script quit OR `combat:ended` (any outcome); the value is exercising the surfaces, not finishing the fight |
| `coastal-tyrant-befriend` | Phase 68 — per-enemy `BefriendabilityConfig` AND-composition (`hpGate: { belowPct: 0.4 } + requiredStances: ['heart'] + roundsThreshold: 5`). 9 consecutive heart-stance defends exercise the `requiredStances` + `roundsThreshold` axes; `hpGate` is RNG-dependent (per D3 grades on predicate-attempt visibility, not friendship-success). | `sage` | `coastal-tyrant` (debug-spawned) | — | `quit` / `scriptExhausted` / `combat:ended` (any outcome); the value is exercising the predicate path |
| `synergy-skills-chain` | **Phase 120 ship.** Phase 66 Tier 2 synergy skill (`resonance-burst`) casting with predicate match. Extended Wanderer preset (now includes synergy skills) → debug-spawn Wet Hound → cast `eternal-regress` (applies `debuff_confusion`) → cast `resonance-burst` (synergizes with confusion). Closes the deferred Phase 81 Unit 2 synergy walkthrough coverage. | `wanderer` | `wet-hound` (debug-spawned) | — | `quit` reason or `scriptExhausted`; `synergy-fired` event must appear in the `resonance-burst` cast round |

**Phase 165 — new combat CLI walkthroughs** are hermetic in-process e2e tests (`src/CLI/e2e/combat.cli.engine.test.ts`) rather than agent-e2e JSON walkthroughs, because the new combat CLI's `--auto` mode drives state without scripted answers. Run them with `npm test` or `npx vitest run src/CLI/e2e/combat.cli.engine.test.ts`.

The `shop` and `codex-unlock` walkthroughs were deleted in R3c: they routed
through fishing-village nodes (purged R3b), Act 1 has no shop until R5
re-points one, and the codex-unlock subject (the Mournful Gull) retired in R2a.

## Conventions

- **Hermetic.** The harness seeds the RNG; replays are deterministic.
- **Pre-allocated saves.** Scripts that touch the Save / Load tabs
  must declare `--save-file <path>` in their goal file. The harness
  allocates the path and cleans up after the run.
- **No interactive prompts that aren't pre-answered.** Every prompt the
  CLI fires must have a matching line in the JSON script — otherwise
  the run exits with `reason: 'error'`.
- **`reason: 'scriptExhausted'`** is a valid exit only when the script
  intentionally drains every step; `reason: 'quit'` is the standard
  golden-path exit.

When adding a new walkthrough: drop in the `<name>.json` script + the
`<name>.goal.md` goal file, add a row to the table above, and run
`node automation/agent-e2e.mjs <name>` until the grader reports pass.
