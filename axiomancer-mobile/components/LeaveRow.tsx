/**
 * `<LeaveRow>` — the quiet "walk away" control that closes a scene.
 *
 * What it renders: a single centred, dashed-bordered row carrying one line of
 * mono copy, sized to a 44px minimum touch target.
 * What state it reads: none. It is pure props; the screen owns the action.
 * Where it is mounted: `app/blacksmith/index.tsx` (LET THE COALS DIE).
 *
 * Bare text beneath choices drawn as solid bordered boxes reads as a caption,
 * not a control, so the exit gets a border and a 44px hit target.
 *
 * It stays deliberately quieter than the boxed choices above it: the border is
 * dashed and the type is bone rather than parchment, so the scene's real
 * decisions keep visual priority while the exit still reads as pressable.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface LeaveRowProps {
    /** The line shown in the row, e.g. `'TIP YOUR CAP AND GO'`. */
    label: string;
    /** Screen-reader name for the action, e.g. `'Walk away'`. */
    accessibilityLabel: string;
    /** Invoked on press. */
    onPress: () => void;
    testID?: string;
}

export function LeaveRow({ label, accessibilityLabel, onPress, testID }: LeaveRowProps) {
    const styles = useStyles();
    return (
        <View style={styles.wrap}>
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPress={onPress}
                style={styles.row}
                testID={testID}
            >
                <Text style={styles.text}>{label}</Text>
            </TouchableOpacity>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: { alignItems: 'center', marginTop: 16 },
    row: {
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: AXM.ash,
    },
    text: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 12,
        color: AXM.bone,
    },
}));
