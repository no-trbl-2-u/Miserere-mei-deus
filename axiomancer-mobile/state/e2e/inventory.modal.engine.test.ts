/**
 * Hermetic E2E Tests — Inventory modal presenter.
 *
 * The modal previews the result of using or equipping an item before
 * the player confirms. These tests drive `selectItemModalViewModel`
 * end-to-end through the engine store with no mocks.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import {
    createCharacter,
    createGameStore,
    type Consumable,
    type Equipment,
} from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { selectItemModalViewModel } from '@/state/presenters/inventory.modal.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

/**
 * A store whose player carries `inventory` and wears `worn` (the
 * `player.equipment` loadout, the one record of what is worn).
 */
function makeStore(
    inventory: readonly (Consumable | Equipment)[],
    worn: readonly Equipment[] = [],
) {
    const base = createCharacter({
        name: 'Pilgrim',
        level: 1,
        baseStats: { heart: 4, body: 4, mind: 4 },
        equipment: [...worn],
    });
    const player = { ...base, health: 5, inventory: [...inventory] };
    return createGameStore(createMemoryAdapter(), { player });
}

const potion: Consumable = {
    id: 'phial',
    name: 'Potion of Heart',
    description: 'A small phial of ruby liquor.',
    category: 'consumable',
    healAmount: 6,
    quantity: 1,
};

const blade: Equipment = {
    id: 'long-blade',
    name: 'Long Blade',
    description: 'Iron, notched.',
    category: 'equipment',
    slot: 'weapon',
    
    
};

// A stat-bearing weapon that exercises the equip stat-delta surface:
// it adds max health (`maxHp`, the only equipment stat line), so swapping
// it in over the plain `blade` produces a real, non-empty set of changes.
const runeBlade: Equipment = {
    id: 'rune-blade',
    name: 'Rune Blade',
    description: 'Etched with a humming sigil.',
    category: 'equipment',
    slot: 'weapon',
    
    
    statModifiers: [{ stat: 'maxHp', value: 5 }],
};

// A weapon granting a fractional max-health modifier — exercises the
// one-decimal rounding of stat values in the modal.
const fractionBlade: Equipment = {
    id: 'fraction-blade',
    name: 'Fractional Blade',
    description: 'Suspiciously precise.',
    category: 'equipment',
    slot: 'weapon',
    
    
    statModifiers: [{ stat: 'maxHp', value: 1.55432728 }],
};

// Two named (affixed) weapons that prove the equip/swap block shows
// non-stat changes, not affix/keyword add-removes.
const affixBladeWorn: Equipment = {
    id: 'affix-worn',
    name: 'Dull Blade',
    description: 'A worn affixed blade.',
    category: 'equipment',
    slot: 'weapon',
    
    
};
const affixBladeCandidate: Equipment = {
    id: 'affix-candidate',
    name: 'Glittering Blade',
    description: 'A bright affixed blade with a ward.',
    category: 'equipment',
    slot: 'weapon',
    
    
};

// ---------------------------------------------------------------------------

describe('selectItemModalViewModel: missing item', () => {
    it('returns null when the item id is unknown', () => {
        const store = makeStore([potion]);
        expect(selectItemModalViewModel(store.getState(), 'missing')).toBeNull();
    });
});

