/**
 * The sim's number adjustments to the Elementalist cards (sandbox only).
 *
 * T authorised (2026-10-24) "minor adjustments to the cards' values": printed
 * NUMBERS only, to bring fights near T's targets (Float-Eye about 3 player
 * turns, Green Jelly about 5, the Death Beholder about 7), to revive a dead
 * card, or to stop a card self-killing through INFERNO in normal play. No
 * structure, keyword, note or rule changes. Each row is one printed number.
 *
 * As voted the deck kills about twice as fast as the targets. The set below
 * halves the printed DEAL and INFERNO numbers (rounded) and the STORM numbers
 * above 1, which keeps T's ratios between cards; defence (GUARD, HEAL,
 * BLIZZARD), DRAW, caps and the derived numbers are untouched. One row
 * revives a near-dead PAID line (M-07). See plan/card-ledger/elementalist-sims.md.
 */

export interface SimAdjustment {
    /** The numbers-table key (`elementalist.cards.ts` AS_VOTED). */
    key: string;
    card: string;
    line: 'FREE' | 'PAID' | 'Global';
    before: number;
    after: number;
    why: string;
}

const PACE = 'fights run about twice as fast as the targets: halve the hit';
const BURN = 'fights run about twice as fast as the targets: halve the INFERNO';
const STORM = 'fights run about twice as fast as the targets: lower the STORM';

export const SIM_ADJUSTMENTS: readonly SimAdjustment[] = [
    { key: 'P-01.free.deal', card: 'P-01', line: 'FREE', before: 5, after: 3, why: PACE },
    { key: 'P-01.paid.deal', card: 'P-01', line: 'PAID', before: 8, after: 4, why: PACE },
    { key: 'P-02.free.deal', card: 'P-02', line: 'FREE', before: 6, after: 3, why: PACE },
    { key: 'P-02.paid.deal', card: 'P-02', line: 'PAID', before: 18, after: 9, why: PACE },
    { key: 'P-02.paid.inferno', card: 'P-02', line: 'PAID', before: 8, after: 4, why: BURN },
    { key: 'P-04.free.deal', card: 'P-04', line: 'FREE', before: 3, after: 2, why: PACE },
    { key: 'P-04.paid.deal', card: 'P-04', line: 'PAID', before: 6, after: 3, why: PACE },
    { key: 'P-07.free.deal', card: 'P-07', line: 'FREE', before: 5, after: 3, why: PACE },
    { key: 'P-07.free.inferno', card: 'P-07', line: 'FREE', before: 2, after: 1, why: BURN },
    { key: 'P-07.paid.deal', card: 'P-07', line: 'PAID', before: 10, after: 5, why: PACE },
    { key: 'P-07.paid.inferno', card: 'P-07', line: 'PAID', before: 4, after: 2, why: BURN },
    { key: 'P-09.free.deal', card: 'P-09', line: 'FREE', before: 4, after: 2, why: PACE },
    { key: 'P-09.paid.deal', card: 'P-09', line: 'PAID', before: 8, after: 4, why: PACE },
    { key: 'P-10.deal', card: 'P-10', line: 'Global', before: 5, after: 3, why: PACE },
    { key: 'E-01.free.inferno', card: 'E-01', line: 'FREE', before: 3, after: 2, why: BURN },
    { key: 'E-01.paid.inferno', card: 'E-01', line: 'PAID', before: 8, after: 4, why: BURN },
    { key: 'E-02.free.deal', card: 'E-02', line: 'FREE', before: 5, after: 3, why: PACE },
    { key: 'E-02.paid.deal', card: 'E-02', line: 'PAID', before: 8, after: 4, why: PACE },
    { key: 'E-05.paid.storm', card: 'E-05', line: 'PAID', before: 3, after: 2, why: STORM },
    { key: 'E-08.free.inferno', card: 'E-08', line: 'FREE', before: 2, after: 1, why: BURN },
    { key: 'M-07.free.storm', card: 'M-07', line: 'FREE', before: 2, after: 1, why: STORM },
    { key: 'M-07.paid.pct', card: 'M-07', line: 'PAID', before: 5, after: 10, why: 'PAID line near-dead (5% of draws as voted): VULNERABLE per STORM doubled' },
];
