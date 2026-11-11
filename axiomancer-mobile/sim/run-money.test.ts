/**
 * The run's money ledger: spends booked by kind, every other change of the
 * purse booked as a gain or an unnamed loss, and the prices read from the
 * game's tables.
 */

import { ANVIL_VERB_PRICING, EQUIPMENT_DROP_TUNING, VILLAGE_TUNING, cardRemovalPrice } from '@mechanics';

import type { AppStore } from '@/state/store';

import { bookStep, emptyMoneyLedger, priceTable, spendAs, spentTotal } from './run-money';

function purseStore(currency: number): AppStore & { pay(n: number): void } {
    let state = { player: { currency } };
    return {
        getState: () => state,
        pay(n: number) { state = { player: { currency: state.player.currency - n } }; },
    } as unknown as AppStore & { pay(n: number): void };
}

describe('the run money ledger', () => {
    it('books what an act took from the purse as its kind, and a free act as nothing', () => {
        const store = purseStore(20);
        const ledger = emptyMoneyLedger(20);
        expect(spendAs(store, ledger, 'rest', () => { store.pay(6); return 'rested'; })).toBe('rested');
        spendAs(store, ledger, 'card', () => undefined);
        spendAs(store, undefined, 'card', () => store.pay(6));
        expect(ledger.spent.rest).toBe(6);
        expect(ledger.spent.card).toBe(0);
        expect(spentTotal(ledger)).toBe(6);
    });

    it('books a step\'s change beyond its named spends as a gain, or as an unnamed loss', () => {
        const ledger = emptyMoneyLedger(10);
        bookStep(ledger, 10, 17, 0);
        expect(ledger.earned).toBe(7);
        // A village step that spent 6 at the rest and nothing else: no gain, no other.
        ledger.spent.rest += 6;
        bookStep(ledger, 17, 11, 0);
        expect(ledger.earned).toBe(7);
        expect(ledger.spent.other).toBe(0);
        // A loss no counter named.
        bookStep(ledger, 11, 8, spentTotal(ledger));
        expect(ledger.spent.other).toBe(3);
        expect(ledger.start + ledger.earned - spentTotal(ledger)).toBe(8);
    });

    it('reads every price from the game\'s own tables', () => {
        expect(priceTable()).toEqual({
            rest: VILLAGE_TUNING.restPrice,
            card: VILLAGE_TUNING.cardPrice,
            gear: EQUIPMENT_DROP_TUNING.shopPrice,
            removal: { first: cardRemovalPrice(0), step: cardRemovalPrice(1) - cardRemovalPrice(0) },
            anvil: { ...ANVIL_VERB_PRICING },
        });
    });
});
