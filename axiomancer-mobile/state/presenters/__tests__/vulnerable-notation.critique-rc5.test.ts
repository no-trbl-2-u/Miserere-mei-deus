/**
 * VULNERABLE reads in one notation on every surface of Word. The RC
 * walk (2026-10-02, item 5) saw "+25%" on the face, "+25% · 2 turns" on DECK
 * and "VULNERABLE ×25 · 2 turns" on the detail's die line: the stack count
 * where everything else prints the percent.
 */
import { describe, it, expect } from '@jest/globals';
import { getCard, getCardById, scaleCardForStats } from '@mechanics';
import { faceStats, detailStats } from '@/state/presenters/combat-encounter.engine';

const STATS = { body: 10, mind: 10, heart: 10 };

describe('Word — VULNERABLE in percent everywhere', () => {
    it.each([
        ['authored', getCardById('grey-word')!],
        ['stat-scaled', scaleCardForStats(getCardById('grey-word')!, STATS)],
    ])('%s: the die line prints the face\'s percent, never a ×N count', (_, source) => {
        const face = faceStats(getCard('grey-word')!, source);
        const detail = detailStats(getCard('grey-word')!, source);
        expect(detail.diePaidLine).toContain(face.heroText);
        expect(detail.diePaidLine).not.toMatch(/×\d/);
        expect(detail.freePill).not.toMatch(/×\d/);
    });
});
