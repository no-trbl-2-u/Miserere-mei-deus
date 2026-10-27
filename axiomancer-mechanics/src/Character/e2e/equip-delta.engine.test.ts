/**
 * Equip-change delta — hermetic E2E tests.
 *
 * Pins the three delta modes (equip / unequip / swap), the deltas-only
 * contract, signature gained/lost surfacing, and the engine-simulated stat
 * diff. Hermetic: builds characters/equipment in-line, no mocks.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../index';
import { computeEquipDelta } from '../equip-delta';
import type { Equipment } from '../../Items/types';

const buildPlayer = () =>
    createCharacter({ name: 'TestPlayer', level: 5, baseStats: { heart: 4, body: 3, mind: 2 } });

function makeEquipment(id: string, extra: Partial<Equipment> = {}): Equipment {
    return {
        id,
        name: id,
        description: '',
        category: 'equipment',
        slot: 'weapon',
        ...extra,
    };
}

describe('computeEquipDelta (Phase 23 — stat + signature diff only)', () => {
    it('equip into an empty slot → mode equip, stat gain surfaced', () => {
        const candidate = makeEquipment('blade', {
            statModifiers: [{ stat: 'maxHp', value: 3 }],
        });
        const d = computeEquipDelta(candidate, null, buildPlayer());
        expect(d.mode).toBe('equip');
        expect(d.against).toBeNull();
        expect(d.stats.some((s) => s.delta > 0)).toBe(true);
    });

    it('a multi-stat relic surfaces every changed line in the full recomputed diff, not just maxHealth', () => {
        const circlet = makeEquipment('circlet', {
            slot: 'relic',
            statModifiers: [{ stat: 'body', value: 5 }, { stat: 'maxHp', value: 20 }],
        });
        const d = computeEquipDelta(circlet, null, buildPlayer());
        expect(d.stats.some((s) => s.stat === 'body' && s.delta === 5)).toBe(true);
        expect(d.stats.some((s) => s.delta === 20)).toBe(true);
    });

    it('unequip the worn item → mode unequip, against the item', () => {
        const worn = makeEquipment('blade', { statModifiers: [{ stat: 'maxHp', value: 3 }] });
        const d = computeEquipDelta(worn, worn, buildPlayer());
        expect(d.mode).toBe('unequip');
        expect(d.against).toEqual({ id: 'blade', name: 'blade' });
    });

    it('swap → mode swap, against the worn sibling', () => {
        const worn = makeEquipment('old', { statModifiers: [{ stat: 'maxHp', value: 1 }] });
        const candidate = makeEquipment('new', { statModifiers: [{ stat: 'maxHp', value: 4 }] });
        const d = computeEquipDelta(candidate, worn, buildPlayer());
        expect(d.mode).toBe('swap');
        expect(d.against).toEqual({ id: 'old', name: 'old' });
    });

    it('is empty when nothing changes (identical worn item, no player)', () => {
        const item = makeEquipment('plain');
        const d = computeEquipDelta(item, item);
        expect(d.mode).toBe('unequip');
        expect(d.isEmpty).toBe(true);
    });

    // ── Signet relic signature swap (the ring is the one signature)
    it('surfaces the granted signature (with name) when equipping a signet relic', () => {
        const relic = makeEquipment('relic-x', { grantsSignature: 'sig-disarming-plea' });
        const d = computeEquipDelta(relic, null);
        expect(d.signatures.gained).toEqual([
            { id: 'sig-disarming-plea', name: 'The Open Hand' },
        ]);
        expect(d.signatures.lost).toEqual([]);
        expect(d.isEmpty).toBe(false);
    });

    it('surfaces the lost signature when unequipping a signet relic', () => {
        const relic = makeEquipment('relic-x', { grantsSignature: 'sig-disarming-plea' });
        const d = computeEquipDelta(relic, relic);
        expect(d.mode).toBe('unequip');
        expect(d.signatures.lost).toEqual([{ id: 'sig-disarming-plea', name: 'The Open Hand' }]);
        expect(d.signatures.gained).toEqual([]);
    });

    it('swapping a relic for plain gear surfaces the lost signature, and back the gained one', () => {
        const relic = makeEquipment('relic-a', { grantsSignature: 'sig-disarming-plea' });
        const plain = makeEquipment('plain-b');
        const off = computeEquipDelta(plain, relic);
        expect(off.mode).toBe('swap');
        expect(off.signatures.gained).toEqual([]);
        expect(off.signatures.lost.map(s => s.id)).toEqual(['sig-disarming-plea']);
        const on = computeEquipDelta(relic, plain);
        expect(on.mode).toBe('swap');
        expect(on.signatures.gained.map(s => s.id)).toEqual(['sig-disarming-plea']);
        expect(on.signatures.lost).toEqual([]);
    });

    it('a same-signature swap nets to no signature change', () => {
        const worn = makeEquipment('relic-a', { grantsSignature: 'sig-disarming-plea' });
        const candidate = makeEquipment('relic-b', { grantsSignature: 'sig-disarming-plea' });
        const d = computeEquipDelta(candidate, worn);
        expect(d.signatures.gained).toEqual([]);
        expect(d.signatures.lost).toEqual([]);
    });

    it('non-relic gear surfaces no signatures', () => {
        const d = computeEquipDelta(makeEquipment('plain-blade'), null);
        expect(d.signatures.gained).toEqual([]);
        expect(d.signatures.lost).toEqual([]);
    });
});
