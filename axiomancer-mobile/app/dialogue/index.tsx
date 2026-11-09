/**
 * /dialogue — the dedicated NPC interaction screen.
 *
 * Renders the composed event view-model
 * (dialogue-cursor walking, flag/quest gating, consequence
 * chips all live in `state/presenters/event.engine`), with chrome
 * built for a conversation: nameplate, spoken text panel, replies.
 *
 * No map node opens it since NK1a. Its live callers are the staged-dialogue
 * fixture (`StateFixture.stagedDialogue`), the dev jump `seatDialogue`
 * (`state/dev/story-catalog.ts`) and a dialogue choice's
 * `effect.giveQuestStep`. T's flavour follow-up is its next user, so it
 * stays (the generic `/event` card it once sat beside is deleted).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/lib/platform/router';
import { ScrollView, Text, View } from 'react-native';

import { isDialogueAppliedEvent } from '@mechanics';

import { KitPressable, KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import { ScreenBg } from '@/components/ScreenBg';
import { useGameActions, useGameEvents, useGameState } from '@/state/GameStoreProvider';
import { consequenceLabel, visibleConsequences } from '@/state/presenters/consequence-copy';
import { DIALOGUE_EYEBROW, DIALOGUE_INACTIVE_TEXT } from '@/state/presenters/dialogue.copy';
import {
    selectEventViewModel,
    selectHasActiveEvent,
    type EventChoice,
} from '@/state/presenters/event.engine';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The kit pieces the choice rows (E-03) and the spoken-line box (E-02) wear. */
const [ROW_IDLE, ROW_SELECTED, ROW_DISABLED] = PLACE_PIECES['E-03'];
const [SPEECH_PANEL] = PLACE_PIECES['E-02'];
/** Whether each place wears its kit look; `normal` is today's plain box. */
const WANTS_ROW_KIT = lookOf('E-03') !== 'normal';
const WANTS_SPEECH_KIT = lookOf('E-02') !== 'normal';

/** How long the dialogue-confirmation ✓ stays visible. */
const DIALOGUE_CONFIRM_TTL_MS = 500;

/**
 * Widest the words column is allowed to get.
 *
 * Purpose: keep the spoken text at a readable line length on a desktop
 * viewport. Input: none (a constant). Output: the cap applied to the
 * scroll content column; below it the column is simply full-width, so
 * phone layout is unaffected.
 */
const SCENE_MAX_WIDTH = 560;

/**
 * Size of a reply's consequence chip.
 *
 * Purpose: keep the chips as readable as every other description on the
 * screen. Input: none (a constant). Output: the point size the chips share
 * with the rest of the app's description copy.
 */
const CHIP_FONT_SIZE = 12;

/** Preview chips for `choice.consequences`, so a
 *  quest-granting reply (e.g. Old Marrow's "Consider it done.") says
 *  so before the player taps it, not just via the generic ✓ flash. */
function ReplyConsequences({ choice }: { choice: EventChoice }) {
    const styles = useStyles();
    // Drop consequences with no player-facing label (story flags)
    // before slicing, so they neither render an empty chip nor spend one of
    // the three visible slots.
    // The errand a reply starts is told by the reply's own words, so its
    // quest-start chip is dropped.
    const visible = visibleConsequences(choice.consequences).filter((c) => c.kind !== 'quest-start');
    if (visible.length === 0) return null;
    const shown = visible.slice(0, 3);
    const overflow = visible.length - shown.length;
    return (
        <View style={styles.consequenceRow} testID={`dialogue-choice-${choice.id}-consequences`}>
            {shown.map((c, i) => (
                <Text key={i} style={styles.consequenceChip}>
                    {consequenceLabel(c)}
                </Text>
            ))}
            {overflow > 0 && (
                <Text style={styles.consequenceChip}>{`+${overflow} more`}</Text>
            )}
        </View>
    );
}

function ReplyRow({
    choice,
    confirmed,
    onPress,
}: {
    choice: EventChoice;
    confirmed: boolean;
    onPress: () => void;
}) {
    const styles = useStyles();
    return (
        <KitPressable
            wear={WANTS_ROW_KIT}
            plainOpacity
            piece={choice.enabled ? ROW_IDLE : ROW_DISABLED}
            pressedPiece={ROW_SELECTED}
            accessibilityRole="button"
            accessibilityLabel={`${choice.label}, ${choice.description}`}
            accessibilityState={{ disabled: !choice.enabled }}
            disabled={!choice.enabled}
            onPress={onPress}
            style={[
                styles.replyRow,
                WANTS_ROW_KIT ? styles.replyRowKit : styles.replyRowPlain,
                { opacity: choice.enabled ? 1 : WANTS_ROW_KIT ? 0.6 : 0.4 },
            ]}
            testID={`dialogue-choice-${choice.id}`}
        >
            <Text style={styles.replyMark}>—</Text>
            <View style={styles.flexOne}>
                <Text style={styles.replyLabel}>{choice.label}</Text>
                {choice.description.length > 0 &&
                    choice.description.toUpperCase() !== choice.label && (
                        <Text style={styles.replyDesc}>{choice.description}</Text>
                    )}
                <ReplyConsequences choice={choice} />
            </View>
            {confirmed && (
                <Text
                    style={styles.replyConfirm}
                    testID={`dialogue-choice-${choice.id}-confirmed`}
                    accessibilityLiveRegion="polite"
                >
                    ✓
                </Text>
            )}
        </KitPressable>
    );
}