describe('selectItemModalViewModel: consumable preview (Q2)', () => {
    it('reports mode "use" and a DRINK confirm label', () => {
        const store = makeStore([potion]);

        const vm = selectItemModalViewModel(store.getState(), 'phial')!;

        expect(vm.mode).toBe('use');
        expect(vm.confirmLabel).toBe('DRINK');
        expect(vm.confirmPrompt).toMatch(/potion/i);
    });

    it('shows the VITAE delta in the preview lines', () => {
        const store = makeStore([potion]);

        const vm = selectItemModalViewModel(store.getState(), 'phial')!;

        expect(vm.previewLines.some((l) => /\+6/.test(l))).toBe(true);
        expect(vm.previewLines.some((l) => /VITAE/.test(l))).toBe(true);
    });

    it('reports "No VITAE change." when the effect is non-healing', () => {
        // Intentionally exercises the `effectId` fallback: a free-form
        // non-healing effect should round-trip through `parseHealAmount → 0`
        // and surface the "No VITAE change." preview line.
        const odd: Consumable = {
            ...potion,
            id: 'wine',
            healAmount: undefined,
            effectId: '+4 Mana',
        };
        const store = makeStore([odd]);

        const vm = selectItemModalViewModel(store.getState(), 'wine')!;

        expect(vm.previewLines.join(' ')).toMatch(/No VITAE change/i);
    });
});

describe('selectItemModalViewModel: the desperation band (Phase 96)', () => {
    /**
     * A two-band potion. `makeStore` seeds the player at 5 HP against a
     * `createCharacter`-derived maxHealth well above 10, so the default store
     * player is DEEP inside the band — the "above the band" cases below have to
     * raise health explicitly.
     */
    const banded: Consumable = {
        ...potion,
        id: 'banded-phial',
        name: 'Banded Phial',
        healAmount: 6,
        healAmountBelowHalf: 9,
    };

    /** Rebuild the store with the player pinned to a given HP. */
    function makeStoreAtHp(inventory: readonly Consumable[], health: number) {
        const base = createCharacter({
            name: 'Pilgrim',
            level: 1,
            baseStats: { heart: 4, body: 4, mind: 4 },
        });
        const player = { ...base, health, inventory: [...inventory] };
        return createGameStore(createMemoryAdapter(), { player });
    }

    it('previews the LARGER heal, flagged, when the player is badly wounded', () => {
        const store = makeStore([banded]); // seeded at 5 HP — inside the band
        const vm = selectItemModalViewModel(store.getState(), 'banded-phial')!;

        const lines = vm.previewLines.join(' ');
        expect(lines).toMatch(/Heal 9 VITAE/);
        expect(lines).toMatch(/badly wounded/i);
        // The flat number must NOT be the headline while the band is active.
        expect(vm.previewLines[0]).not.toMatch(/Heal 6 VITAE/);
    });

    it('previews the flat heal AND advertises the band when the player is healthy', () => {
        const base = createCharacter({
            name: 'Pilgrim', level: 1, baseStats: { heart: 4, body: 4, mind: 4 },
        });
        const store = makeStoreAtHp([banded], base.maxHealth);
        const vm = selectItemModalViewModel(store.getState(), 'banded-phial')!;

        const lines = vm.previewLines.join(' ');
        // This advertisement is the lever's whole job: a player at full health
        // has to be able to SEE that the flask is worth more later, or they will
        // keep hoarding it.
        expect(lines).toMatch(/Heal 6 VITAE/);
        expect(lines).toMatch(/9 VITAE instead when below half/i);
        expect(lines).not.toMatch(/badly wounded/i);
    });

    it('says nothing about a band for a band-less potion', () => {
        const store = makeStore([potion]); // flat-only, player inside the band
        const vm = selectItemModalViewModel(store.getState(), 'phial')!;

        const lines = vm.previewLines.join(' ');
        expect(lines).toMatch(/Heal 6 VITAE/);
        expect(lines).not.toMatch(/below half/i);
        expect(lines).not.toMatch(/badly wounded/i);
    });

    it('projects the HP delta off the band-resolved amount, not the flat one', () => {
        // 5 HP, banded potion pays 9 → the projected line must read the 9.
        const store = makeStore([banded]);
        const vm = selectItemModalViewModel(store.getState(), 'banded-phial')!;

        expect(vm.previewLines.some((l) => /\+9/.test(l))).toBe(true);
    });
});

