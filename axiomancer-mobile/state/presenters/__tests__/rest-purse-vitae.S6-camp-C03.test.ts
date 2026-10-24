/**
 * S6-camp-C03 — the rest screen's VITAE readout must match the heal the
 * outcome just claimed.
 *
 * The walked screen settled a REST, printed '+43 VITAE' on the outcome chip,
 * and left the purse row above it reading the same wounded number the pilgrim
 * arrived with: the row read `health` straight off the frozen engine session,
 * which keeps its pre-choice value until the host applies the ledger at claim.
 *
 * The heal itself stays in the engine (`RESTCHOICE_TUNING.restHealFraction`);
 * the presenter only renders the ledger's own `healed`.
 */

import {
    chooseRestChoiceOffer,
    createRestChoiceSession,
    pickRestChoiceCut,
    RESTCHOICE_TUNING,
} from '@mechanics';
import type { RestChoiceSession } from '@mechanics';

import { restDisplayHealth, selectRestVM } from '../rest.engine';

const DECK = Array.from({ length: 13 }, (_, i) => `card-${i}`);

function session(health: number, maxHealth: number): RestChoiceSession {
    return createRestChoiceSession(1, {
        shelter: 'camp',
        maxHealth,
        health,
        currency: 9999,
        deckCardIds: DECK,
    });
}

describe('rest purse VITAE readout (S6-camp-C03)', () => {
    it('shows the pre-choice VITAE while the choice is still open', () => {
        const vm = selectRestVM({ rest: { session: session(20, 175) } });
        expect(vm.phase).toBe('offer');
        expect(vm.health).toBe(20);
        expect(vm.maxHealth).toBe(175);
    });

    it('matches the heal the outcome chip claims once REST settles', () => {
        const settled = chooseRestChoiceOffer(session(20, 175), 'rest');
        const vm = selectRestVM({ rest: { session: settled } });

        expect(vm.phase).toBe('outcome');
        expect(vm.outcome?.healed).toBe(Math.round(175 * RESTCHOICE_TUNING.restHealFraction));
        // The row and the chip tell the same story.
        expect(vm.health).toBe(20 + (vm.outcome?.healed ?? 0));
    });

    it('never reads past the maximum', () => {
        const settled = chooseRestChoiceOffer(session(174, 175), 'rest');
        const vm = selectRestVM({ rest: { session: settled } });
        expect(vm.health).toBe(175);
    });

    it('leaves VITAE alone when the settled choice healed nothing', () => {
        const picked = pickRestChoiceCut(
            chooseRestChoiceOffer(session(20, 175), 'cut'),
            DECK[0],
        );
        const vm = selectRestVM({ rest: { session: picked } });

        expect(vm.phase).toBe('outcome');
        expect(vm.outcome?.healed).toBe(0);
        expect(vm.health).toBe(20);
    });
});

describe('restDisplayHealth', () => {
    it('passes the snapshot through with no ledger', () => {
        expect(restDisplayHealth(20, 175, null)).toBe(20);
    });

    it('adds the ledger heal and clamps at the maximum', () => {
        const ledger = {
            chosen: 'rest' as const,
            healed: 43,
            spent: 0,
            removedCardId: null,
            removals: 0,
            upgradedCardId: null,
            upgradedToCardId: null,
        };
        expect(restDisplayHealth(20, 175, ledger)).toBe(63);
        expect(restDisplayHealth(174, 175, ledger)).toBe(175);
    });
});
