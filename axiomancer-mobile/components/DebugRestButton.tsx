/**
 * Dev-only manual rest trigger. Rest map events fire the rest-choice node
 * organically, but tuning and visual work need an immediate entry: tap
 * → `actions.beginRest()` → `<RestGate>` routes to `/rest`. Renders
 * null outside dev builds.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions } from '@/state/GameStoreProvider';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export function DebugRestButton() {
    const styles = useStyles();
    const actions = useGameActions();

    if (!isDevToolsEnabled()) return null;

    const onCamp = () => {
        actions.beginRest({ shelter: 'camp' });
        // <RestGate> observes the slice and pushes /rest.
    };

    const onInn = () => {
        // An inn words the night as a bed; the claim is the same as a camp's.
        actions.beginRest({ shelter: 'inn' });
    };

    return (
        <View style={styles.row}>
            <View style={styles.labelCol}>
                <Text style={styles.label}>DEBUG · REST</Text>
                <Text style={styles.sub}>start the rest-choice node</Text>
            </View>
            <Pressable
                style={[styles.button, styles.innButton]}
                onPress={onInn}
                accessibilityRole="button"
                accessibilityLabel="Start a debug rest node at an inn"
                testID="debug-rest-inn-button"
            >
                <Text style={[styles.buttonLabel, styles.innLabel]}>INN</Text>
            </Pressable>
            <Pressable
                style={styles.button}
                onPress={onCamp}
                accessibilityRole="button"
                accessibilityLabel="Start a debug rest node at a camp"
                testID="debug-rest-button"
            >
                <Text style={styles.buttonLabel}>GO REST</Text>
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
        borderColor: HUE.hzAcid,
        paddingVertical: 6,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(134,168,33,0.08)',
    },
    buttonLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 14, letterSpacing: TYPE_ROLES.button.letterSpacing, color: HUE.hzAcid },
    innButton: { borderColor: AXM.sulfur, backgroundColor: AXM.sulfurSubtle, marginRight: 6 },
    innLabel: { color: AXM.sulfur },
}));