describe('selectItemModalViewModel: equipment preview (Q5)', () => {
    it('reports mode "equip" and an EQUIP · REPLACE label when there is a worn sibling (Phase 36)', () => {
        const second: Equipment = { ...blade, id: 'second', name: 'Whittled Stick' };
        const store = makeStore([blade, second], [blade]);

        const vm = selectItemModalViewModel(store.getState(), 'second')!;

        expect(vm.mode).toBe('equip');
        expect(vm.confirmLabel).toBe('EQUIP · REPLACE LONG BLADE');
        expect(vm.replacingName).toBe('Long Blade');
    });

    it('reports a plain EQUIP label + null replacingName when the slot is empty (Phase 36)', () => {
        // Carried but not worn: inventory order means nothing.
        const store = makeStore([blade]);

        const vm = selectItemModalViewModel(store.getState(), 'long-blade')!;

        expect(vm.mode).toBe('equip');
        expect(vm.confirmLabel).toBe('EQUIP');
        expect(vm.replacingName).toBeNull();
    });

    it('reports mode "unequip" + UNEQUIP for the sole worn item in its slot (EQ1 A2)', () => {
        // Taking it off leaves the slot empty; that is legal.
        const store = makeStore([blade], [blade]);

        const vm = selectItemModalViewModel(store.getState(), 'long-blade')!;

        expect(vm.mode).toBe('unequip');
        expect(vm.confirmLabel).toBe('UNEQUIP');
        expect(vm.confirmPrompt).toMatch(/stop wearing/i);
        expect(vm.replacingName).toBeNull();
    });

    it('reads worn state from player.equipment, not inventory order (EQ1 A1)', () => {
        const peer: Equipment = {
            id: 'short-blade',
            name: 'Short Blade',
            description: 'Cracked at the hilt.',
            category: 'equipment',
            slot: 'weapon',
        };
        // The worn blade sits SECOND in the inventory.
        const store = makeStore([peer, blade], [blade]);

        expect(selectItemModalViewModel(store.getState(), 'long-blade')!.mode).toBe('unequip');
        const peerVm = selectItemModalViewModel(store.getState(), 'short-blade')!;
        expect(peerVm.mode).toBe('equip');
        expect(peerVm.confirmLabel).toBe('EQUIP · REPLACE LONG BLADE');
    });

    it('a full accessory row offers EQUIP · REPLACE <the last-worn accessory> (EQ1 A2)', () => {
        const trinket = (id: string, name: string): Equipment => ({
            id, name, description: '', category: 'equipment', slot: 'accessory',
        });
        const worn = [trinket('t1', 'First'), trinket('t2', 'Second'), trinket('t3', 'Third')];
        const spare = trinket('t4', 'Spare');
        const store = makeStore([...worn, spare], worn);

        const vm = selectItemModalViewModel(store.getState(), 't4')!;
        expect(vm.mode).toBe('equip');
        expect(vm.confirmLabel).toBe('EQUIP · REPLACE THIRD');

        // Two worn: a free position, plain EQUIP.
        const roomy = makeStore([...worn, spare], worn.slice(0, 2));
        expect(selectItemModalViewModel(roomy.getState(), 't4')!.confirmLabel).toBe('EQUIP');
    });

    it('exposes a stat delta table for the modal to render', () => {
        // `blade` is worn; tapping the stat-bearing peer previews the
        // swap, which changes at least one stat.
        const store = makeStore([blade, runeBlade], [blade]);

        const vm = selectItemModalViewModel(store.getState(), 'rune-blade')!;

        expect(vm.statDeltas.length).toBeGreaterThan(0);
        for (const delta of vm.statDeltas) {
            expect(typeof delta.before).toBe('number');
            expect(typeof delta.after).toBe('number');
            expect(typeof delta.delta).toBe('number');
        }
    });

    // Brief fix #3: the modal shows *only* stats that change — never a
    // stat whose value is unchanged.
    it('emits only stats that actually change (no zero-delta rows)', () => {
        const store = makeStore([blade, runeBlade]);

        const vm = selectItemModalViewModel(store.getState(), 'rune-blade')!;

        expect(vm.statDeltas.length).toBeGreaterThan(0);
        for (const delta of vm.statDeltas) {
            expect(delta.delta).not.toBe(0);
            expect(delta.after - delta.before).toBe(delta.delta);
        }
        // Rune Blade adds +5 max health over the plain blade.
        const hp = vm.statDeltas.find((d) => d.label === 'MAX VITAE');
        expect(hp).toBeDefined();
        expect(hp!.delta).toBe(5);
    });

    // A swap that changes nothing (identical stat-less weapons) shows an
    // empty stat table.
    it('shows no stat rows when the equip changes no stats', () => {
        const twin: Equipment = { ...blade, id: 'twin-blade', name: 'Twin Blade' };
        const store = makeStore([blade, twin], [blade]);

        const vm = selectItemModalViewModel(store.getState(), 'twin-blade')!;

        expect(vm.statDeltas).toHaveLength(0);
    });

    // The item's own stat modifiers surface (with values). Equipment has only
    // stat modifiers (no passive-effect / affix lines).
    it('exposes the item\'s intrinsic stat modifiers with values', () => {
        const store = makeStore([blade, runeBlade]);

        const vm = selectItemModalViewModel(store.getState(), 'rune-blade')!;

        const labels = vm.itemModifiers.map((m) => m.label);
        expect(labels).toContain('+5 MAX VITAE');
    });

    // A plain common item (no modifiers) exposes an empty modifier list.
    it('exposes no intrinsic modifiers for a plain item', () => {
        const store = makeStore([blade]);

        const vm = selectItemModalViewModel(store.getState(), 'long-blade')!;

        expect(vm.itemModifiers).toHaveLength(0);
    });

    // A fractional modifier value is rounded to one decimal in the intrinsic list.
    it('rounds a fractional modifier to one decimal in the intrinsic list', () => {
        const store = makeStore([fractionBlade]);

        const vm = selectItemModalViewModel(store.getState(), 'fraction-blade')!;

        const hp = vm.itemModifiers.find((m) => m.label.includes('MAX VITAE'));
        expect(hp?.label).toBe('+1.6 MAX VITAE');
    });

    it('rounds a fractional stat delta to one decimal', () => {
        // Worn plain blade + fractional peer: tapping the peer previews the
        // swap, whose max-health delta must read at one decimal.
        const store = makeStore([blade, fractionBlade], [blade]);

        const vm = selectItemModalViewModel(store.getState(), 'fraction-blade')!;

        const hp = vm.statDeltas.find((d) => d.label === 'MAX VITAE');
        expect(hp).toBeDefined();
        // Every surfaced number carries at most one decimal place.
        for (const n of [hp!.before, hp!.after, hp!.delta]) {
            expect(Number.isInteger(n * 10)).toBe(true);
        }
    });

    // The equip/swap effect block shows only the signet-relic
    // signature gained/lost; plain gear (no affixes / passive effects) surfaces
    // no non-stat effect lines.
    it('surfaces no non-stat effect lines for plain gear (no affixes / passives)', () => {
        const store = makeStore([affixBladeWorn, affixBladeCandidate], [affixBladeWorn]);

        const vm = selectItemModalViewModel(store.getState(), 'affix-candidate')!;

        const labels = vm.effectDeltas.map((e) => e.label);
        expect(labels.some((l) => l.includes('Glittering'))).toBe(false);
        expect(labels.some((l) => l.includes('Dull'))).toBe(false);
        expect(labels.some((l) => l.includes('rune-ward'))).toBe(false);
    });
});

describe('selectItemModalViewModel: invariants', () => {
    it('the modal VM is deep-frozen', () => {
        const store = makeStore([potion]);

        const vm = selectItemModalViewModel(store.getState(), 'phial')!;

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.previewLines)).toBe(true);
        expect(Object.isFrozen(vm.statDeltas)).toBe(true);
    });
});
