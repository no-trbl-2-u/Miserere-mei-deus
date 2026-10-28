/**
 * Hermetic component test — the skull in the fight (phase DY1d, A14).
 *
 * While `GameState.dying` is set, the combat board's player portrait is a
 * skull at its two sites: the footer-dock medallion and the pilgrim modal's
 * head. Not dying, the raster portrait shows as before. The default
 * `PlayerPortraitImage` (the character tab, the equipment dock) never turns
 * into a skull: only the opt-in does.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { PlayerMedallion } from '@/components/combat/encounter/CombatCombatantPane';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['spoiled-poultice', 'the-long-lent', 'chilblain-watch', 'thin-hymn'];
// The skull is decorative (the medallion's label speaks), so it is hidden from the a11y tree.
const HIDDEN = { includeHiddenElements: true } as const;

function mount(dying: boolean) {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    if (dying) store.setState({ dying: true } as never);
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={jest.fn()} />,
        { store },
    );
    render(tree);
    act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    return { store };
}

describe('the combat board portrait while dying', () => {
    it('shows a skull in the medallion, and says dying in its label', () => {
        mount(true);
        const medallion = screen.getByTestId('combat-player-medallion');
        expect(medallion.props.accessibilityLabel).toMatch(/, dying, VITAE/);
        expect(screen.getAllByTestId('player-portrait-skull', HIDDEN)).toHaveLength(1);
    });

    it('shows a skull at the head of the pilgrim modal too', () => {
        mount(true);
        act(() => { fireEvent.press(screen.getByTestId('combat-player-medallion')); });
        expect(screen.getByTestId('combat-pilgrim-modal')).toBeTruthy();
        expect(screen.getAllByTestId('player-portrait-skull', HIDDEN)).toHaveLength(2);
    });

    it('gives the pilgrim modal head a spoken dying cue, and none when not dying', () => {
        mount(true);
        act(() => { fireEvent.press(screen.getByTestId('combat-player-medallion')); });
        const head = screen.getByTestId('combat-pilgrim-portrait');
        expect(head.props.accessibilityLabel).toBe('Dying');
        expect(head.props.accessible).toBe(true);
    });

    it('leaves the pilgrim modal head unlabelled when not dying', () => {
        mount(false);
        act(() => { fireEvent.press(screen.getByTestId('combat-player-medallion')); });
        expect(screen.getByTestId('combat-pilgrim-portrait').props.accessibilityLabel).toBeUndefined();
    });

    it('keeps the portrait when not dying (no skull, plain label)', () => {
        mount(false);
        const medallion = screen.getByTestId('combat-player-medallion');
        expect(medallion.props.accessibilityLabel).not.toMatch(/dying/);
        act(() => { fireEvent.press(medallion); });
        expect(screen.queryByTestId('player-portrait-skull', HIDDEN)).toBeNull();
    });

    it('is the store that decides: a heal clears the skull', () => {
        const { store } = mount(true);
        expect(screen.getAllByTestId('player-portrait-skull', HIDDEN)).toHaveLength(1);
        act(() => { store.setState({ dying: undefined } as never); });
        expect(screen.queryByTestId('player-portrait-skull', HIDDEN)).toBeNull();
    });
});

describe('the medallion label while dying and on the sacrifice floor', () => {
    const PLAYER = { name: 'Pilgrim', hp: 3, maxHp: 40, hpPct: 0.075 } as unknown as React.ComponentProps<typeof PlayerMedallion>['player'];

    function medallion(dying: boolean) {
        const { store } = startRealFight(REAL_FIGHT_FIXTURE, {});
        if (dying) store.setState({ dying: true } as never);
        const { tree } = withAllProviders(
            <PlayerMedallion player={PLAYER} enemyIntentDamage={0} sacrificeCallout={{ cost: 5, vitae: 3, n: 1 }} />,
            { store },
        );
        render(tree);
        return screen.getByTestId('combat-player-medallion').props.accessibilityLabel as string;
    }

    it('keeps the dying cue when the sacrifice-floor label replaces the plain one', () => {
        expect(medallion(true)).toMatch(/SACRIFICE 5 would leave you below 1\. You are dying\.$/);
    });

    it('adds nothing when not dying', () => {
        expect(medallion(false)).not.toMatch(/dying/);
    });
});

describe('PlayerPortraitImage outside the fight', () => {
    function portrait(optIn: boolean) {
        const { store } = startRealFight(REAL_FIGHT_FIXTURE, {});
        store.setState({ dying: true } as never);
        const { tree } = withAllProviders(<PlayerPortraitImage skullWhenDying={optIn} />, { store });
        render(tree);
    }

    it('turns into a skull for the opt-in while dying', () => {
        portrait(true);
        expect(screen.queryByTestId('player-portrait-skull', HIDDEN)).not.toBeNull();
    });

    it('stays the portrait while dying without the opt-in (character tab, equipment dock)', () => {
        portrait(false);
        expect(screen.queryByTestId('player-portrait-skull', HIDDEN)).toBeNull();
    });
});
