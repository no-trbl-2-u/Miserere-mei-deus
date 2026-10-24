/**
 * THE BLOOD PRICE TRIAL SET — "I pay in my own blood for power."
 *
 * The 30 cards of the Blood Price trial set (`plan/card-ledger/rehearsal-blood-price.md`):
 * 25 kept from the rehearsal ballot on 2026-10-11 and five SACRIFICE cards T
 * added in revision 2 the same day (ids ending `n`, in the slots of the five
 * Curse cards that revision cut), plus the grey Curse. Three sub-lanes of
 * ten: Payoff (P), Engine (E) and Misc (M). Ids are `bp-<slot><option>`.
 *
 * The grey Curse stays defined for foes to add later. No card in the lane
 * adds one, and it is in no lane, reward pool or deck.
 *
 * A removable trial set (plan/revamp/cards.md → "The trial set"): this file
 * is the whole set, and `cards.library.ts` registers it in one line. The
 * engine pieces the cards use (Global, Curse, SACRIFICE, WAIVE, EXILE, HEAL,
 * TETHER, LEECH) are general systems in `Combat/combat.card-program.ts`;
 * nothing outside this file and its own test names a card here.
 *
 * Colour is what the PAID line's main effect lands on: damage to the foe is
 * body (red), anything on you is mind (blue), a status on the foe is heart
 * (purple). Printed text uses number tokens (`card-program.types.ts`) so a
 * face prints the number the player's stats make it.
 *
 * This file is data-only.
 */

