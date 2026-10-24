/**
 * THE ELEMENTALIST TRIAL SET — the weather in play.
 *
 * The 30 kept cards of the Elementalist rehearsal ballot
 * (`plan/card-ledger/rehearsal-elementalist.md`, "as kept, with T's notes
 * applied"), at the sims' adjusted numbers (`plan/card-ledger/elementalist-sims.md`:
 * DEAL and INFERNO halved, STORM trimmed, M-07's VULNERABLE per STORM doubled).
 * Three sub-lanes of ten: Payoff (P), Engine (E) and Misc (M). Ids are
 * `el-<slot><option>`; T's own M-10 is `el-m-10n`. Names are placeholders,
 * "Elementalist <slot>", until T names them (lane-creator step 7).
 *
 * A removable trial set (plan/revamp/cards.md → "The trial set"): this file
 * is the whole set, and `cards.library.ts` registers it in one line. The
 * weather (INFERNO, BLIZZARD, FROZEN, STORM) and DRAW are general systems in
 * `Combat/combat.elements.ts` and `Combat/combat.card-program.ts`; nothing
 * outside this file and its own test names a card here.
 *
 * Colour by job (the sims' table): a hit is red (body), a wall, heal or
 * utility card blue (mind), an affliction (the main payoff an element or
 * VULNERABLE) purple (heart). 9 red, 11 blue, 10 purple.
 *
 * Numbers, until T's revisions:
 *   - DEAL, GUARD, HEAL and VULNERABLE print as number tokens and scale
 *     with the stats, as live. INFERNO, BLIZZARD and STORM are unscaled.
 *   - A number a line reads off the fight ("GUARD equal to the foe's
 *     BLIZZARD") is added unscaled, as an already-resolved number.
 *   - One upgrade, as commons: DEAL, GUARD, HEAL, VULNERABLE and their caps
 *     take the MAGNITUDE step; INFERNO, BLIZZARD, STORM, the STORM's growth
 *     and Conviction take the INTENSITY step (+1). DRAW and the multipliers
 *     ("twice", "doubled", "+2 per BLIZZARD spent") hold, so a card whose
 *     only numbers are those upgrades to the same card (Blood Price's
 *     Pinpricks precedent); its own test names them.
 *
 * Globals print one line: the PAID line equals the FREE line, and paying
 * makes it permanent (T's note on P-10 and M-08).
 *
 * This file is data-only.
 */

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import type { CardLane, TrialSet } from '../card.lanes';
import { spellPaidScale, upgradeScale, type UpgradeScale } from '../card-upgrade.scale';

const ADDED = '2026-10-24';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

/** A Spell's PAID scale: one step past the card's upgrade level (`spellPaidScale`).
 *  A DRAW is not on the upgrade scale, so a Spell's DRAW is written one higher. */
const S = spellPaidScale;
/** A Spell's PAID line EXILEs (the Spell law, T, 2026-10-24). */
const EX: Partial<ProgramLine> = { exile: true };

interface Entry {
    /** The ledger slot, `P-01`. */
    slot: string;
    /** The kept option, `b`; `new` for T's own card. */
    option: string;
    type: CardType;
    color: CardAspect;
    program: (u: UpgradeScale) => CardProgram;
    /** A Spell's PAID payoffs before the Spell law raised them (`Card.spellLawBaseline`). */
    spellLaw?: Readonly<Record<string, number>>;
}

/** A start-of-turn Global whose PAID line equals its FREE line. */
function turnGlobal(text: string, body: (c: ProgramCtx) => void, stormGrowth?: number): CardProgram {
    return { global: { trigger: 'turn', text, free: c => body(c), paid: c => body(c), ...(stormGrowth ? { stormGrowth } : {}) } };
}

const SUB_LANE: Record<string, string> = { P: 'Payoff', E: 'Engine', M: 'Misc' };

