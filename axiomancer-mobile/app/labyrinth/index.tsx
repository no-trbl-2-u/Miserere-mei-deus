/**
 * THE APORIA — labyrinth screen (W-01 / DESIGN.md section 7). Entered
 * through the Lantern Deep's vault door or the dev
 * menu; `<LabyrinthGate>` routes here. Act select → room scene →
 * accordion; gates, fog map, finale.
 *
 * Event plumbing mirrors the exploration screen: arrival (and baited-
 * clue) encounters are engaged by `<CombatGate>` and fought on the
 * `/combat-encounter` route; hazard / rest / loot / cutscene
 * events route to their existing full-screen minigames via the
 * globally-mounted gates. Boss rooms defer their arrival until the
 * finale panel's FIGHT (the naming rite precedes the fight — CLI
 * `bossRoomSequence` parity).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';

import { ScreenBg } from '@/components/ScreenBg';
import { FinalePanel } from '@/components/labyrinth/FinalePanel';
import { FogMap } from '@/components/labyrinth/FogMap';
import { GateSockets } from '@/components/labyrinth/GateSockets';
import { LabyrinthAccordion } from '@/components/labyrinth/LabyrinthAccordion';
import { RoomScene } from '@/components/labyrinth/RoomScene';
import { useCombatMode } from '@/state/combat-mode';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    LABYRINTH_COPY,
    selectLabyrinthFinaleViewModel,
    selectLabyrinthViewModel,
} from '@/state/presenters/labyrinth.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/**
 * The /labyrinth route. Purpose: render THE APORIA's three states — act
 * select, room scene, completion — over the labyrinth presenter's view
 * models, and route arrival events to the encounter overlay.
 * Inputs: none (reads the game store via selectors and the combat-mode
 * hook). Output: the screen element. Its bare pressables (the act cards,
 * LEAVE and the MAP toggle) carry `accessibilityRole` + presenter-owned
 * labels.
 */
