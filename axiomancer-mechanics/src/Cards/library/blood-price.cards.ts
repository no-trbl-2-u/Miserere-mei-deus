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

import type { Card, CardAspect, CardType } from '../types';
import type { CardProgram, ProgramCtx, ProgramLine } from '../card-program.types';
import type { CardLane, TrialSet } from '../card.lanes';

const ADDED = '2026-10-11';

/** The grey Curse's id. */
const CURSE_ID = 'bp-curse';

const RED: CardAspect = 'body';
const BLUE: CardAspect = 'mind';
const PURPLE: CardAspect = 'heart';

const L = (text: string, run: (c: ProgramCtx) => void, extra?: Partial<ProgramLine>): ProgramLine => ({ text, run, ...extra });

interface Entry {
    slot: string;
    type: CardType;
    color: CardAspect;
    program: CardProgram;
    /** The card's name, read off what it does (Phase UP1a). The slot is the id, never the name. */
    name: string;
}

const SUB_LANE: Record<string, string> = { P: 'Payoff', E: 'Engine', M: 'Misc' };

const ENTRIES: Entry[] = [
    // ── PAYOFF: benefits for sacrificing ─────────────────────────────────────
    { slot: 'p-01a', name: 'Forfeit Strike', type: 'attack', color: RED, program: {
        free: L('SACRIFICE 2, DEAL {deal:7}.', c => { c.sacrifice(2); c.deal(7); }),
        paid: L('SACRIFICE 4, DEAL {deal:16}.', c => { c.sacrifice(4); c.deal(16); }) } },
    { slot: 'p-02a', name: 'Scar Tissue', type: 'skill', color: BLUE, program: {
        free: L('SACRIFICE 2, GUARD {guard:7}.', c => { c.sacrifice(2); c.guard(7); }),
        paid: L('SACRIFICE 4, GUARD {guard:16}.', c => { c.sacrifice(4); c.guard(16); }) } },
    { slot: 'p-03a', name: 'Cornered', type: 'attack', color: RED, program: {
        free: L('DEAL {deal:3}, or {deal:6} at half VITAE or less.', c => { c.deal(c.q.atHalf ? 6 : 3); }),
        paid: L('DEAL {deal:6}, or {deal:14} at half VITAE or less.', c => { c.deal(c.q.atHalf ? 14 : 6); }) } },
    // Reworked by T 2026-10-14: the half-VITAE gate left it dead above half.
    // The PAID line's own SACRIFICE counts toward the VITAE lost this round,
    // and the heal is unscaled (an already-resolved number, like P-07b).
    { slot: 'p-04c', name: 'Returned Twofold', type: 'spell', color: BLUE, program: {
        free: L('HEAL {heal:10}.', c => { c.heal(10); }),
        paid: L('SACRIFICE 10, HEAL twice the VITAE you lost this round. EXILE.', c => {
            c.sacrifice(10);
            c.heal(2 * c.q.lostThisRound, { exact: true });
        }, { exile: true }) } },
    { slot: 'p-05b', name: 'Shared Wound', type: 'spell', color: PURPLE, program: {
        free: L('SACRIFICE 3, VULNERABLE +{vuln:20}% for 1 turn.', c => { c.sacrifice(3); c.vulnerable(20, 1); }),
        paid: L('SACRIFICE 6, VULNERABLE +{vuln:50}% for 2 turns.', c => { c.sacrifice(6); c.vulnerable(50, 2); }) } },
    { slot: 'p-06d', name: 'What Is Owed', type: 'skill', color: PURPLE, program: {
        free: L('GUARD {guard:3}.', c => { c.guard(3); }),
        paid: L('LEECH 1 per 10 VITAE missing (max 8).', c => { c.leech(Math.min(8, Math.floor(c.q.missing / 10))); }) } },
    { slot: 'p-07b', name: 'Full Tally', type: 'attack', color: RED, program: {
        free: L('DEAL half the VITAE you lost this combat (max 10).', c => { c.deal(Math.min(10, Math.floor(c.q.lostThisCombat / 2)), { exact: true }); }),
        paid: L('DEAL all the VITAE you lost this combat (max 30). EXILE.', c => { c.deal(Math.min(30, c.q.lostThisCombat), { exact: true }); }, { exile: true }) } },
    { slot: 'p-08d', name: 'Binding Vow', type: 'skill', color: PURPLE, program: {
        free: L('SACRIFICE 2, gain 2 Conviction.', c => { c.sacrifice(2); c.conviction(2); }),
        paid: L('TETHER 3. SACRIFICE 4.', c => { c.tether(3); c.sacrifice(4); }) } },
    { slot: 'p-09b', name: 'Uneven Trade', type: 'spell', color: RED, program: {
        free: L('SACRIFICE 4; the foe loses 6 VITAE.', c => { c.sacrifice(4); c.foeLoses(6); }),
        paid: L('SACRIFICE 8; the foe loses 12 VITAE, VULNERABLE +{vuln:25}% for 1 turn.', c => { c.sacrifice(8); c.foeLoses(12); c.vulnerable(25, 1); }) } },
    { slot: 'p-10c', name: 'Callus', type: 'global', color: RED, program: {
        global: { trigger: 'sac', text: 'GUARD n.', paidDelta: 'DEAL n instead.',
            free: (c, n) => { c.guard(n); }, paid: (c, n) => { c.deal(n); } } } },

    // ── ENGINE: helps you trigger SACRIFICE ──────────────────────────────────
    { slot: 'e-01n', name: 'Bloodletting', type: 'spell', color: BLUE, program: {
        free: L('SACRIFICE 3, gain 2 Conviction.', c => { c.sacrifice(3); c.conviction(2); }),
        paid: L('SACRIFICE 6, gain 4 Conviction.', c => { c.sacrifice(6); c.conviction(4); }) } },
    { slot: 'e-02d', name: 'Pinpricks', type: 'skill', color: PURPLE, program: {
        free: L('SACRIFICE 1, twice.', c => { c.sacrifice(1); c.sacrifice(1); }),
        paid: L('TETHER 2. SACRIFICE 1, three times.', c => { c.tether(2); for (let i = 0; i < 3; i++) c.sacrifice(1); }) } },
    { slot: 'e-03d', name: 'Slow Drip', type: 'global', color: PURPLE, program: {
        global: { trigger: 'turn', text: 'SACRIFICE 2, LEECH {leech:1}.',
            free: c => { c.sacrifice(2); c.leech(1); }, paid: c => { c.sacrifice(2); c.leech(1); } } } },
    { slot: 'e-04c', name: 'Remission', type: 'spell', color: BLUE, program: {
        free: L('GUARD {guard:3}.', c => { c.guard(3); }),
        paid: L('WAIVE your next SACRIFICE this turn. Gain 1 Conviction.', c => { c.sacModifier({ kind: 'next-free', count: 1 }); c.conviction(1); }) } },
    { slot: 'e-05n', name: 'Open Vein', type: 'skill', color: PURPLE, program: {
        free: L('TETHER 2, SACRIFICE 2.', c => { c.tether(2); c.sacrifice(2); }),
        paid: L('TETHER 3, SACRIFICE 4, LEECH {leech:2}.', c => { c.tether(3); c.sacrifice(4); c.leech(2); }) } },
    { slot: 'e-06b', name: 'Double-Edged', type: 'attack', color: RED, program: {
        free: L('DEAL {deal:6}, then SACRIFICE 2.', c => { c.deal(6); c.sacrifice(2); }),
        paid: L('DEAL {deal:9}, twice; SACRIFICE 2 after each.', c => { c.deal(9); c.sacrifice(2); c.deal(9); c.sacrifice(2); }) } },
    { slot: 'e-07b', name: 'Raised Stakes', type: 'spell', color: BLUE, program: {
        free: L('Your next SACRIFICE this turn is doubled (its cost and its payoffs).', c => { c.sacModifier({ kind: 'next-double' }); }),
        paid: L('Same, and gain 2 Conviction.', c => { c.sacModifier({ kind: 'next-double' }); c.conviction(2); }) } },
    { slot: 'e-08n', name: 'Blood for Blood', type: 'attack', color: RED, program: {
        free: L('SACRIFICE 3, DEAL {deal:6}.', c => { c.sacrifice(3); c.deal(6); }),
        paid: L('SACRIFICE any amount X (max 12), DEAL 2X.', c => { const x = c.sacrificeX(12); c.deal(2 * x); }) } },
    { slot: 'e-09n', name: 'Crimson Pact', type: 'global', color: RED, program: {
        global: { trigger: 'sac', text: 'your next DEAL this turn deals +n.',
            free: (c, n) => { c.empowerNextDeal(n); }, paid: (c, n) => { c.empowerNextDeal(n); } } } },
    { slot: 'e-10d', name: 'Name Your Price', type: 'spell', color: PURPLE, program: {
        free: L('TETHER 1. SACRIFICE 2.', c => { c.tether(1); c.sacrifice(2); }),
        paid: L('TETHER 1. SACRIFICE any amount (max 15).', c => { c.tether(1); c.sacrificeX(15); }) } },

    // ── MISC: related utility ────────────────────────────────────────────────
    { slot: 'm-01d', name: 'Siphon', type: 'skill', color: PURPLE, program: {
        free: L('HEAL {heal:3}.', c => { c.heal(3); }),
        paid: L('LEECH {leech:4}.', c => { c.leech(4); }) } },
    { slot: 'm-02b', name: 'Reclaim', type: 'attack', color: RED, program: {
        free: L('DEAL {deal:2}.', c => { c.deal(2); }),
        paid: L('DEAL {deal:6}; HEAL all the damage dealt (max 8).', c => { const d = c.deal(6); c.heal(Math.min(8, d), { exact: true }); }) } },
    { slot: 'm-03d', name: 'Famished', type: 'skill', color: PURPLE, program: {
        free: L('GUARD {guard:3}.', c => { c.guard(3); }),
        paid: L('LEECH {leech:3}, or {leech:6} at half VITAE or less.', c => { c.leech(c.q.atHalf ? 6 : 3); }) } },
    { slot: 'm-04n', name: 'Transfusion', type: 'skill', color: BLUE, program: {
        free: L('SACRIFICE 3, HEAL {heal:6} at the start of your next turn.', c => { c.sacrifice(3); c.healNextTurn(6); }),
        paid: L('SACRIFICE 5, HEAL {heal:12} at the start of your next turn.', c => { c.sacrifice(5); c.healNextTurn(12); }) } },
    { slot: 'm-05b', name: 'Grim Resolve', type: 'skill', color: BLUE, program: {
        free: L('GUARD {guard:2}.', c => { c.guard(2); }),
        paid: L('Gain 2 Conviction, or 4 at half VITAE or less.', c => { c.conviction(c.q.atHalf ? 4 : 2); }) } },
    { slot: 'm-06c', name: 'Not Yet', type: 'skill', color: BLUE, program: {
        free: L('HEAL {heal:2}.', c => { c.heal(2); }),
        paid: L('This turn, damage cannot take you below 1 VITAE; HEAL {heal:5} next turn. EXILE.', c => { c.deathWard(); c.healNextTurn(5); }, { exile: true }) } },
    { slot: 'm-07a', name: 'Feeding Mark', type: 'spell', color: PURPLE, program: {
        free: L('VULNERABLE +{vuln:10}% for 1 turn.', c => { c.vulnerable(10, 1); }),
        paid: L('VULNERABLE +{vuln:25}% for 2 turns; HEAL {heal:2} each time you damage the foe while it lasts.', c => { c.vulnerable(25, 2); c.drain(2, 2); }) } },
    { slot: 'm-08d', name: 'Nothing Wasted', type: 'global', color: PURPLE, program: {
        global: { trigger: 'sac', text: 'LEECH {leech:1}.',
            free: c => { c.leech(1); }, paid: c => { c.leech(1); } } } },
    { slot: 'm-09a', name: 'Brimming', type: 'skill', color: BLUE, program: {
        free: L('HEAL {heal:4}; healing past max VITAE becomes GUARD.', c => { c.heal(4, { overflowToGuard: true }); }),
        paid: L('HEAL {heal:10}; healing past max VITAE becomes GUARD.', c => { c.heal(10, { overflowToGuard: true }); }) } },
    { slot: 'm-10a', name: 'Repaid in Kind', type: 'spell', color: RED, program: {
        free: L('The foe loses VITAE equal to the damage you took last turn (max 5).', c => { c.foeLoses(Math.min(5, c.q.takenLastTurn)); }),
        paid: L('Same, max 15.', c => { c.foeLoses(Math.min(15, c.q.takenLastTurn)); }) } },
];

function toCard(e: Entry): Card {
    const proposal = e.slot.toUpperCase();
    return {
        id: `bp-${e.slot}`,
        name: e.name,
        color: e.color,
        description: `Blood Price trial card, ${SUB_LANE[proposal[0]]} sub-lane.`,
        tier: 1, rank: 1, cardType: e.type,
        targetType: e.color === BLUE ? 'self' : 'enemy',
        program: e.program,
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
});
