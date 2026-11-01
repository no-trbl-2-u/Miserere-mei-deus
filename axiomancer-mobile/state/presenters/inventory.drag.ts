/**
 * The satchel dock's drag and drop, as pure decisions.
 *
 * A drag carries one equipment piece from the satchel list or from a dock row.
 * Where it is let go decides what happens: worn into a row of its own kind
 * (through the same `equipItem` the tap path uses), moved between relic rows
 * (`moveRelic`, swapping when the row is full), taken off (dropped on the
 * satchel list), refused (a row of another kind, said in one line), or nothing
 * (outside every target, or back where it came from).
 *
 * The screen measures the targets and calls these; no copy lives in the views.
 */

import type { Character, Equipment, EquipmentSlot } from '@mechanics';

import { slotSubLabel } from './inventory.engine';
import {
    LOADOUT_ROWS,
    findOwnedEquipment,
    loadoutRowById,
    rowRelicPosition,
    rowSlotKind,
    wornAtRow,
    type DockRowId,
} from './loadout';

/** Where a drag began: the satchel list, or one dock row. */
export type DockDragSource = 'satchel' | DockRowId;

/** Where a drag can be let go: a dock row, or the satchel list. */
export type DockDropTarget = DockRowId | 'satchel';

/** The piece in flight, and enough about it to draw the ghost and decide the drop. */
export interface DockDragPayload {
    readonly itemId: string;
    readonly name: string;
    /** Satchel slot label (`Weapon`, `Armor`, `Relic`), for the ghost's glyph. */
    readonly sub: string;
    readonly kind: EquipmentSlot;
    readonly from: DockDragSource;
    /** The row the piece is worn in, or `null` when it is only carried. */
    readonly wornRow: DockRowId | null;
}

/** What a drop does. */
export type DockDropOutcome =
    | { readonly kind: 'equip'; readonly itemId: string; readonly position: 0 | 1 | 2 | undefined }
    | { readonly kind: 'move'; readonly from: 0 | 1 | 2; readonly to: 0 | 1 | 2 }
    | { readonly kind: 'unequip'; readonly itemId: string }
    | { readonly kind: 'refuse'; readonly row: DockRowId; readonly line: string }
    | { readonly kind: 'none' };

const KIND_NOUN: Record<EquipmentSlot, string> = {
    weapon: 'a weapon',
    armor: 'armor',
    relic: 'a relic',
};

/** The one-line reason a row refuses a piece of another kind ("Only a relic fits RELIC I."). */
export function dockRefusalLine(row: DockRowId): string {
    const kind = rowSlotKind(row);
    const noun = KIND_NOUN[kind];
    return `Only ${noun} fits ${loadoutRowById(row).dockLabel}.`;
}

function wornRowOf(player: Character, itemId: string): DockRowId | null {
    for (const row of LOADOUT_ROWS) {
        if (wornAtRow(player.equipment, row)?.id === itemId) return row.id;
    }
    return null;
}

function payloadFor(piece: Equipment, from: DockDragSource, wornRow: DockRowId | null): DockDragPayload {
    return {
        itemId: piece.id,
        name: piece.name,
        sub: slotSubLabel(piece.slot),
        kind: piece.slot,
        from,
        wornRow,
    };
}

/** The drag a satchel tile starts, or `null` when the item is not equipment the player owns. */
export function dockDragPayloadForItem(player: Character, itemId: string): DockDragPayload | null {
    const piece = findOwnedEquipment(player, itemId);
    if (piece === null) return null;
    return payloadFor(piece, 'satchel', wornRowOf(player, itemId));
}

/** The drag a dock row starts, or `null` when the row is empty. */
export function dockDragPayloadForRow(player: Character, row: DockRowId): DockDragPayload | null {
    const piece = wornAtRow(player.equipment, loadoutRowById(row));
    if (piece === null) return null;
    return payloadFor(piece, row, row);
}

/** The row a worn piece would leave from, whether the drag began on the dock or on its satchel tile. */
function originRow(payload: DockDragPayload): DockRowId | null {
    return payload.from === 'satchel' ? payload.wornRow : payload.from;
}

/**
 * The dock rows that would take the piece in flight (lit while dragging):
 * every row of its kind except the one it already sits in.
 */
export function dockDropRowsFor(payload: DockDragPayload): readonly DockRowId[] {
    const origin = originRow(payload);
    return LOADOUT_ROWS.filter((row) => row.key === payload.kind && row.id !== origin).map((row) => row.id);
}

/** True when letting the piece go on the satchel list would take it off. */
export function dockDropTakesOff(payload: DockDragPayload): boolean {
    return payload.from !== 'satchel';
}

/** A drop that changes the loadout. */
export type DockLoadoutDrop = Exclude<DockDropOutcome, { kind: 'refuse' } | { kind: 'none' }>;

/** The store actions a drop reaches: the same ones the tap paths use. */
export interface DockDropActions {
    equipItem: (itemId: string, position?: number) => void;
    moveRelic: (from: number, to: number) => void;
    unequipItem: (itemId: string) => void;
}

/**
 * Sends a drop to the store: a wear into a row goes through `equipItem` with
 * that row's relic position (a weapon or armor ignores it), a move between
 * relic rows through `moveRelic`, a take-off through `unequipItem`.
 */
export function applyDockDrop(actions: DockDropActions, outcome: DockLoadoutDrop): void {
    if (outcome.kind === 'equip') actions.equipItem(outcome.itemId, outcome.position);
    else if (outcome.kind === 'move') actions.moveRelic(outcome.from, outcome.to);
    else actions.unequipItem(outcome.itemId);
}

/** What letting `payload` go over `target` does (`null` target: outside every row and the list). */
export function resolveDockDrop(payload: DockDragPayload, target: DockDropTarget | null): DockDropOutcome {
    if (target === null) return { kind: 'none' };
    if (target === 'satchel') {
        return dockDropTakesOff(payload) ? { kind: 'unequip', itemId: payload.itemId } : { kind: 'none' };
    }
    if (rowSlotKind(target) !== payload.kind) {
        return { kind: 'refuse', row: target, line: dockRefusalLine(target) };
    }
    const origin = originRow(payload);
    if (origin === target) return { kind: 'none' };
    const from = rowRelicPosition(origin);
    const to = rowRelicPosition(target);
    if (from !== undefined && to !== undefined) return { kind: 'move', from, to };
    return { kind: 'equip', itemId: payload.itemId, position: to };
}
