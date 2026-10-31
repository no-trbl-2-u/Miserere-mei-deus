import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { AxmIcon } from '@/components/icons/AxmIcon';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { SectionLabel } from '@/components/SectionLabel';
import { CATEGORY_ORDER, groupByCategory, ItemCard } from '@/components/inventory/ItemCard';
import type { InventoryItemRow } from '@/state/presenters/inventory.engine';

interface EmptySackProps {
    message: string;
}

function EmptySack({ message }: EmptySackProps) {
    const styles = useStyles();
    const AXM = usePalette();
    return (
        <View style={styles.emptyOuter} testID="inventory-empty">
            <AxmIcon name="action-bag" size={64} color={AXM.bone} />
            <Text style={styles.emptyText}>{message}</Text>
        </View>
    );
}

interface ItemGridProps {
    items: readonly InventoryItemRow[];
    categoryHeaders: Record<string, string>;
    emptyMessage: string;
    isEmpty: boolean;
    expandedItemId: string | null;
    onItemTap: (itemId: string) => void;
    onUseOrEquip: (itemId: string) => void;
    onDiscard: (itemId: string) => void;
}

export function ItemGrid({
    items,
    categoryHeaders,
    emptyMessage,
    isEmpty,
    expandedItemId,
    onItemTap,
    onUseOrEquip,
    onDiscard,
}: ItemGridProps) {
    // vm.items already accounts for slot-filter vs tab-filter on the
    // presenter side (sub-tick F lifted the inline SLOT_KEY_TO_SUB map
    // onto the presenter as `filterRowsBySlot`). Screen consumes
    // vm.items unconditionally now.
    const styles = useStyles();
    const grouped = useMemo(() => groupByCategory(items), [items]);

    if (isEmpty) {
        return (
            <View style={styles.panel}>
                <EmptySack message={emptyMessage} />
            </View>
        );
    }

    // Contained scroll: the list scrolls inside this bordered panel rather
    // than scrolling the whole Satchel screen.
    return (
        <View style={styles.panel}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                testID="inventory-scroll"
            >
                {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => (
                    <View key={cat} style={styles.categorySection}>
                        <SectionLabel size={11}>{categoryHeaders[cat]}</SectionLabel>
                        <View style={styles.grid}>
                            {grouped[cat].map((it) => (
                                <ItemCard
                                    key={it.id}
                                    item={it}
                                    expanded={expandedItemId === it.id}
                                    onTap={() => onItemTap(it.id)}
                                    onUseOrEquip={() => onUseOrEquip(it.id)}
                                    onDiscard={() => onDiscard(it.id)}
                                />
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    emptyOuter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontFamily: FONTS.serifItalic,
        fontSize: 13,
        color: AXM.bone,
        textAlign: 'center',
    },
    panel: {
        flex: 1,
        marginHorizontal: 10,
        marginTop: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 10,
    },
    categorySection: {
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
}));