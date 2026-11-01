/**
 * Hermetic E2E — the Merciful's verbs and reads (Phase MF1b, acceptance A4).
 *
 * On T's rulings of 2026-10-29 and 2026-10-30
 * (`plan/README.md`, `plan/card-ledger/rehearsal-merciful.md`):
 *   · burst the foe's MERCY now; tick its clock by n (a tick to 0 bursts at once);
 *   · the reads: the foe has MERCY, its total, all you healed this turn, the VITAE you
 *     are missing, you below half VITAE, the foe at max VITAE;
 *   · heals this turn +n and times n; the next HEAL is RADIANCE; your HEALs this turn are
 *     RADIANCE and deal double; +n max VITAE; HEAL to full;
 *   · return the last n MERCY cards you played; the foe's next attack deals n less; clear
 *     one or every debuff on you; the foe is YIELDING while it has MERCY;
 *   · the sim witness values them, and ranks a card that opts in by what its lines are worth.
 *
 * The cards here are synthetic test cards in the sandbox registry; the Merciful trial set
 * itself lands in MF1d.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { GreenJelly, Sandbag_01 } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx, ProgramQuery } from '../../Cards/card-program.types';
import type { ActiveEffect } from '../../Effects/types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, playSignatureSkill,
    PROGRAM_KIT,
} from '../combat.engine';
import { getSignatureSkill, signatureCastBlock } from '../combat.signature';
import { programFoeYielding, programIllegalReason, programLineValue } from '../combat.card-program';
import { playSimPhase, type CombatCardUsage } from '../combat.encounter.sim';
import { getDamageTakenMultiplier } from '../effects';
import { clearMercy, initMercyState, tickMercyClock, yieldWhileMercy, type MercyState } from '../combat.mercy';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const OPEN_HAND = 'sig-disarming-plea';

/** What the last read-card saw. */
let seen: ProgramQuery[] = [];

/** A heal card prints HEAL, which the witness counts when it values a heal modifier. */
const printed = (id: string): string => (id.startsWith('mv-heal-') && /\d$/.test(id) ? 'HEAL.' : 'TEST.');

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free, extra: Partial<Card> = {}, exile = false): Card {
    return {
        id, name: id, color: 'any', description: 'A mercy verb test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: printed(id), run: free }, paid: { text: printed(id), run: paid, ...(exile ? { exile: true } : {}) } },
        ...extra,
    };
}

const CARDS: Card[] = [
    card('mv-mercy-10', c => c.mercy(10)),
    card('mv-mercy-5', c => c.mercy(5)),
    card('mv-mercy-4', c => c.mercy(4)),
    card('mv-mercy-8-burst', c => c.mercy(8), c => { c.mercy(8); c.burstMercy(2); }, {}, true),
    card('mv-burst', c => c.burstMercy(2)),
    card('mv-burst-3', c => c.burstMercy(3)),
    card('mv-tick-1', c => c.tickMercy(1)),
    card('mv-tick-5', c => c.tickMercy(5)),
    card('mv-yield', c => { c.mercy(2); c.yieldWhileMercy(); }),
    card('mv-yield-only', c => c.yieldWhileMercy()),
    card('mv-read', c => { seen.push({ ...c.q }); }),
    card('mv-mercy-then-read', c => { c.mercy(6); seen.push({ ...c.q }); }),
    card('mv-heal-then-read', c => { c.heal(5, { exact: true }); seen.push({ ...c.q }); }),
    card('mv-heal-5', c => { c.heal(5, { exact: true }); }),
    card('mv-heal-2', c => { c.heal(2, { exact: true }); }),
    card('mv-heal-overflow-10', c => { c.heal(10, { exact: true, overflowToGuard: true }); }),
    card('mv-radiance-2', c => { c.radiance(2); }),
    card('mv-plus-3', c => c.healsPlus(3)),
    card('mv-times-2', c => c.healsTimes(2)),
    card('mv-next-radiance', c => c.nextHealRadiance()),
    card('mv-all-radiance', c => c.allHealsRadianceDouble()),
    card('mv-max-4', c => c.maxVitae(4)),
    card('mv-max-6-full', c => { c.maxVitae(6); c.healToFull(); }),
    card('mv-full', c => { c.healToFull(); }),
    card('mv-weaken-3', c => c.weakenNextAttack(3)),
    card('mv-clear-1', c => { c.clearDebuffs(1); }),
    card('mv-clear-all', c => { c.clearDebuffs(Infinity); }),
    card('mv-return-1', c => c.returnMercyCards(1)),
    card('mv-return-2', c => c.returnMercyCards(2)),
    card('mv-deal-40', c => { c.deal(40, { exact: true }); }),
    card('mv-vuln', c => c.vulnerable(50, 3)),
    card('mv-filler', c => { c.guard(1, { exact: true }); }),
];

