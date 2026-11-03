/**
 * Hermetic E2E Tests — Combat-mode context
 *
 * Pins the one-shot `lastOutcome` signal that the exploration screen
 * reads to render the post-victory aftermath banner. The signal
 * lives on the React-context shim at `state/combat-mode.tsx` (UI-only,
 * not engine state).
 *
 * Hermetic = self-contained + deterministic + isolated. Uses
 * `react-test-renderer` semantics via React's createRoot + a small
 * effect-driven probe component to read the context API.
 */

import { afterEach, describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import React from 'react';

import { CombatModeProvider, useCombatMode } from '@/state/combat-mode';

afterEach(() => {
    // Each test isolates via its own renderHook; nothing global to reset.
});

function wrapper({ children }: { children: React.ReactNode }) {
    return <CombatModeProvider>{children}</CombatModeProvider>;
}

describe('combat-mode: lastOutcome signal', () => {
    it('starts null on a fresh provider', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        expect(result.current.lastOutcome).toBeNull();
    });

    it('exitCombatWith stashes the outcome and flips inCombat to false', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        expect(result.current.inCombat).toBe(true);
        expect(result.current.lastOutcome).toBeNull();

        act(() => result.current.exitCombatWith('victory'));
        expect(result.current.inCombat).toBe(false);
        expect(result.current.lastOutcome).toBe('victory');
    });

    it('exitCombatWith works for every CombatOutcome variant', () => {
        for (const outcome of ['victory', 'defeat', 'flee'] as const) {
            const { result } = renderHook(() => useCombatMode(), { wrapper });
            act(() => result.current.enterCombat());
            act(() => result.current.exitCombatWith(outcome));
            expect(result.current.lastOutcome).toBe(outcome);
        }
    });

    it('clearLastOutcome resets to null without re-entering combat', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() => result.current.exitCombatWith('victory'));
        expect(result.current.lastOutcome).toBe('victory');

        act(() => result.current.clearLastOutcome());
        expect(result.current.lastOutcome).toBeNull();
        expect(result.current.inCombat).toBe(false);
    });

    it('enterCombat clears any stale lastOutcome from the prior fight', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() => result.current.exitCombatWith('victory'));
        expect(result.current.lastOutcome).toBe('victory');

        // Without a clearLastOutcome between fights, the new
        // enterCombat must reset — otherwise the banner from the
        // last fight would race the next aftermath signal.
        act(() => result.current.enterCombat());
        expect(result.current.lastOutcome).toBeNull();
        expect(result.current.inCombat).toBe(true);
    });

    it('plain exitCombat does NOT change lastOutcome (DEPART path stays silent)', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        // No exitCombatWith call — the early-DEPART path uses plain
        // exitCombat so the banner stays silent.
        act(() => result.current.exitCombat());
        expect(result.current.inCombat).toBe(false);
        expect(result.current.lastOutcome).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Aftermath data snapshot + dismissAftermath
// ---------------------------------------------------------------------------

describe('combat-mode: aftermathData + dismissAftermath', () => {
    it('aftermathData starts null on a fresh provider', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        expect(result.current.aftermathData).toBeNull();
    });

    it('exitCombatWith accepts an optional snapshot payload and stashes it', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() =>
            result.current.exitCombatWith('victory', {
                variant: 'victory',
                enemy: { name: 'Larch-Stalker', description: 'A figure long since gnawed.', level: 3 },
                finalBlow: { cardName: 'STRIKE', damage: 24, descriptor: 'cleaves the rib' },
                xpReward: 18,
            }),
        );
        expect(result.current.lastOutcome).toBe('victory');
        expect(result.current.aftermathData).toEqual({
            variant: 'victory',
            enemy: { name: 'Larch-Stalker', description: 'A figure long since gnawed.', level: 3 },
            finalBlow: { cardName: 'STRIKE', damage: 24, descriptor: 'cleaves the rib' },
            xpReward: 18,
        });
    });

    it('exitCombatWith without a payload leaves aftermathData null (back-compat)', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() => result.current.exitCombatWith('flee'));
        expect(result.current.lastOutcome).toBe('flee');
        expect(result.current.aftermathData).toBeNull();
    });

    it('dismissAftermath atomically clears outcome + data', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() =>
            result.current.exitCombatWith('victory', {
                variant: 'victory',
                enemy: { name: 'Larch-Stalker', description: 'A figure.', level: 1 },
                finalBlow: null,
                xpReward: null,
            }),
        );
        expect(result.current.lastOutcome).toBe('victory');
        expect(result.current.aftermathData).not.toBeNull();

        act(() => result.current.dismissAftermath());
        expect(result.current.lastOutcome).toBeNull();
        expect(result.current.aftermathData).toBeNull();
    });

    it('enterCombat clears any stale aftermathData (mirrors lastOutcome behavior)', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() =>
            result.current.exitCombatWith('victory', {
                variant: 'victory',
                enemy: { name: 'Foe', description: 'old.', level: 1 },
                finalBlow: null,
                xpReward: null,
            }),
        );
        expect(result.current.aftermathData).not.toBeNull();
        act(() => result.current.enterCombat());
        expect(result.current.aftermathData).toBeNull();
    });

    it('clearLastOutcome also clears aftermathData (paired one-shot)', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() =>
            result.current.exitCombatWith('victory', {
                variant: 'victory',
                enemy: { name: 'Foe', description: 'short.', level: 1 },
                finalBlow: null,
                xpReward: null,
            }),
        );
        act(() => result.current.clearLastOutcome());
        expect(result.current.lastOutcome).toBeNull();
        expect(result.current.aftermathData).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Run-stats counters (encountersFaced + deepestNodeId)
// ---------------------------------------------------------------------------

describe('combat-mode: run-stats counters', () => {
    it('encountersFaced starts at 0 and deepestNodeId at null', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        expect(result.current.encountersFaced).toBe(0);
        expect(result.current.deepestNodeId).toBeNull();
    });

    it('enterCombat increments encountersFaced by one', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        expect(result.current.encountersFaced).toBe(1);
        act(() => result.current.exitCombat());
        act(() => result.current.enterCombat());
        expect(result.current.encountersFaced).toBe(2);
    });

    it('recordDeepestNode overwrites with the most-recent node id', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.recordDeepestNode('i.a'));
        expect(result.current.deepestNodeId).toBe('i.a');
        act(() => result.current.recordDeepestNode('iii.b'));
        expect(result.current.deepestNodeId).toBe('iii.b');
    });

    it('resetRunStats zeros encountersFaced + nulls deepestNodeId', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() => result.current.exitCombat());
        act(() => result.current.recordDeepestNode('iv.c'));
        expect(result.current.encountersFaced).toBeGreaterThan(0);
        expect(result.current.deepestNodeId).not.toBeNull();

        act(() => result.current.resetRunStats());
        expect(result.current.encountersFaced).toBe(0);
        expect(result.current.deepestNodeId).toBeNull();
    });

    it('clearLastOutcome does NOT reset run-stats (they persist across encounters)', () => {
        const { result } = renderHook(() => useCombatMode(), { wrapper });
        act(() => result.current.enterCombat());
        act(() => result.current.recordDeepestNode('ii.a'));
        act(() => result.current.clearLastOutcome());
        expect(result.current.encountersFaced).toBe(1);
        expect(result.current.deepestNodeId).toBe('ii.a');
    });
});
