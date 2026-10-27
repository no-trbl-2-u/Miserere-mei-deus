/**
 * THE DEFENDER TRIAL SET — the turtle with spikes.
 *
 * The 30 kept cards of the Defender rehearsal ballot
 * (`plan/card-ledger/rehearsal-defender.md`: "The kept family, with T's notes
 * applied", "Revisions" and "The numbers"), at the numbers T chose to ship
 * (2026-10-27, "Ship the sims' fixes": P-01, P-03, P-04, P-06, E-01, E-04, E-07,
 * M-04, M-08 and M-09 change as the ledger's table lists), T's names and T's
 * colours. Three sub-lanes of ten: Payoff (P), Engine (E) and Misc (M). Ids are
 * `df-<slot><option>`; T's own M-10 is `df-m-10n`.
 *
 * A removable trial set (plan/revamp/cards.md → "The trial set"): this file
 * is the whole set, and `cards.library.ts` registers it in one line. THORNS,
 * REFLECT, RETRIEVE, the discard cost and the rest are general systems in
 * `Combat/combat.spikes.ts` and `Combat/combat.card-program.ts`; nothing
 * outside this file and its own test names a card here.
 *
 * Colours are T's (revisions, approved as is): ten red, ten blue, ten purple.
 *
 * Numbers:
 *   - DEAL, GUARD, HEAL, VULNERABLE and THORNS print as number tokens and
 *     scale with the stats, as live (THORNS with Heart). REFLECT is
 *     unscaled. A number a line reads off the fight ("GUARD equal to your
 *     THORNS") is added unscaled, as an already-resolved number.
 *   - One upgrade, as commons: DEAL, GUARD, HEAL, VULNERABLE and REFLECT
 *     take the MAGNITUDE step; THORNS and Conviction take the INTENSITY step
 *     (+1). The discard counts, DRAW, RETRIEVE, the VITAE a Global costs and
 *     the per-THORNS rates hold, so a card whose only numbers are those
 *     upgrades to the same card; its own test names them.
 *   - The Spells' PAID numbers are T's as voted, EXILE already on them. Each
 *     records the plain-discard-card numbers one step below as its
 *     `spellLawBaseline`; E-06's PAID doubles a number and has no payoff for a
 *     step to raise, so it is held for T in the card-rules fixture.
 *
 * The random discard is a PAID-only cost written first on its line; the
 * engine refuses a line that cannot pay it (`DISCARD_SHORTFALL_REASON`).
 * Globals print one line: the PAID line equals the FREE line, and paying
 * makes it permanent (T's Elementalist ruling, applied to P-10, E-09, M-06
 * and M-10).
 *
 * This file is data-only.
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import type { CardLane, TrialSet } from '../card.lanes';
import { upgradeScale, type UpgradeScale } from '../card-upgrade.scale';

const ADDED = '2026-10-27';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

/** A Spell's PAID line EXILEs (the Spell law, T, 2026-10-24). */
const EX: Partial<ProgramLine> = { exile: true };

interface Entry {
    /** The ledger slot, `P-01`. */
    slot: string;
    /** The kept option, `b`; `new` for T's own card. */
    option: string;
    /** T's name for the card. */
    name: string;
    type: CardType;
    color: CardAspect;
    program: (u: UpgradeScale) => CardProgram;
    /** A Spell's PAID payoffs one Spell-law step below T's numbers (`Card.spellLawBaseline`). */
    spellLaw?: Readonly<Record<string, number>>;
    /** "If this card is discarded" (a card property, printed once). */
    onDiscard?: (u: UpgradeScale) => NonNullable<CardProgram['onDiscard']>;
}

/** A start-of-turn Global whose PAID line equals its FREE line. */
function turnGlobal(text: string, body: (c: ProgramCtx) => void): CardProgram {
    return { global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c) } };
}

const SUB_LANE: Record<string, string> = { P: 'Payoff', E: 'Engine', M: 'Misc' };

