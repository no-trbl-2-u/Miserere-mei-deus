/**
 * THE DEFENDER, SANDBOX (branch sandbox/defender-sims only; never merged).
 *
 * The 30 kept cards of the Defender ballot (`plan/card-ledger/rehearsal-defender.md`,
 * "The kept family, with T's notes applied", T's rulings in the notes, and T's
 * rulings sent to the sims on 2026-10-26) as card programs, for lane-creator
 * step 6. Registered through the sandbox card registry, never `TRIAL_SETS`.
 * Ids are `df-<slot><option>`; T's own M-10 is `df-m-10n`. Names are
 * placeholders ("Defender P-01"); card names are T's (D99).
 *
 * Every printed number is a key in {@link AS_VOTED}, so the harness can run
 * a numbers table with overrides (`--numbers=<file>.json`).
 *
 * Scaling, as live and as T ruled: DEAL body, GUARD and HEAL mind (one-shot),
 * VULNERABLE heart (as the status), THORNS heart (repeating, D110). REFLECT
 * and the derived numbers ("equal to your GUARD", "+1 per THORNS") are
 * unscaled.
 *
 * Colours are T's (2026-10-26): the provisional even split, approved.
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import { DISCARD_WHY } from '../../Combat/combat.defender';
import { registerSandboxCards } from '../cards.sandbox';

export type DefenderNumbers = Record<string, number>;

/** T's numbers as voted, with T's notes and the rulings of 2026-10-26 applied. */
export const AS_VOTED: Readonly<DefenderNumbers> = Object.freeze({
    'P-01.free.deal': 4, 'P-01.free.perThorns': 1, 'P-01.paid.deal': 8, 'P-01.paid.perThorns': 2,
    'P-02.free.guard': 4, 'P-02.paid.discard': 1, 'P-02.paid.guard': 8,
    'P-03.free.vuln': 50, 'P-03.free.vulnTurns': 1, 'P-03.free.deal': 4,
    'P-03.paid.discard': 2, 'P-03.paid.vuln': 150, 'P-03.paid.vulnTurns': 2, 'P-03.paid.deal': 15,
    'P-04.free.reflect': 25, 'P-04.free.thorns': 2, 'P-04.paid.discard': 1, 'P-04.paid.deal': 5, 'P-04.paid.reflect': 75,
    'P-05.free.thorns': 2, 'P-05.paid.thorns': 3, 'P-05.paid.guardPerThorns': 2,
    'P-06.paid.mult': 2,
    'P-07.free.guard': 4, 'P-07.paid.thornsPerCard': 3,
    'P-08.free.guard': 4, 'P-08.paid.guard': 9,
    'P-09.free.guard': 3, 'P-09.free.reflect': 25, 'P-09.paid.guard': 6, 'P-09.paid.reflect': 50,
    'E-01.free.guard': 4, 'E-01.free.thorns': 1, 'E-01.paid.discard': 1, 'E-01.paid.guard': 10, 'E-01.paid.thorns': 2,
    'E-02.free.guard': 3, 'E-02.free.thorns': 1, 'E-02.paid.guard': 5, 'E-02.paid.thorns': 3,
    'E-03.free.reflect': 50, 'E-03.paid.reflect': 100,
    'E-04.free.deal': 3, 'E-04.free.guard': 2, 'E-04.free.thorns': 1,
    'E-04.paid.deal': 5, 'E-04.paid.guard': 4, 'E-04.paid.thorns': 2,
    'E-05.free.thorns': 3, 'E-05.paid.discard': 2, 'E-05.paid.thorns': 8,
    'E-06.free.thorns': 3,
    'E-07.free.deal': 2, 'E-07.free.thorns': 2, 'E-07.paid.discard': 1, 'E-07.paid.deal': 10, 'E-07.paid.thorns': 5,
    'E-08.free.guard': 3, 'E-08.free.reflect': 25, 'E-08.paid.guard': 6, 'E-08.paid.reflect': 50,
    'E-09.lose': 3, 'E-09.thorns': 3,
    'E-10.free.draw': 1, 'E-10.free.thorns': 1, 'E-10.paid.draw': 2, 'E-10.paid.thorns': 2,
    'M-01.free.draw': 1, 'M-01.free.guard': 4, 'M-01.paid.draw': 2, 'M-01.paid.guard': 8,
    'M-03.free.guard': 3, 'M-03.free.vuln': 50, 'M-03.free.vulnTurns': 1,
    'M-03.paid.guard': 6, 'M-03.paid.vuln': 75, 'M-03.paid.vulnTurns': 2,
    'M-04.free.guard': 4,
    'M-05.free.conviction': 1, 'M-05.free.thorns': 1, 'M-05.paid.discard': 1, 'M-05.paid.conviction': 3, 'M-05.paid.thorns': 2,
    'M-06.draw': 1,
    'M-07.free.retrieve': 1,
    'M-08.free.deal': 2, 'M-08.free.thorns': 2, 'M-08.paid.deal': 4, 'M-08.paid.thorns': 2, 'M-08.paid.draw': 1,
    'M-09.free.guard': 4, 'M-09.paid.deal': 10, 'M-09.paid.guard': 4, 'M-09.onDiscard.thorns': 2,
    'M-10.reflect': 15,
});

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

