/**
 * Hermetic E2E — the Show the Engine legibility sweep. Covers the
 * mechanics-side additions: the wall-math projection and its deny verdict.
 * Seeded RNG only; no disk / network / TTY.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import type { ActiveEffect } from '../../Effects/types';
import {
    initializeCombatEncounter, projectIncomingThreat,
} from '../combat.engine';

afterEach(() => { vi.restoreAllMocks(); });

function makePlayer(cards: string[]): Character {
    const p = deepClone(Player);
    p.knownCards = cards.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 200; p.maxHealth = 200; p.effects = [];
    return p;
}

function makeEnemy(hp: number, stance: 'heart' | 'body' | 'mind' = 'mind', effects: ActiveEffect[] = []): Enemy {
    // The Float-Eye's body without its HP phases: a dummy on the generated sequence.
    const e: Enemy = { ...deepClone(FloatEye), phases: undefined };
    e.id = 'enemy-test-dummy';
    e.health = hp; e.maxHealth = hp; e.effects = effects;
    e.baseStats = { heart: stance === 'heart' ? 6 : 2, body: stance === 'body' ? 6 : 2, mind: stance === 'mind' ? 6 : 2 };
    return e;
}

const PETRIFY: ActiveEffect = { effectId: 'debuff_petrify', remainingDuration: 1, intensity: 1, appliedAt: 0, tier: 3 };
const QUARTER: ActiveEffect = { effectId: 'debuff_quarter', remainingDuration: 2, intensity: 1, appliedAt: 0, tier: 2 };

describe('projectIncomingThreat.willDeny', () => {
    it('reports willDeny=true when a hard control (PETRIFY) skips the turn', () => {
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', [PETRIFY]), undefined, 7);
        const projection = projectIncomingThreat(base);
        expect(projection.willDeny).toBe(true);
        expect(projection.projectedDamage).toBe(0);
    });

    it('reports willDeny=false with no denial path active', () => {
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', []), undefined, 7);
        expect(projectIncomingThreat(base).willDeny).toBe(false);
    });
});

describe('projectIncomingThreat — wall-math readout (phase 28)', () => {
    it('nets the projected hit against current guard/barrier', () => {
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', []), undefined, 7);
        const rawOnly = projectIncomingThreat(base);
        expect(rawOnly.willDeny).toBe(false);
        expect(rawOnly.netDamage).toBeLessThanOrEqual(rawOnly.projectedDamage);

        const guarded = { ...base, guard: 9999 };
        const withGuard = projectIncomingThreat(guarded);
        expect(withGuard.netDamage).toBe(0);
    });

    it('projects 0 net damage when the turn will be denied', () => {
        const denied = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', [PETRIFY]), undefined, 7);
        const projection = projectIncomingThreat(denied);
        expect(projection.willDeny).toBe(true);
        expect(projection.projectedDamage).toBe(0);
        expect(projection.netDamage).toBe(0);
    });

    it('projected damage drops once a live modifier (QUARTER on the foe) is in play', () => {
        const base = initializeCombatEncounter(makePlayer([]), makeEnemy(300, 'mind', []), undefined, 7);
        const baseline = projectIncomingThreat(base);
        const quartered = { ...base, enemy: { ...base.enemy, effects: [QUARTER] } };
        const projection = projectIncomingThreat(quartered);
        expect(projection.willDeny).toBe(false);
        expect(projection.rawDamage).toBe(baseline.rawDamage); // the raw face value is unmodified…
        expect(projection.projectedDamage).toBeLessThan(baseline.projectedDamage); // …but the live projection isn't
    });

    it('a phases foe projects its opening hit and is denied by PETRIFY like any other', () => {
        const foe = (effects: ActiveEffect[]): Enemy => ({ ...makeEnemy(300, 'mind', effects), phases: FloatEye.phases });
        const open = projectIncomingThreat(initializeCombatEncounter(makePlayer([]), foe([]), undefined, 7));
        expect(open.willDeny).toBe(false);
        expect(open.rawDamage).toBeGreaterThan(0);
        expect(open.netDamage).toBeLessThanOrEqual(open.projectedDamage);
        const denied = projectIncomingThreat(initializeCombatEncounter(makePlayer([]), foe([PETRIFY]), undefined, 7));
        expect(denied.willDeny).toBe(true);
        expect(denied.projectedDamage).toBe(0);
        expect(denied.netDamage).toBe(0);
    });
});
