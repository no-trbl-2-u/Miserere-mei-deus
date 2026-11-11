/**
 * The boss's held title card and the elite's chip. The boss card is the whole
 * reveal: rules, eyebrow, name, place, figure, hint, no WITHDRAW, and one tap
 * starts the fight on the board. The elite wears its ELITE chip and a
 * LEVEL <n> / <hp> VITAE line.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { BOSS_CARD_HINT, BOSS_CARD_SUBTITLE } from '@/components/combat/encounter/reveal.copy';
import { REAL_BOSS_FIGHT_FIXTURE, REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];

function mount(fixture: typeof REAL_FIGHT_FIXTURE, nodeId: string, onWithdraw?: () => void) {
    const { store, enemy } = startRealFight(fixture, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel
            enemy={enemy}
            bootstrapPlayer={bootstrapPlayer}
            deck={CARDS}
            seed={7}
            nodeId={nodeId}
            onExit={() => undefined}
            onWithdraw={onWithdraw}
        />,
        { store },
    );
    render(tree);
    return { enemy };
}

describe('the boss title card', () => {
    it('is the whole reveal: two rules top and foot, eyebrow, name, place, hint, no WITHDRAW', () => {
        const { enemy } = mount(REAL_BOSS_FIGHT_FIXTURE, 'bw-k2');
        const card = screen.getByTestId('combat-reveal-boss-card');
        expect(card.props.accessibilityRole).toBe('button');
        expect(card.props.accessibilityLabel).toContain(enemy.name);
        expect(card.props.accessibilityLabel).toContain('Sea keep');
        expect(card.props.accessibilityLabel).toContain(BOSS_CARD_HINT);
        expect(screen.getByTestId('combat-reveal-boss-rules-top').children).toHaveLength(2);
        expect(screen.getByTestId('combat-reveal-boss-rules-foot').children).toHaveLength(2);
        expect(screen.getByText(BOSS_CARD_SUBTITLE)).toBeTruthy();
        expect(screen.getByTestId('combat-reveal-boss-name').props.numberOfLines).toBeUndefined();
        expect(screen.getByText('Sea keep')).toBeTruthy();
        expect(screen.getByText(BOSS_CARD_HINT)).toBeTruthy();
        expect(screen.getByTestId('combat-reveal-ground-boss')).toBeTruthy();
        expect(screen.queryByTestId('combat-withdraw')).toBeNull();
        expect(screen.queryByTestId('combat-enter')).toBeNull();
    });

    it('starts the fight on one tap, straight onto the board', () => {
        mount(REAL_BOSS_FIGHT_FIXTURE, 'bw-k2');
        fireEvent.press(screen.getByTestId('combat-reveal-boss-card'));
        expect(screen.queryByTestId('combat-reveal')).toBeNull();
        expect(screen.getByTestId('combat-board')).toBeTruthy();
    });
});

describe('the elite reveal', () => {
    it('wears the ELITE chip with LEVEL and VITAE, and keeps WITHDRAW', () => {
        const onWithdraw = jest.fn();
        mount(REAL_FIGHT_FIXTURE, 'bw-w5', onWithdraw);
        expect(screen.getByTestId('combat-reveal-chip')).toBeTruthy();
        expect(screen.getByText('ELITE')).toBeTruthy();
        expect(screen.getByTestId('combat-reveal-ground-elite')).toBeTruthy();
        expect(screen.getByText(/LEVEL/)).toBeTruthy();
        expect(screen.queryByTestId('combat-reveal-boss-card')).toBeNull();
        fireEvent.press(screen.getByTestId('combat-withdraw'));
        expect(onWithdraw).toHaveBeenCalledTimes(1);
    });
});
