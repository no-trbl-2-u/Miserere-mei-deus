/**
 * Hermetic e2e tests for persistence schema migrations.
 *
 * Covers the v1 → v2 migration that validates the save's base stats, and
 * the v2 → v3 migration, a pass-through for any object state.
 */

import {
    createNewGameState,
    GAME_STATE_VERSION,
} from '@mechanics';
import { unwrap, wrap, CURRENT_SCHEMA_VERSION, DEFAULT_MIGRATIONS, type StoredEnvelope } from '../migrations';

describe('migrations.engine', () => {
    describe('v1 → v2 migration', () => {
        const mockBaseStats = {
            heart: 10,
            body: 12,
            mind: 8,
        };

        const mockV1GameState = {
            player: {
                name: 'Test Player',
                level: 1,
                experience: 0,
                experienceToNextLevel: 100,
                baseStats: mockBaseStats,
                inventory: [],
                currency: 0,
                effects: [],
                knownCards: [],
                equippedSkills: [],
            },
            combat: null,
            world: {
                currentMap: 'coastal',
                currentNode: 'start',
                visitedNodes: ['start'],
                unlockedMaps: ['coastal'],
                completedMaps: [],
                questLog: {},
                uniqueEvents: {},
            },
            version: '0.4.0',
        };

        test('passes a valid v1 save through unchanged', () => {
            const v1Envelope: StoredEnvelope = {
                schemaVersion: 1,
                state: mockV1GameState,
            };

            const migrated = unwrap(v1Envelope) as unknown as Record<string, unknown>;

            expect(migrated.player).toEqual(mockV1GameState.player);
        });

        test('does not add the retired derivedStats / nonCombatStats keys', () => {
            const v1Envelope: StoredEnvelope = {
                schemaVersion: 1,
                state: mockV1GameState,
            };

            const migrated = unwrap(v1Envelope) as unknown as { player: Record<string, unknown> };

            expect(migrated.player).not.toHaveProperty('derivedStats');
            expect(migrated.player).not.toHaveProperty('nonCombatStats');
        });

        test('throws on malformed player data', () => {
            const malformedEnvelope: StoredEnvelope = {
                schemaVersion: 1,
                state: {
                    player: null, // Missing player
                },
            };

            expect(() => unwrap(malformedEnvelope)).toThrow('Migration v1→v2: missing player.baseStats');
        });

        test('throws on missing baseStats', () => {
            const malformedEnvelope: StoredEnvelope = {
                schemaVersion: 1,
                state: {
                    player: {
                        name: 'Test',
                        // missing baseStats
                    },
                },
            };

            expect(() => unwrap(malformedEnvelope)).toThrow('Migration v1→v2: missing player.baseStats');
        });

        test('throws on invalid baseStats structure', () => {
            const malformedEnvelope: StoredEnvelope = {
                schemaVersion: 1,
                state: {
                    player: {
                        baseStats: {
                            heart: 'invalid', // Should be number
                            body: 10,
                            mind: 10,
                        },
                    },
                },
            };

            expect(() => unwrap(malformedEnvelope)).toThrow('Migration v1→v2: invalid baseStats structure');
        });

        test('v2 envelope migrates to v3 with the player untouched', () => {
            const v2State = {
                ...mockV1GameState,
                player: { ...mockV1GameState.player },
            };

            const v2Envelope: StoredEnvelope = {
                schemaVersion: 2,
                state: v2State,
            };

            const result = unwrap(v2Envelope) as unknown as Record<string, unknown>;

            expect(Object.keys(result).sort()).toEqual(Object.keys(v2State).sort());
            expect((result as { player: unknown }).player).toEqual(v2State.player);
        });
    });

    describe('v2 → v3 migration (pass-through since the alignment grid was removed, D39)', () => {
        test('adds nothing to the save', () => {
            const v2State = { player: { name: 'Pilgrim' } };
            const result = unwrap({ schemaVersion: 2, state: v2State }) as unknown as Record<string, unknown>;

            expect(result).toEqual({ player: { name: 'Pilgrim' } });
        });

        test('rejects non-object state', () => {
            const envelope: StoredEnvelope = { schemaVersion: 2, state: null };
            expect(() => unwrap(envelope)).toThrow('Migration v2→v3: invalid state object');
        });
    });

    describe('engine migration delegation (engine owns GameState versioning)', () => {
        test('an engine-shaped save below GAME_STATE_VERSION is rejected (old-save migration was dropped)', () => {
            // A save older than the engine's oldest migration hop throws,
            // surfacing to the host so it can start a fresh game.
            const current = createNewGameState() as unknown as Record<string, unknown>;
            const stale = { ...current, version: 9 };

            expect(() =>
                unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: stale }),
            ).toThrow(/not supported/);
        });

        test('a current-version engine save passes through untouched', () => {
            const current = createNewGameState();
            const result = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: current });

            expect(result.version).toBe(GAME_STATE_VERSION);
        });

        test('a v25 engine save rides the engine hop to the current version (T6 / D39)', () => {
            const current = createNewGameState() as unknown as Record<string, unknown>;
            const v25 = { ...current, version: 25 };

            const result = unwrap({ schemaVersion: CURRENT_SCHEMA_VERSION, state: v25 });

            // The hops chain from v25 to the current version:
            // v26: the alignment grid / GRACE meter strip;
            // v27: the deleted-foe re-point hop;
            // v28: the Act 1 relocation hop;
            // v29: the fishing-village / goodwill purge hop;
            // v30: the deleted-consumable purge hop;
            // v31: the hazard token / hex flag hop;
            // v32: the deleted hazard deck card hop;
            // v33: the region-consequences slice hop;
            // v34: the parked world's content hop;
            // v35: the deleted relic hop;
            // v36: the XP curve hop; v37: the level-20 curve hop;
            // v38: the Brine Hag to Green Jelly rename hop;
            // v39: the relic slot hop.
            expect(GAME_STATE_VERSION).toBe(39);
            expect(result.version).toBe(GAME_STATE_VERSION);
        });
    });

    describe('migration infrastructure', () => {
        test('current schema version is 3', () => {
            expect(CURRENT_SCHEMA_VERSION).toBe(3);
        });

        test('DEFAULT_MIGRATIONS contains v1→v2 migration', () => {
            expect(DEFAULT_MIGRATIONS[1]).toBeDefined();
            expect(typeof DEFAULT_MIGRATIONS[1]).toBe('function');
        });

        test('DEFAULT_MIGRATIONS contains v2→v3 migration', () => {
            expect(DEFAULT_MIGRATIONS[2]).toBeDefined();
            expect(typeof DEFAULT_MIGRATIONS[2]).toBe('function');
        });

        test('wrap creates envelope with current schema version', () => {
            const mockState = {} as any;
            const envelope = wrap(mockState);

            expect(envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
            expect(envelope.state).toBe(mockState);
        });
    });

    describe('every load drops card ids the library no longer holds (B4 F2)', () => {
        it('cleans a current-version save that still names purged cards', () => {
            const fresh = createNewGameState();
            const state = {
                ...fresh,
                player: { ...fresh.player, knownCards: ['grey-strike', 'purged-card'], combatRewardCards: ['gone-card', 'grey-word'] },
            };
            const loaded = unwrap(wrap(state));
            expect(loaded.version).toBe(GAME_STATE_VERSION);
            expect(loaded.player.knownCards).toEqual(['grey-strike']);
            expect(loaded.player.combatRewardCards).toEqual(['grey-word']);
        });
    });

    describe('every load drops the flags no code reads', () => {
        it('cleans a current-version save that still carries the tutorial done-flags', () => {
            const fresh = createNewGameState();
            const state = {
                ...fresh,
                flags: [
                    'combat-tutorial-done', 'hazard-scar:5', 'hazard-tutorial-done',
                    'blacksmith-tutorial-done', 'night-watch-tutorial-done', 'night-keepsake:kept',
                ],
            };
            const loaded = unwrap(wrap(state));
            expect(loaded.version).toBe(GAME_STATE_VERSION);
            expect(loaded.flags).toEqual(['hazard-scar:5', 'night-keepsake:kept']);
        });

        it('leaves a save without them untouched', () => {
            const fresh = createNewGameState();
            const state = { ...fresh, flags: ['hazard-scar:5'] };
            expect(unwrap(wrap(state)).flags).toEqual(['hazard-scar:5']);
        });
    });
});
