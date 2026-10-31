/**
 * The telegraph shows a kind (phase EN1c, A4 and A5): a `phases` foe's intent,
 * next preview, wall math and reveal headers carry a kind and a name and no
 * number; a DANGER is named only once the player has seen it fire (phase EN2a).
 */

import { describe, expect, it } from '@jest/globals';
import {
    getThreatSequence, rollEncounterDice, type CombatEncounterState, type Enemy,
} from '@mechanics';

import {
    buildCombatViewModel, NO_DANGERS_SEEN, revealDangers, selectCombatLogHistory, telegraphName, threatPhaseHeader,
    UNSEEN_DANGER_LINE,
} from '../combat-encounter.engine';
import { REAL_BOSS_FIGHT_FIXTURE, realFightFixture, startRealFight } from '@/test-utils/realFight';

const DANGER_NAME = 'Gallows Toll';
const SEEN = new Set([DANGER_NAME]);

function phasesFight(): CombatEncounterState {
    const { combat } = startRealFight(
        realFightFixture({ level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        { deck: ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'], seed: 3 },
    );
    const s = rollEncounterDice(combat).state;
    const enemy: Enemy = {
        ...s.enemy, id: 'enemy-en1c-fixture', difficulty: 'normal', level: 2,
        health: 100, maxHealth: 100, keywords: undefined, stages: undefined,
        phases: [
            {
                moves: [
                    { name: 'Peck', kind: 'attack', text: 'It pecks for 7.', damage: 7 },
                    { name: 'Preen', kind: 'defend', text: 'It gains WARD 5.' },
                    { name: 'Croak', kind: 'status', text: 'Applies BLEED 3.', effectId: 'dot_bleed', intensity: 3, duration: 2 },
                    { name: 'Watch', kind: 'unknown', text: 'It watches.' },
                ],
            },
            {
                moves: [{ name: 'Rend', kind: 'attack', text: 'It rends for 12.', damage: 12 }],
                danger: { name: DANGER_NAME, kind: 'danger', text: 'The toll falls for 20.', damage: 20 },
            },
        ],
    };
    return { ...s, enemy, threatPhases: getThreatSequence(enemy), currentPhaseIndex: 0 };
}

const atIndex = (s: CombatEncounterState, i: number): CombatEncounterState => ({ ...s, currentPhaseIndex: i });

describe('a phases foe telegraphs a kind and a name, no number (A4)', () => {
    const s = phasesFight();

    it('walks the kinds ATTACK, DEFEND, STATUS and UNKNOWN with the move name', () => {
        const seen = [0, 1, 2, 3].map((i) => {
            const intent = buildCombatViewModel(atIndex(s, i)).enemy.intent;
            return [intent.type, intent.label, intent.moveName];
        });
        expect(seen).toEqual([
            ['attack', 'ATTACK', 'Peck'], ['defend', 'DEFEND', 'Preen'],
            ['status', 'STATUS', 'Croak'], ['unknown', 'UNKNOWN', 'Watch'],
        ]);
    });

    it('carries no damage, debuff flag or wall math, and no digit in the intent or next preview', () => {
        for (let i = 0; i < s.threatPhases.length; i++) {
            const intent = buildCombatViewModel(atIndex(s, i), SEEN).enemy.intent;
            expect(intent.damage).toBe(0);
            expect(intent.debuffs).toBe(false);
            expect(intent.wallMath).toEqual({
                projectedDamage: 0, netDamage: 0, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0,
            });
            expect(JSON.stringify([intent.label, intent.description, intent.moveName, intent.next])).not.toMatch(/\d/);
        }
    });

    it('previews the next move through the phase walker, and DANGER once a line is crossed', () => {
        expect(buildCombatViewModel(atIndex(s, 0)).enemy.intent.next?.moveName).toBe('Preen');
        const crossed = { ...atIndex(s, 3), enemy: { ...s.enemy, health: 20 } };
        expect(buildCombatViewModel(crossed).enemy.intent.next?.type).toBe('danger');
        // The last move of the opening loop wraps to its first, not off the list.
        expect(buildCombatViewModel(atIndex(s, 3)).enemy.intent.next?.moveName).toBe('Peck');
    });

    it('writes every reveal header without a figure', () => {
        for (const p of s.threatPhases) {
            const h = threatPhaseHeader(p, SEEN);
            expect(h.text.replace(/^PHASE \d+/, '')).not.toMatch(/\d/);
            expect(h.a11y.replace(/^Phase \d+/, '')).not.toMatch(/\d/);
        }
    });
});

describe('DANGER is named only once seen (A5)', () => {
    const s = phasesFight();
    const dangerIndex = s.threatPhases.findIndex((p) => p.enemyMove?.danger);

    it('shows the DANGER icon with no name until it has been seen, at fight start and as it fires', () => {
        const vm = buildCombatViewModel(s, NO_DANGERS_SEEN);
        expect(vm.enemy.dangers).toEqual([{ phase: 2, name: null }]);
        const firing = buildCombatViewModel(atIndex(s, dangerIndex), NO_DANGERS_SEEN).enemy.intent;
        expect(firing.type).toBe('danger');
        expect(firing.moveName).toBeNull();
        expect(firing.description).toBe('');
        expect(telegraphName(s.threatPhases[dangerIndex], NO_DANGERS_SEEN)).toBeNull();
        expect(threatPhaseHeader(s.threatPhases[dangerIndex], NO_DANGERS_SEEN).text).toBe(`PHASE ${dangerIndex + 1} · DANGER`);
        expect(JSON.stringify(vm.enemy.dangers)).not.toContain(DANGER_NAME);
    });

    it('names the DANGER once the save records it seen', () => {
        const vm = buildCombatViewModel(s, SEEN);
        expect(vm.enemy.dangers).toEqual([{ phase: 2, name: DANGER_NAME }]);
        expect(buildCombatViewModel(atIndex(s, dangerIndex), SEEN).enemy.intent.moveName).toBe(DANGER_NAME);
        expect(threatPhaseHeader(s.threatPhases[dangerIndex], SEEN).text).toBe(`PHASE ${dangerIndex + 1} · DANGER · ${DANGER_NAME}`);
    });

    it('lists no dangers for a foe without phases', () => {
        // The chapter boss keeps its deck (the Float-Eye at bw-w2 plays HP phases).
        const { combat } = startRealFight({ ...REAL_BOSS_FIGHT_FIXTURE, player: { level: 1 } }, { deck: ['grey-strike'], seed: 1 });
        expect(buildCombatViewModel(combat).enemy.dangers).toEqual([]);
    });

    it('lists the live Float-Eye\'s DANGER at bw-w2: unnamed until seen, then named', () => {
        const { combat } = startRealFight(realFightFixture({ level: 1 }), { deck: ['grey-strike'], seed: 1 });
        expect(buildCombatViewModel(combat, NO_DANGERS_SEEN).enemy.dangers).toEqual([{ phase: 2, name: null }]);
        expect(buildCombatViewModel(combat, new Set(['The Long Career'])).enemy.dangers).toEqual([{ phase: 2, name: 'The Long Career' }]);
    });
});

describe('the log names a DANGER from the moment it fires (A5)', () => {
    const s = phasesFight();
    const dangerIndex = s.threatPhases.findIndex((p) => p.enemyMove?.danger);
    const fired = (i: number): CombatEncounterState => ({
        ...s,
        log: [{
            kind: 'threat-fired', phaseIndex: s.threatPhases[i].index,
            description: s.threatPhases[i].threatAction.description, effects: s.threatPhases[i].threatAction.effects,
        }],
    });
    const texts = (st: CombatEncounterState): string[] => selectCombatLogHistory(st).map((l) => l.text);

    it('names a DANGER that fires, though it was never seen before', () => {
        expect(texts(fired(dangerIndex))[0]).toContain(DANGER_NAME);
    });

    it('never hides an ordinary move', () => {
        expect(texts(fired(0))[0]).toContain('Peck');
    });
});

describe('the reveal shows only the DANGER lines (EN2a, A2, A3, A4)', () => {
    const s = phasesFight();

    it('lists one line per DANGER, `[ ? ? ? ]` until seen and the name with its text after', () => {
        expect(revealDangers(s, NO_DANGERS_SEEN)).toEqual([{
            phase: 2, name: null, text: null, line: UNSEEN_DANGER_LINE,
            a11y: 'Danger, unknown. You have not seen this move yet.',
        }]);
        expect(revealDangers(s, SEEN)).toEqual([{
            phase: 2, name: DANGER_NAME, text: 'The toll falls for 20.',
            line: `${DANGER_NAME}: The toll falls for 20.`,
            a11y: `Danger, ${DANGER_NAME}. The toll falls for 20.`,
        }]);
    });

    it('shows no other move of the foe, seen or not', () => {
        const all = JSON.stringify([revealDangers(s, NO_DANGERS_SEEN), revealDangers(s, SEEN)]);
        for (const other of ['Peck', 'Preen', 'Croak', 'Watch', 'Rend']) expect(all).not.toContain(other);
    });

    it('lists two DANGERs of an elite in phase order, one seen and one not', () => {
        const dangerMove = (name: string) => ({ name, kind: 'danger' as const, text: `${name} text.` });
        const elite = {
            ...s,
            enemy: {
                ...s.enemy,
                phases: [
                    s.enemy.phases![0],
                    { moves: [{ name: 'A', kind: 'attack' as const, text: 'a' }], danger: dangerMove('First') },
                    { moves: [{ name: 'B', kind: 'attack' as const, text: 'b' }], danger: dangerMove('Second') },
                ],
            },
        };
        const lines = revealDangers(elite, new Set(['First']))!;
        expect(lines.map((l) => [l.phase, l.line])).toEqual([[2, 'First: First text.'], [3, UNSEEN_DANGER_LINE]]);
    });

    it('is null for a foe without phases, whose reveal is untouched', () => {
        const { combat } = startRealFight({ ...REAL_BOSS_FIGHT_FIXTURE, player: { level: 1 } }, { deck: ['grey-strike'], seed: 1 });
        const plain = { ...combat, enemy: { ...combat.enemy, phases: undefined } };
        expect(revealDangers(plain, SEEN)).toBeNull();
    });
});
