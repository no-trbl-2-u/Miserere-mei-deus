/**
 * BrassPlate — one button wearing the kit's brass action plate (or its
 * disabled plate), for the Blacksmith's screen.
 *
 * Inputs: `label`, an optional `sub` line (the price), `onPress`, `disabled`,
 * `selected` (the lit plate), `testID`, `accessibilityLabel`. Output: a
 * pressable plate; no state of its own. A refused button dims and refuses the
 * press; the screen prints its reason beside it.
 *
 * This is a local twin of the village hub's plate on purpose (168.5 builds
 * beside 168.3, which owns `MenuButton` and the kit files). A later cleanup
 * can merge the two.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface BrassPlateProps {
    label: string;
    /** A smaller line under the label (a price). */
    sub?: string;
    onPress: () => void;
    disabled?: boolean;
    /** Wear the lit plate (the chosen tab). */
    selected?: boolean;
    testID?: string;
    subTestID?: string;
    accessibilityLabel?: string;
    style?: StyleProp<ViewStyle>;
}

export function BrassPlate({
    label, sub, onPress, disabled = false, selected = false, testID, subTestID, accessibilityLabel, style,
}: BrassPlateProps) {
    const styles = useStyles();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            accessibilityLabel={accessibilityLabel ?? label}
            disabled={disabled}
            onPress={disabled ? undefined : onPress}
            style={({ pressed }) => [styles.root, disabled && styles.disabled, style, pressed && !disabled && styles.pressed]}
            testID={testID}
        >
            <KitBackdrop
                piece={disabled ? 'action-button-disabled' : selected ? 'action-button-selected' : 'action-button-idle'}
            />
            <View style={styles.text}>
                <Text style={[styles.label, selected && styles.labelLit, disabled && styles.labelDim]}>{label}</Text>
                {sub ? (
                    <Text style={[styles.sub, selected && styles.labelLit, disabled && styles.labelDim]} testID={subTestID}>
                        {sub}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        minHeight: 52,
    },
    disabled: { opacity: 0.8 },
    pressed: { opacity: 0.85 },
    text: { alignItems: 'center' },
    label: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 18,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.parchment,
        textAlign: 'center',
    },
    sub: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 12,
        color: AXM.sulfur,
        marginTop: 1,
    },
    labelLit: { color: AXM.bg },
    labelDim: { color: AXM.bone },
}));
