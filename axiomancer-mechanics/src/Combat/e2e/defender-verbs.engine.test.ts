/**
 * Hermetic E2E — the Defender's verbs, reads and triggers (Phase DF1b,
 * acceptance A3).
 *
 * Pins each card-program piece the Defender's 30 cards need to T's rulings of
 * 2026-10-26 (`plan/phases/phase_DF1_defender_trial_set.md`, Sources; the
 * ledger `plan/card-ledger/rehearsal-defender.md`):
 *   · RETRIEVE n: a random card from your discard back to your hand.
 *   · A random EXILED card back into your draw pile (M-07 PAID).
 *   · "If this card is discarded" (M-09): fires on a random discard and on
 *     the scrap, never when the card is played.
 *   · "Discard your hand" (P-07 PAID): a PAID cost refused with no other card.
 *   · GUARD kept through the end of the foe's turn (M-04 PAID).
 *   · "While GUARD holds" (P-08): THORNS deals double on that foe turn while
 *     no hit has got through.
 *   · REFLECT armed for the foe's attack (P-09 PAID): up before the first strike.
 *   · The reads: THORNS, GUARD, REFLECT, damage your DEALs did this turn, hand size.
 *   · Double your THORNS (E-06 PAID); lose VITAE as a self-loss (E-09).
 * And the witness's value of each.
 *
 * The cards here are synthetic test cards in the sandbox registry; the
 * Defender trial set itself lands in DF1d.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { clearSandboxCards, registerSandboxCards } from '../../Cards/cards.sandbox';
import type { Card } from '../../Cards/types';
import type { ProgramCtx, ProgramQuery } from '../../Cards/card-program.types';
import { checkDiscardCost } from '../../Cards/card-rules';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn, threatHits,
    discardCombatCard, programLineBlock, PROGRAM_KIT,
} from '../combat.engine';
import { DISCARD_SHORTFALL_REASON, programLineValue } from '../combat.card-program';
import { scaleFor } from '../stat-scaling';
import type { SpikeState } from '../combat.spikes';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free, extra: Partial<Card['program']> = {}): Card {
    return {
        id, name: id, color: 'any', description: 'A Defender verb test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'self',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid }, ...extra },
    };
}

/** The last read a probe card saw, by name. */
let seen: Partial<ProgramQuery> = {};
const read = (c: ProgramCtx) => { seen = { ...c.q }; };

const CARDS: Card[] = [
    card('dv-retrieve', c => c.retrieve(1), c => c.retrieve(2)),
    card('dv-unexile', c => c.guard(1, { exact: true }), c => c.unexileRandom()),
    card('dv-exile', c => c.guard(1, { exact: true }), c => c.guard(1, { exact: true }), { paid: { text: 'TEST.', run: () => {}, exile: true } }),
    card('dv-rider', c => c.guard(4, { exact: true }), c => c.deal(10, { exact: true }), {
        onDiscard: { text: 'If discarded, THORNS 2', run: c => { c.thorns(2, { exact: true }); } },
    }),
    card('dv-discard-one', c => c.guard(1, { exact: true }), c => { c.discardRandom(1); c.guard(5, { exact: true }); }),
    card('dv-shed', c => c.guard(4, { exact: true }), c => { const k = c.discardHand(); c.thorns(3 * k, { exact: true }); }),
    card('dv-hold', c => c.guard(4, { exact: true }), c => c.holdGuard()),
    card('dv-shell', c => { c.guard(40, { exact: true }); c.thornsDoubleWhileGuardHolds(); }),
    card('dv-riposte', c => c.guard(3, { exact: true }), c => { c.guard(6, { exact: true }); c.reflectOnAttack(50); }),
    card('dv-thorns', c => { c.thorns(3, { exact: true }); }, c => c.doubleThorns()),
    card('dv-deal', c => { c.deal(5, { exact: true }); }),
    card('dv-spite', c => { c.thorns(c.q.dealtThisTurn, { exact: true }); }),
    card('dv-guard-then-read', c => { c.guard(6, { exact: true }); read(c); }),
    card('dv-thorns-then-read', c => { c.thorns(2, { exact: true }); read(c); }),
    card('dv-read', read),
    card('dv-rose', c => { c.loseVitae(3); c.thorns(3); }),
    card('dv-filler', c => { c.guard(1, { exact: true }); }),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

function fight(hand: string[], foeVitae = 500): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: foeVitae, maxHealth: Math.max(foeVitae, 500) };
    let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill('dv-filler')], 7);
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