export default function LabyrinthScreen() {
    const styles = useStyles();
    const router = useRouter();
    const actions = useGameActions();

    const vm = useGameState(selectLabyrinthViewModel);
    const finaleVm = useGameState(selectLabyrinthFinaleViewModel);
    const hasSession = useGameState((s) => s.labyrinthUi?.session != null);

    const [selectedDoor, setSelectedDoor] = useState<{ to: string; display: string; gated: boolean } | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [hintLine, setHintLine] = useState<string | null>(null);
    const [gateLine, setGateLine] = useState<string | null>(null);

    // Combat-mode's `lastOutcome` feeds the boss outcome below.
    const { lastOutcome } = useCombatMode();

    // ── Boss outcome recording (one per modal session) ──
    const bossOutcomeRecorded = useRef(false);
    const inBossRoom = vm.kind === 'room' && vm.room.isBossRoom;
    useEffect(() => {
        if (!inBossRoom) {
            bossOutcomeRecorded.current = false;
            return;
        }
        if (bossOutcomeRecorded.current) return;
        if (lastOutcome === 'victory') {
            bossOutcomeRecorded.current = true;
            actions.labyrinthRecordBossOutcome('slain');
        } else if (lastOutcome === 'parley') {
            bossOutcomeRecorded.current = true;
            actions.labyrinthRecordBossOutcome('spared');
        }
    }, [inBossRoom, lastOutcome, actions]);

    // ── One-shot arrival toast (waystone / ejection) ──
    const arrivalToast = vm.kind === 'room' ? vm.room.arrivalToast : null;
    useEffect(() => {
        if (arrivalToast === null) return;
        const t = setTimeout(() => actions.clearLabyrinthArrivalNote(), 3500);
        return () => clearTimeout(t);
    }, [arrivalToast, actions]);

    const leavingRef = useRef(false);
    const leave = useCallback(() => {
        leavingRef.current = true;
        actions.exitLabyrinth();
        if (router.canGoBack()) router.back();
    }, [actions, router]);

    // If the visit's session is cleared out from under us — a run reset on
    // death (`resetRun`) regenerates the overworld and drops the session —
    // pop back to the map. Without this the still-mounted route would strand
    // the player on the act-select screen after BEGIN AGAIN. The `leave`
    // button clears the session too, so its ref guards against a double pop.
    const hadSessionRef = useRef(false);
    useEffect(() => {
        if (hasSession) {
            hadSessionRef.current = true;
            return;
        }
        if (hadSessionRef.current && !leavingRef.current) {
            hadSessionRef.current = false;
            if (router.canGoBack()) router.back();
        }
    }, [hasSession, router]);

    // ── Act select ──
    if (vm.kind === 'act-select') {
        return (
            <ScreenBg scrollable={false} art="labyrinth">
                <View style={styles.selectRoot} testID="labyrinth-act-select">
                    <Text style={styles.title}>{vm.title}</Text>
                    <Text style={styles.sub}>{vm.sub}</Text>
                    <Text style={styles.warning}>{vm.warning}</Text>
                    {vm.acts.map((act) => (
                        <Pressable
                            key={act.id}
                            onPress={() => actions.enterLabyrinth(act.id)}
                            style={styles.actCard}
                            accessibilityRole="button"
                            accessibilityLabel={LABYRINTH_COPY.a11y.actOption(act.title, act.completed)}
                            testID={`labyrinth-act-${act.id}`}
                        >
                            <Text style={styles.actTitle}>{act.title}</Text>
                            <Text style={styles.actRiddle}>{act.riddle}</Text>
                            <Text style={styles.actEnter}>
                                {act.completed ? LABYRINTH_COPY.actDone : LABYRINTH_COPY.enterAct}
                            </Text>
                        </Pressable>
                    ))}
                    <Pressable
                        onPress={leave}
                        style={styles.leaveButton}
                        accessibilityRole="button"
                        accessibilityLabel={LABYRINTH_COPY.a11y.leave}
                        testID="labyrinth-leave"
                    >
                        <Text style={styles.leaveText}>{LABYRINTH_COPY.leave}</Text>
                    </Pressable>
                </View>
            </ScreenBg>
        );
    }

    // ── The Unfounded Door walked ──
    if (vm.kind === 'complete') {
        return (
            <ScreenBg scrollable={false} art="labyrinth">
                <View style={styles.selectRoot} testID="labyrinth-complete">
                    <Text style={styles.title}>{vm.title}</Text>
                    <Text style={styles.sub}>{vm.body}</Text>
                    <Text style={styles.warning}>{vm.lastLine}</Text>
                    <Pressable
                        onPress={leave}
                        style={styles.leaveButton}
                        accessibilityRole="button"
                        accessibilityLabel={LABYRINTH_COPY.a11y.leave}
                        testID="labyrinth-leave"
                    >
                        <Text style={styles.leaveText}>{LABYRINTH_COPY.leave}</Text>
                    </Pressable>
                </View>
            </ScreenBg>
        );
    }

    const { room, map } = vm;

    const onDoorPress = (to: string) => {
        const door = room.doors.find((d) => d.to === to);
        if (!door) return;
        setSelectedDoor((prev) => (prev?.to === to ? null : { ...door }));
    };
    const confirmMove = () => {
        if (!selectedDoor || selectedDoor.gated) return;
        setSelectedDoor(null);
        setHintLine(null);
        setGateLine(null);
        actions.labyrinthMove(selectedDoor.to);
    };

    return (
        <ScreenBg scrollable={false} art="labyrinth">
            <View style={styles.root} testID="labyrinth-room">
                {/* ── Header strip ── */}
                <View style={styles.header}>
                    <Pressable
                        onPress={leave}
                        accessibilityRole="button"
                        accessibilityLabel={LABYRINTH_COPY.a11y.leave}
                        testID="labyrinth-leave"
                    >
                        <Text style={styles.headerAction}>{LABYRINTH_COPY.leave}</Text>
                    </Pressable>
                    <Text style={styles.headerTitle} numberOfLines={1}>{room.actTitle}</Text>
                    <Pressable
                        onPress={() => setShowMap((m) => !m)}
                        accessibilityRole="button"
                        accessibilityLabel={showMap ? LABYRINTH_COPY.a11y.mapHide : LABYRINTH_COPY.a11y.mapShow}
                        testID="labyrinth-map-toggle"
                    >
                        <Text style={styles.headerAction}>{LABYRINTH_COPY.mapLabel}</Text>
                    </Pressable>
                </View>

                {/* ── The scene fills everything under the header; every
                       strip (remark, confirm, gate, finale, accordion)
                       floats OVER it — no dead space. ── */}
                <View style={styles.sceneArea}>
                    {showMap ? (
                        <View style={styles.mapWrap}>
                            <FogMap map={map} />
                        </View>
                    ) : (
                        <RoomScene
                            nodeId={room.nodeId}
                            display={room.display}
                            doors={room.doors}
                            pois={room.pois}
                            sealedLabel={LABYRINTH_COPY.doorSealed}
                            onDoorPress={onDoorPress}
                            onPoiPress={(poiId) => {
                                setSelectedDoor(null);
                                actions.labyrinthInspect(poiId);
                            }}
                        />
                    )}

                    <View style={styles.overlayStack} pointerEvents="box-none">
                        {/* ── Waystone / ejection toast ── */}
                        {arrivalToast !== null && (
                            <View style={styles.toast} testID="labyrinth-arrival-toast">
                                <Text style={styles.toastText}>{arrivalToast}</Text>
                            </View>
                        )}

                        {/* ── The Sophist's remark on the last inspected POI ── */}
                        {room.lastRemark !== null && (
                            <View style={styles.remarkStrip} testID="labyrinth-remark">
                                <Text style={styles.remarkText}>“{room.lastRemark.remark}”</Text>
                                {room.lastRemark.pickupLine !== null && (
                                    <Text style={styles.pickupText}>{room.lastRemark.pickupLine}</Text>
                                )}
                                {room.lastRemark.trapLine !== null && (
                                    <Text style={styles.trapText}>{room.lastRemark.trapLine}</Text>
                                )}
                            </View>
                        )}

                        {/* ── Door confirm strip ── */}
                        {selectedDoor !== null && (
                            <View style={styles.confirmStrip} testID="labyrinth-door-confirm">
                                <Text style={styles.confirmText}>
                                    {selectedDoor.gated
                                        ? LABYRINTH_COPY.gatedDoorLine
                                        : `${LABYRINTH_COPY.doorConfirmTitle} — ${selectedDoor.display}`}
                                </Text>
                                <View style={styles.confirmButtons}>
                                    {!selectedDoor.gated && (
                                        <Pressable
                                            onPress={confirmMove}
                                            style={styles.confirmGo}
                                            testID="labyrinth-door-walk"
                                        >
                                            <Text style={styles.confirmGoText}>{LABYRINTH_COPY.doorGo}</Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={() => setSelectedDoor(null)}
                                        style={styles.confirmStay}
                                        testID="labyrinth-door-stay"
                                    >
                                        <Text style={styles.confirmStayText}>{LABYRINTH_COPY.doorStay}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* ── Gate of Assent sockets ── */}
                        {room.gate !== null && (
                            <ScrollView style={styles.sheet}>
                                <GateSockets
                                    gate={room.gate}
                                    pocket={room.pocket}
                                    resultLine={gateLine}
                                    onSubmit={(words) => {
                                        const result = actions.labyrinthSubmitGate(words);
                                        if (!result) return;
                                        setGateLine(
                                            result.ok
                                                ? result.line
                                                : `${result.line} ${LABYRINTH_COPY.gateLedgerNote}`,
                                        );
                                    }}
                                />
                            </ScrollView>
                        )}

                        {/* ── Boss room: the reckoning precedes the fight ── */}
                        {finaleVm !== null && (
                            <ScrollView style={styles.sheet}>
                                <FinalePanel
                                    vm={finaleVm}
                                    onFight={() => actions.labyrinthBeginBossEvent()}
                                    onSpeakName={(spoken) => actions.labyrinthSpeakName(spoken)}
                                />
                            </ScrollView>
                        )}
                    </View>

                    <View style={styles.accordionWrap}>
                        <LabyrinthAccordion
                            room={room}
                            hintLine={hintLine}
                            onBuyHint={(tier) => {
                                const bought = actions.labyrinthBuyHint(tier);
                                setHintLine(bought ? bought.line : LABYRINTH_COPY.hintBroke);
                            }}
                            onSettleDebt={
                                room.settle && room.settle.canAfford
                                    ? () => actions.labyrinthSettleDebt(1)
                                    : null
                            }
                        />
                    </View>
                </View>

            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1 },
    selectRoot: {
        flex: 1,
        padding: 20,
        gap: 12,
        justifyContent: 'center',
    },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 34,
        color: AXM.parchment,
        textAlign: 'center',
    },
    sub: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        lineHeight: 20,
        color: AXM.bone,
        textAlign: 'center',
    },
    warning: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.sulfur,
        textAlign: 'center',
        marginBottom: 8,
    },
    actCard: {
        borderWidth: 1,
        borderColor: AXM.ash,
        padding: 14,
        gap: 4,
    },
    actTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 20,
        color: AXM.parchment,
    },
    actRiddle: {
        fontFamily: FONTS.serif,
        fontSize: 12,
        fontStyle: 'italic',
        color: AXM.bone,
    },
    actEnter: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2,
        color: AXM.sulfur,
        marginTop: 4,
    },
    leaveButton: {
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: AXM.ash,
        marginTop: 8,
    },
    leaveText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2,
        color: AXM.bone,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    headerTitle: {
        flex: 1,
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: AXM.parchment,
        textAlign: 'center',
    },
    headerAction: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2,
        color: AXM.sulfur,
    },
    sceneArea: {
        flex: 1,
        marginHorizontal: 10,
        marginBottom: 10,
    },
    mapWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: AXM.ash,
    },
    // Strips float over the canvas foot, clear of the accordion strip.
    overlayStack: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 54,
        gap: 8,
    },
    accordionWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    sheet: {
        maxHeight: 420,
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    toast: {
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.panelBg,
        padding: 10,
    },
    toastText: {
        fontFamily: FONTS.serif,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.sulfur,
    },
    remarkStrip: {
        borderLeftWidth: 3,
        borderLeftColor: AXM.rust,
        backgroundColor: AXM.panelBg,
        paddingLeft: 10,
        paddingRight: 8,
        paddingVertical: 6,
        gap: 3,
    },
    remarkText: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        lineHeight: 20,
        color: AXM.parchment,
    },
    pickupText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 1,
        color: AXM.sulfur,
    },
    trapText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 1,
        color: AXM.blood,
    },
    confirmStrip: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 10,
        gap: 8,
    },
    confirmText: {
        fontFamily: FONTS.serif,
        fontSize: 14,
        color: AXM.parchment,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    confirmGo: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        paddingVertical: 8,
        alignItems: 'center',
    },
    confirmGoText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2,
        color: AXM.sulfur,
    },
    confirmStay: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingVertical: 8,
        alignItems: 'center',
    },
    confirmStayText: {
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2,
        color: AXM.bone,
    },
}));
