/**
 * The candidate half of the dev-menu HAZARD PUZZLES list: three groups
 * (easy, medium, hard by intended band), each row headed by the candidate's
 * label. Picking a row starts that candidate on its nominated route. A band
 * with no candidate still shows its heading and an empty line.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import {
    HAZARD_PUZZLE_CANDIDATES_HEADING,
    HAZARD_PUZZLE_CANDIDATES_INTRO,
} from '@/state/presenters/hazard-puzzle.copy';
import type { HazardPuzzleCandidateGroupVM } from '@/state/presenters/hazard-puzzle.engine';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface HazardPuzzleCandidateGroupsProps {
    groups: readonly HazardPuzzleCandidateGroupVM[];
    onPick: (id: string) => void;
}

export function HazardPuzzleCandidateGroups({ groups, onPick }: HazardPuzzleCandidateGroupsProps) {
    const styles = useStyles();
    return (
        <View style={styles.root} testID="hazard-puzzle-candidates">
            <Text style={styles.heading}>{HAZARD_PUZZLE_CANDIDATES_HEADING}</Text>
            <Text style={styles.intro}>{HAZARD_PUZZLE_CANDIDATES_INTRO}</Text>
            {groups.map((group) => (
                <View key={group.band} style={styles.group} testID={group.testID}>
                    <Text style={styles.groupHeading}>{group.heading}</Text>
                    {group.emptyLine !== null ? <Text style={styles.empty}>{group.emptyLine}</Text> : null}
                    {group.items.map((item) => (
                        <Pressable
                            key={item.id}
                            onPress={() => onPick(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.label}. ${item.detail}`}
                            testID={item.testID}
                            style={styles.row}
                        >
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.detail}>{item.detail}</Text>
                        </Pressable>
                    ))}
                </View>
            ))}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { gap: 10, marginTop: 8 },
    heading: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 11, color: AXM.blood, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing},
    intro: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 13, color: AXM.bone, lineHeight: 17 },
    group: { gap: 6 },
    groupHeading: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 11, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.sulfur, marginTop: 4 },
    empty: { fontFamily: TYPE_ROLES.narration.fontFamily, fontStyle: 'italic', fontSize: 12, color: AXM.ash },
    row: { borderWidth: 1, borderColor: AXM.ash, backgroundColor: HUE.hzRouteSafeBg, paddingVertical: 9, paddingHorizontal: 12 },
    label: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 18, lineHeight: 20, color: AXM.parchment, letterSpacing: TYPE_ROLES.title.letterSpacing},
    detail: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 10, color: AXM.bone, marginTop: 3 },
}));
