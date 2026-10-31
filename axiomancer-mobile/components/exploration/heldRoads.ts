/**
 * Held roads on the map (phase ET1b). A road a hazard or an elite holds shut
 * draws closed; the first time the map draws it without the hold, it draws
 * itself open along its length. Presentation only: the memory lives in the
 * screen (module state), never in the save, and an unremembered road is simply
 * drawn open.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ExplorationEdge } from '@/state/presenters/exploration.engine';

/** How long a road takes to draw itself open, in ms. */
export const HELD_ROAD_DRAW_MS = 1400;

export function edgeKey(e: Pick<ExplorationEdge, 'fromId' | 'toId'>): string {
    return `${e.fromId}|${e.toId}`;
}

/** The keys of the roads held in `edges`. */
export function heldKeys(edges: readonly ExplorationEdge[]): Set<string> {
    return new Set(edges.filter((e) => e.held === true).map(edgeKey));
}

/** The roads that were held when last drawn and are not held now. */
export function roadsJustOpened(prevHeld: ReadonlySet<string>, edges: readonly ExplorationEdge[]): string[] {
    return edges.filter((e) => e.held !== true && prevHeld.has(edgeKey(e))).map(edgeKey);
}

/** Survives the map screen unmounting while the player is at a hazard's screen. */
let held: ReadonlySet<string> = new Set();

/** Forget what was held (tests; a new run). */
export function resetHeldRoadMemory(): void {
    held = new Set();
}

/**
 * The keys of the roads drawing themselves open right now. With `instant` (reduced
 * motion, the e2e escape hatch) a newly opened road is drawn open at once and none
 * is ever "opening": the caller takes the answer, as the other motion gates do.
 */
export function useOpeningRoads(edges: readonly ExplorationEdge[], instant: boolean): ReadonlySet<string> {
    const [opening, setOpening] = useState<ReadonlySet<string>>(new Set());
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const fresh = useMemo(() => roadsJustOpened(held, edges), [edges]);
    const [lastSeen, setLastSeen] = useState<readonly string[]>([]);

    // A newly opened road starts "opening" in the same render that sees it, so the
    // closed base is never skipped for a frame.
    const startNow = !instant && fresh.length > 0 && fresh.some((k) => !lastSeen.includes(k));
    const active = useMemo(() => {
        if (!startNow) return opening;
        return new Set([...opening, ...fresh]);
    }, [startNow, opening, fresh]);

    useEffect(() => {
        held = heldKeys(edges);
        if (!startNow) return;
        setLastSeen(fresh);
        setOpening(new Set([...opening, ...fresh]));
        const t = setTimeout(() => {
            setOpening((prev) => {
                const next = new Set(prev);
                for (const k of fresh) next.delete(k);
                return next;
            });
        }, HELD_ROAD_DRAW_MS);
        timers.current.push(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edges]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    return active;
}
