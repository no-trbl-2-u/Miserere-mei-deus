/**
 * The ink curtain (phase ET1a; reshaped in CX1b, A7): the fight screen opens
 * inked, as the map's spread left it, then the ink draws back off the foe.
 *
 * The draw is a shape, not a fade: the ink keeps its full strength and its
 * top edge, a thin wet sheen under a feathered lip, recedes down the
 * screen, so the lit reveal
 * is uncovered from the top (the foe first) while the portrait rises out of
 * it. A near-black opacity fade on the near-black fight screen read as an
 * ordinary screen opening (CX1 § mechanisms).
 *
 * The motion gate takes its answer from the caller (`instant`), the way the
 * enemy frame engine does: the component never asks the platform about
 * reduced motion itself. In `instant` mode it lands its end state at once,
 * the ink gone, and fires `onDone` on mount; nothing is skipped.
 * A tap on the curtain skips the draw-back.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { HUE } from '@/theme/axm';

/**
 * Hold the full-ink beat, then draw it back. With the map's spread before it
 * (`MAP_INK_SPREAD_MS`) the walk from confirm to a settled reveal stays near
 * two seconds (ET1 decision 8).
 */
export const INK_HOLD_MS = 200;
export const INK_DRAW_MS = 900;

/** The feathered lip on the receding edge, in points. */
export const INK_LIP = 56;

/**
 * How far down the ink's top edge has receded at cover `c` (1 = whole
 * screen inked, 0 = gone) on a screen `height` tall: 0 while covered, past
 * the bottom (lip included) once gone. Exported for unit coverage.
 */
export function curtainEdgeY(cover: number, height: number): number {
    'worklet';
    const c = Math.min(1, Math.max(0, cover));
    return (1 - c) * (height + INK_LIP);
}

export interface InkCurtainProps {
    /** True lands the end state at once (reduced motion, e2e escape hatch). */
    instant: boolean;
    /** Fires once, when the ink is gone. */
    onDone: () => void;
}

export function InkCurtain({ instant, onDone }: InkCurtainProps) {
    const { height } = useWindowDimensions();
    const cover = useSharedValue(instant ? 0 : 1);
    const [gone, setGone] = React.useState(instant);
    const finish = React.useCallback(() => {
        setGone(true);
        onDone();
    }, [onDone]);

    useEffect(() => {
        if (instant) { onDone(); return; }
        cover.value = withDelay(INK_HOLD_MS, withTiming(0, { duration: INK_DRAW_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
            if (done) runOnJS(finish)();
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sheet = useAnimatedStyle(() => ({
        transform: [{ translateY: curtainEdgeY(cover.value, height) }],
    }));

    if (gone) return null;
    return (
        // zIndex 30: above the reveal (static) and the held boss card (20), so the
        // ink actually covers the foe instead of painting under later siblings.
        <Pressable style={[StyleSheet.absoluteFill, styles.clip]} onPress={finish} testID="ink-curtain" accessibilityLabel="skip transition">
            <Animated.View style={[styles.sheet, sheet]} pointerEvents="none" testID="ink-curtain-sheet">
                {/* The receding edge: the ink thins over its lip, so the line it
                    draws across the reveal reads as wet ink pulling back. */}
                <View style={styles.lip}>
                    <Svg width="100%" height={INK_LIP} preserveAspectRatio="none">
                        <Defs>
                            <LinearGradient id="axmInkLip" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={HUE.inkBg} stopOpacity={0} />
                                <Stop offset="1" stopColor={HUE.inkBg} stopOpacity={1} />
                            </LinearGradient>
                        </Defs>
                        <Rect x="0" y="0" width="100%" height={INK_LIP} fill="url(#axmInkLip)" />
                    </Svg>
                </View>
                {/* The wet edge: a thin sheen where the solid ink ends, so the
                    edge reads even where it crosses the dark ground. */}
                <View style={styles.sheen} />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    clip: { zIndex: 30, overflow: 'hidden' },
    // The ink: the whole screen at cover 1. Its lip hangs above its top edge,
    // so at cover 1 the lip sits off screen and the screen is solid ink.
    sheet: { ...StyleSheet.absoluteFillObject, backgroundColor: HUE.inkBg },
    lip: { position: 'absolute', left: 0, right: 0, top: -INK_LIP, height: INK_LIP },
    sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: HUE.retreatBone, opacity: 0.35 },
});
