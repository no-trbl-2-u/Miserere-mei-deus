/**
 * Gate of Assent / Foundation socket UI (DESIGN.md sections 5-7).
 *
 * Sockets in a row (4 / 4 / 13). Words already proven at earlier
 * gates arrive pre-confirmed ("the house remembers your assents") and
 * cannot be taken back. The player lays pocket chips into the rest —
 * tap a chip to lay it in the next empty socket, tap a laid socket to
 * take the word back. Unlimited attempts; refusals are the caller's
 * to show (each one is ledgered by the engine).
 *
 * The correct answer is never rendered — only what the player lays.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LABYRINTH_COPY } from '@/state/presenters/labyrinth.engine';
import type { LabyrinthGateVM, LabyrinthPocketChipVM } from '@/state/presenters/labyrinth.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

interface GateSocketsProps {
    gate: LabyrinthGateVM;
    pocket: readonly LabyrinthPocketChipVM[];
    /** The Sophist's response to the last submission (refusal/success). */
    resultLine: string | null;
    onSubmit: (words: readonly string[]) => void;
}

export function GateSockets({ gate, pocket, resultLine, onSubmit }: GateSocketsProps) {
    const styles = useStyles();
    // Words the player has laid into the open sockets, in order.
    const [laid, setLaid] = useState<string[]>([]);

    const openSockets = gate.socketCount - gate.preConfirmed.length;
    const distinctWords = useMemo(
        () => [...new Set(pocket.map((c) => c.word))],
        [pocket],
    );

    const layWord = (word: string) => {
        if (laid.length >= openSockets) return;
        setLaid((prev) => [...prev, word]);
    };
    const takeBack = (index: number) => {
        setLaid((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <View style={styles.wrap} testID="labyrinth-gate">
            <Text style={styles.riddle}>{gate.riddle}</Text>

            <View style={styles.socketRow}>
                {gate.preConfirmed.map((word, i) => (
                    <View key={`pre-${i}`} style={[styles.socket, styles.socketConfirmed]}>
                        <Text style={styles.socketConfirmedText}>{word}</Text>
                    </View>
                ))}
                {Array.from({ length: openSockets }, (_, i) => {
                    const word = laid[i];
                    return (
                        <Pressable
                            key={`open-${i}`}
                            onPress={() => word !== undefined && takeBack(i)}
                            style={[styles.socket, word !== undefined && styles.socketLaid]}
                            testID={`labyrinth-socket-${i}`}
                        >
                            <Text style={word !== undefined ? styles.socketLaidText : styles.socketEmptyText}>
                                {word ?? LABYRINTH_COPY.socketEmpty}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.chipRow}>
                {distinctWords.map((word) => {
                    const spent = laid.includes(word);
                    return (
                        <Pressable
                            key={word}
                            onPress={() => !spent && layWord(word)}
                            style={[styles.chip, spent && styles.chipSpent]}
                            testID={`labyrinth-gate-chip-${word}`}
                        >
                            <Text style={styles.chipText}>{word}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {resultLine !== null && (
                <Text style={styles.resultLine} testID="labyrinth-gate-line">{resultLine}</Text>
            )}

            <View style={styles.buttonRow}>
                <Pressable
                    onPress={() => setLaid([])}
                    style={styles.clearButton}
                    testID="labyrinth-gate-clear"
                >
                    <Text style={styles.clearText}>{LABYRINTH_COPY.gateClear}</Text>
                </Pressable>
                <Pressable
                    onPress={() => onSubmit([...gate.preConfirmed, ...laid])}
                    style={[styles.submitButton, laid.length < openSockets && styles.submitDim]}
                    testID="labyrinth-gate-submit"
                >
                    <Text style={styles.submitText}>{LABYRINTH_COPY.gateSubmit}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: {
        padding: 14,
    },
    riddle: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
        color: AXM.sulfur,
        marginBottom: 12,
    },
    socketRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    socket: {
        minWidth: 52,
        borderWidth: 1,
        borderColor: AXM.bone,
        borderStyle: 'dashed',
        paddingHorizontal: 8,
        paddingVertical: 6,
        alignItems: 'center',
    },
    socketConfirmed: {
        borderStyle: 'solid',
        borderColor: AXM.ash,
        backgroundColor: AXM.nodeBg,
    },
    socketConfirmedText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.bone,
    },
    socketLaid: {
        borderStyle: 'solid',
        borderColor: AXM.sulfur,
    },
    socketLaidText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.sulfur,
    },
    socketEmptyText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        color: AXM.ash,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    chip: {
        borderWidth: 1,
        borderColor: AXM.rust,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    chipSpent: {
        opacity: 0.35,
    },
    chipText: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 13,
        color: AXM.parchment,
    },
    resultLine: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.parchment,
        marginBottom: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    clearButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.ash,
        paddingVertical: 10,
        alignItems: 'center',
    },
    clearText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.bone,
    },
    submitButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        paddingVertical: 10,
        alignItems: 'center',
    },
    submitDim: {
        opacity: 0.6,
    },
    submitText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.sulfur,
    },
}));
