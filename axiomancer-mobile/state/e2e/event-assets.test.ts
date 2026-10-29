/**
 * Hermetic E2E Tests — Event art slug mapper (engine 0.7.0 surface).
 *
 * Exhaustively pins `ResolvedEvent.kind` -> `EventArtSlug`. Pure
 * unit-shape: no store, no engine call.
 */

import { describe, it, expect } from '@jest/globals';
import type { ResolvedEvent } from '@mechanics';

import {
    EVENT_ART_SLUGS,
    defaultBodyForEvent,
    selectEventArtSlug,
} from '@/state/presenters/event-assets';

describe('selectEventArtSlug', () => {
    it('maps non-boss encounter to "encounter"', () => {
        const ev: ResolvedEvent = {
            kind: 'encounter',
            encounter: { enemies: [{ name: 'x' }], origin: 'breakwater:bw-2' } as never,
            isBoss: false,
        };
        expect(selectEventArtSlug(ev)).toBe('encounter');
    });

    it('maps boss encounter to "boss"', () => {
        const ev: ResolvedEvent = {
            kind: 'encounter',
            encounter: { enemies: [{ name: 'x' }], origin: 'breakwater:bw-2' } as never,
            isBoss: true,
        };
        expect(selectEventArtSlug(ev)).toBe('boss');
    });

    it('maps minigame-intercepted kinds (rest / loot-cache) to the generic fallback — Phase 137', () => {
        expect(selectEventArtSlug({ kind: 'rest', healed: 5, shelter: 'camp' })).toBe('interaction-generic');
        expect(selectEventArtSlug({ kind: 'loot-cache', items: [], currency: 0 })).toBe('interaction-generic');
    });

    it('maps village to "village"', () => {
        expect(selectEventArtSlug({ kind: 'village', villageName: 'X', merchants: [] })).toBe('village');
    });

    it('maps cutscene to "cutscene"', () => {
        expect(selectEventArtSlug({ kind: 'cutscene', lines: [] })).toBe('cutscene');
    });

    it('maps hazard to the generic fallback (minigame-intercepted — Phase 137)', () => {
        expect(selectEventArtSlug({ kind: 'hazard', effects: [], damage: 0 })).toBe('interaction-generic');
    });

    it('maps travel to its own art slug when it names a drawn one, else the generic figure (phase NK1d)', () => {
        const base = { kind: 'travel' as const, nodeId: 'n', destination: { node: 'm' }, prompt: 'p', open: true };
        expect(selectEventArtSlug({ ...base, art: 'cutscene' })).toBe('cutscene');
        expect(selectEventArtSlug({ ...base, art: 'not-drawn-yet' })).toBe('interaction-generic');
        expect(selectEventArtSlug(base)).toBe('interaction-generic');
    });

    it('maps none to "interaction-generic" (defensive fallback)', () => {
        expect(selectEventArtSlug({ kind: 'none' })).toBe('interaction-generic');
    });

    it('every returned slug is a known EVENT_ART_SLUGS member', () => {
        const cases: ResolvedEvent[] = [
            { kind: 'encounter', encounter: { enemies: [{ name: 'x' }], origin: 'breakwater:bw-2' } as never, isBoss: false },
            { kind: 'encounter', encounter: { enemies: [{ name: 'x' }], origin: 'breakwater:bw-2' } as never, isBoss: true },
            { kind: 'rest', healed: 1, shelter: 'camp' },
            { kind: 'loot-cache', items: [], currency: 0 },
            { kind: 'village', villageName: 'X', merchants: [] },
            { kind: 'cutscene', lines: [] },
            { kind: 'hazard', effects: [], damage: 0 },
            { kind: 'none' },
        ];
        for (const ev of cases) {
            expect(EVENT_ART_SLUGS).toContain(selectEventArtSlug(ev));
        }
    });
});

describe('defaultBodyForEvent', () => {
    it('returns a non-empty string for kinds that need a default', () => {
        expect(defaultBodyForEvent({ kind: 'rest', healed: 1, shelter: 'camp' })).not.toBe('');
        expect(defaultBodyForEvent({ kind: 'loot-cache', items: [], currency: 0 })).not.toBe('');
        expect(defaultBodyForEvent({ kind: 'village', villageName: 'X', merchants: [] })).not.toBe('');
    });

    it('returns empty string for cutscene (caller provides lines)', () => {
        expect(defaultBodyForEvent({ kind: 'cutscene', lines: [] })).toBe('');
    });

    it('returns empty string for none', () => {
        expect(defaultBodyForEvent({ kind: 'none' })).toBe('');
    });
});
