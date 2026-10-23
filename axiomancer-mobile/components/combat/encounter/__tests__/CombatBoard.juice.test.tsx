/**
 * Combat juice adoption witness. Proves the card play/refusal
 * site (`StagedCard`'s drop-confirm pop + rejection shake) actually fires
 * through the lib/juice primitives.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { Gesture } from 'react-native-gesture-handler';

import { rollEncounterDice, type CombatEncounterState } from '@mechanics';
import { StagedCard } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import * as Juice from '@/lib/juice';

jest.mock('@/lib/juice', () => {
    const actual = jest.requireActual('@/lib/juice') as typeof Juice;
    return {
        ...actual,
        useJuicePulse: jest.fn(actual.useJuicePulse),
        useJuiceShake: jest.fn(actual.useJuiceShake),
    };
});

// A four-card hand off the grey office (the whole card library).
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];

function freshCard() {
    const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 }, seed: 16 });
    let s: CombatEncounterState = combat;
    s = rollEncounterDice(s).state;
    const vm = buildCombatViewModel(s);
    return vm.hand[0];
}

describe('StagedCard — combat adoption of lib/juice primitives', () => {
    it('a rising rejectKey fires the shake primitive', () => {
        const card = freshCard();
        const { rerender } = render(
            <StagedCard card={card} assignedDie={null} onApply={jest.fn()} gesture={Gesture.Exclusive(Gesture.Tap())} register={jest.fn()} rejectKey={0} />,
        );
        rerender(
            <StagedCard card={card} assignedDie={null} onApply={jest.fn()} gesture={Gesture.Exclusive(Gesture.Tap())} register={jest.fn()} rejectKey={1} />,
        );
        const calls = (Juice.useJuiceShake as jest.Mock).mock.calls;
        expect(calls.some(([key, intensity]) => key === 1 && intensity === 'low')).toBe(true);
    });

    it('a rising popKey (drop confirm) fires the pulse primitive at a subtle intensity', () => {
        const card = freshCard();
        const { rerender } = render(
            <StagedCard card={card} assignedDie={null} onApply={jest.fn()} gesture={Gesture.Exclusive(Gesture.Tap())} register={jest.fn()} popKey={0} />,
        );
        rerender(
            <StagedCard card={card} assignedDie={null} onApply={jest.fn()} gesture={Gesture.Exclusive(Gesture.Tap())} register={jest.fn()} popKey={1} />,
        );
        const calls = (Juice.useJuicePulse as jest.Mock).mock.calls;
        expect(calls.some(([key, intensity]) => key === 1 && intensity === 0.4)).toBe(true);
    });
});
