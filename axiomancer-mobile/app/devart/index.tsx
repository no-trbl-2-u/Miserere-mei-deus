/**
 * Dev-only enemy-art gallery. Renders every
 * bespoke enemy archetype illustration in a grid so the procedural SVG
 * figures can be eyeballed without driving combat to each foe. Gated to
 * dev builds; production renders nothing.
 *
 * Route: /devart
 */

import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { EnemyIllustration } from '@/components/event/enemy-art/EnemyIllustration';

const SAMPLES: ReadonlyArray<{ label: string; key: string; boss?: boolean }> = [
    { label: 'vermin', key: 'bilge-rat' },
    { label: 'crustacean', key: 'tidepool-crab' },
    { label: 'spirit', key: 'drowned-wraith' },
    { label: 'beast', key: 'grey-wolf' },
    { label: 'avian', key: 'mournful-gull' },
    { label: 'flora', key: 'bramble-sprite' },
    { label: 'zealot', key: 'green-jelly' },
    { label: 'eldritch', key: 'float-eye' },
    { label: 'tyrant (boss)', key: 'death-beholder', boss: true },
    { label: 'generic', key: 'mystery-foe' },
];

export default function DevArtGallery() {
    const styles = useStyles();
    if (!isDevToolsEnabled()) {
        return <View style={styles.root} testID="devart-disabled" />;
    }
    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="devart-gallery">
            <Text style={styles.heading}>ENEMY ART GALLERY</Text>
            <View style={styles.grid}>
                {SAMPLES.map((s) => (
                    <View key={s.label} style={styles.cell}>
                        <View style={styles.frame}>
                            <EnemyIllustration enemyArtKey={s.key} isBoss={s.boss} />
                        </View>
                        <Text style={styles.label}>{s.label}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, backgroundColor: AXM.bg },
    content: { padding: 12, paddingBottom: 48 },
    heading: {
        fontFamily: FONTS.gothic,
        fontSize: 18,
        color: AXM.sulfur,
        letterSpacing: 2,
        marginBottom: 12,
        textAlign: 'center',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    cell: { width: '48%', marginBottom: 12 },
    frame: {
        width: '100%',
        height: 150,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        overflow: 'hidden',
    },
    label: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: AXM.bone,
        letterSpacing: 1,
        marginTop: 4,
        textAlign: 'center',
    },
}));
