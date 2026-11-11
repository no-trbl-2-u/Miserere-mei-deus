/**
 * The fight reveal (FR1a): name, LEVEL and VITAE, the figure on its ground,
 * ENTER COMBAT and WITHDRAW with its cost. No kicker, place, FIGHT chip,
 * YOURS line, DANGER or THREAT SEQUENCE.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { WITHDRAW_COST } from '@/components/combat/encounter/reveal.copy';
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
        <CombatEncounterPanel enemy={enemy} bootstrapPlayer={bootstrapPlayer} deck={CARDS} seed={7} onExit={() => undefined} onWithdraw={() => undefined} />,
        { store },
    );
    render(tree);
    return { enemy };
}

describe('FR1a: the fight reveal', () => {
    it('shows the foe whole and nothing of the old column', () => {
        const { enemy } = mount();
        expect(screen.getByTestId('combat-reveal')).toBeTruthy();
        expect(screen.getAllByText(enemy.name).length).toBeGreaterThan(0);
        expect(screen.getByTestId('combat-reveal-stats')).toBeTruthy();
        expect(screen.getByText(/VITAE/)).toBeTruthy();
        expect(screen.getByTestId('combat-reveal-ground-fight')).toBeTruthy();
        expect(screen.queryByTestId('combat-reveal-chip')).toBeNull();
        expect(screen.queryByTestId('combat-reveal-player-vitae')).toBeNull();
        expect(screen.queryByText(/YOURS|FIGHT|THREAT SEQUENCE|DANGER/)).toBeNull();
        expect(screen.queryByTestId('combat-reveal-held')).toBeNull();
        expect(screen.queryByTestId('combat-reveal-arrival')).toBeNull();
    });

    it('prints what withdrawing costs inside the WITHDRAW plate', () => {
        mount();
        expect(screen.getByTestId('combat-withdraw')).toBeTruthy();
        expect(screen.getByText(WITHDRAW_COST)).toBeTruthy();
    });

    it('the reveal frame no longer carries a kicker for any tier', () => {
        expect(Object.keys(buildRevealFrame(undefined))).not.toContain('eyebrow');
    });
});
