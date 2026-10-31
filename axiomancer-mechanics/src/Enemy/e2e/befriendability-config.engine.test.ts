/**
 * `BefriendabilityConfig` hermetic coverage.
 *
 * The config's one axis is `hpGate`, read by `befriendHpGateOpen`
 * (`Enemy/befriend.ts`) — the gate The Open Hand checks before a befriend
 * lands.
 */

import { describe, it, expect } from 'vitest';
import { BEFRIEND_TUNING, befriendHpGateOpen } from '../befriend';
import type { BefriendabilityConfig } from '../types';

function foe(config: BefriendabilityConfig | undefined, health: number, maxHealth = 100) {
    return { befriendabilityConfig: config, health, maxHealth };
}

describe('befriendHpGateOpen', () => {
    it('a foe with no config uses the default gate', () => {
        expect(befriendHpGateOpen(foe(undefined, 100))).toBe(false);
        expect(befriendHpGateOpen(foe(undefined, 100 * BEFRIEND_TUNING.defaultHpGate))).toBe(true);
    });

    it('a config with no hpGate uses the default gate', () => {
        expect(befriendHpGateOpen(foe({}, 100))).toBe(false);
        expect(befriendHpGateOpen(foe({}, 30))).toBe(true);
    });

    it('opens at or below the gate fraction and stays shut above it', () => {
        const config: BefriendabilityConfig = { hpGate: { belowPct: 0.3 } };
        expect(befriendHpGateOpen(foe(config, 31))).toBe(false);
        expect(befriendHpGateOpen(foe(config, 30))).toBe(true);
        expect(befriendHpGateOpen(foe(config, 10))).toBe(true);
    });

    it('re-shuts when the foe heals back above the gate (a pure snapshot)', () => {
        const config: BefriendabilityConfig = { hpGate: { belowPct: 0.5 } };
        expect(befriendHpGateOpen(foe(config, 40))).toBe(true);
        expect(befriendHpGateOpen(foe(config, 60))).toBe(false);
    });

    it('is shut for a foe with no max VITAE', () => {
        expect(befriendHpGateOpen(foe({ hpGate: { belowPct: 0.5 } }, 0, 0))).toBe(false);
    });
});
