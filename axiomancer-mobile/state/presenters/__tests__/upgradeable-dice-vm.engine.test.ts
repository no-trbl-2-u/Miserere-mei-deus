/**
 * Combat render CORE, presenter contract.
 *
 * Pins the view-model surfaces the dice tray + signature runes read,
 * against the REAL engine + presenter:
 *   1. the CombatDieVM face axis (special / mana / miss) + the OVERHEAT `cracked`
 *      read, and that a MISS face is DEAD (never draggable);
 *   2. the signature runes (castable / refused + the loud refusal reason),
 *      mirroring the engine's `signatureCastBlock`.
 */

import { describe, expect, it } from '@jest/globals';
import {
    rollEncounterDice,
} from '@mechanics';
import type { CombatEncounterState, CombatManaDie } from '@mechanics';

import { buildCombatViewModel } from '../combat-encounter.engine';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-strike', 'grey-ward', 'grey-ward', 'grey-word', 'grey-word'];

function openEncounter(): CombatEncounterState {
    const { combat } = startRealFight(realFightFixture({ level: 3, baseStats: { heart: 8, body: 8, mind: 8 }, knownCards: DECK }), { deck: DECK, seed: 7 });
    return rollEncounterDice(combat).state;
}

/** A hand-crafted faced tray die (the gear roll shape). */
function facedDie(color: CombatManaDie['color'], face: 'special' | 'mana' | 'miss'): CombatManaDie {
    return { id: `u-${color}`, color, face, state: face === 'miss' ? 'locked' : 'available', temporary: false };
}


describe('CombatDieVM face axis', () => {
    it('maps special / mana / miss faces and marks a cracked die', () => {
        const s = openEncounter();
        s.dice = [
            facedDie('body', 'special'),
            facedDie('mind', 'mana'),
            facedDie('heart', 'miss'),
            facedDie('wild', 'miss'),
        ];
        // An OVERHEAT crack biting THIS turn forced the wild die all-miss.
        s.crackedDice = [{ color: 'wild', turn: s.turn }];
        const dice = buildCombatViewModel(s).dice;
        const by = (c: string) => dice.find(d => d.color === c)!;

        expect(by('body').face).toBe('special');
        expect(by('mind').face).toBe('mana');
        expect(by('heart').face).toBe('miss');
        expect(by('wild').face).toBe('miss');

        // Only the cracked color reads cracked.
        expect(by('wild').cracked).toBe(true);
        expect(by('heart').cracked).toBeUndefined();
        expect(by('body').cracked).toBeUndefined();
    });

    it('a MISS face is DEAD — never draggable; a live special/mana face is', () => {
        const s = openEncounter();
        s.dice = [facedDie('body', 'special'), facedDie('mind', 'mana'), facedDie('heart', 'miss')];
        const dice = buildCombatViewModel(s).dice;
        expect(dice.find(d => d.color === 'body')!.draggable).toBe(true);
        expect(dice.find(d => d.color === 'mind')!.draggable).toBe(true);
        expect(dice.find(d => d.color === 'heart')!.draggable).toBe(false);
    });
});

describe('signature runes (the engine cast gate)', () => {
    function withRunes(conviction: number): CombatEncounterState {
        const s = openEncounter();
        s.signatures = ['sig-disarming-plea'];
        s.conviction = conviction;
        return s;
    }
    const rune = (s: CombatEncounterState, id: string) =>
        buildCombatViewModel(s).signatures.find(x => x.id === id)!;
    /** A befriendable foe inside The Open Hand's HP gate. */
    function spareable(s: CombatEncounterState): CombatEncounterState {
        s.enemy = {
            ...s.enemy, health: 1, befriendabilityConfig: { hpGate: { belowPct: 0.3 } },
            friendshipReward: { narrative: 'spared' },
        };
        return s;
    }

    it('The Open Hand rune prints the flat cost and its one line', () => {
        const r = rune(withRunes(4), 'sig-disarming-plea');
        expect(r.cost).toBe(4);
        expect(r.description).toBe('Offer the foe mercy. A foe that can be befriended, once low enough, may be spared.');
    });

    it('a rune is refused with the reason when Conviction is short', () => {
        const r = rune(spareable(withRunes(3)), 'sig-disarming-plea');
        expect(r.affordable).toBe(false);
        expect(r.reason).toMatch(/Need 4/);
    });

    it('The Open Hand is refused, with the reason, on a foe that cannot be befriended', () => {
        const s = withRunes(4);
        s.enemy = { ...s.enemy, friendshipReward: undefined };
        const r = rune(s, 'sig-disarming-plea');
        expect(r.affordable).toBe(false);
        expect(r.reason).toMatch(/will not be befriended/);
    });

    it('The Open Hand is castable on a befriendable foe inside its gate', () => {
        const s = withRunes(4);
        s.enemy = {
            ...s.enemy, health: 1, befriendabilityConfig: { hpGate: { belowPct: 0.3 } },
            friendshipReward: { narrative: 'spared' },
        };
        const r = rune(s, 'sig-disarming-plea');
        expect(r.affordable).toBe(true);
        expect(r.reason).toBeNull();
    });
});
