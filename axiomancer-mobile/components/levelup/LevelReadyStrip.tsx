/**
 * LevelReadyStrip — the "ASCEND READY" affordance rendered on the
 * SELF tab when the player has accumulated enough XP to level up
 * but `levelUp()` has not yet been dispatched.
 *
 * Companion to
 * `<AscendStrip>` — same visual language (sulfur-banded strip with
 * a wax-seal glyph), but the copy + chevron read "earn the level"
 * rather than "spend the points". The two strips are mutually
 * exclusive at the view layer: `<AscendStrip>` mounts when
 * `pendingPoints > 0`; this strip mounts when `levelUpReady === true
 * && pendingPoints === 0`. Tap dispatches `actions.levelUp()` —
 * engine drains XP into pending stat points, and the next render
 * swaps in `<AscendStrip>`.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';

import { Splatter } from '@/components/Splatter';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface LevelReadyStripProps {
    /** Current level. */
    level: number;
    /**
     * The level the XP reaches (the strip renders "step into level <N>").
     * One fight can be worth several levels; defaults to `level + 1`.
     */
    toLevel?: number;
    /** Tap handler — dispatches `actions.levelUp()`. */
    onLevelUp: () => void;
}

export function LevelReadyStrip({ level, toLevel, onLevelUp }: LevelReadyStripProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const targetLevel = Math.max(level + 1, toLevel ?? level + 1);
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Level up — enough experience accumulated, advance to level ${targetLevel}`}
            testID="level-ready-strip"
            onPress={onLevelUp}
            style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
        >
            <View style={styles.stripContent}>
                <View style={styles.sealWrap}>
                    <View style={styles.sealPulse} />
                    <ChevronUpGlyph />
                </View>
                <View style={styles.centerCol}>
                    <Text style={styles.title}>✠ ASCEND READY</Text>
                    <Text style={styles.subline} numberOfLines={1}>
                        threshold crossed · step into level {targetLevel}
                    </Text>
                </View>
                <View style={styles.chevronRing}>
                    <Text style={styles.chevron}>›</Text>
                </View>
            </View>
            <Splatter
                color={AXM.sulfur}
                size={48}
                seed={73}
                style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.4 }}
            />
        </Pressable>
    );
}

/**
 * ChevronUp glyph — visually distinct from `<AscendStrip>`'s
 * LockSeal so the player can tell the two surfaces apart at a
 * glance. The lock-seal motif is reserved for "the seal opens",
 * i.e. allocating points; the bare upward chevron reads as
 * "earn the level" — the threshold has been crossed but the
 * ritual hasn't begun.
 */
function ChevronUpGlyph() {
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
            {/* upward chevron — two strokes meeting at the apex */}
            <SvgPath d="M5 13 L11 7 L17 13" fill="none" stroke={AXM.bg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
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
    sealWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 18,
        color: AXM.sulfur,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
    },
    subline: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9.5,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
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
