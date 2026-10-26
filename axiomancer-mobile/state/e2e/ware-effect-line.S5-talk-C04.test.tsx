/**
 * Hermetic tests — a stall says what its wares DO (cluster S5-talk-C04).
 *
 * The settlement shop priced a name, a flavour line and a number. Nothing on
 * the row said what the coin bought, which is the one thing a shop in this
 * genre always states: a player who has never met `Philosopher's Tea` cannot
 * tell 35 shillings from 3.
 *
 * Contract asserted here: `wareEffectLine` reads the mechanical payload off
 * the same engine libraries the effect is applied from — heal in VITAE, a
 * timed effect with its rounds, a relic's stat bump and the signature it
 * grants — the village VM carries that line per ware, and the stall row
 * prints it above the flavour line.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import {
    consumableLibrary,
    getRelicById,
    FIXTURE_ARMOR,
    type Consumable,
    type Item,
} from '@mechanics';

import VillageScreen from '@/app/village/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { selectVillageVM, wareEffectLine } from '@/state/presenters/village.engine';
import { createAppStore, EMPTY_EVENT_SLICE, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Hoisted above the imports by babel-plugin-jest-hoist: this screen pops the
// route the moment its slice empties, so the router must be stubbed.
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => true,
    }),
}));

const HEAL_WARE = consumableLibrary.find((c) => (c.healAmount ?? 0) > 0)!;
// The live library's one relic (the ring) grants a signature and no stat; the
// fixture armor carries the +maxHp line, so the stat-bump clause has a witness.
const RELIC = getRelicById('relic-disarming-plea')!;

/** A village seated on one stall selling `ware`, with coin enough to buy it. */
function villageStore(wareId: string): AppStore {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    store.setState({
        player: { ...state.player, currency: 999 },
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: {
                state: undefined as never,
                event: {
                    kind: 'village',
                    villageName: 'Saltmarsh',
                    merchants: [],
                    shop: { wares: [{ itemId: wareId, price: 4 }] },
                } as never,
            },
        },
    });
    return store;
}

describe('wareEffectLine states the mechanical read (S5-talk-C04)', () => {
    it('states a heal in VITAE, never in HP', () => {
        const line = wareEffectLine(HEAL_WARE);

        expect(line).toContain(`${HEAL_WARE.healAmount}`);
        expect(line).toContain('VITAE');
        expect(line).not.toMatch(/\bHP\b/);
    });

    it('states BOTH bands for a two-band healing potion (Phase 96)', () => {
        // Every shipped healing potion carries a desperation band. A stall that
        // quotes only the flat number hides the one fact that should decide the
        // purchase — that the flask is worth half again when the buyer is losing.
        const banded = consumableLibrary.find(
            (c) => (c.healAmountBelowHalf ?? 0) > 0,
        )!;
        expect(banded).toBeDefined();

        const line = wareEffectLine(banded);

        expect(line).toContain(`${banded.healAmount}`);
        expect(line).toContain(`${banded.healAmountBelowHalf}`);
        expect(line).toContain('below half');
        expect(line).toContain('VITAE');
        // The naming law still holds on the new clause.
        expect(line).not.toMatch(/\bHP\b/);
    });

    it('states only the flat heal for a band-less consumable', () => {
        const flat = consumableLibrary.find(
            (c) => (c.healAmount ?? 0) > 0 && !(c.healAmountBelowHalf ?? 0),
        );
        // The library may legitimately band every healer; skip rather than
        // invent a fixture that does not ship.
        if (!flat) return;

        const line = wareEffectLine(flat);
        expect(line).toContain(`restores ${flat.healAmount} VITAE`);
        expect(line).not.toContain('below half');
    });

    it('states a relic as the signature it grants', () => {
        expect(wareEffectLine(RELIC)).toBe('grants The Open Hand');
    });

    it('states a relic\'s stat bump', () => {
        expect(wareEffectLine(FIXTURE_ARMOR)).toBe('+5 max VITAE');
    });

    it('says nothing for an item with no mechanical payload', () => {
        const scrap: Item = {
            id: 'scrap',
            name: 'Scrap',
            description: 'Of no particular provenance.',
            category: 'material',
            quantity: 1,
        };

        expect(wareEffectLine(scrap)).toBe('');
    });
});

describe('the village VM carries an effect line per ware (S5-talk-C04)', () => {
    it('fills `effect` from the resolved library item', () => {
        const store = villageStore(HEAL_WARE.id);
        const { event, player } = store.getState();
        const vm = selectVillageVM({ event, player });

        expect(vm.wares).toHaveLength(1);
        expect(vm.wares[0]!.effect).toBe(wareEffectLine(HEAL_WARE));
        expect(vm.wares[0]!.effect.length).toBeGreaterThan(0);
    });
});

describe('the stall row prints the effect line (S5-talk-C04)', () => {
    it('renders it, and names it to a screen reader on the buy control', () => {
        const store = villageStore(HEAL_WARE.id);
        const r = render(
            <GameStoreProvider store={store}>
                <VillageScreen />
            </GameStoreProvider>,
        );

        const effect = r.getByTestId(`village-ware-${HEAL_WARE.id}-effect`);
        expect(effect.props.children).toBe(wareEffectLine(HEAL_WARE));

        const row = r.getByTestId(`village-ware-${HEAL_WARE.id}`);
        expect(row.props.accessibilityLabel).toContain(wareEffectLine(HEAL_WARE));
    });
});
