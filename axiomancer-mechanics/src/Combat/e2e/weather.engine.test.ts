/**
 * Hermetic E2E — the weather (Phase EL1a, acceptance A1 and A2).
 *
 * Pins the Elementalist's elements to T's rulings of 2026-10-24
 * (`plan/README.md`, Sources):
 *   · INFERNO burns both sides: the foe its whole INFERNO at the start of its
 *     turn, you half of it (rounded down) at the start of yours; plain loss,
 *     and yours can kill you. A foe-only line burns only the foe.
 *   · BLIZZARD takes n off each foe hit; FROZEN when the BLIZZARD is at least
 *     every hit: the next DEAL is doubled, then FROZEN ends and BLIZZARD stays.
 *   · STORM: the foe loses n at the start of its turn, then it grows by 1
 *     (a STORM-growth Global in play adds its own).
 *   · Drift: INFERNO and BLIZZARD drop by 1 each round after the round they
 *     were applied in; STORM never drifts. Stacks add.
 *   · DRAW n draws n now, emitting `hand-drawn`.
 * And the program verbs, the reads, the events and the witness's values.
 *
 * The cards here are synthetic test cards in the sandbox registry; the
 * Elementalist trial set itself lands in EL1c.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx, ProgramQuery } from '../../Cards/card-program.types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, threatHits,
    projectIncomingThreat, PROGRAM_KIT,
} from '../combat.engine';
import { programLineValue } from '../combat.card-program';
import { driftElements, foeInferno, initElementState, yourInferno, type ElementState } from '../combat.elements';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

let lastQuery: ProgramQuery | null = null;

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A weather test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('wx-inferno', c => c.inferno(3), c => c.inferno(4, 'foe')),
    card('wx-inferno-self', c => c.inferno(2, 'self')),
    card('wx-blizzard', c => c.blizzard(3)),
    card('wx-storm', c => c.storm(2), c => c.triggerStorm()),
    card('wx-strike', c => { c.deal(5, { exact: true }); }, c => { c.deal(0, { plus: c.q.storm }); }),
    card('wx-draw', c => c.draw(2)),
    card('wx-relieve', c => { c.removeYourInferno(); }, c => { c.moveYourInferno('half'); }),
    card('wx-move-all', c => { c.moveYourInferno('all'); }),
    card('wx-spend', c => { c.spendBlizzard(); }, c => c.doubleBlizzardAndStorm()),
    card('wx-swap', c => c.swapElements()),
    card('wx-read', c => { lastQuery = c.q; }),
    {
        id: 'wx-gale', name: 'wx-gale', color: 'any', description: 'A weather test Global.',
        tier: 1, rank: 1, cardType: 'global', targetType: 'self',
        program: { global: {
            trigger: 'turn', text: 'TEST.', stormGrowth: 1,
            free: c => c.stormGrowthMarker(1), paid: c => c.stormGrowthMarker(1),
        } },
    },
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

function fight(hand: string[], vitae = 100): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill('wx-read')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: Math.max(vitae, s.player.maxHealth) },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const withWeather = (s: CombatEncounterState, patch: Partial<ElementState>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, el: { ...s.program!.el, ...patch } } });

const playT = (s: CombatEncounterState, uid: string, paid: boolean) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined);
const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState => playT(s, uid, paid).state;

/** The foe's turn (and the round boundary), then your next turn start. */
function nextRound(s: CombatEncounterState) {
    const foe = resolveThreatPhase(s);
    const start = startTurn(foe.state);
    return { afterFoe: foe.state, afterStart: start.state, foeEvents: foe.events, startEvents: start.events };
}

const el = (s: CombatEncounterState) => s.program!.el;
const weatherOf = (events: readonly CombatEvent[]) => events.filter(e => e.kind === 'weather-changed');

