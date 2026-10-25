/**
 * Measured-truth CLI — the Act 1 ledger × stat spread × deck table.
 *
 * Prints, per Act 1 fight, each measured deck's win rate and lowest-VITAE
 * p10 at every stat spread (greedy witness), each sampled family's median
 * with its win-rate range, and each deck's VITAE lost to foes against its own
 * INFERNO. `--json` prints the report and nothing else;
 * `scripts/measured-truth.mjs` reads it. A measurement, not a baseline.
 *
 * Usage:
 *   npm run measured-truth
 *   npm run measured-truth -- --runs=300 --seed=1 --draws=16 --json
 */

import { measuredTruthCells, type MeasuredTruthReport } from '../Combat/combat.measured-truth';

function pct(x: number): string {
    return `${(x * 100).toFixed(0)}%`;
}

function printTable(report: MeasuredTruthReport): void {
    const decks = Object.keys(report.decks);
    const width = (d: string) => ('family' in report.decks[d]! ? 32 : 23);
    const cols = decks.flatMap(d => report.spreads.map(s => `${d}/${s}`.padStart(width(d))));
    process.stdout.write(`\nMeasured truth (greedy witness, ${report.runs} runs, seed ${report.seed}): win rate / lowest-VITAE p10\n`);
    process.stdout.write(`  ${'fight'.padEnd(28)} ${'lvl'.padEnd(7)}${cols.join('')}\n`);
    const fights = [...new Set(report.cells.map(c => c.fight))];
    for (const fight of fights) {
        const row = report.cells.filter(c => c.fight === fight);
        const first = row[0]!;
        const cells = decks.flatMap(d => report.spreads.map(s => {
            const c = row.find(x => x.deck === d && x.spread === s);
            if (!c) return '-'.padStart(width(d));
            const range = c.winRateMin !== undefined ? ` (${pct(c.winRateMin)}-${pct(c.winRateMax ?? c.winRateMin)})` : '';
            return `${pct(c.winRate)} / ${c.lowestVitaeFractionP10.toFixed(2)}${range}`.padStart(width(d));
        }));
        const lvl = `L${first.playerLevel}vL${first.enemyLevel}`;
        process.stdout.write(`  ${(fight + (first.isBoss ? ' (door)' : '')).padEnd(28)} ${lvl.padEnd(7)}${cells.join('')}\n`);
    }
    process.stdout.write('\n');
    for (const d of decks) {
        const deck = report.decks[d]!;
        const size = 'family' in deck
            ? `${deck.draws.length} draws of ${deck.drawSize} from ${deck.poolSize}`
            : `${deck.deckCards.length} cards`;
        const cells = report.cells.filter(c => c.deck === d);
        const mean = (pick: (c: (typeof cells)[number]) => number) =>
            (cells.reduce((a, c) => a + pick(c), 0) / Math.max(1, cells.length)).toFixed(1);
        process.stdout.write(`${d}: ${size}, dead-card rate ${pct(deck.deadCardRate)}; `
            + `VITAE per fight from foes ${mean(c => c.playerHpTakenMean)}, self-burn ${mean(c => c.selfBurnMean)}\n`);
    }
}

if (require.main === module) {
    const flag = (k: string): string | undefined => {
        const a = process.argv.find(x => x.startsWith(`--${k}=`));
        return a ? a.slice(k.length + 3) : undefined;
    };
    const runs = Number(flag('runs') ?? '300');
    const seed = Number(flag('seed') ?? '1');
    const sampleDraws = Number(flag('draws') ?? '16');
    const report = measuredTruthCells({ runs, seed, sampleDraws });
    if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report)}\n`);
    else printTable(report);
}
