/**
 * Shared tap-tooltip wrapper. Renders a Pressable that holds its
 * own measure ref and fires `useTooltip().show({ kind, id })` on
 * tap. Empty `id` short-circuits — useful for fixture-built
 * elements that have no engine id.
 */

import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTooltip } from '@/hooks/useTooltip';
import type { TooltipKind } from '@/state/presenters/tooltip.engine';

export interface TooltipTargetProps {
    kind: TooltipKind;
    id: string;
    children: React.ReactNode;
    /**
     * Style applied to the Pressable itself. Needed when the target is a
     * flex child whose sizing (e.g. `width: '48%'` in a wrap grid) must
     * live on the pressable rather than an inner wrapper — otherwise the
     * Pressable shrinks to content width and stretches to row height.
     */
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
    /** A hold shows the same tooltip pinned (no auto-dismiss). */
    pinOnLongPress?: boolean;
}

export function TooltipTarget({
    kind,
    id,
    children,
    style,
    accessibilityLabel,
    accessibilityHint,
    testID,
    pinOnLongPress = false,
}: TooltipTargetProps) {
    const tooltip = useTooltip();
    const ref = useRef<View | null>(null);
    return (
        <Pressable
            ref={ref}
            style={style}
            onPress={() => {
                if (!id) return;
                tooltip.show({ kind, id, anchorRef: ref });
            }}
            onLongPress={
                pinOnLongPress
                    ? () => {
                          if (!id) return;
                          tooltip.show({ kind, id, anchorRef: ref, pinned: true });
                      }
                    : undefined
            }
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            testID={testID}
        >
            {children}
        </Pressable>
    );
}
