/**
 * Hermetic E2E — the spikes (Phase DF1a, acceptance A1 and A2).
 *
 * Pins the Defender's THORNS and REFLECT and the PAID random discard to T's
 * rulings of 2026-10-26 (`plan/phases/phase_DF1_defender_trial_set.md`,
 * Sources):
 *   · THORNS n: each foe strike deals n back, per strike; a DEAL (VULNERABLE
 *     applies, FROZEN doubles it); heart-scaled when applied; drops by 1 each
 *     round after the round it was applied in; stacks by adding.
 *   · REFLECT n%: each strike sends n% of its damage before GUARD back as a
 *     DEAL and never reduces the hit; lasts 2 turns; a new REFLECT adds its %
 *     and refreshes to 2 turns; no cap.
 *   · "Discard N cards at random": a PAID cost from the other cards in hand,
 *     seeded; a line that cannot pay is refused with no state change.
 * And the events (each trigger, drop and expiry) and the witness's values.
 *
 * The cards here are synthetic test cards in the sandbox registry; the
 * Defender trial set itself lands in DF1d.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import { deepClone } from '../../Utils';
import { setSeed } from '../../Utils/rng';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, threatHits,
    programLineBlock, programLineDiscardShortfall, PROGRAM_KIT,
} from '../combat.engine';
import { DISCARD_SHORTFALL_REASON, programLineValue } from '../combat.card-program';
import { scaleFor } from '../stat-scaling';
import { addReflect, driftSpikes, initSpikeState, spikeReturns, type SpikeState } from '../combat.spikes';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A spikes test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('sp-thorns', c => { c.thorns(3); }, c => { c.thorns(4, { exact: true }); }),
    card('sp-reflect', c => c.reflect(25), c => c.reflect(50)),
    card('sp-vuln', c => c.vulnerable(50, 3)),
    card('sp-discard', c => { c.guard(2, { exact: true }); }, c => { c.discardRandom(2); c.guard(6, { exact: true }); }),
    card('sp-discard-one', c => { c.guard(1, { exact: true }); }, c => { c.discardRandom(1); c.guard(5, { exact: true }); }),
    card('sp-filler', c => { c.guard(1, { exact: true }); }),
    {
        id: 'sp-curse', name: 'sp-curse', color: 'any', description: 'A spikes test Curse.',
        tier: 1, rank: 1, cardType: 'curse', targetType: 'self',
        program: { free: { text: 'TEST.', run: () => {} }, paid: { text: 'TEST.', run: () => {} } },
    },
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

function fight(hand: string[], foeVitae = 500): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: foeVitae, maxHealth: Math.max(foeVitae, 500) };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill('sp-filler')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: 100, maxHealth: Math.max(100, s.player.maxHealth) },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const withSpikes = (s: CombatEncounterState, patch: Partial<SpikeState>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, spikes: { ...s.program!.spikes, ...patch } } });

const playT = (s: CombatEncounterState, uid: string, paid: boolean) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined);
const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState => playT(s, uid, paid).state;

/** The foe's turn (and the round boundary), then your next turn start. */
function nextRound(s: CombatEncounterState) {
    const foe = resolveThreatPhase(s);
    const start = startTurn(foe.state);
    return { afterFoe: foe.state, afterStart: start.state, events: [...foe.events, ...start.events] };
}

