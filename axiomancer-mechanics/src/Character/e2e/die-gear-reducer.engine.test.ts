/**
 * Hermetic E2E — die-gear reducer.
 *
 * Pure transitions over `Character.dieGear`:
 *  - HONE   adds a mana face (−1 miss); refused loudly at the 1-miss floor;
 *  - TEMPER upgrades a mana face to a special face; refused above the special
 *    cap (colored ≤ 2, wild ≤ 1) or with no mana face to spend;
 *  - SWAP   replaces a die's gear; cap-validated;
 *  - refusals return the input character UNCHANGED plus a reason;
 *  - upgrades never mutate the frozen `DEFAULT_DIE_GEAR`;
 *  - the upgraded face table actually changes the die's rolled faces.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../types';
import type { UpgradeableDieGear } from '../../Combat/combat.encounter.types';
import {
    honeDieGear, temperDieGear, swapDieGear,
    validateDieGear, concreteDefaultRail, characterDieGear,
    dieGearMissFaces,
} from '../dieGear.reducer';
import {
    DEFAULT_DIE_GEAR, rollUpgradeableFace,
} from '../../Combat/combat.upgradeable-dice';

const base = (): Character => deepClone(Player);

/** rng that yields d6 face index `i` (0..5) deterministically. */
const faceAt = (i: number): (() => number) => () => (i + 0.5) / 6;

/** Count faces of each kind across the full 6-face sweep of a gear piece. */
function faceCounts(gear: UpgradeableDieGear): { special: number; mana: number; miss: number } {
    const c = { special: 0, mana: 0, miss: 0 };
    for (let i = 0; i < 6; i++) c[rollUpgradeableFace(gear, faceAt(i))]++;
    return c;
}

describe('die-gear reducer — HONE', () => {
    it('adds a mana face and removes a miss face', () => {
        const out = honeDieGear(base(), 'heart');
        expect(out.ok).toBe(true);
        expect(out.reason).toBeNull();
        const g = characterDieGear(out.character, 'heart');
        expect(g.manaFaces).toBe(3);          // 2 → 3
        expect(dieGearMissFaces(g)).toBe(2);  // 3 → 2
        expect(g.specialFaces).toBe(1);       // unchanged
    });

    it('the honed face table actually rolls more mana faces', () => {
        const before = faceCounts(characterDieGear(base(), 'heart'));
        expect(before).toEqual({ special: 1, mana: 2, miss: 3 });
        const honed = honeDieGear(base(), 'heart').character;
        const after = faceCounts(characterDieGear(honed, 'heart'));
        expect(after).toEqual({ special: 1, mana: 3, miss: 2 });
    });

    it('refuses loudly at the 1-miss floor (whiff is never forgeable away)', () => {
        // Wild starts at 4 miss: 3 hones reach 1 miss, the 4th is refused.
        let c = base();
        c = honeDieGear(c, 'wild').character;
        c = honeDieGear(c, 'wild').character;
        c = honeDieGear(c, 'wild').character;
        expect(dieGearMissFaces(characterDieGear(c, 'wild'))).toBe(1);
        const refused = honeDieGear(c, 'wild');
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/miss/i);
        expect(refused.character).toBe(c); // unchanged reference
    });
});

describe('die-gear reducer — TEMPER', () => {
    it('upgrades a mana face to a special face', () => {
        const out = temperDieGear(base(), 'body');
        expect(out.ok).toBe(true);
        const g = characterDieGear(out.character, 'body');
        expect(g.specialFaces).toBe(2); // 1 → 2
        expect(g.manaFaces).toBe(1);    // 2 → 1
        expect(dieGearMissFaces(g)).toBe(3);
    });

    it('refuses above the colored special cap of 2', () => {
        const once = temperDieGear(base(), 'mind').character; // 2 special now
        const refused = temperDieGear(once, 'mind');
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/cap/i);
        expect(refused.character).toBe(once);
    });

    it('refuses the wild die above its special cap of 1', () => {
        const refused = temperDieGear(base(), 'wild'); // wild already at 1 special
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/cap/i);
    });

    it('refuses when there is no mana face to upgrade', () => {
        // Body: temper twice would need 2 mana → after one temper mana=1, cap
        // already hit; craft a no-mana gear directly via swap for the witness.
        const noMana = swapDieGear(base(), 'body', {
            dieColor: 'body', specialFaces: 2, manaFaces: 0,
        }).character;
        const refused = temperDieGear(noMana, 'body');
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/no mana/i);
    });
});

describe('die-gear reducer — SWAP + validation', () => {
    it('swaps a whole gear piece (the gear-change path)', () => {
        const out = swapDieGear(base(), 'heart', {
            dieColor: 'heart', specialFaces: 1, manaFaces: 3,
        });
        expect(out.ok).toBe(true);
        expect(characterDieGear(out.character, 'heart').manaFaces).toBe(3);
    });

    it('refuses a cap-violating swap (colored, 3 special)', () => {
        const refused = swapDieGear(base(), 'heart', {
            dieColor: 'heart', specialFaces: 3, manaFaces: 2,
        });
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/cap/i);
    });

    it('refuses a swap whose gear drives the wrong color', () => {
        const refused = swapDieGear(base(), 'heart', {
            dieColor: 'body', specialFaces: 1, manaFaces: 2,
        });
        expect(refused.ok).toBe(false);
        expect(refused.reason).toMatch(/drives/i);
    });

    it('validateDieGear is the single cap authority', () => {
        expect(validateDieGear({ dieColor: 'heart', specialFaces: 2, manaFaces: 3 }, 'heart')).toBeNull();
        expect(validateDieGear({ dieColor: 'heart', specialFaces: 3, manaFaces: 2 }, 'heart')).toBe('the heart die is capped at 2 BOON faces');
        expect(validateDieGear({ dieColor: 'wild', specialFaces: 2, manaFaces: 1 }, 'wild')).toBe('the gold die is capped at 1 BOON face');
        expect(validateDieGear({ dieColor: 'heart', specialFaces: 2, manaFaces: 4 }, 'heart')).toMatch(/miss/);
    });
});

describe('die-gear reducer — immutability + rail materialization', () => {
    it('never mutates the frozen DEFAULT_DIE_GEAR', () => {
        honeDieGear(base(), 'heart');
        temperDieGear(base(), 'body');
        expect(DEFAULT_DIE_GEAR.heart).toEqual({ dieColor: 'heart', specialFaces: 1, manaFaces: 2 });
        expect(DEFAULT_DIE_GEAR.body).toEqual({ dieColor: 'body', specialFaces: 1, manaFaces: 2 });
        expect(Object.isFrozen(DEFAULT_DIE_GEAR)).toBe(true);
    });

    it('writes a full concrete 4-color rail on first upgrade', () => {
        const out = honeDieGear(base(), 'heart').character;
        expect(out.dieGear).toBeDefined();
        expect(Object.keys(out.dieGear!).sort()).toEqual(['body', 'heart', 'mind', 'wild']);
    });

    it('concreteDefaultRail matches the default loadout but is mutable', () => {
        const rail = concreteDefaultRail();
        expect(rail.wild).toEqual({ dieColor: 'wild', specialFaces: 1, manaFaces: 1 });
        rail.wild.manaFaces = 2; // must not throw (mutable copy)
        expect(DEFAULT_DIE_GEAR.wild.manaFaces).toBe(1);
    });
});
