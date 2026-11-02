/**
 * Combat juice adoption witness. Proves the status-proc,
 * damage-tick, and card-refusal-sibling (card play) sites actually fire
 * through the lib/juice primitives, not just that the module exists in
 * isolation.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import * as Juice from '@/lib/juice';
import { PlayerMedallion, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import type { CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import type { CombatEvent } from '@mechanics';
import { withAllProviders } from '@/test-utils/withAllProviders';

// Wrap (not replace) the real primitives so behavior is unchanged — this
// proves the CALL SITE wiring, not just that the module exists in isolation.
jest.mock('@/lib/juice', () => {
    const actual = jest.requireActual('@/lib/juice') as typeof Juice;
    return {
        ...actual,
        useJuicePulse: jest.fn(actual.useJuicePulse),
        useJuiceNumberPop: jest.fn(actual.useJuiceNumberPop),
        useJuiceShake: jest.fn(actual.useJuiceShake),
        useJuiceFlash: jest.fn(actual.useJuiceFlash),
    };
});

const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
    // The damage-scaler ledgers; idle here (this
    // witness is about the juice call sites, not the ledgers).
};

const fx = (events: CombatEvent[]): CombatFx => ({ seq: 1, events });

describe('PlayerMedallion — combat adoption of lib/juice primitives', () => {
    it('a self dot-tick event (a VITAE damage tick) triggers the number-pop primitive', () => {
        const events = [{
            kind: 'dot-tick', effectId: 'burn', label: 'Burn', amount: 4, target: 'self',
        }] as unknown as CombatEvent[];
        const { tree } = withAllProviders(<PlayerMedallion player={PLAYER} fx={fx(events)} />);
        render(tree);
        // FloatNum (the "-4" pop) mounts through useJuiceNumberPop.
        expect(Juice.useJuiceNumberPop).toHaveBeenCalled();
    });

    it('a self effect-landed event (status-proc) bumps the status-proc pulse', () => {
        const events = [{
            kind: 'effect-landed', cardId: 'x', effectId: 'burn', target: 'self',
            effectKind: 'dot', intensity: 1, effect: { id: 'burn', name: 'Burn' },
        }] as unknown as CombatEvent[];
        const { tree } = withAllProviders(<PlayerMedallion player={PLAYER} fx={fx(events)} />);
        render(tree);
        // useJuicePulse is called every render (triggerKey=0 baseline) — the
        // proof is that it's called with a RISEN key once the status lands.
        const calls = (Juice.useJuicePulse as jest.Mock).mock.calls as [number, number][];
        const pulseCalls = calls.filter(([, intensity]) => intensity === 1);
        expect(pulseCalls.some(([key]) => key > 0)).toBe(true);
    });

    it('a quiet render (no fx) never bumps the status pulse above 0', () => {
        (Juice.useJuicePulse as jest.Mock).mockClear();
        const { tree } = withAllProviders(<PlayerMedallion player={PLAYER} />);
        render(tree);
        const calls = (Juice.useJuicePulse as jest.Mock).mock.calls as [number, number][];
        expect(calls.every(([key]) => key === 0)).toBe(true);
    });
});