/** The witness pair: a dud first in hand order (its PAID line gains nothing over its FREE), then a
 *  card whose PAID line gains a lot. Each twice: opted in to the value witness, and not. */
function witnessCard(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void, valueWitness: boolean): Card {
    const c = card(id, free, paid);
    return valueWitness ? { ...c, program: { ...c.program!, valueWitness: true } } : c;
}
const dud = (c: ProgramCtx) => { c.guard(1, { exact: true }); };
const WITNESS_CARDS: Card[] = [
    witnessCard('mv-dud', dud, dud, true),
    witnessCard('mv-prize', c => { c.heal(1, { exact: true }); }, c => { c.heal(30, { exact: true }); }, true),
    witnessCard('mv-dud-plain', dud, dud, false),
    witnessCard('mv-prize-plain', c => { c.heal(1, { exact: true }); }, c => { c.heal(30, { exact: true }); }, false),
];

beforeAll(() => registerSandboxCards([...CARDS, ...WITNESS_CARDS]));
afterAll(() => clearSandboxCards());

/** A program fight on `foe` at `foeVitae`; the player at `vitae` / 100 with neutral stats. */
function fight(hand: string[], opts: { vitae?: number; foeVitae?: number; foeMax?: number; foe?: Enemy } = {}): CombatEncounterState {
    const foeMax = opts.foeMax ?? 500;
    const base = opts.foe ?? Sandbag_01;
    const enemy = { ...deepClone(base), health: opts.foeVitae ?? foeMax, maxHealth: foeMax };
    const player = { ...deepClone(Player), baseStats: { heart: 5, body: 5, mind: 5 } };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill('mv-filler')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: opts.vitae ?? 100, maxHealth: 100 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const WILD_DIE = () => [{ ...WILD }];
const playT = (s: CombatEncounterState, uid: string, paid = false) =>
    playCombatCard({ ...s, dice: WILD_DIE() }, { uid }, paid, paid ? 'w' : undefined);
const play = (s: CombatEncounterState, uid: string, paid = false): CombatEncounterState => playT(s, uid, paid).state;
const mercyOf = (s: CombatEncounterState): MercyState => s.program!.mercy;
const withMercy = (s: CombatEncounterState, patch: Partial<MercyState>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, mercy: { ...s.program!.mercy, ...patch } } });
const ofKind = <K extends CombatEvent['kind']>(events: readonly CombatEvent[], kind: K) =>
    events.filter((e): e is Extract<CombatEvent, { kind: K }> => e.kind === kind);

