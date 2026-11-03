/**
 * Codex / journal-entry surface.
 *
 * Pins the auto-firing unlock matrix on a spared foe + the
 * dispatchable `unlockCodexEntry` surface.
 */
import { describe, it, expect } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createNewGameState } from '../game.reducer';
import { GreenJelly, FloatEye } from '../../Enemy/enemy.library';

describe('Phase 73 — codex / journal-entry surface', () => {
    it('new game starts with an empty codex slice', () => {
        const state = createNewGameState();
        expect(state.codex).toEqual({ unlockedEntries: [] });
    });

    it('sparing GreenJelly unlocks codex entry + surfaces { id, title } on report', () => {
        const store = createGameStore(nullAdapter);
        // Drive the ending directly — combat resolution lives outside
        // the store now, so endCombat takes the resolved outcome.
        store.getState().startCombat(GreenJelly);
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        expect(report.outcome).toBe('victory');
        expect(store.getState().codex.unlockedEntries).toContain('codex-green-jelly');
        expect(report.journalEntryUnlocked).toEqual({
            id: 'codex-green-jelly',
            title: 'The Face Broker',
        });
    });

    it('unlockCodexEntry de-dupes on repeat dispatch', () => {
        const store = createGameStore(nullAdapter);
        store.getState().unlockCodexEntry('codex-test');
        store.getState().unlockCodexEntry('codex-test'); // repeat
        expect(store.getState().codex.unlockedEntries).toEqual(['codex-test']);
    });

    it('sparing FloatEye (no journalEntry) leaves codex empty + no report field', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        const report = store.getState().endCombat('victory', undefined, { spared: true });
        expect(report.spared).toBe(true);
        expect(store.getState().codex.unlockedEntries).toEqual([]);
        expect(report.journalEntryUnlocked).toBeUndefined();
    });

    it('a finish against GreenJelly does NOT unlock the codex entry', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        const report = store.getState().endCombat('victory');
        expect(report.outcome).toBe('victory');
        expect(store.getState().codex.unlockedEntries).toEqual([]);
        expect(report.journalEntryUnlocked).toBeUndefined();
    });

});
