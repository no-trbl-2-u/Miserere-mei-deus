/**
 * The cache presenter says what you DO, never what you get.
 *
 * Contract asserted here: each offer carries the node's own action line and
 * nothing else — no card face, no goods chips. An unwritten cache falls back
 * to the `[content]` placeholder, and a session with no `actions` at all does
 * too rather than throwing. The outcome ledger,
 * which runs after the pick, still names the rewards.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */
import { describe, expect, it } from '@jest/globals';
import {
    CACHE_ACTION_PLACEHOLDER,
    createLootCacheChoiceSession,
    getCardById,
    getConsumableById,
    type LootCacheActionLines,
    type LootCacheChoiceSession,
} from '@mechanics';
import { cachePicture } from '@/assets/images/treasure/cache-pictures';
import { TREASURE_CHEST_CLOSED, TREASURE_GOLD_HOARD } from '@/assets/images/treasure';
import { selectCacheVM } from '@/state/presenters/cache.engine';

const CAVE_ACTIONS: LootCacheActionLines = {
    card: 'Read the runes inside the cave',
    item: 'Plunder the corpses left by the previous patrons',
};

function cacheState(opts: { actions?: LootCacheActionLines; cardCandidate?: string } = {}) {
    return {
        cache: {
            session: createLootCacheChoiceSession(7, {
                cardCandidate: opts.cardCandidate ?? 'grey-strike',
                itemCandidates: [getConsumableById('healing-potion')!],
                currencyCandidate: 5,
                ...(opts.actions ? { actions: opts.actions } : {}),
            }),
        },
    };
}

describe('selectCacheVM — each offer carries its action line', () => {
    it('an authored cache prints its two lines, one per choice', () => {
        const offers = selectCacheVM(cacheState({ actions: CAVE_ACTIONS })).offers;
        expect(offers.map(o => [o.id, o.label, o.action])).toEqual([
            ['card', 'TAKE A CARD', 'Read the runes inside the cave'],
            ['item', 'TAKE THE GOODS', 'Plunder the corpses left by the previous patrons'],
        ]);
    });

    it('a cache with no lines yet shows the [content] placeholder on both', () => {
        const offers = selectCacheVM(cacheState()).offers;
        expect(offers.map(o => o.action)).toEqual([CACHE_ACTION_PLACEHOLDER, CACHE_ACTION_PLACEHOLDER]);
    });

    it('a blank line falls back to the placeholder rather than printing nothing', () => {
        const offers = selectCacheVM(cacheState({ actions: { card: '   ', item: 'Pry the lid' } })).offers;
        expect(offers.map(o => o.action)).toEqual([CACHE_ACTION_PLACEHOLDER, 'Pry the lid']);
    });

    it('a session persisted before spec 154 carries no lines and still renders', () => {
        const { session } = cacheState().cache;
        const legacy = { ...session } as Partial<LootCacheChoiceSession>;
        delete legacy.actions;
        const offers = selectCacheVM({ cache: { session: legacy as LootCacheChoiceSession } }).offers;
        expect(offers.map(o => o.action)).toEqual([CACHE_ACTION_PLACEHOLDER, CACHE_ACTION_PLACEHOLDER]);
    });

    it('no offer carries a reward: no card face, no goods chips', () => {
        for (const offer of selectCacheVM(cacheState({ actions: CAVE_ACTIONS })).offers) {
            expect(Object.keys(offer).sort()).toEqual(['action', 'id', 'label']);
        }
    });

    it('the authored flavour line is the cache description', () => {
        const state = {
            cache: {
                session: createLootCacheChoiceSession(7, {
                    cardCandidate: 'grey-strike',
                    itemCandidates: [],
                    currencyCandidate: 0,
                    description: 'Shillings in a niche at the cave mouth.',
                    actions: CAVE_ACTIONS,
                }),
            },
        };
        expect(selectCacheVM(state).description).toBe('Shillings in a niche at the cave mouth.');
    });

    it('no session is the empty VM', () => {
        expect(selectCacheVM({ cache: { session: null } }).offers).toEqual([]);
    });
});

