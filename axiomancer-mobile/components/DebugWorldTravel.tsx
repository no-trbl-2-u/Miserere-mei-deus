/**
 * Dev-only WORLD TRAVEL panel.
 *
 * Stand anywhere in the campaign in one tap:
 *   MAPS   — every (continent, map) pair from `MAP_REGISTRY`; tap to
 *            travel there at its start node (`travelToMap`).
 *   NODES  — the current map's nodes labelled with their primary
 *            authored event kind; tap to jump there (`jumpToNode`) AND
 *            fire that node's real event through the live
 *            `resolveCurrentMapEvent` path — travel doors, villages,
 *            cutscenes, blacksmiths, bosses, all with authored content.
 *   RESET  — re-seed the current map at its start (`resetCurrentMap`;
 *            keeps the historic `debug-map-reset-button` id).
 *   COMPLETE — stamp the current map done + unlock the next
 *            (`completeCurrentMap`) to drive late-game map bookkeeping.
 *   THE APORIA — enter act I / II / III of the labyrinth via
 *            `actions.enterLabyrinth`; `<LabyrinthGate>` opens `/labyrinth`.
 *   NEW GAME ON — start a FRESH game on any campaign map
 *            (`STARTABLE_MAPS`) in the active save slot: the same new-game
 *            verb the slot screen uses, placed on the chosen map instead of
 *            the default start (the Breakwater). Unlike TRAVEL, the run
 *            is new — no carried items, coin, XP, flags or quests.
 *
 * Firing a node event jumps to the WILDS tab first so overlays and gated
 * routes stack on top of the map. Renders null outside dev builds.
 */

import React, { useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { CHARACTER_ROSTER, STARTABLE_MAPS, STARTING_MAP } from '@mechanics';
import type { GameState, LabyrinthActId, MapName } from '@mechanics';

import { DevButton, DevButtons, DevChip, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { useSaveSlots } from '@/state/SaveSlotsProvider';
import {
    completeCurrentMap,
    jumpToNode,
    listMaps,
    listNodes,
    resetCurrentMap,
    travelToMap,
} from '@/state/dev/world-travel';

const ACTS: readonly { id: LabyrinthActId; label: string }[] = [
    { id: 'act1', label: 'ACT I · COLONNADE' },
    { id: 'act2', label: 'ACT II · ARCHIVE' },
    { id: 'act3', label: 'ACT III · PROOF' },
];

const MAPS = listMaps();

export function DebugWorldTravel() {
    const store = useGameStore();
    const actions = useGameActions();
    const router = useRouter();
    const currentMap = useGameState((s) => (s as unknown as GameState).world?.currentMap?.name ?? null);
    const currentNode = useGameState((s) => (s as unknown as GameState).world?.currentMap?.currentNode ?? null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const { slots, startNewGame } = useSaveSlots();

    if (!isDevToolsEnabled()) return null;
    if (currentMap === null) return null;

    const nodes = listNodes(store.getState() as unknown as GameState);

    const onTravel = (continent: (typeof MAPS)[number]['continent'], map: (typeof MAPS)[number]['map']) => {
        const ok = travelToMap(store, continent, map);
        setFeedback(ok ? `travelled · ${continent} / ${map}` : `travel failed · ${map}`);
    };

    const onNode = (nodeId: string, kind: string | undefined) => {
        if (!jumpToNode(store, nodeId)) return;
        router.push('/(tabs)/exploration');
        const fired = actions.resolveCurrentMapEvent(kind);
        setFeedback(fired ? `fired · ${nodeId} (${kind ?? 'none'})` : `jumped · ${nodeId} · no event`);
    };

    const onReset = () => {
        resetCurrentMap(store);
        setFeedback(`reset · ${currentMap}`);
    };

    const onComplete = () => {
        const unlocked = completeCurrentMap(store);
        setFeedback(unlocked ? `completed · ${currentMap} · unlocked ${unlocked}` : `completed · ${currentMap} · nothing left to unlock`);
    };

    const onNewGameOn = (map: MapName) => {
        // The active slot, or slot 1 when none is chosen yet (a fixture boot).
        const slot = slots.getActiveSlot() ?? 1;
        // The run's own character, else the first on the roster: a run always has one.
        const characterId = (store.getState() as unknown as GameState).player?.characterId ?? CHARACTER_ROSTER[0]?.id;
        startNewGame(slot, map, characterId);
        router.push('/(tabs)/exploration');
        setFeedback(`new game · slot ${slot} · ${map}`);
    };

    // `<LabyrinthGate>` routes to `/labyrinth` once the visit opens.
    const onAct = (actId: LabyrinthActId) => actions.enterLabyrinth(actId);

    return (
        <>
            <DevRow label="DEBUG · TRAVEL" sub={feedback ?? `at ${currentMap} / ${currentNode ?? '?'}`} stacked testID="debug-world-travel">
                <DevChips testID="debug-travel-maps">
                    {MAPS.map((m) => (
                        <DevChip
                            key={`${m.continent}/${m.map}`}
                            label={m.map}
                            active={m.map === currentMap}
                            onPress={() => onTravel(m.continent, m.map)}
                            a11y={`Travel to ${m.map} on ${m.continent}`}
                            testID={`debug-travel-map-${m.map}`}
                        />
                    ))}
                </DevChips>
                <DevButtons>
                    <DevButton label="RESET MAP" onPress={onReset} a11y="Reset current map to starting node" testID="debug-map-reset-button" />
                    <DevButton label="COMPLETE MAP" onPress={onComplete} a11y="Mark the current map complete and unlock the next" testID="debug-map-complete-button" />
                </DevButtons>
            </DevRow>

            <DevRow label="DEBUG · NODES" sub="tap a node: jump there + fire its authored event" stacked testID="debug-world-nodes">
                <DevChips testID="debug-travel-nodes">
                    {nodes.map((n) => (
                        <DevChip
                            key={n.id}
                            label={`${n.id}${n.kind ? ` · ${n.kind}` : ''}${n.isStart ? ' · start' : ''}`}
                            active={n.isCurrent}
                            accent={n.kind === 'travel'}
                            onPress={() => onNode(n.id, n.kind)}
                            a11y={`Jump to node ${n.id} and fire its ${n.kind ?? 'empty'} event`}
                            testID={`debug-travel-node-${n.id}`}
                        />
                    ))}
                </DevChips>
            </DevRow>

            <DevRow
                label="DEBUG · NEW GAME ON"
                sub={`a fresh run on any map · overwrites the active slot · default ${STARTING_MAP}`}
                stacked
                testID="debug-new-game-on"
            >
                <DevChips testID="debug-new-game-maps">
                    {STARTABLE_MAPS.map((m) => (
                        <DevChip
                            key={m}
                            label={m}
                            accent={m === STARTING_MAP}
                            onPress={() => onNewGameOn(m)}
                            a11y={`Start a new game on ${m}`}
                            testID={`debug-new-game-on-${m}`}
                        />
                    ))}
                </DevChips>
            </DevRow>

            <DevRow label="DEBUG · THE APORIA" sub="the labyrinth continent · three acts · the ending">
                <DevButtons>
                    {ACTS.map((a) => (
                        <DevButton
                            key={a.id}
                            label={a.label}
                            onPress={() => onAct(a.id)}
                            a11y={`Enter THE APORIA ${a.label}`}
                            testID={`debug-aporia-${a.id}`}
                        />
                    ))}
                </DevButtons>
            </DevRow>
        </>
    );
}
