/**
 * The momentum chip + die-gear rail, presenter contract.
 *
 * Pins the two view-model surfaces against the REAL engine + presenter:
 *   1. the Momentum-V2 chain chip (color/length + the LOUD break-to-null + surge);
 *   2. the die-gear rail + payload-only inspection VM (face table, payload, upgrade).
 */

import { describe, expect, it } from '@jest/globals';
import {
    rollEncounterDice,
    DEFAULT_DIE_GEAR,
} from '@mechanics';
import type { CombatEncounterState } from '@mechanics';

import { buildCombatViewModel } from '../combat-encounter.engine';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

const DECK = ['slippery-slope', 'slippery-slope', 'straw-mans-jab', 'straw-mans-jab', 'sketch-of-a-thought', 'sketch-of-a-thought'];

function openEncounter(): CombatEncounterState {
    const { combat } = startRealFight(realFightFixture({ level: 3, baseStats: { heart: 8, body: 8, mind: 8 }, knownCards: DECK }), { deck: DECK, seed: 7 });
    return rollEncounterDice(combat).state;
}


// ── Momentum-V2 chain chip ───────────────────────────────────────────────────

describe('Momentum-V2 chain chip', () => {
    it('maps a live chain to { color, length, next }', () => {
        const s = openEncounter();
        s.momentumV2 = { color: 'heart', length: 2 };
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.color).toBe('heart');
        expect(m.length).toBe(2);
        expect(m.next).toBe('body');           // chain order heart → body → mind
        expect(m.surgeAt).toBe(3);
        expect(m.broke).toBe(false);
        expect(m.surged).toBe(false);
        expect(m.a11y).toMatch(/Momentum 2 of 3/);
    });

    it('an empty chain (never broken) reads neither broke nor surged', () => {
        const s = openEncounter();
        s.momentumV2 = null;
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.color).toBeNull();
        expect(m.length).toBe(0);
        expect(m.broke).toBe(false);
        expect(m.surged).toBe(false);
        expect(m.a11y).toMatch(/No momentum/);
    });

    it('a break-to-null renders LOUD (broke=true) from the log', () => {
        const s = openEncounter();
        s.momentumV2 = null;
        s.log = [...s.log, { kind: 'momentum-broken', by: 'body' }];
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.broke).toBe(true);
        expect(m.surged).toBe(false);
        expect(m.a11y).toMatch(/BROKEN/);
    });

    it('a surge renders celebratory (surged=true) from the log', () => {
        const s = openEncounter();
        s.momentumV2 = null;
        s.log = [...s.log, { kind: 'momentum-surged', dieId: 'surge-1-0' }];
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.surged).toBe(true);
        expect(m.broke).toBe(false);
        expect(m.a11y).toMatch(/SURGED/);
    });

    it('a break/surge transient DECAYS at the next turn roll — loud for its turn only', () => {
        const s = openEncounter();
        s.momentumV2 = null;
        s.log = [
            ...s.log,
            { kind: 'momentum-broken', by: 'body' },
            { kind: 'turn-dice-rolled', turn: s.turn + 1, dice: [] },
        ];
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.broke).toBe(false);
        expect(m.surged).toBe(false);
        expect(m.a11y).toMatch(/No momentum/);
    });

    it('derives the PLAYED sequence for the lit nodes (chain, play order)', () => {
        const s = openEncounter();
        s.momentumV2 = { color: 'body', length: 2 };   // heart was played, then body
        expect(buildCombatViewModel(s).momentumV2.chain).toEqual(['heart', 'body']);
        s.momentumV2 = { color: 'heart', length: 2 };  // cyclic entry: mind, then heart
        expect(buildCombatViewModel(s).momentumV2.chain).toEqual(['mind', 'heart']);
        s.momentumV2 = { color: 'mind', length: 1 };
        expect(buildCombatViewModel(s).momentumV2.chain).toEqual(['mind']);
        s.momentumV2 = null;
        expect(buildCombatViewModel(s).momentumV2.chain).toEqual([]);
    });

    it('a live chain formed after an old break does NOT read broke', () => {
        const s = openEncounter();
        s.momentumV2 = { color: 'mind', length: 1 };
        s.log = [
            ...s.log,
            { kind: 'momentum-broken', by: 'body' },
            { kind: 'momentum-advanced', color: 'mind', length: 1 },
        ];
        const m = buildCombatViewModel(s).momentumV2;
        expect(m.broke).toBe(false);
        expect(m.color).toBe('mind');
    });
});

// ── die-gear rail + payload-only inspection ──────────────────────────────────

describe('die-gear rail + payload-only inspection', () => {
    it('renders 4 stock slots (heart/body/mind/wild) from the default gear', () => {
        const s = openEncounter();
        const rail = buildCombatViewModel(s).dieGear;
        expect(rail.slots.map(x => x.color)).toEqual(['heart', 'body', 'mind', 'wild']);
        const heart = rail.slots[0];
        expect(heart.specialFaces).toBe(DEFAULT_DIE_GEAR.heart.specialFaces);
        expect(heart.manaFaces).toBe(DEFAULT_DIE_GEAR.heart.manaFaces);
        expect(heart.missFaces).toBe(6 - heart.specialFaces - heart.manaFaces);
        expect(heart.faceTable).toMatch(/boon .* mana .* miss/);
        expect(heart.payload).toBe(`+${DEFAULT_DIE_GEAR.heart.specialConviction} ◆`);
        expect(heart.upgraded).toBe(false);
    });

    it('marks an UPGRADED slot from the state rail', () => {
        const s = openEncounter();
        s.dieGear = { body: { dieColor: 'body', specialFaces: 2, manaFaces: 3, specialConviction: 3 } };
        const rail = buildCombatViewModel(s).dieGear;
        const body = rail.slots.find(x => x.color === 'body')!;
        expect(body.specialFaces).toBe(2);
        expect(body.manaFaces).toBe(3);
        expect(body.missFaces).toBe(1);
        expect(body.payload).toBe('+3 ◆');
        expect(body.upgraded).toBe(true);
        // Untouched slots stay stock.
        expect(rail.slots.find(x => x.color === 'heart')!.upgraded).toBe(false);
    });
});
