/**
 * The cutscenes asset module bundles its narrator stand-in with provenance.
 * Hermetic: reads only the registry, the bundled file and the provenance record.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.resolve(__dirname, '..');

describe('cutscenes asset module', () => {
    it('bundles the narrator stand-in with a provenance entry', () => {
        expect(fs.existsSync(path.join(DIR, 'narrator-standin.webp'))).toBe(true);
        const record = JSON.parse(fs.readFileSync(path.join(DIR, 'provenance.json'), 'utf-8'));
        expect(record.flatMap((e: { covers: string[] }) => e.covers).join('\n')).toContain('narrator-standin.webp');
    });

    it('never points into Potential Assets', () => {
        const src = fs.readFileSync(path.join(DIR, 'index.ts'), 'utf-8');
        for (const m of src.matchAll(/require\('([^']*)'\)/g)) expect(m[1]).not.toContain('Potential Assets');
    });
});
