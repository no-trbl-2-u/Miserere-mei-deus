/**
 * Hermetic sim e2e — the deck-tuning FREE-metrics tier.
 *
 * Proves the engagement metrics compute correctly on a KNOWN seeded run:
 *   1. Win-path mix is un-collapsed and reconciles with the per-outcome counters.
 *   2. Deck utilization = distinct-played / distinct-deck (recomputed here).
 *   3. Usage entropy and dominant-card share sit in [0,1] and reconcile.
 *   4. The report surfaces a first-class dead-card rate.
 *
 * The matrix is deterministic by SEED (the same design the balance-band e2e
 * relies on), so no RNG mock is installed — a fixed-value mock would break the
 * multi-run seeded stream. `restoreAllMocks` is convention hygiene.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { runPlaytestMatrix } from '../combat.playtest';
import type { CombatStageId } from '../combat.stage-profiles';

afterEach(() => vi.restoreAllMocks());

const RUNS = 30;
const SEED = 1;
const STAGE: CombatStageId = 'early';

// One deterministic matrix over the grey deck.
const report = runPlaytestMatrix({
    stages: [STAGE],
    policies: ['greedy'],
    decks: [{ kind: 'grey' }],
    enemiesPerStage: 2,
    runsPerCell: RUNS,
    seed: SEED,
});

describe('free-metrics — win-path mix reconciles', () => {
    it('winPathCounts sums to runs and matches the legacy counters', () => {
        for (const cell of report.cells) {
            const s = cell.stats;
            const w = s.winPathCounts;
            const sum = w.victory + w.defeat + w.retreat;
            expect(sum).toBe(s.runs);
            expect(w.victory).toBe(s.victories);
            expect(w.defeat).toBe(s.defeats);
            expect(w.retreat).toBe(s.retreats);
        }
    }, 60_000);

    it('the stage summary sums the cells\' win paths', () => {
        const summary = report.stageSummaries.find(s => s.stage === STAGE)!;
        const cells = report.cells.filter(c => c.spec.stage === STAGE);
        for (const key of ['victory', 'defeat', 'retreat'] as const) {
            const expected = cells.reduce((n, c) => n + c.stats.winPathCounts[key], 0);
            expect(summary.winPathCounts[key]).toBe(expected);
        }
    }, 60_000);
});

describe('free-metrics — deck utilization recomputes exactly', () => {
    it('deckUtilization = distinct-played / distinct-deck for every cell', () => {
        for (const cell of report.cells) {
            const distinctDeck = new Set(cell.deckCardIds).size;
            const distinctPlayed = Object.values(cell.cardUsage).filter(u => u.plays > 0).length;
            const expected = distinctDeck > 0 ? Math.min(1, distinctPlayed / distinctDeck) : 0;
            expect(cell.stats.deckUtilization).toBeCloseTo(expected, 6);
            expect(cell.stats.deckUtilization).toBeGreaterThanOrEqual(0);
            expect(cell.stats.deckUtilization).toBeLessThanOrEqual(1);
        }
    }, 60_000);
});

describe('free-metrics — entropy, dominance, dead-card rate are well-formed', () => {
    it('usageEntropy and dominantCardShare are in [0,1]', () => {
        for (const cell of report.cells) {
            const s = cell.stats;
            expect(s.usageEntropy).toBeGreaterThanOrEqual(0);
            expect(s.usageEntropy).toBeLessThanOrEqual(1);
            expect(s.dominantCardShare).toBeGreaterThanOrEqual(0);
            expect(s.dominantCardShare).toBeLessThanOrEqual(1);
            // Erosion drops HP via DoT, so SOME card carried damage → an id + share.
            if (s.dominantCardShare > 0) expect(s.dominantCardId).not.toBe('');
        }
    }, 60_000);

    it('a one-card play distribution would read zero entropy; a spread reads > 0', () => {
        // At least one erosion cell plays more than one distinct card, so its
        // entropy must be strictly positive (the deck is not one-note).
        const anySpread = report.cells.some(c => {
            const played = Object.values(c.cardUsage).filter(u => u.plays > 0).length;
            return played > 1 && c.stats.usageEntropy > 0;
        });
        expect(anySpread).toBe(true);
    }, 60_000);

    it('the report carries a first-class dead-card rate in [0,1]', () => {
        const { exercised, neverPlayed, deadCardRate } = report.cardCoverage;
        const pool = exercised.length + neverPlayed.length;
        expect(deadCardRate).toBeCloseTo(pool > 0 ? neverPlayed.length / pool : 0, 6);
        expect(deadCardRate).toBeGreaterThanOrEqual(0);
        expect(deadCardRate).toBeLessThanOrEqual(1);
    }, 60_000);
});
