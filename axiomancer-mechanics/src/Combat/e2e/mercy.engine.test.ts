/**
 * Hermetic E2E — MERCY and RADIANCE (Phase MF1a, acceptance A1, A2 and A3).
 *
 * Pins the Merciful's engine to T's rulings of 2026-10-29 and 2026-10-30
 * (`plan/phases/phase_MF1_merciful_trial_set.md`, Sources):
 *   · RADIANCE N: HEAL N (heart-scaled), then DEAL what that heal restored
 *     (0 at full VITAE); the hit is a DEAL (VULNERABLE, FROZEN apply).
 *   · MERCY N: heal the foe N, stopping at its max VITAE, and add N to its
 *     MERCY total whatever the heal restored. The first MERCY starts a 3-turn
 *     clock; a new MERCY never resets it. When it runs out, at the start of the
 *     foe's turn, the MERCY bursts: a DEAL of twice the total. Then the total
 *     clears and the next MERCY starts a fresh clock.
 *   · YIELDING: the foe's befriend gate reads open whatever its VITAE.
 * And the events (each RADIANCE, add, tick and burst) and the witness's values.
 *
 * The cards here are synthetic test cards in the sandbox registry; the
 * Merciful trial set itself lands in MF1d.
 *
 * guard-test: the `edges` describe block pins the MERCY and RADIANCE mutation survivors PR #1110 left, behaviour already on main; this PR's own change (dropping two `amt <= 0` checks a positive `n` already made unreachable) is behaviour-identical, so every new case passes unchanged on the parent by design
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye, GreenJelly, Sandbag_01 } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, playSignatureSkill,
    PROGRAM_KIT,
} from '../combat.engine';
import { getSignatureSkill, signatureCastBlock } from '../combat.signature';
import { initProgramLedger, programFoeYielding, programLineValue, programMercyFoeTurnStart } from '../combat.card-program';
import { getDamageTakenMultiplier } from '../effects';
import { scaleFor } from '../stat-scaling';
import { buildCombatSummary } from '../combat.attribution';
import {
    addMercy, initMercyState, mercyReading, mercyTickEvent, tickMercyClock, MERCY_CLOCK_TURNS, type MercyState,
} from '../combat.mercy';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const OPEN_HAND = 'sig-disarming-plea';

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A mercy test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('mt-radiance-5', c => { c.radiance(5); }),
    card('mt-radiance-3', c => { c.radiance(3); }),
    card('mt-radiance-10', c => { c.radiance(10); }),
    card('mt-twin-radiance', c => { c.radiance(5); c.radiance(5); }),
    card('mt-mercy-10', c => c.mercy(10)),
    card('mt-mercy-5', c => c.mercy(5)),
    card('mt-mercy-exact', c => c.mercy(4, { exact: true })),
    card('mt-deal-40', c => { c.deal(40, { exact: true }); }),
    card('mt-vuln', c => c.vulnerable(50, 3)),
    card('mt-filler', c => { c.guard(1, { exact: true }); }),
    card('mt-radiance-0', c => { c.radiance(0); }),
    card('mt-radiance-neg', c => { c.radiance(-3); }),
    card('mt-mercy-0', c => c.mercy(0, { exact: true })),
    card('mt-mercy-neg', c => c.mercy(-2, { exact: true })),
    card('mt-kill-then-mercy', c => { c.deal(40, { exact: true }); c.mercy(10); }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

/** A program fight on a sandbag of `foeVitae` / `foeMax` VITAE; the player at
 *  `vitae` / 100 with neutral stats, so a heart-scaled number is the number written. */
function fight(hand: string[], opts: { vitae?: number; foeVitae?: number; foeMax?: number } = {}): CombatEncounterState {
    const foeMax = opts.foeMax ?? 500;
    const enemy = { ...deepClone(Sandbag_01), health: opts.foeVitae ?? foeMax, maxHealth: foeMax };
    const player = { ...deepClone(Player), baseStats: { heart: 5, body: 5, mind: 5 } };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill('mt-filler')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: opts.vitae ?? 100, maxHealth: 100 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const playT = (s: CombatEncounterState, uid: string) => playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, false);