interface Entry {
    slot: string;
    option: string;
    type: CardType;
    color: CardAspect;
    program: (n: (k: string) => number) => CardProgram;
}

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

/** A PAID line that discards `k` cards at random: refused with fewer other cards in hand. */
const discards = (k: number): Partial<ProgramLine> => ({
    requires: { test: q => q.handSize >= k, why: DISCARD_WHY },
});

const turnGlobal = (text: string, body: (c: ProgramCtx) => void): CardProgram => ({
    global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c) },
});

const ENTRIES: Entry[] = [
    // ── PAYOFF ──
    { slot: 'P-01', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 4, +1 per THORNS you have.', c => { c.deal(n('P-01.free.deal'), { plus: n('P-01.free.perThorns') * c.q.thorns }); }),
        paid: L('DEAL 8, +2 per THORNS you have.', c => { c.deal(n('P-01.paid.deal'), { plus: n('P-01.paid.perThorns') * c.q.thorns }); }) }) },
    { slot: 'P-02', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 4.', c => { c.guard(n('P-02.free.guard')); }),
        paid: L('Discard 1 card at random. GUARD 8, then DEAL equal to your GUARD.', c => {
            c.discardRandom(n('P-02.paid.discard')); c.guard(n('P-02.paid.guard'));
            const g = c.q.guard; if (g > 0) c.deal(g, { exact: true });
        }, discards(n('P-02.paid.discard'))) }) },
    { slot: 'P-03', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L('VULNERABLE +50% for 1 turn, then DEAL 4.', c => {
            c.vulnerable(n('P-03.free.vuln'), n('P-03.free.vulnTurns')); c.deal(n('P-03.free.deal'));
        }),
        paid: L('Discard 2 cards at random. VULNERABLE +150% for 2 turns, then DEAL 15.', c => {
            c.discardRandom(n('P-03.paid.discard'));
            c.vulnerable(n('P-03.paid.vuln'), n('P-03.paid.vulnTurns')); c.deal(n('P-03.paid.deal'));
        }, discards(n('P-03.paid.discard'))) }) },
    { slot: 'P-04', option: 'a', type: 'attack', color: PURPLE, program: n => ({
        free: L('REFLECT 25%, THORNS 2.', c => { c.reflect(n('P-04.free.reflect')); c.thorns(n('P-04.free.thorns')); }),
        paid: L('Discard 1 card at random. DEAL 5, REFLECT 75%.', c => {
            c.discardRandom(n('P-04.paid.discard')); c.deal(n('P-04.paid.deal')); c.reflect(n('P-04.paid.reflect'));
        }, discards(n('P-04.paid.discard'))) }) },
    { slot: 'P-05', option: 'c', type: 'skill', color: PURPLE, program: n => ({
        free: L('THORNS 2, then GUARD equal to your THORNS.', c => { c.thorns(n('P-05.free.thorns')); c.guard(0, { plus: c.q.thorns }); }),
        paid: L('THORNS 3, then GUARD twice your THORNS.', c => {
            c.thorns(n('P-05.paid.thorns')); c.guard(0, { plus: n('P-05.paid.guardPerThorns') * c.q.thorns });
        }) }) },
    { slot: 'P-06', option: 'c', type: 'skill', color: RED, program: n => ({
        free: L("THORNS equal to the damage you've done this turn.", c => { c.thorns(c.q.dealtThisTurn, { exact: true }); }),
        paid: L("THORNS equal to twice the damage you've done this turn.", c => {
            c.thorns(n('P-06.paid.mult') * c.q.dealtThisTurn, { exact: true });
        }) }) },
    // T, 2026-10-26: refused with no other card in hand, as every PAID discard line.
    { slot: 'P-07', option: 'c', type: 'spell', color: PURPLE, program: n => ({
        free: L('GUARD 4.', c => { c.guard(n('P-07.free.guard')); }),
        paid: L('Discard your hand. THORNS 3 for each card discarded. EXILE.', c => {
            const k = c.discardHand(); if (k > 0) c.thorns(n('P-07.paid.thornsPerCard') * k);
        }, { exile: true, ...discards(1) }) }) },
    { slot: 'P-08', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 4. If you took no damage this turn, deal your next THORNS damage twice.', c => {
            c.guard(n('P-08.free.guard')); c.thornsDoubleWhileUnhurt();
        }),
        paid: L('GUARD 9. The same rider.', c => { c.guard(n('P-08.paid.guard')); c.thornsDoubleWhileUnhurt(); }) }) },
    { slot: 'P-09', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 3, REFLECT 25%.', c => { c.guard(n('P-09.free.guard')); c.reflect(n('P-09.free.reflect')); }),
        paid: L('GUARD 6. If the foe attacks on their turn, REFLECT 50% before they DEAL damage.', c => {
            c.guard(n('P-09.paid.guard')); c.reflectOnAttack(n('P-09.paid.reflect'));
        }) }) },
    { slot: 'P-10', option: 'b', type: 'global', color: BLUE, program: () => turnGlobal(
        'GUARD equal to your THORNS.', c => { c.guard(0, { plus: c.q.thorns }); }) },
    // ── ENGINE ──
    { slot: 'E-01', option: 'c', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 4, THORNS 1.', c => { c.guard(n('E-01.free.guard')); c.thorns(n('E-01.free.thorns')); }),
        paid: L('Discard 1 card at random. GUARD 10, THORNS 2.', c => {
            c.discardRandom(n('E-01.paid.discard')); c.guard(n('E-01.paid.guard')); c.thorns(n('E-01.paid.thorns'));
        }, discards(n('E-01.paid.discard'))) }) },
    { slot: 'E-02', option: 'b', type: 'skill', color: PURPLE, program: n => ({
        free: L('GUARD 3, THORNS 1.', c => { c.guard(n('E-02.free.guard')); c.thorns(n('E-02.free.thorns')); }),
        paid: L('GUARD 5, THORNS 3.', c => { c.guard(n('E-02.paid.guard')); c.thorns(n('E-02.paid.thorns')); }) }) },
    { slot: 'E-03', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('REFLECT 50%.', c => { c.reflect(n('E-03.free.reflect')); }),
        paid: L('REFLECT 100%.', c => { c.reflect(n('E-03.paid.reflect')); }) }) },
    { slot: 'E-04', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 3, GUARD 2, THORNS 1.', c => { c.deal(n('E-04.free.deal')); c.guard(n('E-04.free.guard')); c.thorns(n('E-04.free.thorns')); }),
        paid: L('DEAL 5, GUARD 4, THORNS 2.', c => { c.deal(n('E-04.paid.deal')); c.guard(n('E-04.paid.guard')); c.thorns(n('E-04.paid.thorns')); }) }) },
    { slot: 'E-05', option: 'c', type: 'spell', color: PURPLE, program: n => ({
        free: L('THORNS 3.', c => { c.thorns(n('E-05.free.thorns')); }),
        paid: L('Discard 2 cards at random. THORNS 8. EXILE.', c => {
            c.discardRandom(n('E-05.paid.discard')); c.thorns(n('E-05.paid.thorns'));
        }, { exile: true, ...discards(n('E-05.paid.discard')) }) }) },
    { slot: 'E-06', option: 'c', type: 'spell', color: PURPLE, program: n => ({
        free: L('THORNS 3.', c => { c.thorns(n('E-06.free.thorns')); }),
        paid: L('Double your THORNS. EXILE.', c => { c.doubleThorns(); }, { exile: true }) }) },
    { slot: 'E-07', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 2, THORNS 2.', c => { c.deal(n('E-07.free.deal')); c.thorns(n('E-07.free.thorns')); }),
        paid: L('Discard 1 card at random. DEAL 10, THORNS 5.', c => {
            c.discardRandom(n('E-07.paid.discard')); c.deal(n('E-07.paid.deal')); c.thorns(n('E-07.paid.thorns'));
        }, discards(n('E-07.paid.discard'))) }) },
    { slot: 'E-08', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 3, REFLECT 25%.', c => { c.guard(n('E-08.free.guard')); c.reflect(n('E-08.free.reflect')); }),
        paid: L('GUARD 6, REFLECT 50%.', c => { c.guard(n('E-08.paid.guard')); c.reflect(n('E-08.paid.reflect')); }) }) },
    { slot: 'E-09', option: 'c', type: 'global', color: PURPLE, program: n => turnGlobal(
        'lose 3 VITAE, THORNS 3.', c => { c.loseVitae(n('E-09.lose')); c.thorns(n('E-09.thorns')); }) },
    { slot: 'E-10', option: 'c', type: 'skill', color: RED, program: n => ({
        free: L('DRAW 1, THORNS 1.', c => { c.draw(n('E-10.free.draw')); c.thorns(n('E-10.free.thorns')); }),
        paid: L('DRAW 2, THORNS 2.', c => { c.draw(n('E-10.paid.draw')); c.thorns(n('E-10.paid.thorns')); }) }) },
    // ── MISC ──
    { slot: 'M-01', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('DRAW 1, GUARD 4.', c => { c.draw(n('M-01.free.draw')); c.guard(n('M-01.free.guard')); }),
        paid: L('DRAW 2, GUARD 8.', c => { c.draw(n('M-01.paid.draw')); c.guard(n('M-01.paid.guard')); }) }) },
    { slot: 'M-02', option: 'b', type: 'skill', color: BLUE, program: () => ({
        free: L('HEAL equal to your GUARD.', c => { c.heal(0, { plus: c.q.guard }); }),
        paid: L('HEAL equal to your GUARD + your THORNS.', c => { c.heal(0, { plus: c.q.guard + c.q.thorns }); }) }) },
    { slot: 'M-03', option: 'b', type: 'skill', color: RED, program: n => ({
        free: L('GUARD 3, VULNERABLE +50% for 1 turn.', c => { c.guard(n('M-03.free.guard')); c.vulnerable(n('M-03.free.vuln'), n('M-03.free.vulnTurns')); }),
        paid: L('GUARD 6, VULNERABLE +75% for 2 turns.', c => { c.guard(n('M-03.paid.guard')); c.vulnerable(n('M-03.paid.vuln'), n('M-03.paid.vulnTurns')); }) }) },
    { slot: 'M-04', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 4.', c => { c.guard(n('M-04.free.guard')); }),
        paid: L("You don't lose your GUARD at the end of the enemy's turn this turn.", c => { c.holdGuard(); }) }) },
    { slot: 'M-05', option: 'c', type: 'skill', color: RED, program: n => ({
        free: L('Gain 1 Conviction. THORNS 1.', c => { c.conviction(n('M-05.free.conviction')); c.thorns(n('M-05.free.thorns')); }),
        paid: L('Discard 1 card at random. Gain 3 Conviction. THORNS 2.', c => {
            c.discardRandom(n('M-05.paid.discard')); c.conviction(n('M-05.paid.conviction')); c.thorns(n('M-05.paid.thorns'));
        }, discards(n('M-05.paid.discard'))) }) },
    { slot: 'M-06', option: 'b', type: 'global', color: PURPLE, program: n => turnGlobal(
        'DRAW 1.', c => { c.draw(n('M-06.draw')); }) },
    { slot: 'M-07', option: 'c', type: 'skill', color: PURPLE, program: n => ({
        free: L('RETRIEVE 1.', c => { c.retrieve(n('M-07.free.retrieve')); }),
        paid: L('Return a random exiled card to your draw pile.', c => { c.unexileRandom(); }) }) },
    { slot: 'M-08', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 2, THORNS 2.', c => { c.deal(n('M-08.free.deal')); c.thorns(n('M-08.free.thorns')); }),
        paid: L('DEAL 4, THORNS 2, DRAW 1.', c => { c.deal(n('M-08.paid.deal')); c.thorns(n('M-08.paid.thorns')); c.draw(n('M-08.paid.draw')); }) }) },
    // The rider is a card property: it fires on a random discard and on a scrap (T, 2026-10-26).
    { slot: 'M-09', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L('GUARD 4.', c => { c.guard(n('M-09.free.guard')); }),
        paid: L('DEAL 10, GUARD 4.', c => { c.deal(n('M-09.paid.deal')); c.guard(n('M-09.paid.guard')); }),
        onDiscard: { thorns: n('M-09.onDiscard.thorns') } }) },
    { slot: 'M-10', option: 'new', type: 'global', color: PURPLE, program: n => turnGlobal(
        'REFLECT 15%.', c => { c.reflect(n('M-10.reflect')); }) },
];

