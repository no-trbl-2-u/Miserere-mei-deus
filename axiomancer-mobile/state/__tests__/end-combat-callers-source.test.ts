/**
 * Every place that ends a fight on the engine store also routes the quest
 * extras (phase QL1d).
 *
 * A kill can complete a quest, and a completed quest's relic belongs on
 * `/item-reward` and its card pick on the spoils tiles
 * (`offerCompletedQuestExtrasAction`). The engine's `endCombat` pays into
 * the satchel and knows nothing of those screens, so a caller of
 * `store.getState().endCombat(` that does not route the extras hands the
 * relic over silently. The live panel, the actions bridge and the dev skip
 * seam all call it; the dev seam once did not, and a skipped boss put the
 * Elementalist's Belt straight into the satchel.
 *
 * Reads the committed sources, like the other source guards (an import is
 * a source fact, unprovable by rendering); a caller added later is swept
 * with no edit here.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN = ['app', 'components', 'lib', 'state'];

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === '__tests__' || entry === 'e2e' || entry === 'node_modules') continue;
            walk(full, out);
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
            out.push(full);
        }
    }
    return out;
}

const callers = SCAN.flatMap((d) => walk(path.join(ROOT, d)))
    .map((file) => ({ rel: path.relative(ROOT, file), text: readFileSync(file, 'utf8') }))
    .filter((f) => f.text.includes('getState().endCombat('));

describe('every engine endCombat caller routes the quest extras', () => {
    it('finds the three known callers (the panel, the actions bridge, the dev skip seam)', () => {
        expect(callers.map((c) => c.rel).sort()).toEqual(expect.arrayContaining([
            'components/combat/encounter/CombatEncounterPanel.tsx',
            'state/actions.ts',
            'state/dev/skip-event.ts',
        ]));
    });

    it('each one also calls offerCompletedQuestExtrasAction', () => {
        const missing = callers.filter((c) => !c.text.includes('offerCompletedQuestExtrasAction(')).map((c) => c.rel);
        expect(missing).toEqual([]);
    });
});
