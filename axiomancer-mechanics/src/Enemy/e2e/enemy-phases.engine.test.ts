/**
 * Hermetic E2E — HP phases (phase EN1a): lines per tier, one change per
 * boundary, DANGER on every change and only then, a fixed loop per phase,
 * and no escalation clock for a normal or elite foe that declares `phases`.
 *
 * A fixture foe carries the model; no live foe declares `phases` yet.
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy, EnemyDifficulty, EnemyPhase } from '../types';
import { DeathBeholder, FloatEye } from '../enemy.library';
import { deepClone } from '../../Utils';
import {
    createEnemy, PHASE_LINES, PHASES_AUTHORED_LEVEL, enemyPhaseTier, escalationApplies,
} from '..';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import {
    initializeCombatEncounter, rollEncounterDice, resolveThreatPhase,
    projectIncomingThreat, threatHits,
} from '../../Combat/combat.engine';
import { getThreatSequence, nextEnemyPhaseIndex, scaleMoveNumber } from '../../Combat/combat.threat';
import { TIER2_DEFAULT_ROUND, TIER3_DEFAULT_ROUND } from '../../Combat/combat.enemy-decks';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1a-free', name: 'QA Phases', color: 'body',
        description: 'phases fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1a-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 5000; p.maxHealth = 5000;
    p.effects = [];
    return p;
}

/** A fixture phase list: phase i plays `p<i>-m0..m2` (damage 3, 4, 5) and
 *  enters through `danger-<i>` (damage 9). */
function fixturePhases(count: number): EnemyPhase[] {
    return Array.from({ length: count }, (_u, i) => ({
        moves: [0, 1, 2].map(k => ({
            name: `p${i}-m${k}`, kind: 'attack' as const, text: 'fixture move', damage: 3 + k,
        })),
        danger: { name: `danger-${i}`, kind: 'danger' as const, text: 'fixture danger', damage: 9 },
    }));
}

const PHASE_COUNT: Record<'normal' | 'elite' | 'boss', number> = { normal: 2, elite: 3, boss: 4 };

function phasedFoe(difficulty: EnemyDifficulty, phases?: EnemyPhase[]): Enemy {
    const e = deepClone(FloatEye);
    const tier = enemyPhaseTier(difficulty);
    return {
        ...e,
        id: `enemy-en1a-${difficulty}`,
        difficulty,
        // At the authored level the numbers land as authored.
        level: PHASES_AUTHORED_LEVEL[tier],
        health: 1000, maxHealth: 1000, effects: [],
        keywords: undefined, stages: undefined,
        phases: phases ?? fixturePhases(PHASE_COUNT[tier]),
    };
}

function open(enemy: Enemy): CombatEncounterState {
    const s = initializeCombatEncounter(makePlayer(), enemy, DECK, 7);
    return rollEncounterDice(s, rng).state;
}

/** The move the foe telegraphs right now. */
function moveName(s: CombatEncounterState): string {
    return s.threatPhases[s.currentPhaseIndex].enemyMove?.name ?? '<none>';
}

/** Sets the foe's VITAE, then runs one foe turn and its boundary. */
function boundary(s: CombatEncounterState, health?: number): CombatEncounterState {
    const enemy = health === undefined ? s.enemy : { ...s.enemy, health };
    return resolveThreatPhase({ ...s, enemy }, rng).state;
}

