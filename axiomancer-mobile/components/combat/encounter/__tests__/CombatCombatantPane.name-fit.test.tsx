/**
 * The foe's name never runs under the VITAE shield.
 *
 * The widths are from a rendered web export (UncialAntiqua at 18 points, 0.6
 * letter spacing): "The Death Beholder" measured 213.6, "Smokehouse Gutter" 214.7
 * (the longest of the library), "The Tithe-Collector" 212.9. The name row measured
 * 366 at 390 wide, so the room left of the shield is 144; the export drew these at
 * 11.5 points with the right edge short of the shield. The shield and the bar sit
 * where they sat, so the row keeps its height as the name shrinks.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CombatCombatantPane } from '@/components/combat/encounter/CombatCombatantPane';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

function foe(name: string): CombatEnemyPaneVM {
    return {
        name, artKey: 'death-beholder', isBoss: true, artNonce: 3,
        hp: 300, maxHp: 320, hpPct: 0.94, effects: [],
        intent: {
            type: 'attack', icon: 'blade', label: 'stares', damage: 9, branch: null, next: null,
            wallMath: { projectedDamage: 9, netDamage: 9, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

const PLAYER: CombatPlayerPaneVM = { name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [] };

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 23 } } });

function drawName(name: string, natural: number, row: number) {
    const { tree } = withAllProviders(<CombatCombatantPane enemy={foe(name)} player={PLAYER} region="the Lantern Deep" />);
    render(tree);
    act(() => {
        fireEvent(screen.getByTestId('combat-enemy-name-probe', { includeHiddenElements: true }), 'layout', layout(natural));
        fireEvent(screen.getByTestId('combat-enemy-name'), 'layout', layout(row));
    });
    const drawn = screen.getByTestId('combat-enemy-name');
    return { text: drawn.props.children, flat: StyleSheet.flatten(drawn.props.style), lines: drawn.props.numberOfLines };
}

describe('the foe name beside the VITAE shield', () => {
    it.each([
        ['The Death Beholder', 213.6, 11.5],
        ['The Tithe-Collector', 212.9, 11.5],
        ['Smokehouse Gutter', 214.7, 11.5],
    ])('draws %s whole on one line at %d wide, stepped down to %d', (name, natural, size) => {
        const { text, flat, lines } = drawName(name, natural, 366);
        expect(text).toBe(name);
        expect(lines).toBe(1);
        expect(flat.fontSize).toBe(size);
    });

    it('leaves a short name at its full size', () => {
        expect(drawName('Float-Eye', 107.9, 366).flat.fontSize).toBe(18);
    });

    it('keeps the name row one height at every size, so the bar does not move', () => {
        const big = drawName('Float-Eye', 107.9, 366).flat;
        const small = drawName('The Death Beholder', 213.6, 366).flat;
        expect(small.lineHeight).toBe(big.lineHeight);
        expect(big.lineHeight).toBeGreaterThan(0);
    });
});