const play = (s: CombatEncounterState, uid: string): CombatEncounterState => playT(s, uid).state;
const mercyOf = (s: CombatEncounterState): MercyState => s.program!.mercy;
const withMercy = (s: CombatEncounterState, patch: Partial<MercyState>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, mercy: { ...s.program!.mercy, ...patch } } });
const ofKind = <K extends CombatEvent['kind']>(events: readonly CombatEvent[], kind: K) =>
    events.filter((e): e is Extract<CombatEvent, { kind: K }> => e.kind === kind);

/** The foe's turn (and the round boundary), then your next turn start. */
function nextRound(s: CombatEncounterState) {
    const foe = resolveThreatPhase(s);
    const start = startTurn(foe.state);
    return { afterFoe: foe.state, afterStart: start.state, foeEvents: foe.events };
}

it('the fixture player is at neutral heart, so RADIANCE n and MERCY n heal n', () => {
    const s = fight([]);
    expect(scaleFor(10, s.player.baseStats, 'heart', 'repeating')).toBe(10);
});

describe('A1 RADIANCE', () => {
    it('RADIANCE 5 at full VITAE heals 0 and deals 0, and still emits its event', () => {
        const s = fight(['mt-radiance-5'], { vitae: 100 });
        const r = playT(s, 't0');
        expect(r.state.player.health).toBe(100);
        expect(r.state.enemy.health).toBe(s.enemy.health);
        expect(ofKind(r.events, 'radiance-struck')).toEqual([{ kind: 'radiance-struck', cardId: 'mt-radiance-5', healed: 0, amount: 0 }]);
        expect(ofKind(r.events, 'damage-dealt')).toEqual([]);
    });

    it('RADIANCE 5 at 3 below max heals 3 and deals 3', () => {
        const s = fight(['mt-radiance-5'], { vitae: 97 });
        const r = playT(s, 't0');
        expect(r.state.player.health).toBe(100);
        expect(s.enemy.health - r.state.enemy.health).toBe(3);
        expect(ofKind(r.events, 'radiance-struck')).toEqual([{ kind: 'radiance-struck', cardId: 'mt-radiance-5', healed: 3, amount: 3 }]);
        expect(ofKind(r.events, 'player-healed')).toEqual([{ kind: 'player-healed', cardId: 'mt-radiance-5', amount: 3 }]);
    });

    it('RADIANCE 10 at 10 or more below max against VULNERABLE heals 10 and deals 10 raised by VULNERABLE', () => {
        const vuln = play(fight(['mt-vuln', 'mt-radiance-10'], { vitae: 60 }), 't0');
        const mult = getDamageTakenMultiplier(vuln.enemy);
        expect(mult).toBeGreaterThan(1);
        const r = playT(vuln, 't1');
        expect(r.state.player.health).toBe(70);
        const hit = Math.round(10 * mult);
        expect(hit).toBeGreaterThan(10);
        expect(vuln.enemy.health - r.state.enemy.health).toBe(hit);
        expect(ofKind(r.events, 'radiance-struck')).toEqual([{ kind: 'radiance-struck', cardId: 'mt-radiance-10', healed: 10, amount: hit }]);
    });

    it('is a DEAL: a FROZEN foe takes it doubled, then FROZEN ends', () => {
        const s = fight(['mt-radiance-5'], { vitae: 90 });
        const frozen = { ...s, program: { ...s.program!, el: { ...s.program!.el, frozen: true } } };
        const r = playT(frozen, 't0');
        expect(s.enemy.health - r.state.enemy.health).toBe(10);
        expect(r.state.program!.el.frozen).toBe(false);
    });

    it('is heart-scaled when applied', () => {
        const s = fight(['mt-radiance-5'], { vitae: 50 });
        const hearty = { ...s, player: { ...s.player, baseStats: { ...s.player.baseStats, heart: 10 } } };
        const n = scaleFor(5, hearty.player.baseStats, 'heart', 'repeating');
        expect(n).toBeGreaterThan(5);
        const r = playT(hearty, 't0');
        expect(r.state.player.health).toBe(50 + n);
        expect(s.enemy.health - r.state.enemy.health).toBe(n);
    });

    it('a second RADIANCE on the line reads the VITAE the first left to heal, in play and in the witness', () => {
        const s = fight(['mt-twin-radiance'], { vitae: 93 });
        const r = playT(s, 't0');
        expect(ofKind(r.events, 'radiance-struck').map(e => e.healed)).toEqual([5, 2]);
        expect(s.enemy.health - r.state.enemy.health).toBe(7);
        // The witness: 7 healed (at 0.9 each) and 7 dealt.
        expect(programLineValue(s, 't0', false, PROGRAM_KIT)).toBeCloseTo(7 * 0.9 + 7, 5);
    });

    it('the witness values a RADIANCE at full VITAE at nothing', () => {
        expect(programLineValue(fight(['mt-radiance-5'], { vitae: 100 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('A2 MERCY', () => {
    it('heals the foe, adds N to its total and starts the 3-turn clock, with a mercy-added event', () => {
        const s = fight(['mt-mercy-10'], { foeVitae: 200 });
        const r = playT(s, 't0');
        expect(r.state.enemy.health).toBe(210);
        expect(mercyOf(r.state)).toMatchObject({ total: 10, clock: MERCY_CLOCK_TURNS });
        expect(ofKind(r.events, 'mercy-added')).toEqual([
            { kind: 'mercy-added', cardId: 'mt-mercy-10', healed: 10, amount: 10, total: 10, turnsLeft: 3 },
        ]);
    });

    it('MERCY 5 on a foe at full VITAE adds 5 (the heal is wasted, never added twice)', () => {
        const s = fight(['mt-mercy-5'], { foeVitae: 500, foeMax: 500 });
        const r = playT(s, 't0');
        expect(r.state.enemy.health).toBe(500);
        expect(mercyOf(r.state).total).toBe(5);
        expect(ofKind(r.events, 'mercy-added')[0]).toMatchObject({ healed: 0, amount: 5, total: 5 });
    });

    it('the heal stops at the foe\'s max VITAE; the total still gains all of N', () => {
        const r = playT(fight(['mt-mercy-10'], { foeVitae: 496, foeMax: 500 }), 't0');
        expect(r.state.enemy.health).toBe(500);
        expect(mercyOf(r.state).total).toBe(10);
        expect(ofKind(r.events, 'mercy-added')[0]).toMatchObject({ healed: 4, amount: 10 });
    });

    it('is heart-scaled; exact adds the number as written', () => {
        const s = fight(['mt-mercy-5', 'mt-mercy-exact'], { foeVitae: 200 });
        const hearty = { ...s, player: { ...s.player, baseStats: { ...s.player.baseStats, heart: 10 } } };
        const n = scaleFor(5, hearty.player.baseStats, 'heart', 'repeating');
        const once = play(hearty, 't0');
        expect(mercyOf(once).total).toBe(n);
        expect(mercyOf(play(once, 't1')).total).toBe(n + 4);
    });

    it("T's worked example: MERCY 10, then MERCY 10 with 1 turn left: the foe takes 40", () => {
        let s = play(fight(['mt-mercy-10', 'mt-mercy-10'], { foeVitae: 200 }), 't0');
        expect(mercyOf(s)).toMatchObject({ total: 10, clock: 3 });

        let r = nextRound(s);
        expect(ofKind(r.foeEvents, 'mercy-ticked')).toEqual([{ kind: 'mercy-ticked', total: 10, turnsLeft: 2 }]);
        r = nextRound(r.afterStart);
        expect(ofKind(r.foeEvents, 'mercy-ticked')).toEqual([{ kind: 'mercy-ticked', total: 10, turnsLeft: 1 }]);
        s = r.afterStart;
        expect(mercyOf(s)).toMatchObject({ total: 10, clock: 1 });

        // A new MERCY adds to the total and never resets the clock.
        s = play(s, 't1');
        expect(mercyOf(s)).toMatchObject({ total: 20, clock: 1 });

        const foe = resolveThreatPhase(s);
        expect(ofKind(foe.events, 'mercy-burst')).toEqual([{ kind: 'mercy-burst', total: 20, amount: 40, onClock: true }]);
        expect(ofKind(foe.events, 'mercy-ticked')).toEqual([]);
        expect(s.enemy.health - foe.state.enemy.health).toBe(40);
        expect(foe.events).toContainEqual({ kind: 'damage-dealt', cardId: 'mercy', target: 'enemy', amount: 40 });
        expect(mercyOf(foe.state)).toMatchObject({ total: 0, clock: 0 });
    });

    it('bursts at the start of the foe\'s turn, before it acts', () => {
        const s = withMercy(fight([], { foeVitae: 200 }), { total: 7, clock: 1 });
        const foe = resolveThreatPhase(s);
        const burstAt = foe.events.findIndex(e => e.kind === 'mercy-burst');
        const firedAt = foe.events.findIndex(e => e.kind === 'threat-fired');
        expect(burstAt).toBeGreaterThanOrEqual(0);
        if (firedAt >= 0) expect(burstAt).toBeLessThan(firedAt);
    });

    it('a MERCY played after a burst starts a new 3-turn clock', () => {
        const s = withMercy(fight(['mt-mercy-5'], { foeVitae: 200 }), { total: 10, clock: 1 });
        const r = nextRound(s);
        expect(mercyOf(r.afterStart)).toMatchObject({ total: 0, clock: 0 });
        const again = playT(r.afterStart, 't0');
        expect(mercyOf(again.state)).toMatchObject({ total: 5, clock: 3 });
        expect(ofKind(again.events, 'mercy-added')[0]).toMatchObject({ total: 5, turnsLeft: 3 });
    });

    it('the burst is a DEAL: VULNERABLE raises it, a FROZEN foe takes it doubled', () => {
        const vuln = play(fight(['mt-vuln'], { foeVitae: 300 }), 't0');
        const mult = getDamageTakenMultiplier(vuln.enemy);
        const v = resolveThreatPhase(withMercy(vuln, { total: 10, clock: 1 }));
        expect(ofKind(v.events, 'mercy-burst')[0]!.amount).toBe(Math.round(20 * mult));

        const base = fight([], { foeVitae: 300 });
        const frozen = withMercy({ ...base, program: { ...base.program!, el: { ...base.program!.el, frozen: true } } }, { total: 10, clock: 1 });
        const f = resolveThreatPhase(frozen);
        expect(ofKind(f.events, 'mercy-burst')[0]!.amount).toBe(40);
        expect(f.state.program!.el.frozen).toBe(false);
    });

    it('a burst that empties the foe ends the fight in victory before it acts', () => {
        const s = withMercy(fight([], { foeVitae: 30 }), { total: 20, clock: 1 });
        const foe = resolveThreatPhase(s);
        expect(foe.state.enemy.health).toBe(0);
        expect(foe.state.finalOutcome).toBe('victory');
        expect(foe.events.some(e => e.kind === 'threat-fired')).toBe(false);
    });

    it('lives in the combat state only: a fresh fight starts with no MERCY', () => {
        expect(mercyOf(fight([]))).toEqual(initMercyState());
    });

    it('the post-combat ledger counts MERCY\'s heal on the foe, so the VITAE it lost reconciles', () => {
        let s = play(fight(['mt-mercy-10', 'mt-deal-40'], { foeVitae: 200 }), 't0');
        s = play(s, 't1');
        // 200 + 10 healed - 40 dealt = 170: 330 below its max of 500, plus the 10 MERCY healed back.
        expect(buildCombatSummary(s).directDamage).toBe(340);
    });

    it('the witness values MERCY as its discounted burst less the VITAE it heals the foe', () => {
        const s = fight(['mt-mercy-10'], { foeVitae: 200 });
        // A 3-turn clock: the burst of 20 at 0.8 squared, less the 10 healed.
        expect(programLineValue(s, 't0', false, PROGRAM_KIT)).toBeCloseTo(20 * 0.8 * 0.8 - 10, 5);
        const full = fight(['mt-mercy-10'], { foeVitae: 500 });
        expect(programLineValue(full, 't0', false, PROGRAM_KIT)).toBeCloseTo(20 * 0.8 * 0.8, 5);
    });
});

describe('the mercy module', () => {
    it('adds without resetting a running clock; ticks, then bursts the total and clears', () => {
        let m = addMercy(initMercyState(), 4);
        expect(m).toMatchObject({ total: 4, clock: 3 });
        m = tickMercyClock(m).next;
        m = addMercy(m, 6);
        expect(m).toMatchObject({ total: 10, clock: 2 });
        m = tickMercyClock(m).next;
        const last = tickMercyClock(m);
        expect(last.burst).toBe(10);
        expect(last.next).toMatchObject({ total: 0, clock: 0 });
        expect(tickMercyClock(initMercyState())).toEqual({ next: initMercyState(), burst: 0 });
    });

    it('reads the board numbers', () => {
        expect(mercyReading({ total: 12, clock: 2, yielding: true })).toEqual({ mercy: 12, 'mercy-turns': 2, yielding: true });
        expect(mercyReading(undefined)).toEqual({ mercy: 0, 'mercy-turns': 0, yielding: false });
    });
});

describe('A3 YIELDING', () => {
    function encounter(enemy: Enemy, hpFrac: number, yielding: boolean): CombatEncounterState {
        let s = initializeCombatEncounter(Player, deepClone(enemy), ['grey-strike', 'grey-ward', 'grey-word'], 1);
        s = rollEncounterDice(s).state;
        const program = { ...initProgramLedger(), mercy: { ...initMercyState(), yielding } };
        return {
            ...s, program, conviction: getSignatureSkill(OPEN_HAND)!.cost,
            enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * hpFrac) },
        };
    }

    it('a YIELDING foe above its befriend gate can be spared: The Open Hand opens the mercy choice', () => {
        const s = encounter(GreenJelly, 1, true);
        expect(programFoeYielding(s)).toBe(true);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toBeNull();
        const r = playSignatureSkill(s, OPEN_HAND);
        expect(r.state.mercyChoiceActive).toBe(true);
    });

    it('the same foe not YIELDING is still refused above its gate', () => {
        const s = encounter(GreenJelly, 1, false);
        expect(programFoeYielding(s)).toBe(false);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toMatch(/not yet low enough/);
    });

    it('a YIELDING foe without a friendshipReward stays unbefriendable', () => {
        const s = encounter(FloatEye, 1, true);
        expect(signatureCastBlock(s, getSignatureSkill(OPEN_HAND)!)).toMatch(/will not be befriended/);
    });
});

// ── Edges the mutation report on PR #1110 named ──────────────────────────────

describe('edges', () => {
    const bodied = (s: CombatEncounterState): CombatEncounterState =>
        ({ ...s, player: { ...s.player, baseStats: { ...s.player.baseStats, body: 10 } } });

    it.each(['mt-radiance-0', 'mt-radiance-neg'])('%s does nothing and emits nothing', id => {
        const s = fight([id], { vitae: 50 });
        const r = playT(s, 't0');
        expect(r.state.player.health).toBe(50);
        expect(r.state.enemy.health).toBe(s.enemy.health);
        expect(ofKind(r.events, 'radiance-struck')).toEqual([]);
    });

    it.each(['mt-mercy-0', 'mt-mercy-neg'])('%s adds nothing, starts no clock and emits nothing', id => {
        const r = playT(fight([id], { foeVitae: 200 }), 't0');
        expect(mercyOf(r.state)).toEqual(initMercyState());
        expect(r.state.enemy.health).toBe(200);
        expect(ofKind(r.events, 'mercy-added')).toEqual([]);
    });

    it("RADIANCE's hit and the burst are exact: Body does not scale them", () => {
        const s = bodied(fight(['mt-radiance-5'], { vitae: 90 }));
        expect(scaleFor(5, s.player.baseStats, 'body', 'one-shot')).toBeGreaterThan(5);
        expect(s.enemy.health - play(s, 't0').enemy.health).toBe(5);
        const foe = resolveThreatPhase(withMercy(bodied(fight([], { foeVitae: 300 })), { total: 10, clock: 1 }));
        expect(ofKind(foe.events, 'mercy-burst')[0]!.amount).toBe(20);
    });

    it('a FROZEN burst emits the FROZEN expiry', () => {
        const base = fight([], { foeVitae: 300 });
        const frozen = withMercy({ ...base, program: { ...base.program!, el: { ...base.program!.el, frozen: true } } }, { total: 10, clock: 1 });
        expect(resolveThreatPhase(frozen).events).toContainEqual({ kind: 'weather-changed', element: 'frozen', from: 1, to: 0 });
    });

    it('the foe-turn hook emits nothing without a clock, and only the tick with one', () => {
        const none = fight([], { foeVitae: 300 });
        expect(programMercyFoeTurnStart(none, PROGRAM_KIT).events).toEqual([]);
        const ticking = withMercy(none, { total: 6, clock: 3 });
        expect(programMercyFoeTurnStart(ticking, PROGRAM_KIT).events).toEqual([{ kind: 'mercy-ticked', total: 6, turnsLeft: 2 }]);
        expect(resolveThreatPhase(none).events.filter(e => e.kind.startsWith('mercy'))).toEqual([]);
    });

    it('a burst that empties the foe ends the fight at once: nothing of the foe turn follows', () => {
        const foe = resolveThreatPhase(withMercy(fight([], { foeVitae: 30 }), { total: 20, clock: 1 }));
        const after = foe.events.slice(foe.events.findIndex(e => e.kind === 'mercy-burst') + 1).map(e => e.kind);
        expect(after).not.toContain('phase-resolved');
        expect(after).not.toContain('hand-drawn');
        expect(after).not.toContain('dot-tick');
    });

    it('the witness: VULNERABLE raises a MERCY burst, a second MERCY is worth only what it adds, a defeated foe nothing', () => {
        const vuln = play(fight(['mt-vuln', 'mt-mercy-10'], { foeVitae: 500 }), 't0');
        const mult = getDamageTakenMultiplier(vuln.enemy);
        expect(mult).toBeGreaterThan(1);
        expect(programLineValue(vuln, 't1', false, PROGRAM_KIT)).toBeCloseTo(Math.min(20 * mult, 500) * 0.8 * 0.8, 5);

        const held = withMercy(fight(['mt-mercy-10'], { foeVitae: 500 }), { total: 10, clock: 1 });
        // 20 bursting next foe turn (40) less the 10 already there (20); a full foe heals nothing.
        expect(programLineValue(held, 't0', false, PROGRAM_KIT)).toBeCloseTo(40 - 20, 5);

        expect(programLineValue(fight(['mt-mercy-10'], { foeVitae: 0 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });

    it('a MERCY after the line has emptied the foe heals nothing and adds nothing', () => {
        const r = playT(fight(['mt-kill-then-mercy'], { foeVitae: 30 }), 't0');
        expect(r.state.enemy.health).toBe(0);
        expect(mercyOf(r.state)).toEqual(initMercyState());
        expect(ofKind(r.events, 'mercy-added')).toEqual([]);
    });

    it('the module: a 0 MERCY changes nothing; no clock never bursts; no tick event from or to no clock', () => {
        expect(addMercy(initMercyState(), 0)).toEqual(initMercyState());
        expect(tickMercyClock({ total: 5, clock: 0, yielding: false })).toEqual({ next: { total: 5, clock: 0, yielding: false }, burst: 0 });
        expect(mercyTickEvent({ total: 5, clock: 0, yielding: false }, { total: 5, clock: 2, yielding: false })).toBeNull();
        expect(mercyTickEvent({ total: 5, clock: 1, yielding: false }, { total: 0, clock: 0, yielding: false })).toBeNull();
        expect(mercyTickEvent({ total: 5, clock: 3, yielding: false }, { total: 5, clock: 2, yielding: false }))
            .toEqual({ kind: 'mercy-ticked', total: 5, turnsLeft: 2 });
    });
});
