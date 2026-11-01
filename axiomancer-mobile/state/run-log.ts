/**
 * The run log's recorders (phase SM1d, acceptance A8): what a store action
 * tells the run-log poster (`lib/runLog.ts`).
 *
 * Each recorder reads the store, names the run by the save's `runId`
 * (`deckEventRunId`), and hands the poster one event. A recorder never throws
 * and never changes the store: the play log is a measurement beside the game,
 * so a failure inside it only drops the row. With the play-log gate shut the
 * poster buffers and posts nothing.
 *
 * Functions:
 *   recordRunOpened(state)                          the `play_runs` open, when a run starts
 *   recordRunClosed(state, outcome)                 the close, when it ends
 *   recordNodeEntered(store)                        a node was stepped onto (flushes the last node's batch)
 *   recordNodeResolved(store, choice)               the node underfoot was resolved, and how
 *   recordFightSettled(store, before, report, out)  a staged fight ended: node, XP, levels, drops
 *   recordProgress(store, before, from)             XP gained and levels reached since `before`
 *   recordStatPoint(store, stat)                    a banked stat point was spent
 *   recordItemGained(store, item, from)             an item came into the pack
 *   recordHazardEnded(store, hazard)                a hazard ended
 *   recordDeckUpgrade(store, fromId, toId, screen)  an `upgrade` deck event
 */

import {
    getNodePrimaryEventKind,
    isEquipment,
    type Character,
    type GameState,
    type Item,
    type PlayRunOutcome,
    type RunEventPayloads,
    type WorldState,
} from '@mechanics';

import { deckEventPoster, deckEventRunId, deckEventWhere, runDeck, type DeckEventState } from '@/lib/deckEvents';
import { runLogPoster } from '@/lib/runLog';

import type { AppStore } from './store';

/** Runs a recorder body; a failure inside the play log never reaches the game. */
function safely(body: () => void): void {
    try {
        body();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[runLog] not recorded: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function stateOf(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** The nodes the run has spent, on the map underfoot and on every map it left. */
export function countResolvedNodes(world: WorldState | undefined): number {
    if (!world) return 0;
    const left = Object.values(world.mapStates ?? {}).reduce((sum, map) => sum + (map?.consumedNodes?.length ?? 0), 0);
    return (world.currentMap?.consumedNodes?.length ?? 0) + left;
}

/** The `play_runs` open: the run as the character it opened as, with the deck it began with. */
export function recordRunOpened(state: GameState): void {
    safely(() => {
        const runId = deckEventRunId(state);
        if (runId === null || !state.player) return;
        runLogPoster.open({ runId, characterId: state.player.characterId ?? null, startDeck: runDeck(state) });
    });
}

/**
 * The run's close, read from `state` as it stands (call it before the engine
 * resets the run). A state with no player or no run id closes nothing.
 */
export function recordRunClosed(state: DeckEventState & Partial<Pick<GameState, 'world'>>, outcome: PlayRunOutcome): void {
    safely(() => {
        const runId = deckEventRunId(state);
        const player = state.player;
        if (runId === null || !player) return;
        runLogPoster.close(runId, {
            outcome,
            endNodeId: state.world?.currentMap?.currentNode ?? null,
            level: player.level,
            vitaeEnd: player.health,
            nodesResolved: countResolvedNodes(state.world),
            endDeck: runDeck(state),
        });
    });
}

function nodeKindOf(world: WorldState): string | null {
    const map = world.currentMap;
    return getNodePrimaryEventKind(map.continent, map.name, map.currentNode) ?? null;
}

function record<K extends keyof RunEventPayloads>(store: AppStore, kind: K, payload: RunEventPayloads[K], onRun?: string | null): void {
    const runId = onRun ?? deckEventRunId(stateOf(store));
    if (runId !== null) runLogPoster.event(runId, kind, payload);
}

/**
 * A node was stepped onto. The previous node's events post first, so a batch
 * is one node's worth; this node's events follow it in the buffer.
 */
export function recordNodeEntered(store: AppStore): void {
    safely(() => {
        const state = stateOf(store);
        const runId = deckEventRunId(state);
        if (runId === null || !state.world) return;
        runLogPoster.flush(runId);
        const map = state.world.currentMap;
        record(store, 'node-entered', { map: map.name, nodeId: map.currentNode, nodeKind: nodeKindOf(state.world) });
    });
}

/** The node underfoot was resolved, and `choice` is what the player did there. */
export function recordNodeResolved(store: AppStore, choice: string): void {
    safely(() => {
        const state = stateOf(store);
        if (!state.world) return;
        const map = state.world.currentMap;
        record(store, 'node-resolved', { nodeId: map.currentNode, nodeKind: nodeKindOf(state.world), choice });
    });
}

/** XP gained and levels reached between `before` and the player now. */
export function recordProgress(store: AppStore, before: Character | undefined, from: string): void {
    safely(() => {
        const after = stateOf(store).player;
        if (!before || !after) return;
        const amount = Math.round(after.experience - before.experience);
        if (amount > 0) record(store, 'xp-gained', { amount, from });
        for (let level = before.level + 1; level <= after.level; level++) {
            record(store, 'level-up', { level, stat: null });
        }
    });
}

/**
 * A staged fight was settled by the engine's `endCombat`: the node is resolved
 * (`fight`, or `flee` for a withdrawal), the XP and levels it paid are logged
 * against the player as they stood `before`, and so is each item it dropped.
 */
export function recordFightSettled(
    store: AppStore,
    before: Character | undefined,
    report: { loot?: readonly Item[] } | null,
    outcome: string,
): void {
    safely(() => {
        recordNodeResolved(store, outcome === 'flee' ? 'flee' : 'fight');
        recordProgress(store, before, 'fight');
        for (const item of report?.loot ?? []) recordItemGained(store, item, 'fight');
    });
}

/** A banked stat point went to `stat`, at the level the player stands on. */
export function recordStatPoint(store: AppStore, stat: string): void {
    safely(() => {
        const player = stateOf(store).player;
        if (player) record(store, 'level-up', { level: player.level, stat });
    });
}

/** An item came into the pack, and from what. */
export function recordItemGained(store: AppStore, item: Item, from: string): void {
    safely(() => {
        record(store, 'item-gained', { itemId: item.id, slot: isEquipment(item) ? item.slot : item.category, from });
    });
}

/** A hazard ended: whether it was cleared, and the VITAE on either side of it. */
export function recordHazardEnded(store: AppStore, hazard: RunEventPayloads['hazard-ended'], onRun?: string | null): void {
    safely(() => {
        record(store, 'hazard-ended', hazard, onRun);
        // Logged on a run the store has left (a run over): nothing will flush it later.
        if (onRun) runLogPoster.flush(onRun);
    });
}

/** An upgrade at a rest, the anvil or an elite's reward: the card before in `cardId`, the card after in `offered`. */
export function recordDeckUpgrade(store: AppStore, fromCardId: string, toCardId: string, screen: string): void {
    safely(() => {
        const state = stateOf(store) as unknown as DeckEventState;
        void deckEventPoster.post({
            kind: 'upgrade',
            cardId: fromCardId,
            offered: [toCardId],
            deck: runDeck(state),
            where: deckEventWhere(state, screen),
            runId: deckEventRunId(state),
        });
    });
}
