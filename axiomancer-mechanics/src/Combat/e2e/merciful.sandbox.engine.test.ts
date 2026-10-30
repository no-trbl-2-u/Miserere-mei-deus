/**
 * Hermetic E2E — the Merciful's RADIANCE and MERCY (branch sandbox/merciful-sims only).
 *
 * Pins the sims' rules (`plan/card-ledger/merciful-sims.md`, "The setup"):
 *   · RADIANCE n: HEAL n, then DEAL what that heal restored (0 at full VITAE); a DEAL.
 *   · MERCY n: heal the foe n, capped at its max, the excess adding to its MERCY;
 *     n adds to the total; the first MERCY starts a 3-turn clock that a new
 *     MERCY does not reset; at the start of the foe's turn the clock runs out
 *     and MERCY bursts for twice the total (a DEAL); the total clears and the
 *     next MERCY starts a fresh clock.
 *   · P-03b PAID bursts at once after its MERCY 15 and EXILEs; P-05a PAID
 *     bursts three times the total; P-05a FREE ticks the clock.
 *   · E-03b and E-06a change this turn's heals; M-08a cuts the foe's next
 *     attack; M-09c returns the last MERCY card from the discard.
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
} from '../combat.engine';
import { buildMercifulCards, AS_VOTED, mercifulId } from '../../Cards/sandbox/merciful.cards';
import type { CombatEncounterState } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A Merciful test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('mx-mercy', c => { c.mercy!(10, { exact: true }); }),
    card('mx-vuln', c => { c.vulnerable(100, 2); }),
    card('mx-heal', c => { c.heal(6, { exact: true }); }),
    card('mx-filler', () => { /* nothing */ }),
    ...buildMercifulCards({ ...AS_VOTED }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

/** A fight with `hand` in hand, the player at `vitae` of 300, the foe at `foe` of 500. */
function fight(hand: string[], vitae = 300, foe = 500): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: foe, maxHealth: 500 };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill('mx-filler'), mercifulId('P-01')], 7);
    s = rollEncounterDice(s).state;
    s = startTurn(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: 300 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined);
const mc = (s: CombatEncounterState) => s.program!.mc!;
/** The foe's turn, then your next turn starts (the hand is not touched). */
const foeTurn = (s: CombatEncounterState) => {
    const after = resolveThreatPhase(s).state;
    const next = startTurn(after).state;
    return { after, next: { ...next, hand: s.hand, dice: [{ ...WILD }] } };
};

describe('RADIANCE', () => {
    it('HEALs n, then DEALs what that heal restored', () => {
        const s = fight([mercifulId('P-01')], 290);
        const after = play(s, 't0', true).state; // RADIANCE 7 (Heart 5: unscaled)
        expect(after.player.health).toBe(297);
        expect(s.enemy.health - after.enemy.health).toBe(7);
    });

    it('hits only what it actually healed, and 0 at full VITAE', () => {
        const part = play(fight([mercifulId('P-01')], 296), 't0', true).state;
        expect(part.player.health).toBe(300);
        expect(500 - part.enemy.health).toBe(4);
        const full = play(fight([mercifulId('P-01')], 300), 't0', true).state;
        expect(full.enemy.health).toBe(500);
    });

    it('is a DEAL: VULNERABLE boosts the hit', () => {
        let s = fight(['mx-vuln', mercifulId('P-01')], 290);
        s = play(s, 't0', false).state;
        const after = play(s, 't1', true).state;
        expect(s.enemy.health - after.enemy.health).toBe(14);
    });
});