const sp = (s: CombatEncounterState) => s.program!.spikes;
const struck = (events: readonly CombatEvent[], spike: 'thorns' | 'reflect') =>
    events.flatMap(e => e.kind === 'spike-struck' && e.spike === spike ? [e.amount] : []);
const ids = (s: CombatEncounterState) => s.hand.map(h => h.cardId);

describe('RETRIEVE', () => {
    it('returns a random card from your discard to your hand, with an event', () => {
        const s0 = { ...fight(['dv-retrieve']), discard: ['dv-deal', 'dv-thorns'] };
        const r = playT(s0, 't0', false);
        expect(r.state.hand).toHaveLength(1);
        const back = r.state.hand[0]!.cardId;
        expect(['dv-deal', 'dv-thorns']).toContain(back);
        expect(r.state.discard).toEqual(['dv-deal', 'dv-thorns'].filter(id => id !== back).concat('dv-retrieve'));
        expect(r.events).toContainEqual({ kind: 'cards-retrieved', cardIds: [back] });
    });

    it('takes no more than the discard holds, and does nothing on an empty discard', () => {
        const two = play({ ...fight(['dv-retrieve']), discard: ['dv-deal'] }, 't0', true);
        expect(ids(two)).toEqual(['dv-deal']);
        const none = playT({ ...fight(['dv-retrieve']), discard: [] }, 't0', false);
        expect(none.state.hand).toHaveLength(0);
        expect(none.events.some(e => e.kind === 'cards-retrieved')).toBe(false);
    });

    it('is valued like a DRAW per card the discard can give', () => {
        const s = { ...fight(['dv-retrieve']), discard: ['dv-deal', 'dv-thorns'] };
        expect(programLineValue(s, 't0', false, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue({ ...s, discard: [] }, 't0', false, PROGRAM_KIT)).toBe(0);
    });
});

describe('a random EXILED card back to the draw pile (M-07 PAID)', () => {
    it('moves one exiled card into the draw pile, with an event', () => {
        let s = play(fight(['dv-exile', 'dv-unexile']), 't0', true);
        expect(s.program!.exiled).toEqual(['dv-exile']);
        const pileBefore = s.drawPile.length;
        const r = playT(s, 't1', true);
        s = r.state;
        expect(s.program!.exiled).toEqual([]);
        expect(s.drawPile).toHaveLength(pileBefore + 1);
        expect(s.drawPile).toContain('dv-exile');
        expect(r.events).toContainEqual({ kind: 'card-unexiled', cardId: 'dv-exile' });
    });

    it('does nothing and is worth nothing with no exiled card', () => {
        const s = fight(['dv-unexile']);
        expect(programLineValue(s, 't0', true, PROGRAM_KIT)).toBe(0);
        const after = play(s, 't0', true);
        expect(after.drawPile).toEqual(s.drawPile);
    });
});

describe('"If this card is discarded" (M-09)', () => {
    it('fires when a random discard takes the card', () => {
        const s = play(fight(['dv-discard-one', 'dv-rider']), 't0', true);
        expect(s.discard).toContain('dv-rider');
        expect(sp(s).thorns).toBe(2);
    });

    it('fires on the scrap, beside its Conviction', () => {
        const r = discardCombatCard(fight(['dv-rider']), 't0');
        expect(r.state.discard).toEqual(['dv-rider']);
        expect(r.state.conviction).toBe(1);
        expect(sp(r.state).thorns).toBe(2);
        expect(r.events).toContainEqual({ kind: 'spikes-changed', spike: 'thorns', from: 0, to: 2 });
    });

    it('does not fire when the card is played, on either line', () => {
        expect(sp(play(fight(['dv-rider']), 't0', false)).thorns).toBe(0);
        expect(sp(play(fight(['dv-rider']), 't0', true)).thorns).toBe(0);
    });

    it('a scrapped card with no rider changes nothing but the Conviction', () => {
        const r = discardCombatCard(fight(['dv-filler']), 't0');
        expect(sp(r.state).thorns).toBe(0);
        expect(r.events.map(e => e.kind)).toEqual(['conviction-gained']);
    });

    it('the witness counts a rider against the cost of discarding it', () => {
        const withRider = programLineValue(fight(['dv-discard-one', 'dv-rider']), 't0', true, PROGRAM_KIT);
        const plain = programLineValue(fight(['dv-discard-one', 'dv-filler']), 't0', true, PROGRAM_KIT);
        expect(withRider).toBeGreaterThan(plain);
    });
});

describe('"Discard your hand" (P-07 PAID)', () => {
    it('discards every other card, fires each rider, and pays out per card', () => {
        const s = play(fight(['dv-shed', 'dv-filler', 'dv-rider']), 't0', true);
        expect(s.hand).toHaveLength(0);
        expect(s.discard).toEqual(expect.arrayContaining(['dv-filler', 'dv-rider']));
        expect(sp(s).thorns).toBe(2 + 3 * 2);
    });

    it('PAID is refused with no other card in hand; FREE plays', () => {
        const s = fight(['dv-shed']);
        expect(programLineBlock(s, 't0', true)).toBe(DISCARD_SHORTFALL_REASON);
        expect(programLineBlock(s, 't0', false)).toBeNull();
        const r = playT(s, 't0', true);
        expect(r.state.hand).toEqual(s.hand);
        expect(r.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
        expect(play(s, 't0', false).guard).toBe(4);
    });

    it('is a discard cost the card rule polices: FREE may not discard the hand', () => {
        const bad = card('dv-bad-shed', c => { c.discardHand(); });
        expect(checkDiscardCost([bad]).map(v => v.detail)).toEqual(['FREE discards']);
        expect(checkDiscardCost([CARDS.find(c => c.id === 'dv-shed')!])).toEqual([]);
    });
});

describe('GUARD kept through the foe turn (M-04 PAID)', () => {
    it('the GUARD left after the foe turn carries into your next turn, then goes after the next foe turn', () => {
        let s = play(fight(['dv-hold']), 't0', true);
        s = { ...s, guard: 200 };
        const total = threatHits(s).reduce((a, b) => a + b, 0);
        const foe = resolveThreatPhase(s).state;
        expect(foe.guard).toBe(200 - total);
        const next = startTurn(foe).state;
        expect(next.guard).toBe(200 - total);
        expect(resolveThreatPhase(next).state.guard).toBe(0);
    });

    it('without it, GUARD is spent at the end of the foe turn as before', () => {
        const s = { ...play(fight(['dv-hold']), 't0', false), guard: 200 };
        expect(resolveThreatPhase(s).state.guard).toBe(0);
    });

    it('the witness values it by the GUARD that would be left', () => {
        const s = fight(['dv-hold']);
        expect(programLineValue({ ...s, guard: 200 }, 't0', true, PROGRAM_KIT)).toBeGreaterThan(0);
        expect(programLineValue({ ...s, guard: 0 }, 't0', true, PROGRAM_KIT)).toBe(0);
    });
});

describe('"While GUARD holds" (P-08)', () => {
    it('doubles every THORNS hit on that foe turn while no hit gets through', () => {
        const s = play(withSpikes(fight(['dv-shell']), { thorns: 3 }), 't0', false);
        const foe = resolveThreatPhase(s);
        expect(foe.state.player.health).toBe(s.player.health);
        expect(struck(foe.events, 'thorns')).toEqual(threatHits(s).map(() => 6));
    });

    it('stops doubling once a hit gets through', () => {
        let s = play(withSpikes(fight(['dv-shell']), { thorns: 3 }), 't0', false);
        s = { ...s, guard: 0 };
        const foe = resolveThreatPhase(s);
        expect(foe.state.player.health).toBeLessThan(s.player.health);
        expect(struck(foe.events, 'thorns')).toEqual(threatHits(s).map(() => 3));
    });

    it('lasts only the foe turn of the round it was played in', () => {
        const s = play(withSpikes(fight(['dv-shell']), { thorns: 9 }), 't0', false);
        const next = startTurn(resolveThreatPhase(s).state).state;
        const later = resolveThreatPhase({ ...next, guard: 500 });
        const thorns = sp(next).thorns;
        expect(struck(later.events, 'thorns')).toEqual(threatHits(next).map(() => thorns));
    });
});

describe('REFLECT armed for the foe attack (P-09 PAID)', () => {
    it('is up before the first strike, so it reflects that strike too', () => {
        const s = play(fight(['dv-riposte']), 't0', true);
        expect(sp(s).reflect).toBe(0);
        const foe = resolveThreatPhase(s);
        const hits = threatHits(s);
        expect(struck(foe.events, 'reflect')).toEqual(hits.map(h => Math.round(h * 0.5)));
        expect(foe.events).toContainEqual({ kind: 'spikes-changed', spike: 'reflect', from: 0, to: 50 });
        expect(sp(foe.state).reflectOnAttack ?? 0).toBe(0);
    });

    it('adds to a REFLECT already up and refreshes it', () => {
        const s = play(withSpikes(fight(['dv-riposte']), { reflect: 25, reflectTurns: 1 }), 't0', true);
        const foe = resolveThreatPhase(s);
        expect(struck(foe.events, 'reflect')[0]).toBe(Math.round(threatHits(s)[0]! * 0.75));
    });

    it('an arming left from an earlier round does nothing', () => {
        const s = withSpikes(fight([]), { reflectOnAttack: 50, reflectOnAttackRound: 99 });
        const foe = resolveThreatPhase(s);
        expect(struck(foe.events, 'reflect')).toEqual([]);
        expect(sp(foe.state).reflectOnAttack ?? 0).toBe(0);
    });

    it('the witness values it when the foe telegraphs an attack', () => {
        expect(programLineValue(fight(['dv-riposte']), 't0', true, PROGRAM_KIT))
            .toBeGreaterThan(programLineValue(fight(['dv-riposte']), 't0', false, PROGRAM_KIT));
    });
});

describe('the reads', () => {
    it('THORNS and REFLECT read the ledger, an earlier verb on the line included', () => {
        play(withSpikes(fight(['dv-thorns-then-read']), { thorns: 4, reflect: 30, reflectTurns: 2 }), 't0', false);
        expect(seen.thorns).toBe(6);
        expect(seen.reflect).toBe(30);
    });

    it('GUARD reads your GUARD, an earlier GUARD on the line included', () => {
        play({ ...fight(['dv-guard-then-read']), guard: 5 }, 't0', false);
        expect(seen.guard).toBe(11);
        programLineValue({ ...fight(['dv-guard-then-read']), guard: 5 }, 't0', false, PROGRAM_KIT);
        expect(seen.guard).toBe(11);
    });

    it('hand size counts the other cards in hand', () => {
        play(fight(['dv-read', 'dv-filler', 'dv-filler']), 't0', false);
        expect(seen.handSize).toBe(2);
    });

    it('damage your DEALs did this turn adds up across plays and resets at your turn start', () => {
        let s = play(fight(['dv-deal', 'dv-deal', 'dv-spite']), 't0', false);
        s = play(s, 't1', false);
        expect(s.program!.dealtThisTurn).toBe(10);
        s = play(s, 't2', false);
        expect(sp(s).thorns).toBe(10);
        const next = startTurn(resolveThreatPhase(s).state).state;
        expect(next.program!.dealtThisTurn).toBe(0);
    });

    it('THORNS and REFLECT hits are not DEALs this turn: the spikes leave the read alone', () => {
        const s = withSpikes(fight([]), { thorns: 5 });
        const foe = resolveThreatPhase(s).state;
        expect(foe.program!.dealtThisTurn ?? 0).toBe(0);
    });
});

describe('double your THORNS (E-06 PAID)', () => {
    it('adds your THORNS again, unscaled', () => {
        const s = play(withSpikes(fight(['dv-thorns']), { thorns: 7 }), 't0', true);
        expect(sp(s).thorns).toBe(14);
    });

    it('does nothing with no THORNS', () => {
        const s = play(fight(['dv-thorns']), 't0', true);
        expect(sp(s).thorns).toBe(0);
        expect(programLineValue(fight(['dv-thorns']), 't0', true, PROGRAM_KIT)).toBe(0);
    });
});

describe('lose VITAE as a self-loss (E-09)', () => {
    it('GUARD does not block it, and the round ledger counts it', () => {
        const s0 = { ...fight(['dv-rose']), guard: 50 };
        const r = playT(s0, 't0', false);
        expect(r.state.player.health).toBe(97);
        expect(r.state.guard).toBe(50);
        expect(r.state.program!.lostThisRound).toBe(3);
        expect(r.events).toContainEqual({ kind: 'dot-tick', effectId: 'self-loss', label: 'VITAE lost', amount: 3, target: 'self' });
        expect(sp(r.state).thorns).toBe(scaleFor(3, s0.player.baseStats, 'heart', 'repeating'));
    });

    it('can take your last VITAE', () => {
        const s0 = fight(['dv-rose']);
        const r = play({ ...s0, player: { ...s0.player, health: 2 } }, 't0', false);
        expect(r.player.health).toBe(0);
    });

    it('the witness counts it as a loss, and a lethal one heavily', () => {
        const s0 = fight(['dv-rose']);
        const healthy = programLineValue(s0, 't0', false, PROGRAM_KIT);
        const dying = programLineValue({ ...s0, player: { ...s0.player, health: 2 } }, 't0', false, PROGRAM_KIT);
        expect(dying).toBeLessThan(healthy - 50);
    });
});
