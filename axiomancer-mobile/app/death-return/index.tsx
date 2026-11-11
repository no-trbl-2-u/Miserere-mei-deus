/**
 * /death-return — the full-screen moment after a first death.
 *
 * A revive (phase DY1b) puts the player back on the map at 1 VITAE, dying;
 * this screen stands between the lost fight and the map (FE1c, the settled
 * shot's right screen): the player's own figure, YOU FELL, one line, the
 * VITAE bar at 1 of the maximum, one line on what is kept and CONTINUE on
 * the brass plate, over the dark ground. It renders the presenter and
 * touches no rules. Shown once per revive and not saved: unless a revive
 * armed it (`state/death-return.ts`), opening it, as a reload on web does,
 * goes straight to the map. `?preview=1` shows it on a dev build for the
 * visual baseline.
 */

import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';

import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { BrassButton } from '@/components/experience/BrassButton';
import { ScreenBg } from '@/components/ScreenBg';
import { StatBar } from '@/components/StatBar';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import { useGameState } from '@/state/GameStoreProvider';
import { selectDeathReturnVM } from '@/state/presenters/death-return.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export default function DeathReturnScreen() {
    const styles = useStyles();
    const AXM = usePalette();
    const router = useRouter();
    const params = useLocalSearchParams<{ preview?: string }>();
    const maxHealth = useGameState((s) => s.player?.maxHealth);
    const vm = selectDeathReturnVM(maxHealth);
    const shown = isDeathReturnArmed() || (params.preview === '1' && isDevToolsEnabled());

    // The map is the tab stack beneath this modal: pop to it, or replace when
    // there is nothing to pop (a cold web load).
    const toMap = useCallback(() => {
        clearDeathReturn();
        if (router.canGoBack()) router.back();
        else router.replace('/exploration');
    }, [router]);

    // Mount only: an unarmed open leaves once.
    useEffect(() => {
        if (!shown) toMap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!shown) return <View style={styles.empty} testID="death-return-empty" />;

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.wrap} testID="death-return">
                <View style={styles.figure} testID="death-return-figure">
                    <PlayerPortraitImage width="100%" height="100%" fit="contain" contentPosition="center" />
                </View>
                <Text style={styles.title} accessibilityRole="header" testID="death-return-title">
                    {vm.title}
                </Text>
                <Text style={styles.body} testID="death-return-body">{vm.body}</Text>
                <View style={styles.vitae} testID="death-return-vitae">
                    <StatBar
                        value={vm.vitae}
                        max={vm.maxVitae}
                        color={AXM.blood}
                        height={10}
                        alarmAt={0.25}
                    />
                    <Text style={styles.vitaeText} testID="death-return-vitae-text">{vm.vitaeText}</Text>
                </View>
                <Text style={styles.kept} testID="death-return-kept">{vm.kept}</Text>
                <BrassButton
                    label={vm.continueLabel}
                    accessibilityLabel={vm.continueA11yLabel}
                    onPress={toMap}
                    place="G-01"
                    align="center"
                    style={styles.button}
                    testID="death-return-continue"
                />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    empty: { flex: 1, backgroundColor: AXM.deepBg },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
    // The player's own figure, large, in the top half.
    figure: { width: '100%', maxWidth: 360, flex: 1, minHeight: 200 },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 28,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.parchment,
        textAlign: 'center',
    },
    body: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 14,
        lineHeight: 21,
        color: AXM.bone,
        textAlign: 'center',
    },
    vitae: { width: '100%', maxWidth: 300, gap: 4, alignItems: 'center' },
    vitaeText: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 13,
        letterSpacing: 1,
        color: AXM.blood,
        textAlign: 'center',
    },
    kept: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 13,
        lineHeight: 19,
        color: AXM.bone,
        textAlign: 'center',
    },
    button: { width: '100%', maxWidth: 300, marginTop: 6 },
}));
