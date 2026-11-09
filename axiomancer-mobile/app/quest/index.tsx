/**
 * /quest - the quest screen (phase QL1c).
 *
 * A quest node has no card: `resolveCurrentMapEvent` opens this screen on it.
 * It shows the giver's line, "Step n of N", the requirement, the progress and
 * the pay, per stage the engine reads off the quest log: `offer` (ACCEPT and
 * LEAVE), `turn-in` (the finished step with its pay and TURN IN, then the next
 * offer on the same screen), `waiting` (progress and LEAVE) and `locked` (one
 * line and LEAVE). All rules live in `axiomancer-mechanics`
 * (`World/questline.ts`); this screen renders the presenter VM and dispatches
 * store actions only. The map shows none of this.
 *
 * A `card-pick` the pay rolled opens the spoils tiles over the screen, the way
 * a fight's reward does (TAKE CARD, or take nothing).
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { QuestGiverScene, RelicRise } from '@/components/quest/QuestGiverScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { selectHasActiveQuest, selectQuestVM, type QuestStepVM } from '@/state/presenters/quest.engine';
import {
    QUEST_ACCEPT_LABEL,
    QUEST_ACCEPTED_LINE,
    QUEST_EYEBROW,
    QUEST_LEAVE_LABEL,
    QUEST_OFFER_HEAD,
    QUEST_PAID_HEAD,
    QUEST_TURN_IN_HEAD,
    QUEST_TURN_IN_LABEL,
    QUEST_WAITING_HEAD,
    questShillingsLine,
    questXpLine,
} from '@/state/presenters/quest.copy';
import { KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The vellum panel the quest's cards wear (Q-01). */
const [PANEL] = PLACE_PIECES['Q-01'];
const WANTS_KIT = lookOf('Q-01') !== 'normal';

function StepBlock({ head, step, testID }: { head: string; step: QuestStepVM; testID: string }) {
    const styles = useStyles();
    return (
        <KitSurface wear={WANTS_KIT} piece={PANEL} style={WANTS_KIT ? styles.cardKit : styles.card} testID={testID}>
            <Text style={[styles.eyebrow, WANTS_KIT && styles.eyebrowKit]}>{head}</Text>
            <Text style={[styles.cardTitle, WANTS_KIT && styles.cardTitleKit]}>{step.name}</Text>
            {step.objectives.map(o => (
                <View key={o.id} style={styles.objectiveRow} testID={`${testID}-objective-${o.id}`}>
                    <Text style={[styles.body, WANTS_KIT && styles.bodyKit]}>{o.description}</Text>
                    {o.progress !== '' && (
                        <Text
                            style={[
                                styles.progress,
                                WANTS_KIT && styles.progressKit,
                                o.done && styles.progressDone,
                                o.done && WANTS_KIT && styles.progressDoneKit,
                            ]}
                        >
                            {o.progress}
                        </Text>
                    )}
                </View>
            ))}
        </KitSurface>
    );
}

