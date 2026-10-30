/**
 * Hermetic E2E — enemy words, parts 1 and 2 (phases EN1d and EN1e, acceptance A7 and A8).
 *
 * Each word a `phases` foe's move can carry, and the counter its gloss names:
 *   · WARD n: the foe's GUARD. It soaks your DEALs (FREE, PAID, a program
 *     DEAL, TETHER) before its VITAE, the part before VULNERABLE only, and is
 *     gone at the start of the foe's next turn. A plain VITAE loss skips it.
 *   · MEND n: the foe heals n, never past its max.
 *   · SCOUR n: the foe strips n statuses off itself, the last one included:
 *     its LEECH, then its INFERNO, then its STORM, then its newest affliction.
 *   · BRINE n: each GUARD you gain is cut by n until the end of your next turn.
 *   · VULNERABLE on you: `debuff_vulnerable` from a foe's move, n% more from
 *     its next `turns` attacks; GUARD still blocks the boosted hit.
 *   · LEECH on you: the program ledger's foe LEECH mirrored (3 turns per
 *     application, potency stacks). It ticks at the start of your turn, past
 *     GUARD, and the foe heals what you lost.
 *   · TANGLE n: your next n cards cannot use their FREE line (a FREE play is
 *     refused, each landed PAID play counts one off, the rest fades at the
 *     foe's next turn).
 *   · UNDERTOW: the named die does not roll on your next turn.
 *   · BARNACLE: a Curse joins your hand; it cannot be played or scrapped and
 *     falls off when you spend a body die on a card.
 * Every word's numbers but VULNERABLE's, TANGLE's and BARNACLE's scale with the foe's level.
 *
 * Synthetic sandbox cards and a fixture foe; no live foe carries a word yet.
 * Fixed RNG; no disk / network / TTY.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy, EnemyMove } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { ENEMY_KEYWORDS, enemyPhaseKeywords, moveKeywords } from '../../Enemy/enemy-keywords';
import { PHASES_AUTHORED_LEVEL } from '../../Enemy/enemy-phases';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import { deepClone } from '../../Utils';
import {
    discardCombatCard, initializeCombatEncounter, playCombatCard, resolveThreatPhase, rollEncounterDice, startTurn,
} from '../combat.engine';
import { getThreatSequence, scaleMoveNumber } from '../combat.threat';
import { initProgramLedger, LEECH_TURNS_PER_APPLICATION } from '../combat.card-program';
import { initElementState } from '../combat.elements';
import { scaleFor } from '../stat-scaling';
import { brineCut, wardSoak } from '../combat.enemy-words';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import { getCardById } from '../../Cards/cards.library';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const rng = (): number => 0.5;
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const STATS = { heart: 5, body: 5, mind: 5 };

function program(id: string, run: (c: ProgramCtx) => void): Card {
    return {
        id, name: id, color: 'any', description: 'An enemy-words test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run }, paid: { text: 'TEST.', run } },
    };
}

const CARDS: Card[] = [
    { id: 'ew-hit-5', name: 'Hit 5', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy', free: { damage: 5 } },
    { id: 'ew-hit-10', name: 'Hit 10', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy', free: { damage: 10 } },
    { id: 'ew-guard-2', name: 'Guard 2', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'skill', targetType: 'self', free: { guard: 2 } },
    { id: 'ew-guard-5', name: 'Guard 5', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'skill', targetType: 'self', free: { guard: 5 } },
    program('ew-deal-10', c => { c.deal(10, { exact: true }); }),
    program('ew-loses-6', c => { c.foeLoses(6); }),
    program('ew-guard-6', c => { c.guard(6, { exact: true }); }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

const FILLER: EnemyMove = { name: 'Wait', kind: 'unknown', text: 'It waits.' };

/** A normal foe at its authored level whose loop is `moves`, then a do-nothing move. */
function foe(moves: EnemyMove[], opts: { level?: number; health?: number } = {}): Enemy {
    return {
        ...deepClone(FloatEye),
        id: 'enemy-en1d-fixture', difficulty: 'normal',
        level: opts.level ?? PHASES_AUTHORED_LEVEL.normal,
        health: opts.health ?? 1000, maxHealth: 1000, effects: [],
        keywords: undefined, stages: undefined,
        phases: [{ moves: [...moves, FILLER] }],
    };
}

function makePlayer(): Character {
    const p = deepClone(Player);
    p.baseStats = { ...STATS };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    p.knownCards = ['grey-strike', 'grey-ward'];
    return p;
}

