/**
 * The cache presenter's card offer carries the rolled card's face (phase
 * RW1b, A8): the same `rewardCardVMs` face the combat reward prints, scaled
 * to the player's stats, so TAKE A CARD shows what it offers before the pick.
 * TAKE THE GOODS carries no face.
 */
import { describe, expect, it } from '@jest/globals';
import { createLootCacheChoiceSession, getCardById } from '@mechanics';
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

    it('no session is the empty VM', () => {
        expect(selectCacheVM({ cache: { session: null } }).offers).toEqual([]);
    });
});
