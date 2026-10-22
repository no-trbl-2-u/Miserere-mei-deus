/**
 * Hazard puzzle — the worse-copy check.
 *
 * Two ways a puzzle card earns no place in the library:
 *  - it is `unused`: no winning outcome stages it in any library layout,
 *    route and unlock set that holds it;
 *  - it is dominated by another card: in every one of those cells,
 *    putting the other card in its place (hand, reserve and granted
 *    unlocks) keeps at least as many winning outcomes, and in at least one
 *    it gives strictly more.
 *
 * Cells are each library layout on both routes, with no unlock and with
 * every declared unlock, the same cells `hazardPuzzleLibraryUse` reads.
 * The library test fails on either finding, naming the cards.
 */

import type { HazardRouteKey } from '../hazard.types';
import { hazardPuzzleCardReport } from './hazard-puzzle.report';
import { solveHazardPuzzle } from './hazard-puzzle.solver';
import { HAZARD_PUZZLE_CARD_POOL } from './hazard-puzzle.tuning';
import type { HazardPuzzleLayout, HazardPuzzleUnlock } from './hazard-puzzle.types';
import { validateHazardPuzzleLayout } from './hazard-puzzle.validate';

/** One place the library is solved: a layout, a route and the unlocks granted. */
export interface HazardPuzzleLibraryCell {
    layout: HazardPuzzleLayout;
    route: HazardRouteKey;
    unlocks: HazardPuzzleUnlock[];
}

/** Every library layout on both routes, with no unlock and with every declared unlock. */
export function hazardPuzzleLibraryCells(library: readonly HazardPuzzleLayout[]): HazardPuzzleLibraryCell[] {
    const cells: HazardPuzzleLibraryCell[] = [];
    for (const layout of library) {
        const unlockSets = layout.unlocks.length > 0 ? [[], layout.unlocks] : [[]];
        for (const route of ['safe', 'risk'] as HazardRouteKey[]) {
            for (const unlocks of unlockSets) cells.push({ layout, route, unlocks });
        }
    }
    return cells;
}

/** A readable label for a cell, e.g. `demo-cliff-easy risk +mind extraDie`. */
export function hazardPuzzleCellLabel(cell: HazardPuzzleLibraryCell): string {
    const unlocks = cell.unlocks.map((u) => ` +${u.stat} ${u.kind}`).join('');
    return `${cell.layout.id} ${cell.route}${unlocks}`;
}

/** True when the cell's layout or its granted unlocks hold the card. */
export function hazardPuzzleCellHolds(cell: HazardPuzzleLibraryCell, cardId: string): boolean {
    return (
        cell.layout.hand.includes(cardId) ||
        cell.layout.reserve.includes(cardId) ||
        cell.unlocks.some((u) => u.kind === 'extraCard' && u.cardId === cardId)
    );
}

/** The cell with every copy of `from` replaced by `to`, in the hand, the reserve and the granted unlocks. */
export function swapHazardPuzzleCard(cell: HazardPuzzleLibraryCell, from: string, to: string): HazardPuzzleLibraryCell {
    const swap = (id: string): string => (id === from ? to : id);
    const swapUnlock = (u: HazardPuzzleUnlock): HazardPuzzleUnlock =>
        u.kind === 'extraCard' ? { ...u, cardId: swap(u.cardId) } : u;
    return {
        layout: {
            ...cell.layout,
            hand: cell.layout.hand.map(swap),
            reserve: cell.layout.reserve.map(swap),
            unlocks: cell.layout.unlocks.map(swapUnlock),
        },
        route: cell.route,
        unlocks: cell.unlocks.map(swapUnlock),
    };
}

/** The library cards no winning outcome stages in any cell that holds them, in library order. */
export function hazardPuzzleUnusedCards(library: readonly HazardPuzzleLayout[]): string[] {
    const cells = hazardPuzzleLibraryCells(library);
    return hazardPuzzleLibraryCardIds(library).filter((cardId) =>
        cells
            .filter((c) => hazardPuzzleCellHolds(c, cardId))
            .every((c) => hazardPuzzleCardReport(c.layout, c.route, c.unlocks).cards.some((u) => u.cardId === cardId && u.unused)),
    );
}

/** A card another card beats in every library cell that holds it. */
export interface HazardPuzzleDominance {
    cardId: string;
    /** The better card. */
    by: string;
    /** Cells where the swap gives strictly more winning outcomes, with the two counts. */
    gains: { cell: string; outcomes: number; swapped: number }[];
}

/** The ids of every card the library holds, in first-seen order. */
export function hazardPuzzleLibraryCardIds(library: readonly HazardPuzzleLayout[]): string[] {
    const ids = new Set<string>();
    for (const l of library) {
        for (const id of [...l.hand, ...l.reserve]) ids.add(id);
        for (const u of l.unlocks) if (u.kind === 'extraCard') ids.add(u.cardId);
    }
    return [...ids];
}

/**
 * Every library card some other card beats: for each card X the library
 * holds and each candidate Y (the puzzle card pool by default), X is
 * dominated by Y when the swap never loses a winning outcome in a cell that
 * holds X and gains one in at least one. One entry per (X, Y) pair, cards
 * in library order, candidates in pool order.
 */
export function hazardPuzzleDominatedCards(
    library: readonly HazardPuzzleLayout[],
    candidates: readonly string[] = HAZARD_PUZZLE_CARD_POOL,
): HazardPuzzleDominance[] {
    const cells = hazardPuzzleLibraryCells(library);
    const count = (c: HazardPuzzleLibraryCell): number =>
        solveHazardPuzzle(c.layout, c.route, c.unlocks).winningOutcomes;
    const found: HazardPuzzleDominance[] = [];
    for (const cardId of hazardPuzzleLibraryCardIds(library)) {
        const holding = cells.filter((c) => hazardPuzzleCellHolds(c, cardId));
        const base = holding.map(count);
        for (const by of candidates) {
            if (by === cardId) continue;
            const gains: HazardPuzzleDominance['gains'] = [];
            let worse = false;
            for (let i = 0; i < holding.length && !worse; i++) {
                const cell = swapHazardPuzzleCard(holding[i], cardId, by);
                // A card the layout cannot hold (a reroll card on a board with no reroll faces) cannot stand in.
                if (!validateHazardPuzzleLayout(cell.layout).ok) {
                    worse = true;
                    break;
                }
                const swapped = count(cell);
                if (swapped < base[i]) worse = true;
                else if (swapped > base[i]) {
                    gains.push({ cell: hazardPuzzleCellLabel(holding[i]), outcomes: base[i], swapped });
                }
            }
            if (!worse && gains.length > 0) found.push({ cardId, by, gains });
        }
    }
    return found;
}