/** Opens a fight; the deck holds a program card so the fight carries a ledger. */
function open(enemy: Enemy): CombatEncounterState {
    const s = initializeCombatEncounter(makePlayer(), enemy, ['ew-guard-6', 'ew-hit-5'], 7);
    return rollEncounterDice(s, rng).state;
}

/** The foe's turn (the move it telegraphs) and the round boundary. */
function foeTurn(s: CombatEncounterState) {
    return resolveThreatPhase(s, rng);
}

/** Your next turn starts; the hand becomes `hand`, one wild die in the tray. */
function yourTurn(s: CombatEncounterState, hand: string[] = []): { state: CombatEncounterState; events: CombatEvent[] } {
    const r = startTurn(s, rng);
    return {
        state: { ...r.state, hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })), dice: [{ ...WILD }], guard: 0 },
        events: r.events,
    };
}

function play(s: CombatEncounterState, uid: string, paid = false) {
    return playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? WILD.id : undefined, rng);
}

const words = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'enemy-word' }> => e.kind === 'enemy-word');

it('the fixture player is at neutral stats, so a printed number is the number', () => {
    expect(scaleFor(10, STATS, 'body', 'one-shot')).toBe(10);
    expect(scaleFor(5, STATS, 'mind', 'one-shot')).toBe(5);
});

describe('the nine words are the enemy keywords', () => {
    it('ENEMY_KEYWORDS names the six, then TANGLE, UNDERTOW and BARNACLE', () => {
        expect([...ENEMY_KEYWORDS]).toEqual([
            'ward', 'mend', 'scour', 'brine', 'vulnerable', 'leech', 'tangle', 'undertow', 'barnacle',
        ]);
    });

    it('a move reports the words its fields carry, and a foe the words of all its moves', () => {
        const move: EnemyMove = { name: 'Knot Up', kind: 'defend', text: 'x', ward: 5, enemyHeal: 4 };
        expect(moveKeywords(move)).toEqual(['ward', 'mend']);
        expect(moveKeywords(FILLER)).toEqual([]);
        const e = foe([move, { name: 'Latch', kind: 'attack', text: 'x', damage: 4, leech: 2 }]);
        expect(enemyPhaseKeywords(e)).toEqual(['ward', 'mend', 'leech']);
    });

    it('every word number but VULNERABLE scales with level like damage', () => {
        const move: EnemyMove = {
            name: 'All', kind: 'status', text: 'x',
            ward: 8, brine: 3, leech: 2, enemyHeal: 6, enemyCleanse: 1, vulnerable: { pct: 25, turns: 1 },
        };
        const level = 6;
        const [entry] = getThreatSequence(foe([move], { level }));
        const effects = entry.threatAction.effects;
        const at = (n: number) => scaleMoveNumber(n, level, PHASES_AUTHORED_LEVEL.normal);
        expect(effects).toContainEqual({ ward: at(8) });
        expect(effects).toContainEqual({ brine: at(3) });
        expect(effects).toContainEqual({ leech: at(2) });
        expect(effects).toContainEqual({ enemyHeal: at(6) });
        expect(effects).toContainEqual({ scour: 1 });
        expect(effects).toContainEqual({ vulnerable: { pct: 25, turns: 1 } });
        expect(at(8)).toBeGreaterThan(8);
    });
});

