/**
 * Where the map ink is drawn (phase CX1b): once, in the root layout beside
 * `<ToastHost>`, so a spread covers the whole window, the tab bar included,
 * and stays black while `<CombatGate>` pushes the fight route behind it.
 * The fight screen lifts it (`clearMapInk`) once its own covered curtain is
 * up. With no spread running it renders nothing.
 */

import React, { useCallback, useLayoutEffect } from 'react';
import { useWindowDimensions } from 'react-native';

import { MapInk } from './MapInk';
import { markMapInkCovered, registerMapInkHost, useMapInk } from '@/state/map-ink';

export function MapInkHost() {
    const run = useMapInk();
    useLayoutEffect(() => registerMapInkHost(), []);
    const { width, height } = useWindowDimensions();
    const id = run?.id;
    const onCovered = useCallback(() => {
        if (id !== undefined) markMapInkCovered(id);
    }, [id]);
    if (run === null) return null;
    // The spread is only started in animate mode (the exploration screen
    // resolves at once otherwise), so the host always animates it.
    return <MapInk key={run.id} origin={run.origin} width={width} height={height} instant={false} onCovered={onCovered} />;
}
