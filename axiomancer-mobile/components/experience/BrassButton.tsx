/**
 * BrassButton — one action on the kit's brass plate: the
 * nine-sliced `action-button-idle` plate at rest, `-selected` while pressed,
 * `-disabled` for a refused action. A refused action still renders and still
 * reads its reason aloud (owner UI doctrine: illegal actions are shown, not
 * hidden); the caller prints the reason beside it.
 *
 * Inputs: `label` (the verb, in caps), `detail` (an optional second line, such
 * as a price, `testIDDetail` its testID), `onPress`, `disabled`, `place` (the look-table place the button
 * belongs to; its look decides brass or the plain bordered row), `align` (the
 * label's alignment), `labelInsetRight` (room kept clear at the right end for
 * a figure the caller lays over the plate, such as a keeper's portrait),
 * `testID`, `accessibilityLabel`, `accessibilityHint`, `style`.
 * Output: a pressable plate; no state of its own.
 *
 * Reused by: the village hub, the paid rest's screen and the Shop's way out.
 * The main menu's `MenuButton` wears the same plate with a hint line and a
 * chevron; this one is the bare action.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { LOOKS, type PlaceId } from '@/components/experience/looks';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface BrassButtonProps {
    label: string;
    detail?: string;
    onPress: () => void;
    disabled?: boolean;
    place?: PlaceId;
    align?: 'left' | 'center';
    /** Points kept clear at the right end of the label, for a figure laid over the plate. */
    labelInsetRight?: number;
    testID?: string;
    /** testID for the `detail` line, when a test reads the price off it. */
    testIDDetail?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    style?: StyleProp<ViewStyle>;
    /** The label's size in points, for a plate narrower than the default label fits (two side by side). */
    labelSize?: number;
}

/** The plate's height: the art's ornaments want about this much to sit whole. */
export const BRASS_BUTTON_HEIGHT = 56;

export function BrassButton({
    label, detail, onPress, disabled = false, place = 'V-01', align = 'left', labelInsetRight = 0, testID, testIDDetail,
    accessibilityLabel, accessibilityHint, style, labelSize,
}: BrassButtonProps) {
    const styles = useStyles();
    const kit = LOOKS[place] === 'brass';
    return (
        <Pressable
            style={({ pressed }) => [
                styles.root,
                kit ? styles.rootKit : styles.rootPlain,
                !kit && pressed && !disabled && styles.pressedPlain,
                disabled && (kit ? styles.disabledKit : styles.disabledPlain),
                style,
            ]}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
            testID={testID}
        >
            {({ pressed }) => (
                <>
                    {kit ? (
                        <KitBackdrop
                            piece={disabled ? 'action-button-disabled' : pressed ? 'action-button-selected' : 'action-button-idle'}
                        />
                    ) : null}
                    <View style={[styles.text, align === 'center' && styles.textCenter, { paddingRight: labelInsetRight }]}>
                        <Text style={[styles.label, labelSize !== undefined && { fontSize: labelSize }, disabled && styles.labelDisabled]} numberOfLines={1}>
                            {label}
                        </Text>
                        {detail ? (
                            <Text style={[styles.detail, disabled && styles.labelDisabled]} numberOfLines={1} testID={testIDDetail}>
                                {detail}
                            </Text>
                        ) : null}
                    </View>
                </>
            )}
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        minHeight: BRASS_BUTTON_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
    },
    // The plate's corner ornaments eat room at each end, so the words keep
    // clear of them. No border: the art is the frame.
    rootKit: { paddingHorizontal: 30, paddingVertical: 8, backgroundColor: 'transparent' },
    rootPlain: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: AXM.parchment,
        backgroundColor: AXM.bg,
    },
    pressedPlain: { backgroundColor: AXM.selectFill },
    disabledKit: { opacity: 0.85 },
    disabledPlain: { borderColor: AXM.ash, opacity: 0.6 },
    text: { flex: 1 },
    textCenter: { alignItems: 'center' },
    label: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 18,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
    },
    detail: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 12,
        color: AXM.sulfur,
        marginTop: 1,
    },
    labelDisabled: { color: AXM.bone },
}));
