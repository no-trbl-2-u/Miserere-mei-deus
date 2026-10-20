/**
 * The dev-only HAZARD PUZZLES move log panel (phase HP2c, A4).
 *
 * Sits under the demo list, between solves: the SOLVER field (typed once for
 * the session), a summary of what is logged, one line per attempt with its
 * solve time, COPY LOG (JSON, through the `copyText` seam) and CLEAR. When no
 * clipboard is reachable it prints the JSON in a selectable block instead, so
 * the log is always extractable.
 *
 * Presentation only. The attempts come from the screen, shaped by
 * `state/presenters/hazard-puzzle-log.engine`; nothing here times or records
 * anything, and the screen mounts the panel only in dev builds.
 */

import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { copyText } from '@/lib/clipboard';
import {
    HAZARD_PUZZLE_LOG_CLEAR_A11Y,
    HAZARD_PUZZLE_LOG_CLEAR_LABEL,
    HAZARD_PUZZLE_LOG_CLEARED_FEEDBACK,
    HAZARD_PUZZLE_LOG_COPIED,
    HAZARD_PUZZLE_LOG_COPY_A11Y,
    HAZARD_PUZZLE_LOG_COPY_FAILED,
    HAZARD_PUZZLE_LOG_COPY_LABEL,
    HAZARD_PUZZLE_LOG_EMPTY,
    HAZARD_PUZZLE_LOG_LABEL,
    HAZARD_PUZZLE_LOG_SOLVER_LABEL,
    HAZARD_PUZZLE_LOG_SOLVER_PLACEHOLDER,
    hazardPuzzleLogAttemptLine,
    hazardPuzzleLogSummary,
} from '@/state/presenters/hazard-puzzle.copy';
import {
    hazardPuzzleLogJson,
    hazardPuzzleSolveSeconds,
    type HazardPuzzleLogAttempt,
} from '@/state/presenters/hazard-puzzle-log.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface HazardPuzzleLogPanelProps {
    attempts: readonly HazardPuzzleLogAttempt[];
    solver: string;
    onSolverChange: (solver: string) => void;
    onClear: () => void;
}

export function HazardPuzzleLogPanel({ attempts, solver, onSolverChange, onClear }: HazardPuzzleLogPanelProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const [feedback, setFeedback] = useState<string | null>(null);
    // Set when no clipboard took the JSON, so the panel shows it for a hand-copy.
    const [fallbackJson, setFallbackJson] = useState<string | null>(null);

    const moves = attempts.reduce((n, a) => n + a.moves.length, 0);
    const json = hazardPuzzleLogJson(attempts);

    const onCopy = () => {
        void copyText(json).then((ok) => {
            setFeedback(ok ? HAZARD_PUZZLE_LOG_COPIED : HAZARD_PUZZLE_LOG_COPY_FAILED);
            setFallbackJson(ok ? null : json);
        });
    };

    return (
        <View style={styles.root} testID="hazard-puzzle-log">
            <Text style={styles.label}>{HAZARD_PUZZLE_LOG_LABEL}</Text>
            <View style={styles.solverRow}>
                <Text style={styles.solverLabel}>{HAZARD_PUZZLE_LOG_SOLVER_LABEL}</Text>
                <TextInput
                    value={solver}
                    onChangeText={onSolverChange}
                    placeholder={HAZARD_PUZZLE_LOG_SOLVER_PLACEHOLDER}
                    placeholderTextColor={AXM.ash}
                    autoCorrect={false}
                    style={styles.solverInput}
                    testID="hazard-puzzle-log-solver"
                />
            </View>
            <Text style={styles.summary} testID="hazard-puzzle-log-summary">
                {hazardPuzzleLogSummary(attempts.length, moves, solver)}
            </Text>
            {attempts.length === 0 ? (
                <Text style={styles.empty}>{HAZARD_PUZZLE_LOG_EMPTY}</Text>
            ) : (
                attempts.map((attempt, i) => (
                    <Text key={`${attempt.layoutId}-${attempt.startedAt}-${i}`} style={styles.attempt} testID={`hazard-puzzle-log-attempt-${i}`}>
                        {hazardPuzzleLogAttemptLine(
                            attempt.layoutId,
                            attempt.route,
                            attempt.moves.length,
                            hazardPuzzleSolveSeconds(attempt),
                            attempt.end === null ? null : attempt.end.cleared,
                        )}
                    </Text>
                ))
            )}
            {feedback !== null ? (
                <Text style={styles.feedback} testID="hazard-puzzle-log-feedback">
                    {feedback}
                </Text>
            ) : null}
            <View style={styles.buttons}>
                <Pressable
                    onPress={onCopy}
                    accessibilityRole="button"
                    accessibilityLabel={HAZARD_PUZZLE_LOG_COPY_A11Y}
                    style={styles.button}
                    testID="hazard-puzzle-log-copy"
                >
                    <Text style={styles.buttonLabel}>{HAZARD_PUZZLE_LOG_COPY_LABEL}</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        onClear();
                        setFallbackJson(null);
                        setFeedback(HAZARD_PUZZLE_LOG_CLEARED_FEEDBACK);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={HAZARD_PUZZLE_LOG_CLEAR_A11Y}
                    style={styles.button}
                    testID="hazard-puzzle-log-clear"
                >
                    <Text style={styles.buttonLabel}>{HAZARD_PUZZLE_LOG_CLEAR_LABEL}</Text>
                </Pressable>
            </View>
            {fallbackJson !== null ? (
                <Text style={styles.json} selectable testID="hazard-puzzle-log-json">
                    {fallbackJson}
                </Text>
            ) : null}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { borderWidth: 1, borderColor: AXM.ash, borderStyle: 'dashed', padding: 10, gap: 6 },
    label: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.bone },
    solverRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    solverLabel: { fontFamily: FONTS.mono, fontSize: 9, letterSpacing: 1.5, color: AXM.bone },
    solverInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingHorizontal: 8,
        paddingVertical: 5,
        fontFamily: FONTS.mono,
        fontSize: 11,
        color: AXM.parchment,
    },
    summary: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.parchment },
    empty: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.ash },
    attempt: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone },
    feedback: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.sulfur },
    buttons: { flexDirection: 'row', gap: 6 },
    button: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: AXM.sulfur },
    buttonLabel: { fontFamily: FONTS.gothic, fontSize: 12, letterSpacing: 1.5, color: AXM.sulfur },
    json: { fontFamily: FONTS.mono, fontSize: 8, color: AXM.parchment },
}));
