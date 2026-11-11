/**
 * Dev-only DEFEAT PANEL preview (176 FE1d): the post-fight summary on a lost
 * fight, with its cause line, on the house look. A real defeat needs a lost
 * fight; this route mounts the same `CombatSummaryModal` from a fixed summary
 * so `verify:visual` can shoot it. Gated to dev-tools builds; production
 * renders nothing.
 *
 * Route: /devdefeat. Optional `?cause=turn-limit` (default `vitae`).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CombatSummary } from '@mechanics';

import { CombatSummaryModal } from '@/components/combat/encounter/CombatSummaryModal';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { HUE } from '@/theme/axm';

const PREVIEW_SUMMARY: CombatSummary = {
    outcome: 'defeat',
    headline: 'Defeat',
    rows: [
        { cardId: 'preview-poultice', name: 'Spoiled Poultice', dotDamage: 14, damageDealt: 0, phases: 4 },
        { cardId: 'preview-hymn', name: 'Thin Hymn', dotDamage: 0, damageDealt: 6, phases: 2 },
    ],
    totalDotDamage: 14,
    directDamage: 6,
    bestCard: 'Spoiled Poultice',
};

export default function DevDefeatPreview() {
    const params = useLocalSearchParams<{ cause?: string }>();
    const router = useRouter();
    if (!isDevToolsEnabled()) return <View style={styles.root} testID="devdefeat-disabled" />;
    const defeatCause = params.cause === 'turn-limit' ? 'turn-limit' : 'vitae';
    return (
        <View style={styles.root} testID="devdefeat-screen">
            <CombatSummaryModal summary={{ ...PREVIEW_SUMMARY, defeatCause }} onClose={() => router.back()} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: HUE.inkBg },
});
