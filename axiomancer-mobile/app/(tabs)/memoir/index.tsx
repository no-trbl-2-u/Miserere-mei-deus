import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { AxmIcon } from '@/components/icons';
import { SectionLabel } from '@/components/SectionLabel';
import { KitDivider, KitHeader, VELLUM_INK } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { useGameState, useGameStore } from '@/state/GameStoreProvider';
import {
    selectMemoirViewModel,
    type MemoirQuestRow,
    type MemoirViewModel,
} from '@/state/presenters/memoir.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

const LEDGER_VELLUM = lookOf('L-01') === 'vellum';

/**
 * A Ledger section heading: on its vellum plate, inked in oxblood, where T
 * kept the kit (L-01), else today's label. The vellum set's leaf stands where
 * brass has its quatrefoil, so the errands heading passes `quatrefoil`.
 */
function LedgerHeading({ children, variant = 'star', right }: { children: string; variant?: 'star' | 'quatrefoil'; right?: React.ReactNode }) {
    if (LEDGER_VELLUM) return <KitHeader look="vellum" variant={variant} right={right}>{children}</KitHeader>;
    return <SectionLabel size={10}>{children}</SectionLabel>;
}

function QuestCard({ quest }: { quest: MemoirQuestRow }) {
    const styles = useStyles();
    return (
        // Wrap the whole card in a TooltipTarget pointing at the
        // kind:'quest-objective' content keyed by quest status.
        // Tap explains what a quest in that state means.
        <TooltipTarget
            kind="quest-objective"
            id={quest.status}
            accessibilityLabel={`Explain ${quest.status} quest`}
            accessibilityHint="tap to read description"
            testID={`memoir-quest-${quest.id}-tooltip`}
        >
            <View
                style={[
                    styles.questCard,
                    quest.status === 'completed' && styles.questCardCompleted,
                ]}
                testID={`memoir-quest-${quest.id}`}
            >
                <Text style={styles.questName}>{quest.name}</Text>
                {quest.description.length > 0 && (
                    <Text style={styles.questDescription}>{quest.description}</Text>
                )}
                {quest.objectives.length > 0 && (
                    <View style={styles.objectiveList}>
                        {quest.objectives.map((o) => (
                            <Text
                                key={o.id}
                                style={[styles.objectiveLine, o.done && styles.objectiveDone]}
                            >
                                {o.bullet} {o.text}
                            </Text>
                        ))}
                    </View>
                )}
            </View>
        </TooltipTarget>
    );
}

/**
 * MEMOIR screen — read-only journal surface: the chronicle, quest
 * cards from `state.quests`, and the remains, with presenter-sourced
 * empty-state copy.
 *
 * Subscribes to slim slices and memo's the VM — `useGameState(selectMemoirViewModel)` would churn
 * `useSyncExternalStore` because the VM is a frozen-new object
 * every call.
 *
 * Inputs: none (reads store slices via hooks). Output: the chronicle /
 * errands / remains screen element.
 */
