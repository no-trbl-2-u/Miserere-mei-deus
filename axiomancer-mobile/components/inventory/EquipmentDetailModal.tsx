/**
 * EquipmentDetailModal — the long-press card for a worn equipment slot.
 *
 * The card's one action button equips or takes off the piece it describes
 * (`vm.action`, read from `player.equipment`); CLOSE sits beside it.
 *
 * WHY
 * ---
 * Equipment swaps announce which signature skill is gained or lost by name, but
 * outside combat this is the place to learn what that skill does. Long-pressing
 * a filled slot raises this card describing the ITEM — including the exact
 * in-game effect of its signature.
 *
 * LAYOUT (per the owner's sketch)
 * -------------------------------
 *   ┌───────────────────────────────────────────────┐
 *   │ ┌─────────┐  NAME                             │  ← image column | text column
 *   │ │  glyph  │  ┌───────────────────────────┐    │
 *   │ │ (art)   │  │ STAT BLOCK  BODY     +2   │    │  ← stats on top…
 *   │ └─────────┘  └───────────────────────────┘    │
 *   │              ┌───────────────────────────┐    │
 *   │              │ SIGNATURE name · cost     │    │  ← …signature below
 *   │              │ exact effect text         │    │
 *   │              └───────────────────────────┘    │
 *   │   flavour text, no border, below both columns │  ← the one unbordered block
 *   └───────────────────────────────────────────────┘
 *
 * Every block carries a rounded border EXCEPT the flavour text, which sits bare
 * at the foot of the card. The card itself is rounded too.
 *
 * ART
 * ---
 * The image column renders the existing coded `ItemGlyph` placeholder scaled up
 * inside a bordered plate. Per `SVG_ASSET_SPEC.md` every SVG in this codebase is
 * a placeholder; when real per-relic art lands it swaps in here with no other
 * change to this component.
 *
 * PURITY
 * ------
 * Presentational only — all data arrives pre-formatted via
 * `EquipmentDetailViewModel` (see `state/presenters/equipment-detail.engine.ts`).
 */

import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ItemGlyph } from '@/components/inventory/ItemCard';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import type { EquipmentDetailViewModel } from '@/state/presenters/equipment-detail.engine';

interface EquipmentDetailModalProps {
    /** The item to describe, or `null` to keep the modal closed. */
    vm: EquipmentDetailViewModel | null;
    /** Dismiss handler — fired by the backdrop, the CLOSE button, and Android back. */
    onClose: () => void;
    /** Wear the piece; the button shows when `vm.action.mode` is `'equip'`. */
    onEquip?: (itemId: string) => void;
    /** Take the piece off; the button shows when `vm.action.mode` is `'unequip'`. */
    onUnequip?: (itemId: string) => void;
}

/**
 * Render the equipment detail card.
 *
 * @param vm        - Pre-formatted item detail, or `null` (modal stays hidden).
 * @param onClose   - Called whenever the player dismisses the card.
 * @param onEquip   - Called with the item id when the player wears it.
 * @param onUnequip - Called with the item id when the player takes it off.
 */
