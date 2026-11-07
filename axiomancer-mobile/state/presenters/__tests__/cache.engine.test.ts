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
