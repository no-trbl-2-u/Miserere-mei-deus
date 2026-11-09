import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { useGameState } from '@/state/GameStoreProvider';
import { selectQuestTrackerVM } from '@/state/presenters/quest-tracker.engine';
import { trackerMoreLine } from '@/state/presenters/quest.copy';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD, overlay } from '@/components/exploration/wildsInk';

/**
 * The exploration screen's quest tracker (phase MQ1c): each active quest's
 * name and its next unmet objective with its count, three rows then `+n more`.
 * Tapping it opens the memoir's quest list. Draws nothing for an empty log.
 * Reads the log through `selectQuestTrackerVM`; decides no rule.
 *
 * It sits at the FOOT of the exploration screen (T, 2026-11-02), in the slot
 * the map's flavour line used to hold, so `fallback` is what that slot shows
 * for a pilgrim with no active quest.
 */
export function QuestTracker({ fallback = null }: { fallback?: React.ReactNode } = {}) {
    const quests = useGameState((s) => s.quests);
    const vm = React.useMemo(() => selectQuestTrackerVM({ quests }), [quests]);
    if (vm.rows.length === 0) return <>{fallback}</>;
    return <QuestTrackerBody vm={vm} />;
}

function QuestTrackerBody({ vm }: { vm: ReturnType<typeof selectQuestTrackerVM> }) {
    const base = useStyles();
    const inked = useVellumStyles();
    // W-04: vellum and ink. `normal` keeps today's tracker.
    const vellum = lookOf('W-04') === 'vellum';
    const styles = vellum ? overlay(base, inked) : base;
    const router = useRouter();
    return (
        <Pressable
            onPress={() => router.push('/(tabs)/memoir')}
            accessibilityRole="button"
            accessibilityLabel="Open the quest list"
            testID="quest-tracker"
            style={styles.box}
        >
            {vellum && <KitBackdrop piece="quest-row-vellum" />}
            {vm.rows.map((row) => (
                <View key={row.id} style={styles.row} testID={`quest-tracker-row-${row.id}`}>
                    <View style={styles.text}>
                        <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
                        <Text style={styles.objective} numberOfLines={1}>{row.objective}</Text>
                    </View>
                    {row.progress.length > 0 && <Text style={styles.progress}>{row.progress}</Text>}
                </View>
            ))}
            {vm.more > 0 && <Text style={styles.more} testID="quest-tracker-more">{trackerMoreLine(vm.more)}</Text>}
        </Pressable>
    );
}

/**
 * The vellum look over today's styles. The padding keeps the writing inside
 * the piece's ruled frame, clear of its corner flourishes. Ink and oxblood
 * only (wildsInk.ts): no gold or amber on the parchment.
 */
const useVellumStyles = makeStyles(() => ({
    box: {
        marginHorizontal: 8,
        marginBottom: 8,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    name: { color: VELLUM_INK },
    objective: { color: INK_SOFT },
    progress: { color: VELLUM_OXBLOOD },
    more: { color: INK_SOFT },
}));

const useStyles = makeStyles((AXM) => ({
    box: {
        marginHorizontal: 10,
        marginBottom: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 3 },
    text: { flex: 1 },
    name: { fontFamily: TYPE_ROLES.title.fontFamily, fontSize: 13, color: AXM.parchment },
    objective: { fontFamily: TYPE_ROLES.entry.fontFamily, fontSize: 11, color: AXM.bone },
    progress: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 11, color: AXM.parchment },
    more: { fontFamily: TYPE_ROLES.rules.fontFamily, fontSize: 10, color: AXM.bone, marginTop: 3 },
}));
