/**
 * The post-combat reward offer prints a card at the numbers the hand will
 * print once it is taken: the player's stats scale it the same way. The RC
 * walk (2026-10-02, item 5) saw Blow read "Deal 6" in hand and
 * "Deal 5" on SPOILS.
 */
import { describe, it, expect } from '@jest/globals';
import { getCard, getCardById, scaleCardForStats } from '@mechanics';
import { faceStats, rewardCardVMs } from '@/state/presenters/combat-encounter.engine';

const STATS = { body: 10, mind: 10, heart: 10 };

describe('reward offer — stat-scaled faces', () => {
    it.each(['grey-strike', 'grey-ward', 'grey-word'])('%s reads the hand\'s scaled numbers', (id) => {
        const [offer] = rewardCardVMs([id], STATS);
        const hand = faceStats(getCard(id)!, scaleCardForStats(getCardById(id)!, STATS));
        const printed = faceStats(getCard(id)!, getCardById(id)!);
        expect(offer.face.heroText).toBe(hand.heroText);
        expect(offer.face.heroText).not.toBe(printed.heroText);
        expect(offer.face.statScaled).toBe('up');
    });

    it('without stats the offer prints the authored numbers', () => {
        const [offer] = rewardCardVMs(['grey-strike']);
        const printed = faceStats(getCard('grey-strike')!, getCardById('grey-strike')!);
        expect(offer.face.heroText).toBe(printed.heroText);
        expect(offer.face.statScaled).toBeNull();
    });
});
