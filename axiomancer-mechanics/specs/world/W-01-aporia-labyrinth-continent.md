# World Spec W-01 — The Aporia (labyrinth continent)

> **HISTORICAL (R0, 2026-09-28).** THE REVAMP seals the Labyrinth door
> (R3) and re-themes the Labyrinth in B9 (`plan/revamp/labyrinth.md`). Kept
> as a record of the shipped design, not as live guidance.

> **NARRATIVE FRAMING VOID (THE BLANK PAGE, T direct 2026-09-18).**
> There is no story canon — see `plan/bearings.md` and
> `content/story/story-overview.md`. Every story claim in this spec is
> therefore **void, not canon**: that the Aporia is "the game's thesis
> made spatial," that it gates an endgame, that it is a proving ground
> for a philosophy, and every reference to the Sophist as a narrator or
> finale (`specs/characters/C-01` was deleted 2026-09-17 and the
> cross-reference below dangles by design).
>
> **What survives is the mechanic and the place:** a MAZE-style puzzle
> continent of ~47 rooms, one-way descent, backtracking and revision as
> the core verb, with validator-proven room content in `plan/labyrinth/`.
> That is real engineering work and is kept on those terms alone.
> Whether this place is ever in the game, and what it means if it is, is
> a question for the new overview. Its access gate remains shut
> (dev-menu/CLI-only) as it has been since 2026-07-07.

## Goal

A MAZE-style puzzle labyrinth continent (after Christopher Manson's
1985 book): three acts, ~47 rooms, one-way descent, ~6h of play —
about a third of the whole game.

## Dependencies

- **Unblocks:** the last continent (exit via the Unfounded Door);
  the Sophist finale (C-01).
- **Depends on:** MapEvent system (spec 23), Hazard-Pattern Combat,
  QuestBoard, Rest, the Befriend mercy fork (ADR-0007),
  3-axis alignment (spec 14). Reopens continent work per T's
  explicit 2026-07-07 decision (supersedes ADR-0005 for this scope).

## Normative appendices (the room-level record)

The complete, validator-proven room content lives in the repo at
`plan/labyrinth/`:

- `DESIGN.md` — continent identity, encounter economy, puzzle
  grammar, UI spec, engine/CLI plan. Canonical for doctrine.
- `acts/act1.md` (The Colonnade), `acts/act2.md` (The Archive),
  `acts/act3.md` (The Proof) — full room rosters (directed graphs),
  Sophist narration, POI remarks, clue anatomy, gates, quests,
  bosses. Canonical for content.
- `acts/act*.solution.md` — SPOILER walkthroughs + graph invariants.
- `tools/validate-maze.mjs` — parses the rosters and proves the
  invariants (unique 7-move shortest paths, mandatory-cut secret
  edges, gated gates, escapable traps, fragment counts, act III
  display parity). Run it after ANY roster edit.
- `RESEARCH-maze-book.md` — the source-material analysis and the
  seven transferable design rules (rule zero: every mandatory trick
  is forward-solvable and redundantly clued).

This spec is the contract; those files are the content. Edit them
together.

## Atmosphere

A building in the shape of a country: masonry that predates its own
foundations, lamplit cellars, archives that shelve what was
surrendered at the door. Rooms are premises, doors are inferences,
wrong turns are fallacies — the Loop realms are circular reasoning,
the Trap is a conclusion you can enter but not leave. (Voice-lock lines removed 2026-11-12 with the story wipe.)

## Access (per T, binding for v1)

- UI: dev menu in the character tab ONLY ("THE APORIA" -> act
  select). No exploration-tab or story wiring until the last
  continent exists.
- CLI: dedicated subcommand `npm run game -- labyrinth` (+
  `npm run labyrinth` shortcut) playing the full continent headless
  with the standard agent flags. This is the acceptance surface.

## Core rules (the labyrinth traversal doctrine)

- New `MapDefinition.traversal: 'labyrinth'` (default `'gauntlet'`
  keeps existing maps untouched). In labyrinth mode: free travel
  along any door of the current room, INCLUDING into completed
  rooms; no spreading unlock frontier; one-way doors = asymmetric
  `connectedNodes` (absent as POIs on the far side).
- **Solved space is solved (T):** a room fires ONE random event on
  first arrival (existing `consumedNodes` semantics); re-entry and
  re-crossing are free forever.
- **Quest events fire ONLY at the pre-boss chamber of each act**
  (T), then the act boss (isBoss), then a one-way descent.
- Gates of Assent + the center: unlimited free attempts; every
  refused submission joins the **Ledger of Assertions** and feeds
  the finale like hint debt. Fragments are proven, never consumed;
  the center pre-confirms the eight act-gate words.
- **Hints:** the Sophist sells three tiers everywhere (Nudge /
  Reading / Conclusion — at gates a Conclusion names one correct
  word in its socket). Prices rise; each purchase shifts alignment
  (Epistemology axis, via `alignmentDelta`) and accrues finale debt.