describe('WARD', () => {
    const LOCK: EnemyMove = { name: 'Lock the Brake', kind: 'defend', text: 'WARD 8.', ward: 8 };

    it('the foe gains its WARD when the move fires', () => {
        const r = foeTurn(open(foe([LOCK])));
        expect(r.state.enemyWords?.ward).toBe(8);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'ward', op: 'gained', amount: 8 });
    });

    it('soaks a FREE DEAL before the foe VITAE, then lets the rest through', () => {
        let s = yourTurn(foeTurn(open(foe([LOCK]))).state, ['ew-hit-5', 'ew-hit-10']).state;
        const hp = s.enemy.health;
        const a = play(s, 'h0');
        expect(a.state.enemy.health).toBe(hp);
        expect(a.state.enemyWords?.ward).toBe(3);
        expect(words(a.events)).toEqual([{ kind: 'enemy-word', word: 'ward', op: 'soaked', amount: 5 }]);
        s = a.state;
        const b = play(s, 'h1');
        expect(hp - b.state.enemy.health).toBe(7);
        expect(b.state.enemyWords?.ward).toBe(0);
    });

    it('soaks a PAID DEAL and a program DEAL the same way', () => {
        const s = yourTurn(foeTurn(open(foe([LOCK]))).state, ['grey-strike', 'ew-deal-10']).state;
        const hp = s.enemy.health;
        const paid = play(s, 'h0', true);
        const strike = 5;
        expect(paid.state.enemy.health).toBe(hp);
        expect(paid.state.enemyWords?.ward).toBe(8 - strike);
        const prog = play(paid.state, 'h1');
        expect(hp - prog.state.enemy.health).toBe(10 - (8 - strike));
        expect(prog.state.enemyWords?.ward).toBe(0);
    });

    it('VULNERABLE skips it: only the hit before VULNERABLE meets the WARD', () => {
        let s = yourTurn(foeTurn(open(foe([LOCK]))).state, ['ew-hit-10']).state;
        s = { ...s, enemy: { ...s.enemy, effects: [{ effectId: 'debuff_vulnerable', remainingDuration: 3, intensity: 50, appliedAt: 1, tier: 1 as const }] } };
        const hp = s.enemy.health;
        const r = play(s, 'h0');
        // 10 before VULNERABLE, 15 after: WARD 8 takes 8 of the 10, the extra 5 passes.
        expect(hp - r.state.enemy.health).toBe(7);
        expect(wardSoak(8, 10, 15)).toEqual({ dealt: 7, soaked: 8, ward: 0 });
    });

    it('a plain VITAE loss (not a DEAL) skips it', () => {
        const s = yourTurn(foeTurn(open(foe([LOCK]))).state, ['ew-loses-6']).state;
        const hp = s.enemy.health;
        const r = play(s, 'h0');
        expect(hp - r.state.enemy.health).toBe(6);
        expect(r.state.enemyWords?.ward).toBe(8);
    });

    it('is gone at the start of the foe next turn', () => {
        const s = yourTurn(foeTurn(open(foe([LOCK]))).state).state;
        const r = foeTurn(s);
        expect(r.state.enemyWords?.ward).toBe(0);
        expect(words(r.events)[0]).toEqual({ kind: 'enemy-word', word: 'ward', op: 'faded', amount: 8 });
    });
});

describe('MEND', () => {
    it('the foe heals n, never past its max', () => {
        const mend: EnemyMove = { name: 'Mend the Net', kind: 'defend', text: 'MEND 6.', enemyHeal: 6 };
        const hurt = foeTurn(open(foe([mend], { health: 900 })));
        expect(hurt.state.enemy.health).toBe(906);
        expect(hurt.events).toContainEqual({ kind: 'enemy-healed', enemyId: 'enemy-en1d-fixture', source: 'THREAT', amount: 6 });
        const near = foeTurn(open(foe([mend], { health: 997 })));
        expect(near.state.enemy.health).toBe(1000);
    });
});

describe('SCOUR', () => {
    const SCOUR: EnemyMove = { name: 'Scour', kind: 'defend', text: 'SCOUR.', enemyCleanse: 1 };
    const VULN = { effectId: 'debuff_vulnerable', remainingDuration: 10, intensity: 20, appliedAt: 1, tier: 1 as const };

    function stacked(): CombatEncounterState {
        const s = open(foe([SCOUR, SCOUR, SCOUR, SCOUR]));
        const ledger = initProgramLedger();
        return {
            ...s,
            enemy: { ...s.enemy, effects: [VULN] },
            program: { ...ledger, leechTurns: 3, leechPotency: 4, el: { ...initElementState(), infFoe: 3, storm: 2 } },
        };
    }

    it('strips its LEECH, then its INFERNO, then its STORM, then its afflictions, the last one too', () => {
        let s = stacked();
        // LEECH ticks before the foe acts, so it is still there for the first SCOUR.
        let r = foeTurn(s);
        expect(words(r.events).find(e => e.op === 'stripped')?.stripped).toEqual(['LEECH']);
        expect(r.state.program!.leechTurns).toBe(0);
        s = r.state;
        r = foeTurn(s);
        expect(words(r.events).find(e => e.op === 'stripped')?.stripped).toEqual(['INFERNO']);
        s = r.state;
        r = foeTurn(s);
        expect(words(r.events).find(e => e.op === 'stripped')?.stripped).toEqual(['STORM']);
        expect(r.state.program!.el.storm).toBe(0);
        s = r.state;
        r = foeTurn(s);
        expect(words(r.events).find(e => e.op === 'stripped')?.stripped).toEqual(['debuff_vulnerable']);
        expect(r.state.enemy.effects).toEqual([]);
    });

    it('a both-sides INFERNO leaves you your half', () => {
        const s = stacked();
        const r = foeTurn({ ...s, program: { ...s.program!, leechTurns: 0, leechPotency: 0, el: { ...initElementState(), infShared: 4 } } });
        expect(words(r.events).find(e => e.op === 'stripped')?.stripped).toEqual(['INFERNO']);
        expect(r.state.program!.el.infShared).toBe(0);
        expect(r.state.program!.el.infSelf).toBe(2);
    });

    it('with nothing on it, SCOUR does nothing', () => {
        const r = foeTurn(open(foe([SCOUR])));
        expect(words(r.events)).toEqual([]);
    });
});