const ENTRIES: Entry[] = [
    // ── PAYOFF: benefits for having the elements up ──────────────────────────
    { slot: 'P-01', option: 'b', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}.`, c => { c.deal(u.m(3)); }),
        paid: L(`DEAL {deal:${u.m(4)}}, doubled if the foe is burning.`, c => {
            c.deal(u.m(4) * (c.q.foeInferno > 0 ? 2 : 1));
        }) }) },
    { slot: 'P-02', option: 'b', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}.`, c => { c.deal(u.m(3)); }),
        paid: L(`DEAL {deal:${u.m(9)}}; INFERNO ${u.i(4)} (you and the foe both burn).`, c => {
            c.deal(u.m(9)); c.inferno(u.i(4), 'both');
        }) }) },
    // T: no max on either line.
    { slot: 'P-03', option: 'a', type: 'skill', color: BLUE, program: () => ({
        free: L("GUARD equal to the foe's BLIZZARD.", c => { c.guard(0, { plus: c.q.blizzard }); }),
        paid: L("GUARD twice the foe's BLIZZARD.", c => { c.guard(0, { plus: 2 * c.q.blizzard }); }) }) },
    { slot: 'P-04', option: 'a', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}, BLIZZARD ${u.i(2)}.`, c => { c.deal(u.m(2)); c.blizzard(u.i(2)); }),
        paid: L(`Spend all the foe's BLIZZARD: DEAL {deal:${u.m(3)}}, +2 per BLIZZARD spent.`, c => {
            const b = c.spendBlizzard(); c.deal(u.m(3), { plus: 2 * b });
        }) }) },
    // The trigger does not grow the STORM (the sims' reading).
    // The Spell law (T, 2026-10-24): the STORM is triggered twice, not once.
    { slot: 'P-05', option: 'b', type: 'spell', color: RED, spellLaw: { stormTick: 4 }, program: u => ({
        free: L(`STORM ${u.i(1)}; DEAL equal to the foe's STORM.`, c => {
            const s0 = c.q.storm; c.storm(u.i(1)); c.deal(0, { plus: s0 + u.i(1) });
        }),
        paid: L("Trigger the foe's STORM twice. EXILE.", c => { c.triggerStorm(); c.triggerStorm(); }, EX) }) },
    { slot: 'P-06', option: 'b', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}, DRAW 1.`, c => { c.guard(u.m(3)); c.draw(1); }),
        paid: L(`GUARD {guard:${u.m(5)}}, + the foe's STORM (max +${u.m(12)}). DRAW 1.`, c => {
            c.guard(u.m(5), { plus: Math.min(u.m(12), c.q.storm) }); c.draw(1);
        }) }) },
    { slot: 'P-07', option: 'a', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}, INFERNO ${u.i(1)}.`, c => { c.deal(u.m(3)); c.inferno(u.i(1), 'both'); }),
        paid: L(`DEAL {deal:${u.m(5)}}, INFERNO ${u.i(2)}; if the foe is FROZEN, the INFERNO is doubled too.`, c => {
            const frozen = c.q.frozen;
            c.deal(u.m(5)); c.inferno(u.i(2) * (frozen ? 2 : 1), 'both');
        }) }) },
    { slot: 'P-08', option: 'b', type: 'skill', color: PURPLE, program: () => ({
        free: L("GUARD equal to the foe's BLIZZARD + STORM.", c => { c.guard(0, { plus: c.q.blizzard + c.q.storm }); }),
        paid: L("Double the foe's BLIZZARD and STORM.", c => { c.doubleBlizzardAndStorm(); }) }) },
    { slot: 'P-09', option: 'a', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}, + your INFERNO (max +${u.m(6)}).`, c => {
            c.deal(u.m(2), { plus: Math.min(u.m(6), c.q.yourInferno) });
        }),
        paid: L(`DEAL {deal:${u.m(4)}}, + your INFERNO + the foe's STORM.`, c => {
            c.deal(u.m(4), { plus: c.q.yourInferno + c.q.storm });
        }) }) },
    { slot: 'P-10', option: 'b', type: 'global', color: RED, program: u => turnGlobal(
        `if the foe has two or more elements, DEAL {deal:${u.m(3)}}.`,
        c => { if (c.q.elementsOnFoe >= 2) c.deal(u.m(3)); }) },

    // ── ENGINE: puts the elements up and makes them grow ─────────────────────
    { slot: 'E-01', option: 'b', type: 'spell', color: PURPLE, spellLaw: { inferno: 4, guard: 5 }, program: u => ({
        free: L(`INFERNO ${u.i(2)}, GUARD {guard:${u.m(2)}}.`, c => { c.inferno(u.i(2), 'both'); c.guard(u.m(2)); }),
        paid: L(`INFERNO ${S(u).w(4)}, GUARD {guard:${S(u).m(5)}}. EXILE.`, c => { c.inferno(S(u).w(4), 'both'); c.guard(S(u).m(5)); }, EX) }) },
    { slot: 'E-02', option: 'c', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}.`, c => { c.deal(u.m(3)); }),
        paid: L(`DEAL {deal:${u.m(4)}}, then INFERNO equal to half the damage dealt.`, c => {
            const d = c.deal(u.m(4)); c.inferno(Math.floor(d / 2), 'both');
        }) }) },
    { slot: 'E-03', option: 'b', type: 'spell', color: PURPLE, spellLaw: { blizzard: 6, draw: 1 }, program: u => ({
        free: L(`BLIZZARD ${u.i(2)}, DRAW 1.`, c => { c.blizzard(u.i(2)); c.draw(1); }),
        paid: L(`BLIZZARD ${S(u).w(6)}, DRAW 2. EXILE.`, c => { c.blizzard(S(u).w(6)); c.draw(2); }, EX) }) },
    { slot: 'E-04', option: 'c', type: 'skill', color: PURPLE, program: u => ({
        free: L(`BLIZZARD ${u.i(3)}.`, c => { c.blizzard(u.i(3)); }),
        paid: L(`BLIZZARD ${u.i(5)}, then GUARD equal to the foe's BLIZZARD.`, c => {
            const b0 = c.q.blizzard; c.blizzard(u.i(5)); c.guard(0, { plus: b0 + u.i(5) });
        }) }) },
    { slot: 'E-05', option: 'b', type: 'spell', color: PURPLE, spellLaw: { storm: 2, draw: 2 }, program: u => ({
        free: L(`STORM ${u.i(1)}, DRAW 1.`, c => { c.storm(u.i(1)); c.draw(1); }),
        paid: L(`STORM ${S(u).w(2)}, DRAW 3. EXILE.`, c => { c.storm(S(u).w(2)); c.draw(3); }, EX) }) },
    // T's note: a Global; while it is in play the STORM grows by 1 extra.
    { slot: 'E-06', option: 'a', type: 'global', color: RED, program: u => turnGlobal(
        `(while in play) the STORM grows by ${u.i(1)} extra.`,
        c => { c.stormGrowthMarker(u.i(1)); }, u.i(1)) },
    { slot: 'E-07', option: 'b', type: 'skill', color: BLUE, program: () => ({
        free: L('DRAW 2.', c => { c.draw(2); }),
        paid: L('DRAW 2, then STORM equal to the cards in your hand.', c => {
            const h0 = c.q.handSize; c.draw(2);
            // Apply mode reads the hand after the draw; the witness's estimate assumes the draw landed.
            const h = c.q.handSize > h0 ? c.q.handSize : h0 + 2;
            c.storm(h);
        }) }) },
    // The Spell law (T, 2026-10-24): the foe gains twice your INFERNO, not once.
    { slot: 'E-08', option: 'c', type: 'spell', color: PURPLE, spellLaw: { blizzard: 4, inferno: 4 }, program: u => ({
        free: L(`BLIZZARD ${u.i(2)}, INFERNO ${u.i(1)} on the foe only.`, c => { c.blizzard(u.i(2)); c.inferno(u.i(1), 'foe'); }),
        paid: L('Steam: remove your INFERNO; the foe gains twice that much BLIZZARD and INFERNO. EXILE.', c => {
            const y = c.removeYourInferno(); c.blizzard(2 * y); c.inferno(2 * y, 'foe');
        }, EX) }) },
    { slot: 'E-09', option: 'b', type: 'global', color: PURPLE, program: () => turnGlobal(
        "BLIZZARD equal to half the foe's STORM.",
        c => { c.blizzard(Math.floor(c.q.storm / 2)); }) },
    { slot: 'E-10', option: 'c', type: 'spell', color: BLUE, spellLaw: { draw: 1 }, program: u => ({
        free: L(`DRAW 1, STORM ${u.i(1)}.`, c => { c.draw(1); c.storm(u.i(1)); }),
        paid: L('Swap the numbers of two elements on the foe. DRAW 2. EXILE.', c => { c.swapElements(); c.draw(2); }, EX) }) },

    // ── MISC: related utility ────────────────────────────────────────────────
    { slot: 'M-01', option: 'a', type: 'skill', color: BLUE, program: () => ({
        free: L('Remove your INFERNO.', c => { c.removeYourInferno(); }),
        paid: L('HEAL twice your INFERNO, then remove your INFERNO.', c => {
            c.heal(0, { plus: 2 * c.q.yourInferno }); c.removeYourInferno();
        }) }) },
    { slot: 'M-02', option: 'a', type: 'skill', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(2)}}, + the foe's BLIZZARD.`, c => { c.heal(u.m(2), { plus: c.q.blizzard }); }),
        paid: L(`HEAL {heal:${u.m(4)}}, + twice the foe's BLIZZARD.`, c => { c.heal(u.m(4), { plus: 2 * c.q.blizzard }); }) }) },
    { slot: 'M-03', option: 'a', type: 'skill', color: BLUE, program: u => ({
        free: L('DRAW 2.', c => { c.draw(2); }),
        paid: L(`DRAW 2, BLIZZARD ${u.i(2)}, GUARD {guard:${u.m(2)}}.`, c => {
            c.draw(2); c.blizzard(u.i(2)); c.guard(u.m(2));
        }) }) },
    { slot: 'M-04', option: 'a', type: 'spell', color: PURPLE, spellLaw: { inferno: 3, blizzard: 3, storm: 3 }, program: u => ({
        free: L(`INFERNO ${u.i(1)}, BLIZZARD ${u.i(1)}, STORM ${u.i(1)}.`, c => {
            const k = u.i(1); c.inferno(k, 'both'); c.blizzard(k); c.storm(k);
        }),
        paid: L(`INFERNO ${S(u).w(3)}, BLIZZARD ${S(u).w(3)}, STORM ${S(u).w(3)}. EXILE.`, c => {
            const k = S(u).w(3); c.inferno(k, 'both'); c.blizzard(k); c.storm(k);
        }, EX) }) },
    { slot: 'M-05', option: 'c', type: 'skill', color: BLUE, program: u => ({
        free: L(`DRAW 1; gain ${u.i(1)} Conviction.`, c => { c.draw(1); c.conviction(u.i(1)); }),
        paid: L(`DRAW 1; gain ${u.i(2)} Conviction per different element on the foe.`, c => {
            c.draw(1); c.conviction(u.i(2) * c.q.elementsOnFoe);
        }) }) },
    { slot: 'M-06', option: 'a', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(4)}}, doubled if the foe is FROZEN.`, c => { c.guard(u.m(4) * (c.q.frozen ? 2 : 1)); }),
        paid: L(`GUARD {guard:${u.m(9)}}, doubled if the foe is FROZEN.`, c => { c.guard(u.m(9) * (c.q.frozen ? 2 : 1)); }) }) },
    { slot: 'M-07', option: 'b', type: 'spell', color: PURPLE, spellLaw: { vulnerable: 40 }, program: u => ({
        free: L(`STORM ${u.i(1)}.`, c => { c.storm(u.i(1)); }),
        paid: L(`VULNERABLE +{vuln:${S(u).m(10)}}% per STORM on the foe, for 2 turns. EXILE.`, c => {
            c.vulnerable(S(u).m(10) * c.q.storm, 2);
        }, EX) }) },
    { slot: 'M-08', option: 'c', type: 'global', color: PURPLE, program: u => turnGlobal(
        `STORM ${u.i(1)}, DRAW 1.`,
        c => { c.storm(u.i(1)); c.draw(1); }) },
    { slot: 'M-09', option: 'c', type: 'skill', color: BLUE, program: () => ({
        free: L('Move half your INFERNO onto the foe.', c => { c.moveYourInferno('half'); }),
        paid: L('HEAL equal to your INFERNO, then move your INFERNO onto the foe.', c => {
            c.heal(0, { plus: c.q.yourInferno }); c.moveYourInferno('all');
        }) }) },
    // T's own card, written in sitting 3's general note.
    { slot: 'M-10', option: 'new', type: 'global', color: BLUE, program: u => turnGlobal(
        `STORM ${u.i(1)}, then HEAL equal to the foe's STORM.`,
        c => { const s0 = c.q.storm; c.storm(u.i(1)); c.heal(0, { plus: s0 + u.i(1) }); }) },
];

