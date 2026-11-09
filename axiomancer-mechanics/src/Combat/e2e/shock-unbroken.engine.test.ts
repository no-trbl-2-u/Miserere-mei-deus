/**
 * Hermetic E2E: SHOCK and UNBROKEN, the two words 162.2 adds.
 *
 *   · SHOCK n: every DEAL against the bearer deals n more, per hit, before
 *     VULNERABLE. It lasts 3 turns; a new SHOCK resets the turns and adds to n.
 *     It works on either side.
 *   · UNBROKEN: a clause on a WARD move. It pays out at the start of the foe's
 *     next turn if any WARD is left, before the foe's move; broken WARD pays
 *     nothing, and a partly broken WARD pays in full.
 *
 * Fixture moves: no live foe plays either word until the recast foes land.
 * Fixed RNG; no disk / network / TTY.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy, EnemyMove } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { enemyPhaseKeywords, moveKeywords } from '../../Enemy/enemy-keywords';
import { PHASES_AUTHORED_LEVEL } from '../../Enemy/enemy-phases';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import type { ActiveEffect } from '../../Effects/types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, payTheToll, playCombatCard, projectIncomingThreat, resolveThreatPhase, rollEncounterDice, startTurn, threatHits,
} from '../combat.engine';
import { getThreatSequence, scaleMoveNumber } from '../combat.threat';
import { initProgramLedger, programSpikeStrike } from '../combat.card-program';
import { getDamageTakenFlat } from '../effects';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const rng = (): number => 0.5;
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const STATS = { heart: 5, body: 5, mind: 5 };

function program(id: string, run: (c: ProgramCtx) => void): Card {
    return {
        id, name: id, color: 'any', description: 'A SHOCK test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run }, paid: { text: 'TEST.', run } },
    };
}

const CARDS: Card[] = [
    { id: 'su-hit-5', name: 'Hit 5', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy', free: { damage: 5 } },
    { id: 'su-hit-30', name: 'Hit 30', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'spell', targetType: 'enemy', free: { damage: 30 } },
    program('su-deal-10', c => { c.deal(10, { exact: true }); }),
    { id: 'su-paid-deal-6', name: 'Paid 6', color: 'any', description: 'x', tier: 1, rank: 1, cardType: 'attack', targetType: 'enemy', free: { damage: 1 }, specialMechanics: [{ kind: 'deal', amount: 6 }] },
    program('su-deal-1-thrice', c => { c.deal(1, { exact: true }); c.deal(1, { exact: true }); c.deal(1, { exact: true }); }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

const FILLER: EnemyMove = { name: 'Wait', kind: 'unknown', text: 'It waits.' };
const STATIC: EnemyMove = { name: 'Static', kind: 'status', text: 'SHOCK 2.', shock: 2 };
const STINGS: EnemyMove = { name: 'Stings', kind: 'attack', text: 'DEAL 3 five times.', damage: 3, hits: 5 };
const RIPOSTE: EnemyMove = { name: 'Riposte', kind: 'defend', text: 'WARD 10. UNBROKEN: DEAL 4 twice.', ward: 10, unbroken: { damage: 4, hits: 2 } };

/** A normal foe at its authored level whose loop is `moves`, then a do-nothing move. */
function foe(moves: EnemyMove[], opts: { level?: number } = {}): Enemy {
    return {
        ...deepClone(FloatEye),
        id: 'enemy-mv1b-fixture', difficulty: 'normal',
        level: opts.level ?? PHASES_AUTHORED_LEVEL.normal,
        health: 1000, maxHealth: 1000, effects: [],
        keywords: undefined, stages: undefined,
        phases: [{ moves: [...moves, FILLER] }],
    };
}

function makePlayer(): Character {
    const p = deepClone(Player);
    p.baseStats = { ...STATS };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    p.knownCards = ['grey-strike', 'grey-ward', 'su-paid-deal-6'];
    return p;
}

function open(enemy: Enemy): CombatEncounterState {
    const s = initializeCombatEncounter(makePlayer(), enemy, ['su-deal-10', 'su-hit-5'], 7);
    return rollEncounterDice(s, rng).state;
}

const foeTurn = (s: CombatEncounterState) => resolveThreatPhase(s, rng);

/** Your next turn starts; the hand becomes `hand`, one wild die in the tray, no GUARD. */
function yourTurn(s: CombatEncounterState, hand: string[] = []): CombatEncounterState {
    return { ...startTurn(s, rng).state, hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })), dice: [{ ...WILD }], guard: 0 };
}

