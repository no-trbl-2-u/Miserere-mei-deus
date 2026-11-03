/**
 * Hermetic sim e2e — the playtest matrix harness (`combat.playtest`).
 *
 * Verifies the matrix is fully seed-deterministic (identical options →
 * deeply-equal reports), every cell's outcome accounting is exact
 * (V+M+D+R === runs, fractions in [0,1]), per-card usage never names a
 * card outside the resolved deck, and the report carries one per-deck
 * rollup per deck label.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import {
    runPlaytestCell, runPlaytestMatrix, formatPlaytestReport,
    type PlaytestMatrixOptions, type PlaytestReport,
} from '../combat.playtest';
import { registerSandboxCards, clearSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';

afterEach(() => {
    vi.restoreAllMocks();
    clearSandboxCards();
});

/** A minimal sandbox DoT card (the card purge, P1, 2026-09-27): a card the
 *  early-stage player has not learned, for the knowledge-grant check. */
function sandboxDotCard(id: string, overrides: Partial<Card> = {}): Card {
    return {
        id, name: id, color: 'body',
        description: 'QA fixture: a plain poison.',
        tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy',
        free: { damage: 1 },
        combatEffects: [{ effectId: 'debuff_poison', appliedTo: 'opponent', intensity: 3, duration: 3 }],
        addedIn: '2026-09-27', tags: ['qa'],
        ...overrides,
    };
}

/** Small matrix reused across assertions: 1 enemy per stage, 8 runs per cell. */
const SMALL: PlaytestMatrixOptions = {
    stages: ['early', 'late'],
    policies: ['greedy', 'chaos'],
    enemiesPerStage: 1,
    runsPerCell: 8,
    seed: 3,
};

let cachedSmall: PlaytestReport | null = null;
function smallReport(): PlaytestReport {
    cachedSmall = cachedSmall ?? runPlaytestMatrix(SMALL);
    return cachedSmall;
}

const FRACTION_KEYS = [
    'winRate', 'statusEngagement', 'dotHpFraction', 'strikeFraction',
    'mechanicBurstFraction', 'guardMitigatedFraction',
] as const;

describe('playtest matrix — determinism', () => {
    it('two runs with identical options produce deeply-equal reports', () => {
        const again = runPlaytestMatrix(SMALL);
        expect(again).toEqual(smallReport());
    }, 60_000);

    it('runPlaytestCell is deterministic for an identical spec', () => {
        const spec = {
            stage: 'early' as const,
            enemySlug: 'float-eye',
            policyId: 'dot-weaver' as const,
            deck: { kind: 'grey' as const },
            runs: 6,
            seed: 11,
        };
        expect(runPlaytestCell(spec)).toEqual(runPlaytestCell(spec));
    }, 30_000);
});

describe('playtest matrix — cell invariants', () => {
    it('every cell: victories + defeats + retreats === runs; winRate consistent', () => {
        const report = smallReport();
        expect(report.cells.length).toBe(4); // 2 stages x 1 enemy x 2 policies x 1 deck
        for (const cell of report.cells) {
            const s = cell.stats;
            expect(s.runs).toBe(SMALL.runsPerCell);
            expect(s.victories + s.defeats + s.retreats).toBe(s.runs);
            expect(s.winRate).toBeCloseTo(s.victories / s.runs, 10);
            for (const key of FRACTION_KEYS) {
                expect(s[key], `${key} out of [0,1]`).toBeGreaterThanOrEqual(0);
                expect(s[key], `${key} out of [0,1]`).toBeLessThanOrEqual(1);
            }
        }
    }, 60_000);

    it('cardUsage keys are a subset of the resolved deck (never-drawn cards simply absent)', () => {
        const report = smallReport();
        for (const cell of report.cells) {
            expect(cell.deckCardIds.length).toBeGreaterThan(0);
            expect(cell.deckCardIds).not.toContain('card-retreat'); // no in-combat retreat exists
            const allowed = new Set(cell.deckCardIds);
            for (const key of Object.keys(cell.cardUsage)) {
                expect(allowed.has(key), `cell played '${key}' outside its deck`).toBe(true);
            }
        }
    }, 60_000);

    it('stage summaries cover exactly the stages run, weighted over their cells', () => {
        const report = smallReport();
        expect(report.stageSummaries.map(s => s.stage)).toEqual(['early', 'late']);
        for (const summary of report.stageSummaries) {
            expect(summary.cells).toBe(2);
            expect(summary.winRate).toBeGreaterThanOrEqual(0);
            expect(summary.winRate).toBeLessThanOrEqual(1);
            expect(summary.avgRounds).toBeGreaterThan(0);
        }
        // Coverage universe is the union of eligible pools; disjoint partition.
        const { exercised, neverPlayed } = report.cardCoverage;
        expect(exercised.length + neverPlayed.length).toBeGreaterThan(0);
        expect(exercised.filter(id => neverPlayed.includes(id))).toEqual([]);
    }, 60_000);
});

describe('playtest matrix — per-deck rollups', () => {
    it('the default grey deck gets one rollup covering every stage run', () => {
        const report = smallReport();
        expect(report.deckSummaries.map(d => d.deckLabel)).toEqual(['grey']);
        const [grey] = report.deckSummaries;
        expect(grey.stages.map(r => r.stage)).toEqual(['early', 'late']);
        expect(grey.complexity.uniqueCards).toBe(3);
        expect(grey.skillGap).not.toBeNull();
    }, 60_000);
});

describe('playtest report formatting', () => {
    it('renders aligned tables with cells, stage summaries, and card coverage', () => {
        const text = formatPlaytestReport(smallReport());
        expect(text).toContain('Hazard combat playtest matrix');
        expect(text).toContain('Stage summaries');
        expect(text).toContain('Card coverage:');
        expect(text).toContain('early');
        expect(text).toContain('late');
        expect(text).not.toContain('Per-card usage');
    }, 60_000);

    it('perCard option appends the per-card usage table', () => {
        const text = formatPlaytestReport(smallReport(), { perCard: true });
        expect(text).toContain('Per-card usage');
        expect(text).toContain('statusLands');
    }, 60_000);
});

describe('playtest harness — honest failures', () => {
    it('throws on an unknown enemy slug', () => {
        expect(() => runPlaytestCell({
            stage: 'early', enemySlug: 'no-such-foe', policyId: 'greedy',
            deck: { kind: 'grey' }, runs: 1, seed: 1,
        })).toThrow(/Unknown enemy slug/);
    });

    it('grants the stage player knowledge of explicit deck cards (a deck above the stage gate still runs)', () => {
        // Rewritten after the card purge (P1, 2026-09-27): the tier-3 preset
        // card (communion-of-the-worm) is gone, so a sandbox tier-3 card the
        // early-stage player has not learned stands in. The harness grants
        // deck knowledge so the cell still runs and the card is PLAYED.
        registerSandboxCards([sandboxDotCard('qa-tier3-dot', { tier: 3, rank: 5 })]);
        const cell = runPlaytestCell({
            stage: 'early', enemySlug: 'float-eye', policyId: 'greedy',
            deck: { kind: 'cards', cardIds: ['qa-tier3-dot', 'qa-tier3-dot', 'grey-strike', 'grey-ward'] },
            runs: 2, seed: 1,
        });
        expect(cell.deckCardIds).toContain('qa-tier3-dot');
        expect(cell.stats.runs).toBe(2);
        expect(cell.cardUsage['qa-tier3-dot']?.plays ?? 0).toBeGreaterThan(0);
    }, 30_000);
});
