/**
 * Blacksmith ("The Anvil") card upgrade — hermetic unit suite (Phase UP1e, A8).
 *
 * The anvil upgrades one card a visit for 5 shillings, beside HONE, TEMPER
 * and SWAP. Refused loudly when the player can't afford it, has nothing to
 * upgrade, or has already had this visit's card worked. The engine names the
 * copy and the id it becomes; the host swaps it at claim.
 */

import { describe, it, expect } from 'vitest';

import {
    createBlacksmithSession,
    beginBlacksmith,
    honeBlacksmith,
    chooseBlacksmithCardUpgrade,
    cancelBlacksmithCardUpgrade,
    pickBlacksmithCardUpgrade,
    blacksmithCardUpgradeRefusal,
    continueBlacksmithCard,
    leaveBlacksmith,
    claimBlacksmithOutcome,
    ANVIL_VERB_PRICING as P,
} from '../blacksmith.engine';
import { concreteDefaultRail } from '../../../Character/dieGear.reducer';
import type { BlacksmithSession } from '../blacksmith.types';

const DECK = ['grey-strike', 'grey-strike', 'grey-strike', 'grey-ward', 'grey-ward', 'grey-word'];

const forging = (budget = 20, deck: readonly string[] = DECK): BlacksmithSession =>
    beginBlacksmith(createBlacksmithSession(1, concreteDefaultRail(), budget, [], deck));

describe('blacksmith card upgrade — price and offer', () => {
    it('costs 5 shillings, the TEMPER price', () => {
        expect(P.upgrade).toBe(5);
        expect(P.upgrade).toBe(P.temper);
    });

    it('offers each distinct deck card that can take an upgrade, once', () => {
        const s = forging();
        expect(s.upgradableCardIds).toEqual(['grey-strike', 'grey-ward', 'grey-word']);
        expect(blacksmithCardUpgradeRefusal(s)).toBeNull();
    });

    it('forging -> upgrade-pick charges nothing; cancelling returns to forging', () => {
        const s = forging();
        const picking = chooseBlacksmithCardUpgrade(s);
        expect(picking.phase).toBe('upgrade-pick');
        expect(picking.budget).toBe(20);
        const back = cancelBlacksmithCardUpgrade(picking);
        expect(back.phase).toBe('forging');
        expect(back.budget).toBe(20);
        expect(back.cardUpgrade).toBeNull();
    });
});

describe('blacksmith card upgrade — the pick', () => {
    it('charges 5 and names the copy and the id it becomes', () => {
        const s = pickBlacksmithCardUpgrade(chooseBlacksmithCardUpgrade(forging()), 'grey-strike');
        expect(s.phase).toBe('card');
        expect(s.card?.verb).toBe('upgrade');
        expect(s.card?.refused).toBe(false);
        expect(s.card?.cost).toBe(5);
        expect(s.card?.cardUpgrade).toEqual({ fromCardId: 'grey-strike', toCardId: 'grey-strike+' });
        expect(s.budget).toBe(15);
        expect(s.spent).toBe(5);
        expect(s.cardUpgrade).toEqual({ fromCardId: 'grey-strike', toCardId: 'grey-strike+' });
    });

    it('a card not on offer is a silent no-op', () => {
        const picking = chooseBlacksmithCardUpgrade(forging());
        expect(pickBlacksmithCardUpgrade(picking, 'no-such-card')).toBe(picking);
        expect(pickBlacksmithCardUpgrade(picking, 'grey-strike+')).toBe(picking);
    });

    it('a pick outside upgrade-pick is a silent no-op', () => {
        const s = forging();
        expect(pickBlacksmithCardUpgrade(s, 'grey-strike')).toBe(s);
    });
});

describe('blacksmith card upgrade — refusals', () => {
    it('is refused loudly when the player cannot afford it, and nothing is charged', () => {
        const s = chooseBlacksmithCardUpgrade(forging(4));
        expect(s.phase).toBe('card');
        expect(s.card?.refused).toBe(true);
        expect(s.card?.reason).toMatch(/can't cover the 5/);
        expect(s.budget).toBe(4);
        expect(s.cardUpgrade).toBeNull();
    });

    it('is refused loudly when nothing can take another upgrade', () => {
        const atLimit = ['grey-strike+', 'grey-ward+', 'grey-word+'];
        const s = forging(20, atLimit);
        expect(s.upgradableCardIds).toEqual([]);
        const refused = chooseBlacksmithCardUpgrade(s);
        expect(refused.card?.refused).toBe(true);
        expect(refused.card?.reason).toMatch(/nothing you carry/);
        expect(refused.budget).toBe(20);
    });

    it('works one card a visit: a second upgrade is refused', () => {
        let s = pickBlacksmithCardUpgrade(chooseBlacksmithCardUpgrade(forging()), 'grey-ward');
        s = continueBlacksmithCard(s);
        expect(s.phase).toBe('forging');
        const again = chooseBlacksmithCardUpgrade(s);
        expect(again.card?.refused).toBe(true);
        expect(again.card?.reason).toMatch(/one card a visit/);
        expect(again.budget).toBe(15);
        expect(again.cardUpgrade).toEqual({ fromCardId: 'grey-ward', toCardId: 'grey-ward+' });
    });
});

describe('blacksmith card upgrade — the ledger', () => {
    it('sits beside the die verbs and seals into the outcome', () => {
        let s = forging(20);
        s = continueBlacksmithCard(honeBlacksmith(s, 'heart'));
        s = continueBlacksmithCard(pickBlacksmithCardUpgrade(chooseBlacksmithCardUpgrade(s), 'grey-word'));
        const left = leaveBlacksmith(s);
        expect(left.outcome?.honed).toBe(1);
        expect(left.outcome?.spent).toBe(P.hone + P.upgrade);
        expect(left.outcome?.cardUpgrade).toEqual({ fromCardId: 'grey-word', toCardId: 'grey-word+' });
        expect(claimBlacksmithOutcome(left).phase).toBe('done');
    });

    it('a visit with no card upgrade seals a null card upgrade', () => {
        const left = leaveBlacksmith(forging());
        expect(left.outcome?.cardUpgrade).toBeNull();
    });
});
