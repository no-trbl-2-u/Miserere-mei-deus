/**
 * Hermetic E2E — village shop action layer.
 *
 * Drives `buyVillageWare` / `sellVillageItem` through the real action
 * layer against a store with a pending village event, mirroring the
 * CLI's `shopLoop` sell path (`src/CLI/game.cli.ts`): sell price is
 * engine `defaultSellPrice` against the shop's ware list when the
 * item matches a listed ware, else a flat fallback of `1`. Quest
 * items are never sellable.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { consumableLibrary, type Consumable, type Item, type Material, type QuestItem, type ShopWare } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';

afterEach(() => {
    jest.restoreAllMocks();
});

const REAL_CONSUMABLE_ID = consumableLibrary[0]?.id;

function potion(id = 'phial', qty = 1): Consumable {
    return {
        id,
        name: 'Potion of Heart',
        description: 'A small phial of ruby liquor.',
        category: 'consumable',
        healAmount: 6,
        quantity: qty,
    };
}

function trinket(id = 'unlisted-trinket'): Material {
    return {
        id,
        name: 'Relic',
        description: 'Of no particular provenance.',
        category: 'material',
        quantity: 1,
    };
}

function tooth(): QuestItem {
    return {
        id: 'hierophants-tooth',
        name: "Hierophant's Tooth",
        description: 'Reek of incense.',
        category: 'quest-item',
        questId: 'quest-priest',
    };
}

function makeStore(opts: {
    inventory?: readonly Item[];
    currency?: number;
    wares?: readonly ShopWare[];
    noShop?: boolean;
    noPending?: boolean;
}): AppStore {
    const { inventory = [], currency = 0, wares = [], noShop = false, noPending = false } = opts;
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    store.setState({
        player: { ...state.player, currency, inventory: [...inventory] },
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: noPending
                ? null
                : {
                      state: undefined as never,
                      event: {
                          kind: 'village',
                          villageName: 'Saltmarsh',
                          merchants: [],
                          shop: noShop ? undefined : { wares },
                      },
                  },
        },
    });
    return store;
}

describe('buyVillageWare action', () => {
    it('charges the ware price at face value', () => {
        const store = makeStore({
            currency: 20,
            wares: [{ itemId: REAL_CONSUMABLE_ID!, price: 12 }],
        });
        const actions = createAppActions(store);

        expect(actions.buyVillageWare(REAL_CONSUMABLE_ID!)).toBe(true);
        expect(store.getState().player.currency).toBe(8);
        expect(store.getState().player.inventory).toHaveLength(1);
    });

    it('returns false for an unknown ware id', () => {
        const store = makeStore({ currency: 100, wares: [] });
        const actions = createAppActions(store);

        expect(actions.buyVillageWare('__no-such-ware__')).toBe(false);
    });

    it('returns false when no village event is pending', () => {
        const store = makeStore({ currency: 100, noPending: true, wares: [{ itemId: REAL_CONSUMABLE_ID!, price: 1 }] });
        const actions = createAppActions(store);

        expect(actions.buyVillageWare(REAL_CONSUMABLE_ID!)).toBe(false);
    });
});

describe('sellVillageItem action', () => {
    it('sells at defaultSellPrice when the item matches a ware on this shop', () => {
        const store = makeStore({
            inventory: [potion('phial')],
            wares: [{ itemId: 'phial', price: 12 }],
        });
        const actions = createAppActions(store);

        const result = actions.sellVillageItem(0);

        expect(result).toBe(true);
        expect(store.getState().player.currency).toBe(6);
        expect(store.getState().player.inventory).toEqual([]);
    });

    it('falls back to a sell price of 1 when the item matches no ware (CLI parity)', () => {
        const store = makeStore({ inventory: [trinket()], wares: [] });
        const actions = createAppActions(store);

        const result = actions.sellVillageItem(0);

        expect(result).toBe(true);
        expect(store.getState().player.currency).toBe(1);
    });

    it('refuses to sell a quest item', () => {
        const store = makeStore({ inventory: [tooth()] });
        const actions = createAppActions(store);

        const result = actions.sellVillageItem(0);

        expect(result).toBe(false);
        expect(store.getState().player.currency).toBe(0);
        expect(store.getState().player.inventory).toHaveLength(1);
    });

    it('returns false for an out-of-range inventory index', () => {
        const store = makeStore({ inventory: [] });
        const actions = createAppActions(store);

        expect(actions.sellVillageItem(0)).toBe(false);
    });

    it('returns false when no village event is pending', () => {
        const store = makeStore({ inventory: [potion()], noPending: true });
        const actions = createAppActions(store);

        expect(actions.sellVillageItem(0)).toBe(false);
        expect(store.getState().player.currency).toBe(0);
    });
});
