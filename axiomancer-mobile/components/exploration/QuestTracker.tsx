import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';
import { FONTS } from '@/theme/axm';
import { KitBackdrop, KitImage } from '@/components/experience/KitBackdrop';
import { makeStyles } from '@/theme/runtime';
import { useGameState } from '@/state/GameStoreProvider';
import { selectQuestTrackerVM } from '@/state/presenters/quest-tracker.engine';
import { TRACKER_HEAD, trackerMoreLine } from '@/state/presenters/quest.copy';

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
    const styles = useStyles();
    const router = useRouter();
    return (
        <Pressable
            onPress={() => router.push('/(tabs)/memoir')}
            accessibilityRole="button"
            accessibilityLabel="Open the quest list"
            testID="quest-tracker"
            style={styles.box}
        >
            <KitBackdrop piece="quest-row-dark" />
            <View style={styles.headRow}>
                <KitImage piece="nav-marker-star" style={styles.headMark} />
                <Text style={styles.head}>{TRACKER_HEAD}</Text>
            </View>
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

const useStyles = makeStyles((AXM) => ({
    box: {
        marginHorizontal: 6,
        marginBottom: 6,
        paddingHorizontal: 50,
        paddingVertical: 14,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headMark: { width: 11, height: 11 },
    head: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.sulfur },
    row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 3 },
    text: { flex: 1 },
    name: { fontFamily: FONTS.gothic, fontSize: 13, color: AXM.parchment },
    objective: { fontFamily: FONTS.serifItalic, fontSize: 11, color: AXM.bone },
    progress: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, color: AXM.parchment },
    more: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: AXM.bone, marginTop: 3 },
}));
