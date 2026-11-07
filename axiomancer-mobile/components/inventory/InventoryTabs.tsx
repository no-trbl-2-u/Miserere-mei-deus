import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { KitBackdrop, VELLUM_INK, VELLUM_OXBLOOD } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import type { InventoryTab, InventoryTabRow } from '@/state/presenters/inventory.engine';

/** B-05: the filter tabs sit on vellum, inked, where T kept the kit; otherwise today's code. */
const VELLUM_TABS = lookOf('B-05') === 'vellum';

/**
 * A zero count on vellum: a lighter ink at 90% opacity. Today's 45% fade would
 * drop it under 4.5:1 on the parchment, so it is told apart by a lighter brown
 * and kept readable (the vellum-ink test measures the blended colour).
 */
export const VELLUM_INK_QUIET = HUE.vellumInkQuiet;
export const VELLUM_EMPTY_OPACITY = 0.9;

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
                    style={[styles.tab, activeTab === t.key && styles.tabActive, VELLUM_TABS && styles.tabVellum, VELLUM_TABS && activeTab === t.key && styles.tabVellumActive]}
                    testID={`tab-${t.key}`}
                >
                    {VELLUM_TABS && <KitBackdrop piece="filter-tab-vellum" />}
                    <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive, VELLUM_TABS && styles.inkText, VELLUM_TABS && activeTab === t.key && styles.inkTextActive]}>
                        {t.label}
                    </Text>
                    {/* Always show the count. A tab with a bare word beside tabs
                      * that carry numbers reads as a tab that failed to load
                      * rather than one that is empty. A zero renders dimmed so
                      * "empty" still looks different from "has things in it". */}
                    <Text
                        numberOfLines={1}
                        allowFontScaling={false}
                        style={[
                            styles.tabCount,
                            activeTab === t.key && styles.tabCountActive,
                            t.count === 0 && styles.tabCountEmpty,
                            VELLUM_TABS && styles.inkCount,
                            VELLUM_TABS && activeTab === t.key && styles.inkTextActive,
                            VELLUM_TABS && t.count === 0 && styles.inkCountEmpty,
                        ]}
                    >
                        {t.count}
                    </Text>
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
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.divider,
        borderBottomWidth: 2,
    },
    tabActive: {
        backgroundColor: AXM.bg,
        borderBottomColor: AXM.sulfur,
    },
    // Vellum: the piece draws the tab; the label is inked and the picked tab is
    // told by oxblood ink and a rule under its words.
    tabVellum: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 2, borderBottomColor: 'transparent', paddingVertical: 10 },
    tabVellumActive: { borderBottomColor: VELLUM_OXBLOOD },
    inkText: { color: VELLUM_INK },
    inkTextActive: { color: VELLUM_OXBLOOD },
    inkCount: { color: VELLUM_INK, backgroundColor: 'transparent' },
    inkCountEmpty: { color: VELLUM_INK_QUIET, opacity: VELLUM_EMPTY_OPACITY },
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
        color: AXM.ash,
        backgroundColor: AXM.deepBg,
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 1,
        minWidth: 16,
        flexShrink: 0,
        textAlign: 'center',
    },
    tabCountActive: {
        color: AXM.bone,
        backgroundColor: AXM.panelBg,
    },
    // An empty tab still shows its 0, just quietly.
    tabCountEmpty: {
        opacity: 0.45,
    },
}));