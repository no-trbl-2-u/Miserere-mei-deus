/**
 * /chapter-complete - the far bank's chapter complete screen (phase CE1b).
 *
 * Crossing the bridge out of the Breakwater stops here in place of the toast:
 * a title line, the chapter's name, the run's stats as label and figure rows
 * (`selectChapterCompleteSummary`, read from the state as it stands on the far
 * bank) and one brass CONTINUE, on the victory screen's dark ground and type.
 * Labels only; no narration. The screen holds no state of its own: the world
 * has not moved yet, so a save reopened here stands on the far bank with the
 * crossing still to take. CONTINUE takes it (`continueChapter`), and the
 * screen leaves when the travel slice empties.
 */

import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { BrassButton } from '@/components/experience/BrassButton';
import { ScreenBg } from '@/components/ScreenBg';
import { useRouter } from '@/lib/platform/router';
import { useGameActions, useGameState } from '@/state/GameStoreProvider';
import {
    CHAPTER_COMPLETE_CHAPTER_NAME,
    CHAPTER_COMPLETE_CONTINUE_LABEL,
    CHAPTER_COMPLETE_TITLE,
} from '@/state/presenters/chapter-complete.copy';
import { selectChapterCompleteSummary } from '@/state/presenters/chapter-complete.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export default function ChapterCompleteScreen() {
    const styles = useStyles();
    const router = useRouter();
    const actions = useGameActions();
    const shown = useGameState((s) => s.travel?.chapterComplete === true);
    const player = useGameState((s) => s.player);
    const world = useGameState((s) => s.world);
    const codex = useGameState((s) => s.codex);
    const quests = useGameState((s) => s.quests);
    const flags = useGameState((s) => s.flags);
    const rows = useMemo(
        () => selectChapterCompleteSummary({ player, world, codex, quests, flags } as never),
        [player, world, codex, quests, flags],
    );

    // The slice empties on CONTINUE (or a stale open): leave once.
    useEffect(() => {
        if (!shown && router.canGoBack()) router.back();
    }, [shown, router]);

    if (!shown) return <View style={styles.empty} testID="chapter-complete-empty" />;

    return (
        <ScreenBg scrollable={false}>
            <View style={styles.wrap} testID="chapter-complete">
                <View style={styles.head}>
                    <Text style={styles.title} accessibilityRole="header" testID="chapter-complete-title">
                        {CHAPTER_COMPLETE_TITLE}
                    </Text>
                    <Text style={styles.chapter} testID="chapter-complete-chapter">
                        {CHAPTER_COMPLETE_CHAPTER_NAME}
                    </Text>
                </View>
                <View style={styles.stats} testID="chapter-complete-stats">
                    {rows.map((r) => (
                        <View key={r.id} style={styles.row} testID={`chapter-complete-row-${r.id}`}>
                            <Text style={styles.label}>{r.label}</Text>
                            <Text style={styles.value} testID={`chapter-complete-value-${r.id}`}>{r.value}</Text>
                        </View>
                    ))}
                </View>
                <BrassButton
                    label={CHAPTER_COMPLETE_CONTINUE_LABEL}
                    onPress={actions.continueChapter}
                    place="G-01"
                    align="center"
                    style={styles.button}
                    testID="chapter-complete-continue"
                />
            </View>
        </ScreenBg>
    );
}

const useStyles = makeStyles((AXM) => ({
    empty: { flex: 1, backgroundColor: AXM.deepBg },
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 24 },
    head: { alignItems: 'center', gap: 8 },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 26,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.sulfur,
        textAlign: 'center',
    },
    chapter: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 14,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.parchment,
        textAlign: 'center',
    },
    stats: { width: '100%', maxWidth: 340, gap: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
    label: {
        flexShrink: 1,
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 13,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.bone,
    },
    value: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 16,
        color: AXM.parchment,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    button: { width: '100%', maxWidth: 340 },
}));