describe('INFERNO', () => {
    it('burns the foe in full at its turn start and you by half, rounded down, at yours', () => {
        const s = play(fight(['wx-inferno']), 't0', false);
        expect(foeInferno(el(s))).toBe(3);
        expect(yourInferno(el(s))).toBe(1);
        const r = nextRound(s);
        expect(s.enemy.health - r.afterFoe.enemy.health).toBe(3);
        expect(r.afterFoe.player.health - r.afterStart.player.health).toBe(1);
        expect(r.foeEvents).toContainEqual({ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 3, target: 'enemy' });
        expect(r.startEvents).toContainEqual({ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 1, target: 'self' });
    });

    it('drifts down by 1 each round after the round it was applied in', () => {
        let s = play(fight(['wx-inferno']), 't0', false);
        s = nextRound(s).afterStart;
        expect(foeInferno(el(s))).toBe(3);
        const r = nextRound(s);
        expect(foeInferno(el(r.afterStart))).toBe(2);
        expect(weatherOf(r.foeEvents)).toContainEqual({ kind: 'weather-changed', element: 'foe-inferno', from: 3, to: 2 });
    });

    it('a foe-only line burns only the foe; a self line burns only you, in full; stacks add', () => {
        let s = fight(['wx-inferno', 'wx-inferno', 'wx-inferno-self']);
        s = play(s, 't0', true);
        s = play(s, 't1', true);
        expect(el(s).infFoe).toBe(8);
        expect(yourInferno(el(s))).toBe(0);
        s = play(s, 't2', false);
        expect(yourInferno(el(s))).toBe(2);
        expect(foeInferno(el(s))).toBe(8);
    });

    it('your INFERNO can kill you at the start of your turn', () => {
        const s = withWeather({ ...fight([], 3), guard: 999 }, { infShared: 10 });
        const afterFoe = resolveThreatPhase(s).state;
        expect(afterFoe.player.health).toBe(3);
        const afterStart = startTurn(afterFoe).state;
        expect(afterStart.finalOutcome).toBe('defeat');
    });

    it('remove and move: your INFERNO goes onto the foe', () => {
        const s = withWeather(fight(['wx-relieve', 'wx-relieve', 'wx-move-all']), { infShared: 6, infSelf: 2 });
        expect(yourInferno(el(s))).toBe(5);
        const removed = play(s, 't0', false);
        expect(yourInferno(el(removed))).toBe(0);
        expect(foeInferno(el(removed))).toBe(6);
        const half = play(s, 't1', true);
        expect(yourInferno(el(half))).toBe(3);
        expect(foeInferno(el(half))).toBe(6 + 2);
        const all = play(s, 't2', false);
        expect(yourInferno(el(all))).toBe(0);
        expect(foeInferno(el(all))).toBe(6 + 5);
    });
});

describe('BLIZZARD and FROZEN', () => {
    it('takes n off each hit, and FROZEN doubles the next DEAL then ends; BLIZZARD stays', () => {
        const s0 = fight(['wx-strike', 'wx-strike']);
        const hits = threatHits(s0);
        expect(hits.length).toBeGreaterThan(0);
        const s = withWeather(s0, { blizzard: Math.max(...hits) });
        expect(projectIncomingThreat(s).netDamage).toBe(0);
        const foe = resolveThreatPhase(s);
        expect(foe.state.player.health).toBe(s.player.health);
        expect(el(foe.state).frozen).toBe(true);
        expect(foe.events).toContainEqual({ kind: 'weather-changed', element: 'frozen', from: 0, to: 1 });
        expect(foe.events.some(e => e.kind === 'blizzard-softened' && e.amount > 0)).toBe(true);
        const t = startTurn(foe.state).state;
        const strikes = t.hand.filter(h => h.cardId === 'wx-strike');
        const once = playT(t, strikes[0]!.uid, false);
        expect(t.enemy.health - once.state.enemy.health).toBe(10);
        expect(el(once.state).frozen).toBe(false);
        expect(once.events).toContainEqual({ kind: 'weather-changed', element: 'frozen', from: 1, to: 0 });
        expect(el(once.state).blizzard).toBeGreaterThan(0);
        const twice = play(once.state, strikes[1]!.uid, false);
        expect(once.state.enemy.health - twice.enemy.health).toBe(5);
    });

    it('a BLIZZARD below the foe hit softens it without FROZEN', () => {
        const s0 = fight([]);
        const big = Math.max(...threatHits(s0));
        const s = withWeather(s0, { blizzard: big - 1 });
        const after = resolveThreatPhase(s).state;
        expect(el(after).frozen).toBe(false);
        expect(s.player.health - after.player.health).toBe(threatHits(s0).reduce((a, h) => a + Math.max(0, h - (big - 1)), 0));
    });

    it('drifts down by 1 a round after the round it was applied in', () => {
        let s = play(fight(['wx-blizzard']), 't0', false);
        expect(el(s).blizzard).toBe(3);
        s = nextRound(s).afterStart;
        expect(el(s).blizzard).toBe(3);
        s = nextRound(s).afterStart;
        expect(el(s).blizzard).toBe(2);
    });

    it('spend and double', () => {
        const s = withWeather(fight(['wx-spend', 'wx-spend']), { blizzard: 4, storm: 3 });
        const spent = play(s, 't0', false);
        expect(el(spent).blizzard).toBe(0);
        const doubled = play(s, 't1', true);
        expect([el(doubled).blizzard, el(doubled).storm]).toEqual([8, 6]);
    });
});

