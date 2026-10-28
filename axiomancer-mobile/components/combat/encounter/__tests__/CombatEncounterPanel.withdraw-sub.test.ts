/**
 * The WITHDRAW sub-line ("forfeit the path") is the only text on the combat
 * preview that says what withdrawing costs (CRITIQUE pass 101, issue #1038).
 * It once drew at 8.5px in `AXM.ash`, about 1.95:1 against the page.
 *
 * This pins the style: `bone` (held to AA against `bg` on every theme by
 * `theme/__tests__/palette.test.ts`), at least 10px, and smaller than the
 * WITHDRAW label so the hierarchy holds. Reading the source is deliberate, as
 * in the card-detail test: the claim is about an authored style value.
 */

import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(__dirname, '..', 'CombatEncounterPanel.tsx'), 'utf8');

function styleLine(name: string): string {
    const line = SRC.split('\n').find((l) => l.trimStart().startsWith(`${name}: {`));
    if (!line) throw new Error(`style ${name} not found`);
    return line;
}

function fontSize(line: string): number {
    const m = /fontSize:\s*([\d.]+)/.exec(line);
    if (!m) throw new Error(`no fontSize in ${line}`);
    return Number(m[1]);
}

describe('WITHDRAW sub-line is readable', () => {
    const sub = styleLine('withdrawSub');

    it('draws in bone, never the ash border token', () => {
        expect(sub).toContain('color: AXM.bone');
        expect(sub).not.toContain('AXM.ash');
    });

    it('is at least 10px and stays under the WITHDRAW label', () => {
        expect(fontSize(sub)).toBeGreaterThanOrEqual(10);
        expect(fontSize(sub)).toBeLessThan(fontSize(styleLine('withdrawBtnText')));
    });
});