const ENTRIES: Entry[] = [
    // ── PAYOFF: paid for spikes up, a shell held, cards thrown away ──────────
    { slot: 'P-01', option: 'a', name: 'Bristling Blow', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}, +1 per 2 THORNS you have.`, c => {
            c.deal(u.m(2), { plus: Math.floor(c.q.thorns / 2) });
        }),
        paid: L(`DEAL {deal:${u.m(4)}}, +1 per THORNS you have.`, c => {
            c.deal(u.m(4), { plus: c.q.thorns });
        }) }) },
    // T: no max on either line.
    { slot: 'P-02', option: 'b', name: 'Shield Bash', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}.`, c => { c.guard(u.m(4)); }),
        paid: L(`Discard 1 card at random. GUARD {guard:${u.m(8)}}, then DEAL equal to your GUARD.`, c => {
            c.discardRandom(1);
            c.guard(u.m(8));
            const g = c.q.guard;
            if (g > 0) c.deal(g, { exact: true });
        }) }) },
    // T: the VULNERABLE lands before the DEAL it rides on.
    { slot: 'P-03', option: 'c', name: 'Cracking Swing', type: 'attack', color: RED, program: u => ({
        free: L(`VULNERABLE +{vuln:${u.m(25)}}% for 1 turn, then DEAL {deal:${u.m(2)}}.`, c => {
            c.vulnerable(u.m(25), 1); c.deal(u.m(2));
        }),
        paid: L(`Discard 2 cards at random. VULNERABLE +{vuln:${u.m(75)}}% for 2 turns, then DEAL {deal:${u.m(8)}}.`, c => {
            c.discardRandom(2); c.vulnerable(u.m(75), 2); c.deal(u.m(8));
        }) }) },
    { slot: 'P-04', option: 'a', name: 'Mirror Barb', type: 'attack', color: PURPLE, program: u => ({
        free: L(`REFLECT ${u.m(25)}%, THORNS {thorns:${u.i(2)}}.`, c => { c.reflect(u.m(25)); c.thorns(u.i(2)); }),
        paid: L(`Discard 1 card at random. DEAL {deal:${u.m(3)}}, REFLECT ${u.m(75)}%.`, c => {
            c.discardRandom(1); c.deal(u.m(3)); c.reflect(u.m(75));
        }) }) },
    { slot: 'P-05', option: 'c', name: 'Thornwall', type: 'skill', color: PURPLE, program: u => ({
        free: L(`THORNS {thorns:${u.i(2)}}, then GUARD equal to your THORNS.`, c => {
            c.thorns(u.i(2)); c.guard(0, { plus: c.q.thorns });
        }),
        paid: L(`THORNS {thorns:${u.i(3)}}, then GUARD twice your THORNS.`, c => {
            c.thorns(u.i(3)); c.guard(0, { plus: 2 * c.q.thorns });
        }) }) },
    { slot: 'P-06', option: 'c', name: 'Spite Growth', type: 'skill', color: RED, program: () => ({
        free: L("THORNS equal to half the damage you've done this turn.", c => {
            c.thorns(Math.floor(c.q.dealtThisTurn / 2), { exact: true });
        }),
        paid: L("THORNS equal to the damage you've done this turn.", c => {
            c.thorns(c.q.dealtThisTurn, { exact: true });
        }) }) },
    // T: PAID is refused with no other card in hand, as every PAID discard line.
    { slot: 'P-07', option: 'c', name: 'Shed the Shell', type: 'spell', color: PURPLE, spellLaw: { thorns: 8 }, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}.`, c => { c.guard(u.m(4)); }),
        paid: L(`Discard your hand. THORNS {thorns:${u.i(3)}} for each card discarded. EXILE.`, c => {
            const k = c.discardHand();
            for (let i = 0; i < k; i++) c.thorns(u.i(3));
        }, EX) }) },
    { slot: 'P-08', option: 'b', name: 'Spiked Shell', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}. While GUARD HOLDS, your THORNS deal double on the foe's next turn.`, c => {
            c.guard(u.m(4)); c.thornsDoubleWhileGuardHolds();
        }),
        paid: L(`GUARD {guard:${u.m(9)}}. While GUARD HOLDS, your THORNS deal double on the foe's next turn.`, c => {
            c.guard(u.m(9)); c.thornsDoubleWhileGuardHolds();
        }) }) },
    // T: REFLECT is up before the foe's first strike lands, so it reflects that strike too.
    { slot: 'P-09', option: 'b', name: 'Riposte', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, REFLECT ${u.m(25)}%.`, c => { c.guard(u.m(3)); c.reflect(u.m(25)); }),
        paid: L(`GUARD {guard:${u.m(6)}}. If the foe attacks on their turn, REFLECT ${u.m(50)}% before they DEAL damage.`, c => {
            c.guard(u.m(6)); c.reflectOnAttack(u.m(50));
        }) }) },
    { slot: 'P-10', option: 'b', name: 'Bramble Carapace', type: 'global', color: BLUE, program: () => turnGlobal(
        'GUARD equal to your THORNS.', c => { c.guard(0, { plus: c.q.thorns }); }) },

    // ── ENGINE: puts the shell and the spikes up, keeps the hand stocked ─────
    { slot: 'E-01', option: 'c', name: 'Studded Guard', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}, THORNS {thorns:${u.i(1)}}.`, c => { c.guard(u.m(4)); c.thorns(u.i(1)); }),
        paid: L(`Discard 1 card at random. GUARD {guard:${u.m(10)}}, THORNS {thorns:${u.i(3)}}.`, c => {
            c.discardRandom(1); c.guard(u.m(10)); c.thorns(u.i(3));
        }) }) },
    { slot: 'E-02', option: 'b', name: 'Barbed Wall', type: 'skill', color: PURPLE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, THORNS {thorns:${u.i(1)}}.`, c => { c.guard(u.m(3)); c.thorns(u.i(1)); }),
        paid: L(`GUARD {guard:${u.m(5)}}, THORNS {thorns:${u.i(3)}}.`, c => { c.guard(u.m(5)); c.thorns(u.i(3)); }) }) },
    { slot: 'E-03', option: 'b', name: 'Mirrorhide', type: 'skill', color: BLUE, program: u => ({
        free: L(`REFLECT ${u.m(50)}%.`, c => { c.reflect(u.m(50)); }),
        paid: L(`REFLECT ${u.m(100)}%.`, c => { c.reflect(u.m(100)); }) }) },
    { slot: 'E-04', option: 'a', name: 'Hedge Strike', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}, GUARD {guard:${u.m(2)}}, THORNS {thorns:${u.i(1)}}.`, c => {
            c.deal(u.m(2)); c.guard(u.m(2)); c.thorns(u.i(1));
        }),
        paid: L(`DEAL {deal:${u.m(3)}}, GUARD {guard:${u.m(4)}}, THORNS {thorns:${u.i(2)}}.`, c => {
            c.deal(u.m(3)); c.guard(u.m(4)); c.thorns(u.i(2));
        }) }) },
    { slot: 'E-05', option: 'c', name: 'Briar Surge', type: 'spell', color: PURPLE, spellLaw: { thorns: 6 }, program: u => ({
        free: L(`THORNS {thorns:${u.i(3)}}.`, c => { c.thorns(u.i(3)); }),
        paid: L(`Discard 2 cards at random. THORNS {thorns:${u.i(8)}}. EXILE.`, c => {
            c.discardRandom(2); c.thorns(u.i(8));
        }, EX) }) },
    { slot: 'E-06', option: 'c', name: 'Overgrowth', type: 'spell', color: PURPLE, program: u => ({
        free: L(`THORNS {thorns:${u.i(3)}}.`, c => { c.thorns(u.i(3)); }),
        paid: L('Double your THORNS. EXILE.', c => { c.doubleThorns(); }, EX) }) },
    { slot: 'E-07', option: 'c', name: 'Thorn Lash', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(1)}}, THORNS {thorns:${u.i(2)}}.`, c => { c.deal(u.m(1)); c.thorns(u.i(2)); }),
        paid: L(`Discard 1 card at random. DEAL {deal:${u.m(5)}}, THORNS {thorns:${u.i(5)}}.`, c => {
            c.discardRandom(1); c.deal(u.m(5)); c.thorns(u.i(5));
        }) }) },
    { slot: 'E-08', option: 'b', name: 'Polished Shell', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, REFLECT ${u.m(25)}%.`, c => { c.guard(u.m(3)); c.reflect(u.m(25)); }),
        paid: L(`GUARD {guard:${u.m(6)}}, REFLECT ${u.m(50)}%.`, c => { c.guard(u.m(6)); c.reflect(u.m(50)); }) }) },
    // T: "Can't wrap yourself in roses and expect not to get pricked."
    { slot: 'E-09', option: 'c', name: 'Rose Wrap', type: 'global', color: PURPLE, program: u => turnGlobal(
        `lose 3 VITAE, THORNS {thorns:${u.i(3)}}.`, c => { c.loseVitae(3); c.thorns(u.i(3)); }) },
    { slot: 'E-10', option: 'c', name: 'Gather Thistles', type: 'skill', color: RED, program: u => ({
        free: L(`DRAW 1, THORNS {thorns:${u.i(1)}}.`, c => { c.draw(1); c.thorns(u.i(1)); }),
        paid: L(`DRAW 2, THORNS {thorns:${u.i(2)}}.`, c => { c.draw(2); c.thorns(u.i(2)); }) }) },

    // ── MISC: utility around it ──────────────────────────────────────────────
    { slot: 'M-01', option: 'b', name: 'Hunker Down', type: 'skill', color: BLUE, program: u => ({
        free: L(`DRAW 1, GUARD {guard:${u.m(4)}}.`, c => { c.draw(1); c.guard(u.m(4)); }),
        paid: L(`DRAW 2, GUARD {guard:${u.m(8)}}.`, c => { c.draw(2); c.guard(u.m(8)); }) }) },
    { slot: 'M-02', option: 'b', name: 'Mend the Shell', type: 'skill', color: BLUE, program: () => ({
        free: L('HEAL equal to your GUARD.', c => { c.heal(0, { plus: c.q.guard }); }),
        paid: L('HEAL equal to your GUARD + your THORNS.', c => { c.heal(0, { plus: c.q.guard + c.q.thorns }); }) }) },
    { slot: 'M-03', option: 'b', name: 'Crack the Armour', type: 'skill', color: RED, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, VULNERABLE +{vuln:${u.m(50)}}% for 1 turn.`, c => {
            c.guard(u.m(3)); c.vulnerable(u.m(50), 1);
        }),
        paid: L(`GUARD {guard:${u.m(6)}}, VULNERABLE +{vuln:${u.m(75)}}% for 2 turns.`, c => {
            c.guard(u.m(6)); c.vulnerable(u.m(75), 2);
        }) }) },
    { slot: 'M-04', option: 'b', name: 'Turtle Up', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}.`, c => { c.guard(u.m(4)); }),
        paid: L(`GUARD {guard:${u.m(4)}}. You don't lose your GUARD at the end of the enemy's turn this turn.`, c => {
            c.guard(u.m(4)); c.holdGuard();
        }) }) },
    { slot: 'M-05', option: 'c', name: 'Prickly Resolve', type: 'skill', color: RED, program: u => ({
        free: L(`Gain ${u.i(1)} Conviction. THORNS {thorns:${u.i(1)}}.`, c => { c.conviction(u.i(1)); c.thorns(u.i(1)); }),
        paid: L(`Discard 1 card at random. Gain ${u.i(3)} Conviction. THORNS {thorns:${u.i(2)}}.`, c => {
            c.discardRandom(1); c.conviction(u.i(3)); c.thorns(u.i(2));
        }) }) },
    { slot: 'M-06', option: 'b', name: 'Steady Shell', type: 'global', color: PURPLE, program: () => turnGlobal(
        'DRAW 1.', c => { c.draw(1); }) },
    { slot: 'M-07', option: 'c', name: 'Rummage', type: 'skill', color: PURPLE, program: () => ({
        free: L('RETRIEVE 1.', c => { c.retrieve(1); }),
        paid: L('Return a random exiled card to your draw pile.', c => { c.unexileRandom(); }) }) },
    { slot: 'M-08', option: 'c', name: 'Nettle Poke', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(1)}}, THORNS {thorns:${u.i(2)}}.`, c => { c.deal(u.m(1)); c.thorns(u.i(2)); }),
        paid: L(`DEAL {deal:${u.m(2)}}, THORNS {thorns:${u.i(2)}}, DRAW 1.`, c => {
            c.deal(u.m(2)); c.thorns(u.i(2)); c.draw(1);
        }) }) },
    // T: a property of the card, printed once, fired by a random discard and by the scrap.
    { slot: 'M-09', option: 'a', name: 'Loose Spine', type: 'attack', color: RED,
        onDiscard: u => ({
            text: `If this card is discarded, THORNS {thorns:${u.i(2)}}.`,
            run: c => { c.thorns(u.i(2)); },
        }),
        program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}.`, c => { c.guard(u.m(4)); }),
        paid: L(`DEAL {deal:${u.m(5)}}, GUARD {guard:${u.m(4)}}.`, c => { c.deal(u.m(5)); c.guard(u.m(4)); }) }) },
    // T's own card: the withdraw slot, cut and rewritten as a Global.
    { slot: 'M-10', option: 'new', name: 'Lacquered Shell', type: 'global', color: PURPLE, program: u => turnGlobal(
        `REFLECT ${u.m(15)}%.`, c => { c.reflect(u.m(15)); }) },
];