export default function MemoirScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const store = useGameStore();
    const player = useGameState((s) => s.player);
    const quests = useGameState((s) => s.quests);

    // Acknowledge any pending quest the moment Memoir
    // renders. The tab badge clears via `selectTabBadges` (which gates
    // on `questAcknowledged`). Mirrors the character screen's
    // level-up acknowledge effect; preserves other notification
    // fields (toast, levelUpAcknowledged).
    useEffect(() => {
        const prev = store.getState().notifications;
        store.setState({
            notifications: { ...prev, questAcknowledged: true },
        });
    }, [store]);
    // Subscribing to `_recentEvents` means the screen rebuilds the
    // chronicle automatically when the ring buffer ticks.
    const recentEvents = useGameState((s) => s._recentEvents);
    // The REMAINS section reads death tombstones + keepsake
    // labels off the durable flags array.
    const flags = useGameState((s) => s.flags);
    const vm = useMemo<MemoirViewModel>(
        () =>
            selectMemoirViewModel({
                player,
                quests,
                _recentEvents: recentEvents,
                flags,
            } as never),
        [player, quests, recentEvents, flags],
    );

    return (
        <ScreenBg>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <SectionLabel size={10} color={AXM.bone}>
                        {vm.headerEyebrow}
                    </SectionLabel>
                    <Text style={styles.subline}>{vm.headerSubline}</Text>
                </View>

                {/* Chronicle */}
                <View style={styles.section} testID="memoir-chronicle">
                    {LEDGER_VELLUM && <KitDivider piece="divider-ornate-ink" />}
                    <LedgerHeading>{vm.chronicleEyebrow}</LedgerHeading>
                    {vm.chronicle.length === 0 ? (
                        <Text style={styles.emptyLine}>{vm.emptyChronicle}</Text>
                    ) : (
                        vm.chronicle.map((entry) => (
                            // Wrap each chronicle row in a
                            // TooltipTarget pointing at the
                            // kind:'chronicle-entry' content keyed by
                            // engine event type.
                            <TooltipTarget
                                key={entry.id}
                                kind="chronicle-entry"
                                id={entry.kind}
                                accessibilityLabel={`Explain ${entry.label} chronicle entry`}
                                accessibilityHint="tap to read description"
                                testID={`memoir-chronicle-${entry.id}-tooltip`}
                            >
                                <View style={styles.chronicleRow}>
                                    <Text style={styles.chronicleLabel}>
                                        {entry.label}
                                    </Text>
                                    <Text style={styles.chronicleBody}>
                                        {entry.body}
                                    </Text>
                                </View>
                            </TooltipTarget>
                        ))
                    )}
                </View>

                {/* Errands */}
                <View style={styles.section} testID="memoir-quests">
                    {LEDGER_VELLUM && <KitDivider piece="divider-plain-ink" />}
                    <LedgerHeading variant="quatrefoil">{vm.questsEyebrow}</LedgerHeading>
                    {vm.quests.active.length === 0 &&
                    vm.quests.completed.length === 0 &&
                    vm.quests.forgotten.length === 0 ? (
                        <Text style={styles.emptyLine}>{vm.emptyQuests}</Text>
                    ) : (
                        <>
                            {vm.quests.active.length > 0 && (
                                <View style={styles.questGroup}>
                                    <SectionLabel size={9} color={AXM.bone}>
                                        {vm.questsActiveEyebrow}
                                    </SectionLabel>
                                    {vm.quests.active.map((q) => (
                                        <QuestCard key={q.id} quest={q} />
                                    ))}
                                </View>
                            )}
                            {vm.quests.completed.length > 0 && (
                                <View style={styles.questGroup}>
                                    <SectionLabel size={9} color={AXM.bone}>
                                        {vm.questsCompletedEyebrow}
                                    </SectionLabel>
                                    {vm.quests.completed.map((q) => (
                                        <QuestCard key={q.id} quest={q} />
                                    ))}
                                </View>
                            )}
                            {vm.quests.forgotten.length > 0 && (
                                <View style={styles.questGroup}>
                                    <SectionLabel size={9} color={AXM.bone}>
                                        {vm.questsForgottenEyebrow}
                                    </SectionLabel>
                                    {vm.quests.forgotten.map((q) => (
                                        <QuestCard key={q.id} quest={q} />
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Remains */}
                <View style={styles.section} testID="memoir-remains">
                    {LEDGER_VELLUM && <KitDivider piece="divider-plain-ink" />}
                    {LEDGER_VELLUM ? (
                        <LedgerHeading right={<AxmIcon name="action-tombstone" size={14} color={VELLUM_INK} />}>
                            {vm.remainsEyebrow}
                        </LedgerHeading>
                    ) : (
                        <View style={styles.remainsEyebrowRow}>
                            <AxmIcon name="action-tombstone" size={14} color={AXM.bone} />
                            <SectionLabel size={10}>{vm.remainsEyebrow}</SectionLabel>
                        </View>
                    )}
                    <Text style={styles.remainsLine} testID="memoir-death-line">
                        {vm.remains.deathLine}
                    </Text>
                    <Text style={styles.remainsLine} testID="memoir-souls-line">
                        {vm.remains.soulsLine}
                    </Text>
                    <View style={styles.questGroup}>
                        <SectionLabel size={9} color={AXM.bone}>
                            {vm.remainsKeepsakesEyebrow}
                        </SectionLabel>
                        {vm.remains.keepsakes.length === 0 ? (
                            <Text style={styles.emptyLine} testID="memoir-keepsakes-empty">
                                {vm.emptyKeepsakes}
                            </Text>
                        ) : (
                            vm.remains.keepsakes.map((label, index) => (
                                <Text
                                    key={`${index}-${label}`}
                                    style={styles.keepsakeLine}
                                    testID={`memoir-keepsake-${index}`}
                                >
                                    {label}
                                </Text>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scroll: { paddingBottom: 32 },
    header: { padding: 14, paddingBottom: 4 },
    subline: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 11,
        color: AXM.bone,
        marginTop: 2,
    },
    remainsEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    section: { padding: 14, paddingTop: 12 },
    emptyLine: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 6,
        textTransform: 'uppercase',
    },
    chronicleRow: {
        marginTop: 6,
        borderLeftWidth: 1,
        borderLeftColor: AXM.ash,
        paddingLeft: 8,
    },
    chronicleLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
    },
    chronicleBody: {
        fontFamily: TYPE_ROLES.entry.fontFamily,
        fontSize: 13,
        color: AXM.parchment,
        lineHeight: 17,
        marginTop: 1,
    },
    questGroup: { marginTop: 6 },
    questCard: {
        marginTop: 4,
        padding: 6,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    questCardCompleted: { opacity: 0.55 },
    questName: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 14,
        color: AXM.parchment,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
    },
    questDescription: {
        fontFamily: TYPE_ROLES.entry.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 2,
        lineHeight: 15,
    },
    objectiveList: { marginTop: 4, gap: 2 },
    objectiveLine: {
        fontFamily: TYPE_ROLES.entry.fontFamily,
        fontSize: 11,
        color: AXM.bone,
    },
    objectiveDone: { color: AXM.sulfur, textDecorationLine: 'line-through' },
    remainsLine: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 12,
        color: AXM.bone,
        marginTop: 6,
        lineHeight: 15,
    },
    keepsakeLine: {
        fontFamily: TYPE_ROLES.entry.fontFamily,
        fontSize: 13,
        color: AXM.parchment,
        marginTop: 4,
        lineHeight: 17,
    },
}));
