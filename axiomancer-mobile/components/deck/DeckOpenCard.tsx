/**
 * The open card on the DECK screen (spec 155, the Reader): the card's own
 * painting as a banner, its name over the art, its printed lines under it.
 *
 * T's numbers, kept to the half point and not retuned: banner 340 pt tall,
 * covering, the crop anchored at the TOP (a square painting keeps its face and
 * weapon and loses its bottom), name 23 pt, lines 16.5 pt.
 *
 * The whole block is a FIXED height (`OPEN_CARD_HEIGHT`): the lines area
 * scrolls inside its own box rather than growing, so whatever sits under the
 * open card (the type tabs, 155.3) is at the same place whichever card is open.
 *
 * Lines arrive as `DeckLineVM`s (an optional label, then ordered runs); this
 * component assembles no card text. 155.4 adds keyword runs to `DeckRunVM`
 * and renders them as pressable spans in `RunText`.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Image } from '@/lib/platform/image';
import type { DeckCardVM, DeckLineVM, DeckRunVM } from '@/state/presenters/deck.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** T's banner height (pt). */
export const OPEN_CARD_ART_HEIGHT = 340;
/** Room for the lines under the art; they scroll inside it when longer. */
export const OPEN_CARD_TEXT_HEIGHT = 168;
/** The fixed height of the whole open-card block. */
export const OPEN_CARD_HEIGHT = OPEN_CARD_ART_HEIGHT + OPEN_CARD_TEXT_HEIGHT;

export interface DeckOpenCardProps {
    card: DeckCardVM;
}

export function DeckOpenCard({ card }: DeckOpenCardProps) {
    const styles = useStyles();

    return (
        <View style={styles.root} testID="deck-open-card" accessibilityLabel={card.a11yLabel} accessible={false}>
            <View style={styles.art} testID="deck-open-card-art">
                <Image
                    source={card.art}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    contentPosition="top"
                    transition={0}
                />
                <View style={styles.nameScrim} pointerEvents="none" />
                <Text style={styles.name} numberOfLines={2} testID="deck-open-card-name">
                    {card.name}
                </Text>
            </View>
            <ScrollView
                style={styles.textBox}
                contentContainerStyle={styles.textContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                testID="deck-open-card-lines"
            >
                {card.lines.map((line, i) => (
                    <Line key={`${line.label ?? 'outcome'}-${i}`} line={line} index={i} />
                ))}
                {card.stacksText !== null && (
                    <Text style={styles.footnote} testID="deck-open-card-stacks">{card.stacksText}</Text>
                )}
            </ScrollView>
        </View>
    );
}

function Line({ line, index }: { line: DeckLineVM; index: number }) {
    const styles = useStyles();
    return (
        <View style={styles.line} testID={`deck-open-card-line-${index}`}>
            {line.label !== null && <Text style={styles.lineLabel}>{line.label}</Text>}
            <Text style={styles.lineText}>
                {line.runs.map((run, i) => (
                    <RunText key={i} run={run} />
                ))}
            </Text>
        </View>
    );
}

/** One run, in order. 155.4 branches here on `run.kind === 'keyword'`. */
function RunText({ run }: { run: DeckRunVM }) {
    return <Text>{run.text}</Text>;
}

const useStyles = makeStyles((AXM) => ({
    root: { height: OPEN_CARD_HEIGHT, marginBottom: 14, backgroundColor: AXM.panelBg },
    art: { height: OPEN_CARD_ART_HEIGHT, overflow: 'hidden', justifyContent: 'flex-end' },
    nameScrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 96,
        backgroundColor: 'rgba(5,4,3,0.55)',
    },
    name: {
        fontFamily: TYPE_ROLES.cardName.fontFamily,
        fontSize: 23,
        lineHeight: 28,
        color: AXM.parchment,
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    textBox: { height: OPEN_CARD_TEXT_HEIGHT },
    textContent: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
    line: { gap: 2 },
    lineLabel: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 12, letterSpacing: 1, color: AXM.bone },
    lineText: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 16.5,
        lineHeight: 23,
        color: AXM.parchment,
    },
    footnote: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, lineHeight: 18, color: AXM.bone },
}));
