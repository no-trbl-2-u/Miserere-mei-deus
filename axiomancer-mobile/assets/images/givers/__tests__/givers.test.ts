/**
 * QS1a (A2) - one table supplies the four quest givers' figures.
 * Hermetic: reads only the registry, the bundled files and the provenance record.
 */
import fs from 'fs';
import path from 'path';
import { GIVER_FIGURES, GIVER_IDS, giverFigure } from '../index';

const DIR = path.resolve(__dirname, '..');

describe('quest giver figures', () => {
    it('has exactly the four givers', () => {
        expect([...GIVER_IDS].sort()).toEqual(['bridge-keeper', 'fishermen-elder', 'gate-warden', 'lighthouse-keeper']);
        expect(Object.keys(GIVER_FIGURES).sort()).toEqual([...GIVER_IDS].sort());
    });

    it('resolves every id to a bundled image and falls back on an unknown one', () => {
        for (const id of GIVER_IDS) {
            expect(giverFigure(id)).toBe(GIVER_FIGURES[id].source);
            expect(fs.existsSync(path.join(DIR, `${id}.webp`))).toBe(true);
        }
        expect(giverFigure('nobody-here')).toBe(GIVER_FIGURES['fishermen-elder'].source);
    });

    it('never points into Potential Assets', () => {
        const registry = fs.readFileSync(path.join(DIR, 'index.ts'), 'utf-8');
        for (const m of registry.matchAll(/require\('([^']*)'\)/g)) {
            expect(m[1]).not.toContain('Potential Assets');
            expect(m[1].startsWith('./')).toBe(true);
        }
    });

    it('records every image in provenance.json', () => {
        const record = JSON.parse(fs.readFileSync(path.join(DIR, 'provenance.json'), 'utf-8'));
        const covers = record.flatMap((e: { covers: string[] }) => e.covers).join('\n');
        for (const id of GIVER_IDS) expect(covers).toContain(`${id}.webp`);
    });
});
