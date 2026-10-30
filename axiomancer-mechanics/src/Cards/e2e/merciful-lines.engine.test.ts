/**
 * Hermetic E2E — every Merciful line does something (Phase MF1d, mutation follow-up).
 *
 * Table-driven: each of the 29 cards is played on a fixture fight, FREE and PAID (a
 * Global's body through the start of the next turn), in two scenarios that open every
 * branch (A: you at 40/100, the foe at full with no MERCY; B: you at 90/100, the foe at
 * 200/500 holding MERCY, a debuff on you). Each play is compared with a control that
 * plays only the same set-up and follow-up cards, so emptying any line's body leaves the
 * fight unchanged and fails. A few lines also pin exact numbers.
 *
 * In scenario B the set-up plays a MERCY card first (so "return the last MERCY card" has one to return);
 * the follow-up plays a heal (so "your next HEAL is RADIANCE" and "heals +n" show), then the
 * foe's turn resolves (so "its next attack deals less" shows) and the next turn starts (so a
 * Global's body fires).
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { getCardById } from '../cards.library';
import { MERCIFUL_SET } from '../library/merciful.cards';
import { deepClone } from '../../Utils';
import { initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn } from '../../Combat/combat.engine';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const FILLER = 'grey-strike';
const SETUP = 'mc-e-02c';
const FOLLOW = 'mc-e-01b';
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

interface Scenario { name: string; vitae: number; foeVitae: number; mercy: boolean }
const SCENARIOS: Scenario[] = [
    { name: 'A', vitae: 40, foeVitae: 500, mercy: false },
    { name: 'B', vitae: 90, foeVitae: 200, mercy: true },
];

function fight(hand: string[], sc: Scenario): CombatEncounterState {
    const enemy = { ...deepClone(FloatEye), health: sc.foeVitae, maxHealth: 500 };
    const player = { ...deepClone(Player), baseStats: { heart: 5, body: 5, mind: 5 } };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(15 - hand.length).fill(FILLER)], 7);
    s = rollEncounterDice(s).state;
    const debuff = { effectId: 'debuff_poison', remainingDuration: 3, intensity: 1, appliedAt: 1, tier: 1 as const };
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: sc.vitae, maxHealth: 100, effects: sc.mercy ? [debuff] : [] },
        program: sc.mercy ? { ...s.program!, mercy: { total: 6, clock: 2, yielding: false } } : s.program,
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined).state;

const snap = (s: CombatEncounterState) => ({
    foe: s.enemy.health,
    mercy: { ...s.program!.mercy },
    atkLess: s.program!.attackLess ?? 0,
    hp: s.player.health,
    max: s.player.maxHealth,
    guard: s.guard ?? 0,
    debuffs: s.player.effects.length,
    leech: s.program!.leechPotency,
    hand: s.hand.map(h => h.cardId).join(','),
    pile: s.drawPile.length,
});

/** Plays the set-up, the card (when `id`), the follow-up, then the foe's turn and the next turn's start. */
function run(id: string | null, paid: boolean, sc: Scenario) {
    // Scenario B plays a MERCY card first; scenario A opens with no MERCY on the foe.
    const hand = [...(sc.mercy ? [SETUP] : []), ...(id ? [id] : []), FOLLOW];
    const uidOf = (cardId: string): string => `t${hand.indexOf(cardId)}`;
    let s = fight(hand, sc);
    if (sc.mercy) s = play(s, uidOf(SETUP), false);
    if (id) s = play(s, uidOf(id), paid);
    const mid = snap(s);
    const followUid = uidOf(FOLLOW);
    if (s.hand.some(h => h.uid === followUid)) s = play(s, followUid, false);
    const afterFollow = snap(s);
    s = startTurn(resolveThreatPhase({ ...s, drawPile: [FILLER, FILLER, FILLER, FILLER, FILLER] }).state).state;
    return { mid, afterFollow, next: snap(s) };
}

const CARDS = MERCIFUL_SET.cards;