export function EquipmentDetailModal({ vm, onClose, onEquip, onUnequip }: EquipmentDetailModalProps) {
    const styles = useStyles();
    const onAction = vm === null
        ? undefined
        : vm.action.mode === 'equip' ? onEquip : onUnequip;

    return (
        <Modal
            visible={vm !== null}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            {/* Backdrop press closes; the card swallows its own presses so a tap
                inside the card never dismisses it. */}
            <Pressable style={styles.backdrop} onPress={onClose} testID="equip-detail-backdrop">
                <Pressable style={styles.card} onPress={() => undefined} testID="equipment-detail-modal">
                    {vm !== null && (
                        <ScrollView contentContainerStyle={styles.cardScroll}>
                            {/* ── Two columns: art on the left, facts on the right ── */}
                            <View style={styles.columns}>
                                <View style={styles.artPlate} testID="equip-detail-art">
                                    <ItemGlyph category="equipment" sub={vm.sub} itemId={vm.itemId} />
                                </View>

                                <View style={styles.factsCol}>
                                    <Text style={styles.name} testID="equip-detail-name">{vm.name}</Text>
                                    <Text style={styles.slot}>{vm.slotLabel.toUpperCase()}</Text>

                                    {/* Stats first — what the piece adds to the body. */}
                                    <View style={styles.block} testID="equip-detail-stats">
                                        <Text style={styles.blockEyebrow}>GRANTS</Text>
                                        {vm.statLines.length > 0 ? (
                                            vm.statLines.map((s) => (
                                                <View
                                                    key={s.id}
                                                    style={styles.statRow}
                                                    testID={`equip-detail-stat-${s.id}`}
                                                >
                                                    <Text style={styles.statLabel}>{s.label}</Text>
                                                    <Text style={styles.statValue}>{s.value}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.emptyLine}>No stat modifiers.</Text>
                                        )}
                                    </View>

                                    {/* Then the signature skill: name, cost, exact effect. */}
                                    {vm.signature !== null && (
                                        <View style={styles.block} testID="equip-detail-signature">
                                            <Text style={styles.blockEyebrow}>SIGNATURE SKILL</Text>
                                            <View style={styles.sigHeadRow}>
                                                <Text style={styles.sigName}>{vm.signature.name}</Text>
                                                <Text style={styles.sigCost}>{vm.signature.cost}◆</Text>
                                            </View>
                                            <Text style={styles.sigDesc}>{vm.signature.description}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* The one block with no border: flavour, beneath everything. */}
                            {vm.flavor !== '' && (
                                <Text style={styles.flavor} testID="equip-detail-flavor">
                                    {vm.flavor}
                                </Text>
                            )}

                            <View style={styles.buttonRow}>
                                {onAction !== undefined && (
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        accessibilityLabel={`${vm.action.label} ${vm.name}`}
                                        onPress={() => onAction(vm.itemId)}
                                        style={[styles.closeBtn, styles.actionBtn]}
                                        testID={`equip-detail-${vm.action.mode}`}
                                    >
                                        <Text style={styles.closeText}>{vm.action.label}</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Close item details"
                                    onPress={onClose}
                                    style={styles.closeBtn}
                                    testID="equip-detail-close"
                                >
                                    <Text style={styles.closeText}>CLOSE</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: {
        flex: 1,
        backgroundColor: AXM.shadow,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '86%',
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderRadius: 14,
        borderColor: AXM.parchmentMed,
    },
    cardScroll: {
        padding: 16,
    },
    columns: {
        flexDirection: 'row',
        gap: 12,
    },
    // Square plate holding the item's (placeholder) art.
    artPlate: {
        width: 96,
        height: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 10,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
    },
    factsCol: {
        flex: 1,
        minWidth: 0,
        gap: 8,
    },
    name: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: AXM.parchment,
        letterSpacing: 0.5,
    },
    slot: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        letterSpacing: 1.8,
        color: AXM.bone,
        marginTop: -6,
    },
    // Shared bordered container for the stat block and the signature block.
    block: {
        borderWidth: 1,
        borderRadius: 10,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    blockEyebrow: {
        fontFamily: FONTS.sans,
        fontSize: 8,
        letterSpacing: 1.8,
        color: AXM.sulfur,
        marginBottom: 6,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 1,
    },
    statLabel: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 1,
        color: AXM.bone,
    },
    statValue: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        color: AXM.parchment,
    },
    emptyLine: {
        fontFamily: FONTS.serifItalic,
        fontSize: 11,
        color: AXM.bone,
    },
    sigHeadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
    },
    sigName: {
        flex: 1,
        fontFamily: FONTS.serif,
        fontSize: 13,
        color: AXM.parchment,
    },
    sigCost: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.sulfur,
    },
    sigDesc: {
        fontFamily: FONTS.serif,
        fontSize: 12,
        lineHeight: 17,
        color: AXM.bone,
        marginTop: 5,
    },
    // Deliberately borderless — the owner's one exception to the rounded-edge rule.
    flavor: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        lineHeight: 18,
        color: AXM.bone,
        opacity: 0.85,
        marginTop: 14,
    },
    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 14,
    },
    closeBtn: {
        minHeight: 40,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
        borderColor: AXM.parchmentMed,
    },
    // The action label ("EQUIP · REPLACE <NAME>") can outgrow its hugged
    // content width at narrow viewports; flex so it shares the row instead
    // of overhanging, matching ItemModal.tsx's modalBtn.
    actionBtn: {
        flex: 1,
    },
    closeText: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        letterSpacing: 2.5,
        color: AXM.parchment,
    },
}));
