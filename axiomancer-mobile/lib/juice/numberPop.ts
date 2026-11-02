import { useEffect } from 'react';
import { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { shouldInstantSettleJuice } from './instant';
import { JUICE_TIMING } from './juice.timing';

export interface NumberPopTimeline {
    riseDistancePx: number;
    fadeDelayMs: number;
    fadeDurationMs: number;
    riseDurationMs: number;
}

/** Pure data: the rise/fade timeline every number-pop plays. */
export function numberPopTimeline(timing = JUICE_TIMING): NumberPopTimeline {
    return { ...timing.numberPop };
}

/**
 * A rising, fading damage/heal/currency delta pop. Mounts once and plays
 * once — calls `onDone` when the rise completes so the caller can unmount
 * it. Reduced motion keeps the number readable: it shows still, for as long
 * as the rise would have run, then `onDone` fires. The e2e escape hatch lands
 * the pop at its final state immediately. `delayMs` holds the pop hidden before
 * it plays, so a batch of pops can stagger.
 */
export function useJuiceNumberPop(onDone: () => void, delayMs = 0) {
    const reducedMotion = useReducedMotion();
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(delayMs > 0 ? 0 : 1);
    useEffect(() => {
        const t = numberPopTimeline();
        if (shouldInstantSettleJuice()) {
            translateY.value = -t.riseDistancePx;
            opacity.value = 0;
            onDone();
            return;
        }
        if (reducedMotion) {
            const shown = setTimeout(() => { opacity.value = 1; }, delayMs);
            const done = setTimeout(onDone, delayMs + t.riseDurationMs);
            return () => { clearTimeout(shown); clearTimeout(done); };
        }
        opacity.value = delayMs > 0
            ? withDelay(delayMs, withSequence(
                withTiming(1, { duration: 0 }),
                withDelay(t.fadeDelayMs, withTiming(0, { duration: t.fadeDurationMs })),
            ))
            : withDelay(t.fadeDelayMs, withTiming(0, { duration: t.fadeDurationMs }));
        translateY.value = withDelay(delayMs, withTiming(-t.riseDistancePx, { duration: t.riseDurationMs }, (finished) => {
            if (finished) runOnJS(onDone)();
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
}