describe('A1 — phase lines per tier', () => {
    it('declares the tier lines D116 names', () => {
        expect(PHASE_LINES.normal).toEqual([0.3]);
        expect(PHASE_LINES.elite).toEqual([0.6, 0.3]);
        expect(PHASE_LINES.boss).toEqual([0.75, 0.5, 0.25]);
    });

    for (const difficulty of ['normal', 'elite', 'boss'] as const) {
        it(`a ${difficulty} changes phase at each of its lines, through its DANGER`, () => {
            let s = open(phasedFoe(difficulty));
            expect(moveName(s)).toBe('p0-m0');
            PHASE_LINES[difficulty].forEach((line, i) => {
                const phase = i + 1;
                // Just above the line: no change.
                s = boundary(s, Math.round(line * 1000) + 1);
                expect(s.threatPhases[s.currentPhaseIndex].enemyMove?.phase).toBe(phase - 1);
                // On the line: the next move is the change's DANGER.
                s = boundary(s, Math.round(line * 1000));
                expect(moveName(s)).toBe(`danger-${phase}`);
                // After the DANGER the new phase's loop starts at its first move.
                s = boundary(s);
                expect(moveName(s)).toBe(`p${phase}-m0`);
            });
        });
    }

    it('a hit that crosses two lines changes one phase now and the next at the following boundary', () => {
        let s = open(phasedFoe('elite'));
        const res = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: 100 } }, rng);
        s = res.state;
        expect(moveName(s)).toBe('danger-1');
        expect(res.events.filter(e => e.kind === 'enemy-phase-entered'))
            .toEqual([{ kind: 'enemy-phase-entered', enemyId: s.enemy.id, phase: 1, danger: 'danger-1' }]);
        s = boundary(s);
        expect(moveName(s)).toBe('danger-2');
        s = boundary(s);
        expect(moveName(s)).toBe('p2-m0');
    });

    it('a boss crossing every line in one hit takes three boundaries to reach its last phase', () => {
        let s = open(phasedFoe('boss'));
        const seen: string[] = [];
        s = boundary(s, 50);
        for (let i = 0; i < 6; i++) { seen.push(moveName(s)); s = boundary(s); }
        expect(seen).toEqual(['danger-1', 'danger-2', 'danger-3', 'p3-m0', 'p3-m1', 'p3-m2']);
    });

    it('DANGER resolves on each change and at no other time', () => {
        let s = open(phasedFoe('normal'));
        const played: string[] = [moveName(s)];
        let entered = 0;
        for (let i = 0; i < 12; i++) {
            const res = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: i < 5 ? 1000 : 250 } }, rng);
            entered += res.events.filter(e => e.kind === 'enemy-phase-entered').length;
            s = res.state;
            played.push(moveName(s));
        }
        expect(played.filter(n => n.startsWith('danger-'))).toEqual(['danger-1']);
        expect(entered).toBe(1);
        // The DANGER's damage resolves on the player when it is played.
        const atDanger = played.indexOf('danger-1');
        let t = open(phasedFoe('normal'));
        for (let i = 0; i < atDanger; i++) t = boundary(t, i < 5 ? 1000 : 250);
        expect(moveName(t)).toBe('danger-1');
        const before = t.player.health;
        t = boundary(t);
        expect(before - t.player.health).toBe(9);
    });

    it('a MEND back above a line does not revert the phase', () => {
        let s = open(phasedFoe('normal'));
        s = boundary(s, 300);
        expect(moveName(s)).toBe('danger-1');
        s = boundary(s, 1000);
        expect(moveName(s)).toBe('p1-m0');
        s = boundary(s, 1000);
        expect(moveName(s)).toBe('p1-m1');
    });
});

