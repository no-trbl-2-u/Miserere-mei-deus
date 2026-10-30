/**
 * THE MERCIFUL, SANDBOX (branch sandbox/merciful-sims only; never merged).
 *
 * The 29 kept cards of the Merciful ballot (`plan/card-ledger/rehearsal-merciful.md`,
 * "As kept, with T's notes applied", then "Rulings after the vote", which
 * overrides anything earlier) as card programs, for lane-creator step 6.
 * Registered through the sandbox card registry, never `TRIAL_SETS`. Ids are
 * `mc-<slot><option>` (P-06 keeps two: `mc-p-06a`, `mc-p-06c`). Names are
 * placeholders ("Merciful P-01"); card names are T's (D99).
 *
 * Every printed number is a key in {@link AS_VOTED}, so the harness can run a
 * numbers table with overrides (`--numbers=<file>.json`).
 *
 * Scaling, as live and as T ruled: DEAL body, GUARD and HEAL mind (one-shot);
 * MERCY and RADIANCE heart (repeating, as THORNS and LEECH; T: "Heart");
 * LEECH heart. Derived numbers ("equal to the foe's MERCY", "all you healed
 * this turn", "the VITAE you are missing", "+3 to your heals") are unscaled.
 *
 * Not modelled: YIELDING (M-02b's befriend line; its MERCY is), HURRY N (no
 * kept card prints it), the relics.
 *
 * Colours are the session's provisional even split per sub-lane (T splits
 * them at the revisions, D110); they only decide which die pays.
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import { registerSandboxCards } from '../cards.sandbox';

export type MercifulNumbers = Record<string, number>;

/** The ballot's numbers as kept, with T's notes and the rulings of 2026-10-29 applied. */
export const AS_VOTED: Readonly<MercifulNumbers> = Object.freeze({
    'P-01.free.radiance': 3, 'P-01.paid.radiance': 7,
    'P-02.free.radiance': 4, 'P-02.free.guard': 2, 'P-02.paid.radiance': 9, 'P-02.paid.guard': 5,
    'P-03.free.mercy': 5, 'P-03.paid.mercy': 15,
    'P-04.free.deal': 3, 'P-04.free.dealMercy': 6, 'P-04.paid.deal': 6, 'P-04.paid.dealMercy': 12,
    'P-05.free.tick': 1, 'P-05.paid.mult': 3,
    'P-06a.paid.mult': 2, 'P-06c.paid.mult': 2,
    'P-07.free.heal': 2, 'P-07.paid.heal': 4, 'P-07.paid.mult': 2,
    'P-08.free.heal': 3, 'P-08.paid.heal': 6,
    'P-09.free.guard': 2, 'P-09.free.per': 5,
    'P-10.radiance': 5,
    'E-01.free.heal': 2, 'E-01.free.draw': 1, 'E-01.paid.heal': 5, 'E-01.paid.draw': 1,
    'E-02.free.mercy': 2, 'E-02.free.draw': 1, 'E-02.paid.mercy': 4, 'E-02.paid.draw': 1,
    'E-03.free.plus': 3, 'E-03.paid.times': 3,
    'E-04.free.sac': 3, 'E-04.free.draw': 2, 'E-04.paid.sac': 4, 'E-04.paid.draw': 3,
    'E-07.free.deal': 2, 'E-07.free.leech': 1, 'E-07.paid.deal': 4, 'E-07.paid.leech': 2,
    'E-08.free.mercy': 2, 'E-08.free.radiance': 3, 'E-08.paid.mercy': 4, 'E-08.paid.radiance': 6,
    'E-09.mercy': 1, 'E-09.heal': 1,
    'E-10.free.draw': 1, 'E-10.free.heal': 2, 'E-10.paid.draw': 2, 'E-10.paid.heal': 4,
    'M-01.free.guard': 3, 'M-01.free.guardMercy': 5, 'M-01.paid.guard': 7, 'M-01.paid.guardMercy': 11,
    'M-02.free.mercy': 2, 'M-02.paid.mercy': 5,
    'M-04.free.clear': 1, 'M-04.free.radiance': 2, 'M-04.paid.radiance': 5,
    'M-05.free.maxVitae': 4, 'M-05.free.draw': 1, 'M-05.paid.maxVitae': 12,
    'M-06.heal': 2, 'M-06.healLow': 5,
    'M-07.free.deal': 1, 'M-07.free.mercy': 1, 'M-07.free.draw': 1,
    'M-07.paid.deal': 2, 'M-07.paid.mercy': 2, 'M-07.paid.draw': 1,
    'M-08.free.less': 2, 'M-08.free.mercy': 3, 'M-08.paid.less': 5, 'M-08.paid.mercy': 5,
    'M-09.free.count': 1, 'M-09.paid.count': 2,
    'M-10.free.deal': 4, 'M-10.free.mercy': 2, 'M-10.paid.deal': 9, 'M-10.paid.mercy': 5,
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
const EXILE: Partial<ProgramLine> = { exile: true };
const hasMercy = (c: ProgramCtx): boolean => (c.q.foeMercy ?? 0) > 0;

const turnGlobal = (text: string, body: (c: ProgramCtx) => void): CardProgram => ({
    global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c) },
});

