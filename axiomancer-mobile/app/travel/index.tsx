/**
 * /travel - the travel screen (phase NK1d).
 *
 * A travel node is one screen: its art, its flavor text and the question
 * "Move to {destination}?", with YES (moves) and NO (stays on the node).
 * `resolveCurrentMapEvent` opens it when the player walks onto a travel node
 * or taps the one they stand on; the engine moved no one to offer it. A way
 * shut until a node is spent (`opensAfter`) says so and offers no move. The
 * rules live in `axiomancer-mechanics` (`World/MapEvents/travel.ts`); this
 * screen renders the presenter VM and dispatches store actions only.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { EventArt } from '@/components/event/EventArt';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveTravel, selectTravelVM } from '@/state/presenters/travel.engine';
import { KitPressable } from '@/components/experience/KitSurface';
import { PLACE_PIECES } from '@/components/experience/looks';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The vellum button YES · MOVE and NO · STAY wear (T-02). */
const [BUTTON] = PLACE_PIECES['T-02'];

export default function TravelScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const slice = useGameState(s => s.travel);
    const world = useGameState(s => s.world);
    const active = useGameState(selectHasActiveTravel);
    const vm = useMemo(() => selectTravelVM({ travel: slice, world }), [slice, world]);
    const actions = useGameActions();
    const router = useRouter();

    useEffect(() => {
        if (!active && router.canGoBack()) router.back();
    }, [active, router]);

    if (!vm.active) {
        return (
            <ScreenBg scrollable={false} art="event">
                <View style={styles.inactiveWrap} testID="travel-inactive">
                    <Text style={styles.prompt}>The road is quiet.</Text>
                </View>
            </ScreenBg>
        );
    }

    return (
        <ScreenBg art="event">
            <View style={styles.illustration} testID="travel-art">
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: AXM.deepBg }]} />
                <EventArt slug={vm.artSlug} />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{vm.eyebrow}</Text>
                </View>
            </View>

            <View style={styles.body}>
                <Text style={styles.prompt} testID="travel-prompt">{vm.prompt}</Text>
                <Text
                    style={[styles.question, !vm.open && styles.questionShut]}
                    testID={vm.open ? 'travel-question' : 'travel-shut'}
                >
                    {vm.question}
                </Text>
            </View>

            <View style={styles.choices}>
                {vm.open && (
                    <KitPressable
                        piece={BUTTON}
                        accessibilityRole="button"
                        accessibilityLabel={vm.question}
                        onPress={actions.takeTravel}
                        style={styles.choiceRow}
                        testID="travel-yes"
                    >
                        <Text style={styles.choiceLabel}>{vm.yesLabel}</Text>
                    </KitPressable>
                )}
                <KitPressable
                    piece={BUTTON}
                    accessibilityRole="button"
                    accessibilityLabel={vm.noLabel}
                    onPress={actions.closeTravel}
                    style={styles.choiceRow}
                    testID="travel-no"
                >
                    <Text style={styles.choiceLabel}>{vm.noLabel}</Text>
                </KitPressable>
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    illustration: { margin: 8, marginTop: 0, height: 320, position: 'relative', overflow: 'hidden' },
    badge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: AXM.bg,
        borderWidth: 2,
        borderColor: AXM.sulfur,
    },
    badgeText: { fontFamily: FONTS.gothic, fontSize: 14, letterSpacing: 2, color: AXM.sulfur },
    body: { paddingHorizontal: 14, paddingTop: 8, gap: 12 },
    prompt: { fontFamily: FONTS.serif, fontSize: 13, color: AXM.parchment, lineHeight: 19 },
    question: {
        fontFamily: FONTS.gothic,
        fontSize: 24,
        lineHeight: 28,
        letterSpacing: 1,
        color: AXM.parchment,
    },
    questionShut: { color: AXM.bone },
    choices: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 16, gap: 8 },
    // Clears the vellum button's drawn corners (about 16 high, 13 wide).
    choiceRow: {
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
    },
    choiceLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: HUE.hzCardInk,
        lineHeight: 20,
        letterSpacing: 1.5,
    },
}));