export default function QuestScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState(s => s.quest);
    const quests = useGameState(s => s.quests);
    const baseStats = useGameState(s => s.player?.baseStats);
    const active = useGameState(selectHasActiveQuest);
    const vm = useMemo(() => selectQuestVM({ quest: slice, quests }), [slice, quests]);
    const actions = useGameActions();
    const router = useRouter();
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (!active && router.canGoBack()) router.back();
    }, [active, router]);

    if (!active) {
        return (
            <ScreenBg scrollable={false} art="event">
                <View style={styles.inactiveWrap} testID="quest-inactive">
                    <Text style={styles.inactiveText}>No one is waiting here.</Text>
                </View>
            </ScreenBg>
        );
    }

    const accepted = vm.stage === 'offer' && vm.ahead !== null && vm.ahead.status !== 'unaccepted';

    return (
        <ScreenBg scrollable={false} art="event">
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                {vm.active && (
                    <View style={styles.column} testID="quest-column">
                        <Text style={styles.eyebrow}>{QUEST_EYEBROW}</Text>
                        <Text style={styles.title} testID="quest-step-eyebrow">{vm.eyebrow}</Text>
                        {vm.giver && (
                            <QuestGiverScene giver={vm.giver} turnedAway={vm.stage === 'locked'} />
                        )}
                        {vm.stage !== 'locked' && (
                            <Text style={styles.body} testID="quest-giver-line">{vm.giverLine}</Text>
                        )}

                        {vm.paid && vm.paid.itemNames.length > 0 && (
                            <RelicRise
                                key={`${vm.paid.step}-${vm.paid.itemNames[0]}`}
                                itemId={vm.paid.itemIds?.[0] ?? null}
                                name={vm.paid.itemNames[0]!}
                                reducedMotion={reducedMotion}
                            />
                        )}

                        {vm.paid && (
                            <KitSurface wear={WANTS_KIT} piece={PANEL} style={WANTS_KIT ? styles.cardKit : styles.card} testID="quest-paid">
                                <Text style={[styles.eyebrow, WANTS_KIT && styles.eyebrowKit]}>{QUEST_PAID_HEAD}</Text>
                                <Text style={[styles.cardTitle, { color: WANTS_KIT ? HUE.hzForceInk : AXM.sulfur }]}>{vm.paid.questName}</Text>
                                <View style={styles.chipRow}>
                                    {vm.paid.experience > 0 && (
                                        <Text style={[styles.chip, WANTS_KIT && styles.chipKit]}>{questXpLine(vm.paid.experience)}</Text>
                                    )}
                                    {vm.paid.currency > 0 && (
                                        <Text style={[styles.chip, WANTS_KIT && styles.chipKit]}>{questShillingsLine(vm.paid.currency)}</Text>
                                    )}
                                    {/* The first item rises into view above; the rest ride as chips. */}
                                    {vm.paid.itemNames.slice(1).map(name => (
                                        <Text key={name} style={[styles.chip, WANTS_KIT && styles.chipKit]}>{name}</Text>
                                    ))}
                                </View>
                            </KitSurface>
                        )}

                        {vm.stage === 'locked' && (
                            <Text style={styles.body} testID="quest-locked-line">{vm.lockedLine}</Text>
                        )}

                        {vm.stage === 'waiting' && vm.behind && (
                            <StepBlock head={QUEST_WAITING_HEAD} step={vm.behind} testID="quest-waiting" />
                        )}

                        {vm.stage === 'turn-in' && vm.behind && (
                            <>
                                <StepBlock head={QUEST_TURN_IN_HEAD} step={vm.behind} testID="quest-turn-in" />
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel="Turn in the finished work"
                                    onPress={actions.turnInQuestStep}
                                    style={styles.bigButton}
                                    testID="quest-turn-in-button"
                                >
                                    <Text style={styles.bigButtonText}>{QUEST_TURN_IN_LABEL}</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {vm.stage === 'offer' && vm.ahead && (
                            <>
                                <StepBlock head={QUEST_OFFER_HEAD} step={vm.ahead} testID="quest-offer" />
                                {accepted && (
                                    <Text style={styles.body} testID="quest-accepted-line">{QUEST_ACCEPTED_LINE}</Text>
                                )}
                                {vm.canAccept && (
                                    <TouchableOpacity
                                        accessibilityRole="button"
                                        accessibilityLabel="Accept the work"
                                        onPress={actions.acceptQuestStep}
                                        style={styles.bigButton}
                                        testID="quest-accept-button"
                                    >
                                        <Text style={styles.bigButtonText}>{QUEST_ACCEPT_LABEL}</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Leave"
                            onPress={actions.closeQuest}
                            style={[styles.bigButton, styles.leaveButton]}
                            testID="quest-leave-button"
                        >
                            <Text style={[styles.bigButtonText, { color: AXM.bone }]}>{QUEST_LEAVE_LABEL}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {vm.cardOffers.length > 0 && (
                <CombatRewardsOverlay
                    offers={rewardCardVMs([...vm.cardOffers], baseStats)}
                    onPick={actions.claimQuestCard}
                />
            )}
        </ScreenBg>
    );
}

/** The quest column's widest extent, in points (the rest column's width). */
export const QUEST_COLUMN_MAX_WIDTH = 520;

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    scroll: { padding: 14, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    column: { width: '100%', maxWidth: QUEST_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginTop: 6,
        marginBottom: 4,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 24,
        lineHeight: 28,
        color: AXM.parchment,
        marginBottom: 10,
    },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        marginBottom: 8,
    },
    card: {
        borderWidth: 2,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 12,
        marginBottom: 10,
    },
    // Worn on the vellum panel instead of `card`: padding that clears its
    // drawn corners (about 26 high, 42 wide).
    cardKit: {
        paddingVertical: 30,
        paddingHorizontal: 44,
        marginBottom: 10,
    },
    eyebrowKit: { color: HUE.hzCardInk2 },
    bodyKit: { flex: 1, color: HUE.hzCardInk },
    cardTitle: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 20,
        lineHeight: 24,
        color: AXM.parchment,
        marginBottom: 6,
    },
    cardTitleKit: { color: HUE.hzCardInk },
    objectiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
    progress: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 13, color: AXM.bone },
    progressKit: { color: HUE.hzCardInk2 },
    progressDone: { color: AXM.sulfur },
    progressDoneKit: { color: HUE.hzForceInk },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chip: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 12,
        color: AXM.parchment,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    chipKit: { color: HUE.hzCardInk, borderColor: HUE.hzCardEdge },
    bigButton: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        marginTop: 4,
        marginBottom: 8,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: AXM.bg,
    },
    leaveButton: { borderColor: AXM.ash },
    bigButtonText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 18, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
