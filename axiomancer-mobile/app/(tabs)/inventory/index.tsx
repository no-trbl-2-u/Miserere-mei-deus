import React, { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { StatBar } from '@/components/StatBar';
import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { EquipmentDock } from '@/components/inventory/EquipmentDock';
import { InventoryTabs } from '@/components/inventory/InventoryTabs';
import { ItemGrid } from '@/components/inventory/ItemGrid';
import { EquipmentDetailModal } from '@/components/inventory/EquipmentDetailModal';
import { ItemModal } from '@/components/inventory/ItemModal';
import { SlotBanner } from '@/components/inventory/SlotBanner';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { rowRelicPosition } from '@/state/presenters/loadout';
import {
    selectInventoryViewModel,
    type DockRowId,
    type InventoryTab,
} from '@/state/presenters/inventory.engine';
import {
    selectItemModalViewModel,
    type ItemModalViewModel,
} from '@/state/presenters/inventory.modal.engine';
import {
    selectEquipmentDetailViewModel,
    type EquipmentDetailViewModel,
} from '@/state/presenters/equipment-detail.engine';

export default function InventoryScreen() {
    const AXM = usePalette();
    const styles = useStyles();
    const [activeTab, setActiveTab] = useState<InventoryTab>('all');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [modalItemId, setModalItemId] = useState<string | null>(null);
    // Long-pressing a filled dock slot opens the equipment detail card, whose
    // one button equips or takes off the piece. Separate from `modalItemId`,
    // which drives the ACTION modal (use / equip / unequip).
    const [detailItemId, setDetailItemId] = useState<string | null>(null);
    // Tap a dock row (weapon, armor or one relic position) to filter the sack
    // to pieces that fit it. selectedRow === null when no row is picked;
    // picking a row clears the tab pick (mirrors design — row filter
    // and tab filter are mutually exclusive). Re-tapping the same row
    // clears the pick. Wearing from the sack goes into the picked row.
    const [selectedRow, setSelectedRow] = useState<DockRowId | null>(null);
    const onSelectRow = useCallback((id: DockRowId | null) => {
        setSelectedRow(id);
        if (id !== null) setActiveTab('all');
    }, []);

    // Subscribe to `player` so the screen re-renders on inventory changes.
    // The selector pattern (`useGameState(s => selectVM(s, localUi))`) breaks
    // referential equality because `freezeViewModel` returns a fresh object
    // each call; rebuilding the VM in `useMemo` keyed by `player` avoids the
    // resulting re-render loop.
    const player = useGameState((s) => s.player);
    const store = useGameStore();
    const actions = useGameActions();

    const vm = useMemo(
        () => selectInventoryViewModel(store.getState(), { activeTab, expandedItemId, selectedRow }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [store, activeTab, expandedItemId, selectedRow, player],
    );

    const modalVm = useMemo<ItemModalViewModel | null>(() => {
        if (modalItemId === null) return null;
        return selectItemModalViewModel(store.getState(), modalItemId, selectedRow);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalItemId, store, selectedRow, player]);

    const detailVm = useMemo<EquipmentDetailViewModel | null>(() => {
        if (detailItemId === null) return null;
        return selectEquipmentDetailViewModel(store.getState(), detailItemId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailItemId, store, player]);

    const onConfirmModal = useCallback(() => {
        if (modalVm === null || modalVm.itemId === null) {
            setModalItemId(null);
            return;
        }
        if (modalVm.mode === 'use') {
            actions.useItem(modalVm.itemId);
        } else if (modalVm.mode === 'equip') {
            // With a relic row picked the piece goes into that row; the actions
            // layer ignores the position for a weapon or armor.
            actions.equipItem(modalVm.itemId, rowRelicPosition(selectedRow));
            setSelectedRow(null);
        } else if (modalVm.mode === 'unequip') {
            // Takes the piece off `player.equipment`; its position stays empty.
            actions.unequipItem(modalVm.itemId);
        }
        // mode === 'view' → no dispatch; just dismiss the modal.
        setModalItemId(null);
        setExpandedItemId(null);
    }, [actions, modalVm, selectedRow]);

    // The detail card's button: wear or take off the piece, then close the card.
    const onDetailEquip = useCallback((itemId: string) => {
        actions.equipItem(itemId);
        setDetailItemId(null);
    }, [actions]);
    const onDetailUnequip = useCallback((itemId: string) => {
        actions.unequipItem(itemId);
        setDetailItemId(null);
    }, [actions]);

    const onDiscard = useCallback(
        (itemId: string) => {
            actions.dropItem(itemId);
            setExpandedItemId(null);
        },
        [actions],
    );

    const onItemTap = useCallback((itemId: string) => {
        const item = vm.items.find(it => it.id === itemId);
        if (!item) return;
        
        // For equipment, go directly to modal instead of expanding
        if (item.category === 'equipment' && item.canUse) {
            setModalItemId(itemId);
        } else {
            // For other items, expand to show details first
            setExpandedItemId(expandedItemId === itemId ? null : itemId);
        }
    }, [vm.items, expandedItemId]);

    return (
        // Non-scrolling page — the header / dock / tabs stay fixed and only
        // the item list scrolls, inside its own bordered panel (below).
        <ScreenBg scrollable={false}>
            <View style={styles.header}>
                <SectionLabel size={9} color={AXM.bone}>{vm.sectionHeader}</SectionLabel>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>INVENTORY</Text>
                    <View style={styles.shillingBox}>
                        <Text style={styles.shillingLabel}>PURSE</Text>
                        <Text style={styles.shillingVal}>⚜ {vm.shilling}</Text>
                    </View>
                </View>
                <View style={styles.burdenSection}>
                    {/* Wrap the burden bar in a TooltipTarget pointing
                        at the kind:'burden' content. Tap explains
                        what burden does + the over-cap consequence. */}
                    <TooltipTarget
                        kind="burden"
                        id="burden"
                        accessibilityLabel="Explain burden"
                        accessibilityHint="tap to read description"
                        testID="inventory-burden-tooltip-target"
                    >
                        <StatBar value={vm.burden} max={vm.burdenMax} color={AXM.rust} label="BURDEN · STONE" height={9} />
                    </TooltipTarget>
                </View>
            </View>

            <EquipmentDock
                vm={vm.equipmentDock}
                selectedRow={selectedRow}
                onSelectRow={onSelectRow}
                onShowItemDetail={setDetailItemId}
            />

            {vm.equipmentDock.selectedRow !== null && (
                <SlotBanner
                    bannerEyebrow={vm.equipmentDock.bannerEyebrow}
                    bannerSlotLabel={vm.equipmentDock.bannerSlotLabel}
                    bannerClearLabel={vm.equipmentDock.bannerClearLabel}
                    onClear={() => setSelectedRow(null)}
                />
            )}

            <InventoryTabs
                tabs={vm.tabs}
                activeTab={activeTab}
                onTabPress={setActiveTab}
                dimmed={selectedRow !== null}
            />

            <ItemGrid
                items={vm.items}
                categoryHeaders={vm.categoryHeaders}
                emptyMessage={vm.emptyMessage}
                isEmpty={vm.isEmpty}
                expandedItemId={expandedItemId}
                onItemTap={onItemTap}
                onUseOrEquip={(itemId) => setModalItemId(itemId)}
                onDiscard={onDiscard}
            />

            <ItemModal
                modalVm={modalVm}
                onConfirm={onConfirmModal}
                onCancel={() => setModalItemId(null)}
            />

            <EquipmentDetailModal
                vm={detailVm}
                onClose={() => setDetailItemId(null)}
                onEquip={onDetailEquip}
                onUnequip={onDetailUnequip}
            />
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    header: { padding: 14, paddingBottom: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    title: { fontFamily: FONTS.gothic, fontSize: 28, lineHeight: 30, color: AXM.parchment, marginTop: 2 },
    shillingBox: { alignItems: 'flex-end' },
    shillingLabel: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone, letterSpacing: 1 },
    shillingVal: { fontFamily: FONTS.sans, fontSize: 22, color: AXM.sulfur, lineHeight: 24 },
    burdenSection: {
        marginTop: 8,
    },
}));