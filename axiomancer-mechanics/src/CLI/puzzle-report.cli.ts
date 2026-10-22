/**
 * Puzzle-report CLI — prints `hazardPuzzleCardReport` for every demo in
 * `HAZARD_PUZZLE_LIBRARY`, both routes, as markdown: once with no unlock
 * and once with every declared unlock granted, each with its five
 * difficulty features and its decision pressure (`forced` / `free` marked).
 * Then every candidate in `HAZARD_PUZZLE_CANDIDATES` on its nominated route.
 * Reads only.
 *
 * Usage:
 *   npm run puzzle:report
 */

import {
    formatHazardPuzzleCardReport,
    formatHazardPuzzleDecisionPressure,
    formatHazardPuzzleFeatures,
    hazardPuzzleCardReport,
} from '../World/Hazard/puzzle/hazard-puzzle.report';
import { HAZARD_PUZZLE_CANDIDATES } from '../World/Hazard/puzzle/hazard-puzzle.candidates';
import { HAZARD_PUZZLE_LIBRARY } from '../World/Hazard/puzzle/hazard-puzzle.library';
import type {
    HazardPuzzleCandidate,
    HazardPuzzleLayout,
    HazardPuzzleUnlock,
} from '../World/Hazard/puzzle/hazard-puzzle.types';

function unlockLabel(unlocks: readonly HazardPuzzleUnlock[]): string {
    return unlocks.length === 0 ? 'no unlock' : unlocks.map((u) => `${u.stat} ${u.min} ${u.kind}`).join(' + ');
}

function layoutSection(layout: HazardPuzzleLayout): string {
    const parts = [`## ${layout.id}`];
    const unlockSets = layout.unlocks.length > 0 ? [[], layout.unlocks] : [[]];
    for (const route of ['safe', 'risk'] as const) {
        for (const unlocks of unlockSets) {
            const report = hazardPuzzleCardReport(layout, route, unlocks);
            const wins = report.cards[0]?.total ?? 0;
            parts.push(
                `### ${route} (${layout.bands[route]}), ${unlockLabel(unlocks)}: ${wins} winning outcomes`,
                formatHazardPuzzleFeatures(report.features, report.overBudget),
                formatHazardPuzzleDecisionPressure(report.pressure),
                formatHazardPuzzleCardReport(report),
            );
        }
    }
    return parts.join('\n\n');
}

/** A candidate on its nominated route only, with no unlock: the route it is played and graded on. */
function candidateSection(candidate: HazardPuzzleCandidate): string {
    const report = hazardPuzzleCardReport(candidate, candidate.route);
    const wins = report.cards[0]?.total ?? 0;
    return [
        `## ${candidate.id}: "${candidate.label}"`,
        `### ${candidate.route} (intended ${candidate.intendedBand}): ${wins} winning outcomes`,
        formatHazardPuzzleFeatures(report.features, report.overBudget),
        formatHazardPuzzleDecisionPressure(report.pressure),
        formatHazardPuzzleCardReport(report),
    ].join('\n\n');
}

if (require.main === module) {
    const sections = HAZARD_PUZZLE_LIBRARY.map(layoutSection);
    const candidates = HAZARD_PUZZLE_CANDIDATES.map(candidateSection);
    process.stdout.write(
        `# Hazard puzzle card report\n\n${sections.join('\n\n')}\n\n` +
            `# Candidates, nominated route\n\n${candidates.join('\n\n')}\n`,
    );
}
