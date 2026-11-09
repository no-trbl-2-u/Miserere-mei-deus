/**
 * Boss-room pre-fight panel (DESIGN.md section 6 finale doctrine).
 *
 * Warden acts (I/II): a short reckoning + FACE IT. The finale
 * (act III): Borrowed Premise stacks are shown before the fight
 * (softlock-proofing is visible), and when the naming fork is open a
 * free-text input lets the player SPEAK a name — the name itself is
 * never displayed; the player types what they deduced from the ledger
 * signatures. A wrong name costs nothing but the Sophist's contempt.
 */

import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { LABYRINTH_COPY } from '@/state/presenters/labyrinth.engine';
import type { LabyrinthFinaleVM } from '@/state/presenters/labyrinth.engine';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

interface FinalePanelProps {
    vm: LabyrinthFinaleVM;
    onFight: () => void;
    /** Returns true when the spoken name is taken (act resolves). */
    onSpeakName: (spoken: string) => boolean;
}

export function FinalePanel({ vm, onFight, onSpeakName }: FinalePanelProps) {
    const AXM = usePalette();
    const styles = useStyles();
    const [spoken, setSpoken] = useState('');
    const [refused, setRefused] = useState(false);

    const speak = () => {
        if (spoken.trim().length === 0) return;
        const taken = onSpeakName(spoken);
        if (!taken) setRefused(true);
    };

    return (
        <View style={styles.wrap} testID="labyrinth-finale">
            <Text style={styles.title}>{vm.title}</Text>
            <Text style={styles.intro}>{vm.intro}</Text>
            {vm.stacksLine !== null && (
                <Text style={styles.stacks} testID="labyrinth-finale-stacks">{vm.stacksLine}</Text>
            )}

            {vm.isFinale && (
                <View style={styles.naming}>
                    <Text style={styles.namePrompt}>{vm.namePrompt}</Text>
                    {vm.namingOpen && (
                        <>
                            <TextInput
                                value={spoken}
                                onChangeText={(t) => {
                                    setSpoken(t);
                                    setRefused(false);
                                }}
                                placeholder={LABYRINTH_COPY.finaleNamePlaceholder}
                                placeholderTextColor={AXM.ash}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                style={styles.nameInput}
                                testID="labyrinth-name-input"
                            />
                            {refused && (
                                <Text style={styles.refused} testID="labyrinth-name-refused">
                                    {LABYRINTH_COPY.finaleNameWrong}
                                </Text>
                            )}
                            <Pressable
                                onPress={speak}
                                style={styles.speakButton}
                                testID="labyrinth-name-speak"
                            >
                                <Text style={styles.speakText}>{LABYRINTH_COPY.finaleNameSpeak}</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            )}

            <Pressable onPress={onFight} style={styles.fightButton} testID="labyrinth-finale-fight">
                <Text style={styles.fightText}>{vm.fightLabel}</Text>
            </Pressable>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    wrap: {
        padding: 18,
        borderWidth: 2,
        borderColor: AXM.blood,
        backgroundColor: AXM.panelBg,
        gap: 10,
    },
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 24,
        color: AXM.parchment,
        textAlign: 'center',
    },
    intro: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 14,
        lineHeight: 20,
        color: AXM.parchment,
    },
    stacks: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 12,
        color: AXM.blood,
    },
    naming: {
        borderTopWidth: 1,
        borderTopColor: AXM.ash,
        paddingTop: 10,
        gap: 8,
    },
    namePrompt: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.bone,
    },
    nameInput: {
        borderWidth: 1,
        borderColor: AXM.bone,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 16,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.sulfur,
    },
    refused: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 13,
        fontStyle: 'italic',
        color: AXM.blood,
    },
    speakButton: {
        borderWidth: 1,
        borderColor: AXM.sulfur,
        paddingVertical: 8,
        alignItems: 'center',
    },
    speakText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 13,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.sulfur,
    },
    fightButton: {
        borderWidth: 1,
        borderColor: AXM.blood,
        paddingVertical: 10,
        alignItems: 'center',
    },
    fightText: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 14,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.blood,
    },
}));
