/**
 * The SACRIFICE-floor callout on the player's avatar.
 *
 * When the board refuses a card line because its SACRIFICE would leave the
 * player below 1 VITAE, the avatar answers "why": its outline pulses red
 * twice and a ghost ring of the unpaid SACRIFICE is drawn from the current
 * fill back past the floor, tagged `SACRIFICE <cost>`. With reduced motion
 * the outline and ghost hold still for the same span.
 *
 * The engine owns the numbers (`programLineShortfall`); this file only draws
 * them. The rings are drawn in a 92-unit box (r 40 fill ring, r 44.5
 * outline), the box `PlayerMedallion` draws its rim in, scaled to `size`.
 * The tag is not scaled.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PROGRAM_COPY } from '@/state/presenters/combat-encounter.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** How long the callout shows: two pulse cycles. */
export const SACRIFICE_CALLOUT_MS = 900;
const PULSE_CYCLES = 2;

const BOX = 92;
const CENTER = 46;
const FILL_R = 40;
const OUTLINE_R = 44.5;
const FILL_C = 2 * Math.PI * FILL_R;

/** One ghost segment along the fill ring, in stroke lengths from 12 o'clock
 *  clockwise. */
export interface GhostArc { from: number; to: number; }

/**
 * The ghost segments for an unpaid SACRIFICE: the whole current fill (the
 * cost drains it all), plus the overflow that runs past the floor, drawn
 * back from 12 o'clock and capped so it never laps the fill. Pure.
 *
 * @example sacrificeGhostArcs(4, 100, 6, 251) // [{ from: 0, to: 10.04 }, { from: 245.98, to: 251 }]
 */
export function sacrificeGhostArcs(vitae: number, max: number, cost: number, circumference = FILL_C): GhostArc[] {
    if (max <= 0 || cost <= 0) return [];
    const frac = (n: number) => Math.max(0, Math.min(1, n / max)) * circumference;
    const fill = frac(vitae);
    const over = Math.min(frac(Math.max(0, cost - vitae)), circumference - fill);
    const arcs: GhostArc[] = [];
    if (fill > 0) arcs.push({ from: 0, to: fill });
    if (over > 0) arcs.push({ from: circumference - over, to: circumference });
    return arcs;
}

export function VitaeSacrificeCallout({ cost, vitae, max, size = BOX }: {
    cost: number; vitae: number; max: number;
    /** The drawn size of the 92-unit ring box (the avatar's diameter). */
    size?: number;
}) {
    const AXM = usePalette();
    const styles = useStyles();
    const reduced = useReducedMotion();
    const glow = useSharedValue(1);
    useEffect(() => {
        if (reduced) { glow.value = 1; return; }
        const half = SACRIFICE_CALLOUT_MS / (PULSE_CYCLES * 2);
        glow.value = 0.25;
        glow.value = withSequence(
            withTiming(1, { duration: half }), withTiming(0.25, { duration: half }),
            withTiming(1, { duration: half }), withTiming(0.25, { duration: half }),
        );
    }, [reduced, glow]);
    const outlineStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
    const arcs = sacrificeGhostArcs(vitae, max, cost);
    return (
        <View
            style={[styles.root, { width: size, height: size }]}
            pointerEvents="none"
            testID="combat-vitae-callout"
            accessibilityLabel={PROGRAM_COPY.floorA11y(vitae, max, cost)}
        >
            <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`} style={StyleSheet.absoluteFill}>
                {arcs.map((a, i) => (
                    <Circle
                        key={i}
                        cx={CENTER} cy={CENTER} r={FILL_R}
                        stroke={AXM.blood}
                        strokeWidth={5}
                        strokeOpacity={0.85}
                        strokeDasharray={`${a.to - a.from} ${FILL_C}`}
                        strokeDashoffset={-a.from}
                        fill="none"
                        transform={`rotate(-90 ${CENTER} ${CENTER})`}
                        testID="combat-vitae-ghost"
                    />
                ))}
            </Svg>
            <Animated.View
                style={[StyleSheet.absoluteFill, outlineStyle]}
                testID={reduced ? 'combat-vitae-outline-static' : 'combat-vitae-outline-pulse'}
            >
                <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
                    <Circle cx={CENTER} cy={CENTER} r={OUTLINE_R} stroke={AXM.blood} strokeWidth={3} fill="none" />
                </Svg>
            </Animated.View>
            <View style={styles.tag}>
                <Text style={styles.tagText} allowFontScaling={false}>{PROGRAM_COPY.floorTag(cost)}</Text>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { position: 'absolute', left: 0, top: 0, zIndex: 8 },
    // Anchored to the avatar's left edge, so it reads rightward onto the
    // board instead of past the screen's left edge.
    tag: {
        position: 'absolute', top: -22, left: -4, width: 140, alignItems: 'flex-start',
    },
    tagText: {
        fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 0.6, color: AXM.blood,
        backgroundColor: AXM.deepBg, borderColor: AXM.blood, borderWidth: 1, borderRadius: 3,
        paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden',
    },
}));
