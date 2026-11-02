/**
 * The DECK screen's card detail — and the new home of card FLAVOR.
 *
 * Owner finding 6 took flavor OUT of the combat card detail: mid-fight, prose
 * sits between the player and the number they are trying to read. Finding 7
 * asked for a deck surface and said flavor lives there. This overlay is that
 * home, so the prose is not deleted from the game, only moved to the one
 * screen where reading it is the whole point.
 *
 * Order is finding 5's, and it matches the hazard deck's detail overlay
 * (`components/hazard/HazardOverlays.tsx`) rather than inventing a second
 * arrangement: KEYWORDS first, then the card, then its lines, then flavour
 * last. A player who does not know what PROLONG means cannot read the line
 * that uses it, so the glossary cannot sit underneath it.
 *
 * Every line rendered here arrives on the view-model already derived from
 * engine data (see `state/presenters/deck.engine.ts`). This component formats;
 * it does not compute, and it must never assemble card text from parts.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardKeywordLedger } from '@/components/card/CardKeywordLedger';
import { RarityMark } from '@/components/deck/RarityMark';
import { SectionLabel } from '@/components/SectionLabel';
import {
    FREE_LINE_LABEL,
    PAID_LINE_LABEL,
    type DeckCardVM,
} from '@/state/presenters/deck.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface DeckCardDetailOverlayProps {
    card: DeckCardVM;
    onClose: () => void;
}

export function DeckCardDetailOverlay({ card, onClose }: DeckCardDetailOverlayProps) {
    const AXM = usePalette();
    const styles = useStyles();

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']} testID="deck-card-detail">
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 1 — KEYWORDS. Definitions before the text that uses them. */}
                <CardKeywordLedger keywords={card.keywords} testID="deck-card-detail-keywords" />

                {/* 2 — the card itself. */}
                <View style={[styles.card, { borderLeftColor: card.rarity.color }]} testID="deck-card-detail-card">
                    <View style={styles.titleRow}>
                        <Text style={styles.name}>{card.name}</Text>
                        {card.count > 1 && (
                            <Text style={[styles.copies, { color: AXM.sulfur }]}>
                                ×{card.count} in deck
                            </Text>
                        )}
                    </View>
                    <View style={styles.rarityRow}>
                        <RarityMark
                            label={card.rarity.label}
                            pips={card.rarity.pips}
                            color={card.rarity.color}
                            testID="deck-card-detail-rarity"
                        />
                    </View>
                    <Text style={styles.outcome}>{card.outcomeLine}</Text>
                </View>

                {/* 3 — the two play lines, in the kept shorthand. */}
                <View style={styles.block}>
                    <View style={styles.line} testID="deck-card-detail-free">
                        <Text style={styles.lineLabel}>{FREE_LINE_LABEL}</Text>
                        <Text style={styles.lineText}>{card.freeText}</Text>
                    </View>
                    {card.paidText !== null && (
                        <View style={styles.line} testID="deck-card-detail-paid">
                            <Text style={[styles.lineLabel, { color: AXM.sulfur }]}>{PAID_LINE_LABEL}</Text>
                            <Text style={styles.lineText}>{card.paidText}</Text>
                        </View>
                    )}
                    {card.stacksText !== null && (
                        <Text style={styles.footnote}>{card.stacksText}</Text>
                    )}
                </View>

                {/* 4 — FLAVOR. The reason finding 6 could take it out of combat. */}
                {card.flavor !== null && card.flavor.length > 0 && (
                    <View style={styles.block}>
                        <SectionLabel size={10} color={AXM.bone}>✠ FLAVOUR</SectionLabel>
                        <Text style={styles.flavor} testID="deck-card-detail-flavor">
                            {card.flavor}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Pressable
                style={styles.closeBar}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={`Close ${card.name}`}
                testID="deck-card-detail-close"
            >
                <Text style={styles.closeLabel}>CLOSE</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 62, backgroundColor: 'rgba(5,4,3,0.97)' },
    content: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 24, gap: 14 },
    block: { gap: 6 },
    card: {
        borderWidth: 1,
        borderColor: AXM.divider,
        borderLeftWidth: 4,
        backgroundColor: AXM.panelBg,
        paddingHorizontal: 12,
        paddingVertical: 11,
        gap: 4,
    },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    name: { flexShrink: 1, fontFamily: FONTS.gothic, fontSize: 22, letterSpacing: 0.5, color: AXM.parchment },
    copies: { fontFamily: FONTS.mono, fontSize: 11 },
    rarityRow: { marginTop: 2 },
    outcome: { fontFamily: FONTS.serif, fontSize: 15, lineHeight: 20, color: AXM.parchment, marginTop: 4 },
    line: { gap: 2 },
    lineLabel: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 2, color: AXM.bone },
    lineText: { fontFamily: FONTS.serif, fontSize: 14, lineHeight: 19, color: AXM.parchment },
    footnote: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone },
    flavor: { fontFamily: FONTS.serifItalic, fontSize: 14, lineHeight: 20, color: AXM.parchmentDim },
    closeBar: {
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    closeLabel: { fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 3, color: AXM.bone },
}));
