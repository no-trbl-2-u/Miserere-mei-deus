/**
 * IntentIcon — wall-math readout.
 *
 * `intent.damage` is the raw face value; the pill prints
 * `intent.wallMath.projectedDamage` (the scaled hit), and the → badge the live
 * net against guard/barrier/denial. This pins the DENIED /
 * net-damage badges and the a11y label stating the REAL outcome, not the raw one.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { IntentIcon } from '@/components/combat/encounter/IntentIcon';
import { INTENT_ICONS, type CombatIntentVM } from '@/state/presenters/combat-encounter.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

const baseIntent: CombatIntentVM = {
    type: 'damage', icon: '⚔', label: 'ATTACKS', color: '#e2543b',
    description: 'A telegraphed strike.', damage: 10, debuffs: false, branch: null, next: null,
    wallMath: {
        projectedDamage: 10, netDamage: 10, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0,
    },
};

describe('IntentIcon — wall-math readout', () => {
    it('shows no wall-math badge when net damage matches the raw stake', () => {
        const { tree } = withAllProviders(<IntentIcon intent={baseIntent} />);
        render(tree);
        expect(screen.queryByTestId('combat-intent-wallmath')).toBeNull();
    });

    it('shows the net damage when it diverges from the raw stake (guard absorbed some)', () => {
        const intent: CombatIntentVM = { ...baseIntent, wallMath: { ...baseIntent.wallMath, netDamage: 4 } };
        const { tree } = withAllProviders(<IntentIcon intent={intent} />);
        render(tree);
        expect(screen.getByTestId('combat-intent-wallmath').props.children).toEqual(['→', 4]);
    });

    it('prints the scaled hit on the pill, not the authored face value', () => {
        // Face 13, scaled to 26 by the threat scale and escalation; no guard.
        const intent: CombatIntentVM = {
            ...baseIntent,
            damage: 13,
            wallMath: { ...baseIntent.wallMath, projectedDamage: 26, netDamage: 26 },
        };
        const { tree } = withAllProviders(<IntentIcon intent={intent} />);
        render(tree);
        expect(screen.getByText('−26')).toBeTruthy();
        expect(screen.queryByText('−13')).toBeNull();
        expect(screen.queryByTestId('combat-intent-wallmath')).toBeNull();
        expect(screen.getByTestId('combat-intent').props.accessibilityLabel).toMatch(/Deals 26 damage\./);
    });

    it('shows DENIED and states the real outcome in a11y when the turn will be denied', () => {
        const intent: CombatIntentVM = {
            ...baseIntent,
            wallMath: {
                projectedDamage: 0, netDamage: 0, willDeny: true, guard: 0, barrier: 0, blizzardCut: 0,
            },
        };
        const { tree } = withAllProviders(<IntentIcon intent={intent} />);
        render(tree);
        expect(screen.getByTestId('combat-intent-wallmath').props.children).toBe('DENIED');
        const node = screen.getByTestId('combat-intent');
        expect(node.props.accessibilityLabel).toMatch(/DENIED — no damage lands/);
    });
});

/**
 * The enemy intent pill prints the damage it will deal with a minus, never a
 * heart: the board uses '♥ 160' on the player rail for the player's own
 * VITAE, so a heart on the pill would mean the player's health in one corner
 * and the foe's outgoing damage in the other.
 */
describe('FE-020: the intent pill does not wear a heart', () => {
    it('prints incoming damage with a minus, not a heart', () => {
        const { tree } = withAllProviders(<IntentIcon intent={baseIntent} />);
        render(tree);
        expect(screen.getByText('−10')).toBeTruthy();
        expect(screen.queryByText('♥10')).toBeNull();
    });

    it('still states the damage plainly for a screen reader', () => {
        const { tree } = withAllProviders(<IntentIcon intent={baseIntent} />);
        render(tree);
        expect(screen.getByTestId('combat-intent').props.accessibilityLabel).toMatch(/Deals 10 damage/);
    });
});