const sp = (s: CombatEncounterState) => s.program!.spikes;
const struck = (events: readonly CombatEvent[], spike: 'thorns' | 'reflect') =>
    events.flatMap(e => e.kind === 'spike-struck' && e.spike === spike ? [e.amount] : []);
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe('THORNS', () => {
    it('is heart-scaled when applied, and exact adds the number as written; stacks add', () => {
        const s0 = fight(['sp-thorns', 'sp-thorns']);
        const scaled = scaleFor(3, s0.player.baseStats, 'heart', 'repeating');
        const once = playT(s0, 't0', false);
        expect(sp(once.state).thorns).toBe(scaled);
        expect(once.events).toContainEqual({ kind: 'spikes-changed', spike: 'thorns', from: 0, to: scaled });
        const twice = play(once.state, 't1', true);
        expect(sp(twice).thorns).toBe(scaled + 4);
    });

    it('deals its number back on each foe strike, as a spike-struck event per strike', () => {
        const s = withSpikes(fight([]), { thorns: 4 });
        const hits = threatHits(s);
        expect(hits.length).toBeGreaterThan(0);
        const foe = resolveThreatPhase(s);
        expect(struck(foe.events, 'thorns')).toEqual(hits.map(() => 4));
        expect(s.enemy.health - foe.state.enemy.health).toBe(4 * hits.length);
        expect(foe.state.directDamageDealt - s.directDamageDealt).toBe(4 * hits.length);
    });

    it('drops by 1 at each round boundary after the round it was applied in, emitting the drop', () => {
        let s = play(fight(['sp-thorns']), 't0', true);
        expect(sp(s).thorns).toBe(4);
        let r = nextRound(s);
        expect(sp(r.afterStart).thorns).toBe(4);
        r = nextRound(r.afterStart);
        expect(sp(r.afterStart).thorns).toBe(3);
        expect(r.events).toContainEqual({ kind: 'spikes-changed', spike: 'thorns', from: 4, to: 3 });
        s = r.afterStart;
        for (let i = 0; i < 3; i++) s = nextRound(s).afterStart;
        expect(sp(s).thorns).toBe(0);
    });

    it('is a DEAL: VULNERABLE raises it and a FROZEN foe takes the first hit doubled, then FROZEN ends', () => {
        const base = withSpikes(fight(['sp-vuln']), { thorns: 10 });
        const hits = threatHits(base).length;
        const vuln = play(base, 't0', false);
        const vulnHits = struck(resolveThreatPhase(vuln).events, 'thorns');
        expect(vulnHits.length).toBe(hits);
        expect(vulnHits[0]).toBeGreaterThan(10);

        const frozen = { ...base, program: { ...base.program!, el: { ...base.program!.el, frozen: true } } };
        const foe = resolveThreatPhase(frozen);
        const thorns = struck(foe.events, 'thorns');
        expect(thorns[0]).toBe(20);
        expect(thorns.slice(1)).toEqual(Array(hits - 1).fill(10));
        expect(foe.state.program!.el.frozen).toBe(false);
        expect(foe.events).toContainEqual({ kind: 'weather-changed', element: 'frozen', from: 1, to: 0 });
    });

    it('a foe the spikes defeat mid-attack strikes no more', () => {
        const s0 = withSpikes(fight([], 3), { thorns: 5 });
        const foe = resolveThreatPhase(s0);
        expect(foe.state.enemy.health).toBe(0);
        expect(struck(foe.events, 'thorns')).toEqual([5]);
    });
});

describe('REFLECT', () => {
    it('sends n% of each strike before GUARD back, and never reduces the hit', () => {
        const plain = fight([]);
        const hits = threatHits(plain);
        const base = resolveThreatPhase(plain).state;
        const s = withSpikes(plain, { reflect: 50, reflectTurns: 2 });
        const foe = resolveThreatPhase(s);
        expect(foe.state.player.health).toBe(base.player.health);
        expect(struck(foe.events, 'reflect')).toEqual(hits.map(h => Math.round(h * 0.5)));
    });

    it('10 damage against 100% REFLECT: both take 10 (every strike, no GUARD)', () => {
        expect(spikeReturns({ ...initSpikeState(), reflect: 100, reflectTurns: 2 }, 10)).toEqual([{ spike: 'reflect', amount: 10 }]);
        const s = withSpikes(fight([]), { reflect: 100, reflectTurns: 2 });
        const foe = resolveThreatPhase(s);
        const taken = s.player.health - foe.state.player.health;
        expect(taken).toBeGreaterThan(0);
        expect(sum(struck(foe.events, 'reflect'))).toBe(taken);
        expect(s.enemy.health - foe.state.enemy.health).toBe(taken);
    });

    it('reads the strike before GUARD: GUARD cuts your share, not the foe\'s', () => {
        const plain = fight([]);
        const hits = threatHits(plain);
        const s = { ...withSpikes(plain, { reflect: 100, reflectTurns: 2 }), guard: 1000 };
        const foe = resolveThreatPhase(s);
        expect(foe.state.player.health).toBe(s.player.health);
        expect(struck(foe.events, 'reflect')).toEqual(hits);
    });

    it("T's worked example: 25% with 1 turn left, +50% = 75% for 2; a turn later, +25% = 100% for 2", () => {
        let r: SpikeState = { ...initSpikeState(), reflect: 25, reflectTurns: 1 };
        r = addReflect(r, 50);
        expect([r.reflect, r.reflectTurns]).toEqual([75, 2]);
        r = driftSpikes(r);
        expect([r.reflect, r.reflectTurns]).toEqual([75, 1]);
        r = addReflect(r, 25);
        expect([r.reflect, r.reflectTurns]).toEqual([100, 2]);
    });

    it('lasts 2 rounds from a play, then expires with an event; no cap on the %', () => {
        let s = play(fight(['sp-reflect', 'sp-reflect']), 't0', true);
        expect([sp(s).reflect, sp(s).reflectTurns]).toEqual([50, 2]);
        s = play(s, 't1', true);
        expect(sp(s).reflect).toBe(100);
        let r = nextRound(s);
        expect(struck(r.events, 'reflect').length).toBeGreaterThan(0);
        expect([sp(r.afterStart).reflect, sp(r.afterStart).reflectTurns]).toEqual([100, 1]);
        r = nextRound(r.afterStart);
        expect(struck(r.events, 'reflect').length).toBeGreaterThan(0);
        expect([sp(r.afterStart).reflect, sp(r.afterStart).reflectTurns]).toEqual([0, 0]);
        expect(r.events).toContainEqual({ kind: 'spikes-changed', spike: 'reflect', from: 100, to: 0 });
        expect(r.events).toContainEqual({ kind: 'spikes-changed', spike: 'reflect-turns', from: 1, to: 0 });
        expect(struck(nextRound(r.afterStart).events, 'reflect')).toEqual([]);
    });
});