export const DEFENDER_SLOTS: readonly string[] = ENTRIES.map(e => e.slot);

const idOf = (e: Entry): string => `df-${e.slot.toLowerCase()}${e.option === 'new' ? 'n' : e.option}`;

/** The card id of a ledger slot. */
export function defenderId(slot: string): string {
    const e = ENTRIES.find(x => x.slot === slot);
    if (!e) throw new Error(`no Defender slot ${slot}`);
    return idOf(e);
}

export function defenderColour(slot: string): string {
    const c = ENTRIES.find(x => x.slot === slot)!.color;
    return c === RED ? 'red' : c === BLUE ? 'blue' : 'purple';
}

/** T's test deck (2026-10-26): every Global and every Spell; 7 red, 6 blue, 7 purple. */
export const TEST_DECK_SLOTS: readonly string[] = [
    'P-01', 'P-03', 'P-06', 'E-04', 'E-07', 'M-08', 'M-09',
    'P-02', 'P-08', 'P-10', 'E-01', 'E-03', 'M-01',
    'P-07', 'E-05', 'E-06', 'E-09', 'M-06', 'M-07', 'M-10',
];

export const defenderTestDeck = (): string[] => TEST_DECK_SLOTS.map(defenderId);
export const defenderFullDeck = (): string[] => ENTRIES.map(idOf);

export function buildDefenderCards(numbers: DefenderNumbers): Card[] {
    const n = (k: string): number => {
        const v = numbers[k];
        if (v === undefined) throw new Error(`no Defender number ${k}`);
        return v;
    };
    return ENTRIES.map(e => ({
        id: idOf(e),
        name: `Defender ${e.slot}`,
        color: e.color,
        description: `Defender sandbox card (${e.slot}).`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.type === 'attack' ? 'enemy' : 'self',
        program: e.program(n),
        addedIn: '2026-10-26',
        tags: ['defender', 'sandbox'],
    } as Card));
}

/** Registers the 30 cards in the sandbox registry at `numbers`. */
export function registerDefenderCards(numbers: DefenderNumbers = AS_VOTED): void {
    registerSandboxCards(buildDefenderCards(numbers));
}
