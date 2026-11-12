/**
 * The hand's card faces print FINAL numbers, and the keyword wears
 * its stat family's dice colour and glyph. The tint marks a number the
 * player's stats actually moved, never a family merely present on the card.
 */
import { describe, it, expect } from '@jest/globals';
import { getCard, getCardById, scaleCardForStats } from '@mechanics';
import { faceStats, familyFace, STANCE_COLORS } from '@/state/presenters/combat-encounter.engine';

function faces(cardId: string, stats: { body: number; mind: number; heart: number }) {
    const lib = getCardById(cardId)!;
    const printed = faceStats(getCard(cardId)!, lib);
    const scaled = faceStats(getCard(cardId)!, scaleCardForStats(lib, stats));
    return { printed, scaled, fam: familyFace(scaled, printed) };
}

describe('S3 — stat family on the card face', () => {
    it('GUARD is mind: blue, ★, and raised when mind is up', () => {
        const { scaled, fam } = faces('grey-ward', { body: 5, mind: 10, heart: 5 });
        expect(scaled.heroText).toContain('10');
        expect(fam.statFamily).toBe('mind');
        expect(fam.familyColor).toBe(STANCE_COLORS.mind);
        expect(fam.familyGlyph).toBe('★');
        expect(fam.statScaled).toBe('up');
        expect(fam.freeStatScaled).toBe('up');
    });

    it('VULNERABLE is heart: Word prints +50% at heart 10', () => {
        const { scaled, fam } = faces('grey-word', { body: 5, mind: 5, heart: 10 });
        expect(scaled.heroText).toBe('+50%');
        expect(fam.statFamily).toBe('heart');
        expect(fam.familyGlyph).toBe('♥');
        expect(fam.statScaled).toBe('up');
    });

    it('a stat outside the face keyword\'s family leaves it untinted', () => {
        const { fam } = faces('grey-ward', { body: 40, mind: 5, heart: 40 });
        expect(fam.statFamily).toBe('mind');
        expect(fam.statScaled).toBeNull();
        expect(fam.freeStatScaled).toBeNull();
    });
});