export default function DialogueScreen() {
    const styles = useStyles();
    // Same stable-slice subscription doctrine as the event screen —
    // the presenter returns a fresh frozen object per call.
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

    // When the engine emits `dialogue:applied`, briefly flash a ✓ next
    // to the matching reply so the player sees their pick land before
    // the next dialogue node renders. Component-local state — the
    // flash is intentionally ephemeral.
    const [lastConfirmedChoiceId, setLastConfirmedChoiceId] =
        useState<string | null>(null);
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useGameEvents((event) => {
        if (!isDialogueAppliedEvent(event)) return;
        // The engine dispatches APPLY_DIALOGUE with payload {tree, choice};
        // the emitted event surfaces it via payload.action.payload.choice.
        const payload = event.payload as unknown as {
            action?: { payload?: { choice?: { id?: string } } };
            choice?: { id?: string };
        };
        const choiceId: string | undefined =
            payload?.action?.payload?.choice?.id ?? payload?.choice?.id;
        if (typeof choiceId !== 'string' || choiceId.length === 0) return;
        setLastConfirmedChoiceId(choiceId);
        if (confirmTimerRef.current !== null) {
            clearTimeout(confirmTimerRef.current);
        }
        confirmTimerRef.current = setTimeout(() => {
            setLastConfirmedChoiceId(null);
            confirmTimerRef.current = null;
        }, DIALOGUE_CONFIRM_TTL_MS);
    });

    useEffect(
        () => () => {
            if (confirmTimerRef.current !== null) {
                clearTimeout(confirmTimerRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (!hasEvent && router.canGoBack()) router.back();
    }, [hasEvent, router]);

    // Inactive shell — visible for a frame while the router unwinds; never a
    // blank screen.
    if (!hasEvent) {
        return (
            <ScreenBg scrollable={false} art="dialogue">
                <View style={styles.inactiveWrap} testID="dialogue-inactive">
                    <Text style={styles.inactiveText}>{DIALOGUE_INACTIVE_TEXT}</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg scrollable={false} art="dialogue">
            <ScrollView
                style={styles.scrollOuter}
                contentContainerStyle={styles.scroll}
                testID="dialogue-scroll"
            >
                <Text style={styles.eyebrow}>{DIALOGUE_EYEBROW}</Text>
                <View style={styles.nameplate} testID="dialogue-nameplate">
                    <Text style={styles.name}>{vm.title}</Text>
                    {vm.subtitle.length > 0 && <Text style={styles.subtitle}>{vm.subtitle}</Text>}
                </View>

                <KitSurface
                    wear={WANTS_SPEECH_KIT}
                    piece={SPEECH_PANEL}
                    style={[styles.speech, WANTS_SPEECH_KIT ? styles.speechKit : styles.speechPlain]}
                    testID="dialogue-speech"
                >
                    <Text style={[styles.speechText, WANTS_SPEECH_KIT && styles.speechTextKit]}>{vm.body}</Text>
                </KitSurface>

                {/* The eyebrow heads the reply list, so it only renders when
                  * there are replies. Every node offers one that ends the
                  * talk (`dialogue.exits.engine.test.ts`); there is no
                  * separate leave row. */}
                {vm.choices.length > 0 && (
                    <Text style={styles.sectionLabel}>{vm.chrome.reckoningEyebrow}</Text>
                )}
                {vm.choices.map(choice => (
                    <ReplyRow
                        key={choice.id}
                        choice={choice}
                        confirmed={lastConfirmedChoiceId === choice.id}
                        onPress={() => actions.pickEventChoice(choice.id)}
                    />
                ))}
            </ScrollView>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    scrollOuter: { flex: 1 },
    // Centre the conversation in the viewport so it doesn't sit in a sea
    // of empty black, and cap the column so the spoken text keeps a readable
    // measure on a wide window instead of running edge to edge.
    scroll: {
        padding: 14,
        paddingBottom: 24,
        flexGrow: 1,
        justifyContent: 'center',
        width: '100%',
        maxWidth: SCENE_MAX_WIDTH,
        alignSelf: 'center',
    },
    eyebrow: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        marginBottom: 8,
    },
    nameplate: {
        borderBottomWidth: 2,
        borderBottomColor: AXM.sulfur,
        paddingBottom: 6,
        marginBottom: 10,
    },
    name: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 30,
        lineHeight: 34,
        color: AXM.parchment,
    },
    subtitle: { fontFamily: TYPE_ROLES.narration.fontFamily, fontSize: 13, color: AXM.bone, marginTop: 2 },
    speech: { marginBottom: 10 },
    speechPlain: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        padding: 12,
    },
    // Clears the vellum panel's drawn corners (about 26 high, 42 wide).
    speechKit: { paddingVertical: 28, paddingHorizontal: 40 },
    speechText: {
        fontFamily: TYPE_ROLES.spoken.fontFamily,
        fontSize: 14,
        lineHeight: 21,
        color: AXM.parchment,
    },
    speechTextKit: { color: HUE.hzCardInk },
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
        marginBottom: 6,
    },
    replyRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    replyRowPlain: {
        borderWidth: 2,
        borderColor: AXM.bone,
        backgroundColor: AXM.bg,
        padding: 10,
    },
    // Clears the brass button's drawn corners (about 16 high, 13 wide).
    replyRowKit: { paddingVertical: 20, paddingHorizontal: 20 },
    replyMark: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 16, color: AXM.sulfur },
    replyConfirm: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 16, color: AXM.sulfur, marginLeft: 4 },
    replyLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 16, color: AXM.parchment, letterSpacing: TYPE_ROLES.button.letterSpacing},
    replyDesc: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 10,
        color: AXM.bone,
        marginTop: 3,
        textTransform: 'uppercase',
    },
    flexOne: { flex: 1 },
    consequenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    // Sized to match every other description line.
    consequenceChip: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: CHIP_FONT_SIZE,
        color: AXM.bone,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    inactiveText: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 16, lineHeight: 22, color: AXM.parchment, opacity: 0.55, textAlign: 'center' },
}));
