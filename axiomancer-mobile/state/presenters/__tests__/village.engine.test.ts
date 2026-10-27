/**
 * Hermetic tests for the settlement-shop presenter
 * (`state/presenters/village.engine.ts`).
 *
 * `selectVillageVM` is a pure `(state) -> VillageVM` mapper, and
 * `resolveWareItem` is a pure ware-id resolver over the engine item
 * libraries. These tests pin:
 *   - the EMPTY_VM gate (no pending event / wrong event kind),
 *   - merchant `line`/`hasDialogue` derivation from the dialogue tree,
 *   - ware resolution against the real consumable/equipment libraries,
 *   - unknown-id filtering (defensive — content owns id correctness),
 *   - and the per-ware affordability threshold.
 *
 * Real library ids are read at test time so the suite survives content
 * churn rather than pinning a brittle literal id.
 */

import {
    consumableLibrary,
    relicLibrary,
    type Item,
    type NPC,
    type ShopWare,
} from '@mechanics';
import {
    resolveWareItem,
    selectVillageVM,
} from '../village.engine';
import type { AppStoreState } from '@/state/store';

const REAL_CONSUMABLE_ID = consumableLibrary[0]?.id;
// Equipment wares resolve to signet relics (the only equipment).
const REAL_TEMPLATE_ID = relicLibrary[0]?.id;

type VillageState = Pick<AppStoreState, 'event' | 'player'>;

function makeNpc(overrides: Partial<NPC> = {}): NPC {
    return {
        name: 'Stallkeeper',
        dialogueTree: {
            rootId: 'root',
            nodes: {
                root: { id: 'root', text: 'Wares for the road, traveller?' },
            },
        },
        ...overrides,
    };
}

function makeState(opts: {
    merchants?: readonly NPC[];
    wares?: readonly ShopWare[];
    currency?: number;
    villageName?: string;
    kind?: string;
    noPending?: boolean;
    noShop?: boolean;
    inventory?: readonly Item[];
}): VillageState {
    const {
        merchants = [],
        wares = [],
        currency = 0,
        villageName = 'Saltmarsh',
        kind = 'village',
        noPending = false,
        noShop = false,
        inventory = [],
    } = opts;

    const event = noPending
        ? ({ pending: null } as unknown as AppStoreState['event'])
        : ({
              pending: {
                  event: {
                      kind,
                      villageName,
                      merchants,
                      shop: noShop ? undefined : { wares },
                  },
              },
          } as unknown as AppStoreState['event']);

    return {
        event,
        player: { currency, inventory } as unknown as AppStoreState['player'],
    };
}

function questItem(id = 'hierophants-tooth'): Item {
    return {
        id,
        name: "Hierophant's Tooth",
        description: 'Reek of incense.',
        category: 'quest-item',
        questId: 'quest-priest',
    };
}

describe('resolveWareItem', () => {
    it('resolves a ware id against the consumable library', () => {
        expect(REAL_CONSUMABLE_ID).toBeDefined();
        const item = resolveWareItem({ itemId: REAL_CONSUMABLE_ID!, price: 5 });
        expect(item).not.toBeNull();
        expect(item!.id).toBe(REAL_CONSUMABLE_ID);
    });

    it('resolves an equipment ware id against the signet relics', () => {
        expect(REAL_TEMPLATE_ID).toBeDefined();
        const item = resolveWareItem({ itemId: REAL_TEMPLATE_ID!, price: 5 });
        expect(item).not.toBeNull();
        expect(item!.id).toBe(REAL_TEMPLATE_ID);
    });

    it('returns null for an unknown ware id', () => {
        expect(
            resolveWareItem({ itemId: '__no-such-item__', price: 5 }),
        ).toBeNull();
    });
});

