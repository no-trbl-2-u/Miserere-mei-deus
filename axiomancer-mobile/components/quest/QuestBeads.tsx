/**
 * The chain's beads: one per step of the questline, joined by a line. A
 * finished step's bead is gold and filled, the step the card shows is larger
 * with a gold ring, a step ahead is dim. No visible count: the row carries
 * "Step n of N" for a screen reader only.
 */

import React from 'react';
import { View } from 'react-native';

import type { QuestBeadVM } from '@/state/presenters/quest.engine';
import { makeStyles } from '@/theme/runtime';

export interface QuestBeadsProps {
    beads: readonly QuestBeadVM[];
}

export function QuestBeads({ beads }: QuestBeadsProps) {
    const styles = useStyles();
    if (beads.length === 0) return null;
    const current = beads.find(b => b.state === 'current')?.step ?? 1;
    return (
        <View
            style={styles.row}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Step ${current} of ${beads.length}`}
            testID="quest-beads"
        >
            <View style={styles.line} />
            {beads.map(b => (
                <View key={b.step} style={styles.slot}>
                    <View
                        style={[
                            styles.bead,
                            b.done && styles.beadDone,
                            b.state === 'current' && styles.beadCurrent,
                        ]}
                        testID={`quest-bead-${b.step}-${b.state}${b.done ? '-done' : ''}`}
                    />
                </View>
            ))}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 26, paddingHorizontal: 18, marginVertical: 8 },
    // The joining line runs behind the beads, end to end.
    line: { position: 'absolute', left: 30, right: 30, top: 12, height: 2, backgroundColor: AXM.ash },
    slot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    bead: { width: 12, height: 12, borderRadius: 6, backgroundColor: AXM.bg, borderWidth: 2, borderColor: AXM.ash },
    beadDone: { backgroundColor: AXM.sulfur, borderColor: AXM.sulfur },
    beadCurrent: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: AXM.sulfur },
}));
