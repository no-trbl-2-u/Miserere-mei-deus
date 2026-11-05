import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FONTS } from '@/theme/axm';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { makeStyles } from '@/theme/runtime';
import type { InventoryTab, InventoryTabRow } from '@/state/presenters/inventory.engine';

interface InventoryTabsProps {
    tabs: readonly InventoryTabRow[];
    activeTab: InventoryTab;
    onTabPress: (tab: InventoryTab) => void;
    dimmed?: boolean;
}

export function InventoryTabs({ tabs, activeTab, onTabPress, dimmed = false }: InventoryTabsProps) {
    const styles = useStyles();
    return (
        <View style={[styles.tabRow, dimmed && styles.tabRowDimmed]}>
            {tabs.map((t) => (
                <TouchableOpacity
                    key={t.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label}, ${t.count === 0 ? 'empty' : `${t.count} ${t.count === 1 ? 'item' : 'items'}`}`}
                    accessibilityState={{ selected: activeTab === t.key }}
                    onPress={() => onTabPress(t.key)}
                    style={[styles.tab, activeTab === t.key && styles.tabActive]}
                    testID={`tab-${t.key}`}
                >
                    <KitBackdrop piece={activeTab === t.key ? 'filter-tab-dark-selected' : 'filter-tab-dark-idle'} />
                    <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                        {t.label}
                    </Text>
                    {/* Always show the count. A tab with a bare word beside tabs
                      * that carry numbers reads as a tab that failed to load
                      * rather than one that is empty. A zero renders dimmed so
                      * "empty" still looks different from "has things in it". */}
                    <View style={styles.tabCountWell}>
                        <KitBackdrop piece="nav-count-round-dark" />
                    <Text
                        numberOfLines={1}
                        allowFontScaling={false}
                        style={[
                            styles.tabCount,
                            activeTab === t.key && styles.tabCountActive,
                            t.count === 0 && styles.tabCountEmpty,
                        ]}
                    >
                        {t.count}
                    </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: 10,
        marginBottom: 6,
        gap: 1,
    },
    tabRowDimmed: {
        opacity: 0.4,
        pointerEvents: 'none',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    tabActive: {},
    tabCountWell: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    tabText: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        color: AXM.bone,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    tabTextActive: {
        color: AXM.parchment,
    },
    // The badge keeps a single-digit minimum but may not shrink or wrap, so
    // a two-digit count stays on one line inside the pill.
    tabCount: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: AXM.bone,
        flexShrink: 0,
        textAlign: 'center',
    },
    tabCountActive: {
        color: AXM.parchment,
    },
    // An empty tab still shows its 0, just quietly.
    tabCountEmpty: {
        opacity: 0.45,
    },
}));