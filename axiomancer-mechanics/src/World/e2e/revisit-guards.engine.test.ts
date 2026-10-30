// guard-test: pins WR1b's revisit rule where its tests left it unpinned (mutation survivors in resolve-map-event.ts and world.reducer.ts left by #1067), so it passes on the parent by design
/**
 * The revisit rule (phase WR1b) at the edges the Breakwater walk does not
 * reach: a labyrinth room keeps its own rule (it owes on every arrival and is
 * never a quiet walk back), a map the registry does not hold reads as a
 * gauntlet, a node with no pool never acts, a quest node's business is read
 * from its quest entry and its primary kind, and the chain's last marker,
 * past the last step, has nothing once the chain is done.
 */

import { describe, it, expect } from 'vitest';

import { arriveAtNode, completeNode } from '../world.reducer';
import { createMapState, getMapDefinition } from '../map.registry';
import {
    actsOnRevisit, isQuietWalkBack, resolveMapEvent, registerMapEventPool, setNodeEventPoolOverride, getNodeEventPool,
} from '../MapEvents/resolve-map-event';
import { getQuestline } from '../questline';
import { BREAKWATER_CHAPTER_QUESTLINE_ID as LINE } from '../breakwater-chapter.questline';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import type { MapEventPoolEntry } from '../MapEvents/types';
import type { MapState } from '../types';

const BREAKWATER = 'coastal-continent';
const LABYRINTH = 'labyrinth-continent';

const onMap = (state: GameState, currentMap: MapState): GameState =>
    ({ ...state, world: { ...state.world, currentMap } });

/** A new game standing in the Colonnade's first room, `room` already walked and left. */
function inTheColonnade(room: string): GameState {
    const base = createNewGameState({ startMap: 'breakwater' });
    const start = createMapState(getMapDefinition(LABYRINTH, 'aporia-colonnade'));
    const walked = { ...start, completedNodes: [room] };
    return onMap(base, walked);
}

registerMapEventPool({
    id: 'hd1a.camp',
    entries: [{ kind: 'rest', weight: 1, payload: { kind: 'rest', shelter: 'camp' } }],
});

describe('a labyrinth room keeps its own rule', () => {
    it('arriving at a room already walked owes its arrival again', () => {
        const s = inTheColonnade('ap1-2');
        expect(arriveAtNode(s.world.currentMap, 'ap1-2').pendingArrival).toBe('ap1-2');
    });

    it('a spent room is never a quiet walk back', () => {
        const s = inTheColonnade('ap1-2');
        expect(isQuietWalkBack(s, 'ap1-2')).toBe(false);
    });

    it('a room walked but not consumed resolves its event again', () => {
        setNodeEventPoolOverride(LABYRINTH, 'aporia-colonnade', 'ap1-2', 'hd1a.camp');
        const s = inTheColonnade('ap1-2');
        const there = onMap(s, { ...s.world.currentMap, currentNode: 'ap1-2', pendingArrival: null });
        expect(resolveMapEvent(there, () => 0.5).event.kind).toBe('rest');
    });
});

describe('a map the registry does not hold reads as a gauntlet, and a node with no pool never acts', () => {
    const base = createNewGameState({ startMap: 'breakwater' });
    const nowhere = onMap(base, {
        ...base.world.currentMap, name: 'hd1a-nowhere' as MapState['name'], consumedNodes: ['x'], completedNodes: ['x'],
    });

    it('no pool: the node does not act on a revisit', () => {
        expect(getNodeEventPool(BREAKWATER, 'hd1a-nowhere', 'x')).toBeUndefined();
        expect(actsOnRevisit(nowhere, 'x')).toBe(false);
    });

    it('a spent node there is a quiet walk back', () => {
        expect(isQuietWalkBack(nowhere, 'x')).toBe(true);
    });
});

describe('a quest node\'s business', () => {
    const questEntry = (nodeId: string): MapEventPoolEntry =>
        getNodeEventPool(BREAKWATER, 'breakwater', nodeId)!.entries.find(e => e.kind === 'quest')!;
    const rest: MapEventPoolEntry = { kind: 'rest', weight: 1, payload: { kind: 'rest', shelter: 'camp' } };
    const line = getQuestline(LINE)!;
    const fresh = createNewGameState({ startMap: 'breakwater' });
    // Step 1 done and step 2 not taken: the camp's marker (node 2) has an offer.
    const offering: GameState = { ...fresh, quests: { ...fresh.quests, completed: [line.steps[0]!.quest.name] } };

    it('is read from the quest entry, wherever it sits in the pool', () => {
        registerMapEventPool({ id: 'hd1a.quest-second', entries: [rest, { ...questEntry('bw-c2'), weight: 2 }] });
        setNodeEventPoolOverride(BREAKWATER, 'breakwater', 'hd1a-quest-second', 'hd1a.quest-second');
        expect(actsOnRevisit(offering, 'hd1a-quest-second')).toBe(true);
    });

    it('only counts when quest is the primary kind', () => {
        registerMapEventPool({ id: 'hd1a.quest-minor', entries: [{ ...rest, weight: 2 }, questEntry('bw-c2')] });
        setNodeEventPoolOverride(BREAKWATER, 'breakwater', 'hd1a-quest-minor', 'hd1a.quest-minor');
        expect(actsOnRevisit(offering, 'bw-c2')).toBe(true);
        expect(actsOnRevisit(offering, 'hd1a-quest-minor')).toBe(false);
    });

    it('the bridge, past the last step, has nothing once the chain is done', () => {
        const done: GameState = { ...fresh, quests: { ...fresh.quests, completed: line.steps.map(s => s.quest.name) } };
        const atBridge = onMap(done, completeNode(done.world, 'bw-b1').currentMap);
        expect(actsOnRevisit(atBridge, 'bw-b1')).toBe(false);
    });
});
