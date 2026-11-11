/**
 * The reveal ground fades out at both ends (no hard line) and takes its colour
 * from the one tier-keyed table.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { GROUND_STOPS, RevealGround } from '@/components/combat/encounter/RevealGround';
import { REVEAL_GROUND } from '@/theme/reveal-ground';

describe('RevealGround', () => {
    it('is transparent at its top and its foot', () => {
        const first = GROUND_STOPS[0]!;
        const last = GROUND_STOPS[GROUND_STOPS.length - 1]!;
        expect([first[0], first[1]]).toEqual([0, 0]);
        expect([last[0], last[1]]).toEqual([1, 0]);
        for (let i = 1; i < GROUND_STOPS.length; i++) {
            expect(GROUND_STOPS[i]![0]).toBeGreaterThan(GROUND_STOPS[i - 1]![0]);
        }
    });

    it('keys its colour by tier, warm for the boss', () => {
        expect(REVEAL_GROUND.boss).not.toBe(REVEAL_GROUND.fight);
        expect(REVEAL_GROUND.elite).toBe(REVEAL_GROUND.fight);
    });

    it('mounts one ground per tier', () => {
        render(<RevealGround tier="boss" />);
        expect(screen.getByTestId('combat-reveal-ground-boss')).toBeTruthy();
    });
});
