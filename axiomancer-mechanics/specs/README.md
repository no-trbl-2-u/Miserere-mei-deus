# Specs

> A focused planning surface so you (the developer) and an AI assistant can
> have a structured conversation about what to build next, in what order, and
> how. Each spec is scoped to one body of work, surfaces the open design
> decisions, and ends with a concrete acceptance checklist.

## Why this folder exists

[`plan/steps/01_build_plan.md`](../../plan/steps/01_build_plan.md) lists *what* is left to do. [`plan/AUDIT.md`](../../plan/AUDIT.md) / [`plan/PHASE_CANDIDATES.md`](../../plan/PHASE_CANDIDATES.md) list *what
isn't decided*. Neither tells you *what to do next* or *how to start*. The
specs in this folder bridge that gap: each one is small enough to start work
from, structured around the decisions that block implementation, and tagged
with dependencies so you can pick the right one to pull next.

## Quick links

- **First time here?** Read [`00-how-to-use-specs.md`](./00-how-to-use-specs.md).
- **Back for another session?** Skip to the **Index** table below.

## How to use a spec (the conversation loop)

Every spec follows the same shape:

1. **Goal & one-line summary** — what success looks like.
2. **Why now / dependencies** — what this unblocks; what blocks it.
3. **Current state** — what already exists in the code.
4. **Open questions to answer** — numbered, with `> Your answer:` placeholders.
   Answer in-place. The AI will read your answers as authoritative when it
   implements.
5. **Proposed approach** — the AI's recommended default if you don't
   override, broken into discrete commits.
6. **Acceptance checklist** — what "done" means.
7. **Out of scope** — explicitly deferred items.

### The conversation loop

```
1. Pick a spec from the index below.
2. Read it end-to-end; skim sections (1)-(3).
3. Answer the questions in section (4) inline. Short answers are fine
   ("yes / no / option B"); add a note when you have a strong opinion.
4. Tell the AI: "Spec NN is ready, please implement."
5. The AI will:
   a. Re-read the spec.
   b. Confirm it has every answer it needs (asks if any are still TBD).
   c. Open a branch and work through the commits in section (5).
   d. Update section (6) as it goes; tick the boxes as commits land.
6. When the checklist is fully ticked, mark the spec [DONE] in this file
   and update the roadmap.
```

If a spec turns out to be too big once you start, say so — the AI will split
it into a follow-up spec rather than ploughing on.

## Index

Every numbered spec, all of them history. No numbered spec is current: the
game as built is [`docs/game-model.md`](../../docs/game-model.md) at the
repo root, the live rules are in `docs/` and the source, and the design
lands in `plan/revamp/`. What remains here is the authored content folders
`characters/`, `story/`, `world/` (templates + `W-01`, `W-02`).

