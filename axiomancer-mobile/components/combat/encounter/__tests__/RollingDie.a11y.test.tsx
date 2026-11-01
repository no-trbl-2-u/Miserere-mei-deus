/**
 * `RollingDie` (the flag-on Roll Ritual's tumbling die) must forward
 * `assigned`/`specialConviction` to the real `CombatDie`, not just
 * `die/size/dimmed`. Otherwise a screen reader hears "2 Conviction" (the stock
 * default) even on a die whose gear slot pays more, and never hears "assigned
 * to a staged card" for a socketed tray die mid-cast. `CombatDie.a11y.test.tsx`
 * proves the label itself is correct once given the right opts; this proves
 * `RollingDie` actually forwards them.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { RollingDie } from '@/components/combat/encounter/RollingDie';
import { combatDieA11yLabel } from '@/components/combat/encounter/CombatDie';
import type { CombatDieVM } from '@/state/presenters/combat-encounter.engine';
import type { DieRollPlan } from '@/state/combat/dice-roll-ritual';

const HEART: CombatDieVM = {
    id: 'd-heart', color: 'heart', colorHex: '#c23b3b', glyph: '♥', stanceLabel: 'HEART',
    spent: false, isX: false, draggable: true, face: 'special',
} as CombatDieVM;

// A settled (non-tumbling) plan — the ritual's resting state, same shape
// `resolveRollPlans` emits once a die's cast has already landed.
const SETTLED_PLAN: DieRollPlan = {
    id: HEART.id, settledFace: 'special', cracked: false, tumbles: false,
    startDelayMs: 0, tumbleDurationMs: 0, settledState: 'settled',
};

describe('RollingDie — forwards a11y opts to the real CombatDie', () => {
    it('speaks the worn weapon special on the BOON line', () => {
        render(<RollingDie die={HEART} mode="instant" plan={SETTLED_PLAN} specialText="Special: GUARD 6." />);
        expect(screen.getByTestId(`combat-die-${HEART.id}`).props.accessibilityLabel)
            .toBe(combatDieA11yLabel(HEART, { specialText: "Special: GUARD 6." }));
    });

    it('speaks "assigned" once the tray die is socketed on a staged card', () => {
        render(<RollingDie die={HEART} mode="instant" plan={SETTLED_PLAN} assigned />);
        const label = screen.getByTestId(`combat-die-${HEART.id}`).props.accessibilityLabel;
        expect(label).toContain('assigned to a staged card');
        expect(label).not.toContain('drag onto');
    });
});
