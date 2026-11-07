/**
 * Root-level provider for the tap-tooltip system.
 *
 * Mounts a single absolutely-positioned `<TapTooltip>` overlay
 * across the whole window. Consumers call
 * `useTooltip().show({ kind, id, anchorRef })`; the provider
 * measures the anchor with `measureInWindow`, looks up content
 * via `selectTooltipContentFor`, flips above/below by viewport
 * position, clamps horizontally to the screen, and renders.
 *
 * Dismiss triggers:
 * - Tap-outside (transparent backdrop captures the press).
 * - 6s auto-timeout (cleared on hide / re-show), skipped when the
 *   show is `pinned` (a held press): a pinned tooltip stays until it is
 *   tapped away or another press replaces it.
 * - `show` called with the same anchor toggles the tooltip off.
 * - Programmatic `hide()`.
 *
 * Hard rules:
 * - Single tooltip at a time; new show replaces the previous.
 * - No animation.
 * - `measureInWindow` zeros trigger a one-frame retry via
 *   `requestAnimationFrame`; second zero result is a no-op.
 * - Tooltip flips below the anchor when `anchor.y < 100` and
 *   back above when it would otherwise bleed off the bottom.
 * - Horizontal clamp: `[16, windowWidth - tooltipWidth - 16]`.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

import {
    selectTooltipContentFor,
    type TooltipAccent,
    type TooltipKind,
} from '@/state/presenters/tooltip.engine';
import { useGameStore } from '@/state/GameStoreProvider';

import { TapTooltip } from './TapTooltip';

const AUTO_DISMISS_MS = 6000;
const EDGE_MARGIN = 16;
const TOP_FLIP_THRESHOLD = 100;
const BOTTOM_FLIP_PADDING = 60;
const TOOLTIP_ESTIMATED_HEIGHT = 96;
const TOOLTIP_MAX_WIDTH = 280;
const ANCHOR_GAP = 8;

interface MeasurableRef {
    measureInWindow: (
        callback: (x: number, y: number, w: number, h: number) => void,
    ) => void;
}

interface ShowArgs {
    kind: TooltipKind;
    id: string;
    anchorRef: React.RefObject<MeasurableRef | null>;
    /** Skip the auto-dismiss timer; the tooltip stays until dismissed. */
    pinned?: boolean;
}

interface TooltipContextValue {
    show(args: ShowArgs): void;
    hide(): void;
}

const NOOP_CONTEXT: TooltipContextValue = {
    show: () => undefined,
    hide: () => undefined,
};

const TooltipContext = createContext<TooltipContextValue>(NOOP_CONTEXT);

interface ActiveTooltip {
    title: string;
    body: string;
    footnote?: string;
    accent?: TooltipAccent;
    left: number;
    top: number;
    anchorKey: string;
}

interface TooltipProviderProps {
    children: React.ReactNode;
    /**
     * Optional override — when omitted the provider reads
     * `Dimensions.get('window')`. Tests pass an explicit value to
     * keep the math deterministic across simulator vs CI.
     */
    windowSize?: { width: number; height: number };
}

export function TooltipProvider({ children, windowSize }: TooltipProviderProps) {
    // `useGameStore()` returns the stable store ref (does NOT
    // subscribe to changes). State is read imperatively inside
    // `show()` so the provider doesn't re-render on every engine
    // tick, while content still gets a fresh read at the moment of
    // tap.
    const store = useGameStore();
    const [active, setActive] = useState<ActiveTooltip | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeKeyRef = useRef<string | null>(null);
    const pinnedRef = useRef(false);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const hide = useCallback(() => {
        clearTimer();
        activeKeyRef.current = null;
        pinnedRef.current = false;
        setActive(null);
    }, [clearTimer]);

    const positionTooltip = useCallback(
        (x: number, y: number, h: number): { left: number; top: number } => {
            const dims = windowSize ?? Dimensions.get('window');
            const flipBelow = y < TOP_FLIP_THRESHOLD;
            let top = flipBelow
                ? y + h + ANCHOR_GAP
                : y - TOOLTIP_ESTIMATED_HEIGHT - ANCHOR_GAP;
            // Re-flip back above if the below position would bleed
            // off the bottom edge.
            if (
                flipBelow &&
                top + TOOLTIP_ESTIMATED_HEIGHT > dims.height - BOTTOM_FLIP_PADDING
            ) {
                top = y - TOOLTIP_ESTIMATED_HEIGHT - ANCHOR_GAP;
            }
            // Clamp top to the safe vertical band.
            if (top < EDGE_MARGIN) top = EDGE_MARGIN;

            const maxLeft = dims.width - TOOLTIP_MAX_WIDTH - EDGE_MARGIN;
            let left = x;
            if (left < EDGE_MARGIN) left = EDGE_MARGIN;
            if (left > maxLeft) left = maxLeft;

            return { left, top };
        },
        [windowSize],
    );

    const show = useCallback(
        ({ kind, id, anchorRef, pinned = false }: ShowArgs) => {
            const content = selectTooltipContentFor(kind, id, store.getState());
            if (content === null) {
                // Nothing to render — clear any prior tooltip but
                // don't mount a new one. Consumers can call show
                // freely without checking content first.
                hide();
                return;
            }

            const anchorKey = `${kind}::${id}`;
            // Same anchor tapped twice — toggle off.
            if (activeKeyRef.current === anchorKey) {
                // A hold on a word whose tooltip is already up (timed) pins it
                // in place rather than closing it.
                if (pinned && !pinnedRef.current) {
                    clearTimer();
                    pinnedRef.current = true;
                    return;
                }
                hide();
                return;
            }

            const ref = anchorRef.current;
            if (!ref) return;

            const measure = (
                x: number,
                y: number,
                _w: number,
                h: number,
                isRetry = false,
            ) => {
                // Anchor not laid out yet — retry one frame.
                if (x === 0 && y === 0 && h === 0 && !isRetry) {
                    requestAnimationFrame(() => {
                        ref.measureInWindow((rx, ry, rw, rh) => measure(rx, ry, rw, rh, true));
                    });
                    return;
                }

                const { left, top } = positionTooltip(x, y, h);
                clearTimer();
                activeKeyRef.current = anchorKey;
                pinnedRef.current = pinned;
                setActive({
                    title: content.title,
                    body: content.body,
                    footnote: content.footnote,
                    accent: content.accent,
                    left,
                    top,
                    anchorKey,
                });
                if (!pinned) {
                    timerRef.current = setTimeout(() => {
                        hide();
                    }, AUTO_DISMISS_MS);
                }
            };

            ref.measureInWindow((x, y, w, h) => measure(x, y, w, h, false));
        },
        [store, hide, positionTooltip, clearTimer],
    );

    useEffect(() => {
        return () => {
            clearTimer();
        };
    }, [clearTimer]);

    const value = useMemo<TooltipContextValue>(() => ({ show, hide }), [show, hide]);

    return (
        <TooltipContext.Provider value={value}>
            {children}
            {active ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={hide}
                        accessible={false}
                        testID="tap-tooltip-backdrop"
                    />
                    <TapTooltip
                        title={active.title}
                        body={active.body}
                        footnote={active.footnote}
                        accent={active.accent}
                        left={active.left}
                        top={active.top}
                    />
                </View>
            ) : null}
        </TooltipContext.Provider>
    );
}

export function useTooltipContext(): TooltipContextValue {
    return useContext(TooltipContext);
}
