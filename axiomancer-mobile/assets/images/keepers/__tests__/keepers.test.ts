/**
 * VL1a (A6) - one table supplies every village keeper's portrait.
 * Hermetic: reads only the registry, the bundled files and the provenance record.
 */
import fs from 'fs';
import path from 'path';
import { KEEPER_PORTRAITS, KEEPER_ROLES, keeperPortrait } from '../index';

const DIR = path.resolve(__dirname, '..');

describe('village keeper portraits', () => {
    it('has exactly the four roles', () => {
        expect([...KEEPER_ROLES].sort()).toEqual(['host', 'innkeeper', 'shopkeeper', 'smith']);
        expect(Object.keys(KEEPER_PORTRAITS).sort()).toEqual([...KEEPER_ROLES].sort());
    });

    it('resolves every role to a bundled image', () => {
        for (const role of KEEPER_ROLES) {
            expect(keeperPortrait(role)).toBeDefined();
            expect(fs.existsSync(path.join(DIR, `${role}.webp`))).toBe(true);
        }
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
        for (const role of KEEPER_ROLES) expect(covers).toContain(`${role}.webp`);
    });
});
