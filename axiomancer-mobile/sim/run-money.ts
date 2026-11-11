/**
 * What a sim run earns and spends, and what it carries on reaching a node.
 *
 * The driver keeps the player's level, VITAE and purse the first time the run
 * stands on each node, and sums every shilling the run gains and spends; the
 * village resolver names each spend's kind. The prices beside them are read
 * from the game's own price tables. A measurement: nothing here judges a number.
 */

import {
    ANVIL_VERB_PRICING,
    EQUIPMENT_DROP_TUNING,
    VILLAGE_TUNING,
    cardRemovalPrice,
} from '@mechanics';

import type { AppStore } from '@/state/store';

/** The kinds a shilling is spent on. `other` is any loss no village counter made. */
export const SPEND_KINDS = ['rest', 'card', 'gear', 'removal', 'anvil', 'other'] as const;
export type SpendKind = (typeof SPEND_KINDS)[number];

/** The run's purse at its start, every shilling it gained, and what it spent per kind. */
export interface MoneyLedger {
    start: number;
    earned: number;
    spent: Record<SpendKind, number>;
}

/** The player the first time the run stands on a node. */
export interface NodeArrival {
    readonly level: number;
    readonly vitae: number;
    readonly maxVitae: number;
    readonly purse: number;
}

/** A ledger for a run that starts with `start` shillings. */
export function emptyMoneyLedger(start: number): MoneyLedger {
    return { start, earned: 0, spent: { rest: 0, card: 0, gear: 0, removal: 0, anvil: 0, other: 0 } };
}

/** Every shilling the ledger records as spent. */
export function spentTotal(ledger: MoneyLedger): number {
    return SPEND_KINDS.reduce((n, k) => n + ledger.spent[k], 0);
}

const purseOf = (store: AppStore): number => store.getState().player?.currency ?? 0;

/** Runs `act` and books what it took from the purse as `kind`. */
export function spendAs<T>(store: AppStore, ledger: MoneyLedger | undefined, kind: SpendKind, act: () => T): T {
    const before = purseOf(store);
    const out = act();
    const paid = before - purseOf(store);
    if (ledger && paid > 0) ledger.spent[kind] += paid;
    return out;
}

/**
 * Books one driver step: the purse's change, less what the step booked as a
 * spend, is a gain when positive and an unnamed spend when negative.
 */
export function bookStep(ledger: MoneyLedger, purseBefore: number, purseAfter: number, bookedBefore: number): void {
    const booked = spentTotal(ledger) - bookedBefore;
    const net = purseAfter - purseBefore + booked;
    if (net > 0) ledger.earned += net;
    else if (net < 0) ledger.spent.other += -net;
}

/** The price of each kind, from the game's price tables. */
export interface PriceTable {
    readonly rest: number;
    readonly card: number;
    readonly gear: number;
    /** The first removal of a run, and what each later one adds. */
    readonly removal: { readonly first: number; readonly step: number };
    readonly anvil: { readonly hone: number; readonly temper: number; readonly swap: number; readonly upgrade: number };
}

/** The current prices. */
export function priceTable(): PriceTable {
    return {
        rest: VILLAGE_TUNING.restPrice,
        card: VILLAGE_TUNING.cardPrice,
        gear: EQUIPMENT_DROP_TUNING.shopPrice,
        removal: { first: cardRemovalPrice(0), step: cardRemovalPrice(1) - cardRemovalPrice(0) },
        anvil: {
            hone: ANVIL_VERB_PRICING.hone,
            temper: ANVIL_VERB_PRICING.temper,
            swap: ANVIL_VERB_PRICING.swap,
            upgrade: ANVIL_VERB_PRICING.upgrade,
        },
    };
}
