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
import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { selectHasActiveQuest, selectQuestVM, type QuestStepVM } from '@/state/presenters/quest.engine';
import {
    QUEST_ACCEPT_LABEL,
    QUEST_ACCEPTED_LINE,
    QUEST_EYEBROW,
    QUEST_LEAVE_LABEL,
    QUEST_LOCKED_LINE,
    QUEST_OFFER_HEAD,
    QUEST_PAID_HEAD,
    QUEST_REWARDS_HEAD,
    QUEST_TURN_IN_HEAD,
    QUEST_TURN_IN_LABEL,
    QUEST_WAITING_HEAD,
    questShillingsLine,
    questXpLine,
} from '@/state/presenters/quest.copy';
import { FONTS, TYPE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

function StepBlock({ head, step, testID }: { head: string; step: QuestStepVM; testID: string }) {
    const styles = useStyles();
    return (
        <View style={styles.card} testID={testID}>
            <Text style={styles.eyebrow}>{head}</Text>
            <Text style={styles.cardTitle}>{step.name}</Text>
            {step.objectives.map(o => (
                <View key={o.id} style={styles.objectiveRow} testID={`${testID}-objective-${o.id}`}>
                    <Text style={styles.body}>{o.description}</Text>
                    <Text style={[styles.progress, o.done && styles.progressDone]}>{o.progress}</Text>
                </View>
            ))}
            <Text style={styles.eyebrow}>{QUEST_REWARDS_HEAD}</Text>
            {step.rewards.map(line => (
                <Text key={line} style={styles.rewardLine}>{line}</Text>
            ))}
        </View>
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
                        <Text style={styles.body} testID="quest-giver-line">{vm.giverLine}</Text>

                        {vm.paid && (
                            <View style={styles.card} testID="quest-paid">
                                <Text style={styles.eyebrow}>{QUEST_PAID_HEAD}</Text>
                                <Text style={[styles.cardTitle, { color: AXM.sulfur }]}>{vm.paid.questName}</Text>
                                <View style={styles.chipRow}>
                                    {vm.paid.experience > 0 && (
                                        <Text style={styles.chip}>{questXpLine(vm.paid.experience)}</Text>
                                    )}
                                    {vm.paid.currency > 0 && (
                                        <Text style={styles.chip}>{questShillingsLine(vm.paid.currency)}</Text>
                                    )}
                                    {vm.paid.itemNames.map(name => (
                                        <Text key={name} style={styles.chip}>{name}</Text>
                                    ))}
                                </View>
                            </View>
                        )}

                        {vm.stage === 'locked' && (
                            <Text style={styles.body} testID="quest-locked-line">{QUEST_LOCKED_LINE}</Text>
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
        fontFamily: FONTS.sans,
        fontSize: 12,
        letterSpacing: 2.2,
        color: AXM.bone,
        marginTop: 6,
        marginBottom: 4,
    },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 24,
        lineHeight: 28,
        color: AXM.parchment,
        marginBottom: 10,
    },
    body: {
        fontFamily: FONTS.serif,
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
    cardTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 20,
        lineHeight: 24,
        color: AXM.parchment,
        marginBottom: 6,
    },
    objectiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
    progress: { fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 1, color: AXM.bone },
    progressDone: { color: AXM.sulfur },
    rewardLine: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.sulfur, marginBottom: 2 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chip: {
        fontFamily: FONTS.mono,
        fontSize: 12,
        letterSpacing: 1,
        color: AXM.parchment,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
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
    bigButtonText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 2, color: AXM.sulfur },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { ...TYPE.body, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
