/**
 * /travel - the travel screen.
 *
 * A travel node is one quiet screen: the destination's picture fills the top,
 * then the question "Move to {destination}?", the node's scene line, and two
 * brass buttons, MOVE and STAY. Nothing else is written on it. MOVE takes the
 * trip, STAY leaves the player on the node. `resolveCurrentMapEvent` opens it
 * when the player walks onto a travel node or taps the one they stand on. A way
 * shut until a node is spent (`opensAfter`) says so in the question's place and
 * shows MOVE disabled. The rules live in `axiomancer-mechanics`
 * (`World/MapEvents/travel.ts`); this screen renders the presenter VM and
 * dispatches store actions only.
 */

import React, { useEffect, useMemo } from 'react';
import { useRouter } from '@/lib/platform/router';
import { Text, View } from 'react-native';

import { ScreenBg } from '@/components/ScreenBg';
import { BrassButton } from '@/components/experience/BrassButton';
import { TravelPicture } from '@/components/travel/TravelPicture';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveTravel, selectTravelVM } from '@/state/presenters/travel.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export default function TravelScreen() {
    const styles = useStyles();
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
            <TravelPicture scene={vm.scene} />

            <View style={styles.body}>
                <Text
                    style={[styles.question, !vm.open && styles.questionShut]}
                    testID={vm.open ? 'travel-question' : 'travel-shut'}
                >
                    {vm.question}
                </Text>
                <Text style={styles.prompt} testID="travel-prompt">{vm.prompt}</Text>
            </View>

            <View style={styles.choices}>
                <BrassButton
                    place="T-02"
                    label={vm.moveLabel}
                    align="center"
                    disabled={!vm.open}
                    onPress={actions.takeTravel}
                    testID="travel-move"
                />
                <BrassButton
                    place="T-02"
                    label={vm.stayLabel}
                    align="center"
                    onPress={actions.closeTravel}
                    testID="travel-stay"
                />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    inactiveWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    body: { paddingHorizontal: 14, paddingTop: 4, gap: 10 },
    prompt: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 13, color: AXM.parchment, lineHeight: 19 },
    question: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 24,
        lineHeight: 28,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.parchment,
    },
    questionShut: { color: AXM.bone },
    choices: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 16, gap: 8 },
}));
