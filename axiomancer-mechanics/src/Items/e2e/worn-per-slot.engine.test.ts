/**
 * Hermetic E2E — capacity-aware worn-state convention.
 *
 * `wornPerSlot` treats the first `SLOT_CAPACITY[slot]` equipment items per slot
 * as worn (weapon/armor: 1; relic: 3). `isEquippedFirstOfSlot` /
 * `findEquippedInSlot` report membership and the would-be-displaced piece.
 */

import { describe, it, expect } from 'vitest';

import {
    wornPerSlot, isEquippedFirstOfSlot, findEquippedInSlot,
    SLOT_CAPACITY,
} from '../index';
import type { Equipment, Item } from '../types';

function acc(id: string): Equipment {
    return { id, name: id, description: '', category: 'equipment', slot: 'relic' };
}
function wpn(id: string): Equipment {
    return { id, name: id, description: '', category: 'equipment', slot: 'weapon' };
}
const material: Item = { id: 'wood', name: 'Wood', description: '', category: 'material', quantity: 3 };

describe('Phase 18 — wornPerSlot capacity', () => {
    it('keeps only the first 3 relics worn', () => {
        const inv: Item[] = [acc('a'), acc('b'), acc('c'), acc('d'), acc('e')];
        const worn = wornPerSlot(inv).get('relic') ?? [];
        expect(worn.map(i => i.id)).toEqual(['a', 'b', 'c']);
        expect(worn.length).toBe(SLOT_CAPACITY.relic);
    });

    it('keeps only the first weapon worn', () => {
        const inv: Item[] = [wpn('sword'), wpn('axe')];
        expect((wornPerSlot(inv).get('weapon') ?? []).map(i => i.id)).toEqual(['sword']);
    });

    it('is stable under non-equipment items interleaved', () => {
        const inv: Item[] = [acc('a'), material, acc('b'), material, acc('c')];
        expect((wornPerSlot(inv).get('relic') ?? []).map(i => i.id)).toEqual(['a', 'b', 'c']);
    });

    it('isEquippedFirstOfSlot is true for any of the worn 3, false past the window', () => {
        const inv: Item[] = [acc('a'), acc('b'), acc('c'), acc('d')];
        expect(isEquippedFirstOfSlot(inv, inv[1] as Equipment)).toBe(true);  // b, worn
        expect(isEquippedFirstOfSlot(inv, inv[3] as Equipment)).toBe(false); // d, benched
    });

    it('findEquippedInSlot returns the displaced piece only when the row is full', () => {
        const twoWorn: Item[] = [acc('a'), acc('b')];
        // Free position → nothing displaced.
        expect(findEquippedInSlot(twoWorn, acc('candidate'))).toBeNull();

        const full: Item[] = [acc('a'), acc('b'), acc('c')];
        // Full row → the last worn relic is displaced.
        expect(findEquippedInSlot(full, acc('candidate'))?.id).toBe('c');

        // Target already worn → nothing displaced.
        expect(findEquippedInSlot(full, full[0] as Equipment)).toBeNull();
    });
});
