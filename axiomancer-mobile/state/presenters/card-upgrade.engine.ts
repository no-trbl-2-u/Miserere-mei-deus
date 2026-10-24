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
 */

import {
    getCardById,
    lookupEffect,
    nextUpgradeId,
    toCombatCard,
    upgradeLevel,
    upgradeLimit,
} from '@mechanics';

import { detailStats } from '@/state/presenters/combat-encounter.engine';
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
}

export interface CardUpgradePreviewVM {
    before: CardUpgradeFaceVM;
    after: CardUpgradeFaceVM;
    stepLabel: string;
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
    if (!before || !after || stepLabel === null) return null;
    return { before, after, stepLabel };
}
