/**
 * User-facing colour-theme switcher.
 *
 * A collapsible "APPEARANCE" section (collapsed by default). Expanded,
 * it renders one
 * swatch per registered theme; tapping switches the active palette **in
 * place** — no reload — via the runtime store, so the whole app
 * re-paints instantly on web and native. The selection persists across
 * launches and the active theme is highlighted.
 *
 * This is a real player setting, so it is not gated behind dev tools.
 * Hosted on `/settings` (the SELF tab links there); the
 * row carries no outer margin so the settings list spaces it like its
 * siblings.
 */

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { THEME_ORDER, THEME_SPECS, paletteFor } from '@/theme/palette';
import { makeStyles, usePalette, useThemeId } from '@/theme/runtime';
import { setActiveTheme } from '@/theme/theme-switch';

interface ThemeSwitcherProps {
    /** Initial expanded state. Defaults to `false` (collapsed). */
    initialExpanded?: boolean;
}

export function ThemeSwitcher({ initialExpanded = false }: ThemeSwitcherProps) {
    const AXM = usePalette();
    const activeId = useThemeId();
    const styles = useStyles();
    const [expanded, setExpanded] = useState(initialExpanded);

    const activeName = THEME_SPECS[activeId].name;

    return (
        <View style={styles.row} testID="theme-switcher">
            <Pressable
                style={styles.header}
                onPress={() => setExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`Colour theme: ${activeName}. ${expanded ? 'Collapse' : 'Expand'} to change.`}
                testID="theme-switcher-toggle"
            >
                <Text style={styles.label}>COLOUR THEME</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.current}>{activeName}</Text>
                    <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
                </View>
            </Pressable>

            {expanded && (
                <View style={styles.grid}>
                    {THEME_ORDER.map((id) => {
                        const def = THEME_SPECS[id];
                        const pal = paletteFor(id);
                        const active = id === activeId;
                        return (
                            <Pressable
                                key={id}
                                style={[
                                    styles.swatch,
                                    {
                                        backgroundColor: pal.panelBg,
                                        borderColor: active ? pal.sulfur : AXM.ash,
                                        borderWidth: active ? 2 : 1,
                                    },
                                ]}
                                onPress={() => setActiveTheme(id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={`Theme ${def.name}${active ? ', active' : ''}`}
                                testID={`theme-${id}`}
                            >
                                <View style={styles.dots}>
                                    <View style={[styles.dot, { backgroundColor: pal.blood }]} />
                                    <View style={[styles.dot, { backgroundColor: pal.sulfur }]} />
                                    <View style={[styles.dot, { backgroundColor: pal.rust }]} />
                                </View>
                                <Text style={[styles.name, { color: active ? pal.sulfur : pal.parchment }]}>
                                    {def.name}
                                </Text>
                                <Text style={[styles.blurb, { color: pal.bone }]} numberOfLines={2}>
                                    {def.blurb}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: {
        marginTop: 0,
        marginHorizontal: 0,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: AXM.divider,
        backgroundColor: AXM.panelBg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
    },
    current: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 11,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
    },
    chevron: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 12,
        color: AXM.bone,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    swatch: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        minWidth: 104,
        flexGrow: 1,
    },
    dots: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    name: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
    },
    blurb: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 10,
        lineHeight: 13,
        marginTop: 2,
    },
}));