/** The card id of a slot: `df-p-01a`; T's own M-10 is `df-m-10n`. */
const idOf = (e: Entry): string => `df-${e.slot.toLowerCase()}${e.option === 'new' ? 'n' : e.option}`;

function toCard(e: Entry): Card {
    const withRider = (u: UpgradeScale): CardProgram => ({
        ...e.program(u),
        ...(e.onDiscard ? { onDiscard: e.onDiscard(u) } : {}),
    });
    return {
        id: idOf(e),
        name: e.name,
        color: e.color,
        description: `Defender trial card, ${SUB_LANE[e.slot[0]]} sub-lane.`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.type === 'attack' ? 'enemy' : 'self',
        program: withRider(upgradeScale(0)),
        programAt: withRider,
        ...(e.spellLaw ? { spellLawBaseline: e.spellLaw } : {}),
        addedIn: ADDED,
        tags: ['defender', 'trial'],
    };
}

const LANE_CARDS: Card[] = ENTRIES.map(toCard);

/** The card id of a ledger slot. */
const slotId = (slot: string): string => {
    const e = ENTRIES.find(x => x.slot === slot);
    if (!e) throw new Error(`no Defender slot ${slot}`);
    return idOf(e);
};

/** The Defender lane: the 30 cards, and the 20-card test deck. */
const DEFENDER_LANE: CardLane = Object.freeze({
    id: 'defender',
    name: 'Defender',
    cardIds: Object.freeze(LANE_CARDS.map(card => card.id)),
    // T, 2026-10-26: every Global and every Spell, each payoff with its setup, no copies.
    // 7 red, 6 blue, 7 purple.
    testDeck: Object.freeze([
        'P-01', 'P-03', 'P-06', 'E-04', 'E-07', 'M-08', 'M-09',
        'P-02', 'P-08', 'P-10', 'E-01', 'E-03', 'M-01',
        'P-07', 'E-05', 'E-06', 'E-09', 'M-06', 'M-07', 'M-10',
    ].map(slotId)),
});

/** The Defender trial set. */
export const DEFENDER_SET: TrialSet = Object.freeze({
    id: 'defender',
    cards: Object.freeze(LANE_CARDS),
    lanes: Object.freeze([DEFENDER_LANE]),
});
