/**
 * THE ELEMENTALIST, sandbox cards (branch sandbox/elementalist-sims only; never merged).
 *
 * The 30 kept cards of the Elementalist rehearsal ballot
 * (`plan/card-ledger/rehearsal-elementalist.md`, "as kept, with T's notes
 * applied"), written as card programs on the live program system plus the
 * sandbox element verbs (`Combat/combat.elements.ts`). They are registered
 * through the sandbox registry (`cards.sandbox.ts`) by the sim CLI and the
 * sandbox test, never through `TRIAL_SETS` (THE CARD HOLD, D37).
 *
 * Every printed number is read from a numbers table, so a run can measure
 * T's numbers as voted ({@link AS_VOTED}) or with the sim's adjustments.
 * Ids are `el-<slot><option>`; names are placeholders (D99: names are T's).
 *
 * Placeholders for the revisions step (T settles these):
 *   - INFERNO, BLIZZARD and STORM are unscaled. DEAL scales with body,
 *     GUARD and HEAL with mind, VULNERABLE with heart, as live.
 *   - A number a line reads off the fight ("GUARD equal to the foe's
 *     BLIZZARD", "+ your INFERNO") is added unscaled, as the live system
 *     treats an already-resolved number.
 *   - Colour by job: a hit is red (body), a wall, heal or utility card blue
 *     (mind), an affliction (main payoff INFERNO, BLIZZARD, STORM or
 *     VULNERABLE) purple (heart).
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import { clearSandboxCards, registerSandboxCards } from '../cards.sandbox';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

/** Every printed number on the 30 cards, by `<slot>.<line>.<what>`. */
export type ElementalistNumbers = Record<string, number>;

/** T's numbers as voted (the ballot's, with T's notes applied). */
export const AS_VOTED: Readonly<ElementalistNumbers> = Object.freeze({
    'P-01.free.deal': 5, 'P-01.paid.deal': 8,
    'P-02.free.deal': 6, 'P-02.paid.deal': 18, 'P-02.paid.inferno': 8,
    'P-03.paid.mult': 2,
    'P-04.free.deal': 3, 'P-04.free.blizzard': 2, 'P-04.paid.deal': 6, 'P-04.paid.per': 2,
    'P-05.free.storm': 1,
    'P-06.free.guard': 3, 'P-06.free.draw': 1, 'P-06.paid.guard': 5, 'P-06.paid.cap': 12, 'P-06.paid.draw': 1,
    'P-07.free.deal': 5, 'P-07.free.inferno': 2, 'P-07.paid.deal': 10, 'P-07.paid.inferno': 4,
    'P-09.free.deal': 4, 'P-09.free.cap': 6, 'P-09.paid.deal': 8,
    'P-10.deal': 5, 'P-10.need': 2,
    'E-01.free.inferno': 3, 'E-01.free.guard': 2, 'E-01.paid.inferno': 8, 'E-01.paid.guard': 5,
    'E-02.free.deal': 5, 'E-02.paid.deal': 8,
    'E-03.free.blizzard': 2, 'E-03.free.draw': 1, 'E-03.paid.blizzard': 6, 'E-03.paid.draw': 1,
    'E-04.free.blizzard': 3, 'E-04.paid.blizzard': 5,
    'E-05.free.storm': 1, 'E-05.free.draw': 1, 'E-05.paid.storm': 3, 'E-05.paid.draw': 2,
    'E-06.growth': 1,
    'E-07.free.draw': 2, 'E-07.paid.draw': 2,
    'E-08.free.blizzard': 2, 'E-08.free.inferno': 2,
    'E-10.free.draw': 1, 'E-10.free.storm': 1, 'E-10.paid.draw': 1,
    'M-01.paid.mult': 2,
    'M-02.free.heal': 2, 'M-02.paid.heal': 4, 'M-02.paid.mult': 2,
    'M-03.free.draw': 2, 'M-03.paid.draw': 2, 'M-03.paid.blizzard': 2, 'M-03.paid.guard': 2,
    'M-04.free.each': 1, 'M-04.paid.each': 3,
    'M-05.free.draw': 1, 'M-05.free.conviction': 1, 'M-05.paid.draw': 1, 'M-05.paid.per': 2,
    'M-06.free.guard': 4, 'M-06.paid.guard': 9,
    'M-07.free.storm': 2, 'M-07.paid.pct': 5, 'M-07.paid.turns': 2,
    'M-08.storm': 1, 'M-08.draw': 1,
    'M-10.storm': 1,
});

