/**
 * Dev-only manual hazard trigger. Hazard map events fire the v2
 * minigame organically, but tuning and visual work need an immediate
 * entry: tap → `actions.beginHazard()` → `<HazardGate>` routes to
 * `/hazard`. Renders null outside dev builds.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions } from '@/state/GameStoreProvider';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export function DebugHazardButton() {
    const styles = useStyles();
    const actions = useGameActions();

    if (!isDevToolsEnabled()) return null;

    const onPress = () => {
        actions.beginHazard();
        // <HazardGate> observes the slice and pushes /hazard.
    };

    return (
        <View style={styles.row}>
            <View style={styles.labelCol}>
                <Text style={styles.label}>DEBUG · HAZARD</Text>
                <Text style={styles.sub}>start the hazard minigame</Text>
            </View>
            <Pressable
                style={styles.button}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Start a debug hazard minigame"
                testID="debug-hazard-button"
            >
                <Text style={styles.buttonLabel}>BRAVE IT</Text>
            </Pressable>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
    },
    labelCol: { flex: 1 },
    label: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 10, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: AXM.bone },
    sub: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 9, color: AXM.ash, marginTop: 2 },
    button: {
        borderWidth: 1,
        borderColor: AXM.rust,
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: AXM.rustSubtle,
    },
    buttonLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 14, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.rust },
}));
