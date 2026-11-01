/**
 * The weapons and armor: ten pieces, a weapon and an armor for the grey kit
 * every run starts in and for each of the four lanes.
 *
 * A piece carries one trigger or condition effect and one dice effect, and
 * nothing else: no stat line, no lane (`laneId`), no signature. Relics already
 * give stats; a stat-bump weapon would be a worse relic. A lane piece covers
 * where its lane struggles; `EQUIPMENT_LANE` names that lane for the drop
 * tables and for nothing else (a worn weapon or armor opens no card lane).
 *
 * | Lane          | Weapon                                              | Armor                                          |
 * |---------------|-----------------------------------------------------|------------------------------------------------|
 * | Grey          | first DEAL each turn +2; special +2 Conviction      | first GUARD each turn +2; +1 hit, gold die     |
 * | Blood Price   | HEAL 3 on each card DEAL; special heals 4           | SACRIFICE gives GUARD 2; red die hit is special|
 * | Elementalist  | DEALs +2 while the foe has weather; special INFERNO | INFERNO gives +1 Conviction; +1 hit, blue die  |
 * | Defender      | DEALs +2 while GUARD holds; special GUARD 6         | discard-pay draws 1; +1 hit, purple die        |
 * | Merciful      | DEALs +2 above half VITAE; special VULNERABLE       | HEAL gives GUARD 2; blue die hit is special    |
 *
 * The grey pair is worn from the start by every roster character
 * (`createNewGameState`); a save made before it existed loads as it was. The
 * numbers are tuned later, against the sims and play.
 */

import type { Character } from '../Character/types';
import type { Equipment } from './types';
import { SPECIAL_CONVICTION_DEFAULT } from '../Combat/combat.upgradeable-dice';

/** The grey pair every new run wears. */
export const GREY_WEAPON_ID = 'weapon-opening-blade';
export const GREY_ARMOR_ID = 'armor-bracing-coat';

const OPENING_BLADE: Equipment = {
    id: GREY_WEAPON_ID,
    name: 'Opening Blade',
    description: 'Your first DEAL each turn deals +2. Your special pays +2 Conviction.',
    category: 'equipment',
    slot: 'weapon',
    effect: {
        trigger: 'first-card-deal',
        payoff: { kind: 'deal-bonus', amount: 2 },
        special: { kind: 'conviction', amount: SPECIAL_CONVICTION_DEFAULT },
    },
};

const BRACING_COAT: Equipment = {
    id: GREY_ARMOR_ID,
    name: 'Bracing Coat',
    description: 'Your first GUARD each turn gives +2. A miss on the gold die becomes a hit.',
    category: 'equipment',
    slot: 'armor',
    effect: {
        trigger: 'first-guard',
        payoff: { kind: 'guard', amount: 2 },
        die: { color: 'wild', change: 'miss-to-mana' },
    },
};

const SIPHONING_BLADE: Equipment = {
    id: 'weapon-siphoning-blade',
    name: 'Siphoning Blade',
    description: 'HEAL 3 on each card DEAL. Your special heals 4.',
    category: 'equipment',
    slot: 'weapon',
    effect: {
        trigger: 'card-deal',
        payoff: { kind: 'heal', amount: 3 },
        special: { kind: 'heal', amount: 4 },
    },
};

const BLOODWARD_MAIL: Equipment = {
    id: 'armor-bloodward-mail',
    name: 'Bloodward Mail',
    description: 'Each SACRIFICE gives you GUARD 2. One hit on the red die becomes a special.',
    category: 'equipment',
    slot: 'armor',
    effect: {
        trigger: 'sacrifice',
        payoff: { kind: 'guard', amount: 2 },
        die: { color: 'body', change: 'mana-to-special' },
    },
};

const STORMCALLER_STAFF: Equipment = {
    id: 'weapon-stormcaller-staff',
    name: 'Stormcaller Staff',
    description: 'Your DEALs deal +2 while the foe has any weather on it. Your special lays INFERNO 2 on the foe.',
    category: 'equipment',
    slot: 'weapon',
    effect: {
        condition: 'foe-has-weather',
        bonus: 2,
        special: { kind: 'inferno', amount: 2 },
    },
};

const FLAME_GUARD: Equipment = {
    id: 'armor-flame-guard',
    name: 'Flame Guard',
    description: '+1 Conviction each time you lay INFERNO. +1 hit on the blue die.',
    category: 'equipment',
    slot: 'armor',
    effect: {
        trigger: 'inferno',
        payoff: { kind: 'conviction', amount: 1 },
        die: { color: 'mind', change: 'miss-to-mana' },
    },
};

const BULWARK_MACE: Equipment = {
    id: 'weapon-bulwark-mace',
    name: 'Bulwark Mace',
    description: 'Your DEALs deal +2 while your GUARD holds. Your special gives GUARD 6.',
    category: 'equipment',
    slot: 'weapon',
    effect: {
        condition: 'guard-holds',
        bonus: 2,
        special: { kind: 'guard', amount: 6 },
    },
};

