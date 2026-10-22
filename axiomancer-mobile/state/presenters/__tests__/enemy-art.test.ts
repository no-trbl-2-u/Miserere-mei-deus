/**
 * Unit tests — resolveEnemyArchetype (enemy id → drawing archetype).
 */

import { describe, expect, it } from '@jest/globals';

import { resolveEnemyArchetype } from '@/state/presenters/enemy-art';

describe('resolveEnemyArchetype', () => {
    it('honours explicit overrides (with or without the enemy- prefix)', () => {
        expect(resolveEnemyArchetype('float-eye')).toBe('eldritch');
        expect(resolveEnemyArchetype('enemy-float-eye')).toBe('eldritch');
    });

    it('matches by keyword for un-overridden ids', () => {
        expect(resolveEnemyArchetype('enemy-brine-hag')).toBe('zealot');
        expect(resolveEnemyArchetype('enemy-bilge-rat')).toBe('vermin');
        expect(resolveEnemyArchetype('enemy-reef-crab')).toBe('crustacean');
        expect(resolveEnemyArchetype('enemy-grey-wolf')).toBe('beast');
        expect(resolveEnemyArchetype('enemy-carrion-crow')).toBe('avian');
        expect(resolveEnemyArchetype('enemy-bramble-sprite')).toBe('flora');
        expect(resolveEnemyArchetype('enemy-drowned-wraith')).toBe('spirit');
        expect(resolveEnemyArchetype('enemy-faceless-one')).toBe('eldritch');
        expect(resolveEnemyArchetype('enemy-hill-giant')).toBe('tyrant');
    });

    it('routes a survivor with no keyword by its boss flag', () => {
        expect(resolveEnemyArchetype('enemy-death-beholder', true)).toBe('tyrant');
        expect(resolveEnemyArchetype('enemy-death-beholder', false)).toBe('generic');
    });

    it('falls back to generic for foes and tyrant for unknown bosses', () => {
        expect(resolveEnemyArchetype('enemy-mystery-thing', false)).toBe('generic');
        expect(resolveEnemyArchetype('enemy-mystery-thing', true)).toBe('tyrant');
        expect(resolveEnemyArchetype(null)).toBe('generic');
        expect(resolveEnemyArchetype(undefined, true)).toBe('tyrant');
    });
});
