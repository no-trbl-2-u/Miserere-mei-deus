#!/usr/bin/env node

/**
 * Hazard-Pattern Combat playtest CLI — the stage x policy x deck matrix.
 *
 * Sweeps `runPlaytestMatrix` (campaign stages x sim policies x deck
 * selections) and prints the aligned report.
 *
 * **`cqi`, the Combat Quality Index** (`src/Combat/combat.objective.ts`), is
 * printed as a diagnostic: does the deck's engine RUN — assembling across
 * turns (arc), offering more than one line per powering die (width), carried
 * by a lead card that isn't the whole deck (identity), and flowing through
 * Conviction / the Surge meter / the Dice (spine). Nothing is graded against
 * it: no combat objective function governs, CQI included. `statusEngagement` and `dotHpFraction`
 * print beside it as warning lights, never as a target.
 *
 * Usage:
 *   npm run combat-playtest                                        # all stages, greedy witness, the grey deck
 *   npm run combat-playtest -- --stage=early --policy=all
 *   npm run combat-playtest -- --deck=cards:grey-strike,grey-ward --runs=100 --seed=7
 *   npm run combat-playtest -- --enemy=green-jelly --cards
 *   npm run combat-playtest -- --json
 *
 * Flags (house style: `--k=v` for values, bare `--k` for switches):
 *   --stage=early|mid|late|all   stages to sweep (default all)
 *   --policy=<id|all>                       sim policy roster (default greedy)
 *   --deck=grey|cards:a,b,c                 deck selection (default grey); the
 *                                           report prints a per-deck x stage rollup
 *                                           (doctrine-band fit, skill gap, complexity)
 *   --enemy=<slug>                          restrict rosters to one enemy
 *   --runs=N                                runs per cell (default 60)
 *   --seed=N                                base seed (default 1)
 *   (dice model: always Upgradeable Dice, the only combat model.
 *    `--upgradeable-dice` is accepted as a no-op for old scripts;
 *    `--legacy-dice` fails, since that model does not exist.)
 *   --cards                                 append the per-card usage table
 *   --json                                  print the PlaytestReport as JSON — and
 *                                           NOTHING else (agent consumption)
 *   --log-level=<trace|debug|info|warn|error>
 *   --log-file=<path>                       AXM Log (docs/logging.md): enable the
 *                                           structured logger for the sweep. At the
 *                                           --log-file default (info) the JSONL is a
 *                                           REPLAY INDEX — one `rng/seed-set` per run
 *                                           plus one `cli/playtest-cell` summary per
 *                                           cell. --log-level=debug adds the full
 *                                           per-encounter combat event stream (large:
 *                                           ~100 events x runs x cells — zoom into a
 *                                           single seed with `npm run combat` instead
 *                                           when possible). No flags → logger off,
 *                                           sweep runs at full speed. stdout purity
 *                                           under --json is preserved (file/stderr
 *                                           sinks only).
 *
 * UI only: parse flags → runPlaytestMatrix → print. All logic lives in
 * `src/Combat/combat.playtest.ts`.
 */

import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import {
    COMBAT_STAGE_ORDER, COMBAT_STAGE_PROFILES, isCombatStageId,
    type CombatStageId,
} from '../Combat/combat.stage-profiles';
import {
    COMBAT_SIM_POLICY_ORDER, getSimPolicy,
    type CombatSimPolicyId,
} from '../Combat/combat.sim-policies';
import {
    formatPlaytestReport, parseDeckSelectionArg, runPlaytestMatrix,
    type CombatDeckSelection,
} from '../Combat/combat.playtest';
import { getLogger, isLoggingEnabled } from '../Log';
import { attachCliLogSinks } from './io';

const flag = (k: string): string | undefined => {
    const a = process.argv.find(x => x.startsWith(`--${k}=`));
    return a ? a.slice(k.length + 3) : undefined;
};
const has = (k: string): boolean => process.argv.includes(`--${k}`);

function fail(message: string): never {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}

function parseStages(raw: string): CombatStageId[] {
    if (raw === 'all') return [...COMBAT_STAGE_ORDER];
    if (isCombatStageId(raw)) return [raw];
    return fail(`Unknown --stage '${raw}'. Valid: ${[...COMBAT_STAGE_ORDER, 'all'].join('|')}`);
}

