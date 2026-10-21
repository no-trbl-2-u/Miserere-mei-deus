/**
 * The dev-menu HAZARD PUZZLES list: one row per demo puzzle, drawn in the
 * hazard palette (the route select's top strip and panel stock), then the
 * labelled candidates grouped by intended band. Picking a demo opens its
 * route pick; picking a candidate starts it on its nominated route.
 */

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
    HAZARD_PUZZLE_DEMOS_HEADING,
    HAZARD_PUZZLE_LIST_INTRO,
    HAZARD_PUZZLE_LIST_TITLE,
} from '@/state/presenters/hazard-puzzle.copy';
import type { HazardPuzzleCandidateGroupVM, HazardPuzzleListItemVM } from '@/state/presenters/hazard-puzzle.engine';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

import { Cracks } from '../glyphs';
import { HazardPuzzleCandidateGroups } from './HazardPuzzleCandidateGroups';

export interface HazardPuzzleListProps {
    items: readonly HazardPuzzleListItemVM[];
    onPick: (id: string) => void;
    /** The candidate groups; omitted, the list shows the demos alone. */
    candidateGroups?: readonly HazardPuzzleCandidateGroupVM[];
    onPickCandidate?: (id: string) => void;
}

export function HazardPuzzleList({ items, onPick, candidateGroups, onPickCandidate }: HazardPuzzleListProps) {
    const styles = useStyles();
    return (
        <View style={styles.root} testID="hazard-puzzle-list">
            <View style={styles.topStrip}>
                <Text style={styles.topStripText}>◆ {HAZARD_PUZZLE_LIST_TITLE} ◆</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
                {candidateGroups ? <Text style={styles.heading}>{HAZARD_PUZZLE_DEMOS_HEADING}</Text> : null}
                <Text style={styles.intro}>{HAZARD_PUZZLE_LIST_INTRO}</Text>
                {items.map((item, i) => (
                    <Pressable
                        key={item.id}
                        onPress={() => onPick(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title}. ${item.bandChip}`}
                        testID={item.testID}
                        style={styles.row}
                    >
                        <Cracks seed={3 + i} opacity={0.3} />
                        <Text style={styles.band}>{item.bandChip}</Text>
                        <Text style={styles.title}>{item.title}</Text>
                    </Pressable>
                ))}
                {candidateGroups && onPickCandidate ? (
                    <HazardPuzzleCandidateGroups groups={candidateGroups} onPick={onPickCandidate} />
                ) : null}
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: HUE.routeBg },
    topStrip: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        backgroundColor: HUE.black,
        borderBottomWidth: 1,
        borderBottomColor: AXM.ash,
        alignItems: 'center',
    },
    topStripText: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.blood, letterSpacing: 2 },
    content: { padding: 12, gap: 10, paddingBottom: 32 },
    heading: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.blood, letterSpacing: 2 },
    intro: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.bone, lineHeight: 17 },
    row: { borderWidth: 2, borderColor: AXM.ash, backgroundColor: HUE.hzRouteSafeBg, padding: 13, overflow: 'hidden' },
    band: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.6, color: AXM.sulfur },
    title: { fontFamily: FONTS.gothic, fontSize: 24, lineHeight: 25, color: AXM.parchment, letterSpacing: 0.5, marginTop: 6 },
}));
