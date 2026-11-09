/**
 * CX1b, A8: the ink takes its motion answer from its caller. The map ink and
 * the fight's curtain never ask the platform about reduced motion; the
 * exploration screen and the combat panel ask once and hand it down. Read
 * from source, as `reducedMotionSource.test.ts` reads the frame engine:
 * a second subscription would pass every render test.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..', '..', '..');
const FORBIDDEN = /AccessibilityInfo|useReducedMotion\s*\(/;

function source(rel: string): string {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('the ink never asks the platform about motion', () => {
    it.each([
        'components/exploration/MapInk.tsx',
        'components/exploration/MapInkHost.tsx',
        'components/combat/encounter/InkCurtain.tsx',
    ])('%s takes the answer from its caller', (rel) => {
        expect(source(rel)).not.toMatch(FORBIDDEN);
    });

    it.each([
        'app/(tabs)/exploration/index.tsx',
        'components/combat/encounter/CombatEncounterPanel.tsx',
    ])('%s asks once, through the shared hook, and resolves the juice mode', (rel) => {
        const text = source(rel);
        expect(text).toMatch(/resolveJuiceMode\(\{\s*reducedMotion:\s*useReducedMotion\(\)\s*\}\)/);
    });
});
