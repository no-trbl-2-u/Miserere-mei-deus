/**
 * Hermetic E2E — moveRelic (EQ3a, A2).
 *
 * `moveRelic(character, from, to)` moves the relic at `from` to `to`, swaps
 * when `to` is full, and changes nothing else: same worn set, same
 * `maxHealth`, same signatures.
 */

import { describe, it, expect } from 'vitest';

import { createCharacter } from '../index';
import { equipItem, moveRelic, getEquippedItems } from '../equipment.reducer';
import { getSignaturesForLoadout, getRelicById } from '../../Items/relic.library';
import type { Equipment } from '../../Items/types';
import type { StatModifier } from '../../Effects/types';

function relic(id: string, maxHp = 0): Equipment {
    const statModifiers: StatModifier[] = maxHp ? [{ stat: 'maxHp', value: maxHp }] : [];
    return { id, name: id, description: '', category: 'equipment', slot: 'relic', statModifiers };
}

const ids = (c: { equipment: { relics: (Equipment | null)[] } }) => c.equipment.relics.map((i) => i?.id ?? null);

const fresh = () => createCharacter({ name: 'Test', level: 5, baseStats: { heart: 5, body: 5, mind: 5 } });

describe('moveRelic', () => {
    it('moves a relic to an empty position and leaves the old one empty', () => {
        let c = fresh();
        c = equipItem(c, relic('a', 3));
        c = equipItem(c, relic('b', 4), { position: 2 });
        const moved = moveRelic(c, 0, 1);
        expect(ids(moved)).toEqual([null, 'a', 'b']);
        expect(moved.maxHealth).toBe(c.maxHealth);
        expect(getEquippedItems(moved.equipment).map(i => i.id).sort()).toEqual(['a', 'b']);
    });

    it('swaps with a full position', () => {
        let c = fresh();
        for (const id of ['a', 'b', 'c']) c = equipItem(c, relic(id, 2));
        const swapped = moveRelic(c, 0, 2);
        expect(ids(swapped)).toEqual(['c', 'b', 'a']);
        expect(swapped.maxHealth).toBe(c.maxHealth);
        expect(swapped.health).toBe(c.health);
    });

    it('from === to hands the same reference back', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        expect(moveRelic(c, 0, 0)).toBe(c);
    });

    it('an empty source or a non-position is the same reference', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        expect(moveRelic(c, 1, 2)).toBe(c);
        expect(moveRelic(c, 0, 3)).toBe(c);
        expect(moveRelic(c, -1, 0)).toBe(c);
        expect(moveRelic(c, 0.5, 1)).toBe(c);
    });

    it('keeps the same signatures whatever the order', () => {
        const ring = getRelicById('relic-disarming-plea')!;
        const signet = getRelicById('relic-bleeding-signet')!;
        let c = fresh();
        c = equipItem(c, ring);
        c = equipItem(c, signet);
        const before = getSignaturesForLoadout(c.equipment);
        const after = getSignaturesForLoadout(moveRelic(c, 0, 2).equipment);
        expect([...after].sort()).toEqual([...before].sort());
    });

    it('does not mutate the character it was given', () => {
        let c = fresh();
        c = equipItem(c, relic('a'));
        const snapshot = JSON.stringify(c.equipment);
        moveRelic(c, 0, 2);
        expect(JSON.stringify(c.equipment)).toBe(snapshot);
    });
});
