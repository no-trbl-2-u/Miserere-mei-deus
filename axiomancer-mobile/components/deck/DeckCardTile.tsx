/**
 * One thumbnail in the DECK grid: the card's painting, its name, a copies
 * badge when the run carries more than one, and its colour mark. Tap to open
 * the card at the top of the screen; a card that is not the open one is dimmed.
 *
 * A painting, not a card face. The combat board renders the face
 * (`CombatCardFace`), sized for a five-card hand; at grid density a face is
 * unreadable, but a square painting with a name under it is, and that is what
 * makes the thumbnail work. The screen-reader label still names the rarity,
 * so nothing here leans on colour alone.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Image } from '@/lib/platform/image';
import type { DeckCardVM } from '@/state/presenters/deck.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** A thumbnail that is not the open card. */
export const DIMMED_OPACITY = 0.45;

export interface DeckCardTileProps {
    card: DeckCardVM;
    onPress: (card: DeckCardVM) => void;
    /** True when this is the card open above; every other thumbnail is dimmed. */
    open?: boolean;
    /** Side of the square in pt; omitted, the tile takes a quarter of the row. */
    size?: number;
}

export function DeckCardTile({ card, onPress, open = false, size }: DeckCardTileProps) {
    const AXM = usePalette();
    const styles = useStyles();

    return (
        <Pressable
            style={[
                styles.tile,
                size !== undefined ? { width: size, height: size } : styles.tileFluid,
                { opacity: open ? 1 : DIMMED_OPACITY },
            ]}
            onPress={() => onPress(card)}
            accessibilityRole="button"
            accessibilityLabel={card.a11yLabel}
            accessibilityHint="Opens this card at the top of the screen"
            accessibilityState={{ selected: open }}
            testID={`deck-card-${card.cardId}`}
        >
            <Image source={card.art} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={0} />
            <View style={styles.nameScrim} pointerEvents="none" />
            <Text style={styles.name} numberOfLines={2}>{card.name}</Text>
            <View
                style={[styles.mark, { backgroundColor: card.stanceColor }]}
                testID={`deck-card-mark-${card.cardId}`}
            />
            {card.count > 1 && (
                <View style={styles.badge}>
                    <Text
                        style={[styles.count, { color: AXM.sulfur }]}
                        testID={`deck-card-count-${card.cardId}`}
                    >
                        ×{card.count}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    tile: {
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
    },
    tileFluid: { width: '23.5%', aspectRatio: 1 },
    nameScrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '45%',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    name: {
        position: 'absolute',
        left: 4,
        right: 4,
        bottom: 3,
        fontFamily: TYPE_ROLES.cardName.fontFamily,
        fontSize: 11,
        lineHeight: 13,
        color: AXM.parchment,
    },
    mark: { position: 'absolute', left: 0, top: 0, width: 10, height: 10 },
    badge: {
        position: 'absolute',
        right: 0,
        top: 0,
        paddingHorizontal: 4,
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    count: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 11 },
}));