describe('MERCY', () => {
    it('heals the foe, the excess past its max adding to the total, and the total grows by n', () => {
        const s = play(fight(['mx-mercy'], 300, 495), 't0', false).state;
        expect(s.enemy.health).toBe(500);
        // 5 healed, 5 past the max: the total is 10 + 5.
        expect(mc(s).mercy).toBe(15);
        expect(mc(s).clock).toBe(3);
    });

    it('bursts for twice the total at the start of the third foe turn; a new MERCY adds and keeps the clock', () => {
        let s = play(fight(['mx-mercy', 'mx-mercy'], 300, 400), 't0', false).state;
        expect(s.enemy.health).toBe(410);
        let t = foeTurn(s);
        expect(mc(t.after).clock).toBe(2);
        expect(t.after.enemy.health).toBe(410);
        s = play(t.next, 't1', false).state; // a second MERCY 10, with 2 foe turns left
        expect(mc(s).mercy).toBe(20);
        expect(mc(s).clock).toBe(2);
        t = foeTurn(s);
        expect(mc(t.after).clock).toBe(1);
        const hp = t.after.enemy.health;
        t = foeTurn(t.next);
        expect(hp - t.after.enemy.health).toBe(40);
        expect(mc(t.after).mercy).toBe(0);
        expect(mc(t.after).clock).toBe(0);
        // The next MERCY starts a fresh clock.
        const again = play({ ...t.next, hand: [{ uid: 'z', cardId: 'mx-mercy' }] }, 'z', false).state;
        expect(mc(again).clock).toBe(3);
    });

    it('P-03b PAID: MERCY 15, then the burst now, and the card is EXILED', () => {
        const s = fight([mercifulId('P-03')], 300, 400);
        const after = play(s, 't0', true).state;
        // MERCY 15 heals 15 (415), then twice 15 comes off at once.
        expect(after.enemy.health).toBe(415 - 30);
        expect(mc(after).mercy).toBe(0);
        expect(after.program!.exiled).toContain(mercifulId('P-03'));
    });

    it('P-05a: FREE ticks the clock down 1; PAID bursts three times the total now', () => {
        let s = play(fight(['mx-mercy', mercifulId('P-05'), mercifulId('P-05')], 300, 400), 't0', false).state;
        s = play(s, 't1', false).state;
        expect(mc(s).clock).toBe(2);
        const hp = s.enemy.health;
        s = play(s, 't2', true).state;
        expect(hp - s.enemy.health).toBe(30);
        expect(mc(s).mercy).toBe(0);
    });
});

describe('the heal modifiers and the Misc', () => {
    it('E-03b: FREE heals +3 this turn; PAID heals three times as much', () => {
        let s = fight([mercifulId('E-03'), 'mx-heal'], 200);
        s = play(s, 't0', false).state;
        s = play(s, 't1', false).state;
        expect(s.player.health).toBe(209);
        let p = fight([mercifulId('E-03'), 'mx-heal'], 200);
        p = play(p, 't0', true).state;
        p = play(p, 't1', false).state;
        expect(p.player.health).toBe(218);
    });

    it('E-06a: FREE makes the next HEAL a RADIANCE; PAID makes every HEAL a RADIANCE that deals double', () => {
        let s = fight([mercifulId('E-06'), 'mx-heal', 'mx-heal'], 200);
        s = play(s, 't0', false).state;
        s = play(s, 't1', false).state;
        expect(500 - s.enemy.health).toBe(6);
        s = play(s, 't2', false).state;
        expect(500 - s.enemy.health).toBe(6);
        let p = fight([mercifulId('E-06'), 'mx-heal', mercifulId('P-01')], 200);
        p = play(p, 't0', true).state;
        p = play(p, 't1', false).state;
        p = play(p, 't2', false).state; // RADIANCE 3, doubled
        expect(500 - p.enemy.health).toBe(12 + 6);
    });

    it("M-08a: with MERCY on the foe, its next attack deals 2 less", () => {
        const base = fight(['mx-filler'], 300);
        const hits = threatHits(base);
        expect(hits.length).toBeGreaterThan(0);
        const plain = resolveThreatPhase(base).state;
        let s = play(fight(['mx-mercy', mercifulId('M-08')], 300), 't0', false).state;
        s = play(s, 't1', false).state;
        const cut = resolveThreatPhase(s).state;
        expect((300 - cut.player.health)).toBe(Math.max(0, (300 - plain.player.health) - 2));
        expect(mc(cut).nextAttackLess).toBe(0);
    });

    it('M-09c returns the last MERCY card you played from the discard', () => {
        let s = fight([mercifulId('E-02'), mercifulId('M-09')], 300);
        s = play(s, 't0', false).state;
        expect(s.discard).toContain(mercifulId('E-02'));
        s = play(s, 't1', false).state;
        expect(s.hand.map(h => h.cardId)).toContain(mercifulId('E-02'));
    });
});
