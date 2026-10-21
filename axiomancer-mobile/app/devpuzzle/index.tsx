/**
 * Dev-only HAZARD PUZZLES board, full-screen like `/hazard`: the three demo
 * puzzles and the labelled candidates grouped easy, medium and hard, the
 * live route select, the live hazard board under its clock and the outcome.
 * Gated to dev-tools builds (dev and preview); production renders nothing.
 *
 * Route: /devpuzzle. Optional `?id=<demo id>` opens a demo, `&route=safe|risk`
 * starts it, `&confirm=1` confirms at once (the smoke shot of the outcome
 * panel), and `&paused=1` holds the clock (the smoke shot of the board).
 * `?id=<candidate id>` starts that candidate on its nominated route.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HazardPuzzleDemo } from '@/components/hazard/puzzle/HazardPuzzleDemo';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams } from '@/lib/platform/router';
import { HUE } from '@/theme/axm';

function routeParam(value: string | undefined): 'safe' | 'risk' | undefined {
    return value === 'safe' || value === 'risk' ? value : undefined;
}

export default function DevHazardPuzzles() {
    const params = useLocalSearchParams<{ id?: string; route?: string; confirm?: string; paused?: string }>();
    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devpuzzle-disabled" />;
    }
    return (
        <View style={styles.root} testID="devpuzzle-screen">
            <HazardPuzzleDemo
                initialId={params.id}
                initialRoute={routeParam(params.route)}
                autoConfirm={params.confirm === '1'}
                clockPaused={params.paused === '1'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
});
