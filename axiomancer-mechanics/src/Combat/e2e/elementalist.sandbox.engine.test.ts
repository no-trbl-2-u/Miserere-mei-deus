/**
 * Hermetic E2E — the Elementalist sandbox (branch sandbox/elementalist-sims only).
 *
 * Pins the prototype weather to T's rulings of 2026-10-24
 * (plan/card-ledger/rehearsal-elementalist.md, "The weather"; the sim brief):
 *   · INFERNO burns both sides: the foe its whole INFERNO at the start of its
 *     turn, you half of it (rounded down) at the start of yours; plain loss,
 *     and yours can kill you. A foe-only line burns only the foe.
 *   · BLIZZARD takes n off each foe hit; FROZEN when the BLIZZARD is at least
 *     every hit: the next DEAL is doubled, then FROZEN ends and BLIZZARD stays.
 *   · STORM: the foe loses n at the start of its turn, then it grows by 1
 *     (E-06 in play: by 2).
 *   · Drift: INFERNO and BLIZZARD drop by 1 each round after the round they
 *     were applied in; STORM never drifts. Stacks add.
 *   · DRAW n draws n now.
 * And that the 30 cards register, carry the colour table, and the 20-card
 * test deck holds 7 red, 7 blue, 6 purple.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { getCardById } from '../../Cards/cards.library';
import { clearSandboxCards } from '../../Cards/cards.sandbox';
import {
    ELEMENTALIST_SLOTS, elementalistColour, elementalistId, elementalistTestDeck, registerElementalistCards,
} from '../../Cards/sandbox/elementalist.cards';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, threatHits,
} from '../combat.engine';
import { foeInferno, yourInferno } from '../combat.elements';
import type { CombatEncounterState } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const id = elementalistId;

function fight(hand: string[], vitae = 100): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    const player = deepClone(Player);
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill(id('M-06'))], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: Math.max(vitae, s.player.maxHealth) },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined).state;

/** The foe's turn, then the round boundary, then your next turn start. */
function nextRound(s: CombatEncounterState): { afterFoe: CombatEncounterState; afterStart: CombatEncounterState } {
    const afterFoe = resolveThreatPhase(s).state;
    const afterStart = startTurn(afterFoe).state;
    return { afterFoe, afterStart };
}

const el = (s: CombatEncounterState) => s.program!.el;

beforeAll(() => registerElementalistCards());
afterAll(() => clearSandboxCards());

describe('the Elementalist sandbox cards', () => {
    it('registers 30 cards, 9 red / 11 blue / 10 purple, and a 7/7/6 test deck', () => {
        expect(ELEMENTALIST_SLOTS).toHaveLength(30);
        const cards = ELEMENTALIST_SLOTS.map(slot => getCardById(id(slot)));
        expect(cards.every(c => c?.program)).toBe(true);
        const by = (c: string) => ELEMENTALIST_SLOTS.filter(slot => elementalistColour(slot) === c).length;
        expect([by('red'), by('blue'), by('purple')]).toEqual([9, 11, 10]);
        const deck = elementalistTestDeck();
        expect(new Set(deck).size).toBe(20);
        const col = (c: string) => deck.filter(d => getCardById(d)?.color === c).length;
        expect([col('body'), col('mind'), col('heart')]).toEqual([7, 7, 6]);
    });
});

