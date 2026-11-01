import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { SectionLabel } from '@/components/SectionLabel';
import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { GestureDetector } from 'react-native-gesture-handler';
import { EquipmentSlot } from './EquipmentSlot';
import type { DockDragController } from './useDockDrag';
import type { DockRowId, EquipmentDockViewModel, EquipmentDockSlot } from '@/state/presenters/inventory.engine';
import type { DockDragPayload } from '@/state/presenters/inventory.drag';

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

/** Share of the dock's inner width the slot column takes below the wide layout. */
const SLOT_COLUMN_SHARE = 0.55;

/** Gap between the bust and the slot column (pt); matches the dock grid's `gap`. */
const DOCK_GRID_GAP = 12;

/** Width the dock's own chrome takes from the viewport (pt): the margin, border
 *  and padding on both sides (10 + 2 + 10 each). */
const DOCK_CHROME_WIDTH = 44;

/** The dock's inner width (pt) for a viewport width. */
function dockInnerWidth(viewportWidth: number): number {
    return Math.max(0, viewportWidth - DOCK_CHROME_WIDTH);
}

/**
 * The slot column's width in points, or `null` when it should simply take the
 * room the bust leaves (the wide layout).
 *
 * At phone and tablet widths the column is about 55% of the dock's inner width,
 * so the bust keeps the rest instead of sitting in a dark gutter. Above the wide
 * threshold the bust is a fixed 300 pt square and the column flexes to fit.
 */
export function equipmentDockSlotColumnWidth(viewportWidth: number): number | null {
    if (viewportWidth >= WIDE_DOCK_MIN_WIDTH) return null;
    return Math.round(dockInnerWidth(viewportWidth) * SLOT_COLUMN_SHARE);
}

/**
 * The pilgrim bust's box inside the equipment dock, chosen from the viewport
 * width.
 *
 * Purpose: the portrait sources are square (512x512) drawn with `fit="contain"`,
 * so a box taller than it is wide letterboxes the art into dead black instead of
 * showing more pilgrim. The box is therefore always square. Below the wide
 * layout the slot column takes `SLOT_COLUMN_SHARE` of the dock and the bust is
 * the square that fills what is left beside it (130 pt at 360 pt wide); at
 * desktop widths it is a fixed 300 pt square.
 *
 * Inputs: `viewportWidth` — window width in points (from `useWindowDimensions`).
 * Outputs: `{ width, height }` in points, width === height.
 */
export function equipmentDockPortraitBox(viewportWidth: number): { width: number; height: number } {
    const column = equipmentDockSlotColumnWidth(viewportWidth);
    const side = column === null
        ? 300
        : Math.max(0, dockInnerWidth(viewportWidth) - column - DOCK_GRID_GAP);
    return { width: side, height: side };
}

interface EquipmentDockProps {
    vm: EquipmentDockViewModel;
    /** The one picked row (`weapon`, `armor`, `relic-0`..`relic-2`), or null. */
    selectedRow: DockRowId | null;
    onSelectRow: (id: DockRowId | null) => void;
    /** Long-press pass-through: a filled slot asks the screen to open the
     *  equipment detail card for the worn item's id. */
    onShowItemDetail?: (itemId: string) => void;
    /**
     * The screen's drag controller. With it, a filled row can be dragged, every
     * row is a drop target, rows that would take the piece in flight are lit,
     * and a refused drop flashes its row and shows the reason under the rows.
     */
    drag?: DockDragController;
    /** The drag a filled row starts (read when the drag begins). */
    getRowPayload?: (id: DockRowId) => DockDragPayload | null;
}

interface DockRowProps {
    slot: EquipmentDockSlot;
    bareLabel: string;
    selected: boolean;
    onSelectRow: (id: DockRowId | null) => void;
    onShowItemDetail?: (itemId: string) => void;
    drag?: DockDragController;
    getRowPayload?: (id: DockRowId) => DockDragPayload | null;
}

/** One dock row: a drop target when a drag controller is given, and draggable when filled. */
function DockRow({ slot, bareLabel, selected, onSelectRow, onShowItemDetail, drag, getRowPayload }: DockRowProps) {
    // A press that is a drag's own release is not a tap.
    const onPress = drag === undefined
        ? onSelectRow
        : (id: DockRowId | null) => { if (!drag.suppressTap()) onSelectRow(id); };
    const onDetail = drag === undefined || onShowItemDetail === undefined
        ? onShowItemDetail
        : (itemId: string) => { if (!drag.suppressTap()) onShowItemDetail(itemId); };
    const row = (
        <EquipmentSlot
            slot={slot}
            bareLabel={bareLabel}
            selected={selected}
            onPress={onPress}
            onShowItemDetail={onDetail}
            lit={drag?.litRows.has(slot.id) ?? false}
            refused={drag?.refusal?.row === slot.id}
        />
    );
    if (drag === undefined) return row;
    const register = (node: View | null) => drag.register(slot.id, node);
    if (slot.item === null || getRowPayload === undefined) {
        return <View ref={register} collapsable={false}>{row}</View>;
    }
    const gesture = drag.gestureFor(slot.id, () => getRowPayload(slot.id), 'row');
    return (
        <GestureDetector gesture={gesture}>
            <View ref={register} collapsable={false}>{row}</View>
        </GestureDetector>
    );
}

/**
 * The WORN UPON THE BODY panel: pilgrim bust on the left, the five worn slots
 * stacked on the right.
 *
 * Inputs: `vm` (dock view model — labels + slot rows), `selectedRow` (the row
 * being fitted, or null), `onSelectRow` (row press handler).
 * Outputs: the dock view. Resolves: 07-inventory-fresh / 08-inventory-midgame —
 * the portrait box is sized per viewport by `equipmentDockPortraitBox`.
 */
export function EquipmentDock({
    vm,
    selectedRow,
    onSelectRow,
    onShowItemDetail,
    drag,
    getRowPayload,
}: EquipmentDockProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const { width: viewportWidth } = useWindowDimensions();
    const portraitBox = equipmentDockPortraitBox(viewportWidth);
    const slotColumnWidth = equipmentDockSlotColumnWidth(viewportWidth);

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
                <View
                    style={[styles.dockCol, slotColumnWidth === null ? styles.dockColFlex : { width: slotColumnWidth }]}
                    testID="equipment-dock-slots"
                >
                    {vm.slots.map((slot) => (
                        <DockRow
                            key={dockSlotKey(slot)}
                            slot={slot}
                            bareLabel={vm.bareLabel}
                            selected={selectedRow === slot.id}
                            onSelectRow={onSelectRow}
                            onShowItemDetail={onShowItemDetail}
                            drag={drag}
                            getRowPayload={getRowPayload}
                        />
                    ))}
                </View>
            </View>
            {drag?.refusal ? (
                <Text
                    key={drag.refusal.n}
                    style={styles.dockRefusal}
                    accessibilityLiveRegion="assertive"
                    testID="dock-drop-refusal"
                >
                    {drag.refusal.line}
                </Text>
            ) : null}
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
        // Below the wide layout the width is set inline (about 55% of the dock,
        // from `equipmentDockSlotColumnWidth`) so the bust has room to breathe.
        flexShrink: 0,
        alignItems: 'stretch',
    },
    dockColFlex: {
        // Wide layout: the bust is a fixed square and the gear list takes the rest.
        flex: 1,
        flexShrink: 1,
    },
    // A refused drop's one-line reason, under the rows.
    dockRefusal: {
        fontFamily: FONTS.sans,
        fontSize: 11,
        color: AXM.blood,
        letterSpacing: 0.6,
        textAlign: 'right',
        marginTop: 2,
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
