/**
 * Hermetic sim e2e — playtest matrix smoke test.
 *
 * A loose smoke test, pinning no balance number: the matrix runs across
 * every stage without crashing and every cell's outcome accounting is
 * exact and produces a finite win rate.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { runPlaytestMatrix, type PlaytestReport } from '../combat.playtest';
import type { CombatStageId } from '../combat.stage-profiles';

afterEach(() => vi.restoreAllMocks());

/** Matrix kept small on purpose: 2 enemies per stage, 30 runs per cell. */
const RUNS_PER_CELL = 30;
const SEED = 1;

let cachedMain: PlaytestReport | null = null;
function mainReport(): PlaytestReport {
    cachedMain = cachedMain ?? runPlaytestMatrix({
        policies: ['greedy', 'blind'],
        decks: [{ kind: 'grey' }],
        enemiesPerStage: 2,
        runsPerCell: RUNS_PER_CELL,
        seed: SEED,
    });
    return cachedMain;
}

const STAGES: readonly CombatStageId[] = ['early', 'mid', 'late'];

describe('playtest matrix smoke test — the harness runs and accounts exactly', () => {
    it('every stage produces cells; every cell terminates all its runs with a finite win rate', () => {
        const report = mainReport();
        for (const stage of STAGES) {
            const cells = report.cells.filter(c => c.spec.stage === stage);
            expect(cells.length, `no cells ran for stage '${stage}'`).toBeGreaterThan(0);
        }
        for (const cell of report.cells) {
            const s = cell.stats;
            expect(s.runs).toBe(RUNS_PER_CELL);
            expect(s.victories + s.defeats + s.retreats).toBe(s.runs);
            expect(Number.isFinite(s.winRate)).toBe(true);
            expect(s.winRate).toBeGreaterThanOrEqual(0);
            expect(s.winRate).toBeLessThanOrEqual(1);
            expect(s.avgRounds).toBeGreaterThan(0);
        }
    }, 120_000);
});