describe('selectVillageVM', () => {
    it('returns the inactive EMPTY_VM when no event is pending', () => {
        const vm = selectVillageVM(makeState({ noPending: true }));
        expect(vm.active).toBe(false);
        expect(vm.villageName).toBe('');
        expect(vm.merchants).toEqual([]);
        expect(vm.wares).toEqual([]);
        expect(vm.currency).toBe(0);
    });

    it('returns the inactive EMPTY_VM when the pending event is not a village', () => {
        const vm = selectVillageVM(makeState({ kind: 'encounter' }));
        expect(vm.active).toBe(false);
        expect(vm.villageName).toBe('');
    });

    it('activates with the village name and body for a pending village event', () => {
        const vm = selectVillageVM(
            makeState({ villageName: 'Saltmarsh', currency: 12 }),
        );
        expect(vm.active).toBe(true);
        expect(vm.villageName).toBe('Saltmarsh');
        expect(vm.body.length).toBeGreaterThan(0);
        expect(vm.currency).toBe(12);
    });

    it('derives merchant line and hasDialogue from the dialogue tree root node', () => {
        const vm = selectVillageVM(
            makeState({
                merchants: [
                    makeNpc({
                        name: 'Maren',
                        dialogueTree: {
                            rootId: 'open',
                            nodes: {
                                open: { id: 'open', text: 'Fresh from the kiln.' },
                            },
                        },
                    }),
                ],
            }),
        );
        expect(vm.merchants).toHaveLength(1);
        expect(vm.merchants[0]).toEqual({
            name: 'Maren',
            line: 'Fresh from the kiln.',
            hasDialogue: true,
        });
    });

    it('reports hasDialogue false and an empty line for a merchant with no dialogue tree', () => {
        const vm = selectVillageVM(
            makeState({
                merchants: [makeNpc({ name: 'Silent Vendor', dialogueTree: undefined })],
            }),
        );
        expect(vm.merchants[0]).toEqual({
            name: 'Silent Vendor',
            line: '',
            hasDialogue: false,
        });
    });

    it('reports hasDialogue false when the root node text is empty', () => {
        const vm = selectVillageVM(
            makeState({
                merchants: [
                    makeNpc({
                        dialogueTree: {
                            rootId: 'root',
                            nodes: { root: { id: 'root', text: '' } },
                        },
                    }),
                ],
            }),
        );
        expect(vm.merchants[0]?.hasDialogue).toBe(false);
        expect(vm.merchants[0]?.line).toBe('');
    });

    it('resolves real wares and drops unknown ware ids', () => {
        const vm = selectVillageVM(
            makeState({
                currency: 1000,
                wares: [
                    { itemId: REAL_CONSUMABLE_ID!, price: 5 },
                    { itemId: '__no-such-item__', price: 5 },
                ],
            }),
        );
        expect(vm.wares).toHaveLength(1);
        expect(vm.wares[0]?.itemId).toBe(REAL_CONSUMABLE_ID);
    });

    it('marks a ware affordable only when currency meets the price', () => {
        const wares: readonly ShopWare[] = [{ itemId: REAL_CONSUMABLE_ID!, price: 10 }];
        const tooPoor = selectVillageVM(makeState({ currency: 9, wares }));
        expect(tooPoor.wares[0]?.affordable).toBe(false);

        const exact = selectVillageVM(makeState({ currency: 10, wares }));
        expect(exact.wares[0]?.affordable).toBe(true);
    });

    it('treats missing currency as zero', () => {
        const vm = selectVillageVM(
            makeState({ wares: [{ itemId: REAL_CONSUMABLE_ID!, price: 1 }] }),
        );
        expect(vm.currency).toBe(0);
        expect(vm.wares[0]?.affordable).toBe(false);
    });

    it('returns an empty ware list when the village has no shop', () => {
        const vm = selectVillageVM(makeState({}));
        expect(vm.wares).toEqual([]);
    });

    it('hasShop is true when the event carries a shop object, even with zero wares', () => {
        const vm = selectVillageVM(makeState({ wares: [] }));
        expect(vm.hasShop).toBe(true);
    });

    it('hasShop is false when the event has no shop object at all', () => {
        const vm = selectVillageVM(makeState({ noShop: true }));
        expect(vm.hasShop).toBe(false);
        expect(vm.wares).toEqual([]);
        expect(vm.sellables).toEqual([]);
    });

    it('derives a sellable per non-quest inventory item, priced off the matching ware', () => {
        const vm = selectVillageVM(
            makeState({
                wares: [{ itemId: REAL_CONSUMABLE_ID!, price: 12 }],
                inventory: [
                    { id: REAL_CONSUMABLE_ID!, name: 'Phial', description: '', category: 'consumable', quantity: 1 },
                ],
            }),
        );
        expect(vm.sellables).toHaveLength(1);
        expect(vm.sellables[0]).toEqual({
            index: 0,
            itemId: REAL_CONSUMABLE_ID,
            name: 'Phial',
            description: '',
            sellPrice: 6,
        });
    });

    it('falls back to a sell price of 1 when the item matches no ware on this shop', () => {
        const vm = selectVillageVM(
            makeState({
                wares: [],
                inventory: [
                    { id: 'unlisted-trinket', name: 'Relic', description: '', category: 'material', quantity: 1 },
                ],
            }),
        );
        expect(vm.sellables[0]?.sellPrice).toBe(1);
    });

    it('excludes quest items from sellables', () => {
        const vm = selectVillageVM(
            makeState({ inventory: [questItem()] }),
        );
        expect(vm.sellables).toEqual([]);
    });

    it('treats missing inventory as an empty sellable list', () => {
        const vm = selectVillageVM(makeState({}));
        expect(vm.sellables).toEqual([]);
    });

    it('prices a ware at face value', () => {
        const vm = selectVillageVM(
            makeState({ currency: 100, wares: [{ itemId: REAL_CONSUMABLE_ID!, price: 12 }] }),
        );
        expect(vm.wares[0]).toMatchObject({ price: 12 });
    });
});