const ENTRIES: Entry[] = [
    // ── PAYOFF ──
    { slot: 'P-01', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L('RADIANCE 3.', c => { c.radiance!(n('P-01.free.radiance')); }),
        paid: L('RADIANCE 7.', c => { c.radiance!(n('P-01.paid.radiance')); }) }) },
    { slot: 'P-02', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('RADIANCE 4. GUARD 2.', c => { c.radiance!(n('P-02.free.radiance')); c.guard(n('P-02.free.guard')); }),
        paid: L('RADIANCE 9. GUARD 5.', c => { c.radiance!(n('P-02.paid.radiance')); c.guard(n('P-02.paid.guard')); }) }) },
    { slot: 'P-03', option: 'b', type: 'spell', color: PURPLE, program: n => ({
        free: L('MERCY 5.', c => { c.mercy!(n('P-03.free.mercy')); }),
        paid: L("MERCY 15, then the foe's MERCY bursts now. EXILE.", c => {
            c.mercy!(n('P-03.paid.mercy')); c.burstMercy!(2);
        }, EXILE) }) },
    { slot: 'P-04', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 3, or DEAL 6 if the foe has MERCY.', c => { c.deal(hasMercy(c) ? n('P-04.free.dealMercy') : n('P-04.free.deal')); }),
        paid: L('DEAL 6, or DEAL 12 if the foe has MERCY.', c => { c.deal(hasMercy(c) ? n('P-04.paid.dealMercy') : n('P-04.paid.deal')); }) }) },
    { slot: 'P-05', option: 'a', type: 'spell', color: PURPLE, program: n => ({
        free: L("MERCY's clock ticks down 1.", c => { c.tickMercy!(n('P-05.free.tick')); }),
        paid: L("MERCY's clock runs out now, and the foe takes three times its MERCY instead of twice. EXILE.", c => {
            c.burstMercy!(n('P-05.paid.mult'));
        }, EXILE) }) },
    { slot: 'P-06', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L("DEAL equal to the foe's MERCY.", c => { c.deal(c.q.foeMercy ?? 0, { exact: true }); }),
        paid: L("DEAL twice the foe's MERCY.", c => { c.deal(n('P-06a.paid.mult') * (c.q.foeMercy ?? 0), { exact: true }); }) }) },
    { slot: 'P-06', option: 'c', type: 'skill', color: BLUE, program: n => ({
        free: L("GUARD equal to the foe's MERCY.", c => { c.guard(c.q.foeMercy ?? 0, { exact: true }); }),
        paid: L("GUARD twice the foe's MERCY.", c => { c.guard(n('P-06c.paid.mult') * (c.q.foeMercy ?? 0), { exact: true }); }) }) },
    { slot: 'P-07', option: 'b', type: 'attack', color: RED, program: n => ({
        free: L('HEAL 2. DEAL equal to all you healed this turn.', c => {
            c.heal(n('P-07.free.heal')); c.deal(c.q.healedThisTurn ?? 0, { exact: true });
        }),
        paid: L('HEAL 4. DEAL twice all you healed this turn.', c => {
            c.heal(n('P-07.paid.heal')); c.deal(n('P-07.paid.mult') * (c.q.healedThisTurn ?? 0), { exact: true });
        }) }) },
    { slot: 'P-08', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('HEAL 3. MERCY equal to all you healed this turn.', c => {
            c.heal(n('P-08.free.heal')); c.mercy!(c.q.healedThisTurn ?? 0, { exact: true });
        }),
        paid: L('HEAL 6. MERCY equal to all you healed this turn.', c => {
            c.heal(n('P-08.paid.heal')); c.mercy!(c.q.healedThisTurn ?? 0, { exact: true });
        }) }) },
    { slot: 'P-09', option: 'c', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 2, +1 per 5 VITAE you are missing.', c => {
            c.guard(n('P-09.free.guard'), { plus: Math.floor(c.q.missing / n('P-09.free.per')) });
        }),
        paid: L('GUARD X, where X is the VITAE you are missing.', c => { c.guard(c.q.missing, { exact: true }); }) }) },
    { slot: 'P-10', option: 'c', type: 'global', color: PURPLE, program: n => turnGlobal(
        'If the foe has MERCY, RADIANCE 5.', c => { if (hasMercy(c)) c.radiance!(n('P-10.radiance')); }) },
    // ── ENGINE ──
    { slot: 'E-01', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('HEAL 2. DRAW 1.', c => { c.heal(n('E-01.free.heal')); c.draw(n('E-01.free.draw')); }),
        paid: L('HEAL 5. DRAW 1.', c => { c.heal(n('E-01.paid.heal')); c.draw(n('E-01.paid.draw')); }) }) },
    { slot: 'E-02', option: 'c', type: 'skill', color: PURPLE, program: n => ({
        free: L('MERCY 2. DRAW 1.', c => { c.mercy!(n('E-02.free.mercy')); c.draw(n('E-02.free.draw')); }),
        paid: L('MERCY 4. DRAW 1.', c => { c.mercy!(n('E-02.paid.mercy')); c.draw(n('E-02.paid.draw')); }) }) },
    { slot: 'E-03', option: 'b', type: 'spell', color: BLUE, program: n => ({
        free: L('Your heals this turn HEAL +3.', c => { c.healsPlus!(n('E-03.free.plus')); }),
        paid: L('Your heals this turn HEAL three times as much. EXILE.', c => { c.healsTimes!(n('E-03.paid.times')); }, EXILE) }) },
    { slot: 'E-04', option: 'b', type: 'skill', color: RED, program: n => ({
        free: L('SACRIFICE 3. DRAW 2.', c => { c.sacrifice(n('E-04.free.sac')); c.draw(n('E-04.free.draw')); }),
        paid: L('SACRIFICE 4. DRAW 3.', c => { c.sacrifice(n('E-04.paid.sac')); c.draw(n('E-04.paid.draw')); }) }) },
    { slot: 'E-06', option: 'a', type: 'spell', color: PURPLE, program: () => ({
        free: L('Your next HEAL this turn is RADIANCE instead.', c => { c.nextHealRadiance!(); }),
        paid: L('Your HEALs this turn are RADIANCE instead, and each deals double. EXILE.', c => { c.allHealsRadianceDouble!(); }, EXILE) }) },
    { slot: 'E-07', option: 'b', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 2. LEECH 1.', c => { c.deal(n('E-07.free.deal')); c.leech(n('E-07.free.leech')); }),
        paid: L('DEAL 4. LEECH 2.', c => { c.deal(n('E-07.paid.deal')); c.leech(n('E-07.paid.leech')); }) }) },
    { slot: 'E-08', option: 'b', type: 'skill', color: PURPLE, program: n => ({
        free: L('MERCY 2, then RADIANCE 3.', c => { c.mercy!(n('E-08.free.mercy')); c.radiance!(n('E-08.free.radiance')); }),
        paid: L('MERCY 4, then RADIANCE 6.', c => { c.mercy!(n('E-08.paid.mercy')); c.radiance!(n('E-08.paid.radiance')); }) }) },
    { slot: 'E-09', option: 'b', type: 'global', color: BLUE, program: n => turnGlobal(
        'MERCY 1 and HEAL 1.', c => { c.mercy!(n('E-09.mercy')); c.heal(n('E-09.heal')); }) },
    { slot: 'E-10', option: 'b', type: 'skill', color: RED, program: n => ({
        free: L('DRAW 1. HEAL 2.', c => { c.draw(n('E-10.free.draw')); c.heal(n('E-10.free.heal')); }),
        paid: L('DRAW 2. HEAL 4.', c => { c.draw(n('E-10.paid.draw')); c.heal(n('E-10.paid.heal')); }) }) },
    // ── MISC ──
    { slot: 'M-01', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L('GUARD 3, or GUARD 5 if the foe has MERCY.', c => { c.guard(hasMercy(c) ? n('M-01.free.guardMercy') : n('M-01.free.guard')); }),
        paid: L('GUARD 7, or GUARD 11 if the foe has MERCY.', c => { c.guard(hasMercy(c) ? n('M-01.paid.guardMercy') : n('M-01.paid.guard')); }) }) },
    // YIELDING (befriend whatever its VITAE) is not modelled; its MERCY is.
    { slot: 'M-02', option: 'b', type: 'skill', color: PURPLE, program: n => ({
        free: L('MERCY 2. While the foe has MERCY, it is YIELDING.', c => { c.mercy!(n('M-02.free.mercy')); }),
        paid: L('MERCY 5. While the foe has MERCY, it is YIELDING.', c => { c.mercy!(n('M-02.paid.mercy')); }) }) },
    { slot: 'M-04', option: 'b', type: 'skill', color: RED, program: n => ({
        free: L('Clear one debuff from yourself, then RADIANCE 2.', c => { c.clearDebuffs!(n('M-04.free.clear')); c.radiance!(n('M-04.free.radiance')); }),
        paid: L('Clear every debuff from yourself, then RADIANCE 5.', c => { c.clearDebuffs!(Infinity); c.radiance!(n('M-04.paid.radiance')); }) }) },
    { slot: 'M-05', option: 'c', type: 'spell', color: PURPLE, program: n => ({
        free: L('+4 max VITAE this combat. DRAW 1.', c => { c.maxVitae!(n('M-05.free.maxVitae')); c.draw(n('M-05.free.draw')); }),
        paid: L('+12 max VITAE this combat, then HEAL to full. EXILE.', c => { c.maxVitae!(n('M-05.paid.maxVitae')); c.healToFull!(); }, EXILE) }) },
    { slot: 'M-06', option: 'c', type: 'global', color: BLUE, program: n => turnGlobal(
        'HEAL 2, or HEAL 5 if you are below half VITAE.', c => {
            c.heal(c.q.vitae < c.q.maxVitae / 2 ? n('M-06.healLow') : n('M-06.heal'));
        }) },
    { slot: 'M-07', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L('DEAL 1. MERCY 1. DRAW 1.', c => { c.deal(n('M-07.free.deal')); c.mercy!(n('M-07.free.mercy')); c.draw(n('M-07.free.draw')); }),
        paid: L('DEAL 2. MERCY 2. DRAW 1.', c => { c.deal(n('M-07.paid.deal')); c.mercy!(n('M-07.paid.mercy')); c.draw(n('M-07.paid.draw')); }) }) },
    { slot: 'M-08', option: 'a', type: 'skill', color: PURPLE, program: n => ({
        free: L('If the foe has MERCY, its next attack deals 2 less; otherwise MERCY 3.', c => {
            if (hasMercy(c)) c.weakenNextAttack!(n('M-08.free.less')); else c.mercy!(n('M-08.free.mercy'));
        }),
        paid: L('If the foe has MERCY, its next attack deals 5 less; otherwise MERCY 5.', c => {
            if (hasMercy(c)) c.weakenNextAttack!(n('M-08.paid.less')); else c.mercy!(n('M-08.paid.mercy'));
        }) }) },
    { slot: 'M-09', option: 'c', type: 'skill', color: BLUE, program: n => ({
        free: L('Return the last MERCY card you played this combat to your hand.', c => { c.returnMercyCards!(n('M-09.free.count')); }),
        paid: L('Return the last two MERCY cards you played this combat to your hand.', c => { c.returnMercyCards!(n('M-09.paid.count')); }) }) },
    { slot: 'M-10', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L('If the foe is at max VITAE, DEAL 4; otherwise MERCY 2.', c => {
            if (c.q.foeAtMax) c.deal(n('M-10.free.deal')); else c.mercy!(n('M-10.free.mercy'));
        }),
        paid: L('If the foe is at max VITAE, DEAL 9; otherwise MERCY 5.', c => {
            if (c.q.foeAtMax) c.deal(n('M-10.paid.deal')); else c.mercy!(n('M-10.paid.mercy'));
        }) }) },
];