const L = (text: string, run: (c: ProgramCtx) => void): ProgramLine => ({ text, run });

interface Entry {
    slot: string;
    option: string;
    type: CardType;
    color: CardAspect;
    program: (n: (k: string) => number) => CardProgram;
}

/** A ⟳ Global whose PAID line equals its FREE line (T: paying makes it permanent). */
function turnGlobal(text: string, body: (c: ProgramCtx) => void, stormGrowth?: number): CardProgram {
    return { global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c), ...(stormGrowth ? { stormGrowth } : {}) } };
}

const ENTRIES: Entry[] = [
    // ── PAYOFF ────────────────────────────────────────────────────────────────
    { slot: 'P-01', option: 'b', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('P-01.free.deal')}.`, c => { c.deal(n('P-01.free.deal')); }),
        paid: L(`DEAL ${n('P-01.paid.deal')}, doubled if the foe is burning.`, c => {
            c.deal(n('P-01.paid.deal') * (c.q.foeInferno > 0 ? 2 : 1));
        }) }) },
    { slot: 'P-02', option: 'b', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('P-02.free.deal')}.`, c => { c.deal(n('P-02.free.deal')); }),
        paid: L(`DEAL ${n('P-02.paid.deal')}; INFERNO ${n('P-02.paid.inferno')} (you and the foe both burn).`, c => {
            c.deal(n('P-02.paid.deal')); c.inferno(n('P-02.paid.inferno'), 'both');
        }) }) },
    { slot: 'P-03', option: 'a', type: 'skill', color: BLUE, program: n => ({
        free: L("GUARD equal to the foe's BLIZZARD.", c => { c.guard(0, { plus: c.q.blizzard }); }),
        paid: L("GUARD twice the foe's BLIZZARD.", c => { c.guard(0, { plus: n('P-03.paid.mult') * c.q.blizzard }); }) }) },
    { slot: 'P-04', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('P-04.free.deal')}, BLIZZARD ${n('P-04.free.blizzard')}.`, c => {
            c.deal(n('P-04.free.deal')); c.blizzard(n('P-04.free.blizzard'));
        }),
        paid: L(`Spend all the foe's BLIZZARD: DEAL ${n('P-04.paid.deal')}, +${n('P-04.paid.per')} per BLIZZARD spent.`, c => {
            const b = c.spendBlizzard(); c.deal(n('P-04.paid.deal'), { plus: n('P-04.paid.per') * b });
        }) }) },
    { slot: 'P-05', option: 'b', type: 'spell', color: RED, program: n => ({
        free: L(`STORM ${n('P-05.free.storm')}; DEAL equal to the foe's STORM.`, c => {
            const s0 = c.q.storm; c.storm(n('P-05.free.storm')); c.deal(0, { plus: s0 + n('P-05.free.storm') });
        }),
        paid: L("Trigger the foe's STORM.", c => { c.triggerStorm(); }) }) },
    { slot: 'P-06', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L(`GUARD ${n('P-06.free.guard')}, DRAW ${n('P-06.free.draw')}.`, c => {
            c.guard(n('P-06.free.guard')); c.draw(n('P-06.free.draw'));
        }),
        paid: L(`GUARD ${n('P-06.paid.guard')}, + the foe's STORM (max +${n('P-06.paid.cap')}). DRAW ${n('P-06.paid.draw')}.`, c => {
            c.guard(n('P-06.paid.guard'), { plus: Math.min(n('P-06.paid.cap'), c.q.storm) }); c.draw(n('P-06.paid.draw'));
        }) }) },
    { slot: 'P-07', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('P-07.free.deal')}, INFERNO ${n('P-07.free.inferno')}.`, c => {
            c.deal(n('P-07.free.deal')); c.inferno(n('P-07.free.inferno'), 'both');
        }),
        paid: L(`DEAL ${n('P-07.paid.deal')}, INFERNO ${n('P-07.paid.inferno')}; if the foe is FROZEN, the INFERNO is doubled too.`, c => {
            const frozen = c.q.frozen;
            c.deal(n('P-07.paid.deal')); c.inferno(n('P-07.paid.inferno') * (frozen ? 2 : 1), 'both');
        }) }) },
    { slot: 'P-08', option: 'b', type: 'skill', color: PURPLE, program: () => ({
        free: L("GUARD equal to the foe's BLIZZARD + STORM.", c => { c.guard(0, { plus: c.q.blizzard + c.q.storm }); }),
        paid: L("Double the foe's BLIZZARD and STORM.", c => { c.doubleBlizzardAndStorm(); }) }) },
    { slot: 'P-09', option: 'a', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('P-09.free.deal')}, + your INFERNO (max +${n('P-09.free.cap')}).`, c => {
            c.deal(n('P-09.free.deal'), { plus: Math.min(n('P-09.free.cap'), c.q.yourInferno) });
        }),
        paid: L(`DEAL ${n('P-09.paid.deal')}, + your INFERNO + the foe's STORM.`, c => {
            c.deal(n('P-09.paid.deal'), { plus: c.q.yourInferno + c.q.storm });
        }) }) },
    { slot: 'P-10', option: 'b', type: 'global', color: RED, program: n => turnGlobal(
        `if the foe has two or more elements, DEAL ${n('P-10.deal')}.`,
        c => { if (c.q.elementsOnFoe >= n('P-10.need')) c.deal(n('P-10.deal')); }) },

    // ── ENGINE ────────────────────────────────────────────────────────────────
    { slot: 'E-01', option: 'b', type: 'spell', color: PURPLE, program: n => ({
        free: L(`INFERNO ${n('E-01.free.inferno')}, GUARD ${n('E-01.free.guard')}.`, c => {
            c.inferno(n('E-01.free.inferno'), 'both'); c.guard(n('E-01.free.guard'));
        }),
        paid: L(`INFERNO ${n('E-01.paid.inferno')}, GUARD ${n('E-01.paid.guard')}.`, c => {
            c.inferno(n('E-01.paid.inferno'), 'both'); c.guard(n('E-01.paid.guard'));
        }) }) },
    { slot: 'E-02', option: 'c', type: 'attack', color: RED, program: n => ({
        free: L(`DEAL ${n('E-02.free.deal')}.`, c => { c.deal(n('E-02.free.deal')); }),
        paid: L(`DEAL ${n('E-02.paid.deal')}, then INFERNO equal to half the damage dealt.`, c => {
            const d = c.deal(n('E-02.paid.deal')); c.inferno(Math.floor(d / 2), 'both');
        }) }) },
    { slot: 'E-03', option: 'b', type: 'spell', color: PURPLE, program: n => ({
        free: L(`BLIZZARD ${n('E-03.free.blizzard')}, DRAW ${n('E-03.free.draw')}.`, c => {
            c.blizzard(n('E-03.free.blizzard')); c.draw(n('E-03.free.draw'));
        }),
        paid: L(`BLIZZARD ${n('E-03.paid.blizzard')}, DRAW ${n('E-03.paid.draw')}.`, c => {
            c.blizzard(n('E-03.paid.blizzard')); c.draw(n('E-03.paid.draw'));
        }) }) },
    { slot: 'E-04', option: 'c', type: 'skill', color: PURPLE, program: n => ({
        free: L(`BLIZZARD ${n('E-04.free.blizzard')}.`, c => { c.blizzard(n('E-04.free.blizzard')); }),
        paid: L(`BLIZZARD ${n('E-04.paid.blizzard')}, then GUARD equal to the foe's BLIZZARD.`, c => {
            const b0 = c.q.blizzard; c.blizzard(n('E-04.paid.blizzard')); c.guard(0, { plus: b0 + n('E-04.paid.blizzard') });
        }) }) },
    { slot: 'E-05', option: 'b', type: 'spell', color: PURPLE, program: n => ({
        free: L(`STORM ${n('E-05.free.storm')}, DRAW ${n('E-05.free.draw')}.`, c => {
            c.storm(n('E-05.free.storm')); c.draw(n('E-05.free.draw'));
        }),
        paid: L(`STORM ${n('E-05.paid.storm')}, DRAW ${n('E-05.paid.draw')}.`, c => {
            c.storm(n('E-05.paid.storm')); c.draw(n('E-05.paid.draw'));
        }) }) },
    { slot: 'E-06', option: 'a', type: 'global', color: RED, program: n => turnGlobal(
        `(while in play) the STORM grows by ${n('E-06.growth')} extra.`,
        c => { c.stormGrowthMarker(n('E-06.growth')); }, n('E-06.growth')) },
    { slot: 'E-07', option: 'b', type: 'skill', color: BLUE, program: n => ({
        free: L(`DRAW ${n('E-07.free.draw')}.`, c => { c.draw(n('E-07.free.draw')); }),
        paid: L(`DRAW ${n('E-07.paid.draw')}, then STORM equal to the cards in your hand.`, c => {
            const h0 = c.q.handSize; c.draw(n('E-07.paid.draw'));
            // Apply mode reads the hand after the draw; the witness's estimate assumes the draw landed.
            const h = c.q.handSize > h0 ? c.q.handSize : h0 + n('E-07.paid.draw');
            c.storm(h);
        }) }) },
    { slot: 'E-08', option: 'c', type: 'spell', color: PURPLE, program: n => ({
        free: L(`BLIZZARD ${n('E-08.free.blizzard')}, INFERNO ${n('E-08.free.inferno')} on the foe only.`, c => {
            c.blizzard(n('E-08.free.blizzard')); c.inferno(n('E-08.free.inferno'), 'foe');
        }),
        paid: L('Steam: remove your INFERNO; the foe gains that much BLIZZARD and INFERNO.', c => {
            const y = c.removeYourInferno(); c.blizzard(y); c.inferno(y, 'foe');
        }) }) },
    { slot: 'E-09', option: 'b', type: 'global', color: PURPLE, program: () => turnGlobal(
        "BLIZZARD equal to half the foe's STORM.",
        c => { c.blizzard(Math.floor(c.q.storm / 2)); }) },
    { slot: 'E-10', option: 'c', type: 'spell', color: BLUE, program: n => ({
        free: L(`DRAW ${n('E-10.free.draw')}, STORM ${n('E-10.free.storm')}.`, c => {
            c.draw(n('E-10.free.draw')); c.storm(n('E-10.free.storm'));
        }),
        paid: L(`Swap the numbers of two elements on the foe. DRAW ${n('E-10.paid.draw')}.`, c => {
            c.swapElements(); c.draw(n('E-10.paid.draw'));
        }) }) },

    // ── MISC ──────────────────────────────────────────────────────────────────
    { slot: 'M-01', option: 'a', type: 'skill', color: BLUE, program: n => ({
        free: L('Remove your INFERNO.', c => { c.removeYourInferno(); }),
        paid: L('HEAL twice your INFERNO, then remove your INFERNO.', c => {
            c.heal(0, { plus: n('M-01.paid.mult') * c.q.yourInferno }); c.removeYourInferno();
        }) }) },
    { slot: 'M-02', option: 'a', type: 'skill', color: BLUE, program: n => ({
        free: L(`HEAL ${n('M-02.free.heal')}, + the foe's BLIZZARD.`, c => { c.heal(n('M-02.free.heal'), { plus: c.q.blizzard }); }),
        paid: L(`HEAL ${n('M-02.paid.heal')}, + twice the foe's BLIZZARD.`, c => {
            c.heal(n('M-02.paid.heal'), { plus: n('M-02.paid.mult') * c.q.blizzard });
        }) }) },
    { slot: 'M-03', option: 'a', type: 'skill', color: BLUE, program: n => ({
        free: L(`DRAW ${n('M-03.free.draw')}.`, c => { c.draw(n('M-03.free.draw')); }),
        paid: L(`DRAW ${n('M-03.paid.draw')}, BLIZZARD ${n('M-03.paid.blizzard')}, GUARD ${n('M-03.paid.guard')}.`, c => {
            c.draw(n('M-03.paid.draw')); c.blizzard(n('M-03.paid.blizzard')); c.guard(n('M-03.paid.guard'));
        }) }) },
    { slot: 'M-04', option: 'a', type: 'spell', color: PURPLE, program: n => ({
        free: L(`INFERNO ${n('M-04.free.each')}, BLIZZARD ${n('M-04.free.each')}, STORM ${n('M-04.free.each')}.`, c => {
            const k = n('M-04.free.each'); c.inferno(k, 'both'); c.blizzard(k); c.storm(k);
        }),
        paid: L(`INFERNO ${n('M-04.paid.each')}, BLIZZARD ${n('M-04.paid.each')}, STORM ${n('M-04.paid.each')}.`, c => {
            const k = n('M-04.paid.each'); c.inferno(k, 'both'); c.blizzard(k); c.storm(k);
        }) }) },
    { slot: 'M-05', option: 'c', type: 'skill', color: BLUE, program: n => ({
        free: L(`DRAW ${n('M-05.free.draw')}; gain ${n('M-05.free.conviction')} Conviction.`, c => {
            c.draw(n('M-05.free.draw')); c.conviction(n('M-05.free.conviction'));
        }),
        paid: L(`DRAW ${n('M-05.paid.draw')}; gain ${n('M-05.paid.per')} Conviction per different element on the foe.`, c => {
            c.draw(n('M-05.paid.draw')); c.conviction(n('M-05.paid.per') * c.q.elementsOnFoe);
        }) }) },
    { slot: 'M-06', option: 'a', type: 'skill', color: BLUE, program: n => ({
        free: L(`GUARD ${n('M-06.free.guard')}, doubled if the foe is FROZEN.`, c => {
            c.guard(n('M-06.free.guard') * (c.q.frozen ? 2 : 1));
        }),
        paid: L(`GUARD ${n('M-06.paid.guard')}, doubled if the foe is FROZEN.`, c => {
            c.guard(n('M-06.paid.guard') * (c.q.frozen ? 2 : 1));
        }) }) },
    { slot: 'M-07', option: 'b', type: 'spell', color: PURPLE, program: n => ({
        free: L(`STORM ${n('M-07.free.storm')}.`, c => { c.storm(n('M-07.free.storm')); }),
        paid: L(`VULNERABLE +${n('M-07.paid.pct')}% per STORM on the foe, for ${n('M-07.paid.turns')} turns.`, c => {
            c.vulnerable(n('M-07.paid.pct') * c.q.storm, n('M-07.paid.turns'));
        }) }) },
    { slot: 'M-08', option: 'c', type: 'global', color: PURPLE, program: n => turnGlobal(
        `STORM ${n('M-08.storm')}, DRAW ${n('M-08.draw')}.`,
        c => { c.storm(n('M-08.storm')); c.draw(n('M-08.draw')); }) },
    { slot: 'M-09', option: 'c', type: 'skill', color: BLUE, program: () => ({
        free: L('Move half your INFERNO onto the foe.', c => { c.moveYourInferno('half'); }),
        paid: L('HEAL equal to your INFERNO, then move your INFERNO onto the foe.', c => {
            c.heal(0, { plus: c.q.yourInferno }); c.moveYourInferno('all');
        }) }) },
    { slot: 'M-10', option: 'new', type: 'global', color: BLUE, program: n => turnGlobal(
        `STORM ${n('M-10.storm')}, then HEAL equal to the foe's STORM.`,
        c => { const s0 = c.q.storm; c.storm(n('M-10.storm')); c.heal(0, { plus: s0 + n('M-10.storm') }); }) },
];

