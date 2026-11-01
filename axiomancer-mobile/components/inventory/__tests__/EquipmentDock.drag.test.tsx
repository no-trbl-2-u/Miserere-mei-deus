/**
 * Hermetic component test: drag and drop on the satchel dock.
 *
 * Drives the dock's drag controller the way the hazard board's tests do:
 * `begin` with a payload, then `end(x, y)` on measured rects (a stand-in
 * `measure` gives every row and the satchel list a fixed rect). The harness
 * mounts the real dock over the real app store and actions, so each drop is
 * read back from `player.equipment`.
 *
 * Covers wearing onto each of the five rows, every wrong-kind refusal, a drop
 * outside, taking off onto the satchel list, moving and swapping between
 * relic rows, the lit rows while dragging, and the real pan gesture beside the
 * row's tap and long press.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import {
    createCharacter,
    equipItem as engineEquipItem,
    relicPositions,
    type Equipment,
} from '@mechanics';

import { EquipmentDock } from '../EquipmentDock';
import { useDockDrag, type DockDragController, type DockMeasureTarget, type Rect } from '../useDockDrag';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { selectInventoryViewModel, type DockRowId } from '@/state/presenters/inventory.engine';
import {
    applyDockDrop,
    dockDragPayloadForItem,
    dockDragPayloadForRow,
    type DockDragPayload,
} from '@/state/presenters/inventory.drag';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';

jest.mock('@/components/art/PlayerPortraitImage', () => ({
    PlayerPortraitImage: () => null,
}));

const piece = (id: string, slot: Equipment['slot']): Equipment => ({
    id, name: `${slot} ${id}`, description: 'A fixture piece.', category: 'equipment', slot,
});
const W1 = piece('w1', 'weapon');
const W2 = piece('w2', 'weapon');
const A1 = piece('a1', 'armor');
const A2 = piece('a2', 'armor');
const R1 = piece('r1', 'relic');
const R2 = piece('r2', 'relic');
const R3 = piece('r3', 'relic');
const R4 = piece('r4', 'relic');
const ALL = [W1, W2, A1, A2, R1, R2, R3, R4];

const ROWS: readonly DockRowId[] = ['weapon', 'armor', 'relic-0', 'relic-1', 'relic-2'];

// Rows stacked 100 pt apart, the satchel list below them.
const RECTS: Record<DockMeasureTarget, Rect> = {
    'weapon': { x: 0, y: 0, width: 200, height: 60 },
    'armor': { x: 0, y: 100, width: 200, height: 60 },
    'relic-0': { x: 0, y: 200, width: 200, height: 60 },
    'relic-1': { x: 0, y: 300, width: 200, height: 60 },
    'relic-2': { x: 0, y: 400, width: 200, height: 60 },
    'satchel': { x: 0, y: 600, width: 360, height: 200 },
    'origin': { x: 0, y: 0, width: 360, height: 800 },
};
const at = (t: DockMeasureTarget) => ({ x: RECTS[t].x + 100, y: RECTS[t].y + 30 });
const OUTSIDE = { x: 300, y: 500 };
const fakeMeasure = async (target: DockMeasureTarget) => RECTS[target];

/** A store whose player carries every fixture piece and wears `wear` (relics at the given positions). */
function makeStore(wear: ReadonlyArray<[Equipment, number?]>) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const state = store.getState();
    const clean = createCharacter({
        id: state.player.id,
        name: state.player.name,
        level: state.player.level,
        baseStats: state.player.baseStats,
        currency: state.player.currency,
        knownCards: state.player.knownCards,
        inventory: [...ALL],
        equipment: [],
    });
    let player = { ...state.player, ...clean };
    for (const [p, position] of wear) {
        player = engineEquipItem(player, p, position === undefined ? undefined : { position });
    }
    store.setState({ player });
    return store;
}

let drag: DockDragController;
const onShowItemDetail = jest.fn();
const onSelectRow = jest.fn();

