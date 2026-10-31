/**
 * The reveal's collapsed phase headers carry each phase's damage, so five
 * ATTACKS rows no longer read as five copies of one row (critique pass 64).
 */
import { describe, expect, it } from '@jest/globals';

import type { CombatThreatPhase } from '@mechanics';
import { threatPhaseHeader } from '@/state/presenters/combat-encounter.engine';

function phase(index: number, damage: number[], extra: Partial<CombatThreatPhase> = {}): CombatThreatPhase {
    return {
        index,
        isFinalPhase: false,
        intentType: damage.some((d) => d > 0) ? 'damage' : 'pass',
        threatAction: { description: 'Strikes.', effects: damage.map((d) => ({ damage: d })) },
        ...extra,
    } as CombatThreatPhase;
}

describe('threatPhaseHeader', () => {
    it('puts the phase damage in the header and the spoken label', () => {
        expect(threatPhaseHeader(phase(2, [13]))).toEqual({
            text: 'PHASE 2 · ATTACKS · 13',
            a11y: 'Phase 2, ATTACKS, 13 damage',
        });
    });

    it('sums every damage effect on the phase', () => {
        expect(threatPhaseHeader(phase(3, [6, 4])).text).toBe('PHASE 3 · ATTACKS · 10');
    });

    it('collapsed headers differ as the damage rises phase to phase', () => {
        const texts = [phase(1, [10]), phase(2, [12]), phase(3, [14])].map((p) => threatPhaseHeader(p).text);
        expect(new Set(texts).size).toBe(3);
    });

    it('omits the figure when the phase deals no damage', () => {
        expect(threatPhaseHeader(phase(1, []))).toEqual({ text: 'PHASE 1 · WAITS', a11y: 'Phase 1, WAITS' });
    });

    it('omits the figure on a branch phase, whose face is only one fork', () => {
        const p = phase(4, [9], { branch: {} as CombatThreatPhase['branch'] });
        expect(threatPhaseHeader(p).text).toBe('PHASE 4 · ATTACKS');
    });
});

describe('threatPhaseHeader for a phases foe (EN1c)', () => {
    const move = (kind: 'attack' | 'danger', name: string): CombatThreatPhase => phase(2, [13], {
        intentType: kind, enemyMove: { phase: 1, step: 0, danger: kind === 'danger', name, kind },
    });

    it('prints the kind and the name, never the damage', () => {
        expect(threatPhaseHeader(move('attack', 'Peck'))).toEqual({
            text: 'PHASE 2 · ATTACK · Peck', a11y: 'Phase 2, ATTACK, Peck',
        });
    });

    it('leaves a DANGER unnamed until it has been seen', () => {
        expect(threatPhaseHeader(move('danger', 'Toll')).text).toBe('PHASE 2 · DANGER');
        expect(threatPhaseHeader(move('danger', 'Toll'), new Set(['Toll'])).text).toBe('PHASE 2 · DANGER · Toll');
    });
});
