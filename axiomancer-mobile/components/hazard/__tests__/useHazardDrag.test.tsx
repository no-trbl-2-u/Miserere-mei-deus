/**
 * The shared hazard drag controller (`useHazardDrag`), used by `/hazard` and
 * the dev-menu puzzle board: begin marks the payload active and shows the
 * ghost, end clears both and hands the drop to the board's resolver with the
 * end coordinates, and an end with nothing dragged calls nothing.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import type { DragController, DragPayload } from '../HazardBoard';
import { useHazardDrag } from '../useHazardDrag';

jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

type Resolver = (payload: DragPayload, x: number, y: number) => void;

const DIE: DragPayload = {
    type: 'die',
    dieId: 'd4',
    die: {
        id: 'd4',
        kind: 'purple',
        state: 'available',
        isHex: false,
        usable: true,
        temporary: false,
        accessibilityLabel: 'Purple crescent die, available',
    },
};

/** Installs a drop resolver the way `HazardBoard` does, on the controller itself. */
function withResolver(drag: DragController, resolver: Resolver) {
    (drag as DragController & { resolveDrop?: Resolver }).resolveDrop = resolver;
}

describe('useHazardDrag', () => {
    it('starts idle: nothing active and no ghost', () => {
        const { result } = renderHook(() => useHazardDrag());
        expect(result.current.drag.active).toBeNull();
        expect(result.current.ghost).toBeNull();
    });

    it('begin marks the payload active and shows the ghost', () => {
        const { result } = renderHook(() => useHazardDrag());
        act(() => result.current.drag.begin(DIE, 10, 20));
        expect(result.current.drag.active).toEqual(DIE);
        expect(result.current.ghost).not.toBeNull();
    });

    it('end clears the drag and hands the drop to the resolver with the end point', () => {
        const { result } = renderHook(() => useHazardDrag());
        act(() => result.current.drag.begin(DIE, 10, 20));
        const resolver = jest.fn<Resolver>();
        withResolver(result.current.drag, resolver);
        act(() => result.current.drag.move(30, 40));
        act(() => result.current.drag.end(50, 60));
        expect(resolver).toHaveBeenCalledTimes(1);
        expect(resolver).toHaveBeenCalledWith(DIE, 50, 60);
        expect(result.current.drag.active).toBeNull();
        expect(result.current.ghost).toBeNull();
    });

    it('an end with nothing dragged calls no resolver', () => {
        const { result } = renderHook(() => useHazardDrag());
        const resolver = jest.fn<Resolver>();
        withResolver(result.current.drag, resolver);
        act(() => result.current.drag.end(50, 60));
        expect(resolver).not.toHaveBeenCalled();
    });
});
