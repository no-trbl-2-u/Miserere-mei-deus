/**
 * The Chapter 1 tuning table reads its foes from the node tables, so a foe
 * bound at a node cannot be missing from the report.
 */

import { describe, it, expect } from 'vitest';

import { tuningFoes, kittedLane, kittedPlayer, renderReport, TUNING_LANES } from './chapter1-enemies.cli';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from '../World/MapEvents/content';
import { isUpgradedCardId } from '../Cards/card-upgrades';

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
            expect(kit.cards.some(isUpgradedCardId)).toBe(true);
            expect(kit.relics.length).toBe(lane === 'grey' ? 0 : 3);
            expect(kittedPlayer(8, kit).equipment.relics.length).toBe(kit.relics.length);
        }
    });

    it('names its commit and seed in the stamp', () => {
        const md = renderReport([], { runs: 5, seed: 7, commit: 'abc1234', date: '2026-10-31' });
        expect(md).toContain('measured at abc1234, 2026-10-31, 5 runs per cell, seed 7');
    });
});
