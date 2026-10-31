/**
 * The Chapter 1 tuning table reads its foes from the node tables, so a foe
 * bound at a node cannot be missing from the report.
 */

import { describe, it, expect } from 'vitest';

import {
    tuningFoes, kittedLane, kittedPlayer, renderReport, paddedShares, TUNING_LANES, TUNING_LEVELS, TUNING_POLICIES,
    type TuningCell,
} from './chapter1-enemies.cli';
import { getCardLane } from '../Cards/card.lanes';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from '../World/MapEvents/content';
import { isUpgradedCardId, nextUpgradeId } from '../Cards/card-upgrades';

describe('chapter1-enemies tuning table', () => {
    it('has a row for every normal and every foe of every elite pair node', () => {
        const rows = tuningFoes();
        for (const [node, foe] of Object.entries(BW_ENCOUNTER_FOES)) {
            const row = rows.find(r => r.slug === foe.slug && r.level === foe.level && !r.elite);
            expect(row?.nodes, node).toContain(node);
        }
        for (const [node, draw] of Object.entries(BW_ELITE_DRAWS)) {
            for (const foe of draw) {
                const row = rows.find(r => r.slug === foe.slug && r.level === foe.level && r.elite);
                expect(row?.nodes, `${node}/${foe.slug}`).toContain(node);
            }
        }
    });

    it('stages each foe at its node level', () => {
        for (const row of tuningFoes()) expect(row.enemy.level).toBe(row.level);
    });

    it('kits each lane with its test deck upgraded once and its relics (grey none)', () => {
        for (const lane of TUNING_LANES) {
            const kit = kittedLane(lane);
            const deck = getCardLane(lane)!.testDeck;
            expect(kit.cards.length).toBe(deck.length);
            deck.forEach((id, i) => {
                // Upgraded when the card has an upgrade, at base only when it has none.
                if (nextUpgradeId(id)) expect(isUpgradedCardId(kit.cards[i]), `${lane}/${id}`).toBe(true);
                else expect(kit.cards[i], `${lane}/${id}`).toBe(id);
            });
            expect(kit.cards.some(isUpgradedCardId)).toBe(true);
            expect(kit.relics.length).toBe(lane === 'grey' ? 0 : 3);
            expect(kittedPlayer(8, kit).equipment.relics.length).toBe(kit.relics.length);
        }
    });

    /** One cell per policy, lane, level and foe; `shares` and the turns encode where it sits. */
    function fakeCells(shares: (foeIdx: number, declared: number) => number[]): TuningCell[] {
        const foes = tuningFoes();
        const out: TuningCell[] = [];
        for (const policy of TUNING_POLICIES) {
            TUNING_LANES.forEach((lane, li) => TUNING_LEVELS.forEach((level, vi) => foes.forEach((foe, fi) => {
                out.push({
                    policy, lane, level, foe, playerMaxVitae: 100,
                    summary: {
                        runs: 1, winRate: 1, meanTurns: 0, mercyRate: 0, meanSacrifices: 0, meanLeechPeak: 0, maxLeechPeak: 0,
                        meanTurnsWon: (policy === 'witness' ? 500 : 0) + fi * 10 + li * 2 + vi + 1,
                        meanVitaeLeft: 100,
                        phaseShares: shares(fi, foe.enemy.phases?.length ?? 1),
                    },
                });
            })));
        }
        return out;
    }

    const opts = { runs: 1, seed: 1, commit: 'abc', date: '2026-10-31' };

    it('lands each cell in its foe row and its lane and level column', () => {
        const md = renderReport(fakeCells(() => [1]), opts);
        const sections = { 'human-like': 0, witness: 500 } as const;
        const parts = md.split('## Witness driver');
        const bodies = { 'human-like': parts[0], witness: parts[1] };
        const foes = tuningFoes();
        for (const policy of TUNING_POLICIES) {
            const rows = bodies[policy].split('\n').filter(l => l.startsWith('| ') && l.includes(' t / '));
            expect(rows.length, policy).toBe(foes.length);
            foes.forEach((foe, fi) => {
                const label = `${foe.slug}${foe.elite ? ' (elite)' : ''}`;
                const row = rows.find(r => r.startsWith(`| ${label} | L${foe.level} |`));
                expect(row, `${policy}/${label}`).toBeDefined();
                const cols = row!.split(' | ').slice(-TUNING_LANES.length * TUNING_LEVELS.length);
                let col = 0;
                TUNING_LANES.forEach((lane, li) => TUNING_LEVELS.forEach((level, vi) => {
                    const turns = sections[policy] + fi * 10 + li * 2 + vi + 1;
                    expect(cols[col].replace(/ \|$/, ''), `${policy}/${label}/${lane} L${level}`)
                        .toBe(`${turns.toFixed(1)} t / 0.0 (0%)`);
                    col++;
                }));
            });
        }
    });

    it('renders a phase never reached as an explicit 0%', () => {
        const cells = fakeCells(() => [1]);
        const phased = tuningFoes().filter(f => f.enemy.phases);
        expect(phased.length).toBeGreaterThan(0);
        for (const c of cells) {
            const declared = c.foe.enemy.phases?.length ?? 1;
            expect(paddedShares(c)).toHaveLength(declared);
        }
        const md = renderReport(cells, opts);
        const foe = phased[0];
        const label = `${foe.slug}${foe.elite ? ' (elite)' : ''}`;
        const zeros = Array.from({ length: (foe.enemy.phases as unknown[]).length - 1 }, () => '0%');
        const expected = ['100%', ...zeros].join(' / ');
        const row = md.split('\n').find(l => l.startsWith(`| ${label} | L${foe.level} | ${expected} |`));
        expect(row).toBeDefined();
    });

    it('says only the upgradable cards were upgraded', () => {
        const md = renderReport([], opts);
        for (const lane of TUNING_LANES) {
            const kit = kittedLane(lane);
            const n = kit.cards.filter(isUpgradedCardId).length;
            const claim = n === kit.cards.length ? 'all' : `${n}`;
            expect(md).toContain(`- ${lane}: ${kit.cards.length} cards, ${claim} upgraded once`);
            if (n < kit.cards.length) expect(md).toContain(`${claim} upgraded once (the rest have no upgrade)`);
        }
    });

    it('names its commit and seed in the stamp', () => {
        const md = renderReport([], { runs: 5, seed: 7, commit: 'abc1234', date: '2026-10-31' });
        expect(md).toContain('measured at abc1234, 2026-10-31, 5 runs per cell, seed 7');
    });
});
