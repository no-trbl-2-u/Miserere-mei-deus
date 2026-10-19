/**
 * Puzzle-audit CLI — writes the hazard puzzle card audit for every card in
 * `HAZARD_DECK` plus CRACK to `docs/reports/hazard-puzzle-card-audit.md`:
 * each card's puzzle shape, the fields puzzles ignore, any ban, its
 * identical-behaviour group, its report columns across the demo library
 * and a keep or cut recommendation. Reads the game; writes only the report.
 *
 * Usage:
 *   npm run puzzle:audit
 */

import * as fs from 'fs';
import * as path from 'path';

import { HAZARD_CRACK_CARD, HAZARD_DECK } from '../World/Hazard/hazard.content';
import type { HazardCardDef } from '../World/Hazard/hazard.types';
import {
    HAZARD_PUZZLE_IGNORED_FIELDS,
    hazardPuzzleCardAudit,
    hazardPuzzleCardShape,
    type HazardPuzzleCardAuditRow,
} from '../World/Hazard/puzzle/hazard-puzzle.audit';
import { HAZARD_PUZZLE_LIBRARY } from '../World/Hazard/puzzle/hazard-puzzle.library';
import { HAZARD_PUZZLE_CARD_POOL } from '../World/Hazard/puzzle/hazard-puzzle.tuning';

const REPORT_PATH = path.resolve(__dirname, '../../../docs/reports/hazard-puzzle-card-audit.md');

const CORE_FIELDS = new Set(['kind', 'f', 'e', 'fp', 'ep', 'effect', 'majorEffect', 'dead']);

function values(def: HazardCardDef): string {
    return `${def.f}/${def.e} free, ${def.fp ?? 0}/${def.ep ?? 0} powered`;
}

function effect(def: HazardCardDef): string {
    if (!def.effect) return '-';
    const amounts = Object.entries(hazardPuzzleCardShape(def))
        .filter(([k]) => !CORE_FIELDS.has(k))
        .map(([k, v]) => `${k} ${String(v)}`);
    const tier = def.majorEffect ? ', major' : '';
    return `${def.effect}${tier}${amounts.length ? ` (${amounts.join(', ')})` : ''}`;
}

function ignored(def: HazardCardDef): string {
    const set = HAZARD_PUZZLE_IGNORED_FIELDS.filter((k) => def[k] !== undefined);
    return set.length ? set.join(', ') : '-';
}

function row(r: HazardPuzzleCardAuditRow): string {
    const d = r.def;
    const group = r.group.length > 1 ? r.group.join(', ') : 'alone';
    return (
        `| ${d.name} (\`${d.id}\`) | ${d.kind} | ${values(d)} | ${effect(d)} | ${d.dead ? 'yes' : ''} | ` +
        `${ignored(d)} | ${r.ban ? 'yes' : ''} | ${group} | ${r.libraryUse} | ` +
        `${r.keep ? 'keep' : 'cut'}: ${r.reason} |`
    );
}

export function hazardPuzzleCardAuditMarkdown(): string {
    const rows = hazardPuzzleCardAudit([...HAZARD_DECK, HAZARD_CRACK_CARD], HAZARD_PUZZLE_LIBRARY);
    const kept = rows.filter((r) => r.keep).map((r) => `\`${r.def.id}\``);
    return [
        '# Hazard puzzle card audit',
        '',
        'Written by `npm run puzzle:audit -w axiomancer-mechanics` (phase HP2a). Every card in `HAZARD_DECK`',
        'plus CRACK, read the way a puzzle reads it. Do not edit by hand; re-run the script.',
        '',
        `- **Ignored by puzzles:** ${HAZARD_PUZZLE_IGNORED_FIELDS.map((k) => `\`${k}\``).join(', ')}. A puzzle has`,
        '  no bin and no random draw, so these change nothing in one.',
        '- **Banned:** RE-CAST cards (a puzzle never rolls) and dead cards.',
        '- **Group:** cards whose puzzle shape (colour, the four values, the utility and its amounts,',
        '  `majorEffect`, `dead`) is equal; they play the same in every puzzle.',
        '- **Library:** the card report across the demo library, both routes, with and without the',
        '  declared unlocks: `required` in every win everywhere, `unused` in no win anywhere, `mixed`,',
        '  or `absent` (no demo holds it). Read after the pool is applied.',
        '- **Recommendation:** cut a banned card and every card after the first in its group; keep the',
        '  rest. T approves the pool by merging it (`HAZARD_PUZZLE_CARD_POOL`); `HAZARD_DECK` and the live',
        '  hazard are unchanged.',
        '',
        '| card | colour | values | effect | dead | ignored fields set | banned | group | library | recommendation |',
        '|---|---|---|---|---|---|---|---|---|---|',
        ...rows.map(row),
        '',
        `Recommended pool (${kept.length}): ${kept.join(', ')}.`,
        '',
        `Pool in \`HAZARD_PUZZLE_CARD_POOL\` (${HAZARD_PUZZLE_CARD_POOL.length}): ` +
            `${HAZARD_PUZZLE_CARD_POOL.map((id) => `\`${id}\``).join(', ')}.`,
        '',
    ].join('\n');
}

if (require.main === module) {
    fs.writeFileSync(REPORT_PATH, hazardPuzzleCardAuditMarkdown(), 'utf-8');
    process.stdout.write(`wrote ${path.relative(process.cwd(), REPORT_PATH)}\n`);
}
