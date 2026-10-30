/**
 * THE MERCIFUL TRIAL SET — my mending is a weapon.
 *
 * The 29 kept cards of the Merciful rehearsal ballot
 * (`plan/card-ledger/rehearsal-merciful.md`: "As kept, with T's notes applied",
 * "Rulings after the vote" and "Revisions"), at the numbers T chose to ship
 * (2026-10-30, "make your recommended changes": P-03, P-05, P-08, M-05, E-03 and
 * E-01 change as the ledger's "The numbers" table lists), the drafted names and
 * the sims' colours. Three sub-lanes: Payoff (P, 11 cards), Engine (E, 9) and
 * Misc (M, 9). Ids are `mc-<slot><option>`; P-06 keeps two (`mc-p-06a`,
 * `mc-p-06c`).
 *
 * A removable trial set (plan/revamp/cards.md → "The trial set"): this file is
 * the whole set, and `cards.library.ts` registers it in one line. RADIANCE,
 * MERCY, YIELDING and the heal modifiers are general systems in
 * `Combat/combat.mercy.ts` and `Combat/combat.card-program.ts`; nothing outside
 * this file and its own test names a card here.
 *
 * Colours: ten red, ten blue, nine purple (the sims' even split per sub-lane,
 * T: "Take both").
 *
 * Numbers:
 *   - DEAL, GUARD and HEAL print as number tokens and scale with the stats as
 *     live; RADIANCE, MERCY and LEECH scale with Heart. A number a line
 *     reads off the fight ("DEAL equal to the foe's MERCY", "all you healed")
 *     is applied unscaled, as an already-resolved number.
 *   - One upgrade, as commons: DEAL, GUARD, HEAL, max VITAE, "heals +n" and the
 *     foe's attack cut take the MAGNITUDE step; RADIANCE, MERCY and LEECH take
 *     the INTENSITY step (+1). The SACRIFICE cost, DRAW, the clock tick, the
 *     MERCY cards returned and the multipliers hold, so a card whose only
 *     numbers are those upgrades to the same card; its own test names them.
 *   - The Spells' PAID numbers are T's as voted, EXILE already on them. The two
 *     that raise a number record the plain-discard-card number one step below
 *     as their `spellLawBaseline`; the other three (P-05, E-03, E-06) have a
 *     PAID line with no number for a step to raise, so they are held for T in
 *     the card-rules fixture.
 *   - Globals print one line: the PAID line equals the FREE line, and paying
 *     makes it permanent.
 *
 * Every card sets `valueWitness`: the combat sim's greedy witness values the
 * lines (a heal, a MERCY total, a hit off the MERCY on the foe) instead of
 * reading a printed damage preview that is 0 for a program card.
 *
 * This file is data-only.
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import type { CardLane, TrialSet } from '../card.lanes';
import { upgradeScale, type UpgradeScale } from '../card-upgrade.scale';
import { MERCY_BURST_MULT } from '../../Combat/combat.mercy';

const ADDED = '2026-10-30';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

/** A Spell's PAID line EXILEs (the Spell law, T, 2026-10-24). */
const EX: Partial<ProgramLine> = { exile: true };

interface Entry {
    /** The ledger slot, `P-01`. */
    slot: string;
    /** The kept option, `a`. */
    option: string;
    /** The drafted name (T approves or edits it on the PR). */
    name: string;
    type: CardType;
    color: CardAspect;
    program: (u: UpgradeScale) => CardProgram;
    /** A Spell's PAID payoffs one Spell-law step below T's numbers (`Card.spellLawBaseline`). */
    spellLaw?: Readonly<Record<string, number>>;
}

/** A start-of-turn Global whose PAID line equals its FREE line. */
function turnGlobal(text: string, body: (c: ProgramCtx) => void): CardProgram {
    return { global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c) } };
}

const SUB_LANE: Record<string, string> = { P: 'Payoff', E: 'Engine', M: 'Misc' };

