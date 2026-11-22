// guard-test: pins the version refusal T sees on an old save (mutation survivor game.migrate.ts:44 left by #1080), so it passes on the parent by design
/**
 * `migrate` refuses a save from another version with the line the player
 * reads: the message is the behaviour here, so its text is pinned.
 */

import { describe, it, expect } from 'vitest';

import { migrate, dropCutNodes, dropRetiredMapFields } from './game.migrate';
import { GAME_STATE_VERSION, createNewGameState } from './game.reducer';
import { defeatedEnemies } from './defeat-ledger';
import type { BlockedRoute, MapState } from '../World/types';
import type { MapName } from '../World/map.library';

describe('migrate refuses a save from another version', () => {
    it('names both versions and tells the player to start a new game', () => {
        expect(() => migrate({}, GAME_STATE_VERSION - 1)).toThrow(
            `migrate: save version ${GAME_STATE_VERSION - 1} is not supported (runtime is ${GAME_STATE_VERSION}); ` +
            'saves made before the new Breakwater are not migrated — delete it and start a new game.',
        );
    });

    it('refuses a payload that is not an object before reading its version', () => {
        expect(() => migrate(null, GAME_STATE_VERSION)).toThrow('migrate: invalid save payload (got object).');
    });
});

describe('the optional defeat ledger (EN1b)', () => {
    it('a save written before it loads at the current version and reads as none beaten', () => {
        const old = createNewGameState();
        const { defeatedEnemies: _drop, ...codex } = old.codex;
        const loaded = migrate({ ...old, codex }, GAME_STATE_VERSION);
        expect(loaded.codex.defeatedEnemies).toBeUndefined();
        expect(defeatedEnemies(loaded)).toEqual([]);
    });

    it('a save that carries the ledger keeps it through the load', () => {
        const state = createNewGameState();
        const saved = { ...state, codex: { ...state.codex, defeatedEnemies: ['float-eye' as const] } };
        expect(defeatedEnemies(migrate(saved, GAME_STATE_VERSION))).toEqual(['float-eye']);
    });
});