/** The card id of a slot: `el-p-01b`; T's own M-10 is `el-m-10n`. */
export function elementalistId(slot: string): string {
    const e = ENTRIES.find(x => x.slot === slot);
    if (!e) throw new Error(`no Elementalist slot ${slot}`);
    return `el-${slot.toLowerCase()}${e.option === 'new' ? 'n' : e.option}`;
}

/** Every slot, in ledger order. */
export const ELEMENTALIST_SLOTS: readonly string[] = Object.freeze(ENTRIES.map(e => e.slot));

/** The colour each slot carries in this sim (colour by job). */
export function elementalistColour(slot: string): 'red' | 'blue' | 'purple' {
    const c = ENTRIES.find(x => x.slot === slot)?.color;
    return c === RED ? 'red' : c === BLUE ? 'blue' : 'purple';
}

/** The 30 cards at a numbers table (unknown keys fall back to {@link AS_VOTED}). */
export function buildElementalistCards(numbers: Readonly<ElementalistNumbers> = AS_VOTED): Card[] {
    const n = (k: string): number => {
        const v = numbers[k] ?? AS_VOTED[k];
        if (v === undefined) throw new Error(`no Elementalist number '${k}'`);
        return v;
    };
    return ENTRIES.map(e => ({
        id: elementalistId(e.slot),
        name: `Elementalist ${e.slot}`,
        color: e.color,
        description: `Elementalist sandbox card, ${e.slot} (${e.slot[0] === 'P' ? 'Payoff' : e.slot[0] === 'E' ? 'Engine' : 'Misc'}).`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.color === BLUE ? 'self' : 'enemy',
        program: e.program(n),
        addedIn: '2026-10-24',
        tags: ['elementalist', 'sandbox'],
    }));
}

