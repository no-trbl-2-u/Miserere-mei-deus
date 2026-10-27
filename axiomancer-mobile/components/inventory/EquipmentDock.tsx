import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { SectionLabel } from '@/components/SectionLabel';
import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { EquipmentSlot } from './EquipmentSlot';
import type { EquipmentDockViewModel, EquipmentDockSlot } from '@/state/presenters/inventory.engine';

/** Stable React key per dock slot (the 3 relic rows share a slot key, so
 *  fold in `relicIndex` to disambiguate — mirrors EquipmentSlot's testID). */
function dockSlotKey(slot: EquipmentDockSlot): string {
    return slot.relicIndex !== undefined ? `${slot.key}-${slot.relicIndex}` : slot.key;
}

/** Viewport width (pt) at or above which the dock stops being width-starved:
 *  past this the five slot rows have points to spare, so the bust is art again
 *  rather than a gutter. Set above tablet-portrait widths, where the slot
 *  column still needs every point it won. */
const WIDE_DOCK_MIN_WIDTH = 900;

/**
 * The pilgrim bust's box inside the equipment dock, chosen from the viewport
 * width.
 *
 * Purpose: the portrait sources are square (512x512) drawn with `fit="contain"`,
 * so a box taller than it is wide letterboxes the art into dead black instead of
 * showing more pilgrim — the 96x260 column the C11 fix left behind was ~70% empty.
 * The box is therefore always square, and scaled to the room the dock has: at
 * phone widths the gear list keeps the width it won (the "grants <signature>"
 * sub-label must not truncate mid-word again), so the bust stays a narrow gutter;
 * at desktop widths, where no sub-label ever wrapped, the bust reads as art again.
 *
 * Inputs: `viewportWidth` — window width in points (from `useWindowDimensions`).
 * Outputs: `{ width, height }` in points, width === height.
 * Resolves: 07-inventory-fresh / 08-inventory-midgame portrait collapse (mobile
 * dead column, desktop thumbnail).
 */
export function equipmentDockPortraitBox(viewportWidth: number): { width: number; height: number } {
    const side = viewportWidth >= WIDE_DOCK_MIN_WIDTH ? 300 : 112;
    return { width: side, height: side };
}

interface EquipmentDockProps {
    vm: EquipmentDockViewModel;
    selectedSlot: EquipmentDockSlot['key'] | null;
    onSelectSlot: (key: EquipmentDockSlot['key'] | null) => void;
    /** Long-press pass-through: a filled slot asks the screen to open the
     *  equipment detail card for the worn item's id. */
    onShowItemDetail?: (itemId: string) => void;
}

/**
 * The WORN UPON THE BODY panel: pilgrim bust on the left, the five worn slots
 * stacked on the right.
 *
 * Inputs: `vm` (dock view model — labels + slot rows), `selectedSlot` (the slot
 * key currently being fitted, or null), `onSelectSlot` (slot press handler).
 * Outputs: the dock view. Resolves: 07-inventory-fresh / 08-inventory-midgame —
 * the portrait box is sized per viewport by `equipmentDockPortraitBox`.
 */
export function EquipmentDock({
    vm,
    selectedSlot,
    onSelectSlot,
    onShowItemDetail,
}: EquipmentDockProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const { width: viewportWidth } = useWindowDimensions();
    const portraitBox = equipmentDockPortraitBox(viewportWidth);

    return (
        <View style={styles.dock} testID="equipment-dock">
            {/* iron rivets in each corner */}
            {[
                [4, 4],
                [undefined, 4],
                [4, undefined],
                [undefined, undefined],
            ].map(([left, top], i) => (
                <View
                    key={i}
                    style={[
                        styles.dockRivet,
                        left !== undefined ? { left } : { right: 4 },
                        top !== undefined ? { top } : { bottom: 4 },
                    ]}
                />
            ))}
            <View style={styles.dockHeaderRow}>
                <SectionLabel size={9} color={AXM.bone}>{vm.headerLabel}</SectionLabel>
                <Text style={styles.dockHint}>{vm.hintLabel}</Text>
            </View>
            {/* Portrait on the left, all 5 worn slots stacked in a single column
                on the right. */}
            <View style={styles.dockGrid}>
                <View
                    style={[styles.dockPortrait, { width: portraitBox.width }]}
                    testID="equipment-dock-portrait"
                >
                    <PlayerPortraitImage
                        width="100%"
                        height={portraitBox.height}
                        fit="contain"
                        contentPosition="center"
                    />
                </View>
                <View style={styles.dockCol} testID="equipment-dock-slots">
                    {vm.slots.map((slot) => (
                        <EquipmentSlot
                            key={dockSlotKey(slot)}
                            slot={slot}
                            bareLabel={vm.bareLabel}
                            selected={selectedSlot === slot.key}
                            onPress={onSelectSlot}
                            onShowItemDetail={onShowItemDetail}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    dock: {
        position: 'relative',
        marginHorizontal: 10,
        marginVertical: 8,
        borderWidth: 2,
        borderColor: AXM.divider,
        backgroundColor: AXM.deepBg,
        padding: 10,
    },
    dockRivet: {
        position: 'absolute',
        width: 6,
        height: 6,
        backgroundColor: AXM.ash,
        borderRadius: 3,
    },
    dockHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    dockHint: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.bone,
        letterSpacing: 0.8,
    },
    dockGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dockCol: {
        // The gear list is the information in this dock, so it takes every
        // point the portrait does not claim; an even split leaves each row
        // too narrow and the grants sub-label breaks mid-word.
        flex: 1,
        alignItems: 'stretch',
    },
    dockPortrait: {
        // A fixed box instead of flex:1 — the bust never reclaims
        // half the panel from the five named slots. The width itself is set
        // inline from `equipmentDockPortraitBox` (viewport-dependent).
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));
