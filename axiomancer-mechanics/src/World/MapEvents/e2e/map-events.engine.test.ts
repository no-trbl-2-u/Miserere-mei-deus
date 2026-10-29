/**
 * Hermetic e2e — MapEvents engine.
 *
 * Covers each of the eight kinds via `resolveMapEvent`, plus an
 * integration walkthrough that drives discover → reveal → roll →
 * resolve → consumed-noop.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    resolveMapEvent,
    registerMapEventPool,
    setDefaultMapEventPool,
    _clearMapEventPoolRegistry,
} from '../resolve-map-event';
import { mockSequentialRng, restoreOriginalRng } from '../../../test-utils/rng';
import { createStartingWorld } from '../../index';
import { createNewGameState } from '../../../Game/game.reducer';
import type { GameState } from '../../../Game/types';
import type { MapEventPool } from '../types';
import type { Quest } from '../../types';
import type { QuestName } from '../../quest.library';

// Fabricated quest name for the reach-objective tests below. It is not part
// of the QuestName union (the quest engine only compares names), so cast once
// and reuse.
const REACH_BW2 = 'reach-bw2' as QuestName;

// Fabricated quest name for the collect-objective tests below.
const COLLECT_DRIFTWOOD = 'collect-driftwood' as QuestName;

function freshState(): GameState {
    return { ...createNewGameState(), world: createStartingWorld('breakwater') };
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

describe('resolveMapEvent — per-kind', () => {
    it('resolves an encounter event into an Encounter', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.encounter',
            entries: [{
                kind: 'encounter',
                weight: 1,
                payload: { kind: 'encounter', enemySlug: 'float-eye' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('encounter');
        if (result.event.kind === 'encounter') {
            expect(result.event.encounter.enemies).toHaveLength(1);
            expect(result.event.isBoss).toBe(false);
        }
    });

    it('resolves a rest event by healing the player', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        // Damage the player so heal is observable.
        const damaged: GameState = {
            ...before,
            player: { ...before.player, health: 5 },
        };
        const state = withPool(damaged, {
            id: 'pool.rest',
            entries: [{
                kind: 'rest', weight: 1,
                payload: { kind: 'rest', shelter: 'inn' },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        if (result.event.kind === 'rest') {
            expect(result.event.healed).toBeGreaterThan(0);
        }
        expect(result.state.player.health).toBeGreaterThan(5);
    });

    it('resolves a village event with merchants', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.village',
            entries: [{
                kind: 'village', weight: 1,
                payload: {
                    kind: 'village',
                    villageName: 'Salt Hollow',
                    merchants: [{ name: 'Briny Trader', isShopkeeper: true }],
                },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('village');
        if (result.event.kind === 'village') {
            expect(result.event.villageName).toBe('Salt Hollow');
            expect(result.event.merchants).toHaveLength(1);
        }
    });

    it('resolves a cutscene by surfacing its lines', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['The tide pulls back.', 'Something glitters.'] },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('cutscene');
        if (result.event.kind === 'cutscene') {
            expect(result.event.lines).toHaveLength(2);
        }
    });

    it('resolves a hazard event with damage', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startHp = before.player.health;
        const state = withPool(before, {
            id: 'pool.hazard',
            entries: [{
                kind: 'hazard', weight: 1,
                payload: { kind: 'hazard', damage: 3 },
            }],
        });
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('hazard');
        if (result.event.kind === 'hazard') {
            expect(result.event.damage).toBe(3);
        }
        expect(result.state.player.health).toBe(startHp - 3);
    });

    it('resolves a loot-cache by adding items and currency', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startCurrency = before.player.currency;
        const state = withPool(before, {
            id: 'pool.loot',
            entries: [{
                kind: 'loot-cache', weight: 1,
                payload: {
                    kind: 'loot-cache',
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
            expect(result.event.currency).toBe(12);
        }
        expect(result.state.player.currency).toBe(startCurrency + 12);
    });
});

describe('resolveMapEvent — discovery + one-shot', () => {
    it('reveals adjacent nodes after resolution', () => {
        mockSequentialRng(0.5);
        const before = freshState();
        const startId = before.world.currentMap.currentNode;
        expect(before.world.currentMap.discoveredNodes).toContain(startId);

        const state = withPool(before, {
            id: 'pool.tiny',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const result = resolveMapEvent(state);
        const map = result.state.world.currentMap;
        expect(map.consumedNodes).toContain(startId);
        expect(map.discoveredNodes.length).toBeGreaterThan(1);
    });

    it('returns { kind: "none" } on a consumed node', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene-only',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['Once.'] },
            }],
        });
        const first = resolveMapEvent(state);
        expect(first.event.kind).toBe('cutscene');

        // Second resolution against the same (now consumed) node.
        const second = resolveMapEvent(first.state);
        expect(second.event.kind).toBe('none');
    });

    it('returns { kind: "none" } when no pool is registered', () => {
        mockSequentialRng(0.5);
        const state = freshState();
        _clearMapEventPoolRegistry();
        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('none');
        // Discovery still advances even without a pool.
        expect(result.state.world.currentMap.consumedNodes).toContain(state.world.currentMap.currentNode);
    });
});

// ── resolveMapEvent unlocks adjacents into availableNodes ───────────────────

describe('resolveMapEvent — Phase 31 traversal fix', () => {
    it('moves resolved-node adjacents from lockedNodes into availableNodes', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const startId = state.world.currentMap.currentNode;
        const startNode = state.world.currentMap;

        // Before resolution: bw-w1's adjacent (bw-w2) is already available,
        // but bw-w3 is locked.
        expect(startNode.availableNodes).toContain('bw-w2');
        expect(startNode.lockedNodes).toContain('bw-w3');

        const afterW1 = resolveMapEvent(state).state.world.currentMap;
        expect(afterW1.consumedNodes).toContain(startId);
        // bw-w2 was already available — still there; no regression.
        expect(afterW1.availableNodes).toContain('bw-w2');
        // bw-w1's only adjacent is bw-w2, already available; bw-w3 is
        // two steps out (no new unlock from bw-w1 itself).
        expect(afterW1.lockedNodes).toContain('bw-w3');
    });

    it('unlocks the next-step adjacent when the player resolves the just-walked node', () => {
        mockSequentialRng(0.5);
        // Reach bw-w2 by moving (legal — bw-w2 is in initial availableNodes).
        let state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        state = { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: 'bw-w2' } } };

        // Before resolving bw-w2: bw-w3 is locked.
        expect(state.world.currentMap.lockedNodes).toContain('bw-w3');
        expect(state.world.currentMap.availableNodes).not.toContain('bw-w3');

        const afterW2 = resolveMapEvent(state).state.world.currentMap;

        // After resolving bw-w2: bw-w3 has moved from locked → available.
        expect(afterW2.availableNodes).toContain('bw-w3');
        expect(afterW2.lockedNodes).not.toContain('bw-w3');
    });

    it('idempotent — re-resolving a consumed node does not re-promote unlocked adjacents', () => {
        mockSequentialRng(0.5);
        const state = withPool(freshState(), {
            id: 'pool.cutscene',
            entries: [{
                kind: 'cutscene', weight: 1,
                payload: { kind: 'cutscene', lines: ['…'] },
            }],
        });
        const first = resolveMapEvent(state).state;
        const second = resolveMapEvent(first).state;
        expect(second.world.currentMap.availableNodes).toEqual(
            first.world.currentMap.availableNodes,
        );
    });

    it('still unlocks adjacents when no pool is registered for the node', () => {
        mockSequentialRng(0.5);
        const state = freshState();
        _clearMapEventPoolRegistry();
        // Move to bw-w2 first (legal — bw-w2 is already available; no pool needed
        // to move).
        const atW2 = { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, currentNode: 'bw-w2' } } };
        expect(atW2.world.currentMap.lockedNodes).toContain('bw-w3');
        const result = resolveMapEvent(atW2);
        expect(result.event.kind).toBe('none');
        // Discovery + traversal both advance even without a pool.
        expect(result.state.world.currentMap.availableNodes).toContain('bw-w3');
        expect(result.state.world.currentMap.lockedNodes).not.toContain('bw-w3');
    });
});

// ── `reach`-objective auto-advance via resolveMapEvent ──────────────────────

describe('resolveMapEvent — reach-objective auto-advance', () => {
    function seedReachQuest(state: GameState, targetNodeId: string): GameState {
        const reachQuest: Quest = {
            name: REACH_BW2,
            description: 'Arrive at bw-w2.',
            mapName: state.world.currentMap.name,
            objectives: [{
                id: 'arrive',
                type: 'reach' as const,
                description: 'Reach the target node.',
                target: targetNodeId,
                requiredCount: 1,
                currentCount: 0,
            }],
            reward: { kind: 'currency' as const, amount: 0 },
            status: 'active' as const,
        };
        return {
            ...state,
            quests: { ...state.quests, active: [...state.quests.active, reachQuest] },
        };
    }

    it('completes a reach quest when the player resolves the target node (no pool)', () => {
        const base = freshState();
        const atBw2 = { ...base, world: { ...base.world, currentMap: { ...base.world.currentMap, currentNode: 'bw-w2' } } };
        const state = seedReachQuest(atBw2, 'bw-w2');

        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('none');
        // Reach completed → quest moves from active to completed (single-objective).
        expect(result.state.quests.active.some(q => q.name === REACH_BW2)).toBe(false);
        expect(result.state.quests.completed).toContain('reach-bw2');
    });

    it('completes a reach quest alongside the pool-driven event handler', () => {
        mockSequentialRng(0.5);
        const base = withPool(freshState(), {
            id: 'pool.reach-test',
            entries: [{
                kind: 'rest',
                weight: 1,
                payload: { kind: 'rest', shelter: 'camp' },
            }],
        });
        const atBw2 = { ...base, world: { ...base.world, currentMap: { ...base.world.currentMap, currentNode: 'bw-w2' } } };
        const state = seedReachQuest(atBw2, 'bw-w2');

        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('rest');
        expect(result.state.quests.completed).toContain('reach-bw2');
    });

    it('is a silent no-op when no active reach objective targets this node', () => {
        const base = freshState();
        const atBw2 = { ...base, world: { ...base.world, currentMap: { ...base.world.currentMap, currentNode: 'bw-w2' } } };
        const state = seedReachQuest(atBw2, 'bw-m3'); // targets a different node

        const result = resolveMapEvent(state);
        // Quest stays active — bw-m3 wasn't reached.
        expect(result.state.quests.active.some(q => q.name === REACH_BW2)).toBe(true);
        expect(result.state.quests.completed).not.toContain('reach-bw2');
    });
});

// ── `collect`-objective auto-advance via resolveMapEvent ───────────────────
//
// Nothing advances a `collect` objective since the gathering kind was cut:
// a loot cache granting the very item leaves the objective where it was.

describe('resolveMapEvent — collect-objective auto-advance', () => {
    function seedCollectQuest(state: GameState, targetItemId: string, requiredCount = 1): GameState {
        const collectQuest: Quest = {
            name: COLLECT_DRIFTWOOD,
            description: 'Collect driftwood.',
            mapName: state.world.currentMap.name,
            objectives: [{
                id: 'collect',
                type: 'collect' as const,
                description: 'Collect the target item.',
                target: targetItemId,
                requiredCount,
                currentCount: 0,
            }],
            reward: { kind: 'currency' as const, amount: 0 },
            status: 'active' as const,
        };
        return {
            ...state,
            quests: { ...state.quests, active: [...state.quests.active, collectQuest] },
        };
    }

    it('is a no-op for a loot cache granting the target item', () => {
        mockSequentialRng(0.5);
        const base = withPool(freshState(), {
            id: 'pool.collect-noop-test',
            entries: [{
                kind: 'loot-cache', weight: 1,
                payload: {
                    kind: 'loot-cache',
                    items: [{ id: 'driftwood', name: 'driftwood', description: '', category: 'material', quantity: 1 }],
                },
            }],
        });
        const state = seedCollectQuest(base, 'driftwood');

        const result = resolveMapEvent(state);
        expect(result.event.kind).toBe('loot-cache');
        expect(result.state.quests.active.some(q => q.name === COLLECT_DRIFTWOOD)).toBe(true);
        expect(result.state.quests.completed).not.toContain('collect-driftwood');
    });
});
