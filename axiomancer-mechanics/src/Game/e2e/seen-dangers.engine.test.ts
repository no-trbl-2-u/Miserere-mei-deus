/**
 * The seen record (EN2a, A1): END_COMBAT writes the DANGER keys that fired in
 * the fight onto `codex.seenDangers`, de-duped, on every outcome; a save
 * without the field reads as none seen.
 */
import { describe, it, expect } from 'vitest';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { createNewGameState } from '../game.reducer';
import { dangerKey, firedDangerKeys, hasSeenDanger, seenDangerNames, seenDangers } from '../seen-dangers';
import { FloatEye } from '../../Enemy/enemy.library';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const KEY = dangerKey('float-eye', 'The Long Career');

describe('EN2a — the seen record', () => {
    it('a new game, and a save without the field, record none seen', () => {
        const state = createNewGameState();
        expect(seenDangers(state)).toEqual([]);
        const old = { ...state, codex: { ...state.codex, seenDangers: undefined } };
        expect(hasSeenDanger(old, 'float-eye', 'The Long Career')).toBe(false);
        expect(seenDangerNames(old, 'float-eye').size).toBe(0);
    });

    for (const outcome of ['victory', 'friendship', 'defeat', 'flee'] as const) {
        it(`a DANGER that fired is recorded on a ${outcome}`, () => {
            const store = createGameStore(nullAdapter);
            store.getState().startCombat(FloatEye);
            store.getState().endCombat(outcome, undefined, { seenDangers: [KEY] });
            expect(store.getState().codex.seenDangers).toEqual([KEY]);
            expect(hasSeenDanger(store.getState(), 'float-eye', 'The Long Career')).toBe(true);
            expect([...seenDangerNames(store.getState(), 'float-eye')]).toEqual(['The Long Career']);
        });
    }

    it('keys are de-duped across fights and within one report', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('flee', undefined, { seenDangers: [KEY, KEY] });
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory', undefined, { seenDangers: [KEY, dangerKey('float-eye', 'Other')] });
        expect(store.getState().codex.seenDangers).toEqual([KEY, dangerKey('float-eye', 'Other')]);
    });

    it('a fight with nothing fired records nothing', () => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat(FloatEye);
        store.getState().endCombat('victory');
        expect(seenDangers(store.getState())).toEqual([]);
    });

    it('firedDangerKeys reads the DANGERs in the log, once each, and no other move', () => {
        const mv = (name: string, kind: 'danger' | 'attack') => ({ enemyMove: { phase: 0, step: 0, danger: kind === 'danger', name, kind } });
        const state = {
            enemy: FloatEye,
            threatPhases: [mv('Look', 'attack'), mv('The Long Career', 'danger')],
            log: [
                { kind: 'threat-fired', phaseIndex: 1, description: '', effects: [] },
                { kind: 'threat-fired', phaseIndex: 2, description: '', effects: [] },
                { kind: 'threat-fired', phaseIndex: 2, description: '', effects: [] },
            ],
        } as unknown as CombatEncounterState;
        expect(firedDangerKeys(state)).toEqual([KEY]);
    });
});
