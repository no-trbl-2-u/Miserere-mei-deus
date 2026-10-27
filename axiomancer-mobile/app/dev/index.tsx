/**
 * Dev-only tooling route.
 *
 * Keeps the evidence-setup controls off the player-facing SELF sheet in a
 * purpose-grouped dev surface, reached from the SELF tab's `DEV TOOLS`
 * link in dev builds. Every Debug* affordance lives in `DevToolsSections`.
 *
 * Production gate: outside dev builds the route renders an inert
 * placeholder (`dev-route-disabled`) and exposes no controls. The
 * sections component also self-gates.
 *
 * Route: /dev
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';

import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { DevToolsSections } from '@/components/dev/DevToolsSections';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export default function DevToolsScreen() {
    const AXM = usePalette();
    const styles = useStyles();
    const router = useRouter();

    if (!isDevToolsEnabled()) {
        return (
            <View style={styles.disabled} testID="dev-route-disabled" />
        );
    }

    return (
        <ScreenBg>
            <View style={styles.headerRow}>
                <View style={styles.headerText}>
                    <SectionLabel size={10} color={AXM.bone}>DEVELOPER</SectionLabel>
                    <Text style={styles.title}>DEV TOOLS</Text>
                    <Text style={styles.subtitle}>
                        evidence + encounter controls — not shipped to players
                    </Text>
                </View>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    testID="dev-route-back"
                >
                    <Text style={styles.backLabel}>✕</Text>
                </Pressable>
            </View>

            <View style={styles.body}>
                <Pressable
                    style={styles.linkRow}
                    onPress={() => router.push('/character-select?locked=1')}
                    accessibilityRole="button"
                    accessibilityLabel="Open the character select, all locked"
                    testID="dev-open-character-select"
                >
                    <Text style={styles.linkLabel}>CHARACTER SELECT (all locked)</Text>
                </Pressable>
                <DevToolsSections />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    disabled: { flex: 1, backgroundColor: AXM.bg },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
    },
    headerText: { flex: 1 },
    title: {
        fontFamily: FONTS.gothic,
        fontSize: 22,
        color: AXM.sulfur,
        letterSpacing: 1,
        marginTop: 1,
    },
    subtitle: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: AXM.bone,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: AXM.ash,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AXM.panelBg,
    },
    backLabel: {
        fontFamily: FONTS.mono,
        fontSize: 16,
        color: AXM.bone,
    },
    linkRow: {
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    linkLabel: {
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.bone,
        letterSpacing: 0.5,
    },
    body: {
        paddingHorizontal: 12,
        paddingBottom: 24,
    },
}));