/** The card id of a slot: `el-p-01b`; T's own M-10 is `el-m-10n`. */
const idOf = (e: Entry): string => `el-${e.slot.toLowerCase()}${e.option === 'new' ? 'n' : e.option}`;

function toCard(e: Entry): Card {
    return {
        id: idOf(e),
        name: `Elementalist ${e.slot}`,
        color: e.color,
        description: `Elementalist trial card, ${SUB_LANE[e.slot[0]]} sub-lane.`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.color === BLUE ? 'self' : 'enemy',
        program: e.program(upgradeScale(0)),
        programAt: e.program,
        ...(e.spellLaw ? { spellLawBaseline: e.spellLaw } : {}),
        addedIn: ADDED,
        tags: ['elementalist', 'trial'],
    };
}

const LANE_CARDS: Card[] = ENTRIES.map(toCard);

/** The card id of a ledger slot. */
const slotId = (slot: string): string => {
    const e = ENTRIES.find(x => x.slot === slot);
    if (!e) throw new Error(`no Elementalist slot ${slot}`);
    return idOf(e);
};

/** The Elementalist lane: the 30 cards, and the 20-card test deck. */
const ELEMENTALIST_LANE: CardLane = Object.freeze({
    id: 'elementalist',
    name: 'Elementalist',
    cardIds: Object.freeze(LANE_CARDS.map(card => card.id)),
    // T, 2026-10-24: the sims' best-played 20, taken within each colour.
    // 7 red, 7 blue, 6 purple, one copy each.
    testDeck: Object.freeze([
        'P-10', 'P-02', 'P-07', 'P-05', 'E-02', 'P-04', 'P-09',
        'M-10', 'E-07', 'M-09', 'P-03', 'P-06', 'M-05', 'M-06',
        'M-08', 'E-09', 'M-04', 'P-08', 'E-04', 'E-05',
    ].map(slotId)),
});

/** The Elementalist trial set. */
export const ELEMENTALIST_SET: TrialSet = Object.freeze({
    id: 'elementalist',
    cards: Object.freeze(LANE_CARDS),
    lanes: Object.freeze([ELEMENTALIST_LANE]),
});
