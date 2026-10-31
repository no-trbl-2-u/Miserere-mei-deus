/**
 * The Toll-Keeper's "Pay the toll (n)" button on the enemy pane (phase EN1l,
 * A18): it shows only while a toll is owed and the board wires the action,
 * a tap pays, and a refused toll still reaches the engine (which logs its
 * reason) while the pane prints the reason under the button.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CombatCombatantPane } from '@/components/combat/encounter/CombatCombatantPane';
import {
    TOLL_COPY, type CombatEnemyPaneVM, type CombatPlayerPaneVM, type CombatTollVM,
} from '@/state/presenters/combat-encounter.engine';
import { HUE } from '@/theme/axm';
import { withAllProviders } from '@/test-utils/withAllProviders';

const ENEMY: CombatEnemyPaneVM = {
    name: 'The Toll-Keeper', artKey: 'toll-keeper', isBoss: false, artNonce: 3,
    hp: 120, maxHp: 140, hpPct: 0.85, effects: [],
    intent: {
        type: 'attack', icon: '⚔', label: 'ATTACK', color: HUE.damageRed, description: '',
        damage: 0, debuffs: false, branch: null, next: null,
        wallMath: { projectedDamage: 0, netDamage: 0, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0 },
    },
    stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
};
const PLAYER: CombatPlayerPaneVM = { name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [] };

const toll = (owed: number, block: string | null = null): CombatTollVM => ({
    owed, cost: owed, label: TOLL_COPY.label(owed), block,
    shortfall: block ? { cost: owed, vitae: owed } : null,
    a11y: TOLL_COPY.a11y(owed, owed, block),
});

function renderPane(enemy: CombatEnemyPaneVM, onPayToll?: () => void) {
    const { tree } = withAllProviders(<CombatCombatantPane enemy={enemy} player={PLAYER} onPayToll={onPayToll} />);
    return render(tree);
}

describe('Pay the toll (n)', () => {
    it('shows the TOLL owed and pays on a tap', () => {
        const pay = jest.fn();
        renderPane({ ...ENEMY, toll: toll(3) }, pay);
        expect(screen.getByText('Pay the toll (3)')).toBeTruthy();
        expect(screen.queryByTestId('combat-pay-toll-reason')).toBeNull();
        fireEvent.press(screen.getByTestId('combat-pay-toll'));
        expect(pay).toHaveBeenCalledTimes(1);
    });

    it('a refused toll prints its reason under the button and still hands the tap to the engine', () => {
        const pay = jest.fn();
        renderPane({ ...ENEMY, toll: toll(4, 'that SACRIFICE would leave you below 1 VITAE') }, pay);
        expect(screen.getByTestId('combat-pay-toll-reason').props.children).toMatch(/below 1 VITAE/);
        expect(screen.getByTestId('combat-pay-toll').props.accessibilityLabel).toMatch(/Refused/);
        fireEvent.press(screen.getByTestId('combat-pay-toll'));
        expect(pay).toHaveBeenCalledTimes(1);
    });

    it('is hidden with no toll owed, on any other foe, or without the action wired', () => {
        renderPane({ ...ENEMY, toll: toll(0) }, jest.fn());
        expect(screen.queryByTestId('combat-pay-toll')).toBeNull();
        renderPane(ENEMY, jest.fn());
        expect(screen.queryByTestId('combat-pay-toll')).toBeNull();
        renderPane({ ...ENEMY, toll: toll(2) });
        expect(screen.queryByTestId('combat-pay-toll')).toBeNull();
    });
});
