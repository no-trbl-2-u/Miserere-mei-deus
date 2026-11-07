/**
 * /death-return — the full-screen moment after a first death.
 *
 * A revive (phase DY1b) puts the player back on the map at 1 VITAE, dying;
 * this screen stands between the lost fight and the map. One title line, one
 * line of placeholder copy and a CONTINUE that goes to the map. It renders
 * the presenter and touches no rules. Shown once per revive and not saved:
 * unless a revive armed it (`state/death-return.ts`), opening it, as a
 * reload on web does, goes straight to the map. `?preview=1` shows it on a
 * dev build for the visual baseline.
 */

import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';

import { VELLUM_INK } from '@/components/experience/KitBackdrop';
import { KitPressable } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import { ScreenBg } from '@/components/ScreenBg';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import { selectDeathReturnVM } from '@/state/presenters/death-return.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** The vellum button (G-01). */
const [BUTTON] = PLACE_PIECES['G-01'];
const WEAR_BUTTON = lookOf('G-01') !== 'normal';

export default function DeathReturnScreen() {
    const styles = useStyles();
    const router = useRouter();
    const params = useLocalSearchParams<{ preview?: string }>();
    const vm = selectDeathReturnVM();
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
                <Text style={styles.title} accessibilityRole="header" testID="death-return-title">
                    {vm.title}
                </Text>
                <Text style={styles.body} testID="death-return-body">{vm.body}</Text>
                <KitPressable
                    wear={WEAR_BUTTON}
                    plainOpacity
                    piece={BUTTON}
                    accessibilityRole="button"
                    accessibilityLabel={vm.continueA11yLabel}
                    onPress={toMap}
                    style={[styles.button, WEAR_BUTTON ? styles.buttonKit : styles.buttonPlain]}
                    testID="death-return-continue"
                >
                    <Text style={[styles.buttonText, WEAR_BUTTON && styles.buttonTextKit]}>{vm.continueLabel}</Text>
                </KitPressable>
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    empty: { flex: 1, backgroundColor: AXM.deepBg },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 28,
        letterSpacing: 3,
        color: AXM.parchment,
        textAlign: 'center',
    },
    body: {
        fontFamily: FONTS.serifItalic,
        fontSize: 14,
        lineHeight: 21,
        color: AXM.bone,
        textAlign: 'center',
    },
    button: {
        marginTop: 12,
        minHeight: 44,
        minWidth: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPlain: {
        borderWidth: 2,
        borderColor: AXM.sulfur,
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: AXM.bg,
    },
    // Clears the vellum button's drawn corners (about 16 high, 13 wide).
    buttonKit: { minHeight: 56, paddingVertical: 18, paddingHorizontal: 28 },
    buttonTextKit: { color: VELLUM_INK },
    buttonText: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        letterSpacing: 2,
        color: AXM.sulfur,
    },
}));
