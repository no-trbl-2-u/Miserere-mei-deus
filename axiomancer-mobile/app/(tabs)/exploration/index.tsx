import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { ScreenBg } from '@/components/ScreenBg';
import { StatusCard } from '@/components/StatusCard';
import { SectionLabel } from '@/components/SectionLabel';
import { MapCanvas } from '@/components/exploration/MapCanvas';
import { NodeGrid } from '@/components/exploration/NodeGrid';
import { NodeConfirmPanel } from '@/components/exploration/NodeConfirmPanel';
import { EventBadge } from '@/components/exploration/EventBadge';
import { NodeToast } from '@/components/exploration/NodeToast';
import { QuestTracker } from '@/components/exploration/QuestTracker';
import { MapOverlays } from '@/components/exploration/MapOverlays';
import { useCombatMode } from '@/state/combat-mode';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import {
    selectExplorationViewModel,
    type ExplorationNode,
    type ExplorationOption,
} from '@/state/presenters/exploration.engine';
import { selectHasAnyActiveSession } from '@/state/presenters/navigation.engine';
import { selectIsInCombat } from '@mechanics';

export default function ExplorationScreen() {
    const styles = useStyles();
    const { inCombat, recordDeepestNode } = useCombatMode();
    const [nodeTip, setNodeTip] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (nodeTip !== null) {
            const t = setTimeout(() => setNodeTip(null), 2000);
            return () => clearTimeout(t);
        }
    }, [nodeTip]);

    const actions = useGameActions();
    const vm = useGameState(selectExplorationViewModel);
    const anySession = useGameState(selectHasAnyActiveSession);

    // Resolve the arrival this screen still owes the player, once, on mount.
    //
    // The START node: events fire on ARRIVAL at a node, and the player never
    // "arrives" at the node they are placed on, so without this whatever the
    // map authored for its starting node would be dead content. The
    // mechanics CLI resolves the start node behind `--resolve-start`; this
    // is the app's equivalent.
    //
    // The start node is only the FIRST unanswered arrival, not the only one.
    // A move checkpoints before its arrival resolves (`moveToAction` saves,
    // then `onConfirmMove` calls `resolveCurrentMapEvent`), so a player who
    // reloads in between comes back standing on the node with the arrival
    // still owed. `vm.arrivalPending` is that debt, read off the engine's
    // `pendingArrival` record, and it is cleared by the resolve, so it stays
    // a genuine one-shot: an answered arrival never re-fires, here or after
    // a reload.
    //
    // The two flags are owed for different reasons and neither implies the
    // other. `arrivalPending` is a record of WALKING onto a node;
    // `startNodePending` is the map placing you on its first one. Being
    // PLACED somewhere else — a state fixture, a `/dev` JUMP — is neither,
    // and owes nothing (so `/exploration?fixture=sage-bw-door-gate` draws
    // the map rather than engaging the boss).
    //
    // Two guards.
    //
    // WHAT counts as busy: every minigame owns its own slice, so the arrival
    // has to stand down for ANY of them, not just a paced event — see
    // `selectHasAnyActiveSession`. Checking only the event slice would let
    // the dev treasure trigger (which opens the CACHE slice) look idle, and
    // the cutscene would steal its route to /cache.
    //
    // WHEN to decide: callers navigate to this screen and open their session
    // in the same handler — `DebugTriggerEncounter.onPress` does
    // `router.push('/(tabs)/exploration')` and then `fire(kind)` — so this
    // screen can mount one commit BEFORE that session exists. Deciding on the
    // render-time reading would see an idle app that is about to be busy, so
    // let the interaction settle and re-read the store at fire time.
    const store = useGameStore();
    const arrivalOwed = vm.arrivalPending || vm.startNodePending;
    useEffect(() => {
        if (!arrivalOwed || anySession || inCombat) return;
        const settle = setTimeout(() => {
            // A fight still on the books (the combat route has it) owns the
            // node: its arrival stays owed until the fight ends, and
            // resolving it here as well would stage the same fight twice.
            const now = store.getState();
            if (selectHasAnyActiveSession(now) || selectIsInCombat(now)) return;
            actions.resolveCurrentMapEvent();
        }, 0);
        return () => clearTimeout(settle);
    }, [vm.mapId, vm.currentNodeId, arrivalOwed, anySession, inCombat, store, actions]);
    // The node the player has tapped but not yet confirmed; resolved against
    // the current options so a stale selection (after a move) falls away.
    const selectedOption = useMemo(
        () => vm.options.find((o) => o.nodeId === selectedNodeId) ?? null,
        [vm.options, selectedNodeId],
    );

    // A tapped node behind a blocked road: the panel names the road's reason.
    const shutNode = useMemo(
        () => vm.nodes.find((n) => n.id === selectedNodeId && n.kind === 'locked' && n.blockedReason) ?? null,
        [vm.nodes, selectedNodeId],
    );

    /**
     * Node tap handler for the exploration map.
     *
     * Input: the tapped `ExplorationNode`. Output: none — it either selects
     * the node (opening `<NodeConfirmPanel>`) or raises a brief toast saying
     * why the tap did nothing. Every kind says something back, including the
     * node the player is STANDING on.
     */
    const onNodePress = (node: ExplorationNode) => {
        if (node.kind === 'locked') {
            // A road blocked by a questline's lock or gate says why on the
            // confirm panel (the quest named, no way to travel); any other
            // locked node is simply out of reach.
            if (node.blockedReason) setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
            else setNodeTip('This path is sealed.');
            return;
        }
        if (node.kind === 'completed') {
            // A walked node joined by a road to where the player stands is a
            // walk back: it moves at once, and its spent event fires nothing.
            // A door (travel/labyrinth) is the one exception — the engine
            // deliberately never adds it to `consumedNodes` (a door is
            // repeatable), so resolving it again would roll its pool and
            // cross the map again with no confirm. Treat a door like any
            // other walked node instead of walking back onto it.
            if (node.walkable && node.type !== 'door') {
                setSelectedNodeId(null);
                if (actions.moveTo(node.id).moved) actions.resolveCurrentMapEvent(node.type);
                return;
            }
            setNodeTip('walked already');
            return;
        }
        if (node.kind === 'current') {
            // A fled or lost fight, or a quest node left unaccepted, is
            // unspent: tapping the node under the player tries it again.
            if (vm.retryable && node.id === vm.currentNodeId) {
                if (actions.moveTo(node.id).moved) actions.resolveCurrentMapEvent(node.type);
                return;
            }
            setNodeTip('you stand here');
            return;
        }
        if (node.kind !== 'available') return;
        setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    };

    // Confirm: commit the move to the selected node, then resolve its event.
    const onConfirmMove = () => {
        if (selectedNodeId === null) return;
        const node = vm.nodes.find((n) => n.id === selectedNodeId);
        if (!node || node.kind !== 'available') {
            setSelectedNodeId(null);
            return;
        }
        const result = actions.moveTo(node.id);
        setSelectedNodeId(null);
        if (result.moved) {
            // Run-stats: track the deepest node reached (records on move, not
            // on tap, so cancelled selections don't bump the figure).
            recordDeepestNode(node.id);
            // Resolve the node's event (a fight is engaged by <CombatGate> and
            // fought on /combat-encounter; other kinds route to their minigame
            // or event).
            actions.resolveCurrentMapEvent(node.type);
        }
    };

    return (
        <ScreenBg scrollable={false}>
            <StatusCard />

            {/* Region Header */}
            <View style={styles.regionHeader}>
                <View>
                    <SectionLabel size={9} style={styles.continentLabel}>{vm.continent}</SectionLabel>
                    <Text style={styles.regionTitle}>{vm.region}</Text>
                    <Text style={styles.regionSub}>{vm.regionProgress}</Text>
                </View>
            </View>

            <QuestTracker />

            {/* Node Graph */}
            {/* Legend/compass copy ride the `overlays` slot (viewport-fixed),
                not `children` (the pannable canvas) — CRITIQUE pass 20. */}
            <MapCanvas nodes={vm.nodes} edges={vm.edges} sheet={vm.sheet} overlays={<MapOverlays legend={vm.legend} />}>
                <NodeGrid
                    nodes={vm.nodes}
                    onNodePress={onNodePress}
                    selectedNodeId={selectedNodeId}
                />
            </MapCanvas>

            {vm.eventCallout && (
                <EventBadge eventCallout={vm.eventCallout} />
            )}

            {/* Select a node on the map → name + brief explanation + confirm. */}
            <NodeConfirmPanel
                selected={selectedOption}
                shut={shutNode}
                onConfirm={onConfirmMove}
                onCancel={() => setSelectedNodeId(null)}
                emptyMessage={vm.drawerCopy.emptyMessage}
            />

            {nodeTip !== null && <NodeToast tip={nodeTip} />}
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    regionHeader: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    regionTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 26,
        lineHeight: 28,
        color: AXM.parchment,
        marginTop: 2,
    },
    regionSub: {
        fontFamily: FONTS.serif,
        fontSize: 11,
        color: AXM.bone,
        fontStyle: 'italic',
        marginTop: 1,
    },
    continentLabel: {
        color: AXM.bone,
    },
}));