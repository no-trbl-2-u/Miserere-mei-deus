/**
 * The open card on the DECK screen (DR1, the Reader): the card's own
 * painting as a banner, its name over the art, its printed lines under it.
 *
 * T's numbers, kept to the half point and not retuned: banner 340 pt tall,
 * covering, the crop anchored at the TOP (a square painting keeps its face and
 * weapon and loses its bottom), name 23 pt, lines 15 pt (T, 2026-11-10: down from 16.5 so the longest card fits the vellum unscrolled).
 *
 * The whole block is a FIXED height (`OPEN_CARD_HEIGHT`): the lines area
 * scrolls inside its own box rather than growing, so whatever sits under the
 * open card (the type tabs, 155.3) is at the same place whichever card is open.
 *
 * The lines sit on the Spoils' vellum panel (`modal-panel-vellum`, T,
 * 2026-11-10) in the Spoils' inks: iron-gall body, oxblood keywords.
 *
 * Lines arrive as `DeckLineVM`s (an optional label, then ordered runs); this
 * component assembles no card text. Keyword runs are pressable spans: tap
 * for the gloss, hold to pin it.
 */

import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SPOILS_INK } from '@/components/combat/encounter/spoils-ink';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { useTooltip } from '@/hooks/useTooltip';
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
                <Text style={styles.name} numberOfLines={2} testID="deck-open-card-name">
                    {card.name}
                </Text>
            </View>
            <View style={styles.textBox} testID="deck-open-card-vellum">
                <KitBackdrop piece="modal-panel-vellum" />
            <ScrollView
                style={styles.textScroll}
                contentContainerStyle={styles.textContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                testID="deck-open-card-lines"
            >
                {card.lines.map((line, i) => (
                    <Line key={`${line.label}-${i}`} line={line} index={i} />
                ))}
                {card.stacksText !== null && (
                    <Text style={styles.footnote} testID="deck-open-card-stacks">{card.stacksText}</Text>
                )}
            </ScrollView>
            </View>
        </View>
    );
}

function Line({ line, index }: { line: DeckLineVM; index: number }) {
    const styles = useStyles();
    // A nested Text cannot be measured reliably on native, so the gloss is
    // anchored to the line's own block.
    const anchorRef = useRef<View | null>(null);
    return (
        <View ref={anchorRef} style={styles.line} testID={`deck-open-card-line-${index}`}>
            <Text style={styles.lineText}>
                {line.runs.map((run, i) => (
                    <RunText key={i} run={run} anchorRef={anchorRef} />
                ))}
            </Text>
        </View>
    );
}

/**
 * One run, in order. A keyword run is a nested Text in the keyword's ink: a
 * tap shows its gloss over the line, a hold pins it.
 */
function RunText({ run, anchorRef }: { run: DeckRunVM; anchorRef: React.RefObject<View | null> }) {
    const styles = useStyles();
    const tooltip = useTooltip();
    if (run.kind === 'text') return <Text>{run.text}</Text>;
    if (run.kind === 'label') return <Text style={styles.lineLabel}>{run.text}</Text>;
    const show = (pinned: boolean) =>
        tooltip.show({ kind: 'card-keyword', id: run.keyword, anchorRef, pinned });
    return (
        <Text
            style={[styles.keyword, run.minor ? styles.keywordMinor : null]}
            onPress={() => show(false)}
            onLongPress={() => show(true)}
            accessibilityRole="link"
            accessibilityLabel={run.word}
            accessibilityHint={run.minor ? `${run.gloss} (minor right now)` : run.gloss}
            testID={`deck-keyword-${run.keyword}`}
        >
            {run.word}
        </Text>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { height: OPEN_CARD_HEIGHT, marginBottom: 14, backgroundColor: AXM.panelBg },
    art: { height: OPEN_CARD_ART_HEIGHT, overflow: 'hidden', justifyContent: 'flex-end' },
    name: {
        fontFamily: TYPE_ROLES.cardName.fontFamily,
        fontSize: 23,
        lineHeight: 28,
        color: AXM.parchment,
        paddingHorizontal: 14,
        paddingBottom: 12,
        // No band under the name: a soft shadow keeps it legible over the painting.
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowRadius: 8,
        textShadowOffset: { width: 0, height: 1 },
    },
    // The vellum panel draws 26pt of ornament top and bottom and 42pt a side
    // (741x437 art at 0.3); the scroll is inset to clear it.
    textBox: { height: OPEN_CARD_TEXT_HEIGHT, marginHorizontal: 4 },
    textScroll: { flex: 1, marginHorizontal: 34, marginVertical: 22 },
    textContent: { paddingVertical: 2, gap: 4 },
    line: {},
    lineLabel: { fontFamily: TYPE_ROLES.chip.fontFamily, fontSize: 13, color: SPOILS_INK.soft },
    lineText: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 15,
        lineHeight: 19,
        color: SPOILS_INK.body,
    },
    keyword: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 15,
        lineHeight: 19,
        color: SPOILS_INK.accent,
        textDecorationLine: 'underline',
    },
    keywordMinor: { color: SPOILS_INK.soft },
    footnote: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, lineHeight: 18, color: SPOILS_INK.soft },
}));
