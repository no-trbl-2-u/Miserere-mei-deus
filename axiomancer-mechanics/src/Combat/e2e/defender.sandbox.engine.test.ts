/**
 * Hermetic E2E — the Defender's spikes (branch sandbox/defender-sims only).
 *
 * Pins the sims' rules (`plan/card-ledger/defender-sims.md`, "The setup"):
 *   · THORNS n: each foe strike deals n back, per strike; a DEAL; drops by 1
 *     each round after the round it was applied in.
 *   · REFLECT n%: each strike sends n% of its damage before GUARD back; it
 *     never reduces the damage you take; a new REFLECT adds and refreshes to
 *     2 turns.
 *   · A PAID line that discards is refused with too few other cards; a
 *     discarded M-09 gains THORNS, on a random discard and on a scrap.
 *   · M-04 PAID holds your GUARD through one foe turn; E-09 loses VITAE.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx } from '../../Cards/card-program.types';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, threatHits,
    discardCombatCard,
} from '../combat.engine';
import { DISCARD_WHY } from '../combat.defender';
import { buildDefenderCards, AS_VOTED, defenderId } from '../../Cards/sandbox/defender.cards';
import type { CombatEncounterState } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A Defender test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('dx-thorns', c => { c.thorns(4, { exact: true }); }),
    card('dx-reflect', c => c.reflect(50), c => c.reflect(25)),
    card('dx-filler', () => { /* nothing */ }),
    ...buildDefenderCards({ ...AS_VOTED }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

function fight(hand: string[]): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill('dx-filler')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: 300, maxHealth: 300 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined);
const df = (s: CombatEncounterState) => s.program!.df;
const strikes = (s: CombatEncounterState) => threatHits(s);

describe('THORNS', () => {
    it('deals n back per foe strike, and drops by 1 a round after the round it was applied in', () => {
        const s = play(fight(['dx-thorns']), 't0', false).state;
        expect(df(s).thorns).toBe(4);
        const hits = strikes(s);
        expect(hits.length).toBeGreaterThan(0);
        const foe = resolveThreatPhase(s).state;
        expect(s.enemy.health - foe.enemy.health).toBe(4 * hits.length);
        expect(df(foe).thorns).toBe(4);
        const next = resolveThreatPhase(startTurn(foe).state).state;
        expect(df(next).thorns).toBe(3);
    });
});

describe('REFLECT', () => {
    it('sends n% of each strike back and never reduces the damage you take', () => {
        const base = fight(['dx-filler']);
        const plain = resolveThreatPhase(base).state;
        const taken = base.player.health - plain.player.health;
        expect(taken).toBeGreaterThan(0);
        const r = play(fight(['dx-reflect']), 't0', false).state;
        const after = resolveThreatPhase(r).state;
        expect(r.player.health - after.player.health).toBe(taken);
        const hits = strikes(r);
        expect(r.enemy.health - after.enemy.health).toBe(hits.reduce((a, h) => a + Math.round(h * 0.5), 0));
    });

    it('adds and refreshes to 2 turns', () => {
        let s = play(fight(['dx-reflect', 'dx-reflect']), 't0', false).state;
        expect(df(s)).toMatchObject({ reflect: 50, reflectTurns: 2 });
        s = startTurn(resolveThreatPhase(s).state).state;
        expect(df(s)).toMatchObject({ reflect: 50, reflectTurns: 1 });
        s = play(s, 't1', true).state;
        expect(df(s)).toMatchObject({ reflect: 75, reflectTurns: 2 });
    });
});

describe('the discard', () => {
    it('refuses a PAID discard line with too few other cards; FREE still plays', () => {
        const p03 = defenderId('P-03');
        const alone = fight([p03, 'dx-filler']);
        const refused = play(alone, 't0', true);
        expect(refused.events.some(e => e.kind === 'effect-fizzled' && 'message' in e && e.message === DISCARD_WHY)).toBe(true);
        expect(play(alone, 't0', false).events.some(e => e.kind === 'effect-fizzled')).toBe(false);
        const p07 = defenderId('P-07');
        expect(play(fight([p07]), 't0', true).events.some(e => e.kind === 'effect-fizzled')).toBe(true);
    });

    it('fires M-09 on a random discard and on a scrap', () => {
        const m09 = defenderId('M-09');
        const s = play(fight([defenderId('E-07'), m09]), 't0', true).state;
        expect(s.discard).toContain(m09);
        expect(df(s).thorns).toBeGreaterThan(0);
        const scrapped = discardCombatCard({ ...fight([m09]), phase: 'phase-play' }, 't0').state;
        expect(df(scrapped).thorns).toBeGreaterThan(0);
    });
});

describe('the riders', () => {
    it('M-04 PAID holds the GUARD left after the foe turn', () => {
        const s0 = { ...fight([defenderId('M-04')]), guard: 500 };
        const held = resolveThreatPhase(play(s0, 't0', true).state).state;
        expect(held.guard).toBeGreaterThan(0);
        const lost = resolveThreatPhase(play(s0, 't0', false).state).state;
        expect(lost.guard).toBe(0);
    });

    it('E-09 loses VITAE at your turn start (not blocked)', () => {
        const s = play(fight([defenderId('E-09')]), 't0', true).state;
        const foe = resolveThreatPhase(s).state;
        const start = startTurn(foe).state;
        expect(foe.player.health - start.player.health).toBe(3);
        expect(df(start).thorns).toBeGreaterThan(0);
    });
});
