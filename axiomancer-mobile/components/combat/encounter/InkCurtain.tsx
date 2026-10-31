/**
 * The ink curtain (phase ET1a): ink fills the screen as the fight is
 * entered, then draws back to leave the foe standing in the reveal.
 *
 * The motion gate takes its answer from the caller (`instant`), the way the
 * enemy frame engine does: the component never asks the platform about
 * reduced motion itself. In `instant` mode it lands its end state at once,
 * the ink gone, and fires `onDone` on mount; nothing is skipped.
 * A tap on the curtain skips the draw-back.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { HUE } from '@/theme/axm';

/** Hold the full-ink beat, then draw it back; the whole curtain stays near 1.2 s. */
export const INK_HOLD_MS = 250;
export const INK_DRAW_MS = 900;

export interface InkCurtainProps {
    /** True lands the end state at once (reduced motion, e2e escape hatch). */
    instant: boolean;
    /** Fires once, when the ink is gone. */
    onDone: () => void;
}

export function InkCurtain({ instant, onDone }: InkCurtainProps) {
    const cover = useSharedValue(instant ? 0 : 1);
    const [gone, setGone] = React.useState(instant);
    const finish = React.useCallback(() => {
        setGone(true);
        onDone();
    }, [onDone]);

    useEffect(() => {
        if (instant) { onDone(); return; }
        cover.value = withDelay(INK_HOLD_MS, withTiming(0, { duration: INK_DRAW_MS, easing: Easing.out(Easing.cubic) }, (done) => {
            if (done) runOnJS(finish)();
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: cover.value,
        transform: [{ scale: 1 + (1 - cover.value) * 0.6 }],
    }));

    if (gone) return null;
    return (
        // zIndex 30: above the reveal (static) and the held boss card (20), so the
        // ink actually covers the foe instead of painting under later siblings.
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 30 }]} onPress={finish} testID="ink-curtain" accessibilityLabel="skip transition">
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: HUE.inkBg }, style]} pointerEvents="none" />
        </Pressable>
    );
}
