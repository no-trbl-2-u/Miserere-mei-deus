/**
 * The REST offer names the VITAE it restores.
 *
 * `restOfferDesc` takes the engine's own preview number
 * (`previewRestChoiceHeal`) rather than re-deriving the heal from the
 * fraction. These cases pin the wording; the arithmetic is pinned in the
 * engine suite and in `rest-offer-heal-cap.audit.test.ts`.
 */

import {
    REST_CHOICE_OFFER_DESC,
    REST_INN_OFFER_DESC,
    restDawnUpgradedChip,
    restOfferDesc,
    restOutcomeHealChip,
} from '../rest.copy';

describe('restOfferDesc', () => {
    it('appends the restored amount for the walked case', () => {
        expect(restOfferDesc(44)).toBe(`${REST_CHOICE_OFFER_DESC.rest} Restores 44 VITAE.`);
    });

    it('uses the canon VITAE word', () => {
        expect(restOfferDesc(44)).toContain('VITAE');
        expect(restOfferDesc(44)).not.toMatch(/\bHP\b|\bhealth\b/);
    });

    it('prints whatever the engine says, not a hardcoded number', () => {
        expect(restOfferDesc(5)).toContain('Restores 5 VITAE');
        expect(restOfferDesc(160)).toContain('Restores 160 VITAE');
    });

    it('falls back to the bare sentence when there is nothing to promise', () => {
        expect(restOfferDesc(0)).toBe(REST_CHOICE_OFFER_DESC.rest);
        expect(restOfferDesc(-5)).toBe(REST_CHOICE_OFFER_DESC.rest);
        expect(restOfferDesc(Number.NaN)).toBe(REST_CHOICE_OFFER_DESC.rest);
    });

    it('words an inn night as a bed, not sleeping where you stand (critique pass 61)', () => {
        expect(restOfferDesc(44, 'inn')).toBe(`${REST_INN_OFFER_DESC} Restores 44 VITAE.`);
        expect(restOfferDesc(44, 'inn')).not.toMatch(/where you stand/i);
        expect(restOfferDesc(0, 'inn')).toBe(REST_INN_OFFER_DESC);
        expect(restOfferDesc(44, 'camp')).toBe(`${REST_CHOICE_OFFER_DESC.rest} Restores 44 VITAE.`);
    });
});

describe('the dawn outcome lines (ET1c)', () => {
    it('reads +N VITAE after a rest', () => {
        expect(restOutcomeHealChip(40)).toBe('+40 VITAE');
    });

    it('reads "<card> upgraded" after an upgrade, with no VITAE in it', () => {
        expect(restDawnUpgradedChip('Grey Strike')).toBe('Grey Strike upgraded');
        expect(restDawnUpgradedChip('Grey Strike')).not.toMatch(/VITAE/);
    });
});
