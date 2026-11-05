/**
 * 146.9 — the dock scrim shelves the dice + hand, but never rises over the foe
 * (T: "don't let it come up too high, I don't want it covering the enemy").
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import {
    CombatCombatantPane, DOCK_SCRIM_HEIGHT, DOCK_SCRIM_MAX_HEIGHT, SCENE_BAND_HEIGHT,
} from '@/components/combat/encounter/CombatCombatantPane';
import { CRANE_HOOK, PLAYER, enemyVM } from '@/test-utils/enemyTurnStreams';
import { withAllProviders } from '@/test-utils/withAllProviders';

const pct = (v: string) => Number(v.replace('%', ''));

describe('the dock scrim (146.9)', () => {
    it('is capped at the space under the scene band, so its top edge stays at or below the foe', () => {
        expect(pct(SCENE_BAND_HEIGHT) + pct(DOCK_SCRIM_MAX_HEIGHT)).toBeLessThanOrEqual(100);
    });

    it('draws anchored to the bottom, with that cap applied', () => {
        render(withAllProviders(
            <CombatCombatantPane enemy={enemyVM(CRANE_HOOK, 0)} player={PLAYER} fx={{ seq: 0, events: [] }} region="the Breakwater" />,
        ).tree);
        const style = StyleSheet.flatten(screen.getByTestId('combat-dock-scrim').props.style);
        expect(style).toMatchObject({ position: 'absolute', bottom: 0, height: DOCK_SCRIM_HEIGHT, maxHeight: DOCK_SCRIM_MAX_HEIGHT });
    });
});
