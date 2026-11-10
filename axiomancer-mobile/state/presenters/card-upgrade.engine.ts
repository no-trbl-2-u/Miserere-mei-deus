/**
 * Card-upgrade presenter (Phase UP1d) — the shared upgrade screen's
 * view-model: the cards that can still take an upgrade, and for a picked one
 * the card as it is beside the card after this upgrade. Pure: no store
 * writes, no rule decisions. Which cards may be upgraded, and what the
 * upgrade does, are the engine's (`nextUpgradeId`, `getCardById`); this
 * module only shapes them for render.
 *
 * Every number comes from the same `detailStats` projection the deck screen
 * and the combat detail print, so the preview cannot disagree with the card
 * the player will draw.
 *
 * The string of beads adds the pair as the one card face and the
 * change line under the new card ('LEECH 4 → 5'), diffed from those faces.
 */

import {
    getCardById,
    lookupEffect,
    nextUpgradeId,
    toCombatCard,
    upgradeLevel,
    upgradeLimit,
} from '@mechanics';

import { detailStats, rewardCardVMs, type CombatCardVM } from '@/state/presenters/combat-encounter.engine';
import { cardUpgradeStepLabel } from '@/state/presenters/card-upgrade.copy';

/** One card face in the preview: the printed lines that carry its numbers. */
export interface CardUpgradeFaceVM {
    cardId: string;
    name: string;
    /** One plain sentence: what playing the card does. */
    outcomeLine: string;
    /** The NO DIE line. */
    freeText: string;
    /** The +DIE line, or null when the free line already says all of it. */
    paidText: string | null;
}

/** One row in the picker: one distinct card that can still be upgraded. */
export interface CardUpgradeRowVM {
    cardId: string;
    name: string;
    /** Copies of this id the deck carries; the upgrade changes one of them. */
    count: number;
    /** 'UPGRADE 1 OF 2'. */
    stepLabel: string;
    /** The card's own colour, the ring its bead wears on the wheel. */
    ringColor: string;
}

/** Which printed numbers on the upgraded card changed, for the face to draw in gold. */
export interface CardUpgradeChangedVM {
    /** The changed numbers of the PAID line, by order: the n-th run of digits
     *  in `afterCard.face.paidLine` (counting from 0). */
    paid: number[];
    /** The FREE pill's value changed. */
    free: boolean;
}

export interface CardUpgradePreviewVM {
    before: CardUpgradeFaceVM;
    after: CardUpgradeFaceVM;
    stepLabel: string;
    /** The one card face of the card as it is, numbers as authored. */
    beforeCard: CombatCardVM;
    /** The one card face of the card after this upgrade. */
    afterCard: CombatCardVM;
    /** The change alone, under the new card: 'LEECH 4 → 5'; two changes join
     *  with ' · '. Read off the PAID line the face prints, else the FREE line
     *  when only that moved; null when neither line shows a number moving. */
    changeLine: string | null;
    changed: CardUpgradeChangedVM;
}

function faceVM(cardId: string): CardUpgradeFaceVM | null {
    const source = getCardById(cardId);
    const projected = toCombatCard(cardId, getCardById, lookupEffect);
    if (!source || !projected) return null;
    // No foe is in play here, so every number is the un-scaled, authored one.
    const detail = detailStats(projected, source);
    return {
        cardId,
        name: projected.name,
        outcomeLine: detail.outcomeLine,
        freeText: detail.freePill,
        paidText: detail.diePaidLine,
    };
}

function stepLabelFor(cardId: string): string | null {
    const card = getCardById(cardId);
    if (!card) return null;
    return cardUpgradeStepLabel(upgradeLevel(cardId) + 1, upgradeLimit(card));
}

/**
 * The picker rows, one per id in `upgradableIds` (the engine's list, already
 * distinct and filtered), each with how many copies `deckCardIds` carries.
 * An id the library cannot resolve drops out rather than rendering blank.
 */
export function cardUpgradeRowsVM(
    upgradableIds: readonly string[],
    deckCardIds: readonly string[],
): CardUpgradeRowVM[] {
    const rows: CardUpgradeRowVM[] = [];
    for (const cardId of upgradableIds) {
        const card = getCardById(cardId);
        const stepLabel = stepLabelFor(cardId);
        if (!card || stepLabel === null) continue;
        rows.push({
            cardId,
            name: card.name,
            count: deckCardIds.filter((id) => id === cardId).length,
            stepLabel,
            ringColor: rewardCardVMs([cardId])[0]?.stanceColor ?? '',
        });
    }
    return rows;
}

/**
 * The preview for one picked card: as it is, and after this one upgrade.
 * Null when the card cannot take another upgrade (so a screen never shows
 * an AFTER the commit would refuse).
 */
export function cardUpgradePreviewVM(cardId: string): CardUpgradePreviewVM | null {
    const to = nextUpgradeId(cardId);
    if (to === undefined) return null;
    const before = faceVM(cardId);
    const after = faceVM(to);
    const stepLabel = stepLabelFor(cardId);
    // No player stats: both faces print the authored numbers, like `faceVM`.
    const [beforeCard, afterCard] = rewardCardVMs([cardId, to]);
    if (!before || !after || stepLabel === null || !beforeCard || afterCard?.cardId !== to) return null;
    const paid = cardUpgradeLineChange(beforeCard.face.paidLine, afterCard.face.paidLine);
    const free = cardUpgradeLineChange(before.freeText, after.freeText);
    return {
        before,
        after,
        stepLabel,
        beforeCard,
        afterCard,
        changeLine: paid.text ?? free.text,
        changed: {
            paid: paid.changedNumbers,
            free: (beforeCard.face.freeValue ?? '') !== (afterCard.face.freeValue ?? ''),
        },
    };
}