describe('INFERNO', () => {
    it('burns the foe in full at its turn start and you by half, rounded down, at yours', () => {
        let s = play(fight([id('E-01')]), 't0', false); // INFERNO 3, GUARD 2
        expect(foeInferno(el(s))).toBe(3);
        expect(yourInferno(el(s))).toBe(1);
        const foeBefore = s.enemy.health;
        const { afterFoe, afterStart } = nextRound(s);
        expect(foeBefore - afterFoe.enemy.health).toBe(3);
        expect(afterFoe.player.health - afterStart.player.health).toBe(1);
        s = afterStart;
        // Applied in round 1: no drift at its end; drops by 1 at the end of round 2.
        expect(foeInferno(el(s))).toBe(3);
        const r3 = nextRound(s).afterStart;
        expect(foeInferno(el(r3))).toBe(2);
    });

    it('a foe-only line burns only the foe; stacks add', () => {
        let s = fight([id('E-08'), id('E-08')]);
        s = play(s, 't0', false);
        s = play(s, 't1', false);
        expect(el(s).infFoe).toBe(4);
        expect(yourInferno(el(s))).toBe(0);
        expect(el(s).blizzard).toBe(4);
    });

    it('your INFERNO can kill you at the start of your turn', () => {
        const s0 = fight([], 3);
        const s = { ...s0, program: { ...s0.program!, el: { ...el(s0), infShared: 10 } } };
        const afterFoe = resolveThreatPhase({ ...s, player: { ...s.player, health: 3 }, guard: 999 }).state;
        expect(afterFoe.player.health).toBe(3);
        const afterStart = startTurn(afterFoe).state;
        expect(afterStart.finalOutcome).toBe('defeat');
    });

    it('Steam turns your INFERNO into foe BLIZZARD and INFERNO', () => {
        const s0 = fight([id('E-08')]);
        const s = { ...s0, program: { ...s0.program!, el: { ...el(s0), infShared: 6 } } };
        const after = play(s, 't0', true);
        expect(yourInferno(el(after))).toBe(0);
        expect(foeInferno(el(after))).toBe(6 + 3);
        expect(el(after).blizzard).toBe(3);
    });
});

describe('BLIZZARD and FROZEN', () => {
    it('takes n off each hit, and FROZEN doubles the next DEAL then ends', () => {
        const s0 = fight([id('P-01'), id('P-01')]);
        const hits = threatHits(s0);
        expect(hits.length).toBeGreaterThan(0);
        const big = Math.max(...hits);
        const s = { ...s0, guard: 0, program: { ...s0.program!, el: { ...el(s0), blizzard: big } } };
        const hpBefore = s.player.health;
        const afterFoe = resolveThreatPhase(s).state;
        expect(afterFoe.player.health).toBe(hpBefore);
        expect(el(afterFoe).frozen).toBe(true);
        const t = startTurn(afterFoe).state;
        const hand = t.hand.filter(h => h.cardId === id('P-01'));
        const foe0 = t.enemy.health;
        const once = play(t, hand[0]!.uid, false);
        const doubled = foe0 - once.enemy.health;
        expect(el(once).frozen).toBe(false);
        expect(el(once).blizzard).toBeGreaterThan(0);
        const twice = play(once, hand[1]!.uid, false);
        expect(doubled).toBe(2 * (once.enemy.health - twice.enemy.health));
    });

    it('drifts down by 1 a round after the round it was applied in', () => {
        let s = play(fight([id('E-04')]), 't0', false); // BLIZZARD 3
        s = nextRound(s).afterStart;
        expect(el(s).blizzard).toBe(3);
        s = nextRound(s).afterStart;
        expect(el(s).blizzard).toBe(2);
    });
});

describe('STORM and DRAW', () => {
    it('the foe loses its STORM at its turn start, then the STORM grows by 1; E-06 adds 1 more', () => {
        let s = play(fight([id('M-07')]), 't0', false); // STORM 2
        const foe0 = s.enemy.health;
        let r = nextRound(s);
        expect(foe0 - r.afterFoe.enemy.health).toBe(2);
        expect(el(r.afterFoe).storm).toBe(3);
        s = play({ ...r.afterStart, hand: [{ uid: 'g', cardId: id('E-06') }] }, 'g', true);
        r = nextRound(s);
        expect(el(r.afterFoe).storm).toBe(5);
    });

    it('DRAW n puts n more cards in hand now', () => {
        const s = fight([id('E-07')]);
        const after = play(s, 't0', false);
        expect(after.hand).toHaveLength(2);
    });
});
