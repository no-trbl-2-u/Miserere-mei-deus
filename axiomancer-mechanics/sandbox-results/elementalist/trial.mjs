// Runs the elementalist sim on numbers-override variants and prints the
// per-foe line of each (sandbox/elementalist-sims only; a tuning aid).
// Usage: node sandbox-results/elementalist/trial.mjs <variants.json> [runs] [decks]
//   variants.json: { "<name>": { "<numbers key>": n, ... }, ... }
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [file, runs = '100', decks = 'test'] = process.argv.slice(2);
const variants = JSON.parse(readFileSync(file, 'utf8'));
const dir = join(tmpdir(), 'elementalist-trials');
mkdirSync(dir, { recursive: true });
const mean = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
for (const [name, overrides] of Object.entries(variants)) {
    const nf = join(dir, `${name}.json`);
    const out = join(dir, `${name}.out.json`);
    const { __scale, ...rest } = overrides;
    writeFileSync(nf, JSON.stringify(rest));
    const r = spawnSync('npx', ['ts-node', '--transpile-only', 'src/CLI/elementalist-sim.cli.ts',
        `--numbers=${nf}`, `--decks=${decks}`, `--runs=${runs}`, `--out=${out}`, ...(__scale ? [`--scale-offence=${__scale}`] : [])],
        { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'ignore', 'pipe'] });
    if (r.status !== 0) { console.log(name, 'FAILED', r.stderr.slice(-500)); continue; }
    const o = JSON.parse(readFileSync(out, 'utf8'));
    const parts = [];
    for (const foe of ['float-eye', 'green-jelly', 'death-beholder']) {
        const cs = o.cells.filter(c => c.enemySlug === foe);
        parts.push(`${foe.split('-')[0]} ${mean(cs.map(c => c.meanRounds)).toFixed(2)}t win ${(100 * mean(cs.map(c => c.winRate))).toFixed(0)}% p10 ${Math.min(...cs.map(c => c.p10)).toFixed(2)} kill ${(100 * mean(cs.map(c => c.selfKillRate))).toFixed(1)}%`);
    }
    console.log(`${name}: ${parts.join(' | ')}`);
}
