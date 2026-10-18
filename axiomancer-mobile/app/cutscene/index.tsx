/**
 * /cutscene — the dedicated narration screen.
 *
 * PRESENTATION CONTRACT (what the player sees)
 * --------------------------------------------
 * A cutscene event plays its authored lines ONE AT A TIME, centred in the
 * viewport inside a barely-visible grey plate with rounded corners:
 *
 *   1. The current line FADES IN (opacity 0 → 1 over `FADE_IN_MS`).
 *   2. The player taps anywhere on the screen.
 *   3. The current line FADES OUT (opacity 1 → 0 over `FADE_OUT_MS`).
 *   4. The next line takes its place and the cycle repeats from (1).
 *   5. Tapping through the LAST line fades it out and then dismisses the
 *      event (returns the player to whatever route pushed the cutscene).
 *
 * Only one line is ever mounted, so the screen reads as a sequence of
 * beats rather than a growing wall of prose.
 *
 * SKIP abandons the whole scene immediately — with a
 * fade-through presentation there is no meaningful "reveal everything at once"
 * state to jump to, so the control dismisses the event outright.
 *
 * ACCESSIBILITY
 * -------------
 * When the OS reports "reduce motion", every fade duration collapses to 0 —
 * lines snap in and out instead of animating. Tap semantics are unchanged, so
 * the scene is still fully playable.
 *
 * STATE OWNERSHIP
 * ---------------
 * Component-local cursor only — the engine already resolved the event; nothing
 * here touches rules. The only store call is `actions.dismissEvent()`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { CUTSCENE_HINT } from '@/state/presenters/event.engine';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Milliseconds a line takes to fade IN once it becomes the current line. */
export const FADE_IN_MS = 600;
/** Milliseconds a line takes to fade OUT after the player taps to advance. */
export const FADE_OUT_MS = 320;

export default function CutsceneScreen() {
    const styles = useStyles();
    const slice = useGameState((s) => s.event);
    const actions = useGameActions();
    const router = useRouter();
    const reducedMotion = useReducedMotion();

    /** The authored lines of the pending cutscene event (empty when inactive). */
    const lines: readonly string[] = useMemo(() => {
        const pending = slice?.pending;
        if (!pending || pending.event.kind !== 'cutscene') return [];
        return pending.event.lines;
    }, [slice]);

    const active = lines.length > 0;

    /** Index of the line currently on screen. Advances one tap at a time. */
    const [index, setIndex] = useState(0);
    /**
     * `true` between the tap and the end of the fade-out, so a second tap
     * inside that window cannot skip a line (or double-dismiss the event).
     */
    const advancing = useRef(false);
    /** Opacity driver for the single mounted line. */
    const opacity = useRef(new Animated.Value(0)).current;

    const isLastLine = index >= lines.length - 1;

    useEffect(() => {
        if (!active && router.canGoBack()) router.back();
    }, [active, router]);

    // Fade the current line in whenever the cursor moves (and on first mount).
    // `reducedMotion` collapses the duration to 0, which Animated honours as an
    // immediate set — no separate code path needed.
    useEffect(() => {
        if (!active) return;
        opacity.setValue(0);
        const anim = Animated.timing(opacity, {
            toValue: 1,
            duration: reducedMotion ? 0 : FADE_IN_MS,
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
    }, [active, index, opacity, reducedMotion]);

    /** Leave the scene entirely (last line consumed, or SKIP pressed). */
    const dismiss = useCallback(() => {
        actions.dismissEvent();
    }, [actions]);

    /**
     * Tap handler: fade the current line out, then either step to the next
     * line or dismiss the event. Re-entrant taps are ignored while a fade-out
     * is already in flight.
     */
    const onAdvance = useCallback(() => {
        if (advancing.current) return;
        advancing.current = true;
        Animated.timing(opacity, {
            toValue: 0,
            duration: reducedMotion ? 0 : FADE_OUT_MS,
            useNativeDriver: true,
        }).start(() => {
            advancing.current = false;
            if (isLastLine) dismiss();
            else setIndex((n) => n + 1);
        });
    }, [dismiss, isLastLine, opacity, reducedMotion]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!active) {
        return (
            <ScreenBg scrollable={false} art="cutscene">
                <View style={styles.inactiveWrap} testID="cutscene-inactive">
                    <Text style={styles.inactiveText}>Nothing here. The road went on.</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="cutscene">
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isLastLine ? 'End the scene' : 'Reveal the next line'}
                activeOpacity={1}
                onPress={onAdvance}
                style={styles.tapField}
                testID="cutscene-advance"
            >
                {/* The centred plate. Its border is deliberately near-invisible
                    (`AXM.divider` — parchment at 12% alpha) so it frames the
                    prose without competing with it. */}
                <Animated.View style={[styles.plate, { opacity }]} testID="cutscene-plate">
                    <Text style={styles.eyebrow}>▶ OMEN</Text>
                    <Text style={styles.line} testID={`cutscene-line-${index}`}>
                        {lines[index]}
                    </Text>
                    <Text style={styles.hint}>
                        {isLastLine ? CUTSCENE_HINT.last : CUTSCENE_HINT.next}
                    </Text>
                </Animated.View>
            </TouchableOpacity>
            {/* SKIP abandons the scene outright. */}
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Skip the scene"
                activeOpacity={0.7}
                onPress={dismiss}
                style={styles.skip}
                testID="cutscene-skip"
            >
                <Text style={styles.skipText}>SKIP</Text>
            </TouchableOpacity>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    // Full-bleed tap target that also does the centring; one line is ever
    // mounted, so there is nothing to scroll.
    tapField: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    plate: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderRadius: 14,
        borderColor: AXM.divider,
    },
    eyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 2.2,
        color: AXM.sulfur,
        marginBottom: 18,
        textAlign: 'center',
    },
    line: {
        fontFamily: FONTS.serif,
        fontSize: 17,
        lineHeight: 27,
        color: AXM.parchment,
        textAlign: 'center',
    },
    hint: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 2,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 22,
    },
    // SKIP has a bordered plate, a legible label, and a 44pt minimum box,
    // so it looks pressable and can be hit.
    skip: {
        position: 'absolute',
        top: 14,
        right: 14,
        minWidth: 84,
        minHeight: 44,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
        borderColor: AXM.parchmentMed,
        backgroundColor: AXM.overlay,
    },
    skipText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 3,
        color: AXM.parchment,
    },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { ...TYPE.body, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