describe('dropCutNodes: a save naming the cut mountain path (bw-p2)', () => {
    const onPass = () => {
        const state = createNewGameState();
        const map = state.world.currentMap;
        return {
            ...state,
            world: {
                ...state.world,
                currentMap: {
                    ...map,
                    currentNode: 'bw-p2',
                    arrivedFrom: 'bw-p1',
                    completedNodes: ['bw-w1', 'bw-w2', 'bw-m1', 'bw-p1', 'bw-p2'],
                    discoveredNodes: ['bw-p1', 'bw-p2', 'bw-p3'],
                    consumedNodes: ['bw-p2'],
                },
            },
        };
    };

    it('moves a player standing on it back to the foothills and drops the id everywhere', () => {
        const map = dropCutNodes(onPass()).world.currentMap;
        expect(map.currentNode).toBe('bw-p1');
        expect(map.completedNodes).toEqual(['bw-w1', 'bw-w2', 'bw-m1', 'bw-p1']);
        expect(map.discoveredNodes).toEqual(['bw-p1', 'bw-p3']);
        expect(map.consumedNodes).toEqual([]);
    });

    it('returns the state itself when the save never named it', () => {
        const state = createNewGameState();
        expect(dropCutNodes(state)).toBe(state);
    });

    const route = (from: string, to: string): BlockedRoute => ({ from, to, reason: 'r' });
    const touching = (patch: Partial<MapState>) => {
        const state = createNewGameState();
        return { ...state, world: { ...state.world, currentMap: { ...state.world.currentMap, ...patch } } };
    };

    it('scrubs a save that only names it in passing, keeping the node underfoot', () => {
        const map = dropCutNodes(touching({
            currentNode: 'bw-p1',
            arrivedFrom: 'bw-p2',
            pendingArrival: 'bw-p2',
            retiredEliteNodes: ['bw-p2', 'bw-c1'],
            eliteUpgradeTakenNodes: ['bw-p2'],
            blockedRoutes: [route('bw-p1', 'bw-p2'), route('bw-p2', 'bw-p3'), route('bw-m1', 'bw-p1')],
        })).world.currentMap;
        expect(map.currentNode).toBe('bw-p1');
        expect(map.arrivedFrom).toBe('bw-p1');
        expect(map.pendingArrival).toBeNull();
        expect(map.retiredEliteNodes).toEqual(['bw-c1']);
        expect(map.eliteUpgradeTakenNodes).toEqual([]);
        expect(map.blockedRoutes).toEqual([route('bw-m1', 'bw-p1')]);
    });

    it('acts on each field alone', () => {
        const cases: Partial<MapState>[] = [
            { arrivedFrom: 'bw-p2' },
            { pendingArrival: 'bw-p2' },
            { availableNodes: ['bw-p2'] },
            { blockedRoutes: [route('bw-p1', 'bw-p2')] },
            { blockedRoutes: [route('bw-p2', 'bw-p3')] },
        ];
        for (const patch of cases) {
            const before = touching(patch);
            expect(dropCutNodes(before), JSON.stringify(patch)).not.toBe(before);
        }
    });

    it('leaves a save untouched whose routes never name it', () => {
        const before = touching({ blockedRoutes: [route('bw-m1', 'bw-p1')] });
        expect(dropCutNodes(before)).toBe(before);
    });

    it('scrubs the Breakwater kept in mapStates while the player is on another map, and leaves that map alone', () => {
        const state = createNewGameState();
        const breakwater = { ...state.world.currentMap, currentNode: 'bw-p2', completedNodes: ['bw-p1', 'bw-p2'] };
        const elsewhere = { ...state.world.currentMap, name: 'charcoal-wood' as MapName, currentNode: 'bw-p2' };
        const before = { ...state, world: { ...state.world, currentMap: elsewhere, mapStates: { breakwater } } };
        const after = dropCutNodes(before);
        expect(after.world.currentMap).toBe(elsewhere);
        expect(after.world.mapStates?.breakwater).toMatchObject({ currentNode: 'bw-p1', completedNodes: ['bw-p1'] });
    });
});

describe('dropRetiredMapFields: a save written while maps carried hazardOutcomes', () => {
    // `MapState.hazardOutcomes` was declared and saved empty but never written
    // or read (TRIM T2a finish list); the field left the shape on 2026-11-22.
    const withOutcomes = () => {
        const state = createNewGameState();
        const outcome = { nodeId: 'bw-w2', hazardId: 'h', outcome: 'cleared', appliedDate: '2026-11-01' };
        const map = { ...state.world.currentMap, hazardOutcomes: [outcome] };
        const other = { ...state.world.currentMap, name: 'charcoal-wood' as MapName, hazardOutcomes: [] };
        return { ...state, world: { ...state.world, currentMap: map, mapStates: { 'charcoal-wood': other } } };
    };

    it('a new game no longer writes the field', () => {
        expect('hazardOutcomes' in createNewGameState().world.currentMap).toBe(false);
    });

    it('strips it from the current map and every kept map, leaving the rest of each map as it was', () => {
        const before = withOutcomes();
        const after = dropRetiredMapFields(before);
        expect('hazardOutcomes' in after.world.currentMap).toBe(false);
        expect('hazardOutcomes' in after.world.mapStates!['charcoal-wood']!).toBe(false);
        const { hazardOutcomes: _a, ...restCurrent } = before.world.currentMap;
        expect(after.world.currentMap).toEqual(restCurrent);
        expect(after.player).toBe(before.player);
    });

    it('returns the state itself when no map carries the field', () => {
        const state = dropRetiredMapFields(withOutcomes());
        expect(dropRetiredMapFields(state)).toBe(state);
        const fresh = createNewGameState();
        expect(dropRetiredMapFields(fresh)).toBe(fresh);
    });
});
