/**
 * The cache presenter's card offer carries the rolled card's face (phase
 * RW1b, A8): the same `rewardCardVMs` face the combat reward prints, scaled
 * to the player's stats, so TAKE A CARD shows what it offers before the pick.
 * TAKE THE GOODS carries no face; it carries the rolled goods as the
 * outcome ledger's chips, so its side of the pick is not blind either
 * (CRITIQUE pass 108).
 */
import { describe, expect, it } from '@jest/globals';
import { createLootCacheChoiceSession, getCardById, getConsumableById } from '@mechanics';
import { selectCacheVM } from '@/state/presenters/cache.engine';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';

const STATS = { body: 10, mind: 10, heart: 10 };

function cacheState(cardCandidate: string) {
    return {
        cache: {
            session: createLootCacheChoiceSession(7, { cardCandidate, itemCandidates: [], currencyCandidate: 5 }),
        },
    };
}

describe('selectCacheVM — the card offer shows its card', () => {
    it('the card offer carries the candidate face, name and scaled numbers', () => {
        const vm = selectCacheVM(cacheState('grey-strike'), STATS);
        const card = vm.offers.find(o => o.id === 'card')!.card!;
        const [expected] = rewardCardVMs(['grey-strike'], STATS);
        expect(card.cardId).toBe('grey-strike');
        expect(card.name).toBe(getCardById('grey-strike')!.name);
        expect(card.face.heroText).toBe(expected.face.heroText);
        expect(card.face.statScaled).toBe('up');
    });

    it('without stats the face prints the authored numbers', () => {
        const card = selectCacheVM(cacheState('grey-strike')).offers.find(o => o.id === 'card')!.card!;
        expect(card.face.statScaled).toBeNull();
    });

    it('the goods offer carries no card, and labels are unchanged', () => {
        const vm = selectCacheVM(cacheState('grey-strike'), STATS);
        expect(vm.offers.map(o => o.label)).toEqual(['TAKE A CARD', 'TAKE THE GOODS']);
        expect(vm.offers.find(o => o.id === 'item')!.card).toBeNull();
    });

    it('a candidate id the library lacks leaves the card offer faceless rather than throwing', () => {
        const vm = selectCacheVM(cacheState('no-such-card'), STATS);
        expect(vm.offers.find(o => o.id === 'card')!.card).toBeNull();
    });

    it('the card offer carries no goods', () => {
        expect(selectCacheVM(cacheState('grey-strike'), STATS).offers.find(o => o.id === 'card')!.goods).toEqual([]);
    });

    it('no session is the empty VM', () => {
        expect(selectCacheVM({ cache: { session: null } }).offers).toEqual([]);
    });
});

describe('selectCacheVM — the goods offer shows its goods', () => {
    function goodsState(itemIds: readonly string[], currencyCandidate: number) {
        const itemCandidates = itemIds.map(id => getConsumableById(id)!);
        return {
            cache: {
                session: createLootCacheChoiceSession(7, { cardCandidate: 'grey-strike', itemCandidates, currencyCandidate }),
            },
        };
    }

    it('lists each rolled item, then the shillings, as the ledger chips', () => {
        const goods = selectCacheVM(goodsState(['healing-potion', 'minor-healing-potion'], 10), STATS)
            .offers.find(o => o.id === 'item')!.goods;
        expect(goods).toEqual(['+ HEALING POTION', '+ MINOR HEALING POTION', '+10 SHILLINGS']);
    });

    it('a node with no currency prints no shillings chip', () => {
        const goods = selectCacheVM(goodsState(['healing-potion'], 0), STATS).offers.find(o => o.id === 'item')!.goods;
        expect(goods).toEqual(['+ HEALING POTION']);
    });

    it('the offer chips match the ledger the pick settles to', () => {
        const state = goodsState(['healing-potion'], 12);
        const offered = selectCacheVM(state, STATS).offers.find(o => o.id === 'item')!.goods;
        const s = state.cache.session;
        const settled = selectCacheVM({
            cache: {
                session: {
                    ...s,
                    phase: 'outcome',
                    outcome: { chosen: 'item', rewardCardId: null, items: s.itemCandidates, currency: s.currencyCandidate },
                },
            },
        }, STATS).outcome!;
        expect(offered).toEqual([
            ...settled.itemNames.map(n => `+ ${n.toUpperCase()}`),
            `+${settled.currency} SHILLINGS`,
        ]);
    });
});
