/**
 * Program-card presenter — how a card that carries a `program` (a Global, a
 * Curse, a SACRIFICE line) reads on the combat board, in the inspect
 * overlay and on the deck tab.
 *
 * The engine owns every word and number: the lines come from
 * `programFaceText` (already at the player's stats when the card is the
 * hand's stat-scaled copy), and whether a line can be played comes from
 * `programLineBlock`. This module only picks the face's headline out of the
 * printed line and labels the card type. Pure.
 */

import {
    programFaceText, freeLineBlock, playLimitBlock, programLineBlock, programLineShortfall, programLineDiscardShortfall, programXChoice, isCurseCard,
    GLOBAL_FREE_TURNS,
    type Card, type CombatEncounterState, type ProgramShortfall, type DiscardShortfall,
} from '@mechanics';

/** The type tag a program card wears on its face, or null for a plain type. */
export function programTypeTag(card: Pick<Card, 'cardType'>): string | null {
    if (card.cardType === 'global') return `GLOBAL · ⏳${GLOBAL_FREE_TURNS} / ∞`;
    if (card.cardType === 'curse') return 'CURSE · NO SCRAP';
    return null;
}

/** The lifecycle sentence the inspect overlay leads with. */
export function programLifecycle(card: Pick<Card, 'cardType'>): string {
    switch (card.cardType) {
        case 'global':
            return `Global: stays in play and fires on its trigger. FREE: ${GLOBAL_FREE_TURNS} turns. PAID: the rest of combat. Copies stack (experimental).`;
        case 'curse':
            return 'Curse: holds a hand slot until played. It cannot be scrapped.';
        default:
            return 'Play FREE or PAID, then discard (EXILE removes it for the combat).';
    }
}

/** What a PAID headline prints for an amount the card does not print as a number
 *  (a bare `X` would read as the dead X die). The FREE corner pill keeps its X. */
export const VARIES = 'varies';

/**
 * The ordered headline patterns: the first that matches a line is its face.
 * A registry keyword headlines as KEYWORD · value; DEAL, Conviction, "the foe
 * loses" and Curses read as a plain hero line with no keyword badge, the way
 * A Plain Blow's "Deal 5" does.
 */
const HEADLINES: readonly { re: RegExp; keyword: string | null; value: (m: RegExpMatchArray) => string }[] = [
    { re: /\bnext DEAL this turn deals \+n\b/, keyword: null, value: () => 'Next Deal +n' },
    { re: /\bDEAL 2X\b/, keyword: null, value: () => 'Deal 2X' },
    { re: /\bDEAL (\d+|n)\b/, keyword: null, value: (m) => `Deal ${m[1]}` },
    { re: /\bDEAL\b/, keyword: null, value: () => `Deal ${VARIES}` },
    { re: /\bGUARD (\d+|n)\b/, keyword: 'GUARD', value: (m) => m[1] },
    { re: /\bloses (\d+) VITAE\b/, keyword: null, value: (m) => `Foe −${m[1]}` },
    { re: /\bfoe loses VITAE\b/, keyword: null, value: () => `Foe − ${VARIES}` },
    { re: /\bVULNERABLE \+(\d+)%/, keyword: 'VULNERABLE', value: (m) => `+${m[1]}%` },
    { re: /\bHEAL (\d+)\b/, keyword: 'HEAL', value: (m) => m[1] },
    { re: /\bLEECH (\d+)\b/, keyword: 'LEECH', value: (m) => m[1] },
    { re: /\bLEECH\b/, keyword: 'LEECH', value: () => VARIES },
    { re: /\bRADIANCE (\d+)\b/, keyword: 'RADIANCE', value: (m) => m[1] },
    { re: /\bMERCY (\d+)\b/, keyword: 'MERCY', value: (m) => m[1] },
    { re: /\bTETHER (\d+)\b/, keyword: 'TETHER', value: (m) => m[1] },
    // The weather and DRAW, by their printed number.
    { re: /\bINFERNO (\d+)\b/, keyword: 'INFERNO', value: (m) => m[1] },
    { re: /\bBLIZZARD (\d+)\b/, keyword: 'BLIZZARD', value: (m) => m[1] },
    { re: /\bSTORM (\d+)\b/, keyword: 'STORM', value: (m) => m[1] },
    { re: /\bDRAW (\d+)\b/, keyword: 'DRAW', value: (m) => m[1] },
    // The spikes and RETRIEVE, by their printed number.
    { re: /\bTHORNS (\d+)\b/, keyword: 'THORNS', value: (m) => m[1] },
    { re: /\bREFLECT (\d+)%/, keyword: 'REFLECT', value: (m) => `${m[1]}%` },
    { re: /\bRETRIEVE (\d+)\b/, keyword: 'RETRIEVE', value: (m) => m[1] },
    { re: /\bWAIVE\b/, keyword: 'WAIVE', value: () => '' },
    { re: /\bEXILE a Curse\b/, keyword: 'EXILE', value: () => 'Curse' },
    { re: /\bgain (\d+) Conviction\b/i, keyword: null, value: (m) => `+${m[1]} ◆` },
    { re: /\bSACRIFICE (\d+)\b/, keyword: 'SACRIFICE', value: (m) => m[1] },
    { re: /\bSACRIFICE any amount\b/, keyword: 'SACRIFICE', value: () => VARIES },
    { re: /\bSACRIFICE\b/, keyword: 'SACRIFICE', value: () => '×2' },
    { re: /\bCurses?\b/, keyword: null, value: () => 'Curse' },
    // A line that only reads the weather ("GUARD equal to the foe's
    // BLIZZARD", "Remove your INFERNO") headlines its verb, or the element.
    { re: /\bGUARD\b/, keyword: 'GUARD', value: () => VARIES },
    { re: /\bHEAL\b/, keyword: 'HEAL', value: () => VARIES },
    // A line that only reads the Merciful's numbers ("MERCY equal to all you
    // healed", "The foe's MERCY bursts now").
    { re: /\bRADIANCE\b/, keyword: 'RADIANCE', value: () => '' },
    { re: /\bMERCY\b/, keyword: 'MERCY', value: () => '' },
    { re: /\bINFERNO\b/, keyword: 'INFERNO', value: () => '' },
    { re: /\bBLIZZARD\b/, keyword: 'BLIZZARD', value: () => '' },
    { re: /\bSTORM\b/, keyword: 'STORM', value: () => '' },
    // A line that only reads the spikes ("Double your THORNS").
    { re: /\bTHORNS\b/, keyword: 'THORNS', value: () => '' },
    { re: /\bREFLECT\b/, keyword: 'REFLECT', value: () => '' },
];