import type { Card, CardAspect, CardRank, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import type { CardLane, TrialSet } from '../card.lanes';
import { upgradeScale, type UpgradeScale } from '../card-upgrade.scale';

const ADDED = '2026-10-11';

/** The grey Curse's id. */
const CURSE_ID = 'bp-curse';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

/** A Global's trigger amount in print: `n`, or `n+2` once upgraded. */
const nPlus = (u: UpgradeScale): string => (u.plus > 0 ? `n+${u.plus}` : 'n');

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

interface Entry {
    slot: string;
    type: CardType;
    color: CardAspect;
    /** The card's lines at an upgrade level (Phase UP1b): payoffs and their
     *  caps go through `u`; costs (SACRIFICE, TETHER, EXILE) never do. */
    program: (u: UpgradeScale) => CardProgram;
    /** The card's name, read off what it does (Phase UP1a). The slot is the id, never the name. */
    name: string;
    /** The card's rank when it is not Ash (1). Rarity, and so its upgrade limit, derives from it. */
    rank?: CardRank;
}

/** Blood for Blood's PAID X cap, and how much each upgrade raises it (T, 2026-10-23). */
export const BLOOD_FOR_BLOOD_X_CAP = 12;
export const BLOOD_FOR_BLOOD_X_CAP_STEP = 3;

const SUB_LANE: Record<string, string> = { P: 'Payoff', E: 'Engine', M: 'Misc' };

const ENTRIES: Entry[] = [
    // ── PAYOFF: benefits for sacrificing ─────────────────────────────────────
    { slot: 'p-01a', name: 'Forfeit Strike', type: 'attack', color: RED, program: u => ({
        free: L(`SACRIFICE 2, DEAL {deal:${u.m(7)}}.`, c => { c.sacrifice(2); c.deal(u.m(7)); }),
        paid: L(`SACRIFICE 4, DEAL {deal:${u.m(16)}}.`, c => { c.sacrifice(4); c.deal(u.m(16)); }) }) },
    { slot: 'p-02a', name: 'Scar Tissue', type: 'skill', color: BLUE, program: u => ({
        free: L(`SACRIFICE 2, GUARD {guard:${u.m(7)}}.`, c => { c.sacrifice(2); c.guard(u.m(7)); }),
        paid: L(`SACRIFICE 4, GUARD {guard:${u.m(16)}}.`, c => { c.sacrifice(4); c.guard(u.m(16)); }) }) },
    { slot: 'p-03a', name: 'Cornered', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(3)}}, or {deal:${u.m(6)}} at half VITAE or less.`, c => { c.deal(c.q.atHalf ? u.m(6) : u.m(3)); }),
        paid: L(`DEAL {deal:${u.m(6)}}, or {deal:${u.m(14)}} at half VITAE or less.`, c => { c.deal(c.q.atHalf ? u.m(14) : u.m(6)); }) }) },
    // Reworked by T 2026-10-14: the half-VITAE gate left it dead above half.
    // The PAID line's own SACRIFICE counts toward the VITAE lost this round,
    // and the heal is unscaled (an already-resolved number, like P-07b).
    { slot: 'p-04c', name: 'Returned Twofold', type: 'spell', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(10)}}.`, c => { c.heal(u.m(10)); }),
        paid: L('SACRIFICE 10, HEAL twice the VITAE you lost this round. EXILE.', c => {
            c.sacrifice(10);
            c.heal(2 * c.q.lostThisRound, { exact: true });
        }, { exile: true }) }) },
    { slot: 'p-05b', name: 'Shared Wound', type: 'spell', color: PURPLE, program: u => ({
        free: L(`SACRIFICE 3, VULNERABLE +{vuln:${u.m(20)}}% for 1 turn.`, c => { c.sacrifice(3); c.vulnerable(u.m(20), 1); }),
        paid: L(`SACRIFICE 6, VULNERABLE +{vuln:${u.m(50)}}% for 2 turns.`, c => { c.sacrifice(6); c.vulnerable(u.m(50), 2); }) }) },
    { slot: 'p-06d', name: 'What Is Owed', type: 'skill', color: PURPLE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}.`, c => { c.guard(u.m(3)); }),
        paid: L(`LEECH 1 per 10 VITAE missing (max ${u.i(8)}).`, c => { c.leech(Math.min(u.i(8), Math.floor(c.q.missing / 10))); }) }) },
    { slot: 'p-07b', name: 'Full Tally', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL half the VITAE you lost this combat (max ${u.m(10)}).`, c => { c.deal(Math.min(u.m(10), Math.floor(c.q.lostThisCombat / 2)), { exact: true }); }),
        paid: L(`DEAL all the VITAE you lost this combat (max ${u.m(30)}). EXILE.`, c => { c.deal(Math.min(u.m(30), c.q.lostThisCombat), { exact: true }); }, { exile: true }) }) },
    { slot: 'p-08d', name: 'Binding Vow', type: 'skill', color: PURPLE, program: u => ({
        free: L(`SACRIFICE 2, gain ${u.i(2)} Conviction.`, c => { c.sacrifice(2); c.conviction(u.i(2)); }),
        paid: L('TETHER 3. SACRIFICE 4.', c => { c.tether(3); c.sacrifice(4); }) }) },
    { slot: 'p-09b', name: 'Uneven Trade', type: 'spell', color: RED, program: u => ({
        free: L(`SACRIFICE 4; the foe loses ${u.m(6)} VITAE.`, c => { c.sacrifice(4); c.foeLoses(u.m(6)); }),
        paid: L(`SACRIFICE 8; the foe loses ${u.m(12)} VITAE, VULNERABLE +{vuln:${u.m(25)}}% for 1 turn.`, c => { c.sacrifice(8); c.foeLoses(u.m(12)); c.vulnerable(u.m(25), 1); }) }) },
    { slot: 'p-10c', name: 'Callus', type: 'global', color: RED, program: u => ({
        global: { trigger: 'sac', text: `GUARD ${nPlus(u)}.`, paidDelta: `DEAL ${nPlus(u)} instead.`,
            free: (c, n) => { c.guard(n + u.plus); }, paid: (c, n) => { c.deal(n + u.plus); } } }) },

    // ── ENGINE: helps you trigger SACRIFICE ──────────────────────────────────
    { slot: 'e-01n', name: 'Bloodletting', type: 'spell', color: BLUE, program: u => ({
        free: L(`SACRIFICE 3, gain ${u.i(2)} Conviction.`, c => { c.sacrifice(3); c.conviction(u.i(2)); }),
        paid: L(`SACRIFICE 6, gain ${u.i(4)} Conviction.`, c => { c.sacrifice(6); c.conviction(u.i(4)); }) }) },
    // No payoff number: SACRIFICE and TETHER are costs, so an upgrade
    // changes nothing here (Phase UP1b leaves this card to T).
    { slot: 'e-02d', name: 'Pinpricks', type: 'skill', color: PURPLE, program: () => ({
        free: L('SACRIFICE 1, twice.', c => { c.sacrifice(1); c.sacrifice(1); }),
        paid: L('TETHER 2. SACRIFICE 1, three times.', c => { c.tether(2); for (let i = 0; i < 3; i++) c.sacrifice(1); }) }) },
    { slot: 'e-03d', name: 'Slow Drip', type: 'global', color: PURPLE, program: u => ({
        global: { trigger: 'turn', text: `SACRIFICE 2, LEECH {leech:${u.i(1)}}.`,
            free: c => { c.sacrifice(2); c.leech(u.i(1)); }, paid: c => { c.sacrifice(2); c.leech(u.i(1)); } } }) },
    { slot: 'e-04c', name: 'Remission', type: 'spell', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}.`, c => { c.guard(u.m(3)); }),
        paid: L(`WAIVE your next SACRIFICE this turn. Gain ${u.i(1)} Conviction.`, c => { c.sacModifier({ kind: 'next-free', count: 1 }); c.conviction(u.i(1)); }) }) },
    { slot: 'e-05n', name: 'Open Vein', type: 'skill', color: PURPLE, program: u => ({
        free: L('TETHER 2, SACRIFICE 2.', c => { c.tether(2); c.sacrifice(2); }),
        paid: L(`TETHER 3, SACRIFICE 4, LEECH {leech:${u.i(2)}}.`, c => { c.tether(3); c.sacrifice(4); c.leech(u.i(2)); }) }) },
    { slot: 'e-06b', name: 'Double-Edged', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(6)}}, then SACRIFICE 2.`, c => { c.deal(u.m(6)); c.sacrifice(2); }),
        paid: L(`DEAL {deal:${u.m(9)}}, twice; SACRIFICE 2 after each.`, c => { c.deal(u.m(9)); c.sacrifice(2); c.deal(u.m(9)); c.sacrifice(2); }) }) },
    { slot: 'e-07b', name: 'Raised Stakes', type: 'spell', color: BLUE, program: u => ({
        free: L('Your next SACRIFICE this turn is doubled (its cost and its payoffs).', c => { c.sacModifier({ kind: 'next-double' }); }),
        paid: L(`Same, and gain ${u.i(2)} Conviction.`, c => { c.sacModifier({ kind: 'next-double' }); c.conviction(u.i(2)); }) }) },
    // The library's first rare (Phase UP1c): Skull, three upgrades. FREE grows
    // by the scale. PAID by T's ruling (2026-10-23): X's cap rises by 3 per
    // upgrade (12, 15, 18, 21; the one cost an upgrade may grow) and the third
    // upgrade turns 3X into 4X.
    { slot: 'e-08n', name: 'Blood for Blood', type: 'attack', color: RED, rank: 5, program: u => {
        const cap = BLOOD_FOR_BLOOD_X_CAP + BLOOD_FOR_BLOOD_X_CAP_STEP * u.level;
        const mult = u.level >= 3 ? 4 : 3;
        return {
            free: L(`SACRIFICE 3, DEAL {deal:${u.m(9)}}.`, c => { c.sacrifice(3); c.deal(u.m(9)); }),
            paid: L(`SACRIFICE any amount X (max ${cap}), DEAL ${mult}X.`, c => { const x = c.sacrificeX(cap); c.deal(mult * x); }),
        };
    } },
    { slot: 'e-09n', name: 'Crimson Pact', type: 'global', color: RED, program: u => ({
        global: { trigger: 'sac', text: `your next DEAL this turn deals +${nPlus(u)}.`,
            free: (c, n) => { c.empowerNextDeal(n + u.plus); }, paid: (c, n) => { c.empowerNextDeal(n + u.plus); } } }) },
    // No payoff number, as Pinpricks.
    { slot: 'e-10d', name: 'Name Your Price', type: 'spell', color: PURPLE, program: () => ({
        free: L('TETHER 1. SACRIFICE 2.', c => { c.tether(1); c.sacrifice(2); }),
        paid: L('TETHER 1. SACRIFICE any amount (max 15).', c => { c.tether(1); c.sacrificeX(15); }) }) },

    // ── MISC: related utility ────────────────────────────────────────────────
    { slot: 'm-01d', name: 'Siphon', type: 'skill', color: PURPLE, program: u => ({
        free: L(`HEAL {heal:${u.m(3)}}.`, c => { c.heal(u.m(3)); }),
        paid: L(`LEECH {leech:${u.i(4)}}.`, c => { c.leech(u.i(4)); }) }) },
    { slot: 'm-02b', name: 'Reclaim', type: 'attack', color: RED, program: u => ({
        free: L(`DEAL {deal:${u.m(2)}}.`, c => { c.deal(u.m(2)); }),
        paid: L(`DEAL {deal:${u.m(6)}}; HEAL all the damage dealt (max ${u.m(8)}).`, c => { const d = c.deal(u.m(6)); c.heal(Math.min(u.m(8), d), { exact: true }); }) }) },
    { slot: 'm-03d', name: 'Famished', type: 'skill', color: PURPLE, program: u => ({
        free: L(`GUARD {guard:${u.m(3)}}.`, c => { c.guard(u.m(3)); }),
        paid: L(`LEECH {leech:${u.i(3)}}, or {leech:${u.i(6)}} at half VITAE or less.`, c => { c.leech(c.q.atHalf ? u.i(6) : u.i(3)); }) }) },
    { slot: 'm-04n', name: 'Transfusion', type: 'skill', color: BLUE, program: u => ({
        free: L(`SACRIFICE 3, HEAL {heal:${u.m(6)}} at the start of your next turn.`, c => { c.sacrifice(3); c.healNextTurn(u.m(6)); }),
        paid: L(`SACRIFICE 5, HEAL {heal:${u.m(12)}} at the start of your next turn.`, c => { c.sacrifice(5); c.healNextTurn(u.m(12)); }) }) },
    { slot: 'm-05b', name: 'Grim Resolve', type: 'skill', color: BLUE, program: u => ({
        free: L(`GUARD {guard:${u.m(2)}}.`, c => { c.guard(u.m(2)); }),
        paid: L(`Gain ${u.i(2)} Conviction, or ${u.i(4)} at half VITAE or less.`, c => { c.conviction(c.q.atHalf ? u.i(4) : u.i(2)); }) }) },
    { slot: 'm-06c', name: 'Not Yet', type: 'skill', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(2)}}.`, c => { c.heal(u.m(2)); }),
        paid: L(`This turn, damage cannot take you below 1 VITAE; HEAL {heal:${u.m(5)}} next turn. EXILE.`, c => { c.deathWard(); c.healNextTurn(u.m(5)); }, { exile: true }) }) },
    { slot: 'm-07a', name: 'Feeding Mark', type: 'spell', color: PURPLE, program: u => ({
        free: L(`VULNERABLE +{vuln:${u.m(10)}}% for 1 turn.`, c => { c.vulnerable(u.m(10), 1); }),
        paid: L(`VULNERABLE +{vuln:${u.m(25)}}% for 2 turns; HEAL {heal:${u.m(2)}} each time you damage the foe while it lasts.`, c => { c.vulnerable(u.m(25), 2); c.drain(u.m(2), 2); }) }) },
    { slot: 'm-08d', name: 'Nothing Wasted', type: 'global', color: PURPLE, program: u => ({
        global: { trigger: 'sac', text: `LEECH {leech:${u.i(1)}}.`,
            free: c => { c.leech(u.i(1)); }, paid: c => { c.leech(u.i(1)); } } }) },
    { slot: 'm-09a', name: 'Brimming', type: 'skill', color: BLUE, program: u => ({
        free: L(`HEAL {heal:${u.m(4)}}; healing past max VITAE becomes GUARD.`, c => { c.heal(u.m(4), { overflowToGuard: true }); }),
        paid: L(`HEAL {heal:${u.m(10)}}; healing past max VITAE becomes GUARD.`, c => { c.heal(u.m(10), { overflowToGuard: true }); }) }) },
    { slot: 'm-10a', name: 'Repaid in Kind', type: 'spell', color: RED, program: u => ({
        free: L(`The foe loses VITAE equal to the damage you took last turn (max ${u.m(5)}).`, c => { c.foeLoses(Math.min(u.m(5), c.q.takenLastTurn)); }),
        paid: L(`Same, max ${u.m(15)}.`, c => { c.foeLoses(Math.min(u.m(15), c.q.takenLastTurn)); }) }) },
];

function toCard(e: Entry): Card {
    const proposal = e.slot.toUpperCase();
    return {
        id: `bp-${e.slot}`,
        name: e.name,
        color: e.color,
        description: `Blood Price trial card, ${SUB_LANE[proposal[0]]} sub-lane.`,
        tier: 1, rank: e.rank ?? 1, cardType: e.type,
        targetType: e.color === BLUE ? 'self' : 'enemy',
        program: e.program(upgradeScale(0)),
        programAt: e.program,
        addedIn: ADDED,
        tags: ['blood-price', 'trial'],
    };
}

/** The first Curse (plan/revamp/cards.md, T's text): grey, any die. Never a reward. */
const GREY_CURSE: Card = {
    id: CURSE_ID,
    name: 'Grey Curse',
    color: 'any',
    description: 'A dead card that holds a hand slot until played. It cannot be scrapped.',
    tier: 1, rank: 1, cardType: 'curse', targetType: 'self',
    program: {
        free: L('SACRIFICE 5.', c => { c.sacrifice(5); }),
        paid: L('SACRIFICE 10. EXILE.', c => { c.sacrifice(10); }, { exile: true }),
    },
    addedIn: ADDED,
    tags: ['blood-price', 'trial', 'curse'],
};

const LANE_CARDS: Card[] = ENTRIES.map(toCard);

/** The Blood Price lane: the 30 cards, and the 20-card test deck (revision 2, chosen by role). */
const BLOOD_PRICE_LANE: CardLane = Object.freeze({
    id: 'blood-price',
    name: 'Blood Price',
    cardIds: Object.freeze(LANE_CARDS.map(card => card.id)),
    // By role: 13 SACRIFICE sources; the payoffs they feed (Crimson Pact,
    // Callus, Nothing Wasted, the TETHER lines); WAIVE and the doubler behind them;
    // Transfusion and Brimming to pay the VITAE back. 7 red, 6 blue, 7 purple.
    testDeck: Object.freeze([
        'bp-p-01a', 'bp-e-06b', 'bp-e-08n', 'bp-p-09b', 'bp-e-09n', 'bp-p-10c', 'bp-m-02b',
        'bp-p-02a', 'bp-e-01n', 'bp-m-04n', 'bp-m-09a', 'bp-e-04c', 'bp-e-07b',
        'bp-e-05n', 'bp-e-02d', 'bp-e-10d', 'bp-e-03d', 'bp-p-08d', 'bp-p-05b', 'bp-m-08d',
    ]),
});

/** The Blood Price trial set. */
export const BLOOD_PRICE_SET: TrialSet = Object.freeze({
    id: 'blood-price',
    cards: Object.freeze([...LANE_CARDS, GREY_CURSE]),
    lanes: Object.freeze([BLOOD_PRICE_LANE]),
    // Blood for Blood's X cap rises 12, 15, 18, 21 (T, 2026-10-23).
    ruledCostGrowth: Object.freeze({ 'bp-e-08n': Object.freeze(['sacrificeX']) }),
});
