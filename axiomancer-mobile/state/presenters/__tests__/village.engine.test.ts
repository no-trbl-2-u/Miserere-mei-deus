/**
 * Hermetic tests for the settlement presenter
 * (`state/presenters/village.engine.ts`).
 *
 * `selectVillageVM` is a pure `(state) -> VillageVM` mapper. These tests pin:
 *   - the EMPTY_VM gate (no pending event / wrong event kind),
 *   - merchant `line`/`hasDialogue` derivation from the dialogue tree,
 *   - the paid rest counter (NK1c A8): price, heal, and each refusal shown,
 *   - the card shop (A9): real card faces, the price, sold-this-visit and a
 *     short purse shown as refusals,
 *   - card removal (A10): the escalating price and the deck's cards,
 *   - and that a village carries no item wares any more (A11).
 */

import {
    buildCombatDeck,
    cardRemovalPrice,
    getCardById,
    STARTING_CARD_IDS,
    type NPC,
    type VillageVisit,
} from '@mechanics';
import { removableCards, selectVillageVM } from '../village.engine';
import type { AppStoreState } from '@/state/store';

type VillageState = Pick<AppStoreState, 'event' | 'player'> & { flags?: readonly string[] };

const CARDS = ['grey-strike', 'grey-ward', 'grey-word'];

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
    currency?: number;
    health?: number;
    cardRemovals?: number;
    villageName?: string;
    kind?: string;
    noPending?: boolean;
    rest?: boolean;
    cardShop?: boolean;
    visit?: VillageVisit;
}): VillageState {
    const {
        merchants = [],
        currency = 0,
        health = 40,
        cardRemovals = 0,
        villageName = 'Saltmarsh',
        kind = 'village',
        noPending = false,
        rest = false,
        cardShop = false,
        visit,
    } = opts;

    const event = noPending
        ? ({ pending: null } as unknown as AppStoreState['event'])
        : ({
              pending: {
                  event: {
                      kind,
                      villageName,
                      merchants,
                      ...(rest ? { rest: { price: 6 } } : {}),
                      ...(cardShop ? { cardShop: { cardIds: CARDS, price: 6 } } : {}),
                  },
              },
              ...(visit ? { villageVisit: visit } : {}),
          } as unknown as AppStoreState['event']);

    return {
        event,
        player: {
            currency,
            health,
            maxHealth: 100,
            cardRemovals,
            knownCards: [...STARTING_CARD_IDS],
            combatRewardCards: [],
        } as unknown as AppStoreState['player'],
        flags: [],
    };
}

describe('selectVillageVM', () => {
    it('returns the inactive EMPTY_VM when no event is pending', () => {
        const vm = selectVillageVM(makeState({ noPending: true }));
        expect(vm.active).toBe(false);
        expect(vm.villageName).toBe('');
        expect(vm.merchants).toEqual([]);
        expect(vm.rest).toBeNull();
        expect(vm.cardShop).toBeNull();
        expect(vm.currency).toBe(0);
    });

    it('returns the inactive EMPTY_VM when the pending event is not a village', () => {
        const vm = selectVillageVM(makeState({ kind: 'encounter' }));
        expect(vm.active).toBe(false);
        expect(vm.villageName).toBe('');
    });

    it('activates with the village name, body, purse and VITAE for a pending village event', () => {
        const vm = selectVillageVM(makeState({ villageName: 'Saltmarsh', currency: 12 }));
        expect(vm.active).toBe(true);
        expect(vm.villageName).toBe('Saltmarsh');
        expect(vm.body.length).toBeGreaterThan(0);
        expect(vm.currency).toBe(12);
        expect([vm.health, vm.maxHealth]).toEqual([40, 100]);
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

    it('a village without counters carries none, and never an item ware (A11)', () => {
        const vm = selectVillageVM(makeState({}));
        expect(vm.rest).toBeNull();
        expect(vm.cardShop).toBeNull();
        expect(Object.keys(vm)).not.toEqual(expect.arrayContaining(['wares', 'sellables', 'hasShop']));
    });
});

describe('the paid rest counter (A8)', () => {
    it('names its price and the VITAE it restores', () => {
        const vm = selectVillageVM(makeState({ rest: true, currency: 10 }));
        expect(vm.rest).toEqual({
            price: 6,
            heal: 25,
            effect: 'restores 25 VITAE',
            enabled: true,
            refusal: null,
        });
    });

    it('is shown refused when the purse is short', () => {
        const vm = selectVillageVM(makeState({ rest: true, currency: 5 }));
        expect(vm.rest?.enabled).toBe(false);
        expect(vm.rest?.refusal).toBe("you can't cover the 6 it costs");
    });

    it('is shown refused once rested this visit', () => {
        const vm = selectVillageVM(makeState({ rest: true, currency: 50, visit: { rested: true, boughtCardIds: [] } }));
        expect(vm.rest?.refusal).toBe('you have rested here this visit');
    });
});

describe('the card shop (A9, A10)', () => {
    it('offers the event\'s cards as real faces at the shop price', () => {
        const vm = selectVillageVM(makeState({ cardShop: true, currency: 20 }));
        expect(vm.cardShop?.cards.map(c => c.cardId)).toEqual(CARDS);
        for (const card of vm.cardShop!.cards) {
            expect(card.name).toBe(getCardById(card.cardId)?.name);
            expect(card.face.cardId).toBe(card.cardId);
            expect(card.price).toBe(6);
            expect(card.enabled).toBe(true);
        }
    });

    it('shows a card bought this visit as sold, and a short purse as a refusal', () => {
        const vm = selectVillageVM(makeState({
            cardShop: true,
            currency: 3,
            visit: { rested: false, boughtCardIds: ['grey-ward'] },
        }));
        const ward = vm.cardShop!.cards.find(c => c.cardId === 'grey-ward')!;
        expect(ward.sold).toBe(true);
        expect(ward.refusal).toBe('sold this visit');
        const strike = vm.cardShop!.cards.find(c => c.cardId === 'grey-strike')!;
        expect(strike.sold).toBe(false);
        expect(strike.refusal).toBe("you can't cover the 6 it costs");
    });

    it('prices removal on the escalating ladder and lists the deck\'s cards', () => {
        const vm = selectVillageVM(makeState({ cardShop: true, currency: 50, cardRemovals: 2 }));
        expect(vm.cardShop?.removal.price).toBe(cardRemovalPrice(2));
        expect(vm.cardShop?.removal.nextPrice).toBe(cardRemovalPrice(3));
        expect(vm.cardShop?.removal.enabled).toBe(true);
        expect(vm.cardShop?.removal.cards.map(c => c.cardId)).toEqual(['grey-strike', 'grey-ward', 'grey-word']);
    });

    it('shows removal refused when the purse is short', () => {
        const vm = selectVillageVM(makeState({ cardShop: true, currency: 4 }));
        expect(vm.cardShop?.removal.enabled).toBe(false);
        expect(vm.cardShop?.removal.refusal).toBe("you can't cover the 5 it costs");
    });
});

describe('removableCards', () => {
    it('counts each card\'s copies, first-seen order', () => {
        const deck = buildCombatDeck({ knownCards: [...STARTING_CARD_IDS], combatRewardCards: [] } as never, []);
        const rows = removableCards(deck);
        expect(rows.reduce((n, r) => n + r.count, 0)).toBe(deck.length);
        expect(new Set(rows.map(r => r.cardId)).size).toBe(rows.length);
    });
});
