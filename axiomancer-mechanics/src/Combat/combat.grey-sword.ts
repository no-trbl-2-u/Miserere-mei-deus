/**
 * The grey sword's stand-in: a plain weapon whose special pays +2 Conviction,
 * which is what every special paid before a worn weapon set the payload.
 *
 * With no weapon worn a special only powers its card, so a fixture or a sim
 * that models a fresh run wears this to play as that run does. It is a
 * stand-in, not a library piece: nothing grants it to a player.
 */

import type { Character } from '../Character/types';
import type { Equipment } from '../Items/types';
import { SPECIAL_CONVICTION_DEFAULT } from './combat.upgradeable-dice';

export const GREY_SWORD_STAND_IN: Equipment = Object.freeze({
    id: 'grey-sword-stand-in',
    name: 'Grey Sword',
    description: 'A plain blade. Your special pays +2 Conviction.',
    category: 'equipment',
    slot: 'weapon',
    effect: { special: { kind: 'conviction', amount: SPECIAL_CONVICTION_DEFAULT } },
}) as Equipment;

/** The character with the grey sword in the weapon slot (the other slots untouched); mutates and returns it. */
export function wearGreySword(character: Character): Character {
    character.equipment = { ...character.equipment, weapon: { ...GREY_SWORD_STAND_IN } };
    return character;
}
