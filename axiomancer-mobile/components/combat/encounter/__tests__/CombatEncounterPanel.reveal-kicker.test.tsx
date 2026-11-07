/**
 * The pre-combat reveal has no kicker line (UX1d, spec 153). T's S-01 note:
 * remove "A FOE RISES". The line above the foe ("A FOE BARS THE WAY" and its
 * elite and boss forms) is gone; the portrait, the foe's name, its VITAE and
 * the threat section stay, since this is T's reference screen.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { buildRevealFrame } from '@/state/presenters/encounter-reveal.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];

function mount() {
    const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
    });
    const bootstrapPlayer = store.getState().player;
    const { tree } = withAllProviders(
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={() => undefined} />,
        { store },
    );
    render(tree);
    return { enemy };
}

describe('UX1d — the reveal carries no kicker line', () => {
    it('shows the foe with no line above it', () => {
        const { enemy } = mount();
        expect(screen.getByTestId('combat-reveal')).toBeTruthy();
        expect(screen.queryByTestId('combat-reveal-eyebrow')).toBeNull();
        expect(screen.queryByText(/A FOE|BARS THE WAY|HOLDS THE WAY|THE WAY ENDS HERE/)).toBeNull();
        // What stays: the foe's name, both VITAE figures and the threat
        // section (DANGER on a foe already met, THREAT SEQUENCE otherwise).
        expect(screen.getAllByText(enemy.name).length).toBeGreaterThan(0);
        expect(screen.getByTestId('combat-reveal-player-vitae')).toBeTruthy();
        expect(screen.getAllByText(/^(THREAT SEQUENCE|DANGER)$/).length).toBe(1);
    });

    it('the reveal frame no longer carries a kicker for any tier', () => {
        expect(Object.keys(buildRevealFrame(undefined))).not.toContain('eyebrow');
    });
});
