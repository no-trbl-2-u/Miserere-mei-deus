/**
 * The hazard's stakes card (phase ET1b, trimmed by 154.5): one card before the
 * board with the place, the goal and the time, and nothing else (T). Costs and
 * pay stay in the presenter for the rules. "Face it" leads on to the route select.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HazardStakesVM } from '@/state/presenters/hazard-stakes.engine';
import { KitSurface } from '@/components/experience/KitSurface';
import { PLACE_PIECES, lookOf } from '@/components/experience/looks';
import { HUE, TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

/** The vellum panel the stakes card wears (H-01). */
const [PANEL] = PLACE_PIECES['H-01'];
const WANTS_KIT = lookOf('H-01') !== 'normal';

export function StakesCard({ stakes, onFace }: { stakes: HazardStakesVM; onFace: () => void }) {
    const AXM = usePalette();
    const styles = useStyles();
    return (
        <View style={styles.root} testID="hazard-stakes">
            <ScrollView contentContainerStyle={styles.scroll}>
                <KitSurface
                    wear={WANTS_KIT}
                    piece={PANEL}
                    style={[styles.card, WANTS_KIT ? styles.cardKit : [styles.cardPlain, { borderColor: AXM.blood }]]}
                >
                    <Text style={[styles.place, WANTS_KIT && styles.placeKit]} testID="hazard-stakes-place">{stakes.place}</Text>
                    {stakes.goalLine ? (
                        <Text style={[styles.value, WANTS_KIT && styles.valueKit]} testID="hazard-stakes-goal">{stakes.goalLine}</Text>
                    ) : null}
                    {stakes.timeLine ? (
                        <Text style={[styles.value, WANTS_KIT && styles.valueKit]} testID="hazard-stakes-time">{stakes.timeLine}</Text>
                    ) : null}
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
    card: { gap: 14 },
    cardPlain: { borderWidth: 1, padding: 18, backgroundColor: HUE.hzRouteRiskBg },
    // Clears the vellum panel's drawn corners (about 26 high, 42 wide).
    cardKit: { paddingVertical: 32, paddingHorizontal: 44 },
    place: { ...TYPE_ROLES.title, color: AXM.parchment },
    placeKit: { color: HUE.hzCardInk },
    value: { ...TYPE_ROLES.sectionHead, color: AXM.parchment },
    valueKit: { color: HUE.hzCardInk },
    cta: { borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
    ctaText: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 13, letterSpacing: TYPE_ROLES.button.letterSpacing},
}));
