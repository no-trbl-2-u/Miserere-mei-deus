/**
 * Hermetic E2E — only the heal choice at a rest clears dying (phase DY1b, A9).
 *
 * A first death leaves the player dying. The rest site's heal (REST) clears
 * it in the same write as the claim; the upgrade does not, and nor
 * does a potion, a level-up, a move to the next node, or arriving at a rest
 * and leaving unclaimed.
 */

import { describe, expect, it } from '@jest/globals';
import type { Consumable, GameState } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import {
    beginRestAction,
    chooseRestChoiceOfferAction,
    claimRestChoiceOutcomeAction,
    pickRestChoiceUpgradeAction,
} from '@/state/rest/store-actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const KNOWN = [
    'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike', 'grey-strike',
    'grey-strike', 'grey-ward', 'grey-ward', 'grey-ward', 'grey-ward',
    'grey-word', 'grey-word', 'grey-word', 'grey-word',
];

const POTION: Consumable = {
    id: 'phial',
    name: 'Phial',
    description: 'A small phial.',
    category: 'consumable',
    healAmount: 6,
    quantity: 2,
};

/** A wounded, dying pilgrim: a first death behind them. */
function dyingStore(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const actions = createAppActions(store);
    const { player } = store.getState();
    store.setState({
        player: {
            ...player,
            maxHealth: 160,
            health: 90,
            currency: 999,
            knownCards: [...KNOWN],
            inventory: [POTION],
        },
        flags: [],
    } as never);
    actions.moveTo('bw-w2');
    expect(actions.playerDied('fight')).toBe('revived');
    expect(store.getState().dying).toBe(true);
    return { store, actions };
}

function dyingOf(store: AppStore): boolean | undefined {
    return (store.getState() as unknown as GameState).dying;
}

describe('rest and dying', () => {
    it('the heal choice clears dying and heals', () => {
        const { store } = dyingStore();
        const before = store.getState().player.health;
        expect(beginRestAction(store, { seed: 7, shelter: 'camp' })).toBe(true);
        chooseRestChoiceOfferAction(store, 'rest');
        const claim = claimRestChoiceOutcomeAction(store);

        expect(claim.chosen).toBe('rest');
        expect(dyingOf(store)).toBeUndefined();
        expect(store.getState().player.health).toBeGreaterThan(before);
    });

    it('the upgrade choice leaves dying set', () => {
        const { store } = dyingStore();
        // Give the upgrade offer something to work on.
        const { player } = store.getState();
        store.setState({ player: { ...player, combatRewardCards: [] } } as never);
        beginRestAction(store, { seed: 7, shelter: 'camp' });
        chooseRestChoiceOfferAction(store, 'upgrade');
        const session = store.getState().rest.session!;
        const target = session.upgradableCardIds[0];
        expect(target).toBeDefined();
        pickRestChoiceUpgradeAction(store, target!);
        const claim = claimRestChoiceOutcomeAction(store);

        expect(claim.chosen).toBe('upgrade');
        expect(dyingOf(store)).toBe(true);
    });

    it('arriving at a rest and leaving unclaimed leaves dying set', () => {
        const { store } = dyingStore();
        beginRestAction(store, { seed: 7, shelter: 'camp' });
        chooseRestChoiceOfferAction(store, 'rest');
        // The outcome is on the ledger but never claimed.
        store.setState({ rest: { session: null } } as never);

        expect(dyingOf(store)).toBe(true);
    });

    it('a potion leaves dying set', () => {
        const { store, actions } = dyingStore();
        expect(actions.useItem('phial').applied).toBe(true);
        expect(dyingOf(store)).toBe(true);
    });

    it('a level-up leaves dying set', () => {
        const { store, actions } = dyingStore();
        const { player } = store.getState();
        store.setState({ player: { ...player, experience: 1_000_000 } } as never);
        actions.levelUp();
        expect(dyingOf(store)).toBe(true);
    });

    it('walking on leaves dying set', () => {
        const { store, actions } = dyingStore();
        actions.moveTo('bw-w2');
        expect(dyingOf(store)).toBe(true);
    });
});
