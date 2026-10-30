/**
 * The lighthouse path's state chips on the pane (phase EN1k, A16, A17): the
 * Lamplighter's LIT or DARK and the Wrecker's BAIT are states, not counts, so
 * their chips print no badge number; a counted chip still prints its own.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { EffectChips } from '@/components/combat/encounter/CombatCombatantPane';
import type { CombatEffectChipVM } from '@/state/presenters/combat-encounter.engine';
import { GLYPH_COLORS } from '@/components/combat/statusGlyphs';
import { withAllProviders } from '@/test-utils/withAllProviders';

const DARK: CombatEffectChipVM = {
    effectId: 'enemy-counter-lamp', intensity: 1, duration: 0, noBadge: true,
    glyph: { glyph: '◐', color: GLYPH_COLORS.control, kind: 'control', label: 'Dark' },
    gloss: 'The lamp.', caption: 'Its intents read UNKNOWN',
};
const VERSE: CombatEffectChipVM = {
    effectId: 'enemy-counter-verse', intensity: 3, duration: 0,
    glyph: { glyph: '♫', color: GLYPH_COLORS.dot, kind: 'control', label: 'Verse' },
    gloss: 'Verses.',
};

describe('a state chip prints no badge number', () => {
    it('the lamp shows its glyph and caption, and no number', () => {
        render(withAllProviders(<EffectChips effects={[DARK, VERSE]} />).tree);
        const dark = screen.getByTestId('combat-effect-enemy-counter-lamp');
        expect(within(dark).getByText('◐')).toBeTruthy();
        expect(within(dark).queryByText('1')).toBeNull();
        expect(dark.props.accessibilityLabel).not.toMatch(/intensity/);
        expect(screen.getByText('Its intents read UNKNOWN')).toBeTruthy();
        // A counted chip beside it keeps its badge.
        expect(within(screen.getByTestId('combat-effect-enemy-counter-verse')).getByText('3')).toBeTruthy();
    });
});
