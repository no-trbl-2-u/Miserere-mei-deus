/**
 * Hermetic component tests — StatusCard.
 *
 * StatusCard is the SELF-tab summary header: name + level
 * badge + HP bar. Wired to engine `state.player` via
 * `useGameState`.
 *
 * Tests cover three regimes:
 * - **store-driven defaults** — no props passed; values read
 *   from the engine store via the provider.
 * - **prop overrides** — explicit props win over the store
 *   read (useful for test fixtures + the rare case a caller
 *   wants to display synthetic state).
 * - **structural landmarks** — HP bar present; NO MP/MANA
 *   bar (mana is combat-only).
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import React from 'react';

import { StatusCard } from '@/components/StatusCard';
import { withAllProviders } from '@/test-utils/withAllProviders';

function mount(node: React.ReactElement) {
    const { tree } = withAllProviders(node);
    return render(tree);
}

describe('StatusCard: store-driven defaults (no props)', () => {
    it('renders without crashing when no props are given', () => {
        const tree = mount(<StatusCard />);
        expect(tree.toJSON()).not.toBeNull();
    });

    it('reads name + level from `state.player` via the provider', () => {
        // Fresh game-store player: `createNewGameState` ships a
        // canonical starting character. Name + level surface
        // verbatim from the store.
        const { store, tree } = withAllProviders(<StatusCard />);
        const expectedName = store.getState().player.name;
        const expectedLevel = store.getState().player.level;

        const rendered = render(tree);
        expect(rendered.queryByText(expectedName)).not.toBeNull();
        // The level reads from the badge alone; the "LVL n · PILGRIM"
        // subtitle was cut on 2026-11-02 (T: noise).
        expect(rendered.queryByText(String(expectedLevel))).not.toBeNull();
        expect(rendered.queryByText(/PILGRIM/)).toBeNull();
    });

    it('reads HP / maxHealth from `state.player.health` via the provider', () => {
        const { store, tree } = withAllProviders(<StatusCard />);
        const hp = store.getState().player.health;
        const hpMax = store.getState().player.maxHealth;

        const rendered = render(tree);
        expect(rendered.queryByText('VITAE')).not.toBeNull();
        expect(rendered.queryByText(`${hp}/${hpMax}`)).not.toBeNull();
    });

    it('carries no GRACE track (D39: the morale meter is gone)', () => {
        const { tree } = withAllProviders(<StatusCard />);
        const rendered = render(tree);
        expect(rendered.queryByText('GRACE')).toBeNull();
        expect(rendered.queryByTestId('status-grace-break-legend')).toBeNull();
    });
});

describe('StatusCard: explicit prop overrides', () => {
    it('name prop wins over the store-read name', () => {
        const tree = mount(<StatusCard name="ASHEN WAYFARER" />);
        expect(tree.queryByText('ASHEN WAYFARER')).not.toBeNull();
    });

    it('level prop wins over the store-read level (badge)', () => {
        const tree = mount(<StatusCard level={42} />);
        expect(tree.queryByText('42')).not.toBeNull();
    });

    it('hp/hpMax props win over the store-read HP', () => {
        const tree = mount(<StatusCard hp={5} hpMax={50} />);
        expect(tree.queryByText('5/50')).not.toBeNull();
    });

    it('multiple props compose without crashing (name + level + hp)', () => {
        const tree = mount(
            <StatusCard name="STILLED WALKER" level={1} hp={1} hpMax={1} />,
        );
        expect(tree.queryByText('STILLED WALKER')).not.toBeNull();
        expect(tree.queryByText('1/1')).not.toBeNull();
    });
});

describe('StatusCard: structural landmarks', () => {
    it('renders the HP bar label and no MP/MANA bar (Phase-62 bug-sweep)', () => {
        const tree = mount(<StatusCard />);
        expect(tree.queryByText('VITAE')).not.toBeNull();
        expect(tree.queryByText('MP')).toBeNull();
        expect(tree.queryByText('MANA')).toBeNull();
    });

    it('carries no level subtitle at all — the badge says it once (T, 2026-11-02)', () => {
        const tree = mount(<StatusCard />);
        expect(tree.queryByText(/LVL/)).toBeNull();
        expect(tree.queryByText(/PILGRIM/)).toBeNull();
    });

    it('prints the map beside the pilgrim, larger than the pilgrim (T, 2026-11-02)', () => {
        const tree = mount(<StatusCard name="THE CHOSEN" mapName="The Breakwater" />);
        const map = tree.getByTestId('status-card-map-name');
        expect(map.props.children).toBe('The Breakwater');
        const mapSize = StyleSheet.flatten(map.props.style).fontSize;
        const nameSize = StyleSheet.flatten(tree.getByText('THE CHOSEN').props.style).fontSize;
        expect(mapSize).toBeGreaterThan(nameSize);
    });

    it('draws no map line off the map', () => {
        expect(mount(<StatusCard />).queryByTestId('status-card-map-name')).toBeNull();
    });

    it('draws no map line for a nameless map either, rather than an empty slot', () => {
        // A map with no name must not print a blank line that pushes the
        // VITAE bar down a row.
        expect(mount(<StatusCard mapName="" />).queryByTestId('status-card-map-name')).toBeNull();
    });
});