describe('STORM', () => {
    it('the foe loses its STORM at its turn start, then the STORM grows by 1; it never drifts', () => {
        const s = play(fight(['wx-storm']), 't0', false);
        const r = nextRound(s);
        expect(s.enemy.health - r.afterFoe.enemy.health).toBe(2);
        expect(el(r.afterFoe).storm).toBe(3);
        expect(r.foeEvents).toContainEqual({ kind: 'weather-changed', element: 'storm', from: 2, to: 3 });
        const r2 = nextRound(r.afterStart);
        expect(el(r2.afterStart).storm).toBe(4);
    });

    it('a STORM-growth Global in play adds its growth', () => {
        const s = play(withWeather(fight(['wx-gale']), { storm: 2 }), 't0', true);
        expect(el(nextRound(s).afterFoe).storm).toBe(4);
    });

    it('trigger: the foe takes its STORM now and the STORM does not grow', () => {
        const s = withWeather(fight(['wx-storm']), { storm: 5 });
        const after = play(s, 't0', true);
        expect(s.enemy.health - after.enemy.health).toBe(5);
        expect(el(after).storm).toBe(5);
    });

    it('a line reading the STORM reads it unscaled', () => {
        const s = withWeather(fight(['wx-strike']), { storm: 7 });
        const after = play(s, 't0', true);
        expect(s.enemy.health - after.enemy.health).toBe(7);
    });
});

describe('swap, DRAW and the reads', () => {
    it('swap trades two elements\' numbers, the pair the witness picks', () => {
        const s = withWeather(fight(['wx-swap']), { infFoe: 6, storm: 1 });
        const after = play(s, 't0', false);
        expect([foeInferno(el(after)), el(after).storm]).toEqual([1, 6]);
    });

    it('DRAW n puts n more cards in hand now and emits hand-drawn', () => {
        const s = fight(['wx-draw']);
        const r = playT(s, 't0', false);
        expect(r.state.hand).toHaveLength(2);
        expect(r.events.some(e => e.kind === 'hand-drawn' && e.cards.length === 2)).toBe(true);
    });

    it('a line reads the foe\'s and your INFERNO, BLIZZARD, STORM, FROZEN, elements and hand size', () => {
        const s = withWeather(fight(['wx-read', 'wx-read', 'wx-read']), { infShared: 5, blizzard: 2, storm: 0, frozen: true });
        play(s, 't0', false);
        expect(lastQuery).toMatchObject({
            foeInferno: 5, yourInferno: 2, blizzard: 2, storm: 0, frozen: true, elementsOnFoe: 2, handSize: 2,
        });
    });
});