describe('BRINE', () => {
    const KEEN: EnemyMove = { name: 'Keening', kind: 'attack', text: '4 damage and BRINE 3.', damage: 4, brine: 3 };

    it('each GUARD you gain is cut by n, so one big GUARD keeps more than two small ones', () => {
        let s = yourTurn(foeTurn(open(foe([KEEN]))).state, ['ew-guard-2', 'ew-guard-2', 'ew-guard-5']).state;
        expect(s.enemyWords?.brine).toBe(3);
        const a = play(s, 'h0');
        expect(a.state.guard).toBe(0);
        expect(words(a.events)).toEqual([{ kind: 'enemy-word', word: 'brine', op: 'cut', amount: 2 }]);
        s = play(a.state, 'h1').state;
        expect(s.guard).toBe(0);
        s = play(s, 'h2').state;
        expect(s.guard).toBe(2);
        expect(brineCut({ enemyWords: { ward: 0, brine: 3, leechTurns: 0, leechPotency: 0 } }, 5)).toBe(2);
    });

    it('cuts a PAID and a program GUARD gain too', () => {
        const s = yourTurn(foeTurn(open(foe([KEEN]))).state, ['grey-ward', 'ew-guard-6']).state;
        const paid = play(s, 'h0', true);
        expect(paid.state.guard).toBe(5 - 3);
        const prog = play(paid.state, 'h1');
        expect(prog.state.guard).toBe(2 + 6 - 3);
    });

    it('lasts through your next turn and fades at the start of the foe next turn', () => {
        const s = yourTurn(foeTurn(open(foe([KEEN]))).state).state;
        const r = foeTurn(s);
        expect(r.state.enemyWords?.brine).toBe(0);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'brine', op: 'faded', amount: 3 });
    });
});

describe('VULNERABLE on you', () => {
    const STARE: EnemyMove = { name: 'Stare', kind: 'status', text: 'VULNERABLE 25% for 1 turn.', vulnerable: { pct: 25, turns: 1 } };
    const BITE: EnemyMove = { name: 'Bite', kind: 'attack', text: '8 damage.', damage: 8 };

    it('lands debuff_vulnerable on you and the foe next attack hits 25% harder, then it wears off', () => {
        const e = { ...foe([STARE]), phases: [{ moves: [STARE, BITE, BITE] }] };
        let r = foeTurn(open(e));
        const vuln = r.state.player.effects.find(ae => ae.effectId === 'debuff_vulnerable');
        expect(vuln?.intensity).toBe(25);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'vulnerable', op: 'gained', amount: 25 });
        let s = yourTurn(r.state).state;
        let hp = s.player.health;
        r = foeTurn(s);
        expect(hp - r.state.player.health).toBe(10);
        s = yourTurn(r.state).state;
        hp = s.player.health;
        r = foeTurn(s);
        expect(hp - r.state.player.health).toBe(8);
    });

    it('GUARD still blocks the boosted hit', () => {
        const e = { ...foe([STARE]), phases: [{ moves: [STARE, BITE] }] };
        const s = yourTurn(foeTurn(open(e)).state).state;
        const hp = s.player.health;
        const r = foeTurn({ ...s, guard: 10 });
        expect(r.state.player.health).toBe(hp);
    });
});