describe('the PAID random discard', () => {
    it('discards n of the other cards in hand at random before the effects, seeded', () => {
        const s0 = fight(['sp-discard', 'sp-filler', 'sp-filler', 'sp-thorns']);
        setSeed(11);
        const a = playT(s0, 't0', true);
        setSeed(11);
        const b = playT(s0, 't0', true);
        expect(a.state.hand.length).toBe(1);
        expect(a.state.hand.some(h => h.uid === 't0')).toBe(false);
        expect(a.state.guard).toBe(6);
        const gone = a.events.find(e => e.kind === 'cards-discarded');
        expect(gone).toBeDefined();
        expect(gone!.kind === 'cards-discarded' && gone!.cardIds.length).toBe(2);
        expect(a.state.discard.slice(-3)).toEqual([...(gone!.kind === 'cards-discarded' ? gone!.cardIds : []), 'sp-discard']);
        expect(b.state.hand).toEqual(a.state.hand);
    });

    it('a line that cannot pay is refused at the engine: no state change, the refusal names the shortfall', () => {
        const s0 = fight(['sp-discard', 'sp-filler']);
        expect(programLineBlock(s0, 't0', true)).toBe(DISCARD_SHORTFALL_REASON);
        expect(programLineDiscardShortfall(s0, 't0', true)).toEqual({ discard: 2, held: 1 });
        expect(programLineBlock(s0, 't0', false)).toBeNull();
        expect(programLineDiscardShortfall(s0, 't0', false)).toBeNull();
        const r = playT(s0, 't0', true);
        expect({ ...r.state, log: s0.log }).toEqual({ ...s0, dice: [{ ...WILD }] });
        expect(r.events).toEqual([{
            kind: 'effect-fizzled', cardId: 'sp-discard', effectId: '',
            message: `${DISCARD_SHORTFALL_REASON}: it discards 2, you hold 1`,
        }]);
        expect(play(s0, 't0', false).guard).toBe(2);
    });

    it('a PAID discard with no other card in hand is refused (P-07); its FREE line plays', () => {
        const s0 = fight(['sp-discard-one']);
        expect(programLineDiscardShortfall(s0, 't0', true)).toEqual({ discard: 1, held: 0 });
        expect(play(s0, 't0', false).guard).toBe(1);
    });

    it('a Curse is never discarded at random, and does not count toward paying', () => {
        const s0 = fight(['sp-discard-one', 'sp-curse']);
        expect(programLineDiscardShortfall(s0, 't0', true)).toEqual({ discard: 1, held: 0 });
        const s1 = fight(['sp-discard-one', 'sp-curse', 'sp-filler']);
        const after = play(s1, 't0', true);
        expect(after.hand.map(h => h.cardId)).toEqual(['sp-curse']);
    });
});

describe('the witness values the spikes', () => {
    it('values THORNS and REFLECT against the telegraphed strikes, and a discard as a cost', () => {
        const s = fight(['sp-thorns', 'sp-reflect', 'sp-discard', 'sp-filler', 'sp-filler']);
        expect(programLineValue(s, 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(s, 't1', true, PROGRAM_KIT)).toBeGreaterThan(programLineValue(s, 't1', false, PROGRAM_KIT));
        const withCost = programLineValue(s, 't2', true, PROGRAM_KIT);
        expect(withCost).toBeLessThan(6);
    });
});
