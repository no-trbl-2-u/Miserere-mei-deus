/**
 * Blacksmith ("The Anvil") engine — hermetic unit suite.
 *
 * Seeded RNG only; no timers, no network, no Math.random. Covers the upgrade
 * verbs (HONE / TEMPER / gear SWAP), shilling pricing + budget gating,
 * LOUD refusals for cap violations and unaffordable spends, invalid-call
 * no-ops, and the claim-time outcome ledger.
 */

import { describe, it, expect } from 'vitest';

import {
    createBlacksmithSession,
    beginBlacksmith,
    honeBlacksmith,
    temperBlacksmith,
    swapBlacksmith,
    continueBlacksmithCard,
    leaveBlacksmith,
    claimBlacksmithOutcome,
    ANVIL_VERB_PRICING as P,
} from '../blacksmith.engine';
import { BLACKSMITH_WITNESS_VARIANTS } from '../blacksmith.content';
import { concreteDefaultRail, dieGearMissFaces } from '../../../Character/dieGear.reducer';
import type { BlacksmithSession, BlacksmithVariantOffer } from '../blacksmith.types';

/** A local fixture: the shipped list is empty, the swap verb is still generic machinery. */
const FIXTURE_VARIANT: BlacksmithVariantOffer = Object.freeze({
    id: 'fixture-heart-wide-mana',
    name: 'Fixture Fitting (3 MANA)',
    gear: Object.freeze({ dieColor: 'heart', specialFaces: 1, manaFaces: 3 }),
});

const forging = (budget = 100, variants = [FIXTURE_VARIANT]): BlacksmithSession =>
    beginBlacksmith(createBlacksmithSession(1, concreteDefaultRail(), budget, variants));

describe('blacksmith — lifecycle + invalid calls', () => {
    it('intro → forging only via beginBlacksmith', () => {
        const s = createBlacksmithSession(1, concreteDefaultRail(), 100);
        expect(s.phase).toBe('intro');
        expect(honeBlacksmith(s, 'heart')).toBe(s); // invalid while intro — no-op
        expect(beginBlacksmith(s).phase).toBe('forging');
    });

    it('an unknown swap offer is a silent no-op', () => {
        const s = forging();
        expect(swapBlacksmith(s, 'no-such-variant')).toBe(s);
    });
});

describe('blacksmith — HONE', () => {
    it('charges the shilling price and adds a mana face', () => {
        const s = honeBlacksmith(forging(100), 'heart');
        expect(s.phase).toBe('card');
        expect(s.card?.refused).toBe(false);
        expect(s.card?.cost).toBe(P.hone);
        expect(s.spent).toBe(P.hone);
        expect(s.budget).toBe(100 - P.hone);
        expect(s.rail.heart.manaFaces).toBe(3);
        expect(dieGearMissFaces(s.rail.heart)).toBe(2);
        expect(s.honed).toBe(1);
    });

    it('refuses LOUDLY at the 1-miss floor, leaving rail + budget untouched', () => {
        let s = forging(100);
        // Hone wild 3× to the 1-miss floor.
        for (let i = 0; i < 3; i++) {
            s = continueBlacksmithCard(honeBlacksmith(s, 'wild'));
        }
        expect(dieGearMissFaces(s.rail.wild)).toBe(1);
        const spentBefore = s.spent;
        const budgetBefore = s.budget;
        const refused = honeBlacksmith(s, 'wild');
        expect(refused.card?.refused).toBe(true);
        expect(refused.card?.reason).toMatch(/miss/i);
        expect(refused.spent).toBe(spentBefore);
        expect(refused.budget).toBe(budgetBefore);
        expect(refused.rail.wild).toEqual(s.rail.wild);
    });

    it('refuses LOUDLY when the budget cannot cover the price', () => {
        const s = honeBlacksmith(forging(P.hone - 1), 'heart');
        expect(s.card?.refused).toBe(true);
        expect(s.card?.reason).toMatch(/cost/i);
        expect(s.spent).toBe(0);
    });
});

describe('blacksmith — TEMPER', () => {
    it('upgrades a mana face to a special face', () => {
        const s = temperBlacksmith(forging(100), 'body');
        expect(s.card?.refused).toBe(false);
        expect(s.rail.body.specialFaces).toBe(2);
        expect(s.rail.body.manaFaces).toBe(1);
        expect(s.spent).toBe(P.temper);
    });

    it('refuses above the colored special cap', () => {
        let s = forging(100);
        s = continueBlacksmithCard(temperBlacksmith(s, 'mind')); // 2 special
        const refused = temperBlacksmith(s, 'mind');
        expect(refused.card?.refused).toBe(true);
        expect(refused.card?.reason).toMatch(/cap/i);
    });

    it('refuses to temper the wild die past 1 special', () => {
        const refused = temperBlacksmith(forging(100), 'wild');
        expect(refused.card?.refused).toBe(true);
        expect(refused.card?.reason).toMatch(/cap/i);
    });
});

describe('blacksmith — the shipped variant list', () => {
    it('is empty: the +3 fitting is retired and the anvil offers no swap', () => {
        expect(BLACKSMITH_WITNESS_VARIANTS).toEqual([]);
    });
});

describe('blacksmith — SWAP (gear change)', () => {
    it('swaps in an offered variant piece and charges swap price', () => {
        const s = swapBlacksmith(forging(100), FIXTURE_VARIANT.id);
        expect(s.card?.refused).toBe(false);
        expect(s.rail.heart.manaFaces).toBe(3);
        expect(s.spent).toBe(P.swap);
        expect(s.swapped).toBe(1);
    });
});

describe('blacksmith — outcome ledger', () => {
    it('accumulates upgrades and seals the ledger at claim', () => {
        let s = forging(100);
        s = continueBlacksmithCard(honeBlacksmith(s, 'heart'));
        s = continueBlacksmithCard(temperBlacksmith(s, 'body'));
        s = continueBlacksmithCard(swapBlacksmith(s, FIXTURE_VARIANT.id));
        const left = leaveBlacksmith(s);
        expect(left.phase).toBe('outcome');
        const o = left.outcome!;
        expect(o.honed).toBe(1);
        expect(o.tempered).toBe(1);
        expect(o.swapped).toBe(1);
        expect(o.spent).toBe(P.hone + P.temper + P.swap);
        expect(o.rail.body.specialFaces).toBe(2);
        expect(o.rail.heart.manaFaces).toBe(3);
        const done = claimBlacksmithOutcome(left);
        expect(done.phase).toBe('done');
    });
});
