/**
 * CombatBoard — a staged card with a die in its socket is ONE button.
 *
 * The die drawn in the socket is not its own a11y element: a role="button"
 * inside the staged card's role="button" renders a nested `<button>` on web
 * (a hydration error) and is collapsed into the parent on native anyway. So
 * the staged card's label names the die for it.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, type DragController } from '@/components/combat/encounter/CombatBoard';
import { combatDieA11yLabel } from '@/components/combat/encounter/CombatDie';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { tapCombatDie } from '@/test-utils/tapCombatDie';

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

describe('CombatBoard — the staged card speaks for its socketed die', () => {
    it('labels the die on the staged card and leaves the socket copy unlabelled', async () => {
        const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: ['grey-strike', 'grey-ward', 'grey-word'], baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 }, seed: 16 });
        let s = combat;
        s = rollEncounterDice(s).state;
        const first = s.dice.findIndex(d => d.state === 'available' && !d.floating && d.face !== 'miss');
        expect(first).toBeGreaterThanOrEqual(0);
        const dice = s.dice.map((d, i) => (i === first ? { ...d, color: 'body' as const, face: 'mana' as const } : d));
        const vm = buildCombatViewModel({ ...s, dice });
        const card = vm.hand.find(c => c.cardId === 'grey-strike')!;
        const dieVm = vm.dice.find(d => d.id === dice[first].id)!;

        const { tree } = withAllProviders(
            <CombatBoard
                vm={vm} drag={noopDrag()} stagedUids={[card.uid]}
                onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
                onSignature={jest.fn()} onEndPhase={jest.fn()} onInspect={jest.fn()}
            />,
            { store },
        );
        render(tree);
        await tapCombatDie(dieVm.id);

        const staged = screen.getByTestId(`combat-staged-${card.uid}`);
        expect(staged.props.accessibilityRole).toBe('button');
        expect(staged.props.accessibilityLabel).toContain(combatDieA11yLabel(dieVm, { assigned: true }));
        const face = screen.getByTestId('combat-staged-die-face');
        expect(face.props.accessibilityRole).toBeUndefined();
        expect(face.props.accessibilityLabel).toBeUndefined();
    });
});
