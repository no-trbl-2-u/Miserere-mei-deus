/**
 * The defeat ledger (EN1b, A6): END_COMBAT records the lead foe's slug on
 * `codex.defeatedEnemies` for a win or a befriend, de-duped, and nothing
 * else (defeat and flee record nothing).
 */
import { describe, it, expect } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createNewGameState } from '../game.reducer';
import { defeatedEnemies, enemySlugOf, hasDefeatedEnemy } from '../defeat-ledger';
import { FloatEye, GreenJelly, DeathBeholder } from '../../Enemy/enemy.library';

describe('EN1b — the defeat ledger', () => {
    it('a new game records none beaten', () => {
        const state = createNewGameState();
        expect(defeatedEnemies(state)).toEqual([]);
        expect(hasDefeatedEnemy(state, 'float-eye')).toBe(false);
    });

    it('a win adds the foe slug', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory');
        expect(store.getState().codex.defeatedEnemies).toEqual(['float-eye']);
        expect(hasDefeatedEnemy(store.getState(), 'float-eye')).toBe(true);
    });

    it('a befriend adds the foe slug', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(GreenJelly);
        store.getState().endCombat('friendship');
        expect(store.getState().codex.defeatedEnemies).toEqual(['green-jelly']);
        // The befriend codex unlock is untouched by the ledger.
        expect(store.getState().codex.unlockedEntries).toContain('codex-green-jelly');
    });

    it('beating the same foe twice records it once; a second foe appends', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory');
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory');
        expect(store.getState().codex.defeatedEnemies).toEqual(['float-eye']);
        store.getState().startCombat(DeathBeholder);
        store.getState().endCombat('victory');
        expect(store.getState().codex.defeatedEnemies).toEqual(['float-eye', 'death-beholder']);
    });

    it('a defeat or a flee records nothing', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('defeat');
        expect(defeatedEnemies(store.getState())).toEqual([]);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('flee');
        expect(defeatedEnemies(store.getState())).toEqual([]);
    });

    it('enemySlugOf reads the registry slug from the id, and nothing for a stranger', () => {
        expect(enemySlugOf(FloatEye)).toBe('float-eye');
        expect(enemySlugOf({ id: 'enemy-not-a-foe' })).toBeUndefined();
        expect(enemySlugOf({ id: 'float-eye' })).toBeUndefined();
    });
});
