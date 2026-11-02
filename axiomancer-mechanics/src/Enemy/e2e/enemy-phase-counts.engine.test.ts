/**
 * Hermetic E2E — every roster foe has its tier's phase count (T, 2026-10-29):
 * a normal 2 phases (one change at 30%), an elite 3 (60%, 30%), a boss 4
 * (75%, 50%, 25%).
 *
 * A `phases` foe counts its `phases` entries; its lines come from its tier.
 * A deck foe (the Death Beholder) counts its VITAE stages plus its opening,
 * and each stage must sit on its tier's line.
 */

import { describe, it, expect } from 'vitest';

import { EnemyLibrary } from '../enemy.library';
import { PHASE_LINES, enemyPhaseTier } from '../enemy-phases';

describe('enemy phase counts per tier', () => {
    for (const foe of EnemyLibrary) {
        const tier = enemyPhaseTier(foe.difficulty);
        const lines = PHASE_LINES[tier];

        it(`${foe.name} (${foe.difficulty}) has ${lines.length + 1} phases`, () => {
            if (foe.phases && foe.phases.length > 0) {
                expect(foe.phases).toHaveLength(lines.length + 1);
                return;
            }
            const breaks = (foe.stages ?? [])
                .map(stage => stage.at.vitaePct)
                .filter((pct): pct is number => pct !== undefined);
            expect(breaks).toEqual([...lines]);
        });
    }
});
