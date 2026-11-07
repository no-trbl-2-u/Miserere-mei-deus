/**
 * A button on the vellum action plate, for the Spoils (CONTINUE, TAKE NOTHING,
 * TAKE CARD). The plate's corner ornaments eat horizontal room, so the padding
 * is sized from the art rather than the label: a label never meets an
 * ornament, at 360 as at 390.
 *
 * Inputs: Pressable props plus `disabled`. Output: the plate behind its
 * children; the caller inks the text.
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { DISABLED_OPACITY } from '@/components/combat/encounter/spoils-ink';

export function SpoilsButton({ children, disabled, style, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) {
    return (
        <Pressable
            disabled={disabled}
            {...rest}
            style={[styles.plate, style, disabled ? { opacity: DISABLED_OPACITY } : null]}
        >
            <KitBackdrop piece="action-button-vellum" />
            {children as React.ReactNode}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // The plate's art is 366x137 drawn at 0.36: corners 13pt wide, 16pt tall.
    // 24pt of side padding clears the ornament; 20pt top and bottom clears the rule.
    plate: { flex: 1, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
});
