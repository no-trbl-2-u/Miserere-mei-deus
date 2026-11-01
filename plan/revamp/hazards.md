# Revamp — hazards

> Part plan of [THE REVAMP](README.md). Phases **R6** (reset, loop) and
> **B3** (mechanics redesign, owner). Decision D52. Status: RATIFIED 2026-09-28 (D64).

## Where things stand

The hazard minigame (`World/Hazard/`, ~3.7k LOC; mobile
`components/hazard/`, `state/hazard/store-actions.ts`) has its own card
library (~150-card "codex" roster), keyword glossary (SURGE, FORCE, ESCAPE,
CONVERT, …), routes, sub-quests, consequences and rewards.

Four rewards say one thing and do another
(`hazard.content.ts:463-476`, mobile `store-actions.ts:516-551`):

| Reward | Promises | Does |
|---|---|---|
| Paradox Token | a boon "for your next combat" | sets a flag nothing reads |
| Hexed | "begin your next combat with a hostile Curse die" | sets a flag nothing reads |
| Bonus Relic | a relic | pays shillings |
| Shrine Cache "of relics" | relics | pays shillings |

T, 2026-09-28: "Reset hazards too. I plan on changing some of the
fundamental mechanics of hazard."

## R6 — Hazard reset (loop)

Goal: the smallest hazard deck that still plays end-to-end, so B3 starts
from a clean floor. T, 2026-09-28: the minimal playable core below (D63).

1. Keep the engine loop (roll, place dice, meters, routes) and the mobile
   board untouched in shape.
2. Cut the hazard card library to a minimal core: a few cards per route
   meter, no codex expansion roster, no sub-quests.
3. Rewards: only ones that do what they say — shillings, a heal, a scar
   (mended at inns). Delete Paradox Token, Hexed and their flags
   (`hazard.deck-flags.ts`); delete Bonus Relic and Shrine Cache (B1 may give
   relics a real source).
4. Keywords: the hazard glossary keeps only words the minimal cards print
   (D45 applies to the hazard glossary too; the 14 hazard keyword chips'
   tooltip mount from Phase 82 shrinks with it).
5. Tuning constants and sims (`hazard.tuning.ts`, `hazard.sim.ts`,
   `docs/hazard-balance-recommendations.md`) shrink to the core or archive.
6. Save migration for hazard-deck state that references deleted cards.

Independent of the combat resets; requires only R0.

## B3 — Hazard mechanics redesign (owner)

T's session. The reset hands it a minimal deck, honest rewards and a
glossary with only live words.

Briefed 2026-10-15 by `/plot` as Phases B3a–B3f: `plan/README.md` (a fixed one-round puzzle, solver band check, demos before any Act 1 puzzle).

## The Act 1 rollout and the live board (T, 2026-10-24, `/messy`)

From the Elementalist swarm (`docs/reports/playtest-elementalist-act1-2026-10-24.md`) and the W2 line in `plan/deadlines.md` ("Act 1 puzzle set, live hazard routing and the cuts", due 2026-11-04, `needs plot`).

- **What exists.** The B3 brief's Decision (`plan/README.md:185-188`) and Follow-ups (`:269-277`) already state the rollout: author Act 1's puzzles; route the live hazard nodes to the puzzle; delete the three-round engine paths, the RE-CAST cards, the saved hazard deck (`hazard.deck-flags.ts`, `app/hazard-deck`, `HazardRemoveGrid`, `DebugHazardDeckRandomize`) and the `deadcard` consequence, with a save migration dropping `hazard-card:` flags; retire the "Hazard deck-thinning remove-card consumer" candidate. HP4's Follow-ups (`phase_HP4_graded_puzzle_set.md:~244`) and HP5's (`phase_HP5_cost_card_puzzles.md:168`) both defer the routing and the live cost-card draw to W2. Today a live hazard node resolves in `app/hazard/index.tsx` (`HazardBoard`, `RouteSelect`, the overlays) and `state/hazard/store-actions.ts` draws `HAZARD_LIBRARY[seed % length]` (`:184`), so no node names its hazard. The puzzle board lives under `components/hazard/puzzle/` (`HazardPuzzleDemo`, `/devpuzzle`) with `state/hazard/puzzle-store-actions.ts` and the `hazard-puzzle.engine.ts` presenter. T's checkout holds an untracked, unreferenced `HazardPuzzleBoardView.tsx` in that folder (155 lines: clock, goal, hand, cards in play, dice, reserve, confirm); whoever is drafting it should know the rollout plot will want it.
- **What the swarm saw on the live board (goes away with the rollout, or lands in it):** the round flash ("ROUND n — TAP TO CONTINUE", `HazardOverlays.tsx:153-197`) has no auto-clear and the field guide says it does; the board is drag-only (`HazardBoard.tsx:6-12`) and the guide says tap; one agent skipped the node for it, another wasted 15 taps. Max VITAE drifted after a hazard (165/165, then 165/170 at the next rest) and the reckoning printed +2 and −4 for a net −5: the scar maths in `store-actions.ts:303-369` (`HAZARD_MAXHP_SCAR`, `newMax`, `newHealth`) has no single net line on "The Reckoning" (`RewardsOverlay.tsx`; CRITIQUE RC2 item 9).
- **Proposed split for the W2 plot** (one `/plot`, three rows): (a) the Act 1 puzzle set, one puzzle per live hazard node of the four regions, from HP4e's kept set and HP5d's cost-card candidates; (b) the routing, `app/hazard` resolving to the puzzle board with the puzzle's clock and outcome and the node naming its puzzle; (c) the cuts and the save migration, plus the net VITAE line on the reckoning if the reckoning survives. T's call whether (a) waits on HP4e's rulings (Nov 2) or starts from the thirty as authored.
- **T's call (2026-10-24):** no authored set now. Each of the seven Act 1 hazard nodes (Breakwater 2, Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2; `World/MapEvents/content.ts`) draws a random puzzle from the thirty; when T has played them in `/dev`, T plots "the swap" to a hand-picked seven (`plan/deadlines.md` T Item, 2026-11-13). The W2 plot is the routing and the cuts.
