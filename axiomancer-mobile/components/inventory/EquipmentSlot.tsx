import React, { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import { useTooltip } from '@/hooks/useTooltip';
import type { EquipmentDockSlot } from '@/state/presenters/inventory.engine';

interface EquipmentSlotProps {
    slot: EquipmentDockSlot | null;
    bareLabel: string;
    selected: boolean;
    onPress: (key: EquipmentDockSlot['key'] | null) => void;
    /**
     * Long-press handler for a FILLED slot.
     * Receives the worn item's engine id; the screen resolves it into the
     * equipment detail card. Optional — when omitted (or when the slot is
     * empty) the long press falls back to the `kind:'slot'` tooltip, which
     * is the only information an EMPTY slot has to give.
     */
    onShowItemDetail?: (itemId: string) => void;
}

export function EquipmentSlot({
    slot,
    bareLabel,
    selected,
    onPress,
    onShowItemDetail,
}: EquipmentSlotProps) {
    // Long-press behaviour: on a FILLED slot
    // it opens the equipment detail card — the only place outside combat where
    // a signature skill's real effect can be read. On an EMPTY slot there is no
    // item to describe, so it raises the `kind:'slot'` tooltip.
    // Single-tap selects the slot filter.
    const styles = useStyles();
    const tooltip = useTooltip();
    const slotRef = useRef<View | null>(null);

    if (slot === null) {
        return <View style={styles.dockSlotEmpty} />;
    }
    
    const filled = slot.item !== null;
    // The three relic rows share `key: 'relic'`; disambiguate the
    // testID / a11y identity by position so each of the 5 rows is unique.
    const slotId = slot.relicIndex !== undefined ? `${slot.key}-${slot.relicIndex}` : slot.key;

    return (
        <TouchableOpacity
            ref={slotRef}
            accessibilityRole="button"
            accessibilityLabel={`${slot.label} slot${filled && slot.item ? `, ${slot.item.name}` : ', empty'}`}
            accessibilityHint={filled ? 'hold to inspect this item' : 'hold to read slot description'}
            accessibilityState={{ selected }}
            onPress={() => onPress(selected ? null : slot.key)}
            onLongPress={() => {
                const wornId = slot.item?.id;
                if (wornId !== undefined && onShowItemDetail !== undefined) {
                    onShowItemDetail(wornId);
                    return;
                }
                tooltip.show({ kind: 'slot', id: slot.key, anchorRef: slotRef });
            }}
            style={[
                styles.dockSlot,
                filled ? styles.dockSlotFilled : styles.dockSlotBare,
                selected && styles.dockSlotSelected,
            ]}
            testID={`dock-slot-${slotId}`}
        >
            <View style={[styles.dockSlotGlyph, filled ? styles.dockSlotGlyphFilled : styles.dockSlotGlyphBare]}>
                {filled && slot.item !== null ? (
                    <ItemGlyph category="equipment" sub={slot.item.sub} itemId={slot.item.id} />
                ) : (
                    <Text style={styles.dockSlotEmptyMark}>∅</Text>
                )}
            </View>
            <View style={styles.dockSlotText}>
                <Text style={styles.dockSlotLabel}>{slot.label}</Text>
                <Text
                    numberOfLines={1}
                    style={filled ? styles.dockSlotItemName : styles.dockSlotItemBare}
                >
                    {filled && slot.item !== null ? slot.item.name : bareLabel}
                </Text>
                {filled && slot.item?.grantsSignature ? (
                    <Text numberOfLines={1} style={styles.dockSlotSignature}>
                        grants {slot.item.grantsSignature}
                    </Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const useStyles = makeStyles((AXM) => ({
    dockSlotEmpty: {
        height: 64,
    },
    dockSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 64,
        borderWidth: 1,
        borderColor: AXM.divider,
        marginBottom: 6,
        backgroundColor: AXM.panelBg,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    dockSlotFilled: {
        borderColor: AXM.sulfur,
        backgroundColor: AXM.bg,
    },
    dockSlotBare: {
        backgroundColor: AXM.panelBg,
        borderStyle: 'dashed',
    },
    dockSlotSelected: {
        borderWidth: 2,
        borderColor: AXM.bone,
    },
    dockSlotGlyph: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    dockSlotGlyphFilled: {
        borderColor: AXM.bone,
        backgroundColor: AXM.panelBg,
    },
    dockSlotGlyphBare: {
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
    },
    dockSlotEmptyMark: {
        fontFamily: FONTS.mono,
        fontSize: 20,
        color: AXM.ash,
        lineHeight: 22,
    },
    dockSlotText: {
        flex: 1,
        minWidth: 0,
    },
    dockSlotLabel: {
        fontFamily: FONTS.sans,
        fontSize: 9,
        color: AXM.bone,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        lineHeight: 12,
    },
    dockSlotItemName: {
        fontFamily: FONTS.serif,
        fontSize: 12,
        color: AXM.parchment,
        lineHeight: 14,
    },
    dockSlotItemBare: {
        fontFamily: FONTS.serifItalic,
        fontSize: 12,
        color: AXM.bone,
        lineHeight: 14,
    },
    // Signet relic's granted signature, a quiet sub-label.
    dockSlotSignature: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        color: AXM.sulfur,
        letterSpacing: 0.6,
        lineHeight: 13,
    },
}));