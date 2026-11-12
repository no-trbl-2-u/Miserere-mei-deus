/**
 * Hermetic E2E — the Breakwater shillings floor the price comments quote.
 *
 * `BREAKWATER_SHILLINGS_FLOOR` is recomputed from the tables (the five loot
 * caches, and `fightWage(level)` on every fight, elite and boss node), and the
 * two comments that quote it must carry the same figures, so a new cache, a
 * re-levelled fight or an edited comment cannot leave the citation stale.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { BREAKWATER_SHILLINGS_FLOOR } from '../card.removal.pricing';
import { fightWage } from '../../Combat/combat.mercy-check';
import {
    BREAKWATER_CHAPTER_KINDS, BW_DOOR_LEVEL, BW_ELITE_DRAWS, BW_ELITE_LEVEL, BW_ENCOUNTER_FOES, COAST_LOOT_CACHES,
} from '../../World/MapEvents/content';

const nodesOf = (kind: string) =>
    Object.entries(BREAKWATER_CHAPTER_KINDS).filter(([, v]) => v.kind === kind).map(([id]) => id);

function computedWages(): number {
    let total = 0;
    for (const id of nodesOf('fight')) {
        const foe = BW_ENCOUNTER_FOES[id];
        if (!foe) throw new Error(`fight ${id} has no row in BW_ENCOUNTER_FOES`);
        total += fightWage(foe.level);
    }
    for (const id of nodesOf('elite')) {
        const draw = BW_ELITE_DRAWS[id];
        // The least a draw can pay is what the walk guarantees.
        total += fightWage(draw ? Math.min(...draw.map((f) => f.level)) : BW_ELITE_LEVEL);
    }
    total += nodesOf('boss').length * fightWage(BW_DOOR_LEVEL);
    return total;
}

describe('Breakwater shillings floor', () => {
    const caches = COAST_LOOT_CACHES.reduce((sum, c) => sum + c.currency, 0);

    it('has one cache for each loot node', () => {
        expect(COAST_LOOT_CACHES).toHaveLength(nodesOf('loot').length);
    });

    it('quotes the cache purses, the wages and their sum as the tables give them', () => {
        expect(BREAKWATER_SHILLINGS_FLOOR.caches).toBe(caches);
        expect(BREAKWATER_SHILLINGS_FLOOR.wages).toBe(computedWages());
        expect(BREAKWATER_SHILLINGS_FLOOR.total).toBe(caches + computedWages());
    });

    it('is the figure both price comments state', () => {
        const { caches: c, wages: w, total } = BREAKWATER_SHILLINGS_FLOOR;
        for (const rel of ['../card.removal.pricing.ts', '../../World/Blacksmith/blacksmith.engine.ts']) {
            const src = readFileSync(resolve(__dirname, rel), 'utf8');
            expect(src, rel).toContain(`${total} shillings`);
            expect(src, rel).toContain(`${c} `);
            expect(src, rel).toContain(`${w} `);
        }
    });
});