describe('selectCacheVM — the outcome ledger still names the rewards', () => {
    it('the card choice settles to the card name', () => {
        const { session } = cacheState({ actions: CAVE_ACTIONS }).cache;
        const outcome = selectCacheVM({
            cache: {
                session: {
                    ...session,
                    phase: 'outcome',
                    outcome: { chosen: 'card', rewardCardId: 'grey-strike', items: [], currency: 0 },
                },
            },
        }).outcome!;
        expect(outcome.label).toBe('TAKE A CARD');
        expect(outcome.cardName).toBe(getCardById('grey-strike')!.name);
    });

    it('the goods choice settles to its items and shillings', () => {
        const { session } = cacheState({ actions: CAVE_ACTIONS }).cache;
        const outcome = selectCacheVM({
            cache: {
                session: {
                    ...session,
                    phase: 'outcome',
                    outcome: {
                        chosen: 'item', rewardCardId: null,
                        items: session.itemCandidates, currency: session.currencyCandidate,
                    },
                },
            },
        }).outcome!;
        expect(outcome.itemNames).toEqual([getConsumableById('healing-potion')!.name]);
        expect(outcome.currency).toBe(5);
    });
});

describe('selectCacheVM - the outcome carries what the screen draws (LC1a)', () => {
    function outcomeState(
        outcome: NonNullable<LootCacheChoiceSession['outcome']>,
        currency?: number,
    ) {
        const { session } = cacheState({ actions: CAVE_ACTIONS }).cache;
        return {
            cache: { session: { ...session, phase: 'outcome' as const, outcome } },
            ...(currency === undefined ? {} : { player: { currency } as never }),
        };
    }

    it('a card outcome carries its one card face and the purse unchanged', () => {
        const vm = selectCacheVM(outcomeState({ chosen: 'card', rewardCardId: 'grey-strike', items: [], currency: 0 }, 15));
        const o = vm.outcome!;
        expect(o.moment).toBe('card');
        expect(o.card?.cardId).toBe('grey-strike');
        expect(o.goods).toEqual([]);
        expect(o.purseAfter).toBe(15);
        expect(vm.purse).toBe(15);
        expect(vm.moment).toBe('card');
    });

    it('a goods outcome carries one row per item with sprite and line, and the purse after paying', () => {
        const potion = getConsumableById('healing-potion')!;
        const vm = selectCacheVM(outcomeState({ chosen: 'item', rewardCardId: null, items: [potion], currency: 6 }, 15));
        const o = vm.outcome!;
        expect(o.moment).toBe('goods');
        expect(o.card).toBeNull();
        expect(o.goods).toEqual([{
            itemId: 'healing-potion', name: 'Healing Potion', spriteKey: 'healing-potion',
            line: 'Heal 20 VITAE · 30 below half VITAE',
        }]);
        expect(o.currency).toBe(6);
        expect(o.purseAfter).toBe(21);
        expect(vm.purse).toBe(21);
    });

    it("the offer shows today's purse and the choice moment, and names no reward", () => {
        const vm = selectCacheVM({ ...cacheState({ actions: CAVE_ACTIONS }), player: { currency: 15 } as never });
        expect(vm.moment).toBe('choice');
        expect(vm.purse).toBe(15);
        expect(vm.outcome).toBeNull();
        for (const offer of vm.offers) expect(Object.keys(offer).sort()).toEqual(['action', 'id', 'label']);
    });
});

describe('cachePicture - one table keyed by moment', () => {
    it('the choice wears the closed chest, goods the hoard, the card slot the stand-in', () => {
        expect(cachePicture('choice')).toBe(TREASURE_CHEST_CLOSED);
        expect(cachePicture('goods')).toBe(TREASURE_GOLD_HOARD);
        expect(cachePicture('card')).toBeNull();
        expect(cachePicture('card', 'cw-6')).toBeNull();
    });
});
