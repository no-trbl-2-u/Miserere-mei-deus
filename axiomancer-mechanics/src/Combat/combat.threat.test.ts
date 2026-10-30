import { describe, expect, it } from 'vitest';

import { EnemyLibrary } from '../Enemy/enemy.library';
import { getThreatSequence } from './combat.threat';

describe('threat telegraph copy', () => {
    it('prints the hit as "N damage", never "+N", which the game reads as a gain', () => {
        for (const enemy of EnemyLibrary) {
            // A `phases` foe prints T's own line ("Long Look: 6 damage, +2 for ..."),
            // where a "+N" is a bonus on top of the hit, not a gain; the test below pins it.
            if (enemy.phases) continue;
            for (const phase of getThreatSequence(enemy)) {
                const faces = phase.branch ? [phase.branch.then, phase.branch.else] : [phase];
                for (const face of faces) {
                    const { description, effects } = face.threatAction;
                    const damage = effects.find(e => e.damage !== undefined)?.damage;
                    expect(description, enemy.id).not.toMatch(/\+\d+ damage/);
                    if (damage) expect(description, enemy.id).toContain(`(${damage} damage`);
                }
            }
        }
    });

    it('prints each move of a phases foe as its own "Name: text" line, in the authored order', () => {
        const phased = EnemyLibrary.filter(e => e.phases);
        expect(phased.length).toBeGreaterThan(0);
        for (const enemy of phased) {
            // The sequence is the opening loop, then each later phase's DANGER and loop.
            const authored = enemy.phases!.flatMap((p, i) => [...(i > 0 && p.danger ? [p.danger] : []), ...p.moves]);
            const seq = getThreatSequence(enemy);
            expect(seq.length, enemy.id).toBe(authored.length);
            seq.forEach((phase, i) => {
                // Unconditional: every entry carries its move, so the line cannot go unchecked.
                expect(phase.enemyMove, `${enemy.id} #${i}`).toBeDefined();
                expect(phase.enemyMove!.name, `${enemy.id} #${i}`).toBe(authored[i].name);
                expect(phase.threatAction.description, `${enemy.id} #${i}`).toBe(`${authored[i].name}: ${authored[i].text}`);
            });
        }
    });
});
