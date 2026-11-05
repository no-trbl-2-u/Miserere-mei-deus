/**
 * MenuButton — one row of the main menu / settings chrome: a verb in caps,
 * a lowercase hint beneath it, a chevron. Disabled rows dim and refuse the
 * press but stay visible, so a new player can see that LOAD GAME exists
 * before there is anything to load.
 *
 * Inputs: `label`, `hint`, `onPress`, `disabled`, `primary` (the sulfur
 * fill CONTINUE / NEW GAME wear), `testID`.
 * Output: a pressable row; no state of its own.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { FONTS } from '@/theme/axm';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { makeStyles } from '@/theme/runtime';

export interface MenuButtonProps {
    label: string;
    hint?: string;
    onPress: () => void;
    disabled?: boolean;
    /** The accent-filled variant (the menu's headline verb). */
    primary?: boolean;
    /** The blood-bordered variant (destructive rows). */
    danger?: boolean;
    testID?: string;
    accessibilityLabel?: string;
}

export function MenuButton({
    label, hint, onPress, disabled = false, primary = false, danger = false, testID, accessibilityLabel,
}: MenuButtonProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={({ pressed }) => [
                styles.root,
                primary && styles.primary,
                danger && styles.danger,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
            ]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={hint}
            testID={testID}
        >
            {({ pressed }) => (
                <>
            <KitBackdrop piece={disabled ? 'action-button-disabled' : primary || pressed ? 'action-button-selected' : 'action-button-idle'} />
            <View style={styles.text}>
                <Text style={[styles.label, primary && styles.labelPrimary, danger && styles.labelDanger]}>
                    {label}
                </Text>
                {hint ? (
                    <Text style={[styles.hint, primary && styles.hintPrimary]} numberOfLines={2}>
                        {hint}
                    </Text>
                ) : null}
            </View>
            <Text style={[styles.chevron, primary && styles.labelPrimary]}>›</Text>
                </>
            )}
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 26,
    },
    primary: {},
    danger: {},
    disabled: {
        opacity: 0.8,
    },
    pressed: {},
    text: { flex: 1 },
    label: {
        fontFamily: FONTS.sans,
        fontSize: 18,
        letterSpacing: 3,
        color: AXM.parchment,
    },
    labelPrimary: { color: AXM.bg },
    labelDanger: { color: AXM.blood },
    hint: {
        fontFamily: FONTS.serifItalic,
        fontSize: 11,
        color: AXM.bone,
        marginTop: 2,
    },
    hintPrimary: { color: AXM.bg, opacity: 0.75 },
    chevron: {
        fontFamily: FONTS.gothic,
        fontSize: 22,
        color: AXM.bone,
        marginLeft: 10,
    },
}));
