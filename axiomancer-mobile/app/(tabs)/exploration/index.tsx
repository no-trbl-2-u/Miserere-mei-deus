import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ScreenBg } from '@/components/ScreenBg';
import { StatusCard } from '@/components/StatusCard';
import { MapCanvas, type MapTokenLocator } from '@/components/exploration/MapCanvas';
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
import { lookOf } from '@/components/experience/looks';
import { BAND_BLACK } from '@/components/exploration/wildsInk';
import { useDevSetting } from '@/state/dev/dev-settings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { hasMapInkHost, startMapInk } from '@/state/map-ink';

export default function ExplorationScreen() {
    const { inCombat, recordDeepestNode } = useCombatMode();
    const [nodeTip, setNodeTip] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    // The TOP HALF of the status card on a solid black band, to quiet the map's
    // lines behind it (T, 2026-11-06, W-01; halved by T, 2026-11-08). It ships on; the dev menu's
    // WILDS BAND switch turns it off for comparison. It belongs to the vellum
    // card, so a card that is not vellum draws no band.
    // WITHOUT the band the map runs up under the whole card, which is the other
    // half of the comparison: the card over the map's own lines.
    const vellumTop = lookOf('W-01') === 'vellum';
    const bandSwitch = useDevSetting('wildsBlackBand');
    const bandOn = bandSwitch && vellumTop;
    // The measured height of the status card, to halve it for the band.
    const [cardHeight, setCardHeight] = useState(0);
    // The foot's measured height: the map frames and parks its button above it.
    const [footHeight, setFootHeight] = useState(0);
    const mapInsets = useMemo(() => ({ top: vellumTop ? cardHeight : 0, bottom: footHeight }), [vellumTop, cardHeight, footHeight]);

    useEffect(() => {
        if (nodeTip !== null) {
            const t = setTimeout(() => setNodeTip(null), 2000);
            return () => clearTimeout(t);
        }
    }, [nodeTip]);

    const actions = useGameActions();
    const vm = useGameState(selectExplorationViewModel);
    // The map ink (CX1b): a walk to a fight bleeds ink out of the token
    // before the fight is staged. The motion answer is asked here, once,
    // and handed on; reduced motion or the e2e escape hatch resolve at once.
    const inkInstant = resolveJuiceMode({ reducedMotion: useReducedMotion() }) === 'instant';
    const locator = useRef<MapTokenLocator | null>(null);
    // True from a fight walk's confirm until its ink covers and resolves it.
    const inkOwes = useRef(false);
    const windowSize = useWindowDimensions();
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
            // A finished run owes no arrival: the shell world's start node is not a place to
            // play a scene on, and the Game Over screen is about to take the player.
            if (now.runOver === true) return;
            // A walk to a fight whose ink is still spreading owes this arrival to
            // the ink: it resolves the node once it covers (CX1b).
            if (inkOwes.current) return;
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
            // A walked node whose event acts on every entry (a village, a
            // door, a quest node with business) is offered again: the tap
            // opens the confirm panel like a new node's, and only the confirm
            // resolves it. A door never crosses on the tap alone.
            if (node.walkable && node.actsAgain) {
                setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
                return;
            }
            // Any other walked node a road away is a QUIET WALK BACK: it moves
            // at once, owes nothing and fires nothing, so nothing is resolved.
            if (node.walkable) {
                setSelectedNodeId(null);
                actions.moveTo(node.id);
                return;
            }
            setNodeTip('walked already');
            return;
        }
        if (node.kind === 'current') {
            // A travel node underfoot offers its trip again on every tap
            // ("Move to X?"), spent or not (phase NK1d).
            if (node.id === vm.currentNodeId && actions.offerTravelHere()) return;
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
        const offered = node !== undefined
            && (node.kind === 'available' || (node.kind === 'completed' && node.walkable === true && node.actsAgain === true));
        if (!node || !offered) {
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
            // No host to draw the ink (a test mounting the screen alone) is the same.
            if (inkInstant || !node.triggersCombat || !hasMapInkHost()) {
                actions.resolveCurrentMapEvent(node.type);
                return;
            }
            // A fight in animate mode: the ink bleeds out of the token first, and
            // the fight is staged only once it covers, so the gate's push lands on
            // black (A6). Deferring the resolve is safe: the move has checkpointed
            // with its arrival owed, so a reload mid-spread replays the fight. The
            // token is located after this commit, under the camera the move framed.
            const type = node.type;
            const at = node.id;
            inkOwes.current = true;
            setTimeout(() => {
                const origin = locator.current?.(at) ?? { x: windowSize.width / 2, y: windowSize.height / 2 };
                const resolve = () => {
                    inkOwes.current = false;
                    actions.resolveCurrentMapEvent(type);
                };
                // The host went away meanwhile: resolve now.
                if (startMapInk(origin, resolve) === null) resolve();
            }, 0);
        }
    };

    // Node Graph. The compass copy rides the `overlays` slot (viewport-fixed),
    // not `children` (the pannable canvas) — CRITIQUE pass 20.
    const canvas = (
        <MapCanvas nodes={vm.nodes} edges={vm.edges} sheet={vm.sheet} mapId={vm.mapId} overlays={<MapOverlays />} insets={mapInsets} locatorRef={locator}>
            <NodeGrid
                nodes={vm.nodes}
                onNodePress={onNodePress}
                selectedNodeId={selectedNodeId}
            />
        </MapCanvas>
    );
    const status = <StatusCard mapName={vm.region} />;

    // The foot of the screen: a selected node's panel, else the ACTIVE QUEST
    // (T, 2026-11-02; the map's flavour line is only the fallback for an empty
    // quest log). It is laid over the map's foot with nothing drawn behind it
    // but its own vellum (T, 2026-11-08: "no black behind the quest card, nor
    // behind the Travel here buttons").
    const foot = selectedOption !== null || shutNode !== null ? (
        <NodeConfirmPanel
            selected={selectedOption}
            shut={shutNode}
            onConfirm={onConfirmMove}
            onCancel={() => setSelectedNodeId(null)}
            emptyMessage={vm.drawerCopy.emptyMessage}
        />
    ) : (
        <QuestTracker
            fallback={<NodeConfirmPanel selected={null} emptyMessage={vm.drawerCopy.emptyMessage} />}
        />
    );

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.stage} testID="wilds-stage">
                {vellumTop ? (
                    <>
                        {/* The map runs the whole stage, up under the status card and
                            down to the tab bar; the card and the foot float over it. */}
                        <View style={StyleSheet.absoluteFill}>{canvas}</View>
                        <View
                            style={styles.top}
                            pointerEvents="box-none"
                            testID="wilds-top-card"
                            onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
                        >
                            {/* Toggle on: the black runs from the screen's top to the card's
                                vertical middle, so the map shows behind its lower half
                                (T, 2026-11-08: "the top half of the top section"). */}
                            {bandOn && (
                                <View
                                    style={[styles.band, { height: cardHeight / 2 }]}
                                    testID="wilds-black-band"
                                    pointerEvents="none"
                                />
                            )}
                            {status}
                        </View>
                    </>
                ) : (
                    <>
                        {status}
                        <View style={styles.fill}>{canvas}</View>
                    </>
                )}
                <View
                    style={styles.foot}
                    pointerEvents="box-none"
                    testID="wilds-foot"
                    onLayout={(e) => setFootHeight(e.nativeEvent.layout.height)}
                >
                    {foot}
                </View>
            </View>

            {vm.eventCallout && (
                <EventBadge eventCallout={vm.eventCallout} />
            )}

            {nodeTip !== null && <NodeToast tip={nodeTip} />}
        </ScreenBg>
    );
}

const styles = StyleSheet.create({
    stage: { flex: 1 },
    fill: { flex: 1 },
    // The status card's holder, over the map. `band` hangs from its top edge to
    // the card's middle (its height is set from the measured card).
    top: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
    band: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: BAND_BLACK },
    // The foot floats over the map's foot: no fill of its own.
    foot: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 },
});
