/**
 * The satchel screen's drag controller and ghost, modelled on the hazard
 * board's (`components/hazard/useHazardDrag.tsx`): `begin / move / end(x, y)`
 * in page coordinates, drop targets measured when a drag begins, and a ghost
 * of the piece's glyph and name that follows the finger.
 *
 * The five dock rows and the satchel list register their views; `end(x, y)`
 * finds the target under the point and `resolveDockDrop` decides what that
 * does. Wears, moves and take-offs go to `onDrop` (the screen dispatches them
 * to the store); a refusal is kept here so the dock can flash the row and show
 * its one-line reason. `(-1, -1)` is a cancelled drag and does nothing.
 *
 * Gestures come from `gestureFor`: a `Gesture.Pan` that starts only after the
 * pointer has moved past a few points, so a tap and a long press on the same
 * view keep working. A satchel tile on a touch device starts its drag after a
 * short hold instead, so the list still scrolls under a swipe.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/platform/haptics';

import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { juiceHaptics } from '@/lib/juice';
import { ItemGlyph } from '@/components/inventory/ItemCard';
import {
    dockDropRowsFor,
    dockDropTakesOff,
    resolveDockDrop,
    type DockDragPayload,
    type DockDropTarget,
    type DockLoadoutDrop,
} from '@/state/presenters/inventory.drag';
import type { DockRowId } from '@/state/presenters/loadout';

export interface Rect { x: number; y: number; width: number; height: number }

/** A drop-target id the controller measures: a dock row, the satchel list, or the ghost's frame. */
export type DockMeasureTarget = DockDropTarget | 'origin';

/** Measures a registered view in page coordinates; `null` when it is not on screen. */
export type DockMeasure = (target: DockMeasureTarget, node: View | null) => Promise<Rect | null>;

/** The refused drop being shown: which row flashes and the reason line. `n` changes on every refusal. */
export interface DockRefusal { row: DockRowId; line: string; n: number }

type PanGesture = ReturnType<typeof Gesture.Pan>;

export interface DockDragController {
    begin: (payload: DockDragPayload, x: number, y: number) => void;
    move: (x: number, y: number) => void;
    /** Lets the drag go at (x, y); `(-1, -1)` cancels it. Resolves once the drop is decided. */
    end: (x: number, y: number) => Promise<void>;
    /** The piece in flight, or `null`. */
    active: DockDragPayload | null;
    /** Rows lit while dragging: every row that would take the piece. */
    litRows: ReadonlySet<DockRowId>;
    /** True while a dragged piece would come off if let go on the satchel list. */
    satchelLit: boolean;
    /** The refused drop on show, or `null`. */
    refusal: DockRefusal | null;
    /** Register (or, with `null`, drop) a target's view. */
    register: (target: DockMeasureTarget, node: View | null) => void;
    /**
     * The pan gesture for one draggable view, built once per `key`.
     * `getPayload` is read when the drag starts, so it always sees the
     * current loadout; `null` means nothing to drag.
     */
    gestureFor: (key: string, getPayload: () => DockDragPayload | null, mode: 'row' | 'tile') => PanGesture;
    /** True while a drag is live or has just been let go: a press then is the drag's release, not a tap. */
    suppressTap: () => boolean;
}

export interface UseDockDragOptions {
    /** Called for a drop that changes the loadout (equip, move, unequip). */
    onDrop: (outcome: DockLoadoutDrop) => void;
    /** Test seam: replaces the views' own `measure`. */
    measure?: DockMeasure;
}

export interface DockDrag {
    drag: DockDragController;
    /** The ghost; render it last, inside the view registered as `origin`. */
    ghost: React.ReactNode;
}

/** Points the pointer must travel before a press becomes a drag. */
export const DOCK_DRAG_MIN_DISTANCE = 10;
/** On a touch device, how long a satchel tile is held before it lifts (ms). */
export const SATCHEL_DRAG_HOLD_MS = 220;
/** How long a refusal stays on show (ms). */
export const DOCK_REFUSAL_MS = 2400;
/** How long after a drag ends a press on the same view is still the drag's release (ms). */
export const DRAG_TAP_GUARD_MS = 350;
/** Row and list order when the point is over several (rows first: they sit inside nothing). */
const DROP_ORDER: readonly DockDropTarget[] = ['weapon', 'armor', 'relic-0', 'relic-1', 'relic-2', 'satchel'];

