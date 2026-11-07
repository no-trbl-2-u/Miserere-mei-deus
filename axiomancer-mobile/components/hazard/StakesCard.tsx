/**
 * The hazard's stakes card (phase ET1b): one card before the board with the
 * place, what failing costs, what clearing pays, the routes and, for a held
 * hazard, the road it opens. "Face it" leads on to the route select.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HazardStakesVM } from '@/state/presenters/hazard-stakes.engine';
import { KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES } from '@/components/experience/looks';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The vellum panel the stakes card wears (H-01). */
const [PANEL] = PLACE_PIECES['H-01'];

export function StakesCard({ stakes, onFace }: { stakes: HazardStakesVM; onFace: () => void }) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <View style={styles.root} testID="hazard-stakes">
            <ScrollView contentContainerStyle={styles.scroll}>
                <KitSurface piece={PANEL} style={styles.card}>
                    <Text style={[styles.kind, { color: HUE.hzForceInk }]} testID="hazard-stakes-kind">
                        {stakes.kindLine.toUpperCase()}
                    </Text>
                    <Text style={styles.place} testID="hazard-stakes-place">{stakes.place}</Text>
                    {stakes.lines.map((line) =>
                        line.key === 'opens' ? (
                            <Text key={line.key} style={[styles.opens, { color: HUE.hzForceInk }]} testID="hazard-stakes-opens">
                                {line.label}: {line.values.join(', ')}
                            </Text>
                        ) : (
                            <View key={line.key} style={styles.group} testID={`hazard-stakes-${line.key}`}>
                                <Text style={styles.eyebrow}>{line.label}</Text>
                                {line.values.map((v) => (
                                    <Text key={v} style={styles.value}>{v}</Text>
                                ))}
                            </View>
                        ),
                    )}
                </KitSurface>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={stakes.cta}
                    testID="hazard-stakes-face"
                    onPress={onFace}
                    style={[styles.cta, { borderColor: AXM.parchment }]}
                >
                    <Text style={[styles.ctaText, { color: AXM.parchment }]}>{stakes.cta.toUpperCase()} {'›'}</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: HUE.routeBg },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
    // Clears the vellum panel's drawn corners (about 26 high, 42 wide).
    card: { paddingVertical: 32, paddingHorizontal: 44, gap: 14 },
    kind: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 2 },
    place: { fontFamily: FONTS.gothic, fontSize: 28, color: HUE.hzCardInk },
    group: { gap: 3 },
    eyebrow: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 2, color: HUE.hzCardInk2 },
    value: { fontFamily: FONTS.sans, fontSize: 15, color: HUE.hzCardInk },
    opens: { fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 1 },
    cta: { borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
    ctaText: { fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 2 },
}));
