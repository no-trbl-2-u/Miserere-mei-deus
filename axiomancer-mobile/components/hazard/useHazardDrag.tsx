/**
 * The hazard boards' screen-level drag controller and ghost, shared by the
 * live `/hazard` screen and the dev-menu puzzle board so both drag the same
 * way. `HazardBoard` reports gestures through the controller; the screen
 * renders `ghost` above everything so the dragged card or die follows the
 * finger, and the board's own drop resolver decides what the drop did.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { DragController, DragPayload } from './HazardBoard';
import { HazardCard } from './HazardCard';
import { HazardDie } from './HazardDie';

type DropResolver = (payload: DragPayload, x: number, y: number) => void | Promise<void>;

export interface HazardDrag {
    /** Hand to `HazardBoard`'s `drag` prop. */
    drag: DragController;
    /** The drag ghost; render it last, as a sibling of the board. */
    ghost: React.ReactNode;
}

/**
 * Builds the drag controller and its ghost.
 *
 * Inputs: none.
 * Outputs: `drag`, the controller `HazardBoard` drives, and `ghost`, the
 * node to render at screen level (null while nothing is dragged).
 */
export function useHazardDrag(): HazardDrag {
    const [dragActive, setDragActive] = useState<DragPayload | null>(null);
    const dragRef = useRef<DragPayload | null>(null);
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);
    const dragShown = useSharedValue(0);

    const begin = useCallback(
        (payload: DragPayload, x: number, y: number) => {
            dragRef.current = payload;
            dragX.value = x;
            dragY.value = y;
            dragShown.value = 1;
            setDragActive(payload);
        },
        [dragX, dragY, dragShown],
    );
    const move = useCallback(
        (x: number, y: number) => {
            dragX.value = x;
            dragY.value = y;
        },
        [dragX, dragY],
    );
    const drag: DragController = useMemo(
        () => ({ begin, move, end: () => undefined, active: dragActive }),
        [begin, move, dragActive],
    );
    const end = useCallback(
        (x: number, y: number) => {
            const payload = dragRef.current;
            dragRef.current = null;
            dragShown.value = 0;
            setDragActive(null);
            if (!payload) return;
            const resolver = (drag as DragController & { resolveDrop?: DropResolver }).resolveDrop;
            if (resolver) void resolver(payload, x, y);
        },
        [drag, dragShown],
    );
    drag.end = end;

    const ghostStyle = useAnimatedStyle(() => ({
        opacity: dragShown.value,
        transform: [{ translateX: dragX.value - 45 }, { translateY: dragY.value - 70 }],
    }));

    // The ghost follows the finger above everything.
    const ghost =
        dragActive === null ? null : (
            <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
                {dragActive.type === 'die' ? (
                    <HazardDie kind={dragActive.die.kind} size={44} glow />
                ) : (
                    <HazardCard card={dragActive.card} mode={dragActive.from === 'play' ? 'play' : 'hand'} dragging />
                )}
            </Animated.View>
        );

    return { drag, ghost };
}

const styles = StyleSheet.create({
    ghost: { position: 'absolute', top: 0, left: 0, zIndex: 999 },
});
