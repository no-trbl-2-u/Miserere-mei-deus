/**
 * /event — the generic paced-event card.
 *
 * Every event kind has a dedicated surface: a seated dialogue →
 * /dialogue, village → /village, cutscene → /cutscene; rest /
 * loot-cache / hazard are intercepted in `resolveCurrentMapEventAction`
 * and launch minigame sessions; encounters are engaged by
 * `<CombatGate>` onto `/combat-encounter`. This screen was the
 * GATHERING acknowledgement; the gathering kind is cut (NK1a), so
 * `selectPacedEventRoute` no longer mounts it and nothing in play reaches
 * it. Deleting it is a follow-up once confirmed unused.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { ActionIcon } from '@/components/ActionIcon';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { Splatter } from '@/components/Splatter';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { consequenceLabel, visibleConsequences } from '@/state/presenters/consequence-copy';
import {
    selectEventViewModel,
    selectHasActiveEvent,
    type EventChoice,
    type EventConsequence,
    type ChoiceAccentKey,
} from '@/state/presenters/event.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { Palette } from '@/theme/palette';

import { EventArt } from '@/components/event/EventArt';

function resolveAccent(key: ChoiceAccentKey, AXM: Palette): string {
    if (key === 'blood') return AXM.blood;
    if (key === 'sulfur') return AXM.sulfur;
    if (key === 'parchment') return AXM.parchment;
    if (key === 'rust') return AXM.rust;
    return AXM.bone;
}

function ConsequenceChips({ consequences }: { consequences: readonly EventConsequence[] }) {
    const styles = useStyles();
    // Same as the sibling row in app/dialogue — filter unlabelled
    // consequences before slicing so the overflow count stays honest.
    const visible = visibleConsequences(consequences);
    if (visible.length === 0) return null;
    const shown = visible.slice(0, 3);
    const overflow = visible.length - shown.length;
    return (
        <View style={styles.chipRow} testID="event-consequence-chips">
            {shown.map((c, i) => (
                <Text key={i} style={styles.chip}>
                    {consequenceLabel(c)}
                </Text>
            ))}
            {overflow > 0 && (
                <Text style={styles.chip}>{`+${overflow} more`}</Text>
            )}
        </View>
    );
}

function ChoiceRow({
    choice,
    isFirst,
    onPress,
}: {
    choice: EventChoice;
    isFirst: boolean;
    onPress: () => void;
}) {
    const styles = useStyles();
    const AXM = usePalette();
    const accent = resolveAccent(choice.accentKey, AXM);
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${choice.label}, ${choice.description}`}
            accessibilityState={{ disabled: !choice.enabled }}
            disabled={!choice.enabled}
            onPress={onPress}
            style={[
                styles.choiceRow,
                {
                    borderColor: accent,
                    backgroundColor: isFirst ? AXM.selectFill : AXM.bg,
                    opacity: choice.enabled ? 1 : 0.4,
                },
            ]}
            testID={`event-choice-${choice.id}`}
        >
            <ActionIcon kind={choice.iconKey} size={24} color={accent} />
            <View style={styles.flexOne}>
                <Text style={styles.choiceLabel}>{choice.label}</Text>
                {choice.description.length > 0 &&
                    choice.description.toUpperCase() !== choice.label && (
                        <Text style={styles.choiceSub}>{choice.description}</Text>
                    )}
                <ConsequenceChips consequences={choice.consequences} />
            </View>
            <Text style={[styles.choiceArrow, { color: accent }]}>›</Text>
        </TouchableOpacity>
    );
}

export default function EventScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    // Subscribe to stable slices to avoid getSnapshot identity churn:
    // selectEventViewModel returns a frozen new object every call, which
    // would loop useSyncExternalStore if used directly as a selector.
    // The screen pulls the underlying slices and memos the VM downstream.
    const slice = useGameState((s) => s.event);
    const quests = useGameState((s) => s.quests);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(
        () => selectEventViewModel({ event: slice, quests, flags } as never),
        [slice, quests, flags],
    );
    const hasEvent = useMemo(
        () => selectHasActiveEvent({ event: slice } as never),
        [slice],
    );
    const actions = useGameActions();
    const router = useRouter();

    const onPick = (choiceId: string) => {
        actions.pickEventChoice(choiceId);
    };

    const onSkip = () => {
        actions.dismissEvent();
    };

    const onBack = () => {
        router.back();
    };

    // Auto-close the modal when the event slice clears (e.g. after a
    // pick that resolves the pending event, or a skip).
    useEffect(() => {
        if (!hasEvent && router.canGoBack()) {
            router.back();
        }
    }, [hasEvent, router]);

    const isBoss = vm.variant === 'boss';
    const illustrationHeight = isBoss ? 360 : 320;
    const badgeAccent = resolveAccent(vm.badgeAccentKey, AXM);
    const preludeChrome = vm.preludeChrome;

    if (!hasEvent) {
        return (
            <ScreenBg art="event">
                <View style={styles.emptyArea} testID="event-empty">
                    <Text style={styles.eventTitle}>{vm.title}</Text>
                    <Text style={styles.bodyText}>{vm.body}</Text>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        onPress={onBack}
                        style={[styles.choiceRow, { borderColor: AXM.bone, backgroundColor: AXM.bg }]}
                        testID="event-choice-back"
                    >
                        <ActionIcon kind="flee" size={24} color={AXM.bone} />
                        <View style={styles.flexOne}>
                            <Text style={styles.choiceLabel}>{vm.chrome.emptyBackLabel}</Text>
                            <Text style={styles.choiceSub}>{vm.chrome.emptyBackSub}</Text>
                        </View>
                        <Text style={[styles.choiceArrow, { color: AXM.bone }]}>›</Text>
                    </TouchableOpacity>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg art="event">
            {preludeChrome !== null && (
                <View style={styles.preludeHeader} testID="event-prelude-header">
                    <Text style={styles.preludeHeaderText}>▲ {preludeChrome.eyebrow}</Text>
                </View>
            )}
            <View style={[styles.illustration, { height: illustrationHeight }]}>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: AXM.deepBg }]} />
                <EventArt slug={vm.artSlug} />
                {preludeChrome !== null ? (
                    <View style={styles.strifeSash} testID="event-strife-sash">
                        <Text style={styles.strifeSashText}>{preludeChrome.sashLabel}</Text>
                    </View>
                ) : (
                    <View style={styles.badge}>
                        <Text
                            style={[styles.badgeText, { color: badgeAccent, borderColor: badgeAccent }]}
                        >
                            {isBoss ? '☠ ' : '✠ '}
                            {vm.badge}
                        </Text>
                    </View>
                )}
                <Splatter
                    color={AXM.blood}
                    size={180}
                    seed={45}
                    style={[styles.splatterPosition, { opacity: isBoss ? 0.7 : 0.5 }]}
                />
            </View>

            <View style={styles.titleArea}>
                <Text style={[styles.eventTitle, isBoss && styles.eventTitleBoss]}>{vm.title}</Text>
                {vm.subtitle.length > 0 && (
                    <Text style={styles.eventSub}>— {vm.subtitle}</Text>
                )}
            </View>

            <View style={styles.body}>
                <Text style={styles.bodyText}>
                    {vm.body.length > 0 && (
                        <>
                            <Text style={styles.dropCap}>{vm.body[0]}</Text>
                            {vm.body.slice(1)}
                        </>
                    )}
                </Text>
                {vm.lore !== null && (
                    <View style={styles.loreBox}>
                        <Text style={styles.loreText}>{vm.lore}</Text>
                    </View>
                )}
                {vm.canSkip && (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Skip"
                        onPress={onSkip}
                        style={styles.skipBtn}
                        testID="event-skip"
                    >
                        <Text style={styles.skipText}>{vm.chrome.skipLabel}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.choices}>
                <SectionLabel size={10} style={{ marginBottom: 6 }}>
                    {vm.chrome.reckoningEyebrow}
                </SectionLabel>
                {vm.choices.map((choice, i) => (
                    <ChoiceRow
                        key={choice.id}
                        choice={choice}
                        isFirst={i === 0}
                        onPress={() => onPick(choice.id)}
                    />
                ))}
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    illustration: { margin: 8, marginTop: 0, position: 'relative', overflow: 'hidden' },
    preludeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: AXM.divider,
    },
    preludeHeaderText: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 2.2,
        color: AXM.blood,
    },
    strifeSash: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: AXM.blood,
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: 14,
        paddingRight: 18,
    },
    strifeSashText: {
        fontFamily: FONTS.sans,
        fontSize: 10,
        letterSpacing: 1.4,
        color: AXM.bg,
    },
    badge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: AXM.bg,
        borderWidth: 2,
        borderColor: AXM.blood,
    },
    badgeText: { fontFamily: FONTS.gothic, fontSize: 14, letterSpacing: 2 },
    titleArea: { paddingHorizontal: 14, paddingTop: 8 },
    eventTitle: {
        fontFamily: FONTS.gothic,
        fontSize: 28,
        lineHeight: 30,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    eventTitleBoss: {
        fontSize: 38,
        lineHeight: 40,
        textShadowColor: AXM.blood,
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 0,
    },
    eventSub: { fontFamily: FONTS.serifItalic, fontSize: 11, color: AXM.bone, marginTop: 2 },
    body: { paddingHorizontal: 14, paddingTop: 8 },
    bodyText: { fontFamily: FONTS.serif, fontSize: 12, color: AXM.parchment, lineHeight: 18 },
    dropCap: { fontFamily: FONTS.gothic, fontSize: 36, lineHeight: 34, color: AXM.blood },
    loreBox: {
        marginTop: 8,
        padding: 6,
        paddingHorizontal: 8,
        borderLeftWidth: 2,
        borderLeftColor: AXM.sulfur,
    },
    loreText: {
        fontFamily: FONTS.serifItalic,
        fontSize: 10,
        color: AXM.sulfur,
        lineHeight: 14,
    },
    skipBtn: {
        marginTop: 8,
        alignSelf: 'flex-end',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: AXM.bone,
    },
    skipText: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: 2,
        color: AXM.bone,
    },
    choices: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, gap: 6 },
    choiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 9,
        paddingHorizontal: 12,
        borderWidth: 2,
    },
    choiceLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: AXM.parchment,
        lineHeight: 20,
        letterSpacing: 1.5,
    },
    choiceSub: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.bone,
        letterSpacing: 1,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    choiceArrow: { fontFamily: FONTS.gothic, fontSize: 18 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    chip: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        letterSpacing: 1,
        color: AXM.bone,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    emptyArea: { padding: 24, gap: 12 },
    flexOne: { flex: 1 },
    splatterPosition: { position: 'absolute', top: -20, right: -30 },
}));
