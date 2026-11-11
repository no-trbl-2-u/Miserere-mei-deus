/**
 * The coloured ground a foe stands on at the reveal: a vertical SVG
 * gradient, transparent at both ends, so no hard line shows at its top or
 * foot. The colour is the tier's, from `theme/reveal-ground.ts`. Two thin
 * side fades in the screen's black soften the left and right edges when the
 * ground is narrower than the window. Takes no touches.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { REVEAL_GROUND, type RevealGroundTier } from '@/theme/reveal-ground';
import { usePalette } from '@/theme/runtime';

/** Opacity stops, top to foot: 0 at both ends. */
export const GROUND_STOPS: readonly (readonly [number, number])[] = [
    [0, 0], [0.3, 0.55], [0.7, 0.55], [1, 0],
];

/** How far in from each side the black fade reaches, in view-box units of 100. */
export const SIDE_FADE = 8;

export const RevealGround = React.memo(function RevealGround({ tier }: { tier: RevealGroundTier }) {
    const color = REVEAL_GROUND[tier];
    const AXM = usePalette();
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`combat-reveal-ground-${tier}`}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
                <Defs>
                    <LinearGradient id="axmRevealGround" x1="0" y1="0" x2="0" y2="1">
                        {GROUND_STOPS.map(([o, a]) => (
                            <Stop key={o} offset={o} stopColor={color} stopOpacity={a} />
                        ))}
                    </LinearGradient>
                    <LinearGradient id="axmRevealGroundL" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset={0} stopColor={AXM.bg} stopOpacity={1} />
                        <Stop offset={1} stopColor={AXM.bg} stopOpacity={0} />
                    </LinearGradient>
                    <LinearGradient id="axmRevealGroundR" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset={0} stopColor={AXM.bg} stopOpacity={0} />
                        <Stop offset={1} stopColor={AXM.bg} stopOpacity={1} />
                    </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={100} height={100} fill="url(#axmRevealGround)" />
                <Rect x={0} y={0} width={SIDE_FADE} height={100} fill="url(#axmRevealGroundL)" />
                <Rect x={100 - SIDE_FADE} y={0} width={SIDE_FADE} height={100} fill="url(#axmRevealGroundR)" />
            </Svg>
        </View>
    );
});
