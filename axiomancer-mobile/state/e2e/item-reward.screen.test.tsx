/**
 * Hermetic E2E — the `/item-reward` screen (rules D5 / D6 / D7).
 *
 * Mounts the real route against a rigged store and drives its two commits.
 * The D7 assertion is the one that matters most: UNMOUNTING the screen — what
 * back, swipe and Android hardware-back all do, since this route deliberately
 * carries no `gestureEnabled: false` and no `<HardwareBackHandler>` — must
 * behave exactly as CONFIRM. No exit path may lose a reward.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
    createCharacter, getConsumableById, getRelicById, FIXTURE_ARMOR, FIXTURE_TRINKETS,
    FIXTURE_WEAPON, SLOT_CAPACITY,
} from '@mechanics';
import type { Character, Equipment, GameState, Item } from '@mechanics';

import ItemRewardScreen from '@/app/item-reward/index';
import { offerItemRewardAction } from '@/state/item-reward/store-actions';
import type { AppStore } from '@/state/store';
import { withAllProviders } from '@/test-utils/withAllProviders';

const mockBack = jest.fn();
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ back: mockBack, push: jest.fn(), canGoBack: () => true }),
}));

afterEach(() => {
    jest.clearAllMocks();
});

function relic(id: string): Equipment {
    const found = getRelicById(id);
    if (!found) throw new Error(`test fixture missing relic ${id}`);
    return found;
}

/** A relic the seeded character is guaranteed NOT to be wearing: the ring. */
const BENCHED_ACCESSORY = 'relic-disarming-plea';

/** A second armor piece; its +max VITAE line earns it the screen under D5. */
const SPARE_ARMOR: Equipment = { ...FIXTURE_ARMOR, id: 'fixture-armor-2' };

function player(store: AppStore): Character {
    return (store.getState() as unknown as GameState).player;
}

function mount(offer?: (store: AppStore) => void) {
    const { tree, store } = withAllProviders(<ItemRewardScreen />);
    // A fresh run wears NOTHING, so the D6 "trade" cases seed the fixture relics explicitly: a full relic
    // row is what makes EQUIP a swap rather than a free fill.
    const kit = [FIXTURE_WEAPON, FIXTURE_ARMOR, ...FIXTURE_TRINKETS];
    store.setState({
        player: createCharacter({
            name: 'Kitted', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
            inventory: [...kit], equipment: [...kit],
        }),
    });
    if (offer) offer(store);
    const view = render(tree);
    return { store, view };
}

describe('/item-reward screen — lane line (LR1a A3)', () => {
    it('a lane relic hands over with "Lane: Blood Price (while worn)"; a laneless one draws none', () => {
        mount((store) => offerItemRewardAction(store, relic('relic-bleeding-signet')));
        expect(screen.getByTestId('item-reward-lane').props.children).toBe('Lane: Blood Price (while worn)');
    });

    it('the Suppliant\'s Ring hands over with "Lane: Merciful (while worn)"', () => {
        mount((store) => offerItemRewardAction(store, relic(BENCHED_ACCESSORY)));
        expect(screen.getByTestId('item-reward-lane').props.children).toBe('Lane: Merciful (while worn)');
    });
});

describe('/item-reward screen', () => {
    it('presents the item, its signature skill, and the trade EQUIP would make', () => {
        mount((store) => offerItemRewardAction(store, relic(BENCHED_ACCESSORY)));

        expect(screen.getByTestId('item-reward-name').props.children).toBe("Suppliant's Ring");
        expect(screen.getByTestId('item-reward-signature')).toBeTruthy();
        // The ring grants ONLY its signature, so no stats block renders.
        expect(screen.queryByTestId('item-reward-stats')).toBeNull();
        // D6 — the displaced piece is named before the player commits.
        expect(screen.getByTestId('item-reward-trade-note').props.children)
            .toContain('satchel');
        // D7 — the player is told that leaving keeps it.
        expect(screen.getByTestId('item-reward-keep-note')).toBeTruthy();
    });

    it('hides EQUIP — does not grey it — for an item that cannot be worn', () => {
        mount((store) =>
            offerItemRewardAction(store, getConsumableById('healing-potion') as Item, {
                includeInline: true,
            }),
        );

        expect(screen.queryByTestId('item-reward-equip')).toBeNull();
        expect(screen.getByTestId('item-reward-confirm')).toBeTruthy();
    });

    it('CONFIRM puts it in the satchel and changes nothing on the body', () => {
        const { store } = mount((s) => offerItemRewardAction(s, relic(BENCHED_ACCESSORY)));
        const wornBefore = player(store).equipment.relics.map((a) => a.id);

        act(() => {
            fireEvent.press(screen.getByTestId('item-reward-confirm'));
        });

        const after = player(store);
        expect(after.inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);
        expect(after.equipment.relics.map((a) => a.id)).toEqual(wornBefore);
        expect(store.getState().itemReward.queue).toHaveLength(0);
    });

    it('EQUIP puts it in the satchel AND on the body, returning the displaced piece', () => {
        const { store } = mount((s) => offerItemRewardAction(s, relic(BENCHED_ACCESSORY)));
        const displaced = player(store).equipment.relics[SLOT_CAPACITY.relic - 1]!;

        act(() => {
            fireEvent.press(screen.getByTestId('item-reward-equip'));
        });

        const after = player(store);
        expect(after.equipment.relics.map((a) => a.id)).toContain(BENCHED_ACCESSORY);
        expect(after.inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);
        // Nothing is destroyed by a swap.
        expect(after.inventory.map((i) => i.id)).toContain(displaced.id);
        expect(store.getState().itemReward.queue).toHaveLength(0);
    });

    it('D7 — unmounting the screen (back / swipe / hardware-back) behaves as CONFIRM', () => {
        const { store, view } = mount((s) => offerItemRewardAction(s, relic(BENCHED_ACCESSORY)));
        const wornBefore = player(store).equipment.relics.map((a) => a.id);

        act(() => {
            view.unmount();
        });

        const after = player(store);
        expect(after.inventory.map((i) => i.id)).toContain(BENCHED_ACCESSORY);
        expect(after.equipment.relics.map((a) => a.id)).toEqual(wornBefore);
        expect(store.getState().itemReward.queue).toHaveLength(0);
    });

    it('dismissing mid-batch keeps every queued item', () => {
        const { store, view } = mount((s) =>
            offerItemRewardAction(s, [relic(BENCHED_ACCESSORY), SPARE_ARMOR]),
        );

        act(() => {
            view.unmount();
        });

        const ids = player(store).inventory.map((i) => i.id);
        expect(ids).toContain(BENCHED_ACCESSORY);
        expect(ids).toContain(SPARE_ARMOR.id);
    });

    it('unwinds the route once the queue is empty', () => {
        mount();
        expect(screen.getByTestId('item-reward-inactive')).toBeTruthy();
        expect(mockBack).toHaveBeenCalled();
    });
});
