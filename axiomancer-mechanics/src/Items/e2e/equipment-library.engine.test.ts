/**
 * Hermetic engine test: the ten weapons and armor (`Items/equipment.library.ts`).
 *
 * Pins each piece's name, id and effect against the slate, refuses a stat
 * line, a lane or a signature on any weapon or armor, and proves every piece
 * is read by the fight: worn, it lands in the fight's equipment state and its
 * dice half reaches the dice.
 */

import { describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { CARD_LANES } from '../../Cards/card.lanes';
import { FloatEye } from '../../Enemy/enemy.library';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { deepClone } from '../../Utils';
import {
    EQUIPMENT_LANE, armorLibrary, cloneEquipmentPiece, equipmentLaneId, equipmentLibrary, getEquipmentPieceById,
    greyPair, weaponLibrary, wearGreyPair,
} from '../equipment.library';
import type { Equipment, EquipmentEffect } from '../types';

const SLATE: ReadonlyArray<readonly [string, string, EquipmentEffect]> = [
    ['weapon-opening-blade', 'Opening Blade', {
        trigger: 'first-card-deal', payoff: { kind: 'deal-bonus', amount: 2 }, special: { kind: 'conviction', amount: 2 },
    }],
    ['armor-bracing-coat', 'Bracing Coat', {
        trigger: 'first-guard', payoff: { kind: 'guard', amount: 2 }, die: { color: 'wild', change: 'miss-to-mana' },
    }],
    ['weapon-siphoning-blade', 'Siphoning Blade', {
        trigger: 'card-deal', payoff: { kind: 'heal', amount: 3 }, special: { kind: 'heal', amount: 4 },
    }],
    ['armor-bloodward-mail', 'Bloodward Mail', {
        trigger: 'sacrifice', payoff: { kind: 'guard', amount: 2 }, die: { color: 'body', change: 'mana-to-special' },
    }],
    ['weapon-stormcaller-staff', 'Stormcaller Staff', {
        condition: 'foe-has-weather', bonus: 2, special: { kind: 'inferno', amount: 2 },
    }],
    ['armor-flame-guard', 'Flame Guard', {
        trigger: 'inferno', payoff: { kind: 'conviction', amount: 1 }, die: { color: 'mind', change: 'miss-to-mana' },
    }],
    ['weapon-bulwark-mace', 'Bulwark Mace', {
        condition: 'guard-holds', bonus: 2, special: { kind: 'guard', amount: 6 },
    }],
    ['armor-scavengers-coat', "Scavenger's Coat", {
        trigger: 'discard-pay', payoff: { kind: 'draw', amount: 1 }, die: { color: 'heart', change: 'miss-to-mana' },
    }],
    ['weapon-humbling-rod', 'Humbling Rod', {
        condition: 'foe-above-half', bonus: 2, special: { kind: 'vulnerable', amount: 1 },
    }],
    ['armor-mending-vestments', 'Mending Vestments', {
        trigger: 'heal', payoff: { kind: 'guard', amount: 2 }, die: { color: 'mind', change: 'mana-to-special' },
    }],
];

describe('the equipment library: the slate', () => {
    it('holds the ten pieces, weapons then armor, five of each', () => {
        expect(equipmentLibrary).toHaveLength(10);
        expect(weaponLibrary).toHaveLength(5);
        expect(armorLibrary).toHaveLength(5);
        expect(weaponLibrary.every(p => p.slot === 'weapon')).toBe(true);
        expect(armorLibrary.every(p => p.slot === 'armor')).toBe(true);
        expect(new Set(equipmentLibrary.map(p => p.id)).size).toBe(10);
        expect(equipmentLibrary.map(p => p.id).sort()).toEqual(SLATE.map(([id]) => id).sort());
    });

    for (const [id, name, effect] of SLATE) {
        it(`${id} is ${name} with its one trigger or condition and its dice half`, () => {
            const piece = getEquipmentPieceById(id)!;
            expect(piece.name).toBe(name);
            expect(piece.category).toBe('equipment');
            expect(piece.effect).toEqual(effect);
            expect(piece.description).toMatch(/\S/);
        });
    }

    it('a weapon sets a special and no die change, an armor changes a die and sets no special', () => {
        for (const w of weaponLibrary) {
            expect(w.effect?.special).toBeDefined();
            expect(w.effect?.die).toBeUndefined();
        }
        for (const a of armorLibrary) {
            expect(a.effect?.die).toBeDefined();
            expect(a.effect?.special).toBeUndefined();
        }
    });

    it('no weapon or armor carries a stat line, a lane or a signature', () => {
        for (const piece of equipmentLibrary) {
            expect(piece.statModifiers).toBeUndefined();
            expect(piece.laneId).toBeUndefined();
            expect(piece.grantsSignature).toBeUndefined();
            expect(piece.relicSource).toBeUndefined();
        }
    });

    it('the lane map names the eight lane pieces and a registered lane each, and not the grey pair', () => {
        const laneIds = new Set(CARD_LANES.map(l => l.id));
        expect(Object.keys(EQUIPMENT_LANE).sort()).toEqual(
            SLATE.map(([id]) => id).filter(id => !id.includes('opening') && !id.includes('bracing')).sort(),
        );
        for (const lane of Object.values(EQUIPMENT_LANE)) expect(laneIds.has(lane)).toBe(true);
        for (const lane of ['blood-price', 'elementalist', 'defender', 'merciful']) {
            const pieces = Object.entries(EQUIPMENT_LANE).filter(([, l]) => l === lane).map(([id]) => id);
            expect(pieces.map(id => getEquipmentPieceById(id)!.slot).sort()).toEqual(['armor', 'weapon']);
        }
        expect(equipmentLaneId('weapon-opening-blade')).toBeUndefined();
        expect(equipmentLaneId('armor-flame-guard')).toBe('elementalist');
    });

    it('a clone never aliases the library piece or its effect', () => {
        for (const piece of equipmentLibrary) {
            const copy = cloneEquipmentPiece(piece);
            expect(copy).toEqual(piece);
            expect(copy).not.toBe(piece);
            expect(copy.effect).not.toBe(piece.effect);
            if (piece.effect?.payoff) expect(copy.effect!.payoff).not.toBe(piece.effect.payoff);
            if (piece.effect?.die) expect(copy.effect!.die).not.toBe(piece.effect.die);
            if (piece.effect?.special) expect(copy.effect!.special).not.toBe(piece.effect.special);
        }
    });

    it('the grey pair is the Opening Blade and the Bracing Coat, fresh each call', () => {
        const a = greyPair();
        const b = greyPair();
        expect([a.weapon.id, a.armor.id]).toEqual(['weapon-opening-blade', 'armor-bracing-coat']);
        expect(a.weapon).not.toBe(b.weapon);
        expect(a.weapon).not.toBe(getEquipmentPieceById('weapon-opening-blade'));
    });
});

describe('the equipment library: every piece reaches the fight', () => {
    function wearing(...pieces: Equipment[]) {
        const p = deepClone(Player);
        p.equipment = { ...p.equipment, weapon: null, armor: null };
        for (const piece of pieces) p.equipment = { ...p.equipment, [piece.slot]: cloneEquipmentPiece(piece) };
        return initializeCombatEncounter(p, deepClone(FloatEye), undefined, 7);
    }

    for (const [id] of SLATE) {
        it(`${id} worn is read by the fight`, () => {
            const piece = getEquipmentPieceById(id)!;
            const fight = wearing(piece);
            expect(fight.equipmentEffects?.worn.map(w => w.itemId)).toEqual([id]);
            if (piece.slot === 'weapon') expect(fight.equipmentDice?.special).toEqual(piece.effect!.special);
            else expect(fight.equipmentDice?.dieChanges).toEqual([piece.effect!.die]);
        });
    }

    it('the grey pair worn together keeps a special at +2 Conviction and the gold die change', () => {
        const fight = wearing(...Object.values(greyPair()));
        expect(fight.equipmentDice?.special).toEqual({ kind: 'conviction', amount: 2 });
        expect(fight.equipmentDice?.dieChanges).toEqual([{ color: 'wild', change: 'miss-to-mana' }]);
        expect(fight.equipmentEffects?.worn).toHaveLength(2);
    });

    it('wearGreyPair puts the pair in the weapon and armor rows and touches nothing else', () => {
        const p = deepClone(Player);
        const relics = p.equipment.relics;
        expect(wearGreyPair(p)).toBe(p);
        expect([p.equipment.weapon?.id, p.equipment.armor?.id]).toEqual(['weapon-opening-blade', 'armor-bracing-coat']);
        expect(p.equipment.relics).toBe(relics);
    });
});
