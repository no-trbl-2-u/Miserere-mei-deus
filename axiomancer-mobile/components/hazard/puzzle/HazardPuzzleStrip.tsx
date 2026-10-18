/**
 * The strip over the puzzle's live board: the only things the puzzle adds to
 * the hazard surface while it is played (the clock, the reserve count and
 * the stat-unlock line), drawn in the hazard palette. Before a route is
 * picked the clock is not shown (it starts on the route) and a BACK control
 * returns to the demo list.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { HAZARD_PUZZLE_BACK_LABEL } from '@/state/presenters/hazard-puzzle.copy';
import type { HazardPuzzleStripVM } from '@/state/presenters/hazard-puzzle.engine';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

import { HZ } from '../palette';

export interface HazardPuzzleStripProps {
    /** The clock face (null before the route is picked) and the reserve count. */
    clockLabel: string | null;
    clockUrgent: boolean;
    reserveLabel: string;
    /** What the player's stats unlocked on this puzzle. */
    unlockLine: string;
    /** Shown only before the route is picked. */
    onBack?: () => void;
}

/** Builds the strip from the presenter's strip VM, or a pre-route strip with no clock. */
export function HazardPuzzleStrip({ clockLabel, clockUrgent, reserveLabel, unlockLine, onBack }: HazardPuzzleStripProps) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <View style={styles.root} testID="hazard-puzzle-strip">
            <View style={styles.row}>
                {clockLabel !== null ? (
                    <Text
                        style={[styles.clock, { color: clockUrgent ? AXM.blood : AXM.sulfur }]}
                        testID="hazard-puzzle-clock"
                        accessibilityRole="timer"
                        accessibilityLabel={`Time left ${clockLabel}`}
                    >
                        {clockLabel}
                    </Text>
                ) : null}
                {onBack ? (
                    <Pressable
                        onPress={onBack}
                        accessibilityRole="button"
                        testID="hazard-puzzle-back"
                        style={styles.back}
                    >
                        <Text style={styles.backText}>{HAZARD_PUZZLE_BACK_LABEL}</Text>
                    </Pressable>
                ) : null}
                <Text style={styles.reserve} testID="hazard-puzzle-reserve">
                    {reserveLabel}
                </Text>
            </View>
            <Text style={styles.unlocks} testID="hazard-puzzle-unlocks">
                {unlockLine}
            </Text>
        </View>
    );
}

/** The strip VM's fields, spread into the strip's props. */
export function stripProps(vm: HazardPuzzleStripVM): Pick<HazardPuzzleStripProps, 'clockLabel' | 'clockUrgent' | 'reserveLabel'> {
    return { clockLabel: vm.clockLabel, clockUrgent: vm.clockUrgent, reserveLabel: vm.reserveLabel };
}

const useStyles = makeStyles((AXM) => ({
    root: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: HUE.black,
        borderBottomWidth: 1,
        borderBottomColor: AXM.ash,
        gap: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    clock: { fontFamily: FONTS.gothic, fontSize: 22, lineHeight: 24, letterSpacing: 1 },
    back: { borderWidth: 1, borderColor: AXM.ash, paddingHorizontal: 10, paddingVertical: 3 },
    backText: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.6, color: AXM.bone },
    reserve: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, color: HZ.acid },
    unlocks: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 12, color: AXM.bone },
}));