const SCAVENGERS_COAT: Equipment = {
    id: 'armor-scavengers-coat',
    name: "Scavenger's Coat",
    description: 'Each time you pay by discarding, draw 1. +1 hit on the purple die.',
    category: 'equipment',
    slot: 'armor',
    effect: {
        trigger: 'discard-pay',
        payoff: { kind: 'draw', amount: 1 },
        die: { color: 'heart', change: 'miss-to-mana' },
    },
};

const HUMBLING_ROD: Equipment = {
    id: 'weapon-humbling-rod',
    name: 'Humbling Rod',
    description: 'Your DEALs deal +2 while the foe is above half VITAE. Your special lays VULNERABLE on the foe for a turn.',
    category: 'equipment',
    slot: 'weapon',
    effect: {
        condition: 'foe-above-half',
        bonus: 2,
        special: { kind: 'vulnerable', amount: 1 },
    },
};

const MENDING_VESTMENTS: Equipment = {
    id: 'armor-mending-vestments',
    name: 'Mending Vestments',
    description: 'Each HEAL gives you GUARD 2. One hit on the blue die becomes a special.',
    category: 'equipment',
    slot: 'armor',
    effect: {
        trigger: 'heal',
        payoff: { kind: 'guard', amount: 2 },
        die: { color: 'mind', change: 'mana-to-special' },
    },
};

/** The five weapons: grey, then Blood Price, Elementalist, Defender, Merciful. */
export const weaponLibrary: readonly Equipment[] = [
    OPENING_BLADE, SIPHONING_BLADE, STORMCALLER_STAFF, BULWARK_MACE, HUMBLING_ROD,
];

/** The five armors, in the same lane order. */
export const armorLibrary: readonly Equipment[] = [
    BRACING_COAT, BLOODWARD_MAIL, FLAME_GUARD, SCAVENGERS_COAT, MENDING_VESTMENTS,
];

/** All ten pieces, weapons then armor. */
export const equipmentLibrary: readonly Equipment[] = [...weaponLibrary, ...armorLibrary];

/**
 * The card lane each lane piece covers, for the drop tables only. It is not
 * `Equipment.laneId`: a worn weapon or armor opens no lane. The grey pair
 * covers none and is absent.
 */
export const EQUIPMENT_LANE: Readonly<Record<string, string>> = {
    'weapon-siphoning-blade': 'blood-price',
    'armor-bloodward-mail': 'blood-price',
    'weapon-stormcaller-staff': 'elementalist',
    'armor-flame-guard': 'elementalist',
    'weapon-bulwark-mace': 'defender',
    'armor-scavengers-coat': 'defender',
    'weapon-humbling-rod': 'merciful',
    'armor-mending-vestments': 'merciful',
};

/** A fresh copy of a piece (never aliases the library singleton). */
export function cloneEquipmentPiece(piece: Equipment): Equipment {
    return {
        ...piece,
        ...(piece.statModifiers ? { statModifiers: piece.statModifiers.map(m => ({ ...m })) } : {}),
        ...(piece.effect
            ? {
                effect: {
                    ...piece.effect,
                    ...(piece.effect.payoff ? { payoff: { ...piece.effect.payoff } } : {}),
                    ...(piece.effect.die ? { die: { ...piece.effect.die } } : {}),
                    ...(piece.effect.special ? { special: { ...piece.effect.special } } : {}),
                } as Equipment['effect'],
            }
            : {}),
    };
}

/**
 * The grey pair (weapon, then armor) as fresh copies: what every new run
 * wears. Throws when the library lost either (a content bug, never a runtime
 * state).
 */
export function greyPair(): { weapon: Equipment; armor: Equipment } {
    const weapon = weaponLibrary.find(p => p.id === GREY_WEAPON_ID);
    const armor = armorLibrary.find(p => p.id === GREY_ARMOR_ID);
    if (!weapon || !armor) throw new Error('the grey weapon and armor are not in the equipment library');
    return { weapon: cloneEquipmentPiece(weapon), armor: cloneEquipmentPiece(armor) };
}

/**
 * Wears the grey pair on `character` (the relics and the inventory untouched),
 * as a new run does: a fixture or a sim that models a fresh run calls this.
 * Mutates and returns the character.
 */
export function wearGreyPair(character: Character): Character {
    character.equipment = { ...character.equipment, ...greyPair() };
    return character;
}

/** Resolve a weapon or armor by id (the canonical singleton, not a clone). */
export function getEquipmentPieceById(id: string): Equipment | undefined {
    return equipmentLibrary.find(p => p.id === id);
}

/** The lane a lane piece covers, or `undefined` for the grey pair and any other id. */
export function equipmentLaneId(id: string): string | undefined {
    return EQUIPMENT_LANE[id];
}
