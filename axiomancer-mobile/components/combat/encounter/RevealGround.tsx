/**
 * The coloured ground a foe stands on at the reveal (FR1a): a vertical SVG
 * gradient, transparent at both ends, so no hard line shows at its top or
 * foot. The colour is the tier's, from `theme/reveal-ground.ts`. Takes no touches.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { REVEAL_GROUND, type RevealGroundTier } from '@/theme/reveal-ground';

/** Opacity stops, top to foot: 0 at both ends. */
export const GROUND_STOPS: readonly (readonly [number, number])[] = [
    [0, 0], [0.3, 0.55], [0.7, 0.55], [1, 0],
];

export const RevealGround = React.memo(function RevealGround({ tier }: { tier: RevealGroundTier }) {
    const color = REVEAL_GROUND[tier];
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={`combat-reveal-ground-${tier}`}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
                <Defs>
                    <LinearGradient id="axmRevealGround" x1="0" y1="0" x2="0" y2="1">
                        {GROUND_STOPS.map(([o, a]) => (
                            <Stop key={o} offset={o} stopColor={color} stopOpacity={a} />
                        ))}
                    </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={100} height={100} fill="url(#axmRevealGround)" />
            </Svg>
        </View>
    );
});