function Harness() {
    const store = useGameStore();
    const actions = useGameActions();
    const player = useGameState((s) => s.player);
    const dock = useDockDrag({ onDrop: (o) => applyDockDrop(actions, o), measure: fakeMeasure });
    drag = dock.drag;
    const vm = React.useMemo(
        () => selectInventoryViewModel(store.getState()).equipmentDock,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [store, player],
    );
    return (
        <EquipmentDock
            vm={vm}
            selectedRow={null}
            onSelectRow={onSelectRow}
            onShowItemDetail={onShowItemDetail}
            drag={dock.drag}
            getRowPayload={(id) => dockDragPayloadForRow(store.getState().player, id)}
        />
    );
}

function mount(wear: ReadonlyArray<[Equipment, number?]> = []) {
    const store = makeStore(wear);
    const { tree } = withAllProviders(<Harness />, { store });
    const screen = render(tree);
    const loadout = () => {
        const eq = store.getState().player.equipment;
        return {
            weapon: eq.weapon?.id ?? null,
            armor: eq.armor?.id ?? null,
            relics: relicPositions(eq).map((r) => r?.id ?? null),
        };
    };
    const fromItem = (id: string) => dockDragPayloadForItem(store.getState().player, id)!;
    const fromRow = (id: DockRowId) => dockDragPayloadForRow(store.getState().player, id)!;
    return { store, screen, loadout, fromItem, fromRow };
}

async function dragTo(payload: DockDragPayload, to: { x: number; y: number }) {
    await act(async () => { drag.begin(payload, 1, 1); });
    await act(async () => { await drag.end(to.x, to.y); });
}

const rowStyle = (screen: ReturnType<typeof render>, id: DockRowId) =>
    StyleSheet.flatten(screen.getByTestId(`dock-slot-${id}`).props.style);
const litRows = (screen: ReturnType<typeof render>) =>
    ROWS.filter((id) => rowStyle(screen, id).borderWidth === 2);

beforeEach(() => {
    onShowItemDetail.mockClear();
    onSelectRow.mockClear();
});

describe('drag to wear (A7)', () => {
    it('a satchel weapon dropped on WEAPON is worn there, replacing what is there', async () => {
        const { loadout, fromItem } = mount([[W1]]);
        await dragTo(fromItem('w2'), at('weapon'));
        expect(loadout().weapon).toBe('w2');
    });

    it('a satchel armor dropped on ARMOR is worn there', async () => {
        const { loadout, fromItem } = mount();
        await dragTo(fromItem('a2'), at('armor'));
        expect(loadout().armor).toBe('a2');
    });

    const relicRows: [DockRowId, number][] = [['relic-0', 0], ['relic-1', 1], ['relic-2', 2]];
    it.each(relicRows)('a satchel relic dropped on %s is worn in that position, replacing only it', async (row, pos) => {
        const { loadout, fromItem } = mount([[R1, 0], [R2, 1], [R3, 2]]);
        await dragTo(fromItem('r4'), at(row));
        const expected = ['r1', 'r2', 'r3'];
        expected[pos] = 'r4';
        expect(loadout().relics).toEqual(expected);
    });

    it('a satchel relic dropped on an empty row past a hole fills that row, not the first hole', async () => {
        const { loadout, fromItem } = mount([[R1, 0]]);
        await dragTo(fromItem('r4'), at('relic-2'));
        expect(loadout().relics).toEqual(['r1', null, 'r4']);
    });

    const satchelRefusals: [string, DockRowId, string][] = [
        ['r4', 'weapon', 'Only a weapon fits WEAPON.'],
        ['r4', 'armor', 'Only armor fits ARMOR.'],
        ['w2', 'relic-1', 'Only a relic fits RELIC II.'],
        ['w2', 'armor', 'Only armor fits ARMOR.'],
        ['a2', 'weapon', 'Only a weapon fits WEAPON.'],
        ['a2', 'relic-0', 'Only a relic fits RELIC I.'],
    ];
    it.each(satchelRefusals)('a satchel %s dropped on %s is refused loudly and nothing changes', async (id, row, line) => {
        const { screen, loadout, fromItem } = mount([[W1], [A1], [R1, 0]]);
        const before = loadout();
        await dragTo(fromItem(id), at(row));
        expect(loadout()).toEqual(before);
        const refusal = screen.getByTestId('dock-drop-refusal');
        expect(refusal.props.children).toBe(line);
        // The refused row flashes in the refusal's colour.
        expect(rowStyle(screen, row).borderColor).toBe(StyleSheet.flatten(refusal.props.style).color);
    });

    it('a drop outside every row does nothing', async () => {
        const { screen, loadout, fromItem } = mount([[R1, 0]]);
        const before = loadout();
        await dragTo(fromItem('r4'), OUTSIDE);
        expect(loadout()).toEqual(before);
        expect(screen.queryByTestId('dock-drop-refusal')).toBeNull();
    });

    it('a cancelled drag does nothing', async () => {
        const { loadout, fromItem } = mount();
        await act(async () => { drag.begin(fromItem('r4'), 1, 1); });
        await act(async () => { await drag.end(-1, -1); });
        expect(loadout().relics).toEqual([null, null, null]);
    });

    it('while a relic is dragged every relic row is lit, and only those', async () => {
        const { screen, fromItem } = mount([[R1, 0]]);
        expect(litRows(screen)).toEqual([]);
        await act(async () => { drag.begin(fromItem('r4'), 1, 1); });
        expect(litRows(screen)).toEqual(['relic-0', 'relic-1', 'relic-2']);
        await act(async () => { await drag.end(OUTSIDE.x, OUTSIDE.y); });
        expect(litRows(screen)).toEqual([]);
    });

    it('while a weapon is dragged only WEAPON is lit', async () => {
        const { screen, fromItem } = mount();
        await act(async () => { drag.begin(fromItem('w2'), 1, 1); });
        expect(litRows(screen)).toEqual(['weapon']);
        await act(async () => { await drag.end(-1, -1); });
    });
});

