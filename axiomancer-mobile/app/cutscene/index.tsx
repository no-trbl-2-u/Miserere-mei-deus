/**
 * /cutscene - the dedicated narration screen (CU1b): the teller over a vellum panel.
 *
 * PRESENTATION CONTRACT (what the player sees)
 * --------------------------------------------
 * The scene's own picture fills the top of the screen and fades into black;
 * the chapter's name sits at the top left, SKIP (the brass action plate) at the
 * top right. At the foot a vellum panel (`modal-panel-vellum`) holds the
 * current line in dark ink with a small "1 of 2" count under it, and the one
 * narrator (the same figure for every cutscene) stands over the panel's top
 * edge, in front of it.
 *
 *   1. The current line FADES IN (opacity 0 -> 1 over `FADE_IN_MS`).
 *   2. The player taps anywhere but SKIP.
 *   3. The line FADES OUT (over `FADE_OUT_MS`), the next takes its place.
 *   4. The last tap fades the line out and dismisses the event.
 *
 * There is no CONTINUE, no bottom SKIP and no hint line. The picture, the
 * chapter, the panel and the narrator stay put; only the line and its count
 * fade. SKIP dismisses the event outright (the scene's effect already applied
 * when it resolved, so SKIP loses nothing).
 *
 * ACCESSIBILITY: reduce motion collapses every fade to 0; taps are unchanged.
 *
 * STATE OWNERSHIP: component-local cursor only. What the screen draws comes
 * from the `cutsceneView` presenter; the only store calls are `dismissEvent()`
 * and, for a node's before-scene, `continueToNode()`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { SPOILS_INK } from '@/components/combat/encounter/spoils-ink';
import { BrassButton } from '@/components/experience/BrassButton';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { ScreenBg } from '@/components/ScreenBg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Image } from '@/lib/platform/image';
import { isBeforeScene } from '@mechanics';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { cutsceneView } from '@/state/presenters/event.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { HUE } from '@/theme/hue';
import { makeStyles } from '@/theme/runtime';

/** Milliseconds a line takes to fade IN once it becomes the current line. */
export const FADE_IN_MS = 600;
/** Milliseconds a line takes to fade OUT after the player taps to advance. */
export const FADE_OUT_MS = 320;

/** The line's default size, and the floor a long line steps down to (pt). */
export const LINE_SIZE = 26;
export const LINE_SIZE_FLOOR = 20;
/** How many characters the panel holds at `LINE_SIZE` (about five lines). */
const LINE_FIT_CHARS = 100;

/** The type size for a line: the default while it fits the panel, stepping down to the floor. */
export function cutsceneLineSize(line: string): number {
    if (line.length <= LINE_FIT_CHARS) return LINE_SIZE;
    const over = (line.length - LINE_FIT_CHARS) / LINE_FIT_CHARS;
    return Math.max(LINE_SIZE_FLOOR, Math.round(LINE_SIZE - over * (LINE_SIZE - LINE_SIZE_FLOOR) * 2));
}

/** The narrator's height (pt), standing over the panel's top edge. */
export const NARRATOR_HEIGHT = 300;
/** How far the narrator's feet reach down over the panel's top border (pt). */
const NARRATOR_FEET_OVERLAP = 26;

