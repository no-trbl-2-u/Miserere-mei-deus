/**
 * One row in the DECK list: the card, its colour, its rarity, and how many
 * copies of it the run carries. Tap to open the detail.
 *
 * A ROW, not a miniature card face. The combat board already renders the
 * face (`CombatCardFace`), and it is sized for a five-card hand, not a
 * forty-row list — at list density a face is unreadable and a row is
 * scannable. The tile therefore prints the four things a player scans a deck
 * list for (name · what it does · rarity · copies) and leaves the face where
 * it is earned.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RarityMark } from '@/components/deck/RarityMark';
import type { DeckCardVM } from '@/state/presenters/deck.engine';
import { FONTS } from '@/theme/axm';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface DeckCardTileProps {
    card: DeckCardVM;
    onPress: (card: DeckCardVM) => void;
}

export function DeckCardTile({ card, onPress }: DeckCardTileProps) {
    const AXM = usePalette();
    const styles = useStyles();

    return (
        <Pressable
            style={[styles.row, { borderLeftColor: card.rarity.color }]}
            onPress={() => onPress(card)}
            accessibilityRole="button"
            accessibilityLabel={card.a11yLabel}
            accessibilityHint="Opens the card's full text and flavour"
            testID={`deck-card-${card.cardId}`}
        >
            <KitBackdrop piece="quest-row-dark" scale={0.3} />
            <View style={styles.main}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{card.name}</Text>
                    {card.count > 1 && (
                        <Text
                            style={[styles.count, { color: AXM.sulfur }]}
                            testID={`deck-card-count-${card.cardId}`}
                        >
                            ×{card.count}
                        </Text>
                    )}
                </View>
                <Text style={styles.outcome} numberOfLines={2}>{card.outcomeLine}</Text>
            </View>
            <RarityMark
                label={card.rarity.label}
                pips={card.rarity.pips}
                color={card.rarity.color}
                compact
                testID={`deck-card-rarity-${card.cardId}`}
            />
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 15,
        paddingHorizontal: 36,
        marginBottom: 6,
    },
    main: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    name: { flexShrink: 1, fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 0.5, color: AXM.parchment },
    count: { fontFamily: FONTS.mono, fontSize: 12 },
    outcome: { fontFamily: FONTS.serif, fontSize: 13, lineHeight: 17, color: AXM.parchmentDim },
}));
