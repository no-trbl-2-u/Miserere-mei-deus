/**
 * Every foe can be befriended (BUG1j A8) and a foe with no VITAE gate of its
 * own uses the default one (A9).
 */

import { describe, expect, it } from 'vitest';
import { EnemyLibrary, ENEMY_REGISTRY } from './enemy.library';
import { tuningFoes } from '../CLI/chapter1-enemies.cli';
import { BEFRIEND_TUNING, befriendHpGateOpen, isEnemyBefriendable } from './befriend';
import { SIGNATURE_SKILLS, signatureCastBlock } from '../Combat/combat.signature';

describe('isEnemyBefriendable', () => {
    it('holds for every foe in the library and the registry', () => {
        const all = [...EnemyLibrary, ...Object.values(ENEMY_REGISTRY)];
        expect(all.length).toBeGreaterThan(3);
        for (const e of all) expect(isEnemyBefriendable(e), e.id).toBe(true);
    });

    it('holds for every Chapter 1 foe and elite draw, and the Open Hand never refuses one as unbefriendable', () => {
        const foes = tuningFoes();
        expect(foes.length).toBeGreaterThan(5);
        for (const f of foes) {
            expect(isEnemyBefriendable(f.enemy), f.slug).toBe(true);
            const state = { conviction: 9, mercyChoiceActive: false, enemy: f.enemy, mercy: undefined } as never;
            const reason = signatureCastBlock(state, SIGNATURE_SKILLS['sig-disarming-plea']);
            expect(reason ?? '', f.slug).not.toMatch(/will not be befriended/);
        }
    });
});

describe('the default gate', () => {
    const foe = (health: number, hpGate?: { belowPct: number }) => ({
        health, maxHealth: 100, befriendabilityConfig: hpGate ? { hpGate } : undefined,
    });

    it('a foe with no gate opens at or below the tuning default only', () => {
        expect(BEFRIEND_TUNING.defaultHpGate).toBe(0.3);
        expect(befriendHpGateOpen(foe(31))).toBe(false);
        expect(befriendHpGateOpen(foe(30))).toBe(true);
    });

    it('a foe that declares its own gate keeps it', () => {
        expect(befriendHpGateOpen(foe(45, { belowPct: 0.5 }))).toBe(true);
        expect(befriendHpGateOpen(foe(55, { belowPct: 0.5 }))).toBe(false);
    });
});
