import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { useGameState } from '@/state/GameStoreProvider';
import { selectQuestTrackerVM } from '@/state/presenters/quest-tracker.engine';
import { TRACKER_HEAD, trackerMoreLine } from '@/state/presenters/quest.copy';

/**
 * The exploration screen's quest tracker (phase MQ1c): each active quest's
 * name and its next unmet objective with its count, three rows then `+n more`.
 * Tapping it opens the memoir's quest list. Draws nothing for an empty log.
 * Reads the log through `selectQuestTrackerVM`; decides no rule.
 */
export function QuestTracker() {
    const quests = useGameState((s) => s.quests);
    const vm = React.useMemo(() => selectQuestTrackerVM({ quests }), [quests]);
    if (vm.rows.length === 0) return null;
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
            <Text style={styles.head}>{TRACKER_HEAD}</Text>
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
        marginHorizontal: 10,
        marginBottom: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.panelBg,
    },
    head: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.sulfur },
    row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 3 },
    text: { flex: 1 },
    name: { fontFamily: FONTS.gothic, fontSize: 13, color: AXM.parchment },
    objective: { fontFamily: FONTS.serifItalic, fontSize: 11, color: AXM.bone },
    progress: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, color: AXM.parchment },
    more: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: AXM.bone, marginTop: 3 },
}));
