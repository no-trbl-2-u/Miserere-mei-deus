/**
 * The cutscenes asset module bundles its narrator and five scene pictures with
 * provenance. Hermetic: reads only the registry, the bundled files and the
 * provenance record.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.resolve(__dirname, '..');
const SCENES = ['windmill-headland', 'clifftop-chapel', 'old-watchtower', 'high-pass', 'charcoal-wood-arrival'];

const covered = (): string => {
    const record = JSON.parse(fs.readFileSync(path.join(DIR, 'provenance.json'), 'utf-8'));
    return record.flatMap((e: { covers: string[] }) => e.covers).join('\n');
};

describe('cutscenes asset module', () => {
    it('bundles the narrator with a provenance entry, and the Hermit copy is gone', () => {
        expect(fs.existsSync(path.join(DIR, 'narrator.webp'))).toBe(true);
        expect(fs.existsSync(path.join(DIR, 'narrator-standin.webp'))).toBe(false);
        expect(covered()).toContain('narrator.webp');
    });

    it.each(SCENES)('bundles the %s picture with a provenance entry, its own file', (id) => {
        expect(fs.existsSync(path.join(DIR, `scene-${id}.webp`))).toBe(true);
        expect(covered()).toContain(`scene-${id}.webp`);
        const src = fs.readFileSync(path.join(DIR, 'index.ts'), 'utf-8');
        expect(src).toContain(`require('./scene-${id}.webp')`);
    });

    it('never points into Potential Assets', () => {
        const src = fs.readFileSync(path.join(DIR, 'index.ts'), 'utf-8');
        for (const m of src.matchAll(/require\('([^']*)'\)/g)) expect(m[1]).not.toContain('Potential Assets');
    });
});
