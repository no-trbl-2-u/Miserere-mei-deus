/**
 * Settings affordance that opens the dedicated `/dev` route.
 *
 * Settings stays a player-facing surface; the dev
 * controls live on their own route, reached by tapping this link.
 *
 * Production gate: returns `null` outside dev builds, so production /
 * non-dev builds expose no dev affordance in Settings.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export function DevToolsLink() {
    const styles = useStyles();
    const router = useRouter();

    if (!isDevToolsEnabled()) return null;

    return (
        <Pressable
            style={styles.root}
            onPress={() => router.push('/dev')}
            accessibilityRole="button"
            accessibilityLabel="Open dev tools"
            accessibilityHint="evidence and encounter controls for testing"
            testID="settings-dev-tools-link"
        >
            <View style={styles.text}>
                <Text style={styles.label}>DEV TOOLS</Text>
                <Text style={styles.sub}>evidence + encounter controls</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        marginTop: 16,
        marginHorizontal: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: AXM.ash,
        borderStyle: 'dashed',
        backgroundColor: AXM.panelBg,
    },
    text: { flex: 1 },
    label: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        letterSpacing: 2,
        color: AXM.sulfur,
    },
    sub: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 0.5,
        color: AXM.bone,
        marginTop: 2,
    },
    chevron: {
        fontFamily: FONTS.gothic,
        fontSize: 20,
        color: AXM.bone,
    },
}));
