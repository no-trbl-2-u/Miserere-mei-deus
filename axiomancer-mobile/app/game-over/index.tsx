/**
 * /game-over — the full-screen moment after a run ends (phase CH1j).
 *
 * A second death on the map or at a hazard, or a Labyrinth defeat, leaves the
 * run-over state in the save; this screen stands between that and character
 * select. One title, one line of placeholder copy and a NEW CHARACTER button
 * that opens character select for the same slot. Shown once and not saved:
 * unless a run end armed it (`state/game-over.ts`), opening it, as a reload
 * on web does, goes straight to character select. `?preview=1` shows it on a
 * dev build for the visual baseline.
 */

import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';

import { BrassButton } from '@/components/experience/BrassButton';
import { ScreenBg } from '@/components/ScreenBg';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { clearGameOver, isGameOverArmed } from '@/state/game-over';
import type { SaveSlotId } from '@/state/persistence/saveSlots';
import { selectGameOverVM } from '@/state/presenters/game-over.engine';
import { characterSelectRunEndRoute } from '@/state/run-end';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

function readSlot(raw: unknown): SaveSlotId | null {
    const n = Number(raw);
    return n === 1 || n === 2 || n === 3 ? n : null;
}

export default function GameOverScreen() {
    const styles = useStyles();
    const router = useRouter();
    const params = useLocalSearchParams<{ slot?: string; preview?: string }>();
    const slot = readSlot(params.slot);
    const vm = selectGameOverVM();
    const shown = isGameOverArmed() || (params.preview === '1' && isDevToolsEnabled());

    const toCharacterSelect = useCallback(() => {
        clearGameOver();
        router.replace(characterSelectRunEndRoute(slot) as never);
    }, [router, slot]);

    // Mount only: an unarmed open leaves once.
    useEffect(() => {
        if (!shown) toCharacterSelect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!shown) return <View style={styles.empty} testID="game-over-empty" />;

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.wrap} testID="game-over">
                <Text style={styles.title} accessibilityRole="header" testID="game-over-title">
                    {vm.title}
                </Text>
                <Text style={styles.body} testID="game-over-body">{vm.body}</Text>
                <BrassButton
                    label={vm.buttonLabel}
                    align="center"
                    place="G-02"
                    accessibilityLabel={vm.buttonA11yLabel}
                    onPress={toCharacterSelect}
                    style={styles.button}
                    testID="game-over-new-character"
                />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    empty: { flex: 1, backgroundColor: AXM.deepBg },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 },
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
    button: { marginTop: 12, minWidth: 220 },
}));