/**
 * The headline a printed line reads as on the face: a keyword (null for a
 * plain hero line) and its value.
 *
 * @example programHeadline('SACRIFICE 4, GUARD 12.') // { keyword: 'GUARD', value: '12' }
 * @example programHeadline('SACRIFICE 4, DEAL 12.')  // { keyword: null, value: 'Deal 12' }
 */
export function programHeadline(text: string): { keyword: string | null; value: string } {
    for (const h of HEADLINES) {
        const m = text.match(h.re);
        if (m) return { keyword: h.keyword, value: h.value(m) };
    }
    return { keyword: null, value: '' };
}

/** The FREE cell's keywords, in the order the cell prefers them: each has a
 *  drawn silhouette (`glyphShapes.ts`). */
const FREE_CELL: readonly { re: RegExp; keyword: string; value: (m: RegExpMatchArray) => string }[] = [
    { re: /\bGUARD (\d+)\b/, keyword: 'GUARD', value: (m) => m[1] },
    { re: /\bHEAL (\d+)\b/, keyword: 'HEAL', value: (m) => m[1] },
    { re: /\bVULNERABLE \+(\d+)%/, keyword: 'VULNERABLE', value: (m) => `+${m[1]}%` },
    { re: /\bLEECH (\d+)\b/, keyword: 'LEECH', value: (m) => m[1] },
    { re: /\bRADIANCE (\d+)\b/, keyword: 'RADIANCE', value: (m) => m[1] },
    { re: /\bMERCY (\d+)\b/, keyword: 'MERCY', value: (m) => m[1] },
    { re: /\bTETHER (\d+)\b/, keyword: 'TETHER', value: (m) => m[1] },
    { re: /\bINFERNO (\d+)\b/, keyword: 'INFERNO', value: (m) => m[1] },
    { re: /\bBLIZZARD (\d+)\b/, keyword: 'BLIZZARD', value: (m) => m[1] },
    { re: /\bSTORM (\d+)\b/, keyword: 'STORM', value: (m) => m[1] },
    { re: /\bDRAW (\d+)\b/, keyword: 'DRAW', value: (m) => m[1] },
    { re: /\bTHORNS (\d+)\b/, keyword: 'THORNS', value: (m) => m[1] },
    { re: /\bREFLECT (\d+)%/, keyword: 'REFLECT', value: (m) => `${m[1]}%` },
    { re: /\bRETRIEVE (\d+)\b/, keyword: 'RETRIEVE', value: (m) => m[1] },
    // A cost reads as a loss, never as the "+N" the cell gives a gain.
    { re: /\bSACRIFICE (\d+)\b/, keyword: 'SACRIFICE', value: (m) => `−${m[1]}` },
    // A FREE line with none of the above still wears a pill (a pill
    // whenever the card has a FREE line). Damage reads DEAL; an amount the
    // card does not print as a number reads the way the PAID headline spells
    // it ('n', 'X', '×2'), never a fabricated figure.
    { re: /\bDEAL (\d+)\b/, keyword: 'DEAL', value: (m) => m[1] },
    { re: /\bGUARD n\b/, keyword: 'GUARD', value: () => 'n' },
    { re: /\bnext DEAL this turn deals \+n\b/, keyword: 'DEAL', value: () => '+n' },
    { re: /\bDEAL\b/, keyword: 'DEAL', value: () => 'X' },
    { re: /\bfoe loses VITAE\b/, keyword: 'DEAL', value: () => 'X' },
    { re: /\bSACRIFICE\b/, keyword: 'SACRIFICE', value: () => '×2' },
    // The weather read off the fight ("GUARD equal to the foe's BLIZZARD",
    // "Remove your INFERNO") or grown by a Global ("the STORM grows by 1 extra").
    { re: /\bSTORM grows by (\d+)\b/, keyword: 'STORM', value: (m) => `+${m[1]}` },
    { re: /\bGUARD\b/, keyword: 'GUARD', value: () => 'X' },
    { re: /\bHEAL\b/, keyword: 'HEAL', value: () => 'X' },
    { re: /\bRADIANCE\b/, keyword: 'RADIANCE', value: () => 'X' },
    { re: /\bMERCY\b/, keyword: 'MERCY', value: () => 'X' },
    { re: /\bBLIZZARD\b/, keyword: 'BLIZZARD', value: () => 'X' },
    { re: /\bINFERNO\b/, keyword: 'INFERNO', value: () => 'X' },
    { re: /\bSTORM\b/, keyword: 'STORM', value: () => 'X' },
    // The spikes read off the fight ("THORNS equal to half the damage you've done").
    { re: /\bTHORNS\b/, keyword: 'THORNS', value: () => 'X' },
    { re: /\bREFLECT\b/, keyword: 'REFLECT', value: () => 'X' },
];

