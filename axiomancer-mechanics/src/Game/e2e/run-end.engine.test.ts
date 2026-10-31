/**
 * A run end drops the character (phase CH1h).
 *
 * A death while dying and a full reset leave the pre-run shell: no character,
 * the codex and rng kept, a fresh world, the run-over marker set. The next
 * run as a roster character starts at level 1 with its ten-card deck and the
 * codex entries unlocked before, and carries no marker. The dev
 * `keepCharacter: true` reset is unchanged.
 */

import { describe, it, expect } from 'vitest';

import { createGameStore } from '../store';
import { createNewGameState, gameReducer } from '../game.reducer';
import { resolveDeath, runOverState } from '../death';
import type { GameState } from '../types';
import type { PersistenceAdapter } from '../persistence/types';
import { CHARACTER_ROSTER, characterDeck } from '../../Character/roster';
import { Player } from '../../Character/characters.mock';

const nullAdapter: PersistenceAdapter = { load: () => null, save: () => undefined };

const CHOSEN = CHARACTER_ROSTER[0]!;

function chosenRun(): GameState {
    return {
        ...createNewGameState({ characterId: CHOSEN.id }),
        codex: { unlockedEntries: ['entry-a', 'entry-b'] },
        rngState: 4242,
    };
}

describe('the run-over state', () => {
    it('a death while dying gives the shell: no character, codex and rng kept, marker set', () => {
        const run = { ...chosenRun(), dying: true as const, flags: ['f'] };
        const { state, outcome } = resolveDeath(run, 'fight');
        expect(outcome).toBe('run-over');
        expect(state.runOver).toBe(true);
        expect(state.player.characterId).toBeUndefined();
        expect(state.player.equipment.relics).toEqual([]);
        expect(state.player.level).toBe(1);
        expect(state.codex).toEqual(run.codex);
        expect(state.rngState).toBe(4242);
        expect(state.flags).toEqual([]);
        expect(state.quests).toEqual(createNewGameState().quests);
        expect(state.dying).toBeUndefined();
        expect(state.runId).not.toBe(run.runId);
    });

    it('RESET_RUN keepCharacter: false is the same state, never the character again', () => {
        const run = chosenRun();
        const next = gameReducer(run, { type: 'RESET_RUN', payload: { keepCharacter: false } });
        expect(next.runOver).toBe(true);
        expect(next.player.characterId).toBeUndefined();
        expect(next.codex).toEqual(run.codex);
        expect(next.rngState).toBe(4242);
        expect(next.runId).not.toBe(run.runId);
        expect(next.version).toBe(run.version);
    });

    it('the store drops the encounter and labyrinth the old run held', () => {
        const store = createGameStore(nullAdapter, { player: Player });
        const next = store.getState().resetRun({ keepCharacter: false });
        expect(next.runOver).toBe(true);
        expect(store.getState().currentEncounter).toBeUndefined();
        expect(store.getState().labyrinth).toBeUndefined();
    });

    it('runOverState on a state with a labyrinth drops it', () => {
        const run = { ...chosenRun(), labyrinth: {} as GameState['labyrinth'] };
        expect(runOverState(run).labyrinth).toBeUndefined();
    });
});

describe('the new-run entry', () => {
    it('as the Chosen from a run over: level 1, its deck, the relic worn, the codex kept, no marker', () => {
        const over = runOverState(chosenRun());
        const next = createNewGameState({ characterId: CHOSEN.id, codex: over.codex });
        expect(next.runOver).toBeUndefined();
        expect(next.player.level).toBe(1);
        expect(next.player.characterId).toBe(CHOSEN.id);
        expect(next.player.knownCards).toEqual(characterDeck(CHOSEN));
        expect(next.player.knownCards).toHaveLength(10);
        expect(next.player.equipment.relics.map(e => e.id)).toEqual([CHOSEN.startingRelicId]);
        expect(next.codex.unlockedEntries).toEqual(['entry-a', 'entry-b']);
    });

    it('with no codex opens an empty one', () => {
        expect(createNewGameState({ characterId: CHOSEN.id }).codex).toEqual({ unlockedEntries: [] });
    });
});

describe('the dev reset', () => {
    it('keepCharacter: true still keeps the character and refills VITAE', () => {
        const run = chosenRun();
        const hurt = { ...run, player: { ...run.player, health: 1 } };
        const next = gameReducer(hurt, { type: 'RESET_RUN', payload: { keepCharacter: true } });
        expect(next.player.characterId).toBe(CHOSEN.id);
        expect(next.player.health).toBe(next.player.maxHealth);
        expect(next.runOver).toBeUndefined();
    });
});
