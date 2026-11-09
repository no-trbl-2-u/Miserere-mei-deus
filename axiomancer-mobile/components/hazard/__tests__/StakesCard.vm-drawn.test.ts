/**
 * Guard for the footgun `stakes-card-vm-undrawn-lines`: `HazardStakesVM` keeps
 * fields for the rules that `StakesCard` does not draw. A field added to the VM
 * must be sorted here on purpose, as drawn or as rules-only, and the card's
 * source must agree. A new line that only reaches the engine fails this test.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..');
const VM_SRC = readFileSync(join(ROOT, 'state/presenters/hazard-stakes.engine.ts'), 'utf8');
const CARD_SRC = readFileSync(join(ROOT, 'components/hazard/StakesCard.tsx'), 'utf8');

/** Fields the card draws (a `stakes.<field>` read in StakesCard.tsx). */
const DRAWN = ['place', 'goalLine', 'timeLine', 'cta'];
/** Fields kept for the rules and tests only; the card must not read them. */
const RULES_ONLY = ['kindLine', 'lines'];

function vmFields(): string[] {
    const body = /export interface HazardStakesVM \{([\s\S]*?)\n\}/.exec(VM_SRC);
    if (!body) throw new Error('HazardStakesVM interface not found');
    // Strip comments so prose cannot read as a field.
    const bare = body[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return [...bare.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
}

// guard-test: the VM and the card already agree today; this pins that a field added to one cannot skip the other.
describe('stakes-card-vm-undrawn-lines', () => {
    it('every HazardStakesVM field is sorted as drawn or rules-only', () => {
        const unsorted = vmFields().filter((f) => !DRAWN.includes(f) && !RULES_ONLY.includes(f));
        // A new field: draw it in StakesCard and add it to DRAWN, or name it RULES_ONLY.
        expect(unsorted).toEqual([]);
    });

    it('every drawn field is read by the card', () => {
        const unread = DRAWN.filter((f) => !new RegExp(`stakes\\.${f}\\b`).test(CARD_SRC));
        expect(unread).toEqual([]);
    });

    it('no rules-only field is read by the card', () => {
        const read = RULES_ONLY.filter((f) => new RegExp(`stakes\\.${f}\\b`).test(CARD_SRC));
        expect(read).toEqual([]);
    });

    it('the lists name only real VM fields', () => {
        const fields = vmFields();
        expect([...DRAWN, ...RULES_ONLY].filter((f) => !fields.includes(f))).toEqual([]);
    });
});
