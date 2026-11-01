# Harness-validity finding: the combat-tuning matrix does not witness status-interaction depth

**Date:** 2026-06-20 · **Source:** continuous multi-loop tuning PR (#182) watchdog
re-tunes after Phases 155 and 156 landed on `main`.

## The observation

The combat-tuning matrix baseline is **bit-identical** across three content states:

| Content state | Matrix baseline (runs=50) |
|---|---|
| Pre-155 (my branch base) | 0/36 in band; aggregate 0.0815 (band 0.0620 + engage 0.0195); leverage 57% / activity 59%; 13/36 below floor; witness −11% (strat 82% vs aggr 93%); worst defeat 96% |
| + Phase 155 (`c7d8b44`, "status play resolves the fight it has already won" / combat re-centering) | **identical** |
| + Phase 156 (`83d0919`, "status-effect interaction engine goes live" — amplification registry + new buff/debuff content + `effect-modifiers.ts`) | **identical** |

Two consecutive, doctrine-central status-effect phases moved the status-focused
tuning matrix by **exactly zero** on every aggregate metric.

## It is NOT a harness bypass (traced)

I verified the matrix's combat path reaches the changed code, so this is not a
stale-proxy / wrong-import problem:

- Matrix → `matrix.runner.ts` → `runPlaytestScenarioWith` (`src/Playtest/playtest.runner.ts`)
  → `resolveCombatRound` + `isCombatOngoing` (`src/Combat`).
- **Phase 155 path is live:** `isCombatOngoing` → `getEffectsResolutionOutcome`
  (`src/Combat/index.ts:178`) → `analyzeEffectsForResolution`
  (`src/Combat/effect-resolution.ts`, the file Phase 155 changed).
- **Phase 156 path is live:** the production round applies effects via
  `src/Combat/effects.ts` / `stats.ts` → `getActiveEffectModifiers`
  (`effect-modifiers.ts`), which imports `EFFECT_INTERACTIONS` from
  `src/Effects/amplification.registry.ts` and applies live `amplify_damage`
  combos (`effect-modifiers.ts:22-38,139`).

Both new mechanics are wired into the path the matrix runs.

## The actual gap: the bots never trigger the conditions

Since the code is reachable but the outcomes are unchanged, the matrix's seeded
bot scenarios do not satisfy the new mechanics' trigger conditions:

1. **No combo pairings.** The Phase 156 amplification engine rewards specific
   status *pairings* (`amplify_damage` combos). The matrix's STRATEGIST/mixed
   bots (`strategist.knowledge.ts` policy + the loadouts in `loadout.builder.ts`)
   do not deliberately stack the effect pairs that trigger amplification, so the
   per-effect DoT multiplier is never applied in the measured runs.
2. **New effects likely unreachable.** Phase 156 added new entries to
   `buffs.library.json` / `debuffs.library.json`. The matrix builds loadouts from
   existing character skills; if no known skill applies the new effects, the bots
   cannot exercise them at all.
3. **Resolution thresholds don't fire.** Phase 155's victory/friendship
   resolution is gated by the `resolutionDot*` registry knobs (`maxRoundsToKill`
   10, `damageThreshold` 2). The matrix's timeout cells (e.g. cindergeist-revenant
   at 76.7 rounds) have DoT well below the rate needed to resolve within the
   horizon — the same knobs the loop found it could not significantly tune.

## Why this matters (doctrine-level)

Status effects are the project's stated MAIN fun and the loop's north star, and
the loop's own `engagement.metrics` claims to measure status *leverage*. But the
matrix currently measures effect **presence/activity**, not the new interaction
**leverage** — so it is structurally blind to exactly the axis the engine is now
investing in. The combat loop reporting "0/36 in band, witness −11%, nothing to
auto-apply" may partly reflect that its witness (the STRATEGIST bot) cannot play
the status-interaction game the engine now supports.

## Recommendation (propose-only — needs T; bot change is structural)

Teach the matrix's STRATEGIST policy (and loadouts) to apply the effect pairings
the Phase 156 amplification registry rewards, and ensure the new Phase 155/156
effects are attached to skills the matrix's characters can know. Per the tuning
skills' rule, this is a **legitimate** bot change — the bot *provably diverges*
from the play pattern the engine now models (it does not use combos that exist),
which is the documented exception to "don't tune the bots to pass bands." It is
NOT flattering a content change; it is making the instrument able to see the
mechanic at all.

Until then, treat combat-matrix results on status-depth phases as **non-witnessing**:
a flat baseline across Phases 155–156 is evidence of an instrument gap, not of the
mechanics being inert in production.

Suggested follow-up: promote to a `## Pending` candidate in
`plan/PHASE_CANDIDATES.md` (kept out of this commit to avoid colliding with the
active `/expand` loop that owns that file): _"Combat-tuning bot policy + loadouts
exercise the live status-interaction (amplification) engine so the matrix can
witness status-combo leverage."_