describe('every Merciful line changes the fight', () => {
    for (const card of CARDS) {
        for (const paid of [false, true]) {
            // A Global's FREE line and PAID line are the same body; both put it in play.
            it(`${card.name} ${paid ? 'PAID' : 'FREE'} differs from the control in some scenario`, () => {
                const changed = SCENARIOS.filter(sc => {
                    const withCard = run(card.id, paid, sc);
                    const control = run(null, paid, sc);
                    return JSON.stringify(withCard) !== JSON.stringify(control);
                });
                expect(changed.length, `${card.id} ${paid ? 'PAID' : 'FREE'} changed nothing`).toBeGreaterThan(0);
            });
        }
    }

    it('the table reads all 29 cards', () => {
        expect(CARDS).toHaveLength(29);
        for (const c of CARDS) expect(getCardById(c.id)).toBe(c);
    });
});

/** Exact effects, scenario B (foe 200/500 with MERCY 6 then +2 from the set-up = 8, you 90/100). */
describe('exact numbers on the lines that read the fight', () => {
    const B = SCENARIOS[1];
    const A = SCENARIOS[0];
    const delta = (id: string, paid: boolean, sc: Scenario) => {
        const withCard = run(id, paid, sc).mid;
        const base = run(null, paid, sc);
        // The control's `mid` is the set-up alone (the card is absent).
        const before = base.mid;
        return {
            foe: withCard.foe - before.foe, hp: withCard.hp - before.hp, guard: withCard.guard - before.guard,
            mercy: withCard.mercy.total - before.mercy.total, max: withCard.max - before.max,
            atkLess: withCard.atkLess - before.atkLess,
        };
    };

    it('P-06 deals the MERCY total, twice on PAID; P-06c guards the same', () => {
        expect(delta('mc-p-06a', false, B).foe).toBe(-8);
        expect(delta('mc-p-06a', true, B).foe).toBe(-16);
        expect(delta('mc-p-06c', false, B).guard).toBe(8);
        expect(delta('mc-p-06c', true, B).guard).toBe(16);
        expect(delta('mc-p-06a', false, A).foe).toBe(0);
    });

    it('P-04 deals 3 without MERCY and 6 with; P-01 RADIANCE heals and hits for the same amount', () => {
        expect(delta('mc-p-04a', false, A).foe).toBe(-3);
        expect(delta('mc-p-04a', false, B).foe).toBe(-6);
        expect(delta('mc-p-04a', true, B).foe).toBe(-12);
        const r = delta('mc-p-01a', false, B);
        expect([r.hp, r.foe]).toEqual([3, -3]);
        const p = delta('mc-p-01a', true, A);
        expect([p.hp, p.foe]).toEqual([7, -7]);
    });

    it('P-07 deals what you healed, P-08 gives half of it as MERCY, P-09 guards by the VITAE missing', () => {
        expect(delta('mc-p-07b', false, A).foe).toBe(-2);
        expect(delta('mc-p-07b', true, A).foe).toBe(-8);
        expect(delta('mc-p-08b', false, A).mercy).toBe(1);
        expect(delta('mc-p-08b', true, A).mercy).toBe(3);
        expect(delta('mc-p-09c', true, A).guard).toBe(60);
        expect(delta('mc-p-09c', false, A).guard).toBe(2 + 12);
    });

    it('guard and deal branches: M-01 3 or 5, M-10 DEAL at full or MERCY, M-06 heals more below half', () => {
        expect(delta('mc-m-01b', false, A).guard).toBe(3);
        expect(delta('mc-m-01b', false, B).guard).toBe(5);
        expect(delta('mc-m-01b', true, B).guard).toBe(11);
        expect(delta('mc-m-10c', false, A).foe).toBe(-4);
        expect(delta('mc-m-10c', true, A).foe).toBe(-9);
        expect(delta('mc-m-10c', false, B).mercy).toBe(2);
        expect(delta('mc-m-10c', true, B).mercy).toBe(5);
    });

    it('MERCY adds: P-03, E-02 and M-07 and M-02; M-08 cuts the attack or adds MERCY', () => {
        expect(delta('mc-p-03b', false, A).mercy).toBe(5);
        expect(delta('mc-e-02c', true, A).mercy).toBe(4);
        expect(delta('mc-m-07c', false, A).mercy).toBe(1);
        expect(delta('mc-m-07c', true, A).mercy).toBe(2);
        expect(delta('mc-m-02b', false, A).mercy).toBe(2);
        expect(delta('mc-m-08a', false, A).mercy).toBe(3);
        expect(delta('mc-m-08a', false, B).atkLess).toBe(2);
        expect(delta('mc-m-08a', true, B).atkLess).toBe(5);
        expect(delta('mc-m-08a', true, A).mercy).toBe(5);
    });

    it('P-02 RADIANCE and GUARD; E-07 DEAL; E-10 and E-01 and M-04 heal', () => {
        const d = delta('mc-p-02b', true, A);
        expect([d.hp, d.foe, d.guard]).toEqual([9, -9, 5]);
        expect(delta('mc-e-07b', true, A).foe).toBe(-4);
        expect(delta('mc-e-10b', true, A).hp).toBe(4);
        expect(delta('mc-e-01b', true, A).hp).toBe(5);
        const m = delta('mc-m-04b', false, B);
        expect([m.hp, m.foe]).toEqual([2, -2]);
    });

    it('P-03 PAID bursts for twice the total, P-05 PAID bursts what is there, M-05 raises max VITAE', () => {
        const burst = delta('mc-p-03b', true, B);
        expect(burst.foe).toBe(8 - 2 * (8 + 8));
        expect(burst.mercy).toBe(-8);
        expect(delta('mc-p-05a', true, B).foe).toBe(-16);
        expect(delta('mc-m-05c', false, A).max).toBe(4);
        expect(delta('mc-m-05c', true, A).max).toBe(6);
        expect(delta('mc-m-05c', true, A).hp).toBe(66);
    });

    it('M-02 makes the foe YIELDING; M-04 clears the debuff; E-04 pays SACRIFICE and draws; E-07 LEECHes', () => {
        for (const paid of [false, true]) {
            expect(run('mc-m-02b', paid, A).mid.mercy.yielding).toBe(true);
            expect(run('mc-m-04b', paid, B).mid.debuffs).toBe(0);
        }
        expect(run(null, false, B).mid.debuffs).toBe(1);
        expect(run('mc-m-04b', false, A).mid.debuffs).toBe(0);
        expect(delta('mc-e-04b', false, A).hp).toBe(-3);
        expect(delta('mc-e-04b', true, A).hp).toBe(-4);
        const pile = (paid: boolean) => run(null, paid, A).mid.pile - run('mc-e-04b', paid, A).mid.pile;
        expect([pile(false), pile(true)]).toEqual([2, 3]);
        for (const paid of [false, true]) {
            expect(run('mc-e-07b', paid, A).mid.leech).toBe(paid ? 2 : 1);
        }
    });

    it('the Globals fire at the start of the next turn: Vigil adds MERCY and heals, Steady Pulse heals, Absolution hits', () => {
        const next = (id: string, sc: Scenario) => {
            const w = run(id, false, sc).next;
            const c = run(null, false, sc).next;
            return { foe: w.foe - c.foe, hp: w.hp - c.hp, mercy: w.mercy.total - c.mercy.total };
        };
        const vigil = next('mc-e-09b', B);
        expect(vigil.mercy).toBe(1);
        expect(vigil.hp).toBeGreaterThan(0);
        expect(next('mc-m-06c', A).hp).toBe(5);
        expect(next('mc-m-06c', B).hp).toBe(2);
        expect(next('mc-p-10c', B).foe).toBe(-5);
        expect(next('mc-p-10c', A).foe).toBe(0);
    });
});