describe('LEECH on you', () => {
    const LATCH: EnemyMove = { name: 'Latch', kind: 'attack', text: 'LEECH 2 on you.', leech: 2 };

    it('adds 3 turns and the potency, like the foe LEECH', () => {
        const r = foeTurn(open(foe([LATCH])));
        expect(r.state.enemyWords).toMatchObject({ leechTurns: LEECH_TURNS_PER_APPLICATION, leechPotency: 2 });
        const twice = foeTurn(open({ ...foe([LATCH]), phases: [{ moves: [LATCH] }] }));
        const again = foeTurn(yourTurn(twice.state).state);
        // One tick at your turn start, then a second LEECH 2.
        expect(again.state.enemyWords).toMatchObject({ leechTurns: LEECH_TURNS_PER_APPLICATION * 2 - 1, leechPotency: 4 });
    });

    it('ticks at the start of your turn past GUARD, and the foe heals what you lost', () => {
        const opened = open(foe([LATCH], { health: 900 }));
        const afterFoe = foeTurn({ ...opened, guard: 50 }).state;
        const hp = afterFoe.player.health;
        const foeHp = afterFoe.enemy.health;
        const t = yourTurn({ ...afterFoe, guard: 50 });
        expect(hp - t.state.player.health).toBe(2);
        expect(t.state.enemy.health - foeHp).toBe(2);
        expect(t.events).toContainEqual({ kind: 'enemy-word', word: 'leech', op: 'ticked', amount: 2 });
        expect(t.state.enemyWords?.leechTurns).toBe(2);
    });

    it('runs out after its turns and the potency resets', () => {
        const e = { ...foe([LATCH]), phases: [{ moves: [LATCH, FILLER, FILLER, FILLER, FILLER] }] };
        let s = foeTurn(open(e)).state;
        for (let k = 0; k < 3; k++) s = foeTurn(yourTurn(s).state).state;
        expect(s.enemyWords).toMatchObject({ leechTurns: 0, leechPotency: 0 });
        const quiet = yourTurn(s);
        expect(words(quiet.events)).toEqual([]);
    });

    it('can kill you at the start of your turn', () => {
        const s = foeTurn(open(foe([LATCH]))).state;
        const r = startTurn({ ...s, player: { ...s.player, health: 2 } }, rng);
        expect(r.state.finalOutcome).toBe('defeat');
    });
});

describe('TANGLE', () => {
    const SNARE: EnemyMove = { name: 'Snare', kind: 'status', text: 'TANGLE 2.', tangle: 2 };

    it('the count is not scaled by level and lands after the move', () => {
        const [entry] = getThreatSequence(foe([SNARE], { level: 6 }));
        expect(entry.threatAction.effects).toContainEqual({ tangle: 2 });
        const r = foeTurn(open(foe([SNARE])));
        expect(r.state.enemyWords?.tangle).toBe(2);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'tangle', op: 'gained', amount: 2 });
    });

    it('refuses a FREE play and spends nothing', () => {
        const s = yourTurn(foeTurn(open(foe([SNARE]))).state, ['ew-hit-5']).state;
        const hp = s.enemy.health;
        const r = play(s, 'h0');
        expect(r.state.enemy.health).toBe(hp);
        expect(r.state.hand.map(h => h.uid)).toEqual(['h0']);
        expect(r.events[0]).toMatchObject({ kind: 'effect-fizzled' });
        expect(r.state.enemyWords?.tangle).toBe(2);
    });

    it('a PAID play still works and counts one card off', () => {
        const s = yourTurn(foeTurn(open(foe([SNARE]))).state, ['grey-strike']).state;
        const r = play(s, 'h0', true);
        expect(r.state.hand).toHaveLength(0);
        expect(r.state.enemyWords?.tangle).toBe(1);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'tangle', op: 'spent', amount: 1 });
    });

    it('after n paid cards the FREE line is back', () => {
        let s = yourTurn(foeTurn(open(foe([SNARE]))).state, ['grey-strike', 'grey-strike', 'ew-hit-5']).state;
        s = play(s, 'h0', true).state;
        s = play(s, 'h1', true).state;
        expect(s.enemyWords?.tangle).toBe(0);
        const hp = s.enemy.health;
        expect(hp - play(s, 'h2').state.enemy.health).toBe(5);
    });

    it('fades at the start of the foe next turn if unspent', () => {
        const s = yourTurn(foeTurn(open(foe([SNARE]))).state).state;
        const r = foeTurn(s);
        expect(r.state.enemyWords?.tangle).toBe(0);
        expect(words(r.events)[0]).toEqual({ kind: 'enemy-word', word: 'tangle', op: 'faded', amount: 2 });
    });
});

