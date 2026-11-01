/**
 * The Roll Ritual — the choreographed dice cast.
 *
 * The choreography is the HAZARD CAST: the proven
 * fall-in from the hazard minigame's dice-cast interstitial
 * (`HazardOverlays.tsx`'s `TumblingDie`) — the die drops in from above the
 * tray rotated hard, unwinds as it falls, lands with a spring micro-bounce,
 * and comes to rest EXACTLY on the tray line. It ALWAYS lands on the
 * engine-rolled face: the engine RNG is the sole authority on outcomes;
 * this component only choreographs the arrival.
 * The real `CombatDie` — carrying the true settled face, its a11y label, and
 * its testID — stays mounted the whole time, so the outcome a die shows is
 * never in doubt (and screen readers / e2e read the settled face immediately).
 * The cast is pure transform over it.
 *
 * `DiceRow` renders this in place of a bare `CombatDie` for every rolled tray
 * die that has a roll plan.
 *
 * Modes (resolved by the caller via `resolveRollMode`):
 *   · animate  → the staggered fall + spring settle + haptic tick.
 *   · instant  → no animation, no wait (OS reduced-motion, or the seeded-e2e
 *                instant-settle global). The die renders at rest at once.
 *
 * Skip: a rising `skipNonce` (the tray's tap-to-skip) snaps this die to its
 * settled face mid-fall. Cracked (OVERHEAT) dice never cast — they sit the
 * ritual out, rendered dead by `CombatDie`.
 */

import React, { useEffect, useRef } from 'react';
import { Haptics } from '@/lib/platform/haptics';
import Animated, {
    Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue,
    withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

import type { CombatDieVM } from '@/state/presenters/combat-encounter.engine';
import {
    dieRollSignature, type DieRollPlan, type RollMode,
} from '@/state/combat/dice-roll-ritual';
import { DICE_ROLL_TIMING } from '@/state/combat/dice-roll-ritual.timing';
import { CombatDie } from './CombatDie';

function tick() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export const RollingDie = React.memo(function RollingDie({
    die, size = 54, dimmed = false, mode, plan, skipNonce = 0, onTumbleChange,
    assigned = false, specialText,
}: {
    die: CombatDieVM;
    size?: number;
    dimmed?: boolean;
    /** animate | instant — resolved upstream from reduced-motion + instant-settle. */
    mode: RollMode;
    /** This die's plan row (stagger + fall length + the settled face). */
    plan: DieRollPlan;
    /** Rising nonce: a tap on the casting tray → snap every die to settled. */
    skipNonce?: number;
    /** Reports casting on/off so the tray can gate its tap-to-skip overlay. */
    onTumbleChange?: (id: string, tumbling: boolean) => void;
    /** Forwarded to `CombatDie`'s a11y label — socketed on a staged card. */
    assigned?: boolean;
    /** Forwarded to `CombatDie`'s a11y label — the special die face's real (gear-scaled) payload. */
    specialText?: string;
}) {
    // The single fall driver (the hazard `TumblingDie` mapping):
    //   0 → above the tray, rotated hard · 1 → seated · >1 → the micro-bounce.
    // Rest value is exactly 1 (translateY 0, rotate 0) — a tray die must sit
    // still on the tray line, unlike the overlay dice that hover mid-screen.
    const fall = useSharedValue(1);

    // The signature the cast was last run for — so a reroll (a new
    // face on THIS die) replays the ritual, while an unrelated board re-render
    // (a drag elsewhere) does not.
    const sig = dieRollSignature(die);
    const lastSig = useRef<string | null>(null);
    const tumblingRef = useRef(false);

    const setTumbling = (on: boolean) => {
        if (tumblingRef.current === on) return;
        tumblingRef.current = on;
        onTumbleChange?.(die.id, on);
    };

    const snapSettled = () => {
        cancelAnimation(fall);
        fall.value = 1;
        setTumbling(false);
    };

    // Drive the ritual whenever this die's engine result changes (or on first
    // mount). Instant mode / cracked / X / an unchanged result all snap settled.
    useEffect(() => {
        if (lastSig.current === sig) return;
        lastSig.current = sig;

        if (!plan.tumbles) { snapSettled(); return; }

        const T = DICE_ROLL_TIMING;
        setTumbling(true);
        // The hazard cast: fall in (quad-in — gravity), land with a spring
        // overshoot, then the settle spring brings it to rest at exactly 1.
        fall.value = 0;
        fall.value = withDelay(plan.startDelayMs, withSequence(
            withTiming(1, { duration: plan.tumbleDurationMs, easing: Easing.in(Easing.quad) }),
            // The landing overshoot peaks at t≈1.18 → bounceLiftPx/RotateDeg scale it.
            withSpring(1.18, T.landSpring),
            withSpring(1, T.settleSpring, (finished) => {
                'worklet';
                if (finished) {
                    runOnJS(tick)();
                    runOnJS(setTumbling)(false);
                }
            }),
        ));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig, plan.tumbles, plan.startDelayMs, plan.tumbleDurationMs, mode]);

    // Tap-to-skip: any rising nonce collapses an in-flight cast to settled.
    const firstSkip = useRef(true);
    useEffect(() => {
        if (firstSkip.current) { firstSkip.current = false; return; }
        if (tumblingRef.current) snapSettled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skipNonce]);

    // Report casting off on unmount so the tray never wedges its overlay open.
    useEffect(() => () => { setTumbling(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const animStyle = useAnimatedStyle(() => {
        const T = DICE_ROLL_TIMING;
        const t = fall.value;
        // ≤1 → the fall (drop + unwinding entry rotation, fading in);
        // >1 → the landing micro-bounce (slight lift + wobble back to rest).
        const translateY = t <= 1 ? -T.dropPx * (1 - t) : (t - 1) * -T.bounceLiftPx;
        const rotate = t <= 1 ? `${T.entryRotateDeg * (1 - t)}deg` : `${(t - 1) * T.bounceRotateDeg}deg`;
        return {
            opacity: Math.min(1, Math.max(0, t) * 3),
            transform: [{ translateY }, { rotate }],
        };
    });

    return (
        <Animated.View style={animStyle}>
            <CombatDie die={die} size={size} dimmed={dimmed} assigned={assigned} specialText={specialText} />
        </Animated.View>
    );
});