/**
 * The FREE cell of a program face: the first keyword with a silhouette the
 * FREE line prints, and its number. Null only for a line no pattern reads;
 * every lane card's FREE line resolves a cell (the FREE-pill sweep in
 * `combat-card-vm.test.ts` pins it).
 */
export function programFreeCell(text: string): { keyword: string; value: string } | null {
    for (const c of FREE_CELL) {
        const m = text.match(c.re);
        if (m) return { keyword: c.keyword, value: c.value(m) };
    }
    return null;
}

/** A program card's two printed lines, with the trailing period dropped. */
export function programLinesFor(card: Card): { free: string; paid: string } {
    const t = programFaceText(card);
    const trim = (s: string): string => s.replace(/\.\s*$/, '');
    return { free: trim(t.free), paid: trim(t.paid) };
}

/** The live play state of one program card in hand. */
export interface ProgramPlayVM {
    /** Why the FREE line cannot be played now (null = it can). */
    freeBlock: string | null;
    /** Why the PAID line cannot be played now, die aside (null = it can). */
    paidBlock: string | null;
    /** The SACRIFICE the FREE line cannot pay (`cost`, the player's `vitae`),
     *  non-null exactly when `freeBlock` is the SACRIFICE floor. */
    freeShortfall: ProgramShortfall | null;
    /** The same for the PAID line. */
    paidShortfall: ProgramShortfall | null;
    /** The random discard the PAID line cannot pay (`discard`, the other
     *  cards `held`), non-null exactly when `paidBlock` is that refusal. A
     *  FREE line never discards. */
    paidDiscard: DiscardShortfall | null;
    /** A Curse: the scrap bin refuses it. */
    unscrappable: boolean;
    /** The amounts a "SACRIFICE any amount" PAID line accepts, or null. */
    xRange: { min: number; max: number } | null;
}

/** The engine's read of whether each line of a hand card can be played now. */
export function programPlayVM(state: CombatEncounterState, uid: string, cardId: string): ProgramPlayVM {
    return {
        // TANGLE refuses any card's FREE line; a program card adds its own refusals.
        freeBlock: freeLineBlock(state, uid),
        // A curfew refuses the PAID line too.
        paidBlock: playLimitBlock(state) ?? programLineBlock(state, uid, true),
        freeShortfall: programLineShortfall(state, uid, false),
        paidShortfall: programLineShortfall(state, uid, true),
        paidDiscard: programLineDiscardShortfall(state, uid, true),
        unscrappable: isCurseCard(cardId),
        xRange: programXChoice(state, uid),
    };
}