describe('A2 — a fixed loop per phase', () => {
    it('plays the phase moves in order, repeating, past every round gate', () => {
        let s = open(phasedFoe('normal'));
        const played: string[] = [];
        for (let i = 0; i < 9; i++) { played.push(moveName(s)); s = boundary(s); }
        expect(played).toEqual(['p0-m0', 'p0-m1', 'p0-m2', 'p0-m0', 'p0-m1', 'p0-m2', 'p0-m0', 'p0-m1', 'p0-m2']);
        expect(s.round).toBeGreaterThan(TIER3_DEFAULT_ROUND);
        expect(TIER2_DEFAULT_ROUND).toBeLessThan(s.round);
    });

    it('never round-gates, branches or stakes a phases entry, and never repeats the last card', () => {
        const seq = getThreatSequence(phasedFoe('elite'));
        expect(seq.every(p => p.unlockAfterRound === undefined && !p.branch && !p.stake)).toBe(true);
        expect(seq.every(p => p.enemyMove !== undefined)).toBe(true);
        // Last move of the last phase wraps to that phase's first, not itself.
        const last = seq.length - 1;
        const next = nextEnemyPhaseIndex(seq, last, { ...phasedFoe('elite'), health: 100 });
        expect(seq[next as number].enemyMove?.name).toBe('p2-m0');
    });

    it('lays out phase 0 loop, then each phase as DANGER followed by its loop', () => {
        const names = getThreatSequence(phasedFoe('normal')).map(p => p.enemyMove?.name);
        expect(names).toEqual(['p0-m0', 'p0-m1', 'p0-m2', 'danger-1', 'p1-m0', 'p1-m1', 'p1-m2']);
        const kinds = getThreatSequence(phasedFoe('normal')).map(p => p.enemyMove?.kind);
        expect(kinds[3]).toBe('danger');
    });

    it('a foe with no phases keeps the deck path unchanged', () => {
        const foe: Enemy = { ...deepClone(DeathBeholder), health: 1000, maxHealth: 1000, effects: [] };
        const seq = getThreatSequence(foe);
        expect(seq.some(p => p.enemyMove !== undefined)).toBe(false);
        // The contrast: the same call on a phases foe walks the phase model.
        expect(getThreatSequence(phasedFoe('normal')).every(p => p.enemyMove !== undefined)).toBe(true);
        expect(nextEnemyPhaseIndex(seq, 0, foe)).toBeNull();
        let s = open(foe);
        const gate = s.threatPhases[1]?.unlockAfterRound;
        s = boundary(s);
        const expected = gate !== undefined && 2 < gate ? 0 : Math.min(1, s.threatPhases.length - 1);
        expect(s.currentPhaseIndex).toBe(expected);
    });

    it('a phases foe enters no stage, and createEnemy gives it none', () => {
        const staged = { ...phasedFoe('boss'), stages: [{ at: { vitaePct: 0.99 }, name: 'X', text: 'x', heal: 50 }] };
        const s = boundary(open(staged), 900);
        expect(s.stagesEntered ?? []).toEqual([]);
        const made = createEnemy({
            id: 'enemy-en1a-made', name: 'Made', description: 'fixture', level: 2,
            baseStats: { heart: 1, body: 1, mind: 1 }, mapName: FloatEye.mapName, logic: 'balanced',
            difficulty: 'boss', phases: fixturePhases(4),
        });
        expect(made.stages).toEqual([]);
        expect(made.phases).toHaveLength(4);
    });
});

describe('A3 — no escalation clock for a normal or elite phases foe', () => {
    const LATE = 8;

    for (const difficulty of ['normal', 'elite'] as const) {
        it(`a ${difficulty} with phases hits for its printed number late in the fight`, () => {
            const foe = phasedFoe(difficulty);
            expect(escalationApplies(foe)).toBe(false);
            const s = { ...open(foe), round: LATE };
            expect(threatHits(s)).toEqual([3]);
            expect(projectIncomingThreat(s).projectedDamage).toBe(3);
            const after = resolveThreatPhase(s, rng).state;
            expect(s.player.health - after.player.health).toBe(3);
        });
    }

    it('a boss with phases keeps the clock', () => {
        const foe = phasedFoe('boss');
        expect(escalationApplies(foe)).toBe(true);
        const s = { ...open(foe), round: LATE };
        expect(threatHits(s)[0]).toBeGreaterThan(3);
        expect(projectIncomingThreat(s).projectedDamage).toBeGreaterThan(3);
    });

    it('a foe without phases keeps the clock', () => {
        const foe: Enemy = { ...deepClone(DeathBeholder), health: 1000, maxHealth: 1000, effects: [] };
        expect(escalationApplies(foe)).toBe(true);
        const early = open(foe);
        const late = { ...early, round: LATE };
        const raw = early.threatPhases[0].threatAction.effects.find(e => (e.damage ?? 0) > 0)?.damage ?? 0;
        expect(raw).toBeGreaterThan(0);
        expect(threatHits(late)[0]).toBeGreaterThan(threatHits(early)[0]);
    });
});

describe('move numbers scale with level', () => {
    it('lands as authored at the authored level and grows with level', () => {
        expect(scaleMoveNumber(6, 2, 2)).toBe(6);
        expect(scaleMoveNumber(6, 6, 2)).toBeGreaterThan(6);
        expect(scaleMoveNumber(1, 1, 3)).toBe(1);
        expect(scaleMoveNumber(0, 9, 2)).toBe(0);
        const atL6 = getThreatSequence({ ...phasedFoe('normal'), level: 6 });
        expect(atL6[0].threatAction.effects[0].damage).toBe(scaleMoveNumber(3, 6, 2));
    });
});
