/**
 * The map ink (phase CX1b, A6): a blot of ink that bleeds out of a node's
 * token until it covers the window, walking into a fight.
 *
 * Presentational. The motion answer comes from the caller (`instant`), as
 * the ink curtain and the enemy frame engine take it: this component never
 * asks the platform about reduced motion. In `instant` mode it draws
 * nothing and reports covered on mount. In `animate` mode a disc centred on
 * `origin` grows from the token's size to the radius that reaches the
 * farthest window corner, with a softer rim running just ahead of it, and
 * reports covered once, when it is whole. Once covered it stays up, black,
 * until its owner unmounts it.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HUE } from '@/theme/axm';
import type { InkPoint } from '@/state/map-ink';

/** The spread, token to full window: under a second (A6). */
export const MAP_INK_SPREAD_MS = 650;

/** The blot's radius at the start: about a token's half-width. */
export const MAP_INK_START_RADIUS = 14;

/** The soft rim runs this far ahead of the blot's edge, as a share of the radius. */
export const MAP_INK_RIM = 0.12;

/** The radius from `origin` that reaches every corner of a `w`×`h` window. */
export function inkCoverRadius(origin: InkPoint, w: number, h: number): number {
    const dx = Math.max(origin.x, w - origin.x);
    const dy = Math.max(origin.y, h - origin.y);
    return Math.ceil(Math.hypot(dx, dy)) + 2;
}

/** The blot's scale at spread progress `p` (0..1), from the token's size to the whole cover. */
export function inkScaleAt(p: number, coverRadius: number): number {
    'worklet';
    const start = Math.min(1, MAP_INK_START_RADIUS / Math.max(1, coverRadius));
    const t = Math.min(1, Math.max(0, p));
    return start + (1 - start) * t;
}

export interface MapInkProps {
    /** The token's window point the ink bleeds out of. */
    origin: InkPoint;
    /** The window's size. */
    width: number;
    height: number;
    /** True lands the end state at once: nothing drawn, covered reported (reduced motion, e2e escape hatch). */
    instant: boolean;
    /** Fires once, when the ink covers the window. */
    onCovered: () => void;
}

export function MapInk({ origin, width, height, instant, onCovered }: MapInkProps) {
    const radius = inkCoverRadius(origin, width, height);
    const progress = useSharedValue(instant ? 1 : 0);

    useEffect(() => {
        if (instant) { onCovered(); return; }
        progress.value = withTiming(1, { duration: MAP_INK_SPREAD_MS, easing: Easing.in(Easing.quad) }, (done) => {
            if (done) runOnJS(onCovered)();
        });
        // One spread per mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const blot = useAnimatedStyle(() => ({ transform: [{ scale: inkScaleAt(progress.value, radius) }] })); // worklet-safe: inkScaleAt is a worklet
    const rim = useAnimatedStyle(() => ({
        transform: [{ scale: Math.min(1, inkScaleAt(progress.value, radius) * (1 + MAP_INK_RIM)) }], // worklet-safe: inkScaleAt is a worklet
    }));

    if (instant) return null;
    const disc = { left: origin.x - radius, top: origin.y - radius, width: radius * 2, height: radius * 2, borderRadius: radius };
    return (
        // Takes every touch while it spreads: nothing on the map is pressed through the ink.
        <View style={styles.fill} testID="map-ink" accessibilityLabel="entering the fight">
            <Animated.View style={[styles.disc, disc, styles.rim, rim]} pointerEvents="none" testID="map-ink-rim" />
            <Animated.View style={[styles.disc, disc, blot]} pointerEvents="none" testID="map-ink-blot" />
        </View>
    );
}

const styles = StyleSheet.create({
    // Above the toast host (100): nothing on the map shows through.
    fill: { ...StyleSheet.absoluteFillObject, zIndex: 200, elevation: 200, overflow: 'hidden' },
    disc: { position: 'absolute', backgroundColor: HUE.inkBg },
    rim: { opacity: 0.45 },
});
