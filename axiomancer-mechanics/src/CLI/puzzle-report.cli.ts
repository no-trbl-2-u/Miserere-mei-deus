/**
 * Puzzle-report CLI — prints `hazardPuzzleCardReport` for every demo in
 * `HAZARD_PUZZLE_LIBRARY`, both routes, as markdown: once with no unlock
 * and once with every declared unlock granted. Reads only.
 *
 * Usage:
 *   npm run puzzle:report
 */

import {
    formatHazardPuzzleCardReport,
    hazardPuzzleCardReport,
} from '../World/Hazard/puzzle/hazard-puzzle.report';
import { HAZARD_PUZZLE_LIBRARY } from '../World/Hazard/puzzle/hazard-puzzle.library';
import type { HazardPuzzleLayout, HazardPuzzleUnlock } from '../World/Hazard/puzzle/hazard-puzzle.types';

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
                formatHazardPuzzleCardReport(report),
            );
        }
    }
    return parts.join('\n\n');
}

if (require.main === module) {
    const sections = HAZARD_PUZZLE_LIBRARY.map(layoutSection);
    process.stdout.write(`# Hazard puzzle card report\n\n${sections.join('\n\n')}\n`);
}