/** Registers the 30 cards in the sandbox registry (clearing it first). */
export function registerElementalistCards(numbers: Readonly<ElementalistNumbers> = AS_VOTED): void {
    clearSandboxCards();
    registerSandboxCards(buildElementalistCards(numbers));
}

/** True for an Elementalist sandbox card id. */
export function isElementalistCardId(id: string): boolean {
    return id.startsWith('el-');
}

/**
 * The provisional 20-card test deck, by role (T picks the real deck at the
 * revisions step): every payoff with its source in the deck, 7 red, 7 blue,
 * 6 purple, no copies.
 */
export const ELEMENTALIST_TEST_DECK_SLOTS: readonly string[] = Object.freeze([
    // red (7): the hits and the damage Globals
    'P-01', 'P-02', 'P-04', 'P-05', 'P-07', 'P-10', 'E-06',
    // blue (7): walls, heals, the draw and the Fire safety valve
    'P-03', 'P-06', 'M-02', 'M-06', 'M-01', 'E-07', 'M-10',
    // purple (6): the sources of the three elements
    'E-01', 'E-03', 'E-05', 'E-08', 'M-04', 'P-08',
]);

export function elementalistTestDeck(): string[] {
    return ELEMENTALIST_TEST_DECK_SLOTS.map(elementalistId);
}

export function elementalistFullDeck(): string[] {
    return ELEMENTALIST_SLOTS.map(elementalistId);
}
