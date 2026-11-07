/**
 * MenuButton — one row of the main menu / settings chrome: a verb in caps,
 * a lowercase hint beneath it, a chevron. Disabled rows dim and refuse the
 * press but stay visible, so a new player can see that LOAD GAME exists
 * before there is anything to load.
 *
 * Inputs: `label`, `hint`, `onPress`, `disabled`, `primary` (the sulfur
 * fill CONTINUE / NEW GAME wear), `place` (which look-table place the row
 * belongs to: M-01 on the main menu, O-07 in Settings), `testID`.
 * The row wears the kit's brass button when its place's look is brass;
 * 'normal' keeps the bordered row.
 * Output: a pressable row; no state of its own.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { LOOKS } from '@/components/experience/looks';
import { FONTS } from '@/theme/axm';
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
    /** The look-table place this row is: the main menu's, or Settings'. */
    place?: 'M-01' | 'O-07';
    testID?: string;
    accessibilityLabel?: string;
    /** Read aloud only, never printed; `hint` is read aloud too when this is absent. */
    accessibilityHint?: string;
}

export function MenuButton({
    label, hint, onPress, disabled = false, primary = false, danger = false, place = 'M-01', testID, accessibilityLabel,
    accessibilityHint,
}: MenuButtonProps) {
    const styles = useStyles();
    const kit = LOOKS[place] === 'brass';
    return (
        <Pressable
            style={({ pressed }) => [
                styles.root,
                kit && styles.rootKit,
                !kit && primary && styles.primary,
                !kit && danger && styles.danger,
                disabled && (kit ? styles.disabledKit : styles.disabled),
                !kit && pressed && !disabled && styles.pressed,
            ]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint ?? hint}
            testID={testID}
        >
            {({ pressed }) => {
                const onPlate = primary || (kit && pressed && !disabled);
                return (
                <>
                    {kit ? (
                        <KitBackdrop
                            piece={disabled ? 'action-button-disabled' : onPlate ? 'action-button-selected' : 'action-button-idle'}
                        />
                    ) : null}
                    <View style={styles.text}>
                        <Text style={[styles.label, onPlate && styles.labelPrimary, !kit && danger && styles.labelDanger]}>
                            {label}
                        </Text>
                        {hint ? (
                            <Text style={[styles.hint, onPlate && styles.hintPrimary]} numberOfLines={2}>
                                {hint}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[styles.chevron, onPlate && styles.labelPrimary]}>›</Text>
                </>
                );
            }}
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    // The brass button's corner ornaments eat room at each end, so the text
    // keeps clear of them. No border: the art is the frame.
    rootKit: {
        paddingVertical: 16,
        paddingHorizontal: 30,
        borderWidth: 0,
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
    },
    disabledKit: { opacity: 0.8 },
    primary: {
        backgroundColor: AXM.sulfur,
        borderColor: AXM.parchment,
    },
    danger: {
        borderColor: AXM.blood,
    },
    disabled: {
        opacity: 0.45,
    },
    pressed: {
        backgroundColor: AXM.selectFill,
    },
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
