/**
 * The boxed type tabs between the open card and the deck grid: one tab per card
 * type the run holds, no counts. Drawn from palette tokens only (the Deck
 * screen wears no kit look). The row has a fixed height so it never changes
 * the layout of what sits under it.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DeckGroupVM } from '@/state/presenters/deck.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Fixed height of one tab (pt). */
export const DECK_TAB_HEIGHT = 40;

export interface DeckTypeTabsProps {
    groups: readonly Pick<DeckGroupVM, 'key' | 'label'>[];
    activeKey: string;
    onSelect: (key: DeckGroupVM['key']) => void;
}

export function DeckTypeTabs({ groups, activeKey, onSelect }: DeckTypeTabsProps) {
    const styles = useStyles();
    return (
        <View style={styles.row} accessibilityRole="tablist" testID="deck-type-tabs">
            {groups.map((g) => {
                const selected = g.key === activeKey;
                return (
                    <Pressable
                        key={g.key}
                        style={[styles.tab, selected && styles.tabSelected]}
                        onPress={() => onSelect(g.key)}
                        accessibilityRole="tab"
                        accessibilityLabel={`${g.label} cards`}
                        accessibilityState={{ selected }}
                        testID={`deck-tab-${g.key}`}
                    >
                        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                            {g.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: { flexDirection: 'row', gap: 6, height: DECK_TAB_HEIGHT },
    tab: {
        flex: 1,
        height: DECK_TAB_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
    },
    tabSelected: { borderColor: AXM.sulfur },
    label: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: TYPE_ROLES.chip.fontSize,
        letterSpacing: 0.5,
        color: AXM.bone,
    },
    labelSelected: { color: AXM.sulfur },
}));
