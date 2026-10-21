/**
 * A4, the half a behavioural test cannot hold: the frame engine must never ASK
 * the platform about reduced motion. It takes the answer the caller already
 * holds — in live combat, the combat pane's own ref — and a second
 * subscription added here tomorrow would still pass every render test while
 * quietly becoming the answer that drifts.
 *
 * Source-level, so it reads the committed files the way the route guards and
 * the Expo-decouple boundary guard do. That is why this file is on the
 * hermeticity audit's FS allowlist.
 */
import fs from 'node:fs';
import path from 'node:path';

const ENGINE_DIR = path.join(__dirname, '..');
const FORBIDDEN = /AccessibilityInfo|useReducedMotion\s*\(/;

function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Every module that decides WHETHER MOTION HAPPENS, and must therefore be
 * taking the answer from its caller rather than from the platform. Listing
 * them by name is the point: a new gate added to the engine without a row
 * here is a gate nothing holds to A4, and the last assertion refuses the
 * list going empty.
 */
const MOTION_GATES = ['useFramePlayback.ts', 'useEnemyClipSelection.ts'] as const;

describe('the enemy frame engine owns no reduced-motion mechanism of its own', () => {
    const sources = fs.readdirSync(ENGINE_DIR).filter((f) => /\.tsx?$/.test(f));

    it('reads a directory of engine sources at all', () => {
        expect(sources.length).toBeGreaterThan(0);
    });

    it.each(sources)('%s never reaches for the platform preference itself', (file) => {
        // Comments are stripped: the engine is allowed to SAY why it never
        // asks, which is most of why it never does.
        const text = stripComments(fs.readFileSync(path.join(ENGINE_DIR, file), 'utf8'));
        expect(text).not.toMatch(FORBIDDEN);
    });

    it.each(MOTION_GATES)('%s gates motion through the answer its caller handed it', (file) => {
        // The positive half. "Never asks" is satisfied by a module that never
        // consults the preference at all — which would be a gate that is not
        // gating. Each named gate must read it, and read it through the one
        // shared reader, so there is exactly one way the answer arrives.
        expect(sources).toContain(file);
        const text = stripComments(fs.readFileSync(path.join(ENGINE_DIR, file), 'utf8'));
        expect(text).toMatch(/readReducedMotion\s*\(/);
        expect(text).toMatch(/reducedMotion/);
    });
});
