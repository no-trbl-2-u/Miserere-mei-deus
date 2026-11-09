/**
 * AscendStrip — the inline "LEVEL UP" affordance rendered between
 * the level box and the XP chain on the SELF tab when the player
 * has unspent stat-allocation points.
 *
 * The strip is the LOUDEST single element on
 * the SELF tab when armed — full-width, ~64px tall, sulfur-banded.
 * The carve-out is deliberate: the seal sits on the
 * page like a wax-sealed proclamation, not a CTA shouting from a
 * settings app.
 *
 * Mounts only when `pendingPoints > 0`. The caller (SELF screen)
 * gates on `vm.pendingPoints` from the character presenter and
 * skips mounting when zero.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';

import { Splatter } from '@/components/Splatter';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface AscendStripProps {
    /** Unspent allocation points. Must be > 0; caller gates. */
    pendingPoints: number;
    /**
     * Current level. The engine raises the level when XP crosses the
     * threshold and banks the points, so the strip names the level already
     * reached ("risen to level <N>").
     */
    level: number;
    /** Tap handler — opens the LevelUpModal. */
    onOpen: () => void;
}

export function AscendStrip({ pendingPoints, level, onOpen }: AscendStripProps) {
    const styles = useStyles();
    const AXM = usePalette();
    // Arabic, as the SELF medallion and the combat line print the
    // level ("LVL 4"); a roman "level iv" here read as a different number.
    const pointsWord = pendingPoints === 1 ? 'point' : 'points';
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ascend — ${pendingPoints} ${pointsWord} unspent, risen to level ${level}`}
            testID="ascend-strip"
            onPress={onOpen}
            style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
        >
            <View style={styles.stripContent}>
                <View style={styles.sealWrap}>
                    {/* Sulfur "pulse" ring — concentric inner ring at 50%
                       opacity to imply the slow-breathing animation the
                       brief calls for. react-native-reanimated could
                       drive a real loop later; the static ring carries
                       the visual contract for now. */}
                    <View style={styles.sealPulse} />
                    <LockSealGlyph />
                </View>
                <View style={styles.centerCol}>
                    <Text style={styles.ascendTitle}>✠ ASCEND</Text>
                    <Text style={styles.ascendSubline} numberOfLines={1}>
                        {pendingPoints} {pointsWord} unspent · risen to level {level}
                    </Text>
                    {pendingPoints >= 2 && (
                        <Text style={styles.ignoredPings}>
                            {renderChevrons(pendingPoints)}
                        </Text>
                    )}
                </View>
                <View style={styles.chevronRing}>
                    <Text style={styles.chevron}>›</Text>
                </View>
            </View>
            <Splatter
                color={AXM.blood}
                size={48}
                seed={42}
                style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.55 }}
            />
        </Pressable>
    );
}

/**
 * `↑×N` form once pendingPoints > 5 to avoid the
 * row becoming an arrow soup. ≤5 renders one arrow per point.
 */
function renderChevrons(n: number): string {
    if (n > 5) return `↑×${n}`;
    return Array.from({ length: n }, () => '↑').join(' ');
}

/**
 * LockSeal glyph — wax-seal motif with an inset lock. Rendered in
 * sulfur per the ASCEND brand color.
 */
function LockSealGlyph() {
    const AXM = usePalette();
    return (
        <Svg viewBox="0 0 22 22" width={22} height={22}>
            <Circle cx={11} cy={11} r={10} fill={AXM.sulfur} stroke={AXM.bg} strokeWidth={0.6} />
            <Circle
                cx={11}
                cy={11}
                r={10}
                fill="none"
                stroke={AXM.bg}
                strokeWidth={0.4}
                strokeDasharray="1 1.5"
                opacity={0.6}
            />
            {/* impressed lock — shackle + body */}
            <SvgPath d="M7.5 11 h7 v5 h-7 z" fill="none" stroke={AXM.bg} strokeWidth={1.2} />
            <SvgPath
                d="M8.5 11 v-2 a2.5 2.5 0 0 1 5 0 v2"
                fill="none"
                stroke={AXM.bg}
                strokeWidth={1.2}
            />
        </Svg>
    );
}

const useStyles = makeStyles((AXM) => ({
    strip: {
        marginVertical: 6,
        backgroundColor: AXM.panelBg,
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopColor: AXM.sulfur,
        borderBottomColor: AXM.sulfur,
        borderLeftColor: AXM.parchment,
        borderRightColor: AXM.parchment,
        position: 'relative',
        overflow: 'hidden',
    },
    stripPressed: { transform: [{ translateY: 1 }], opacity: 0.88 },
    stripContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        minHeight: 60,
    },
    sealWrap: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sealPulse: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        opacity: 0.5,
    },
    centerCol: { flex: 1, justifyContent: 'center' },
    ascendTitle: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 18,
        color: AXM.sulfur,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
    },
    ascendSubline: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9.5,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        opacity: 0.6,
        marginTop: 2,
    },
    ignoredPings: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 10,
        color: AXM.sulfur,
        opacity: 0.6,
        marginTop: 2,
    },
    chevronRing: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: AXM.parchment,
        opacity: 0.85,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chevron: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 22,
        color: AXM.sulfur,
        lineHeight: 22,
    },
}));
