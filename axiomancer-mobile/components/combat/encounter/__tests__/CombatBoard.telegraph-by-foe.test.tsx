/**
 * CombatBoard — where the telegraph sits (phase EN2b, A7).
 *
 * A `phases` foe's five-kind icon rides against the foe's portrait, not in the
 * chip column under its name; a foe without `phases` keeps its badge there.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import {
    INTENT_ICONS, buildCombatViewModel, type CombatViewModel,
} from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const PHONE = { width: 375, height: 812, scale: 3, fontScale: 1 };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const realUseWindowDimensions = RN.useWindowDimensions;
beforeAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: () => PHONE });
});
afterAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: realUseWindowDimensions });
});

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

function renderBoard(shape: (vm: CombatViewModel) => CombatViewModel): void {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: ['grey-strike', 'grey-ward'] }, seed: 16 });
    const vm = shape(buildCombatViewModel(rollEncounterDice(combat).state));
    const { tree } = withAllProviders(
        <CombatBoard
            vm={vm} drag={noopDrag()} stagedUids={[]}
            onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
            onSignature={jest.fn()} onEndPhase={jest.fn()} onInspect={jest.fn()}
        />,
        { store },
    );
    render(tree);
}

describe('EN2b: the telegraph sits by the foe', () => {
    it('puts a phases foe\'s icon in the by-foe layer, not the chip column', () => {
        const meta = INTENT_ICONS.danger;
        renderBoard((vm) => ({
            ...vm,
            enemy: {
                ...vm.enemy,
                intent: { ...vm.enemy.intent, type: 'danger', icon: meta.icon, label: meta.label, color: meta.color, damage: 0, moveName: null },
            },
        }));
        expect(within(screen.getByTestId('combat-telegraph-by-foe')).getByTestId('combat-intent')).toBeTruthy();
        expect(within(screen.getByTestId('combat-hud-intent')).queryByTestId('combat-intent')).toBeNull();
    });

    it('keeps a legacy foe\'s badge in the chip column', () => {
        renderBoard((vm) => ({
            ...vm,
            enemy: { ...vm.enemy, intent: { ...vm.enemy.intent, type: 'damage', icon: '⚔', label: 'ATTACKS' } },
        }));
        expect(screen.queryByTestId('combat-telegraph-by-foe')).toBeNull();
        expect(within(screen.getByTestId('combat-hud-intent')).getByTestId('combat-intent')).toBeTruthy();
    });
});