const play = (s: CombatEncounterState, uid: string) => playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, false, undefined, rng);

const hitsOnYou = (events: readonly CombatEvent[]): number[] => events
    .filter((e): e is Extract<CombatEvent, { kind: 'damage-dealt' }> => e.kind === 'damage-dealt' && e.target === 'self')
    .map(e => e.amount);

const shockOf = (s: CombatEncounterState): ActiveEffect | undefined => s.player.effects.find(e => e.effectId === 'debuff_shock');

const SHOCK_2: ActiveEffect = { effectId: 'debuff_shock', remainingDuration: 3, intensity: 2, appliedAt: 1, tier: 1 };

describe('SHOCK', () => {
    it('the move carries SHOCK as a count: its number does not scale with level', () => {
        const [entry] = getThreatSequence(foe([STATIC], { level: 6 }));
        expect(entry.threatAction.effects).toContainEqual({ shock: 2 });
        expect(moveKeywords(STATIC)).toEqual(['shock']);
    });

    it('a foe\'s SHOCK adds to every hit of its next attack: five hits of 3 at SHOCK 2 land 5 each', () => {
        const shocked = foeTurn(open(foe([STATIC, STINGS]))).state;
        expect(shockOf(shocked)).toMatchObject({ intensity: 2, remainingDuration: 3 });
        const r = foeTurn(yourTurn(shocked));
        expect(hitsOnYou(r.events)).toEqual([5, 5, 5, 5, 5]);
    });

    it('with no SHOCK the same hits land as printed', () => {
        const r = foeTurn(open(foe([STINGS])));
        expect(hitsOnYou(r.events)).toEqual([3, 3, 3, 3, 3]);
    });

    it('lasts through the foe\'s next 3 attacks, reading 3, 2, 1, and is gone for the 4th', () => {
        const hit: EnemyMove = { name: 'Hit', kind: 'attack', text: 'DEAL 3.', damage: 3 };
        let s = foeTurn(open(foe([STATIC, hit, hit, hit, hit]))).state;
        const seen: number[] = [];
        const clock: (number | undefined)[] = [];
        for (let i = 0; i < 4; i++) {
            clock.push(shockOf(s)?.remainingDuration);
            const r = foeTurn(yourTurn(s));
            seen.push(...hitsOnYou(r.events));
            s = r.state;
        }
        expect(clock).toEqual([3, 2, 1, undefined]);
        expect(seen).toEqual([5, 5, 5, 3]);
    });

    it('a new SHOCK resets the turns to 3 and adds to the number', () => {
        const again: EnemyMove = { name: 'Again', kind: 'status', text: 'SHOCK 1.', shock: 1 };
        let s = foeTurn(open(foe([STATIC, FILLER, again]))).state;
        expect(shockOf(s)).toMatchObject({ intensity: 2, remainingDuration: 3 });
        s = foeTurn(yourTurn(s)).state;
        expect(shockOf(s)).toMatchObject({ intensity: 2, remainingDuration: 2 });
        s = foeTurn(yourTurn(s)).state;
        expect(shockOf(s)).toMatchObject({ intensity: 3, remainingDuration: 3 });
    });

    it('joins each hit before VULNERABLE, and GUARD still blocks the larger hit', () => {
        const big: EnemyMove = { name: 'Big', kind: 'attack', text: 'DEAL 4.', damage: 4 };
        const s = open(foe([big]));
        const vulnerable: ActiveEffect = { effectId: 'debuff_vulnerable', remainingDuration: 3, intensity: 50, appliedAt: 1, tier: 1 };
        const both = { ...s, player: { ...s.player, effects: [SHOCK_2, vulnerable] }, guard: 2 };
        expect(hitsOnYou(foeTurn(both).events)).toEqual([7]); // (4 + 2) x 1.5 = 9, less 2 GUARD
    });

    it('the wall math sees it', () => {
        const s = open(foe([STINGS]));
        const shocked = { ...s, player: { ...s.player, effects: [SHOCK_2] } };
        expect(threatHits(shocked)).toEqual([5, 5, 5, 5, 5]);
        expect(projectIncomingThreat(shocked).projectedDamage).toBe(25);
    });

    describe('works on either side', () => {
        const onFoe = (): CombatEncounterState => {
            const s = open(foe([FILLER]));
            return { ...s, enemy: { ...s.enemy, effects: [SHOCK_2] } };
        };
        const dealt = (s: CombatEncounterState, card: string): number => {
            const before = s.enemy.health;
            const hand = yourTurn(s, [card]);
            return before - play(hand, 'h0').state.enemy.health;
        };

        it('reads the status off whichever combatant carries it', () => {
            expect(getDamageTakenFlat(onFoe().enemy)).toBe(2);
            expect(getDamageTakenFlat(makePlayer())).toBe(0);
        });

        it('a FREE DEAL against a SHOCKED foe deals n more', () => {
            expect(dealt(onFoe(), 'su-hit-5')).toBe(7);
        });

        it('a program DEAL deals n more, per DEAL', () => {
            expect(dealt(onFoe(), 'su-deal-10')).toBe(12);
            expect(dealt(onFoe(), 'su-deal-1-thrice')).toBe(9);
        });

        const dealtBottom = (s: CombatEncounterState, card: string): number => {
            const before = s.enemy.health;
            const hand = yourTurn(s, [card]);
            return before - playCombatCard({ ...hand, dice: [{ ...WILD }] }, { uid: 'h0' }, true, WILD.id, rng).state.enemy.health;
        };
        const plain = (): CombatEncounterState => open(foe([FILLER]));

        it('the PAID path: a card\'s DEAL line deals n more than it does unshocked', () => {
            const base = dealtBottom(plain(), 'su-paid-deal-6');
            expect(base).toBeGreaterThan(0);
            expect(dealtBottom(onFoe(), 'su-paid-deal-6')).toBe(base + 2);
        });

        it('the FREE rider path (applyRiderToState): n more than unshocked', () => {
            const base = dealt(plain(), 'su-hit-5');
            expect(base).toBe(5);
            expect(dealt(onFoe(), 'su-hit-5')).toBe(base + 2);
        });

        it('a THORNS or REFLECT strike (programSpikeStrike) is a DEAL: it takes n more per hit', () => {
            const s = onFoe();
            const spikes = { ...initProgramLedger().spikes!, thorns: 3, reflect: 50 };
            const hits = (enemy: typeof s.enemy) => programSpikeStrike(
                { ...initProgramLedger(), spikes }, enemy, 10,
            ).hits;
            // THORNS 3 and REFLECT 50% of a 10 hit (5), each plus SHOCK 2.
            expect(hits(plain().enemy)).toEqual([{ spike: 'thorns', amount: 3 }, { spike: 'reflect', amount: 5 }]);
            expect(hits(s.enemy)).toEqual([{ spike: 'thorns', amount: 5 }, { spike: 'reflect', amount: 7 }]);
        });

        it('a TETHER hit (the toll paid with a tether up) takes n more', () => {
            const levy: EnemyMove = { name: 'Levy', kind: 'attack', text: 'x', damage: 1, rider: { kind: 'toll-levy', damage: 1 } };
            const owing = (shocked: boolean): CombatEncounterState => {
                const s = open(foe([levy]));
                return {
                    ...s, phase: 'phase-play',
                    enemy: shocked ? { ...s.enemy, effects: [SHOCK_2] } : s.enemy,
                    enemyRiders: { tollOwed: 3 },
                    program: { ...initProgramLedger(), tetherUntil: 99, tetherCardId: 'su-hit-5' },
                };
            };
            const lost = (s: CombatEncounterState): number => s.enemy.health - payTheToll(s).state.enemy.health;
            expect(lost(owing(false))).toBe(3);
            expect(lost(owing(true))).toBe(5);
        });
    });

    describe('on a card DEAL the order is FROZEN doubling, then SHOCK, then VULNERABLE', () => {
        it('(10 x 2 + 2) x 1.5 = 33, not 36 or 32', () => {
            const vulnerable: ActiveEffect = { effectId: 'debuff_vulnerable', remainingDuration: 3, intensity: 50, appliedAt: 1, tier: 1 };
            const s = open(foe([FILLER]));
            const hand = yourTurn(s, ['su-deal-10']);
            const rigged: CombatEncounterState = {
                ...hand,
                enemy: { ...hand.enemy, effects: [SHOCK_2, vulnerable] },
                program: { ...(hand.program ?? initProgramLedger()), el: { ...(hand.program?.el ?? initProgramLedger().el!), frozen: true } },
            };
            const before = rigged.enemy.health;
            expect(before - play(rigged, 'h0').state.enemy.health).toBe(33);
        });
    });
});

