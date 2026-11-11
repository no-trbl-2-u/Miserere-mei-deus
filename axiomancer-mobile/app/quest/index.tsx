/**
 * /quest - the quest screen.
 *
 * A quest node has no card of the deck's kind: `resolveCurrentMapEvent` opens
 * this screen on it. It shows one tall quest card (the step's name, the
 * giver's figure, the ask, the pay), then the giver's name and line, the
 * chain's four beads and the brass buttons, per stage the engine reads off the
 * quest log: `offer` (LEAVE, ACCEPT), `turn-in` (the finished step and TURN IN,
 * then the next offer on the same screen), `waiting` (LEAVE) and `locked` (the
 * refusal and LEAVE). All rules live in `axiomancer-mechanics`
 * (`World/questline.ts`); this screen renders the presenter VM and dispatches
 * store actions only. The map shows none of this.
 *
 * A `card-pick` the pay rolled opens the spoils tiles over the screen, the way
 * a fight's reward does (TAKE CARD, or take nothing).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { BrassButton } from '@/components/experience/BrassButton';
import { QuestBeads } from '@/components/quest/QuestBeads';
import { QuestCard } from '@/components/quest/QuestCard';
import { RelicRise } from '@/components/quest/QuestGiverScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { rewardCardVMs } from '@/state/presenters/combat-encounter.engine';
import { selectHasActiveQuest, selectQuestVM } from '@/state/presenters/quest.engine';
import {
    QUEST_ACCEPT_LABEL,
    QUEST_LEAVE_LABEL,
    QUEST_PAID_HEAD,
    QUEST_TURN_IN_LABEL,
    questShillingsLine,
    questXpLine,
} from '@/state/presenters/quest.copy';
import { KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The vellum panel the paid ledger wears (Q-01); the card itself is not a panel. */
const [PANEL] = PLACE_PIECES['Q-01'];
const WANTS_KIT = lookOf('Q-01') !== 'normal';

/** The card's shape: width over height, and its widest extent in points. */
const CARD_RATIO = 0.62;
const CARD_MAX_WIDTH = 340;
/** Before the first layout pass (and in a test, which never lays out). */
const CARD_FALLBACK = { width: 260, height: 420 };

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
    const [size, setSize] = useState(CARD_FALLBACK);

    useEffect(() => {
        if (!active && router.canGoBack()) router.back();
    }, [active, router]);

    if (!active) {
        return (
            <ScreenBg scrollable={false}>
                <View style={styles.inactiveWrap} testID="quest-inactive">
                    <Text style={styles.inactiveText}>No one is waiting here.</Text>
                </View>
            </ScreenBg>
        );
    }

    const onWrapLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (width <= 0 || height <= 0) return;
        const w = Math.round(Math.min(width, CARD_MAX_WIDTH, height * CARD_RATIO));
        const h = Math.round(height);
        setSize(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    // An offer already accepted reads as the work in progress.
    const accepted = vm.stage === 'offer' && vm.ahead !== null && vm.ahead.status !== 'unaccepted';
    const underway = vm.stage === 'waiting' || accepted;
    const cardTestID = vm.stage === 'waiting' ? 'quest-waiting'
        : vm.stage === 'turn-in' ? 'quest-turn-in'
            : vm.stage === 'locked' ? 'quest-locked' : 'quest-offer';

    return (
        <ScreenBg scrollable={false}>
            <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.scroll}>
                {vm.active && (
                    <View style={styles.column} testID="quest-column">
                        {vm.paid && vm.paid.itemNames.length > 0 && (
                            <RelicRise
                                key={`${vm.paid.step}-${vm.paid.itemNames[0]}`}
                                itemId={vm.paid.itemIds?.[0] ?? null}
                                name={vm.paid.itemNames[0]!}
                                reducedMotion={reducedMotion}
                            />
                        )}

                        {vm.paid && (
                            <KitSurface wear={WANTS_KIT} piece={PANEL} style={WANTS_KIT ? styles.paidKit : styles.paid} testID="quest-paid">
                                <Text style={[styles.paidHead, WANTS_KIT && styles.paidHeadKit]}>{QUEST_PAID_HEAD}</Text>
                                <Text style={[styles.paidTitle, { color: WANTS_KIT ? HUE.hzForceInk : AXM.sulfur }]}>{vm.paid.questName}</Text>
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

                        <View style={styles.cardWrap} onLayout={onWrapLayout}>
                            {vm.card && (
                                <QuestCard
                                    step={vm.card}
                                    pay={vm.pay}
                                    giver={vm.giver}
                                    turnedAway={vm.stage === 'locked'}
                                    underway={underway}
                                    width={size.width}
                                    height={size.height}
                                    testID={cardTestID}
                                />
                            )}
                        </View>

                        {vm.giver && (
                            <Text style={styles.giverName} testID="quest-giver-name">{vm.giver.name}</Text>
                        )}
                        {vm.stage === 'locked' ? (
                            <Text style={styles.line} testID="quest-locked-line">{vm.lockedLine}</Text>
                        ) : (
                            <Text style={styles.line} testID="quest-giver-line">{vm.giverLine}</Text>
                        )}

                        <QuestBeads beads={vm.beads} />

                        <View style={styles.buttons}>
                            <BrassButton
                                label={QUEST_LEAVE_LABEL}
                                accessibilityLabel="Leave"
                                align="center"
                                onPress={actions.closeQuest}
                                style={styles.button}
                                testID="quest-leave-button"
                            />
                            {vm.stage === 'turn-in' && (
                                <BrassButton
                                    label={QUEST_TURN_IN_LABEL}
                                    accessibilityLabel="Turn in the finished work"
                                    align="center"
                                    onPress={actions.turnInQuestStep}
                                    style={styles.button}
                                    testID="quest-turn-in-button"
                                />
                            )}
                            {vm.stage === 'offer' && vm.canAccept && (
                                <BrassButton
                                    label={QUEST_ACCEPT_LABEL}
                                    accessibilityLabel="Accept the work"
                                    align="center"
                                    onPress={actions.acceptQuestStep}
                                    style={styles.button}
                                    testID="quest-accept-button"
                                />
                            )}
                        </View>
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
    scroll: { padding: 14, paddingBottom: 18, flexGrow: 1 },
    column: { flex: 1, width: '100%', maxWidth: QUEST_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    // The card takes whatever height the name, line, beads and buttons leave.
    cardWrap: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center' },
    giverName: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 24,
        lineHeight: 28,
        color: AXM.parchment,
        textAlign: 'center',
        marginTop: 10,
    },
    line: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.parchment,
        textAlign: 'center',
        marginTop: 4,
    },
    buttons: { flexDirection: 'row', gap: 10 },
    button: { flex: 1 },
    paid: {
        borderWidth: 2,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 12,
        marginBottom: 10,
    },
    // Worn on the vellum panel: padding that clears its drawn corners.
    paidKit: { paddingVertical: 30, paddingHorizontal: 44, marginBottom: 10 },
    paidHead: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginBottom: 4,
    },
    paidHeadKit: { color: HUE.hzCardInk2 },
    paidTitle: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 20,
        lineHeight: 24,
        marginBottom: 6,
    },
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
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
