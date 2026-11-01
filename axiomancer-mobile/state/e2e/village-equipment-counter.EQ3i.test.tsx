/**
 * Hermetic screen and store-action test: the village sells weapons and armor.
 *
 * A village event carrying an `equipmentShop` lists its pieces with their
 * prices on the village screen; buying one takes the price, puts the piece in
 * the satchel unworn and marks it sold; a short purse is refused with its
 * reason and writes nothing; a village without the counter shows none.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
    EQUIPMENT_DROP_TUNING,
    GREY_WEAPON_ID,
    createNewGameState,
    villageEquipmentShopFor,
} from '@mechanics';
import VillageScreen from '@/app/village/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectVillageVM } from '@/state/presenters/village.engine';
import { buyVillageEquipmentAction } from '@/state/village/store-actions';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

function makeStore(currency: number, stocked = true): AppStore {
    const base = createNewGameState({ characterId: 'the-chosen' });
    const player = { ...base.player, currency };
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({
        player,
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'The Fishing Hamlet',
                    merchants: [],
                    ...(stocked ? { equipmentShop: villageEquipmentShopFor({ ...base, player }, 'bw-t4') } : {}),
                } as never,
            },
        },
    } as never);
    return store;
}

function renderVillage(store: AppStore) {
    return render(
        <GameStoreProvider store={store}>
            <VillageScreen />
        </GameStoreProvider>,
    );
}

describe('the village equipment counter (EQ3i)', () => {
    it('lists the stock with the tuned price, never the grey pair', () => {
        const vm = selectVillageVM(makeStore(100).getState());
        expect(vm.equipmentShop).toHaveLength(EQUIPMENT_DROP_TUNING.shopCount);
        for (const piece of vm.equipmentShop ?? []) {
            expect(piece.price).toBe(EQUIPMENT_DROP_TUNING.shopPrice);
            expect(piece.enabled).toBe(true);
            expect(piece.pieceId).not.toBe(GREY_WEAPON_ID);
        }
    });

    it('each row says what the piece does, in the shared effect line', () => {
        const store = makeStore(100);
        renderVillage(store);
        for (const piece of selectVillageVM(store.getState()).equipmentShop ?? []) {
            expect(piece.effect).not.toBeNull();
            expect(screen.getByTestId(`village-equipment-${piece.pieceId}-effect`).props.children).toBe(piece.effect);
        }
    });

    it('a village without the counter shows none', () => {
        const store = makeStore(100, false);
        expect(selectVillageVM(store.getState()).equipmentShop).toBeNull();
        renderVillage(store);
        expect(screen.queryByTestId('village-equipment-shop')).toBeNull();
    });

    it('renders a row with a price for each piece', () => {
        const store = makeStore(100);
        renderVillage(store);
        expect(screen.getByTestId('village-equipment-shop')).toBeTruthy();
        for (const piece of selectVillageVM(store.getState()).equipmentShop ?? []) {
            expect(screen.getByTestId(`village-equipment-${piece.pieceId}`)).toBeTruthy();
            expect(screen.getByTestId(`village-equipment-${piece.pieceId}-price`).props.children)
                .toBe(`${EQUIPMENT_DROP_TUNING.shopPrice} SHILLINGS`);
        }
    });

    it('buying takes the price, carries the piece unworn and marks it sold', () => {
        const store = makeStore(100);
        renderVillage(store);
        const pieceId = selectVillageVM(store.getState()).equipmentShop![0]!.pieceId;
        fireEvent.press(screen.getByTestId(`village-equipment-${pieceId}`));
        const player = store.getState().player;
        expect(player.currency).toBe(100 - EQUIPMENT_DROP_TUNING.shopPrice);
        expect(player.inventory.some((item) => item.id === pieceId)).toBe(true);
        expect(player.equipment.weapon?.id).toBe(GREY_WEAPON_ID);
        const sold = selectVillageVM(store.getState()).equipmentShop!.find((p) => p.pieceId === pieceId)!;
        expect([sold.sold, sold.enabled]).toEqual([true, false]);
        expect(screen.getByTestId(`village-equipment-${pieceId}-price`).props.children).toBe('SOLD');
        expect(screen.getByTestId('village-note')).toBeTruthy();
    });

    it('refuses a short purse and writes nothing', () => {
        const store = makeStore(EQUIPMENT_DROP_TUNING.shopPrice - 1);
        const pieceId = selectVillageVM(store.getState()).equipmentShop![0]!.pieceId;
        const before = store.getState().player;
        const result = buyVillageEquipmentAction(store, pieceId);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.refusal).toContain(`${EQUIPMENT_DROP_TUNING.shopPrice}`);
        expect(store.getState().player).toBe(before);
    });

    it('refuses when no village is pending', () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        expect(buyVillageEquipmentAction(store, 'weapon-siphoning-blade'))
            .toEqual({ ok: false, refusal: 'there is no village here' });
    });
});