/** Phase BC1, A4 and A5: the BLIZZARD line, and one damage number in a11y. */
describe('IntentIcon: after BLIZZARD, and one number', () => {
    // The swarm's case: BLIZZARD 5 over a 16 hit, so the pill reads 11.
    const blizzard: CombatIntentVM = {
        ...baseIntent,
        description: 'It lunges at you (12 damage).',
        damage: 12,
        wallMath: { ...baseIntent.wallMath, projectedDamage: 11, netDamage: 11, blizzardCut: 5 },
    };

    it('shows "after BLIZZARD −5" under the pill while BLIZZARD cuts the hit', () => {
        const { tree } = withAllProviders(<IntentIcon intent={blizzard} />);
        render(tree);
        expect(screen.getByText('−11')).toBeTruthy();
        expect(screen.getByTestId('combat-intent-blizzard').props.children).toBe('after BLIZZARD −5');
        expect(screen.getByTestId('combat-intent').props.accessibilityLabel).toMatch(/After BLIZZARD −5\./);
    });

    it('renders as before with no BLIZZARD', () => {
        const { tree } = withAllProviders(<IntentIcon intent={baseIntent} />);
        render(tree);
        expect(screen.queryByTestId('combat-intent-blizzard')).toBeNull();
        expect(screen.getByTestId('combat-intent').props.accessibilityLabel).not.toMatch(/BLIZZARD/);
    });

    it('hides the BLIZZARD line on a DENIED turn', () => {
        const denied: CombatIntentVM = {
            ...blizzard, wallMath: { ...blizzard.wallMath, willDeny: true, projectedDamage: 0, netDamage: 0 },
        };
        const { tree } = withAllProviders(<IntentIcon intent={denied} />);
        render(tree);
        expect(screen.queryByTestId('combat-intent-blizzard')).toBeNull();
    });

    it('says one damage number: the payload parenthetical is gone', () => {
        const { tree } = withAllProviders(<IntentIcon intent={blizzard} />);
        render(tree);
        const a11y: string = screen.getByTestId('combat-intent').props.accessibilityLabel;
        expect(a11y).toMatch(/^Enemy intent: ATTACKS\. It lunges at you\. Deals 11 damage\./);
        expect(a11y).not.toMatch(/\(12 damage\)/);
        expect(a11y.match(/\d+ damage/g)).toEqual(['11 damage']);
    });
});

/** Phase EN1c: a `phases` foe's five kinds draw with a name and no number. */
describe('IntentIcon: the five telegraph kinds', () => {
    const kinds = ['attack', 'defend', 'status', 'danger', 'unknown'] as const;
    const zeroWall = { projectedDamage: 0, netDamage: 0, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0 };

    for (const kind of kinds) {
        it(`draws ${kind} with its icon, its name and no number`, () => {
            const meta = INTENT_ICONS[kind];
            const intent: CombatIntentVM = {
                ...baseIntent, type: kind, icon: meta.icon, label: meta.label, color: meta.color,
                damage: 0, description: 'Move', moveName: 'Move', wallMath: zeroWall,
            };
            const { tree } = withAllProviders(<IntentIcon intent={intent} />);
            render(tree);
            expect(screen.getByText(meta.icon)).toBeTruthy();
            expect(screen.getByTestId('combat-intent-name').props.children).toBe('Move');
            expect(screen.queryByText(/\d/)).toBeNull();
            expect(screen.queryByTestId('combat-intent-wallmath')).toBeNull();
            expect(screen.getByTestId('combat-intent').props.accessibilityLabel).toBe(`Enemy intent: ${meta.label}. Move.`);
        });
    }

    it('draws an unnamed DANGER as the icon alone', () => {
        const meta = INTENT_ICONS.danger;
        const intent: CombatIntentVM = {
            ...baseIntent, type: 'danger', icon: meta.icon, label: meta.label, color: meta.color,
            damage: 0, description: '', moveName: null, wallMath: zeroWall,
        };
        const { tree } = withAllProviders(<IntentIcon intent={intent} />);
        render(tree);
        expect(screen.queryByTestId('combat-intent-name')).toBeNull();
        expect(screen.getByTestId('combat-intent').props.accessibilityLabel).toBe('Enemy intent: DANGER.');
    });
});
