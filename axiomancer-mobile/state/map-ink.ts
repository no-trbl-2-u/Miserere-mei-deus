/**
 * The map ink's one live spread (phase CX1b, A6 and A7).
 *
 * Confirming a walk to a fight node starts a spread here: the exploration
 * screen hands in the token's window point and what to do once the ink
 * covers (resolve the node's event, which stages the fight). `<MapInkHost>`,
 * mounted once in the root layout so the ink can cover the whole window
 * (the tab bar included), draws it and reports `covered`. From then until
 * the fight screen clears it the HANDOFF is armed: the fight route reads it
 * to open with no stack animation of its own, and the ink stays black over
 * the map so `<CombatGate>`'s push lands on a black screen.
 *
 * Module memory on purpose, like `death-return.ts`: it is presentation
 * only and never saved. A reload mid-spread finds nothing here; the move
 * already checkpointed with its arrival owed, so the map replays the fight.
 */

import { useSyncExternalStore } from 'react';

/** A point in window coordinates (points from the window's top-left). */
export interface InkPoint { x: number; y: number }

export interface MapInkRun {
    /** Distinct per spread, so a late report from an old one is ignored. */
    id: number;
    origin: InkPoint;
    /** True once the ink has covered the window and `onCovered` has run. */
    covered: boolean;
}

/** How long a covered spread waits for the fight screen before clearing itself. */
export const MAP_INK_HANDOFF_MAX_MS = 2500;

let current: MapInkRun | null = null;
let onCovered: (() => void) | null = null;
let nextId = 1;
let failSafe: ReturnType<typeof setTimeout> | null = null;
let hosts = 0;
const listeners = new Set<() => void>();

/**
 * `<MapInkHost>` registers while mounted. With no host there is nothing to
 * draw the spread, so `startMapInk` refuses and the caller resolves at once.
 */
export function registerMapInkHost(): () => void {
    hosts += 1;
    return () => { hosts = Math.max(0, hosts - 1); };
}

/** True while a host is mounted to draw a spread. */
export function hasMapInkHost(): boolean {
    return hosts > 0;
}

function emit(): void {
    for (const l of listeners) l();
}

function clearFailSafe(): void {
    if (failSafe !== null) clearTimeout(failSafe);
    failSafe = null;
}

/**
 * Start a spread from `origin`; `then` runs once, when the ink covers.
 * Replaces any spread already running. Returns null, starting nothing, when
 * no host is mounted to draw it: the caller then runs `then` itself.
 */
export function startMapInk(origin: InkPoint, then: () => void): number | null {
    if (hosts === 0) return null;
    clearFailSafe();
    const id = nextId++;
    current = { id, origin, covered: false };
    onCovered = then;
    emit();
    return id;
}

/**
 * The host's report that spread `id` covers the window. Runs the caller's
 * `then` once, arms the handoff, and starts the fail-safe: a fight screen
 * that never opens (nothing was staged after all) cannot leave the player
 * on black.
 */
export function markMapInkCovered(id: number): void {
    if (current === null || current.id !== id || current.covered) return;
    current = { ...current, covered: true };
    const then = onCovered;
    onCovered = null;
    emit();
    clearFailSafe();
    failSafe = setTimeout(() => {
        failSafe = null;
        clearMapInk();
    }, MAP_INK_HANDOFF_MAX_MS);
    then?.();
}

/** Lift the map ink (the fight screen has its own covered curtain up). */
export function clearMapInk(): void {
    clearFailSafe();
    if (current === null) return;
    current = null;
    onCovered = null;
    emit();
}

/** The spread now on screen, or null. */
export function currentMapInk(): MapInkRun | null {
    return current;
}

/** True while a covered spread is waiting for the fight screen: it opens with no stack animation. */
export function isMapInkHandoff(): boolean {
    return current !== null && current.covered;
}

function subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
}

/** The spread now on screen, as a subscription. */
export function useMapInk(): MapInkRun | null {
    return useSyncExternalStore(subscribe, currentMapInk, currentMapInk);
}

/** Tests only: forget any spread. */
export function __resetMapInkForTests(): void {
    clearFailSafe();
    current = null;
    onCovered = null;
    emit();
}