describe('the witness values the weather', () => {
    it('an INFERNO that would burn you to death is worth less than nothing', () => {
        const safe = fight(['wx-inferno'], 100);
        expect(programLineValue(safe, 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        const dying = withWeather(fight(['wx-inferno'], 2), { infShared: 2 });
        expect(programLineValue(dying, 't0', false, PROGRAM_KIT)).toBeLessThan(0);
    });

    it('BLIZZARD, STORM, DRAW and relief are worth something', () => {
        const s = withWeather(fight(['wx-blizzard', 'wx-storm', 'wx-draw', 'wx-relieve']), { infShared: 6 });
        for (const uid of ['t0', 't1', 't2', 't3']) {
            expect(programLineValue(s, uid, false, PROGRAM_KIT)).toBeGreaterThan(0);
        }
    });
});

describe('projectIncomingThreat.blizzardCut (phase BC1, A3)', () => {
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    /** The current phase, rewritten to strike with the given printed hits. */
    const withHits = (s: CombatEncounterState, damages: number[]): CombatEncounterState => {
        const idx = Math.min(s.currentPhaseIndex, s.threatPhases.length - 1);
        const phases = s.threatPhases.map((p, i) => i !== idx ? p : {
            ...p, threatAction: { ...p.threatAction, effects: damages.map(damage => ({ damage })) },
        });
        return { ...s, threatPhases: phases } as CombatEncounterState;
    };
    const softened = (s: CombatEncounterState) => sum(resolveThreatPhase(s).events
        .flatMap(e => e.kind === 'blizzard-softened' ? [e.amount] : []));

    it('is 0 with no BLIZZARD, and projectedDamage is unchanged', () => {
        const s = fight([]);
        const p = projectIncomingThreat(s);
        expect(p.blizzardCut).toBe(0);
        expect(p.projectedDamage).toBe(projectIncomingThreat(withWeather(s, { blizzard: 0 })).projectedDamage);
        expect(softened(s)).toBe(0);
    });

    it('below a hit, above a hit and over two hits: projected + cut is the hits, and the cut is what the engine softens', () => {
        const one = fight([]);
        const big = Math.max(...threatHits(one));
        const two = withHits(fight([]), [10, 4]);
        const cases: Array<[CombatEncounterState, number]> = [
            [one, big - 1], [one, big + 3], [two, Math.max(...threatHits(two)) - 1], [two, 1],
        ];
        for (const [base, blizzard] of cases) {
            const s = withWeather(base, { blizzard });
            const p = projectIncomingThreat(s);
            const hits = threatHits(s);
            expect(p.blizzardCut).toBe(sum(hits.map(h => Math.min(h, blizzard))));
            expect(p.projectedDamage + p.blizzardCut).toBe(sum(hits));
            expect(p.blizzardCut).toBe(softened(s));
        }
        expect(threatHits(two)).toHaveLength(2);
    });

    it('is 0 when the foe is denied its turn', () => {
        const base = fight([]);
        const petrified = {
            ...base,
            enemy: { ...base.enemy, effects: [{ effectId: 'debuff_petrify', remainingDuration: 1, intensity: 1, appliedAt: 0, tier: 3 }] },
        } as CombatEncounterState;
        const p = projectIncomingThreat(withWeather(petrified, { blizzard: 5 }));
        expect(p.willDeny).toBe(true);
        expect(p.blizzardCut).toBe(0);
        expect(p.projectedDamage).toBe(0);
    });
});

describe('the weather module', () => {
    it('an element at 0 is gone; drift reads "up when the round began"', () => {
        const fresh = { ...initElementState(), blizzard: 2 };
        const once = driftElements(fresh);
        expect(once.blizzard).toBe(2);
        expect(driftElements(once).blizzard).toBe(1);
        expect(driftElements(driftElements(driftElements(once))).blizzard).toBe(0);
    });

    it('no weather, no weather events: a plain fight emits none', () => {
        const s = fight(['wx-read']);
        const r = nextRound(play(s, 't0', false));
        expect(weatherOf([...r.foeEvents, ...r.startEvents])).toEqual([]);
        expect(r.foeEvents.some(e => e.kind === 'blizzard-softened')).toBe(false);
    });
});