describe('UNDERTOW', () => {
    const DRAG: EnemyMove = { name: 'Drag', kind: 'status', text: 'UNDERTOW.', undertow: 'mind' };

    it('names one die and does not scale', () => {
        const [entry] = getThreatSequence(foe([DRAG], { level: 6 }));
        expect(entry.threatAction.effects).toContainEqual({ undertow: 'mind' });
        const r = foeTurn(open(foe([DRAG])));
        expect(r.state.enemyWords?.undertow).toBe('mind');
    });

    it('the named die is not on the tray next turn, the others are', () => {
        const s = foeTurn(open(foe([DRAG]))).state;
        const r = startTurn(s, rng);
        const colors = r.state.dice.map(d => d.color);
        expect(colors).not.toContain('mind');
        expect(colors).toContain('body');
        expect(colors).toContain('heart');
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'undertow', op: 'spent', amount: 1 });
        expect(r.state.enemyWords?.undertow).toBeUndefined();
    });

    it('lasts one turn only', () => {
        const s = foeTurn(open(foe([DRAG]))).state;
        const t1 = startTurn(s, rng).state;
        const t2 = startTurn({ ...foeTurn(t1).state, turnTakenThisPhase: false }, rng);
        expect(t2.state.dice.map(d => d.color)).toContain('mind');
    });

    it('a banked Reserve die still powers a card (the counter)', () => {
        const s = foeTurn(open(foe([DRAG]))).state;
        const banked = { id: 'bank', color: 'mind' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
        const r = startTurn({ ...s, reserve: [banked] }, rng);
        expect(r.state.reserve?.map(d => d.id)).toContain('bank');
        expect(r.state.dice.map(d => d.color)).not.toContain('mind');
    });
});

describe('BARNACLE', () => {
    const LATCH_ON: EnemyMove = { name: 'Latch On', kind: 'status', text: 'BARNACLE.', barnacle: 1 };
    const BODY = { id: 'body1', color: 'body' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
    const MIND = { id: 'mind1', color: 'mind' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

    function withBarnacle(extra: string[] = ['grey-strike']): CombatEncounterState {
        const s = foeTurn(open(foe([LATCH_ON]))).state;
        const t = startTurn(s, rng).state;
        return { ...t, hand: [...t.hand, ...extra.map((cardId, i) => ({ uid: `x${i}`, cardId }))], dice: [BODY, MIND] };
    }

    it('is a Curse card outside the player library', () => {
        expect(getCardById(BARNACLE_ID)?.cardType).toBe('curse');
        const r = foeTurn(open(foe([LATCH_ON])));
        expect(r.state.hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(1);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'barnacle', op: 'gained', amount: 1 });
    });

    it('cannot be played, FREE or PAID', () => {
        const s = withBarnacle();
        const uid = s.hand.find(h => h.cardId === BARNACLE_ID)!.uid;
        for (const paid of [false, true]) {
            const r = playCombatCard(s, { uid }, paid, paid ? BODY.id : undefined, rng);
            expect(r.events[0]).toMatchObject({ kind: 'effect-fizzled' });
            expect(r.state.hand.some(h => h.cardId === BARNACLE_ID)).toBe(true);
        }
    });

    it('cannot be scrapped', () => {
        const s = withBarnacle();
        const uid = s.hand.find(h => h.cardId === BARNACLE_ID)!.uid;
        const r = discardCombatCard(s, uid);
        expect(r.events[0]).toMatchObject({ kind: 'effect-fizzled' });
        expect(r.state.hand.some(h => h.cardId === BARNACLE_ID)).toBe(true);
    });

    it('stays through a FREE play and through a non-body PAID play', () => {
        let s = withBarnacle(['ew-hit-5', 'grey-strike']);
        s = playCombatCard(s, { uid: 'x0' }, false, undefined, rng).state;
        expect(s.hand.some(h => h.cardId === BARNACLE_ID)).toBe(true);
        const r = playCombatCard(s, { uid: 'x1' }, true, MIND.id, rng);
        expect(r.state.hand.some(h => h.cardId === BARNACLE_ID)).toBe(true);
    });

    it('falls off when a body die is spent on a card (the counter)', () => {
        const s = withBarnacle();
        const r = playCombatCard(s, { uid: 'x0' }, true, BODY.id, rng);
        expect(r.state.hand.some(h => h.cardId === BARNACLE_ID)).toBe(false);
        expect(words(r.events)).toContainEqual({ kind: 'enemy-word', word: 'barnacle', op: 'shed', amount: 1 });
    });

    it('two Barnacles fall one at a time', () => {
        const s = withBarnacle();
        const two = { ...s, hand: [...s.hand, { uid: 'bn9', cardId: BARNACLE_ID }] };
        const r = playCombatCard(two, { uid: 'x0' }, true, BODY.id, rng);
        expect(r.state.hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(1);
    });
});