export default function CutsceneScreen() {
    const styles = useStyles();
    const slice = useGameState((s) => s.event);
    const actions = useGameActions();
    const router = useRouter();
    const reducedMotion = useReducedMotion();

    const view = useMemo(() => cutsceneView(slice?.pending?.event), [slice]);
    const beats = view.beats;
    const active = beats.length > 0;

    /** Index of the beat currently on screen. Advances one tap at a time. */
    const [index, setIndex] = useState(0);
    /**
     * `true` between the tap and the end of the fade-out, so a second tap
     * inside that window cannot skip a line (or double-dismiss the event).
     */
    const advancing = useRef(false);
    /** Opacity driver for the single mounted line and its count. */
    const opacity = useRef(new Animated.Value(0)).current;

    const isLastLine = index >= beats.length - 1;

    useEffect(() => {
        if (!active && router.canGoBack()) router.back();
    }, [active, router]);

    // Fade the current line in whenever the cursor moves (and on first mount).
    // `reducedMotion` collapses the duration to 0, which Animated honours as an
    // immediate set.
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

    /**
     * Leave the scene entirely (last line consumed, or SKIP pressed). A node's
     * before-scene hands on to the node's own screen; any other cutscene just ends.
     */
    const dismiss = useCallback(() => {
        const event = slice?.pending?.event;
        if (event && isBeforeScene(event)) actions.continueToNode();
        else actions.dismissEvent();
    }, [actions, slice]);

    /**
     * Tap handler: fade the current line out, then either step to the next
     * beat or dismiss the event. Re-entrant taps are ignored while a fade-out
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

    // Inactive shell - visible for a frame while the router unwinds; never a
    // blank screen.
    if (!active) {
        return (
            <ScreenBg scrollable={false}>
                <View style={styles.inactiveWrap} testID="cutscene-inactive">
                    <Text style={styles.inactiveText}>Nothing here. The road went on.</Text>
                </View>
            </ScreenBg>
        );
    }

    const beat = beats[Math.min(index, beats.length - 1)];
    const size = cutsceneLineSize(beat.line);

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.root}>
                <View style={styles.picture} pointerEvents="none" testID="cutscene-picture">
                    <Image source={view.picture} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
                    {/* Into black below the picture. The Svg sits in a View (RN-web trap, #1398). */}
                    <View style={styles.fade}>
                        <Svg width="100%" height="100%" preserveAspectRatio="none">
                            <Defs>
                                <LinearGradient id="cutsceneFade" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0.45" stopColor={HUE.inkBg} stopOpacity="0" />
                                    <Stop offset="1" stopColor={HUE.inkBg} stopOpacity="1" />
                                </LinearGradient>
                            </Defs>
                            <Rect x="0" y="0" width="100%" height="100%" fill="url(#cutsceneFade)" />
                        </Svg>
                    </View>
                </View>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={isLastLine ? 'End the scene' : 'Reveal the next line'}
                    activeOpacity={1}
                    onPress={onAdvance}
                    style={styles.tapField}
                    testID="cutscene-advance"
                >
                    {view.chapter !== null && (
                        <Text style={styles.chapter} testID="cutscene-chapter">{view.chapter}</Text>
                    )}
                    <View style={styles.foot}>
                        <View style={styles.panel} testID="cutscene-panel">
                            <KitBackdrop piece="modal-panel-vellum" />
                            <Animated.View style={[styles.plate, { opacity }]} testID="cutscene-plate">
                                <Text
                                    style={[styles.line, { fontSize: size, lineHeight: Math.round(size * 1.23) }]}
                                    testID={`cutscene-line-${index}`}
                                >
                                    {beat.line}
                                </Text>
                                <Text style={styles.count} testID="cutscene-count">{beat.count}</Text>
                            </Animated.View>
                            {/* The one narrator, over the panel's top edge and in front of it. */}
                            <View style={styles.narrator} pointerEvents="none" testID="cutscene-narrator">
                                <Image source={view.narrator} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* SKIP abandons the scene outright. */}
                <BrassButton
                    label="SKIP"
                    align="center"
                    onPress={dismiss}
                    style={styles.skip}
                    testID="cutscene-skip"
                    accessibilityLabel="Skip the scene"
                />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: AXM.bg },
    picture: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
    fade: { ...StyleSheet.absoluteFillObject },
    // Full-bleed tap target; the foot sits at its bottom.
    tapField: { flex: 1 },
    chapter: {
        position: 'absolute',
        top: 22,
        left: 16,
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    foot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 14 },
    panel: { minHeight: 150, justifyContent: 'center' },
    plate: {
        alignItems: 'center',
        paddingTop: NARRATOR_FEET_OVERLAP + 22,
        paddingBottom: 30,
        paddingHorizontal: 44,
    },
    line: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        color: SPOILS_INK.body,
        textAlign: 'center',
    },
    count: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 11,
        color: SPOILS_INK.soft,
        textAlign: 'center',
        marginTop: 12,
    },
    // Bottom-anchored on the panel's top edge: its feet reach NARRATOR_FEET_OVERLAP into the panel.
    narrator: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: -NARRATOR_FEET_OVERLAP,
        alignSelf: 'center',
        width: 240,
        height: NARRATOR_HEIGHT,
    },
    // SKIP keeps its 44pt box at the top right.
    skip: {
        position: 'absolute',
        top: 10,
        right: 10,
        minWidth: 84,
        minHeight: 44,
    },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
