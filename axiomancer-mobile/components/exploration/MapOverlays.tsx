/**
 * The gesture line, in a strip directly under the map's frame (MC1c).
 *
 * It used to sit over the map's top-left corner and cover whatever was drawn
 * there; now it is a row of its own beneath the frame, so nothing but the
 * recentre button is drawn over the map.
 *
 * The LEGEND strip (trodden / open / sealed, and the node counter) was cut on
 * 2026-11-02: T ruled the marks read for themselves, and the strip was the
 * only thing competing with the sheet at the chart's foot.
 *
 * State read: none. It is pure props; the presenter owns the gesture line's
 * words (`MAP_GESTURE_LINE`). Which line shows follows the pointer: a mouse
 * gets the wheel, a finger the pinch (`detectMapPointer`).
 * Mounted from: `app/(tabs)/exploration/index.tsx`, under the map frame.
 */

import React from 'react';
import { Text, View, Platform } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { MAP_GESTURE_LINE } from '@/state/presenters/exploration.engine';
import type { MapPointer } from '@/state/presenters/exploration.engine';

/** The strip's height: one line of 9pt mono with a little air. */
export const GESTURE_STRIP_HEIGHT = 20;

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
        <View style={styles.strip} testID="map-gesture-strip">
            {/* Gesture line. Naming the gesture here keeps "the sheet
                moves" on screen for the whole run. */}
            <Text style={styles.gestures} testID="map-gesture-line">{gestureLine}</Text>
        </View>
    );
}

/**
 * Theme-reactive stylesheet for the chart furniture.
 *
 * Input: the active palette `AXM`. Output: the gesture line / legend styles.
 */
const useStyles = makeStyles((AXM) => ({
    strip: {
        height: GESTURE_STRIP_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    gestures: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        color: AXM.bone,
        letterSpacing: 1,
    },
}));