const ENTRIES: Entry[] = [
    // ── PAYOFF: paid for heals that land and MERCY that comes due ────────────
    { slot: 'P-01', option: 'a', name: 'Searing Mend', type: 'attack', color: RED, program: u => ({
        free: L(`RADIANCE {radiance:${u.i(3)}}.`, c => { c.radiance(u.i(3)); }),
        paid: L(`RADIANCE {radiance:${u.i(7)}}.`, c => { c.radiance(u.i(7)); }) }) },
    { slot: 'P-02', option: 'b', name: 'Dawn Bulwark', type: 'skill', color: BLUE, program: u => ({
        free: L(`RADIANCE {radiance:${u.i(4)}}. GUARD {guard:${u.m(2)}}.`, c => { c.radiance(u.i(4)); c.guard(u.m(2)); }),
        paid: L(`RADIANCE {radiance:${u.i(9)}}. GUARD {guard:${u.m(5)}}.`, c => { c.radiance(u.i(9)); c.guard(u.m(5)); }) }) },
    // T: MERCY first, then the burst. Sims: PAID MERCY 15 became 8.
    { slot: 'P-03', option: 'b', name: 'Grace Called Due', type: 'spell', color: PURPLE, spellLaw: { mercy: 5 }, program: u => ({
        free: L(`MERCY {mercy:${u.i(5)}}.`, c => { c.mercy(u.i(5)); }),
        paid: L(`MERCY {mercy:${u.i(8)}}, then the foe's MERCY bursts now. EXILE.`, c => {
            c.mercy(u.i(8)); c.burstMercy(MERCY_BURST_MULT);
        }, EX) }) },
    { slot: 'P-04', option: 'a', name: 'What Grace Owes', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}, or DEAL {deal:${u.m(6)}} if the foe has MERCY.`, c => {
            c.deal(c.q.foeHasMercy ? u.m(6) : u.m(3));
        }),
        paid: L(`DEAL {deal:${u.m(6)}}, or DEAL {deal:${u.m(12)}} if the foe has MERCY.`, c => {
            c.deal(c.q.foeHasMercy ? u.m(12) : u.m(6));
        }) }) },
    // The tick and the burst carry no number for a Spell-law step to raise; held for T.
    { slot: 'P-05', option: 'a', name: 'Hastened Reckoning', type: 'spell', color: PURPLE, program: () => ({
        free: L("MERCY's clock ticks down 1.", c => { c.tickMercy(1); }),
        paid: L("The foe's MERCY bursts now. EXILE.", c => { c.burstMercy(MERCY_BURST_MULT); }, EX) }) },
    { slot: 'P-06', option: 'a', name: 'Weight of Grace', type: 'attack', color: RED, program: () => ({
        free: L("DEAL equal to the foe's MERCY.", c => { c.deal(c.q.foeMercy, { exact: true }); }),
        paid: L("DEAL twice the foe's MERCY.", c => { c.deal(2 * c.q.foeMercy, { exact: true }); }) }) },
    { slot: 'P-06', option: 'c', name: 'Shelter of Grace', type: 'skill', color: BLUE, program: () => ({
        free: L("GUARD equal to the foe's MERCY.", c => { c.guard(c.q.foeMercy, { exact: true }); }),
        paid: L("GUARD twice the foe's MERCY.", c => { c.guard(2 * c.q.foeMercy, { exact: true }); }) }) },
    { slot: 'P-07', option: 'b', name: 'Mended Wrath', type: 'attack', color: RED, program: u => ({
        free: L(`HEAL {heal:${u.m(2)}}. DEAL equal to all you healed this turn.`, c => {
            c.heal(u.m(2)); c.deal(c.q.healedThisTurn, { exact: true });
        }),
        paid: L(`HEAL {heal:${u.m(4)}}. DEAL twice all you healed this turn.`, c => {
            c.heal(u.m(4)); c.deal(2 * c.q.healedThisTurn, { exact: true });
        }) }) },
    // Sims: "MERCY equal to all you healed" became half. T has not ruled the rounding; down.
    { slot: 'P-08', option: 'b', name: 'Shared Mending', type: 'skill', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(3)}}. MERCY equal to half all you healed this turn.`, c => {
            c.heal(u.m(3)); c.mercy(Math.floor(c.q.healedThisTurn / 2), { exact: true });
        }),
        paid: L(`HEAL {heal:${u.m(6)}}. MERCY equal to half all you healed this turn.`, c => {
            c.heal(u.m(6)); c.mercy(Math.floor(c.q.healedThisTurn / 2), { exact: true });
        }) }) },
    // T: PAID only is "GUARD X, where X is the VITAE you are missing".
    { slot: 'P-09', option: 'c', name: 'Scarred Resolve', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(2)}}, +1 per 5 VITAE you are missing.`, c => {
            c.guard(u.m(2), { plus: Math.floor(c.q.missing / 5) });
        }),
        paid: L('GUARD X, where X is the VITAE you are missing.', c => { c.guard(c.q.missing, { exact: true }); }) }) },
    { slot: 'P-10', option: 'c', name: 'Morning Absolution', type: 'global', color: PURPLE, program: u => turnGlobal(
        `If the foe has MERCY, RADIANCE {radiance:${u.i(5)}}.`, c => { if (c.q.foeHasMercy) c.radiance(u.i(5)); }) },

    // ── ENGINE: makes room to heal and keeps MERCY going ─────────────────────
    { slot: 'E-01', option: 'b', name: 'Salve', type: 'skill', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(2)}}. DRAW 1.`, c => { c.heal(u.m(2)); c.draw(1); }),
        paid: L(`HEAL {heal:${u.m(5)}}. DRAW 2.`, c => { c.heal(u.m(5)); c.draw(2); }) }) },
    { slot: 'E-02', option: 'c', name: 'Gentle Debt', type: 'skill', color: PURPLE, program: u => ({
        free: L(`MERCY {mercy:${u.i(2)}}. DRAW 1.`, c => { c.mercy(u.i(2)); c.draw(1); }),
        paid: L(`MERCY {mercy:${u.i(4)}}. DRAW 1.`, c => { c.mercy(u.i(4)); c.draw(1); }) }) },
    // Sims: PAID "three times as much" became twice. A multiplier has no number for a step; held for T.
    { slot: 'E-03', option: 'b', name: 'Swelling Grace', type: 'spell', color: BLUE, program: u => ({
        free: L(`Your heals this turn HEAL +${u.m(3)}.`, c => { c.healsPlus(u.m(3)); }),
        paid: L('Your heals this turn HEAL twice as much. EXILE.', c => { c.healsTimes(2); }, EX) }) },
    { slot: 'E-04', option: 'b', name: 'Open the Wound', type: 'skill', color: RED, program: () => ({
        free: L('SACRIFICE 3. DRAW 2.', c => { c.sacrifice(3); c.draw(2); }),
        paid: L('SACRIFICE 4. DRAW 3.', c => { c.sacrifice(4); c.draw(3); }) }) },
    { slot: 'E-06', option: 'a', name: 'Kindled Prayer', type: 'spell', color: PURPLE, program: () => ({
        free: L('Your next HEAL this turn is RADIANCE instead.', c => { c.nextHealRadiance(); }),
        paid: L('Your HEALs this turn are RADIANCE instead, and each deals double. EXILE.', c => {
            c.allHealsRadianceDouble();
        }, EX) }) },
    { slot: 'E-07', option: 'b', name: 'Draw the Fever', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}. LEECH {leech:${u.i(1)}}.`, c => { c.deal(u.m(2)); c.leech(u.i(1)); }),
        paid: L(`DEAL {deal:${u.m(4)}}. LEECH {leech:${u.i(2)}}.`, c => { c.deal(u.m(4)); c.leech(u.i(2)); }) }) },
    // T: MERCY first, then RADIANCE.
    { slot: 'E-08', option: 'b', name: 'Twin Mending', type: 'skill', color: PURPLE, program: u => ({
        free: L(`MERCY {mercy:${u.i(2)}}, then RADIANCE {radiance:${u.i(3)}}.`, c => { c.mercy(u.i(2)); c.radiance(u.i(3)); }),
        paid: L(`MERCY {mercy:${u.i(4)}}, then RADIANCE {radiance:${u.i(6)}}.`, c => { c.mercy(u.i(4)); c.radiance(u.i(6)); }) }) },
    { slot: 'E-09', option: 'b', name: 'Vigil', type: 'global', color: BLUE, program: u => turnGlobal(
        `MERCY {mercy:${u.i(1)}} and HEAL {heal:${u.m(1)}}.`, c => { c.mercy(u.i(1)); c.heal(u.m(1)); }) },
    { slot: 'E-10', option: 'b', name: 'Quiet Breath', type: 'skill', color: RED, program: u => ({
        free: L(`DRAW 1. HEAL {heal:${u.m(2)}}.`, c => { c.draw(1); c.heal(u.m(2)); }),
        paid: L(`DRAW 2. HEAL {heal:${u.m(4)}}.`, c => { c.draw(2); c.heal(u.m(4)); }) }) },

    // ── MISC: utility around it ──────────────────────────────────────────────
    { slot: 'M-01', option: 'b', name: 'Sanctuary', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, or GUARD {guard:${u.m(5)}} if the foe has MERCY.`, c => {
            c.guard(c.q.foeHasMercy ? u.m(5) : u.m(3));
        }),
        paid: L(`GUARD {guard:${u.m(7)}}, or GUARD {guard:${u.m(11)}} if the foe has MERCY.`, c => {
            c.guard(c.q.foeHasMercy ? u.m(11) : u.m(7));
        }) }) },
    // T: YIELDING replaces "counts as under its befriend gate".
    { slot: 'M-02', option: 'b', name: 'Offer of Peace', type: 'skill', color: PURPLE, program: u => ({
        free: L(`MERCY {mercy:${u.i(2)}}. While the foe has MERCY, it is YIELDING.`, c => { c.mercy(u.i(2)); c.yieldWhileMercy(); }),
        paid: L(`MERCY {mercy:${u.i(5)}}. While the foe has MERCY, it is YIELDING.`, c => { c.mercy(u.i(5)); c.yieldWhileMercy(); }) }) },
    { slot: 'M-04', option: 'b', name: 'Purifying Light', type: 'skill', color: RED, program: u => ({
        free: L(`Clear one debuff from yourself, then RADIANCE {radiance:${u.i(2)}}.`, c => {
            c.clearDebuffs(1); c.radiance(u.i(2));
        }),
        paid: L(`Clear every debuff from yourself, then RADIANCE {radiance:${u.i(5)}}.`, c => {
            c.clearDebuffs(Infinity); c.radiance(u.i(5));
        }) }) },
    // Sims: PAID +12 max VITAE became +6.
    { slot: 'M-05', option: 'c', name: 'Deep Well', type: 'spell', color: PURPLE, spellLaw: { maxVitae: 4 }, program: u => ({
        free: L(`+${u.m(4)} max VITAE this combat. DRAW 1.`, c => { c.maxVitae(u.m(4)); c.draw(1); }),
        paid: L(`+${u.m(6)} max VITAE this combat, then HEAL to full. EXILE.`, c => {
            c.maxVitae(u.m(6)); c.healToFull();
        }, EX) }) },
    { slot: 'M-06', option: 'c', name: 'Steady Pulse', type: 'global', color: BLUE, program: u => turnGlobal(
        `HEAL {heal:${u.m(2)}}, or HEAL {heal:${u.m(5)}} if you are below half VITAE.`, c => {
            c.heal(c.q.belowHalf ? u.m(5) : u.m(2));
        }) },
    { slot: 'M-07', option: 'c', name: 'Kind Cut', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(1)}}. MERCY {mercy:${u.i(1)}}. DRAW 1.`, c => { c.deal(u.m(1)); c.mercy(u.i(1)); c.draw(1); }),
        paid: L(`DEAL {deal:${u.m(2)}}. MERCY {mercy:${u.i(2)}}. DRAW 1.`, c => { c.deal(u.m(2)); c.mercy(u.i(2)); c.draw(1); }) }) },
    // T: "Otherwise, mercy 3/5."
    { slot: 'M-08', option: 'a', name: 'Stay the Hand', type: 'skill', color: PURPLE, program: u => ({
        free: L(`If the foe has MERCY, its next attack deals ${u.m(2)} less; otherwise MERCY {mercy:${u.i(3)}}.`, c => {
            if (c.q.foeHasMercy) c.weakenNextAttack(u.m(2)); else c.mercy(u.i(3));
        }),
        paid: L(`If the foe has MERCY, its next attack deals ${u.m(5)} less; otherwise MERCY {mercy:${u.i(5)}}.`, c => {
            if (c.q.foeHasMercy) c.weakenNextAttack(u.m(5)); else c.mercy(u.i(5));
        }) }) },
    { slot: 'M-09', option: 'c', name: 'Remembered Kindness', type: 'skill', color: BLUE, program: () => ({
        free: L('Return the last MERCY card you played this combat to your hand.', c => { c.returnMercyCards(1); }),
        paid: L('Return the last two MERCY cards you played this combat to your hand.', c => { c.returnMercyCards(2); }) }) },
    { slot: 'M-10', option: 'c', name: 'Overflowing Cup', type: 'attack', color: RED, program: u => ({
        free: L(`If the foe is at max VITAE, DEAL {deal:${u.m(4)}}; otherwise MERCY {mercy:${u.i(2)}}.`, c => {
            if (c.q.foeAtMax) c.deal(u.m(4)); else c.mercy(u.i(2));
        }),
        paid: L(`If the foe is at max VITAE, DEAL {deal:${u.m(9)}}; otherwise MERCY {mercy:${u.i(5)}}.`, c => {
            if (c.q.foeAtMax) c.deal(u.m(9)); else c.mercy(u.i(5));
        }) }) },
];

/** The card id of a slot: `mc-p-01a`; P-06 keeps two, `mc-p-06a` and `mc-p-06c`. */
const idOf = (e: Entry): string => `mc-${e.slot.toLowerCase()}${e.option}`;

function toCard(e: Entry): Card {
    const build = (u: UpgradeScale): CardProgram => ({ ...e.program(u), valueWitness: true });
    return {
        id: idOf(e),
        name: e.name,
        color: e.color,
        description: `Merciful trial card, ${SUB_LANE[e.slot[0]]} sub-lane.`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.type === 'attack' ? 'enemy' : 'self',
        program: build(upgradeScale(0)),
        programAt: build,
        ...(e.spellLaw ? { spellLawBaseline: e.spellLaw } : {}),
        addedIn: ADDED,
        tags: ['merciful', 'trial'],
    };
}

const LANE_CARDS: Card[] = ENTRIES.map(toCard);

/** The card id of a ledger key: `P-01a`, `P-06c`. */
const keyId = (key: string): string => {
    const e = ENTRIES.find(x => `${x.slot}${x.option}` === key);
    if (!e) throw new Error(`no Merciful card ${key}`);
    return idOf(e);
};

/** The Merciful lane: the 29 cards, and the 20-card test deck. */
const MERCIFUL_LANE: CardLane = Object.freeze({
    id: 'merciful',
    name: 'Merciful',
    cardIds: Object.freeze(LANE_CARDS.map(card => card.id)),
    // T, 2026-10-30 ("Take both", the sims' 20): every Global and every Spell, each
    // payoff with its setup, no copies. 7 red, 6 blue, 7 purple.
    testDeck: Object.freeze([
        'P-01a', 'P-04a', 'P-06a', 'P-07b', 'E-04b', 'M-07c', 'M-10c',
        'P-08b', 'E-01b', 'E-03b', 'E-09b', 'M-06c', 'M-09c',
        'P-03b', 'P-05a', 'P-10c', 'E-02c', 'E-06a', 'E-08b', 'M-05c',
    ].map(keyId)),
});

/** The Merciful trial set. */
export const MERCIFUL_SET: TrialSet = Object.freeze({
    id: 'merciful',
    cards: Object.freeze(LANE_CARDS),
    lanes: Object.freeze([MERCIFUL_LANE]),
});