describe('burst the foe\'s MERCY now', () => {
    it('is a DEAL of twice the total, clears the total and the clock, and emits a burst off the clock', () => {
        const s = play(fight(['mv-mercy-10', 'mv-burst'], { foeVitae: 200 }), 't0');
        const r = playT(s, 't1');
        expect(ofKind(r.events, 'mercy-burst')).toEqual([{ kind: 'mercy-burst', total: 10, amount: 20, onClock: false }]);
        expect(s.enemy.health - r.state.enemy.health).toBe(20);
        expect(mercyOf(r.state)).toMatchObject({ total: 0, clock: 0 });
        // A card's burst is the card's damage; the clock's burst is cardId 'mercy'.
        expect(r.events).toContainEqual({ kind: 'damage-dealt', cardId: 'mv-burst', target: 'enemy', amount: 20 });
    });

    it('does nothing with no MERCY on the foe', () => {
        const s = fight(['mv-burst'], { foeVitae: 200 });
        const r = playT(s, 't0');
        expect(ofKind(r.events, 'mercy-burst')).toEqual([]);
        expect(r.state.enemy.health).toBe(200);
    });

    it('a burst of three times is a DEAL of three times the total; VULNERABLE raises it', () => {
        const vuln = play(fight(['mv-vuln', 'mv-mercy-10', 'mv-burst-3'], { foeVitae: 300 }), 't0');
        const mult = getDamageTakenMultiplier(vuln.enemy);
        const s = play(vuln, 't1');
        const r = playT(s, 't2');
        expect(ofKind(r.events, 'mercy-burst')[0]!.amount).toBe(Math.round(30 * mult));
    });

    it('a MERCY played after a burst starts a fresh 3-turn clock', () => {
        let s = play(play(fight(['mv-mercy-10', 'mv-burst', 'mv-mercy-5'], { foeVitae: 200 }), 't0'), 't1');
        s = play(s, 't2');
        expect(mercyOf(s)).toMatchObject({ total: 5, clock: 3 });
    });

    it('MERCY 8 then the burst, on a PAID line that EXILEs: the foe takes twice the 8 and is healed 8 first', () => {
        const s = fight(['mv-mercy-8-burst'], { foeVitae: 200 });
        const r = playT(s, 't0', true);
        expect(r.state.enemy.health).toBe(200 + 8 - 16);
        expect(mercyOf(r.state)).toMatchObject({ total: 0, clock: 0 });
        expect(ofKind(r.events, 'mercy-burst')[0]).toMatchObject({ total: 8, amount: 16, onClock: false });
    });

    it('a burst that empties the foe wins the fight', () => {
        const s = play(fight(['mv-mercy-10', 'mv-burst'], { foeVitae: 5, foeMax: 5 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.finalOutcome).toBe('victory');
    });

    it('the witness values a burst now above holding the MERCY, and nothing without MERCY', () => {
        const hold = play(fight(['mv-mercy-10', 'mv-burst'], { foeVitae: 200 }), 't0');
        expect(programLineValue(hold, 't1', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(fight(['mv-burst'], { foeVitae: 200 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('tick the MERCY clock by n', () => {
    it('ticks the clock down and emits a tick', () => {
        const s = play(fight(['mv-mercy-10', 'mv-tick-1'], { foeVitae: 200 }), 't0');
        const r = playT(s, 't1');
        expect(mercyOf(r.state)).toMatchObject({ total: 10, clock: 2 });
        expect(ofKind(r.events, 'mercy-ticked')).toEqual([{ kind: 'mercy-ticked', total: 10, turnsLeft: 2 }]);
        expect(r.state.enemy.health).toBe(s.enemy.health);
    });

    it('a tick that takes the clock to 0 bursts at once (twice the total)', () => {
        const s = play(fight(['mv-mercy-10', 'mv-tick-5'], { foeVitae: 200 }), 't0');
        const r = playT(s, 't1');
        expect(ofKind(r.events, 'mercy-burst')).toEqual([{ kind: 'mercy-burst', total: 10, amount: 20, onClock: false }]);
        expect(ofKind(r.events, 'mercy-ticked')).toEqual([]);
        expect(mercyOf(r.state)).toMatchObject({ total: 0, clock: 0 });
    });

    it('a tick to exactly 0 also bursts', () => {
        const s = withMercy(play(fight(['mv-mercy-10', 'mv-tick-1'], { foeVitae: 200 }), 't0'), { clock: 1 });
        const r = playT(s, 't1');
        expect(ofKind(r.events, 'mercy-burst')).toHaveLength(1);
    });

    it('does nothing with no MERCY', () => {
        const r = playT(fight(['mv-tick-5'], { foeVitae: 200 }), 't0');
        expect(r.events.filter(e => e.kind === 'mercy-ticked' || e.kind === 'mercy-burst')).toEqual([]);
    });

    it('tickMercyClock ticks by n and reports the burst', () => {
        const m: MercyState = { total: 7, clock: 3, yielding: true };
        expect(tickMercyClock(m, 2)).toEqual({ next: { total: 7, clock: 1, yielding: true }, burst: 0 });
        expect(tickMercyClock(m, 3)).toEqual({ next: { total: 0, clock: 0, yielding: false }, burst: 7 });
        expect(tickMercyClock(m, 9).burst).toBe(7);
        expect(tickMercyClock(initMercyState(), 2)).toEqual({ next: initMercyState(), burst: 0 });
    });
});

/** Plays the card and returns what its line saw last (the play checks the line once before it applies it). */
function read(s: CombatEncounterState, uid: string): ProgramQuery {
    seen = [];
    play(s, uid);
    return seen[seen.length - 1]!;
}

describe('the reads', () => {
    it('the foe has MERCY, its total, an earlier verb on the line included', () => {
        const s = fight(['mv-read', 'mv-mercy-then-read', 'mv-read'], { foeVitae: 200 });
        expect(read(s, 't0')).toMatchObject({ foeHasMercy: false, foeMercy: 0 });
        expect(read(s, 't1')).toMatchObject({ foeHasMercy: true, foeMercy: 6 });
        expect(read(play(s, 't1'), 't2')).toMatchObject({ foeHasMercy: true, foeMercy: 6 });
    });

    it('the foe at max VITAE', () => {
        expect(read(fight(['mv-read'], { foeVitae: 500, foeMax: 500 }), 't0').foeAtMax).toBe(true);
        expect(read(fight(['mv-read'], { foeVitae: 499, foeMax: 500 }), 't0').foeAtMax).toBe(false);
    });

    it('all you healed this turn, an earlier heal on the line included; it resets at your next turn', () => {
        const s = fight(['mv-read', 'mv-heal-then-read', 'mv-read'], { vitae: 80 });
        expect(read(s, 't0').healedThisTurn).toBe(0);
        expect(read(s, 't1').healedThisTurn).toBe(5);
        const healed = play(s, 't1');
        expect(read(healed, 't2').healedThisTurn).toBe(5);
        const next = startTurn(resolveThreatPhase(healed).state).state;
        const fresh = { ...next, hand: [{ uid: 'r0', cardId: 'mv-read' }], dice: WILD_DIE() };
        expect(read(fresh, 'r0').healedThisTurn).toBe(0);
    });

    it('the heal that stops at max VITAE counts only what it restored', () => {
        expect(read(fight(['mv-heal-then-read'], { vitae: 97 }), 't0').healedThisTurn).toBe(3);
    });

    it('the VITAE you are missing, and you below half VITAE (strictly)', () => {
        const at = (vitae: number) => read(fight(['mv-read'], { vitae }), 't0');
        expect([49, 50, 100].map(v => at(v).missing)).toEqual([51, 50, 0]);
        expect([49, 50, 100].map(v => at(v).belowHalf)).toEqual([true, false, false]);
        expect([49, 50, 100].map(v => at(v).atHalf)).toEqual([true, true, false]);
    });
});

describe('heal modifiers', () => {
    it('heals this turn +n: a HEAL and a RADIANCE both heal 3 more; RADIANCE hits for it', () => {
        let s = play(fight(['mv-plus-3', 'mv-heal-2', 'mv-radiance-2'], { vitae: 50, foeVitae: 300 }), 't0');
        const heal = playT(s, 't1');
        expect(heal.state.player.health).toBe(55);
        s = heal.state;
        const rad = playT(s, 't2');
        expect(rad.state.player.health).toBe(60);
        expect(s.enemy.health - rad.state.enemy.health).toBe(5);
        expect(ofKind(rad.events, 'radiance-struck')).toEqual([{ kind: 'radiance-struck', cardId: 'mv-radiance-2', healed: 5, amount: 5 }]);
    });

    it('heals this turn times n, then plus: two times and a plus stack as times first', () => {
        let s = play(fight(['mv-times-2', 'mv-plus-3', 'mv-heal-2'], { vitae: 50 }), 't0');
        s = play(s, 't1');
        expect(play(s, 't2').player.health).toBe(50 + 2 * 2 + 3);
    });

    it('the modifiers last the turn only', () => {
        let s = play(fight(['mv-plus-3'], { vitae: 50 }), 't0');
        expect(s.program!.heals!.plus).toBe(3);
        s = startTurn(resolveThreatPhase(s).state).state;
        expect(s.program!.heals).toMatchObject({ plus: 0, times: 1, nextRadiance: 0, allRadianceDouble: false, healed: 0 });
    });

    it('a heal at full VITAE with a modifier heals 0 and a RADIANCE deals 0', () => {
        const s = play(fight(['mv-plus-3', 'mv-radiance-2'], { vitae: 100, foeVitae: 300 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.enemy.health).toBe(300);
        expect(ofKind(r.events, 'radiance-struck')[0]).toMatchObject({ healed: 0, amount: 0 });
    });

    it('the witness values a modifier by the heals in hand and the VITAE missing', () => {
        const hurt = fight(['mv-plus-3', 'mv-heal-2'], { vitae: 50 });
        const full = fight(['mv-plus-3', 'mv-heal-2'], { vitae: 100 });
        expect(programLineValue(hurt, 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(full, 't0', false, PROGRAM_KIT)).toBe(0);
        expect(programLineValue(fight(['mv-times-2'], { vitae: 50 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('your next HEAL is RADIANCE', () => {
    it('the next HEAL heals and then deals what it healed; the one after is a plain HEAL', () => {
        const s = play(fight(['mv-next-radiance', 'mv-heal-5', 'mv-heal-5'], { vitae: 50, foeVitae: 300 }), 't0');
        const first = playT(s, 't1');
        expect(first.state.player.health).toBe(55);
        expect(s.enemy.health - first.state.enemy.health).toBe(5);
        expect(ofKind(first.events, 'radiance-struck')).toEqual([{ kind: 'radiance-struck', cardId: 'mv-heal-5', healed: 5, amount: 5 }]);
        const second = playT(first.state, 't2');
        expect(second.state.player.health).toBe(60);
        expect(second.state.enemy.health).toBe(first.state.enemy.health);
        expect(ofKind(second.events, 'radiance-struck')).toEqual([]);
    });

    it('at full VITAE the converted HEAL deals 0', () => {
        const s = play(fight(['mv-next-radiance', 'mv-heal-5'], { vitae: 100, foeVitae: 300 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.enemy.health).toBe(300);
    });

    it('the witness values it only with a HEAL in hand', () => {
        expect(programLineValue(fight(['mv-next-radiance', 'mv-heal-5'], { vitae: 50 }), 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(fight(['mv-next-radiance'], { vitae: 50 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });

    it('a HEAL that overflows to GUARD still overflows once redirected to RADIANCE', () => {
        const s = play(fight(['mv-next-radiance', 'mv-heal-overflow-10'], { vitae: 95, foeVitae: 300 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.player.health).toBe(100);
        expect(r.state.guard).toBe(5);
        expect(s.enemy.health - r.state.enemy.health).toBe(5);
    });
});

describe('your HEALs this turn are RADIANCE and deal double', () => {
    it('each HEAL heals and deals twice what it healed; a RADIANCE deals double too', () => {
        let s = play(fight(['mv-all-radiance', 'mv-heal-5', 'mv-radiance-2'], { vitae: 50, foeVitae: 300 }), 't0', true);
        const heal = playT(s, 't1');
        expect(heal.state.player.health).toBe(55);
        expect(s.enemy.health - heal.state.enemy.health).toBe(10);
        s = heal.state;
        const rad = playT(s, 't2');
        expect(rad.state.player.health).toBe(57);
        expect(s.enemy.health - rad.state.enemy.health).toBe(4);
    });

    it('stays for every HEAL of the turn, not just the next', () => {
        let s = play(fight(['mv-all-radiance', 'mv-heal-5', 'mv-heal-5'], { vitae: 50, foeVitae: 300 }), 't0');
        s = play(s, 't1');
        const r = playT(s, 't2');
        expect(s.enemy.health - r.state.enemy.health).toBe(10);
    });
});

describe('max VITAE and HEAL to full', () => {
    it('+n max VITAE raises the maximum for the combat and leaves current VITAE', () => {
        const r = playT(fight(['mv-max-4'], { vitae: 70 }), 't0');
        expect(r.state.player.maxHealth).toBe(104);
        expect(r.state.player.health).toBe(70);
    });

    it('+n max VITAE then HEAL to full heals every point missing, new maximum included', () => {
        const r = playT(fight(['mv-max-6-full'], { vitae: 70 }), 't0');
        expect(r.state.player.maxHealth).toBe(106);
        expect(r.state.player.health).toBe(106);
        expect(ofKind(r.events, 'player-healed')).toEqual([{ kind: 'player-healed', cardId: 'mv-max-6-full', amount: 36 }]);
    });

    it('HEAL to full at full VITAE heals nothing and emits nothing', () => {
        const r = playT(fight(['mv-full'], { vitae: 100 }), 't0');
        expect(ofKind(r.events, 'player-healed')).toEqual([]);
    });

    it('HEAL to full counts as healed this turn and, with the next HEAL as RADIANCE, hits for it', () => {
        const s = play(fight(['mv-next-radiance', 'mv-full'], { vitae: 60, foeVitae: 300 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.player.health).toBe(100);
        expect(s.enemy.health - r.state.enemy.health).toBe(40);
        expect(r.state.program!.heals!.healed).toBe(40);
    });

    it('the maximum is the combat\'s: a fresh fight starts at the character\'s own', () => {
        const grown = playT(fight(['mv-max-4'], { vitae: 70 }), 't0').state;
        expect(grown.player.maxHealth).toBe(104);
        expect(fight([]).player.maxHealth).toBe(100);
    });

    it('the witness values +max a little and HEAL to full by what is missing', () => {
        expect(programLineValue(fight(['mv-max-4'], { vitae: 70 }), 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(fight(['mv-full'], { vitae: 60 }), 't0', false, PROGRAM_KIT)).toBeGreaterThan(30);
        expect(programLineValue(fight(['mv-full'], { vitae: 100 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('return the last n MERCY cards you played', () => {
    function played(): CombatEncounterState {
        let s = fight(['mv-mercy-5', 'mv-mercy-4', 'mv-heal-2', 'mv-return-1', 'mv-return-2'], { foeVitae: 200, vitae: 60 });
        s = play(s, 't0');
        s = play(s, 't1');
        return play(s, 't2');
    }

    it('returns the most recent MERCY card from the discard to the hand, and emits it', () => {
        const s = played();
        expect(s.program!.mercyCards).toEqual(['mv-mercy-5', 'mv-mercy-4']);
        const r = playT(s, 't3');
        expect(r.state.hand.map(h => h.cardId)).toContain('mv-mercy-4');
        expect(r.state.hand.map(h => h.cardId)).not.toContain('mv-mercy-5');
        expect(r.state.discard.filter(id => id === 'mv-mercy-4')).toHaveLength(0);
        expect(ofKind(r.events, 'cards-retrieved')).toEqual([{ kind: 'cards-retrieved', cardIds: ['mv-mercy-4'] }]);
    });

    it('returns the last two, newest first; a card that did not add MERCY is not a MERCY card', () => {
        const r = playT(played(), 't4');
        expect(ofKind(r.events, 'cards-retrieved')).toEqual([{ kind: 'cards-retrieved', cardIds: ['mv-mercy-4', 'mv-mercy-5'] }]);
        expect(r.state.hand.map(h => h.cardId)).not.toContain('mv-heal-2');
    });

    it('returns nothing before any MERCY card was played', () => {
        const r = playT(fight(['mv-return-2'], { foeVitae: 200 }), 't0');
        expect(ofKind(r.events, 'cards-retrieved')).toEqual([]);
    });

    it('an exiled MERCY card is not in the discard, so it does not come back', () => {
        let s = fight(['mv-mercy-8-burst', 'mv-mercy-5', 'mv-return-2'], { foeVitae: 200 });
        s = play(s, 't0', true);
        s = play(s, 't1');
        const r = playT(s, 't2');
        expect(ofKind(r.events, 'cards-retrieved')).toEqual([{ kind: 'cards-retrieved', cardIds: ['mv-mercy-5'] }]);
    });

    it('a returned card, played again, is the last MERCY card again', () => {
        let s = played();
        s = play(s, 't3');
        const again = s.hand.find(h => h.cardId === 'mv-mercy-4')!;
        s = play(s, again.uid);
        expect(s.program!.mercyCards).toEqual(['mv-mercy-5', 'mv-mercy-4', 'mv-mercy-4']);
    });

    it('the witness values a return by the cards it brings back', () => {
        expect(programLineValue(played(), 't3', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue(fight(['mv-return-1'], { foeVitae: 200 }), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('the foe\'s next attack deals n less', () => {
    const jelly = (hand: string[]) => fight(hand, { foe: GreenJelly, foeVitae: 40, foeMax: 40 });

    it('takes n off the foe\'s next attack, once', () => {
        const base = jelly(['mv-weaken-3']);
        const plain = resolveThreatPhase(base);
        const hit = base.player.health - plain.state.player.health;
        expect(hit).toBeGreaterThanOrEqual(3);

        const cut = play(base, 't0');
        expect(cut.program!.attackLess).toBe(3);
        const first = resolveThreatPhase(cut);
        expect(cut.player.health - first.state.player.health).toBe(hit - 3);
        expect(first.state.program!.attackLess).toBe(0);
    });

    it('stacks, and cannot take an attack below 0', () => {
        let s = jelly(['mv-weaken-3', 'mv-weaken-3']);
        s = play(play(s, 't0'), 't1');
        expect(s.program!.attackLess).toBe(6);
        const big = { ...s, program: { ...s.program!, attackLess: 999 } };
        const r = resolveThreatPhase(big);
        expect(r.state.player.health).toBe(big.player.health);
    });

    it('is not spent on a turn the foe does not attack', () => {
        const cut = play(jelly(['mv-weaken-3']), 't0');
        const hindered = { ...cut, enemy: { ...cut.enemy, effects: [{ effectId: 'debuff_petrify', remainingDuration: 2, intensity: 1, appliedAt: 1, tier: 1 as const }] } };
        const r = resolveThreatPhase(hindered);
        expect(r.state.player.health).toBe(hindered.player.health);
        expect(r.state.program!.attackLess).toBe(3);
    });

    it('the witness values it by the attack coming', () => {
        expect(programLineValue(jelly(['mv-weaken-3']), 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
    });
});

describe('clear debuffs from yourself', () => {
    const debuff = (effectId: string, appliedAt: number): ActiveEffect => ({ effectId, remainingDuration: 3, intensity: 1, appliedAt, tier: 1 });
    const buffId = 'effect_not_a_debuff';

    function afflicted(hand: string[]): CombatEncounterState {
        const s = fight(hand);
        return {
            ...s,
            player: { ...s.player, effects: [debuff('debuff_poison', 1), { ...debuff(buffId, 1) }, debuff('debuff_bleed', 2)] },
        };
    }

    it('clears one debuff, the oldest, and leaves an effect that is not a debuff', () => {
        const r = playT(afflicted(['mv-clear-1']), 't0');
        expect(r.state.player.effects.map(e => e.effectId)).toEqual([buffId, 'debuff_bleed']);
    });

    it('clears every debuff and leaves an effect that is not a debuff', () => {
        const r = playT(afflicted(['mv-clear-all']), 't0');
        expect(r.state.player.effects.map(e => e.effectId)).toEqual([buffId]);
    });

    it('with no debuff on you it clears nothing', () => {
        const r = playT(fight(['mv-clear-all']), 't0');
        expect(r.state.player.effects).toEqual([]);
    });

    it('the witness values it by the debuffs it clears', () => {
        expect(programLineValue(afflicted(['mv-clear-all']), 't0', false, PROGRAM_KIT)).toBeGreaterThan(
            programLineValue(afflicted(['mv-clear-1']), 't0', false, PROGRAM_KIT));
        expect(programLineValue(fight(['mv-clear-all']), 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('the foe is YIELDING while it has MERCY', () => {
    function jellyAtFull(hand: string[]): CombatEncounterState {
        return fight(hand, { foe: GreenJelly, foeVitae: 40, foeMax: 40, vitae: 100 });
    }

    it('the verb makes a foe with MERCY YIELDING: The Open Hand then spares it above its gate', () => {
        const s0 = { ...jellyAtFull(['mv-yield']), };
        const before = { ...s0, conviction: getSignatureSkill(OPEN_HAND)!.cost };
        expect(signatureCastBlock(before, getSignatureSkill(OPEN_HAND)!)).toMatch(/not yet low enough/);
        const s = play(s0, 't0');
        expect(mercyOf(s)).toMatchObject({ total: 2, yielding: true });
        expect(programFoeYielding(s)).toBe(true);
        const armed = { ...s, conviction: getSignatureSkill(OPEN_HAND)!.cost };
        expect(signatureCastBlock(armed, getSignatureSkill(OPEN_HAND)!)).toBeNull();
        expect(playSignatureSkill(armed, OPEN_HAND).state.mercyChoiceActive).toBe(true);
    });

    it('MERCY from another card does not make the foe YIELDING', () => {
        const s = play(jellyAtFull(['mv-mercy-5']), 't0');
        expect(programFoeYielding(s)).toBe(false);
    });

    it('the verb does nothing without MERCY', () => {
        const s = play(jellyAtFull(['mv-yield-only']), 't0');
        expect(programFoeYielding(s)).toBe(false);
    });

    it('stays while the foe has MERCY across its turns, and ends when the MERCY bursts', () => {
        let s = play(jellyAtFull(['mv-yield']), 't0');
        s = startTurn(resolveThreatPhase(s).state).state;
        expect(programFoeYielding(s)).toBe(true);
        s = startTurn(resolveThreatPhase(s).state).state;
        expect(programFoeYielding(s)).toBe(true);
        const burst = resolveThreatPhase(s);
        expect(ofKind(burst.events, 'mercy-burst')).toHaveLength(1);
        expect(programFoeYielding(burst.state)).toBe(false);
    });

    it('ends when a card bursts the MERCY now', () => {
        const s = play(jellyAtFull(['mv-yield', 'mv-burst']), 't0');
        expect(programFoeYielding(s)).toBe(true);
        expect(programFoeYielding(play(s, 't1'))).toBe(false);
    });

    it('yieldWhileMercy and clearMercy are the pure halves', () => {
        expect(yieldWhileMercy(initMercyState())).toEqual(initMercyState());
        const m: MercyState = { total: 3, clock: 2, yielding: false };
        expect(yieldWhileMercy(m)).toEqual({ total: 3, clock: 2, yielding: true });
        expect(clearMercy({ total: 3, clock: 2, yielding: true })).toEqual(initMercyState());
    });

    it('the witness values it only against a foe that can be befriended', () => {
        const befriendable = programLineValue(jellyAtFull(['mv-yield']), 't0', false, PROGRAM_KIT);
        const plain = programLineValue(fight(['mv-yield'], { foeVitae: 200 }), 't0', false, PROGRAM_KIT);
        expect(befriendable).toBeGreaterThan(plain);
    });
});

describe('the sim witness ranks a card that opts in by what its lines are worth', () => {
    function simFight(hand: string[]): CombatEncounterState {
        return { ...fight(hand, { vitae: 40 }), hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })) };
    }
    function usageOf(hand: string[]): Record<string, CombatCardUsage> {
        const usage: Record<string, CombatCardUsage> = {};
        playSimPhase(simFight(hand), 'greedy', () => 0.5, usage, {});
        return usage;
    }

    it('spends the die on the card whose PAID line gains most, though it is second in hand', () => {
        const usage = usageOf(['mv-dud', 'mv-prize']);
        expect(usage['mv-prize']?.bottomPlays).toBe(1);
        expect(usage['mv-dud']?.bottomPlays ?? 0).toBe(0);
    });

    it('a card that does not opt in is ranked as before: hand order, the first card takes the die', () => {
        const usage = usageOf(['mv-dud-plain', 'mv-prize-plain']);
        expect(usage['mv-dud-plain']?.bottomPlays).toBe(1);
        expect(usage['mv-prize-plain']?.bottomPlays ?? 0).toBe(0);
    });

    it('a die is not spent on a witnessed card whose PAID line gains nothing', () => {
        const usage = usageOf(['mv-dud']);
        expect(usage['mv-dud']?.bottomPlays ?? 0).toBe(0);
    });
});

describe('probes leave the fight untouched, and the no-op edges hold', () => {
    const PROBED = ['mv-burst', 'mv-tick-5', 'mv-yield', 'mv-plus-3', 'mv-times-2', 'mv-next-radiance', 'mv-all-radiance',
        'mv-max-4', 'mv-full', 'mv-weaken-3', 'mv-return-2', 'mv-heal-5', 'mv-radiance-2'];

    it('valuing or legality-checking a line never changes the state it reads', () => {
        const base = play(play(fight(['mv-mercy-10', 'mv-mercy-5', ...PROBED], { vitae: 50, foeVitae: 200 }), 't0'), 't1');
        const before = JSON.stringify(base);
        for (let i = 0; i < PROBED.length; i++) {
            const uid = `t${i + 2}`;
            programLineValue(base, uid, false, PROGRAM_KIT);
            programLineValue(base, uid, true, PROGRAM_KIT);
            programIllegalReason(base, uid, false, PROGRAM_KIT);
            programIllegalReason(base, uid, true, PROGRAM_KIT);
        }
        expect(JSON.stringify(base)).toBe(before);
        expect(base.program!.mercyCards).toEqual(['mv-mercy-10', 'mv-mercy-5']);
    });

    it('a zero heal heals nothing and says nothing', () => {
        const zero = card('mv-zero', c => { c.heal(0, { exact: true }); c.radiance(0); c.mercy(0); c.maxVitae(0); c.healsPlus(0); c.healsTimes(1); });
        registerSandboxCards([zero]);
        const s = { ...fight([], { vitae: 50 }), hand: [{ uid: 'z', cardId: 'mv-zero' }] };
        const r = playT(s, 'z');
        expect(r.events.filter(e => ['player-healed', 'radiance-struck', 'mercy-added'].includes(e.kind))).toEqual([]);
        expect(r.state.player.maxHealth).toBe(100);
        expect(r.state.program!.heals).toMatchObject({ plus: 0, times: 1 });
    });

    it('a tick of nothing changes nothing; a tick needs a running clock', () => {
        const zero = card('mv-tick-0', c => { c.tickMercy(0); c.tickMercy(-1); });
        registerSandboxCards([zero]);
        const s = play(fight(['mv-mercy-10'], { foeVitae: 200 }), 't0');
        const noClock = { ...withMercy(s, { clock: 0 }), hand: [{ uid: 'z', cardId: 'mv-tick-5' }] };
        const r = playT(noClock, 'z');
        expect(r.events.filter(e => e.kind === 'mercy-ticked' || e.kind === 'mercy-burst')).toEqual([]);
        const r0 = playT({ ...s, hand: [{ uid: 'y', cardId: 'mv-tick-0' }] }, 'y');
        expect(mercyOf(r0.state)).toMatchObject({ total: 10, clock: 3 });
    });

    it('a heal modifier counts only what the heal restores at max VITAE', () => {
        const s = play(fight(['mv-times-2', 'mv-heal-5'], { vitae: 96 }), 't0');
        const r = playT(s, 't1');
        expect(r.state.player.health).toBe(100);
        expect(r.state.program!.heals!.healed).toBe(4);
    });

    it('returning n of 0 returns nothing', () => {
        const zero = card('mv-return-0', c => c.returnMercyCards(0));
        registerSandboxCards([zero]);
        const s = play(fight(['mv-mercy-5'], { foeVitae: 200 }), 't0');
        const r = playT({ ...s, hand: [{ uid: 'y', cardId: 'mv-return-0' }] }, 'y');
        expect(ofKind(r.events, 'cards-retrieved')).toEqual([]);
    });
});
