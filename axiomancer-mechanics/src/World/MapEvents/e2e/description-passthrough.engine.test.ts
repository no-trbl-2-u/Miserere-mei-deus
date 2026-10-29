/**
 * MapEvent `description` passthrough — hermetic coverage.
 *
 * Every `MapEventPayload` kind but 'cutscene' (delivers its authored
 * prose via `lines`, already reaches the player) and the pool-roll
 * miss case ('none') threads its optional `description` straight onto
 * the matching `ResolvedEvent` discriminant. Before this phase the
 * text died at the resolver: `ResolvedEvent` declared no description
 * field on any variant, so mobile always fell back to its generic
 * per-kind placeholder regardless of what a node authored.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';

import {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    _clearMapEventPoolRegistry,
} from '../resolve-map-event';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import { resolveVillage } from '../handlers';
import type { GameState } from '../../../Game/types';
import type { MapEventPool, VillagePayload } from '../types';

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld() };
}

function withPool(state: GameState, pool: MapEventPool): GameState {
    _clearMapEventPoolRegistry();
    registerMapEventPool(pool);
    setDefaultMapEventPool(state.world.currentMap.continent, state.world.currentMap.name, pool.id);
    return state;
}

afterEach(() => {
    vi.restoreAllMocks();
    restoreOriginalRng();
    _clearMapEventPoolRegistry();
});

describe('resolveMapEvent — description passthrough', () => {
    it('carries the authored description onto an encounter event', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.description.encounter',
            entries: [{
                kind: 'encounter',
                weight: 1,
                payload: { kind: 'encounter', enemySlug: 'float-eye', description: 'A larva stirs in the cairn-mud.' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.description).toBe('A larva stirs in the cairn-mud.');
        }
    });

    it('carries the authored description onto a rest event', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.description.rest',
            entries: [{
                kind: 'rest', weight: 1,
                payload: { kind: 'rest', shelter: 'inn', description: 'A tended hearth, and a locked door.' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.description).toBe('A tended hearth, and a locked door.');
        }
    });

    it('carries the authored description onto a village event', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.description.village',
            entries: [{
                kind: 'village', weight: 1,
                payload: {
                    kind: 'village',
                    villageName: 'Salt Hollow',
                    description: 'Nets dry on every railing.',
                    merchants: [{ name: 'Briny Trader', isShopkeeper: true }],
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('village');
        if (result.event.kind === 'village') {
            expect(result.event.description).toBe('Nets dry on every railing.');
        }
    });

    it('carries the authored description onto a hazard event', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.description.hazard',
            entries: [{
                kind: 'hazard', weight: 1,
                payload: { kind: 'hazard', damage: 3, description: 'The floor gives way underfoot.' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('hazard');
        if (result.event.kind === 'hazard') {
            expect(result.event.description).toBe('The floor gives way underfoot.');
        }
    });

    it('carries the authored description onto a loot-cache event', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.description.loot',
            entries: [{
                kind: 'loot-cache', weight: 1,
                payload: {
                    kind: 'loot-cache',
                    description: 'A chest, half-buried in silt.',
                    items: [{
                        id: 'sea-pearl', name: 'Sea Pearl',
                        description: 'A small luminous bead.', category: 'material',
                        quantity: 1,
                    }],
                    currency: 12,
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('loot-cache');
        if (result.event.kind === 'loot-cache') {
            expect(result.event.description).toBe('A chest, half-buried in silt.');
        }
    });

});

describe('MapEvents description passthrough — direct handler coverage', () => {
    it('carries the authored description onto an anvil village event', () => {
        const payload: VillagePayload = {
            kind: 'village',
            villageName: 'Smithy',
            anvil: {},
            description: 'An anvil, still warm.',
        };
        const result = resolveVillage(createNewGameState(), payload);
        expect(result.event.kind).toBe('village');
        if (result.event.kind === 'village') {
            expect(result.event.description).toBe('An anvil, still warm.');
        }
    });
});