| # | Spec | Notes |
|---|------|-------|
| 1 DONE | `01-effects-engine-completion.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/01-effects-engine-completion.md`) *(archived T5)* | Unwired effect mechanics (DoT, stat mods, action restrictions). |
| 2 DONE | `02-combat-round-resolver.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/02-combat-round-resolver.md`) *(archived T1)* | Legacy `resolveCombatRound` (removed in trim T2a). |
| 3 DONE | `03-tier2-tier3-effect-procs.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/03-tier2-tier3-effect-procs.md`) *(archived T1)* | Stance × action proc tables (legacy round model). |
| 4 / 4b REMOVED | `04-skills-engine.md`, `04b-skills-library-and-e2e.md` | Removed in the skill→card unification; see `src/Cards/`. |
| 5 / 5b DONE | `05-equipment-engine.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/05-equipment-engine.md`) *(archived T1)*, `05b-equipment-library.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/05b-equipment-library.md`) *(archived T1)* | Equipment engine + library. |
| 6 DONE | `06-character-progression.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/06-character-progression.md`) *(archived T5)* | Phase 5 character progression. |
| 7 DONE | `07-enemy-content-and-ai.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/07-enemy-content-and-ai.md`) *(archived T1)* | Phase 6 enemy content + AI. |
| 8 DONE | `08-world-content-and-hazards.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/08-world-content-and-hazards.md`) *(archived T5)* | Phase 7 world content; live API in `docs/world.md`. |
| 9 DONE | `09-game-loop-orchestration.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/09-game-loop-orchestration.md`) *(archived T5)* | Phase 8 orchestration + `createGameStore`. |
| 10 REMOVED | `10-moral-difficulty-meter.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/10-moral-difficulty-meter.md`) *(archived T5)* | Moral meter (GRACE). Removed 2026-09-27 (T6, D39). |
| 11 DONE | `11-rng-seeding-and-test-harness.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/11-rng-seeding-and-test-harness.md`) *(archived T5)* | Seeded RNG + test harness. |
| 12 DONE | `12-package-architecture-and-events.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/12-package-architecture-and-events.md`) *(archived T5)* | Engine ↔ UI boundary. |
| 14 REMOVED | `14-philosophical-alignment.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/14-philosophical-alignment.md`) *(archived T5)* | Phases 42–46 alignment cube (THE OATHS). Removed 2026-09-27 (T6, D39). |
| 15 DONE | `15-difficulty-curve.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/15-difficulty-curve.md`) *(archived T1)* | Phase 116 difficulty bands. |
| 16 DONE | Phase 99 — unlocked skill access (no spec file) | Shipped `5759932`; re-shipped as Phase 141 `aad63c5`. |
| 23 DONE | `23-map-events.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/23-map-events.md`) *(archived T5)* | MapEvents engine + pool authoring; live doc `docs/world.md`. |
| 25 SUPERSEDED | `25-hazard-pattern-combat.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/25-hazard-pattern-combat.md`) *(archived T5)* | The card-and-dice driver (`resolveCombatPhase`), now the only combat engine. Its two-pressure-track win condition was removed 2026-06-22 (VITAE is the sole enemy bar) and the legacy `resolveCombatRound` it shipped beside is gone (T2a). Live rules: `docs/combat.md`. |
| 26 / 27 draft | `26-catalyst-multiplicative-scaling.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/26-catalyst-multiplicative-scaling.md`) *(archived T1)*, `27-card-salvage-sideways-play.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/27-card-salvage-sideways-play.md`) *(archived T1)* | Never built. |
| 28 draft | `28-curated-combat-deck-and-synergy.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/28-curated-combat-deck-and-synergy.md`) *(archived T5)* | Superseded by the preset-deck model and THE BIG NUMBERS REWRITE. |
| 29 / 30 superseded | `29-reactive-enemies-telegraphed-intent.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/29-reactive-enemies-telegraphed-intent.md`) *(archived T1)*, `30-projected-lethality-readout.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t1/axiomancer-mechanics/specs/30-projected-lethality-readout.md`) *(archived T1)* | Partially shipped / shipped by other phases. |
| 31 HISTORICAL | `31-fate-engine-card-effect-revamp.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/31-fate-engine-card-effect-revamp.md`) *(archived T5)* | Fate Engine revamp (P0 shipped 2026-07-05); superseded by specs 32 → 33 and THE BIG NUMBERS REWRITE. |
| 32 HISTORICAL | `32-no-strike-card-library.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/32-no-strike-card-library.md`) *(archived T5)* | Themed no-strike library; superseded by THE BIG NUMBERS REWRITE (2026-09-02). |
| 33 RETIRED | `33-upgradeable-dice.md` *(deleted in R10b; read it with `git show 5b3e64b6:axiomancer-mechanics/specs/33-upgradeable-dice.md`)* | The four-die model. What is still true (dice, faces, Conviction, die gear) is in `docs/game-model.md`; its stance layer and preset curve are gone. |
| 34 RETIRED | `34-dark-fantasy-campaign.md` *(deleted in R10b; `git show 5b3e64b6:axiomancer-mechanics/specs/34-dark-fantasy-campaign.md`)* | The campaign bible. Its live voice rules (§2, §2.5 MB-1 to MB-8) are now [`docs/narrative/DELIVERY_REGISTER.md`](../docs/narrative/DELIVERY_REGISTER.md); the rest was repealed or retired. |
| 35 HISTORICAL | `35-objective-function-v2.md` (`archive-pre-revamp:plan/archive/2026-09-25-trim-t5/axiomancer-mechanics/specs/35-objective-function-v2.md`) *(archived T5)* | Combat Quality Index — repealed 2026-09-02; `combat.objective.ts` still computes it as a report-only reading. |

## Conventions

- A spec is a *living document*. As you answer questions, edit the spec
  in-place. Treat it as the canonical source-of-truth for that body of work.
- One spec, one branch, one PR — unless a spec explicitly chunks itself
  into commits that land separately.
- When a spec is fully implemented, append `> [DONE on YYYY-MM-DD — see PR #N]`
  at the top and link the PR.
- Don't be afraid to write `> Your answer: defer — implement default and
  revisit.` That's a valid answer too.