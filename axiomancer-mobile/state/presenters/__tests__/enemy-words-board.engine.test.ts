/**
 * Chapter 1's foes on the board (phase EN1f): the first live `phases` foes.
 * Their enemy words stand as chips (the foe's WARD on its side; BRINE,
 * TANGLE, LEECH and UNDERTOW on yours), TANGLE refuses every card's FREE
 * line on the board as the engine does, and a WARD-only move telegraphs
 * DEFEND with no number.
 */

import { describe, expect, it } from '@jest/globals';
import { rollEncounterDice, type CombatEncounterState, type StateFixture } from '@mechanics';

import { buildCombatViewModel } from '../combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];

/** The live fight at a Breakwater fight node, as the app stages it. */
function fightAt(node: string): CombatEncounterState {
    const ref: StateFixture = {
        ...REAL_FIGHT_FIXTURE,
        id: `en1f-${node}`,
        seed: `fixture-en1f-${node}`,
        world: { ...REAL_FIGHT_FIXTURE.world!, node },
        player: { level: 1, baseStats: { heart: 5, body: 5, mind: 5 } },
    };
    const { combat } = startRealFight(ref, { deck: DECK, seed: 3 });
    return rollEncounterDice(combat).state;
}

/** The fight with the foe about to play `move` in its opening loop. */
function at(s: CombatEncounterState, move: string): CombatEncounterState {
    const i = s.threatPhases.findIndex((p) => p.enemyMove?.name === move && p.enemyMove.phase === 0);
    expect(i).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: i };
}

const NO_WORDS = { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0 };

describe('each fields-and-quays node stages its own foe and portrait', () => {
    it.each([
        ['bw-w2', 'Float-Eye', 'float-eye'], ['bw-w3', 'Gallows Crow', 'gallows-crow'],
        ['bw-h1', 'Net-Mender', 'net-mender'], ['bw-h2', 'Crane-Hook', 'crane-hook'],
    ])('%s: %s', (node, name, art) => {
        const vm = buildCombatViewModel(fightAt(node));
        expect(vm.enemy.name).toBe(name);
        expect(vm.enemy.artKey).toBe(art);
        // An unbeaten foe's DANGER is listed, unnamed.
        expect(vm.enemy.dangers).toEqual([{ phase: 2, name: null }]);
    });
});

describe('a WARD-only move telegraphs DEFEND, with no number', () => {
    it.each([['bw-w2', 'Shut Lid'], ['bw-w3', 'Take Wing'], ['bw-h2', 'Lock the Brake']])('%s: %s', (node, move) => {
        const intent = buildCombatViewModel(at(fightAt(node), move)).enemy.intent;
        expect([intent.type, intent.label, intent.moveName]).toEqual(['defend', 'DEFEND', move]);
        expect(`${intent.label} ${intent.description} ${intent.moveName}`).not.toMatch(/\d/);
        expect(intent.damage).toBe(0);
    });
});

describe('the enemy words stand on the board as chips', () => {
    it('the foe\'s WARD shows on its side, with its live number', () => {
        const s = fightAt('bw-h2');
        expect(buildCombatViewModel(s).enemy.effects.some((e) => e.effectId === 'enemy-word-ward')).toBe(false);
        const warded = buildCombatViewModel({ ...s, enemyWords: { ...NO_WORDS, ward: 11 } }).enemy.effects;
        expect(warded).toContainEqual(expect.objectContaining({ effectId: 'enemy-word-ward', intensity: 11 }));
        expect(warded.find((e) => e.effectId === 'enemy-word-ward')!.gloss).toMatch(/GUARD/);
    });

    it('BRINE, TANGLE, LEECH and UNDERTOW show on yours', () => {
        const s = fightAt('bw-h1');
        const vm = buildCombatViewModel({
            ...s, enemyWords: { ward: 0, brine: 3, leechTurns: 3, leechPotency: 2, tangle: 1, undertow: 'body' },
        });
        const ids = vm.player.effects.map((e) => e.effectId);
        expect(ids).toEqual(expect.arrayContaining([
            'enemy-word-brine', 'enemy-word-tangle', 'enemy-word-leech', 'enemy-word-undertow',
        ]));
        expect(vm.player.effects.find((e) => e.effectId === 'enemy-word-leech')).toMatchObject({ intensity: 2, duration: 3 });
        expect(vm.enemy.effects.some((e) => e.effectId.startsWith('enemy-word-'))).toBe(false);
    });
});

describe('TANGLE refuses every FREE line on the board, as the engine does', () => {
    it('a plain card\'s FREE line reads refused while TANGLE holds, and free again after', () => {
        const s = fightAt('bw-h1');
        expect(buildCombatViewModel(s).hand.every((c) => !c.play?.freeBlock)).toBe(true);
        const tangled = buildCombatViewModel({ ...s, enemyWords: { ...NO_WORDS, tangle: 1 } });
        expect(tangled.hand.length).toBeGreaterThan(0);
        for (const card of tangled.hand) {
            expect(card.play?.freeBlock).toMatch(/tangled/);
            // A die still pays: the PAID line is not refused by TANGLE.
            expect(card.play?.paidBlock ?? null).toBeNull();
        }
    });
});