const idOf = (e: Entry): string => `mc-${e.slot.toLowerCase()}${e.option}`;

/** The ledger key of a card: its slot, with the option for P-06's two cards. */
const keyOf = (e: Entry): string => (e.slot === 'P-06' ? `P-06${e.option}` : e.slot);

export const MERCIFUL_KEYS: readonly string[] = ENTRIES.map(keyOf);

/** The card id of a ledger key ('P-01', 'P-06a', 'P-06c'). */
export function mercifulId(key: string): string {
    const e = ENTRIES.find(x => keyOf(x) === key);
    if (!e) throw new Error(`no Merciful card ${key}`);
    return idOf(e);
}

export function mercifulKey(id: string): string {
    const e = ENTRIES.find(x => idOf(x) === id);
    if (!e) throw new Error(`no Merciful card id ${id}`);
    return keyOf(e);
}

export function mercifulColour(key: string): string {
    const c = ENTRIES.find(x => keyOf(x) === key)!.color;
    return c === RED ? 'red' : c === BLUE ? 'blue' : 'purple';
}

/**
 * The session's 20-card test deck (not T's; T picks the test deck at the
 * revisions): every Global and every Spell, each payoff with its setup, no
 * copies, 7 red, 6 blue, 7 purple.
 */
export const TEST_DECK_KEYS: readonly string[] = [
    'P-01', 'P-04', 'P-06a', 'P-07', 'E-04', 'M-07', 'M-10',
    'P-08', 'E-01', 'E-03', 'E-09', 'M-06', 'M-09',
    'P-03', 'P-05', 'P-10', 'E-02', 'E-06', 'E-08', 'M-05',
];

export const mercifulTestDeck = (): string[] => TEST_DECK_KEYS.map(mercifulId);
export const mercifulFullDeck = (): string[] => ENTRIES.map(idOf);

export function buildMercifulCards(numbers: MercifulNumbers): Card[] {
    const n = (k: string): number => {
        const v = numbers[k];
        if (v === undefined) throw new Error(`no Merciful number ${k}`);
        return v;
    };
    return ENTRIES.map(e => ({
        id: idOf(e),
        name: `Merciful ${keyOf(e)}`,
        color: e.color,
        description: `Merciful sandbox card (${keyOf(e)}).`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.type === 'attack' ? 'enemy' : 'self',
        program: e.program(n),
        addedIn: '2026-10-29',
        tags: ['merciful', 'sandbox'],
    } as Card));
}

/** Registers the 29 cards in the sandbox registry at `numbers`. */
export function registerMercifulCards(numbers: MercifulNumbers = AS_VOTED): void {
    registerSandboxCards(buildMercifulCards(numbers));
}
