/**
 * Visual primitive for the tap-tooltip system.
 *
 * Pure presentational — receives positioned content and renders
 * the torn-edge panel. Anchor measurement + dismiss handling
 * live on the provider. The primitive's only job is to draw.
 *
 * Layout:
 * - Torn-edge panel (dashed 1px ash border on panel-bg) with
 *   12pt gothic uppercase title, lowercase chronicle body in
 *   IM Fell English, optional mono footnote for engine numbers.
 * - Max-width 280px; body wraps. Static mount (no animation).
 *
 * Optional `accent` prop tints title + border to the stance/stat
 * the content is about (heart/body/mind). `'neutral'` (default)
 * keeps the sulfur title + ash border.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { TooltipAccent } from '@/state/presenters/tooltip.engine';

export interface TapTooltipProps {
    title: string;
    body: string;
    footnote?: string;
    /**
     * Window-space coords from the provider's `measureInWindow`
     * + flip / clamp pass. Renders as an absolutely-positioned
     * root-layer child (the provider's overlay).
     */
    left: number;
    top: number;
    /** Stat/stance accent for title + border tint. */
    accent?: TooltipAccent;
    testID?: string;
}

export function TapTooltip({
    title,
    body,
    footnote,
    left,
    top,
    accent = 'neutral',
    testID,
}: TapTooltipProps) {
    const AXM = usePalette();
    const styles = useStyles();
    const ACCENT_COLORS: Record<TooltipAccent, string> = {
        heart: AXM.blood,
        body: AXM.rust,
        mind: AXM.sulfur,
        neutral: AXM.sulfur,
    };

    const ACCENT_BORDER_COLORS: Record<TooltipAccent, string> = {
        heart: AXM.blood,
        body: AXM.rust,
        mind: AXM.sulfur,
        neutral: AXM.ash,
    };

    const titleColor = ACCENT_COLORS[accent];
    const borderColor = ACCENT_BORDER_COLORS[accent];
    return (
        <View
            style={[styles.root, { left, top, borderColor }]}
            testID={testID ?? 'tap-tooltip'}
        >
            <Text style={[styles.title, { color: titleColor }]} testID="tap-tooltip-title">
                {title}
            </Text>
            <Text style={styles.body} testID="tap-tooltip-body">
                {body}
            </Text>
            {footnote ? (
                <Text style={styles.footnote} testID="tap-tooltip-footnote">
                    {footnote}
                </Text>
            ) : null}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        position: 'absolute',
        maxWidth: 280,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        backgroundColor: AXM.panelBg,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        marginBottom: 4,
    },
    body: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        lineHeight: 17,
        color: AXM.parchment,
    },
    footnote: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 10,
        color: AXM.bone,
        marginTop: 4,
    },
}));