describe('drag to take off, and between relics (A8)', () => {
    const takeOffs: [DockRowId, (string | null)[]][] = [
        ['relic-0', [null, 'r2', 'r3']],
        ['relic-1', ['r1', null, 'r3']],
        ['relic-2', ['r1', 'r2', null]],
    ];
    it.each(takeOffs)('a worn relic dragged from %s onto the satchel comes off; only its row empties', async (row, after) => {
        const { loadout, fromRow } = mount([[R1, 0], [R2, 1], [R3, 2]]);
        await dragTo(fromRow(row), at('satchel'));
        expect(loadout().relics).toEqual(after);
    });

    it('a worn weapon and armor dragged onto the satchel come off', async () => {
        const { loadout, fromRow } = mount([[W1], [A1], [R1, 0]]);
        await dragTo(fromRow('weapon'), at('satchel'));
        expect(loadout().weapon).toBeNull();
        await dragTo(fromRow('armor'), at('satchel'));
        expect(loadout().armor).toBeNull();
        expect(loadout().relics).toEqual(['r1', null, null]);
    });

    it('a satchel piece dropped back on the satchel does nothing', async () => {
        const { loadout, fromItem } = mount([[R1, 0]]);
        await dragTo(fromItem('r1'), at('satchel'));
        expect(loadout().relics).toEqual(['r1', null, null]);
    });

    it('a worn relic dragged onto a full relic row swaps the two', async () => {
        const { loadout, fromRow } = mount([[R1, 0], [R2, 1]]);
        await dragTo(fromRow('relic-1'), at('relic-0'));
        expect(loadout().relics).toEqual(['r2', 'r1', null]);
    });

    it('a worn relic dragged onto an empty relic row moves there', async () => {
        const { loadout, fromRow } = mount([[R1, 0], [R2, 1]]);
        await dragTo(fromRow('relic-0'), at('relic-2'));
        expect(loadout().relics).toEqual([null, 'r2', 'r1']);
    });

    it('a worn relic dragged from its satchel tile onto another relic row moves, it is not worn twice', async () => {
        const { loadout, fromItem } = mount([[R1, 0], [R2, 1]]);
        await dragTo(fromItem('r1'), at('relic-2'));
        expect(loadout().relics).toEqual([null, 'r2', 'r1']);
    });

    it('a worn relic let go on its own row does nothing', async () => {
        const { loadout, fromRow } = mount([[R1, 0]]);
        await dragTo(fromRow('relic-0'), at('relic-0'));
        expect(loadout().relics).toEqual(['r1', null, null]);
    });

    const rowRefusals: [DockRowId, DockRowId][] = [
        ['weapon', 'armor'],
        ['weapon', 'relic-0'],
        ['armor', 'weapon'],
        ['armor', 'relic-2'],
        ['relic-0', 'weapon'],
        ['relic-0', 'armor'],
    ];
    it.each(rowRefusals)('a worn piece dragged from %s onto %s is refused and nothing changes', async (from, to) => {
        const { screen, loadout, fromRow } = mount([[W1], [A1], [R1, 0]]);
        const before = loadout();
        await dragTo(fromRow(from), at(to));
        expect(loadout()).toEqual(before);
        expect(screen.getByTestId('dock-drop-refusal')).toBeTruthy();
    });

    it('dragging a worn relic lights the other relic rows and the satchel, not its own row', async () => {
        const { screen, fromRow } = mount([[R1, 0], [R2, 1]]);
        await act(async () => { drag.begin(fromRow('relic-1'), 1, 1); });
        expect(litRows(screen)).toEqual(['relic-0', 'relic-2']);
        expect(drag.satchelLit).toBe(true);
        await act(async () => { await drag.end(-1, -1); });
        expect(drag.satchelLit).toBe(false);
    });

    it('an empty row starts no drag', () => {
        const { store } = mount([[R1, 0]]);
        expect(dockDragPayloadForRow(store.getState().player, 'relic-1')).toBeNull();
        expect(dockDragPayloadForRow(store.getState().player, 'weapon')).toBeNull();
    });
});

