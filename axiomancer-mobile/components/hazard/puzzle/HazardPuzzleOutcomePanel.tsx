/**
 * The hazard puzzle outcome, in the live hazard outcome's look (the
 * `OutcomeOverlay` stock: a near-black full cover, the round's ledger mark,
 * the gothic verdict word, the sans sub-line and a bordered call to action),
 * with what was gained and lost listed under the verdict.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { HazardPuzzleOutcomeVM } from '@/state/presenters/hazard-puzzle.engine';
import {
    HAZARD_PUZZLE_CLAIM_LABEL,
    HAZARD_PUZZLE_PENALTY_LABEL,
    HAZARD_PUZZLE_REWARDS_LABEL,
} from '@/state/presenters/hazard-puzzle.copy';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import { LedgerMark } from '../glyphs';
import { HZ } from '../palette';

export function HazardPuzzleOutcomePanel({ vm, onDone }: { vm: HazardPuzzleOutcomeVM; onDone: () => void }) {
    const AXM = usePalette();
    const styles = useStyles();
    // The live outcome's tiers: gold for a clear, blood for a fall.
    const color = vm.cleared ? HZ.gold : AXM.blood;
    return (
        <Animated.View entering={FadeIn.duration(260)} style={styles.root} testID="hazard-puzzle-outcome">
            <LedgerMark kind={vm.mark} size={42} />
            <Text style={[styles.word, { color }]} testID="hazard-puzzle-outcome-headline">
                {vm.headline}
            </Text>
            <Text style={styles.sub}>{vm.reachedLabel}</Text>
            <View style={styles.lists}>
                <Text style={styles.section}>{HAZARD_PUZZLE_REWARDS_LABEL}</Text>
                {/* A roll can repeat an item, so rows are keyed by position. */}
                {vm.rewards.map((r, i) => (
                    <Text key={`reward-${i}`} style={styles.reward}>
                        {r}
                    </Text>
                ))}
                <Text style={styles.section}>{HAZARD_PUZZLE_PENALTY_LABEL}</Text>
                {vm.penalties.map((p, i) => (
                    <Text key={`penalty-${i}`} style={styles.penalty}>
                        {p}
                    </Text>
                ))}
            </View>
            <Pressable
                onPress={onDone}
                accessibilityRole="button"
                testID="hazard-puzzle-done"
                style={[styles.cta, { borderColor: color }]}
            >
                <Text style={[styles.ctaText, { color }]}>{HAZARD_PUZZLE_CLAIM_LABEL}</Text>
            </Pressable>
        </Animated.View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: 'rgba(5,4,3,0.97)',
    },
    word: {
        fontFamily: FONTS.gothic,
        fontSize: 48,
        letterSpacing: 3,
        lineHeight: 52,
        marginTop: 18,
        textAlign: 'center',
        textShadowColor: HUE.black,
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 0,
    },
    sub: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 2, color: AXM.bone, marginTop: 10 },
    lists: { marginTop: 16, alignItems: 'center', gap: 3 },
    section: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 2, color: AXM.ash, marginTop: 8 },
    reward: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.parchment },
    penalty: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.blood },
    cta: { marginTop: 26, paddingHorizontal: 28, paddingVertical: 11, borderWidth: 2, backgroundColor: AXM.bg },
    ctaText: { fontFamily: FONTS.gothic, fontSize: 17, letterSpacing: 2.5 },
}));
