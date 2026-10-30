/**
 * Chapter 1's foes on the board (phase EN1f): the first live `phases` foes.
 * Their enemy words stand as chips (the foe's WARD on its side; BRINE,
 * TANGLE, LEECH and UNDERTOW on yours), TANGLE refuses every card's FREE
 * line on the board as the engine does, and a WARD-only move telegraphs
 * DEFEND with no number.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
    clearSandboxCards, registerSandboxCards, rollEncounterDice, type Card, type CombatEncounterState, type StateFixture,
} from '@mechanics';

import { buildCombatViewModel, effectChipA11y } from '../combat-encounter.engine';
import { programPlayVM } from '../card-program.engine';
import { GLYPH_COLORS } from '@/components/combat/statusGlyphs';
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

describe('the enemy-word chips carry their real kind, die and span', () => {
    const chipsOf = (words: Record<string, unknown>) =>
        buildCombatViewModel({ ...fightAt('bw-h1'), enemyWords: { ...NO_WORDS, ...words } } as CombatEncounterState);

    it('WARD is a boon, BRINE a cut, LEECH a drain, TANGLE and UNDERTOW control, each in its own colour', () => {
        const vm = chipsOf({ ward: 4, brine: 2, leechTurns: 2, leechPotency: 1, tangle: 1, undertow: 'mind' });
        const glyph = (side: 'enemy' | 'player', id: string) => (vm[side].effects.find((e) => e.effectId === id)!).glyph;
        expect(glyph('enemy', 'enemy-word-ward')).toMatchObject({ kind: 'statup', color: GLYPH_COLORS.statup });
        expect(glyph('player', 'enemy-word-brine')).toMatchObject({ kind: 'statdown', color: GLYPH_COLORS.statdown });
        expect(glyph('player', 'enemy-word-leech')).toMatchObject({ kind: 'dot', color: GLYPH_COLORS.dot });
        expect(glyph('player', 'enemy-word-tangle')).toMatchObject({ kind: 'control', color: GLYPH_COLORS.control });
        expect(glyph('player', 'enemy-word-undertow')).toMatchObject({ kind: 'control', color: GLYPH_COLORS.control });
    });

    it.each(['heart', 'body', 'mind'] as const)('UNDERTOW names the %s die it lifts', (die) => {
        const chip = chipsOf({ undertow: die }).player.effects.find((e) => e.effectId === 'enemy-word-undertow')!;
        expect(chip.caption).toContain(die.charAt(0).toUpperCase() + die.slice(1));
        expect(effectChipA11y(chip)).toContain(chip.caption!);
    });

    it('each chip says how long it lasts, not always "until the foe\'s next turn"', () => {
        const vm = chipsOf({ ward: 4, brine: 2, leechTurns: 2, leechPotency: 1, tangle: 1, undertow: 'body' });
        const a11y = (side: 'enemy' | 'player', id: string) => effectChipA11y(vm[side].effects.find((e) => e.effectId === id)!);
        expect(a11y('enemy', 'enemy-word-ward')).toContain("until the foe's next turn");
        expect(a11y('player', 'enemy-word-brine')).toContain('until the end of your next turn');
        expect(a11y('player', 'enemy-word-tangle')).toContain('until that many cards are played');
        expect(a11y('player', 'enemy-word-undertow')).toContain('until your next roll');
        expect(a11y('player', 'enemy-word-leech')).toContain('2 turns left');
    });
});

describe('the FREE shortfall belongs to the SACRIFICE floor alone', () => {
    const TITHE: Card = {
        id: 'ew-sacrifice', name: 'ew-sacrifice', color: 'any', description: 'A sacrifice fixture.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
        program: {
            free: { text: 'SACRIFICE 2, DEAL 7.', run: (c) => { c.sacrifice(2); c.deal(7); } },
            paid: { text: 'SACRIFICE 4, DEAL 16.', run: (c) => { c.sacrifice(4); c.deal(16); } },
        },
    };
    beforeAll(() => registerSandboxCards([TITHE]));
    afterAll(() => clearSandboxCards());

    const base = (): CombatEncounterState => {
        const s = fightAt('bw-h1');
        return { ...s, hand: [{ uid: 'h0', cardId: 'ew-sacrifice' }], player: { ...s.player, health: 2 } };
    };

    it('at the floor with no TANGLE: the refusal and its shortfall agree', () => {
        const vm = programPlayVM(base(), 'h0', 'ew-sacrifice');
        expect(vm.freeBlock).toBeTruthy();
        expect(vm.freeShortfall).not.toBeNull();
    });

    it('under TANGLE the refusal is TANGLE, so no SACRIFICE is owed', () => {
        const vm = programPlayVM({ ...base(), enemyWords: { ...NO_WORDS, tangle: 1 } }, 'h0', 'ew-sacrifice');
        expect(vm.freeBlock).toMatch(/tangled/);
        expect(vm.freeShortfall).toBeNull();
    });
});
