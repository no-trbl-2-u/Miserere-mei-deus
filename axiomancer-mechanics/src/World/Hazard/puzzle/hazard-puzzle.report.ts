/**
 * Hazard puzzle — the card report.
 *
 * Reads the solver's winning outcomes per card: how many stage each card in
 * the hand, the reserve and the granted unlocks, whether every win needs it
 * and whether no win uses it. T reads the `unused` column across layouts to
 * spot a card that is worse than another everywhere.
 */

import type { HazardRouteKey } from '../hazard.types';
import { solveHazardPuzzle, type HazardPuzzleSolveOptions } from './hazard-puzzle.solver';
import type { HazardPuzzleLayout, HazardPuzzleUnlock } from './hazard-puzzle.types';

/** Where a card in the report comes from. */
export type HazardPuzzleCardSource = 'hand' | 'reserve' | 'unlock';

export interface HazardPuzzleCardUse {
    cardId: string;
    /** Every place the layout (with the granted unlocks) holds the card. */
    sources: HazardPuzzleCardSource[];
    /** Winning outcomes that stage the card. */
    staged: number;
    /** Winning outcomes in all. */
    total: number;
    /** Every win stages the card (false when nothing wins). */
    required: boolean;
    /** No win stages the card. */
    unused: boolean;
}

export interface HazardPuzzleCardReport {
    layoutId: string;
    route: HazardRouteKey;
    unlocks: HazardPuzzleUnlock[];
    cards: HazardPuzzleCardUse[];
}

/** The layout's card ids with their sources, in first-seen order: hand, reserve, unlocks. */
function cardSources(
    layout: HazardPuzzleLayout,
    unlocks: readonly HazardPuzzleUnlock[],
): Map<string, HazardPuzzleCardSource[]> {
    const sources = new Map<string, HazardPuzzleCardSource[]>();
    const add = (cardId: string, source: HazardPuzzleCardSource): void => {
        const list = sources.get(cardId) ?? [];
        if (!list.includes(source)) list.push(source);
        sources.set(cardId, list);
    };
    for (const id of layout.hand) add(id, 'hand');
    for (const id of layout.reserve) add(id, 'reserve');
    for (const u of unlocks) if (u.kind === 'extraCard') add(u.cardId, 'unlock');
    return sources;
}

/** Per-card use across the winning outcomes of `layout` on `route` with `unlocks` granted. */
export function hazardPuzzleCardReport(
    layout: HazardPuzzleLayout,
    route: HazardRouteKey,
    unlocks: readonly HazardPuzzleUnlock[] = [],
    options: HazardPuzzleSolveOptions = {},
): HazardPuzzleCardReport {
    const solution = solveHazardPuzzle(layout, route, unlocks, options);
    const total = solution.winningOutcomes;
    const cards = [...cardSources(layout, unlocks)].map(([cardId, sources]) => {
        const staged = solution.winningStaged.filter((ids) => ids.includes(cardId)).length;
        return { cardId, sources, staged, total, required: total > 0 && staged === total, unused: staged === 0 };
    });
    return { layoutId: layout.id, route, unlocks: unlocks.slice(), cards };
}

/** The report as a markdown table, one row per card. */
export function formatHazardPuzzleCardReport(report: HazardPuzzleCardReport): string {
    const rows = report.cards.map(
        (c) =>
            `| ${c.cardId} | ${c.sources.join(', ')} | ${c.staged} / ${c.total} | ` +
            `${c.required ? 'yes' : ''} | ${c.unused ? 'yes' : ''} |`,
    );
    return ['| card | from | staged / wins | required | unused |', '|---|---|---|---|---|', ...rows].join('\n');
}