describe('the real pan gesture beside the tap and long press (A9)', () => {
    const fire = async (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => {
        await act(async () => {
            fireGestureHandler(getByGestureTestId(`dock-drag-${id}`), [
                { state: State.BEGAN, absoluteX: from.x, absoluteY: from.y },
                { state: State.ACTIVE, absoluteX: from.x, absoluteY: from.y },
                { state: State.ACTIVE, absoluteX: to.x, absoluteY: to.y },
                { state: State.END, absoluteX: to.x, absoluteY: to.y },
            ]);
            await Promise.resolve();
        });
        await act(async () => { await Promise.resolve(); });
    };

    it('the pan on a filled row moves the relic, through the controller', async () => {
        const { loadout } = mount([[R1, 0], [R2, 1]]);
        await fire('relic-1', at('relic-1'), at('relic-0'));
        expect(loadout().relics).toEqual(['r2', 'r1', null]);
    });

    it('a press that is a drag\'s own release is not a tap; a later tap and long press still work', async () => {
        const now = jest.spyOn(Date, 'now');
        try {
            now.mockReturnValue(10_000);
            const { screen } = mount([[R1, 0], [R2, 1]]);
            await fire('relic-1', at('relic-1'), at('relic-0'));
            fireEvent.press(screen.getByTestId('dock-slot-relic-1'));
            expect(onSelectRow).not.toHaveBeenCalled();

            now.mockReturnValue(20_000);
            fireEvent.press(screen.getByTestId('dock-slot-relic-1'));
            expect(onSelectRow).toHaveBeenCalledWith('relic-1');
            fireEvent(screen.getByTestId('dock-slot-relic-0'), 'longPress');
            expect(onShowItemDetail).toHaveBeenCalledWith('r2');
        } finally {
            now.mockRestore();
        }
    });

    it('every row taps to its own pick with the drag controller in place', () => {
        const { screen } = mount([[W1], [A1], [R1, 0]]);
        for (const id of ROWS) fireEvent.press(screen.getByTestId(`dock-slot-${id}`));
        expect(onSelectRow.mock.calls.map((c) => c[0])).toEqual(ROWS);
    });
});
