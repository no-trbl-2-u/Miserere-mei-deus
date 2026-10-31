import { STARTING_CARD_IDS, getCardLane } from '@mechanics';
import { FALLBACK_CARD_ART, getCardArt } from '../index';

describe('card art registry', () => {
    it('gives every starting card a painting, not the fallback', () => {
        for (const id of new Set(STARTING_CARD_IDS)) {
            expect(getCardArt(id)).not.toBe(FALLBACK_CARD_ART);
        }
    });

    it('gives every Blood Price card its own painting', () => {
        const ids = getCardLane('blood-price')?.cardIds ?? [];
        expect(ids.length).toBeGreaterThan(0);
        const art = ids.map(getCardArt);
        for (const a of art) expect(a).not.toBe(FALLBACK_CARD_ART);
        expect(new Set(art).size).toBe(ids.length);
    });

    it('gives every Defender card its own painting', () => {
        const ids = getCardLane('defender')?.cardIds ?? [];
        expect(ids.length).toBeGreaterThan(0);
        const art = ids.map(getCardArt);
        for (const a of art) expect(a).not.toBe(FALLBACK_CARD_ART);
        expect(new Set(art).size).toBe(ids.length);
    });

    it('gives every Merciful card its own painting', () => {
        const ids = getCardLane('merciful')?.cardIds ?? [];
        expect(ids.length).toBeGreaterThan(0);
        const art = ids.map(getCardArt);
        for (const a of art) expect(a).not.toBe(FALLBACK_CARD_ART);
        expect(new Set(art).size).toBe(ids.length);
    });

    it('falls back for an unmapped id', () => {
        expect(getCardArt('no-such-card')).toBe(FALLBACK_CARD_ART);
    });
});
