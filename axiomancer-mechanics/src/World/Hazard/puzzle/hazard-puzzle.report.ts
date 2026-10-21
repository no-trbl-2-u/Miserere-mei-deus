/**
 * Hazard puzzle — the card report.
 *
 * Reads the solver's winning outcomes per card: how many stage each card in
 * the hand, the reserve and the granted unlocks, whether every win needs it
 * and whether no win uses it. T reads the `unused` column across layouts to
 * spot a card that is worse than another everywhere. The same solve's five
 * difficulty features ride along, one line per report, and so does its
 * decision pressure: how many cards are a real choice and how many first
 * plays already lose. A route where every card is required is `forced` (the
 * only play is all of it) and one where every first play still wins is
 * `free` (no play is a mistake); both are findings, not failures.
 */

import type { HazardRouteKey } from '../hazard.types';
import {
    solveHazardPuzzle,
    type HazardPuzzleFeatures,
    type HazardPuzzleFirstPlays,
    type HazardPuzzleSolveOptions,
} from './hazard-puzzle.solver';
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

/** A route with no decision in it: every card required, or every first play winning. */
export type HazardPuzzlePressureFinding = 'forced' | 'free';

/** How much one route's choices matter, read off the card report and the first plays. */
export interface HazardPuzzleDecisionPressure {
    /** Cards staged in at least one win but not in every win. */
    optional: number;
    /** Cards staged in every win. */
    required: number;
    /** Cards in the report: hand, reserve and granted unlocks. */
    total: number;
    /** `required / total`; 0 when the report holds no card. */
    requiredShare: number;
    /** First plays from which a win is still reachable, and those from which none is. */
    firstPlays: HazardPuzzleFirstPlays;
    /**
     * `forced` when every card is required; `free` when every first play
     * still wins and at least one does; null otherwise or when nothing wins.
     * `forced` is read first, so a route that is both prints `forced`.
     */
    finding: HazardPuzzlePressureFinding | null;
}

export interface HazardPuzzleCardReport {
    layoutId: string;
    route: HazardRouteKey;
    unlocks: HazardPuzzleUnlock[];
    cards: HazardPuzzleCardUse[];
    /** The solve's difficulty features. */
    features: HazardPuzzleFeatures;
    /** The route's decision pressure. */
    pressure: HazardPuzzleDecisionPressure;
    /** The solve stopped at its budget: every number here is partial. */
    overBudget: boolean;
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

/** Decision pressure from a route's card uses and first plays. */
export function hazardPuzzleDecisionPressure(
    cards: readonly HazardPuzzleCardUse[],
    firstPlays: HazardPuzzleFirstPlays,
): HazardPuzzleDecisionPressure {
    const total = cards.length;
    const required = cards.filter((c) => c.required).length;
    const optional = cards.filter((c) => !c.required && !c.unused).length;
    let finding: HazardPuzzlePressureFinding | null = null;
    if (total > 0 && required === total) finding = 'forced';
    else if (firstPlays.winning > 0 && firstPlays.losing === 0) finding = 'free';
    return {
        optional,
        required,
        total,
        requiredShare: total === 0 ? 0 : required / total,
        firstPlays: { ...firstPlays },
        finding,
    };
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
    return {
        layoutId: layout.id,
        route,
        unlocks: unlocks.slice(),
        cards,
        features: solution.features,
        pressure: hazardPuzzleDecisionPressure(cards, solution.firstPlays),
        overBudget: solution.overBudget,
    };
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

function share(n: number): string {
    return `${Math.round(n * 100)}%`;
}

/** The five difficulty features as one line, marked partial when the solve hit its budget. */
export function formatHazardPuzzleFeatures(features: HazardPuzzleFeatures, overBudget = false): string {
    const parts = [
        `winning lines ${features.winningLines}`,
        `opening share ${share(features.openingShare)}`,
        `near misses ${features.nearMisses}`,
        `shortest win ${features.shortestWin ?? '-'}`,
        `draw dependence ${share(features.drawDependence)}`,
    ];
    return `${parts.join(' · ')}${overBudget ? ' (partial: over budget)' : ''}`;
}

/** The decision pressure as one line, its finding (if any) last. */
export function formatHazardPuzzleDecisionPressure(pressure: HazardPuzzleDecisionPressure): string {
    const parts = [
        `optional cards ${pressure.optional}`,
        `required ${pressure.required} / ${pressure.total} (${share(pressure.requiredShare)})`,
        `first plays that can win ${pressure.firstPlays.winning}`,
        `first plays that cannot ${pressure.firstPlays.losing}`,
    ];
    if (pressure.finding) parts.push(`**${pressure.finding}**`);
    return `decision pressure: ${parts.join(' · ')}`;
}