- **Checkpoints (Act III only):** three Waystones, auto-activating;
  one-shot rest each (ejection does not re-arm); the Oubliette
  ejects to the last activated Waystone, never resets.
- **Finale:** the Sophist's power = Borrowed Premise status stacks,
  capped at 3, built from hint debt + ledgered assertions,
  settleable at the Study's Fourth Ledger; Third Waystone is the
  resource floor. Mercy fork through the standard Befriend
  heart-skill; naming him (PROTAS) unlocks inside the mercy choice;
  exploiting both act bosses closes the naming fork (ADR-0007).

## Region state

| state key | meaning | how it changes |
|---|---|---|
| `aporia.act<N>.gate-open` | Gate of Assent / center passphrase answered | set on correct submission |
| `aporia.act<N>.boss-cleared` | act boss resolved (spare or kill) | set at boss resolution |
| `aporia.act<N>.boss-exploited` | exploit branch taken | set at mercy choice; two of these close the finale naming fork |
| `aporia.waystone.<id>` | checkpoint activated (act III) | set on first arrival |
| `aporia.pocket.*` | fragments held + provenance + verdicts | set on POI interaction / ledger read |
| `aporia.debt.hints` / `aporia.debt.assertions` | finale scaling inputs | hint purchases / refused submissions; reduced by Fourth Ledger settlement |
| `aporia.secret.<act>` | secret edge revealed | set on the reveal POI (single click) |
| `aporia.completed` | the Unfounded Door walked | set at continent exit |

(Exact key naming to follow `docs/world.md` conventions at
implementation; MapState extensions ride `GAME_STATE_VERSION` +
`migrate`.)

## Mechanical hazards

No region-wide persistent effect — the Aporia's pressure is the
encounter economy itself (finite, first-arrival-only, grindless).
Per-act weighted pools (DESIGN.md section 4): combat / hazard /
loot-cache / gathering / rest / narration, shifting darker each act;
`village`/`cutscene` excluded; `quest` authored-only. Hazard payload
effect ids chosen from the live libraries at implementation.

## Map / node sketch

Per act: Path realm (true path + side rooms, honest fragments),
Loop realm (circulation, counterfeit fragments), Trap realm
(telegraphed, escapable). Acts connect only by one-way descents.
Full directed-graph rosters: `plan/labyrinth/acts/act*.md`.

## Cross-references

- `specs/characters/C-01-the-sophist.md` — the narrator, hint
  merchant, and finale (mutual).
- `plan/labyrinth/ROADMAP.md` — project state, T's binding answers,
  step plan (steps 10-11: engine+CLI implementation, claude-design
  UI handoff).
- ADR-0005 (superseded for this scope by T's decision), ADR-0007
  (mercy forks), spec 14 (alignment), spec 23 (map events).

## Open questions

1. **Alignment magnitude.** Epistemology-axis delta per hint tier —
   exact numbers against the live model.
   > At implementation (step 10), tuned via world-tuning loop.
2. **Boss kits.** Doorwarden / Index / Sophist status-forward
   designs and level bands.
   > At implementation; status-effect primacy doctrine applies.
3. **Last-continent exit wiring.** The Unfounded Door target until
   that continent exists.
   > CLI + dev build treat it as run-complete.

## Proposed approach

1. Engine: `traversal: 'labyrinth'` mode in `world.reducer.ts` +
   `MapState` extensions (pocket, debt, waystones) via migrate.
2. Content: three `MapDefinition`s under
   `src/World/Continents/Aporia/maps.ts` from the act rosters
   (node prefixes `ap1-`/`ap2-`/`ap3-`); event pools + overrides;
   `EnemiesByMap`; three quest boards; fragments + gates + ledger.
3. CLI: `labyrinth` subcommand, standard agent flags, full-run
   playthrough headless.
4. Hermetic e2e: scripted true-path runs per act; trap ejection;
   gate refusal + assertion ledger; solved-space invariant;
   validator stays green on the rosters.
5. Cross-package gates: mechanics verify + mobile verify +
   card-editor type-check (public surface changes).

## Acceptance checklist

- [ ] All open questions answered.
- [ ] Atmosphere prose consistent with the voice lock (and the act
      files' narration).
- [ ] Region state keys wired to the world reducer.
- [ ] Hazard payloads reference real effect IDs.
- [ ] Cross-reference to C-01 is mutual.
- [ ] `plan/labyrinth/tools/validate-maze.mjs` green.
- [ ] Full CLI playthrough of all three acts completes on the
      documented true paths (and fails correctly off them).
- [ ] `npm test` and `npm run type-check` clean (mechanics), plus
      mobile verify + card-editor type-check.

## Out of scope

- Mobile UI (room scenes, accordion, fog-of-war map) — delivered as
  a claude-design handoff prompt (roadmap step 11), except the dev
  menu entry point.
- The last continent itself.
- Final art (SVG placeholder system carries v1).