describe('UNBROKEN', () => {
    const armed = (moves: EnemyMove[]): CombatEncounterState => foeTurn(open(foe(moves))).state;

    it('arms when the WARD move fires, damage scaled, counts not', () => {
        const [entry] = getThreatSequence(foe([{ ...RIPOSTE, unbroken: { damage: 4, hits: 2, shock: 1, barnacle: 1 } }], { level: 6 }));
        expect(entry.threatAction.effects).toContainEqual({
            unbroken: { damage: scaleMoveNumber(4, 6, PHASES_AUTHORED_LEVEL.normal), hits: 2, shock: 1, barnacle: 1 },
        });
        expect(armed([RIPOSTE]).enemyWords?.unbroken).toEqual({ damage: 4, hits: 2 });
        expect(moveKeywords(RIPOSTE)).toEqual(['ward', 'unbroken']);
    });

    it('WARD whole: pays out at the start of the foe\'s next turn, before its move, and the clause is spent', () => {
        const r = foeTurn(yourTurn(armed([RIPOSTE])));
        expect(hitsOnYou(r.events)).toEqual([4, 4]);
        expect(r.events).toContainEqual({ kind: 'enemy-word', word: 'unbroken', op: 'spent', amount: 1 });
        expect(r.state.enemyWords?.ward).toBe(0);
        expect(r.state.enemyWords?.unbroken).toBeUndefined();
    });

    it('WARD partly broken: any left pays, in full', () => {
        const s = yourTurn(armed([RIPOSTE]), ['su-hit-5']);
        const broken = play(s, 'h0').state;
        expect(broken.enemyWords?.ward).toBe(5);
        expect(hitsOnYou(foeTurn(broken).events)).toEqual([4, 4]);
    });

    it('WARD gone: pays nothing and the clause is spent', () => {
        const s = yourTurn(armed([RIPOSTE]), ['su-hit-30']);
        const broken = play(s, 'h0').state;
        expect(broken.enemyWords?.ward).toBe(0);
        const r = foeTurn(broken);
        expect(hitsOnYou(r.events)).toEqual([]);
        expect(r.events.some(e => e.kind === 'enemy-word' && e.word === 'unbroken')).toBe(false);
        expect(r.state.enemyWords?.unbroken).toBeUndefined();
    });

    it('its hits are DEALs: GUARD soaks them and SHOCK adds to them', () => {
        const s = yourTurn(armed([RIPOSTE]));
        expect(hitsOnYou(foeTurn({ ...s, guard: 5 }).events)).toEqual([3]);
        expect(hitsOnYou(foeTurn({ ...s, player: { ...s.player, effects: [SHOCK_2] } }).events)).toEqual([6, 6]);
    });

    it('pays a status: SHOCK lands', () => {
        const drift: EnemyMove = { name: 'Drift', kind: 'defend', text: 'WARD 8. UNBROKEN: SHOCK 1.', ward: 8, unbroken: { shock: 1 } };
        expect(enemyPhaseKeywords(foe([drift]))).toEqual(['ward', 'shock', 'unbroken']);
        const r = foeTurn(yourTurn(armed([drift])));
        expect(shockOf(r.state)).toMatchObject({ intensity: 1, remainingDuration: 3 });
    });

    it('pays Curses: a BARNACLE joins your hand', () => {
        const shell: EnemyMove = { name: 'Shell', kind: 'defend', text: 'WARD 10. UNBROKEN: BARNACLE 1.', ward: 10, unbroken: { barnacle: 1 } };
        const r = foeTurn(yourTurn(armed([shell])));
        expect(r.state.hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(1);
    });

    it('a foe denied its turn pays nothing, and the clause goes with its WARD', () => {
        const s = yourTurn(armed([RIPOSTE]));
        const stone: ActiveEffect = { effectId: 'debuff_petrify', remainingDuration: 3, intensity: 1, appliedAt: 1, tier: 1 };
        const r = foeTurn({ ...s, enemy: { ...s.enemy, effects: [stone] } });
        expect(hitsOnYou(r.events)).toEqual([]);
        expect(r.state.enemyWords?.unbroken).toBeUndefined();
    });

    it('the wall math shows the payout only while WARD stands', () => {
        const s = yourTurn(armed([RIPOSTE]), ['su-hit-30']);
        expect(threatHits(s)).toEqual([4, 4]);
        expect(threatHits(play(s, 'h0').state)).toEqual([]);
    });
});