function parsePolicies(raw: string): CombatSimPolicyId[] {
    if (raw === 'all') return [...COMBAT_SIM_POLICY_ORDER];
    const policy = getSimPolicy(raw);
    if (!policy) return fail(`Unknown --policy '${raw}'. Valid: ${[...COMBAT_SIM_POLICY_ORDER, 'all'].join('|')}`);
    return [policy.id];
}

function parseDeck(raw: string): CombatDeckSelection {
    try {
        return parseDeckSelectionArg(raw);
    } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
    }
}

function main(): void {
    const json = has('json');
    const perCard = has('cards');

    // AXM Log (docs/logging.md) — opt-in; without the flags the logger stays
    // disabled and the sweep pays one boolean read per event batch.
    try {
        attachCliLogSinks({ logLevel: flag('log-level'), logFile: flag('log-file') });
    } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
    }

    let stages = parseStages(flag('stage') ?? 'all');
    const policies = parsePolicies(flag('policy') ?? 'greedy');
    const deckArg = flag('deck') ?? 'grey';
    const decks: CombatDeckSelection[] = [parseDeck(deckArg)];

    const runs = Number(flag('runs') ?? '60');
    if (!Number.isInteger(runs) || runs < 1) fail('--runs must be a positive integer.');
    const seed = Number(flag('seed') ?? '1');
    if (!Number.isFinite(seed)) fail('--seed must be a number.');

    const enemySlug = flag('enemy');
    if (enemySlug !== undefined) {
        if (!(enemySlug in ENEMY_REGISTRY)) {
            fail(`Unknown --enemy '${enemySlug}'. Valid: ${Object.keys(ENEMY_REGISTRY).join(', ')}`);
        }
        stages = stages.filter(id => COMBAT_STAGE_PROFILES[id].enemySlugs.includes(enemySlug));
        if (stages.length === 0) {
            fail(`Enemy '${enemySlug}' is not in any selected stage roster. Pick a stage that fields it (--stage=all to search every roster).`);
        }
    }

    // Upgradeable Dice is the only combat model; asking for the old
    // comparison model fails loudly rather than silently measuring something
    // else.
    // `--upgradeable-dice` stays accepted as a no-op for existing scripts.
    if (has('legacy-dice')) {
        fail('--legacy-dice is gone: the pre-spec-33 dice model was deleted (D7). Spec 33 is the only model.');
    }
    const report = runPlaytestMatrix({
        stages,
        policies,
        decks,
        runsPerCell: runs,
        seed,
        enemySlugs: enemySlug !== undefined ? [enemySlug] : undefined,
    });

    // Per-cell replay index: enough to re-run any cell (or a single seed via
    // `npm run combat`) next to its headline witnesses. Info level, so it
    // lands in the JSONL even without --log-level=debug.
    if (isLoggingEnabled()) {
        for (const cell of report.cells) {
            getLogger().info('cli', 'playtest-cell', {
                stage: cell.spec.stage,
                enemy: cell.spec.enemySlug,
                policy: cell.spec.policyId,
                deck: cell.spec.deck,
                runs: cell.spec.runs,
                seed: cell.spec.seed,
                winRate: cell.stats.winRate,
                statusEngagement: cell.stats.statusEngagement,
                dotHpFraction: cell.stats.dotHpFraction,
                avgRounds: cell.stats.avgRounds,
                // The objective function, per cell, in the replay index.
                combatQualityIndex: cell.stats.combatQuality.index,
                combatQualityComponents: cell.stats.combatQuality.components,
                combatQualitySpine: cell.stats.combatQuality.spineComponents,
            });
        }
    }

    if (json) {
        // --json purity: the report object and nothing else on stdout.
        process.stdout.write(`${JSON.stringify(report)}\n`);
        return;
    }

    process.stdout.write(
        `\nHazard combat playtest — stages=[${stages.join(', ')}] policies=[${policies.join(', ')}]`
        + ` deck=${deckArg}${enemySlug !== undefined ? ` enemy=${enemySlug}` : ''} runs=${runs} seed=${seed}\n`,
    );
    process.stdout.write('\n');
    process.stdout.write(formatPlaytestReport(report, { perCard }));
}

main();