// ── The change line ──────────────────────────────────────────────────────────

/** A run of digits: what the face counts when it colours a changed number. */
const DIGITS = /\d+/g;
/** A word that is only a number, a sign and a unit: '5', '+2', '25%', '3×',
 *  and the leading multiplier a FREE rider prints its intensity with: '×2'. */
const NUMBER_WORD = /^[+−-]?×?\d+[%×]?$/;
/** A printed keyword: 'LEECH', 'DEAL'. */
const KEYWORD = /^[A-Z]{2,}$/;

interface Word { norm: string; start: number }

function wordsOf(line: string): Word[] {
    const words: Word[] = [];
    for (const m of line.matchAll(/\S+/g)) {
        // Brackets and clause punctuation are not part of the word: '12)' is 12.
        const norm = m[0].replace(/^[([]+/, '').replace(/[.,;:)\]]+$/, '');
        words.push({ norm, start: (m.index ?? 0) + m[0].indexOf(norm) });
    }
    return words;
}

/** The index of the first run of digits that starts at or after `offset`. */
function digitRunAt(line: string, offset: number): number {
    let n = 0;
    for (const m of line.matchAll(DIGITS)) {
        if ((m.index ?? 0) >= offset) return n;
        n += 1;
    }
    return n;
}

/**
 * What one upgrade changed on one printed line: each number that moved,
 * named by the word before it ('LEECH 4 → 5', 'max 12 → 15'), and a number
 * the upgrade added ('DEAL +2', named by the nearest keyword before it). Two
 * changes join with ' · '; `text` is null when no number moved. The diff runs
 * word by word (longest common subsequence), so a line that grows a clause
 * still pairs its unchanged words. `changedNumbers` names the changed numbers
 * of `afterLine` by their order among its runs of digits.
 */
export function cardUpgradeLineChange(
    beforeLine: string | null,
    afterLine: string | null,
): { text: string | null; changedNumbers: number[] } {
    if (!beforeLine || !afterLine || beforeLine === afterLine) return { text: null, changedNumbers: [] };
    const a = wordsOf(beforeLine);
    const b = wordsOf(afterLine);
    const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i -= 1) {
        for (let j = b.length - 1; j >= 0; j -= 1) {
            lcs[i][j] = a[i].norm === b[j].norm ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const nameBefore = (j: number): string | null => {
        const prev = j > 0 ? b[j - 1].norm : '';
        return /^[A-Za-z]+$/.test(prev) ? prev : null;
    };
    // An added number ('+2') grows the clause it ends, so it is named by the
    // clause's first keyword: the line restarts after a ':' or a '.'.
    const clauseKeyword = (j: number): string | null => {
        const clauseStart = Math.max(
            afterLine.lastIndexOf(':', b[j].start),
            afterLine.lastIndexOf('.', b[j].start),
        );
        const inClause = b.filter((w) => w.start > clauseStart && KEYWORD.test(w.norm));
        // '+X +2 to your next DEAL': with no keyword before it, the one after names it.
        const word = inClause.find((w) => w.start < b[j].start) ?? inClause[0];
        return word ? word.norm : null;
    };
    const changes: string[] = [];
    const changedNumbers: number[] = [];
    /** The after-line word index of the number the last change names. */
    let lastChangedAt = -1;
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i].norm === b[j].norm) {
            i += 1;
            j += 1;
            continue;
        }
        // One hunk: the words dropped and the words added between two common ones.
        const dropped: Word[] = [];
        const added: { word: Word; at: number }[] = [];
        while (i < a.length || j < b.length) {
            if (i < a.length && j < b.length && a[i].norm === b[j].norm) break;
            if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
                added.push({ word: b[j], at: j });
                j += 1;
            } else {
                dropped.push(a[i]);
                i += 1;
            }
        }
        const oldNumbers = dropped.filter((w) => NUMBER_WORD.test(w.norm));
        added
            .filter(({ word }) => NUMBER_WORD.test(word.norm))
            .forEach(({ word, at }, n) => {
                changedNumbers.push(digitRunAt(afterLine, word.start));
                const was = oldNumbers[n];
                const prev = nameBefore(at);
                let name = was || (prev !== null && KEYWORD.test(prev)) ? prev : clauseKeyword(at);
                const change = was ? `${was.norm} → ${word.norm}` : word.norm;
                if (name === 'or' && at >= 2 && NUMBER_WORD.test(b[at - 2].norm)) {
                    // 'DEAL 4 or 8' moving both numbers reads as one change: 'DEAL 4 → 6 or 8 → 12'.
                    if (lastChangedAt === at - 2 && changes.length > 0) {
                        changes[changes.length - 1] += ` or ${change}`;
                        lastChangedAt = at;
                        return;
                    }
                    // Only the second moved: the either-or's keyword still names it ('DEAL 14 → 20').
                    name = nameBefore(at - 2);
                }
                changes.push(name ? `${name} ${change}` : change);
                lastChangedAt = at;
            });
    }
    const unique = [...new Set(changes)];
    return { text: unique.length > 0 ? unique.join(' · ') : null, changedNumbers };
}
