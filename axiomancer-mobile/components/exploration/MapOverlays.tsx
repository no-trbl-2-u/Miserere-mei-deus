/**
 * Viewport-fixed chart furniture for `<MapCanvas>` — the gesture line.
 *
 * Renders inside the map's viewport (never inside the pannable canvas), so
 * every position here resolves against the visible chart rather than the
 * 936x1040 spread.
 *
 * The LEGEND strip (trodden / open / sealed, and the node counter) was cut on
 * 2026-11-02: T ruled the marks read for themselves, and the strip was the
 * only thing competing with the sheet at the chart's foot.
 *
 * State read: none. It is pure props; the presenter owns the gesture line's
 * words (`MAP_GESTURE_LINE`). Which line shows follows the pointer: a mouse
 * gets the wheel, a finger the pinch (`detectMapPointer`).
 * Mounted from: `app/(tabs)/exploration/index.tsx`, as `<MapCanvas overlays=…>`.
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { MAP_GESTURE_LINE } from '@/state/presenters/exploration.engine';
import type { MapPointer } from '@/state/presenters/exploration.engine';

interface MapOverlaysProps {
    /** Overrides the detected pointer (tests); defaults to `detectMapPointer()`. */
    pointer?: MapPointer;
}

/**
 * The pointer the chart is driven by. Native is always touch. On web, a fine
 * primary pointer (a mouse or trackpad) zooms with the wheel; a phone
 * browser's coarse pointer still pinches, so it keeps the touch line.
 */
export function detectMapPointer(): MapPointer {
    if (Platform.OS !== 'web') return 'touch';
    const mq = typeof window !== 'undefined' ? window.matchMedia : undefined;
    return mq?.('(pointer: fine)').matches ? 'mouse' : 'touch';
}

export function MapOverlays({ pointer }: MapOverlaysProps = {}) {
    const styles = useStyles();
    const gestureLine = MAP_GESTURE_LINE[pointer ?? detectMapPointer()];
    return (
        <>
            {/* Gesture line. Naming the gesture here keeps "the sheet
                moves" on screen for the whole run. */}
            <Text style={styles.gestures} testID="map-gesture-line">{gestureLine}</Text>

        </>
    );
}

/**
 * Theme-reactive stylesheet for the chart furniture.
 *
 * Input: the active palette `AXM`. Output: the gesture line / legend styles.
 */
const useStyles = makeStyles((AXM) => ({
    gestures: {
        position: 'absolute',
        top: 10,
        left: 10,
        fontFamily: FONTS.mono,
        fontSize: 9,
        color: AXM.bone,
        letterSpacing: 1,
        zIndex: 2,
    },
}));