const GHOST_W = 150;
const GHOST_H = 44;

function measureNode(_target: DockMeasureTarget, node: View | null): Promise<Rect | null> {
    return new Promise((resolve) => {
        if (node === null || typeof node.measure !== 'function') { resolve(null); return; }
        // Page coordinates, like the gesture's absoluteX / absoluteY.
        node.measure((_x, _y, width, height, pageX, pageY) => {
            resolve(typeof pageX === 'number' ? { x: pageX, y: pageY, width, height } : null);
        });
    });
}

function contains(r: Rect | null | undefined, x: number, y: number): boolean {
    return !!r && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/** The drop target under (x, y), rows before the list; `null` when over none. */
export function dockTargetAt(rects: Partial<Record<DockMeasureTarget, Rect | null>>, x: number, y: number): DockDropTarget | null {
    for (const t of DROP_ORDER) if (contains(rects[t], x, y)) return t;
    return null;
}

/**
 * Builds the dock's drag controller and its ghost.
 *
 * Inputs: `onDrop`, the screen's dispatcher for a drop that changes the loadout;
 * optionally `measure`, a stand-in for the views' own measurement (tests).
 * Outputs: `drag`, handed to the dock and the satchel list, and `ghost`.
 */
export function useDockDrag({ onDrop, measure = measureNode }: UseDockDragOptions): DockDrag {
    const [active, setActive] = useState<DockDragPayload | null>(null);
    const [refusal, setRefusal] = useState<DockRefusal | null>(null);
    const activeRef = useRef<DockDragPayload | null>(null);
    const nodes = useRef(new Map<DockMeasureTarget, View | null>());
    const rectsRef = useRef<Promise<Partial<Record<DockMeasureTarget, Rect | null>>> | null>(null);
    const originRef = useRef<Rect | null>(null);
    const onDropRef = useRef(onDrop);
    onDropRef.current = onDrop;
    const measureRef = useRef(measure);
    measureRef.current = measure;
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const shown = useSharedValue(0);

    const lastEndAt = useRef(0);

    const register = useCallback((target: DockMeasureTarget, node: View | null) => {
        nodes.current.set(target, node);
    }, []);

    // On web the pointer stays captured by the view a drag began on, so its
    // press still fires on release; a press during or right after a drag is
    // the drag's own release, not a tap.
    const suppressTap = useCallback(
        () => activeRef.current !== null || Date.now() - lastEndAt.current < DRAG_TAP_GUARD_MS,
        [],
    );

    const placeGhost = useCallback((px: number, py: number) => {
        const o = originRef.current;
        x.value = px - (o?.x ?? 0);
        y.value = py - (o?.y ?? 0);
    }, [x, y]);

    const begin = useCallback((payload: DockDragPayload, px: number, py: number) => {
        activeRef.current = payload;
        const targets: DockMeasureTarget[] = [...DROP_ORDER, 'origin'];
        const m = measureRef.current;
        rectsRef.current = Promise.all(targets.map((t) => m(t, nodes.current.get(t) ?? null))).then((rs) => {
            const out: Partial<Record<DockMeasureTarget, Rect | null>> = {};
            targets.forEach((t, i) => { out[t] = rs[i]; });
            originRef.current = out.origin ?? null;
            return out;
        });
        placeGhost(px, py);
        shown.value = 1;
        setRefusal(null);
        setActive(payload);
    }, [placeGhost, shown]);

    const move = useCallback((px: number, py: number) => placeGhost(px, py), [placeGhost]);

    const end = useCallback(async (px: number, py: number) => {
        const payload = activeRef.current;
        activeRef.current = null;
        if (payload !== null) lastEndAt.current = Date.now();
        shown.value = 0;
        setActive(null);
        const pending = rectsRef.current;
        rectsRef.current = null;
        if (payload === null || (px < 0 && py < 0)) return;
        const rects = pending ? await pending : {};
        const outcome = resolveDockDrop(payload, dockTargetAt(rects, px, py));
        if (outcome.kind === 'none') return;
        if (outcome.kind === 'refuse') {
            juiceHaptics.notify(NotificationFeedbackType.Error);
            setRefusal((prev) => ({ row: outcome.row, line: outcome.line, n: (prev?.n ?? 0) + 1 }));
            return;
        }
        juiceHaptics.impact(ImpactFeedbackStyle.Light);
        onDropRef.current(outcome);
    }, [shown]);

    // A refusal clears itself after a moment.
    useEffect(() => {
        if (refusal === null) return undefined;
        const t = setTimeout(() => setRefusal(null), DOCK_REFUSAL_MS);
        return () => clearTimeout(t);
    }, [refusal]);

    // Handlers reach the gestures through refs, so a gesture built once stays current.
    const handlers = useRef({ begin, move, end });
    handlers.current = { begin, move, end };
    const payloadGetters = useRef(new Map<string, () => DockDragPayload | null>());
    const gestures = useRef(new Map<string, PanGesture>());

    const gestureFor = useCallback((key: string, getPayload: () => DockDragPayload | null, mode: 'row' | 'tile') => {
        payloadGetters.current.set(key, getPayload);
        const cacheKey = `${mode}:${key}`;
        let g = gestures.current.get(cacheKey);
        if (g === undefined) {
            let pan = Gesture.Pan()
                .runOnJS(true)
                .withTestId(`dock-drag-${key}`)
                .onStart((e) => {
                    const payload = payloadGetters.current.get(key)?.() ?? null;
                    if (payload !== null) handlers.current.begin(payload, e.absoluteX, e.absoluteY);
                })
                .onUpdate((e) => { if (activeRef.current !== null) handlers.current.move(e.absoluteX, e.absoluteY); })
                .onEnd((e) => { if (activeRef.current !== null) void handlers.current.end(e.absoluteX, e.absoluteY); })
                .onFinalize((_e, ok) => { if (!ok && activeRef.current !== null) void handlers.current.end(-1, -1); });
            pan = mode === 'tile' && Platform.OS !== 'web'
                ? pan.activateAfterLongPress(SATCHEL_DRAG_HOLD_MS)
                : pan.minDistance(DOCK_DRAG_MIN_DISTANCE);
            g = pan;
            gestures.current.set(cacheKey, g);
        }
        return g;
    }, []);

    const litRows = useMemo<ReadonlySet<DockRowId>>(
        () => new Set(active === null ? [] : dockDropRowsFor(active)),
        [active],
    );
    const satchelLit = active !== null && dockDropTakesOff(active);

    const drag = useMemo<DockDragController>(
        () => ({ begin, move, end, active, litRows, satchelLit, refusal, register, gestureFor, suppressTap }),
        [begin, move, end, active, litRows, satchelLit, refusal, register, gestureFor, suppressTap],
    );

    const ghostStyle = useAnimatedStyle(() => ({
        opacity: shown.value,
        transform: [{ translateX: x.value - GHOST_W / 2 }, { translateY: y.value - GHOST_H / 2 - 20 }],
    }));

    const ghost = active === null ? null : <DockGhost payload={active} style={ghostStyle} />;

    return { drag, ghost };
}

function DockGhost({ payload, style }: { payload: DockDragPayload; style: ReturnType<typeof useAnimatedStyle> }) {
    const styles = useStyles();
    return (
        <Animated.View pointerEvents="none" style={[fixed.ghost, styles.ghost, style]} testID="dock-drag-ghost">
            <View style={styles.ghostGlyph}>
                <ItemGlyph category="equipment" sub={payload.sub} itemId={payload.itemId} size={26} />
            </View>
            <Text style={styles.ghostName} numberOfLines={1}>{payload.name}</Text>
        </Animated.View>
    );
}

const fixed = StyleSheet.create({
    ghost: { position: 'absolute', top: 0, left: 0, zIndex: 999, width: GHOST_W, height: GHOST_H },
});

const useStyles = makeStyles((AXM) => ({
    ghost: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.deepBg,
    },
    ghostGlyph: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghostName: {
        flex: 1,
        fontFamily: FONTS.serif,
        fontSize: 12,
        color: AXM.parchment,
    },
}));
