/**
 * The fog over the arena plate's foot: a soft dark gradient that fades from the
 * hand's background (opaque at the plate's bottom edge) up into the plate
 * (clear at its top), so no hard horizontal line shows where the plate ends.
 *
 * The scene band is `SCENE_BAND_PCT` of the board and the foe's box ends
 * `FIGURE_BOTTOM_PCT` of the band above the band's foot, so the fog's top is
 * the foe box's bottom edge and the fog never reaches the foe: its lowest drawn
 * pixel is that edge on every staged foe (the figure is bottom-aligned in the
 * box). All three numbers are shared with the combatant pane, which lays the
 * band and the foe out from the same constants.
 *
 * Inputs: none. Output: an absolutely placed gradient that takes no touches.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { usePalette } from '@/theme/runtime';

/** The arena plate's share of the board's height (percent). */
export const SCENE_BAND_PCT = 62;
/** The gap under the foe's box, as a share of the band's height (percent). */
export const FIGURE_BOTTOM_PCT = 9;

/** Where the foe's box ends, as a percent of the board's height. */
export const FOE_BOX_BOTTOM_PCT = SCENE_BAND_PCT * (1 - FIGURE_BOTTOM_PCT / 100);
/** The fog's top, as a percent of the board's height: the foe box's bottom. */
export const FOG_TOP_PCT = FOE_BOX_BOTTOM_PCT;
/** The fog's height, as a percent of the board's height: down to the plate's foot. */
export const FOG_HEIGHT_PCT = SCENE_BAND_PCT - FOG_TOP_PCT;

export const SeamFog = React.memo(function SeamFog() {
    const AXM = usePalette();
    return (
        <View
            pointerEvents="none"
            style={[styles.fog, { top: `${FOG_TOP_PCT}%`, height: `${FOG_HEIGHT_PCT}%` }]}
            testID="combat-seam-fog"
        >
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
                <Defs>
                    <LinearGradient id="axmSeamFog" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={AXM.bg} stopOpacity={0} />
                        <Stop offset="0.55" stopColor={AXM.bg} stopOpacity={0.55} />
                        <Stop offset="1" stopColor={AXM.bg} stopOpacity={1} />
                    </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={100} height={100} fill="url(#axmSeamFog)" />
            </Svg>
        </View>
    );
});

const styles = StyleSheet.create({
    fog: { position: 'absolute', left: 0, right: 0 },
});
