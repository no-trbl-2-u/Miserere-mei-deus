import { describe, expect, it } from 'vitest';

import { EnemyLibrary } from '../Enemy/enemy.library';
import { getThreatSequence } from './combat.threat';

describe('threat telegraph copy', () => {
    it('prints the hit as "N damage", never "+N", which the game reads as a gain', () => {
        for (const enemy of EnemyLibrary) {
            for (const phase of getThreatSequence(enemy)) {
                const faces = phase.branch ? [phase.branch.then, phase.branch.else] : [phase];
                // A `phases` move prints T's own line ("Long Look: 6 damage, +2 for ..."),
                // where a "+N" is a bonus on top of the hit, not a gain.
                if (phase.enemyMove) {
                    expect(phase.threatAction.description, enemy.id).toMatch(new RegExp(`^${phase.enemyMove.name}: `));
                    continue;
                }
                for (const face of faces) {
                    const { description, effects } = face.threatAction;
                    const damage = effects.find(e => e.damage !== undefined)?.damage;
                    expect(description, enemy.id).not.toMatch(/\+\d+ damage/);
                    if (damage) expect(description, enemy.id).toContain(`(${damage} damage`);
                }
            }
        }
    });
});
