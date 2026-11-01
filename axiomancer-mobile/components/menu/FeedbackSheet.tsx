/**
 * FeedbackSheet — the modal behind SETTINGS > SEND FEEDBACK: pick BUG or
 * PROPOSAL, type up to 1000 characters, SUBMIT or CANCEL.
 *
 * Inputs: `visible`, `onSubmit(draft)`, `onClose`. The form's state is local
 * and is forgotten whenever the sheet closes (CANCEL, the back gesture, a tap
 * outside, or a submit). Nothing is sent or stored here: the caller decides
 * what a `FeedbackDraft` becomes. Copy and rules: `settings.engine.ts`.
 */

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { OptionRow } from '@/components/menu/OptionRow';
import {
    EMPTY_FEEDBACK_FORM,
    FEEDBACK_COPY,
    FEEDBACK_KIND_OPTIONS,
    FEEDBACK_MAX_CHARS,
    selectFeedbackViewModel,
    type FeedbackDraft,
    type FeedbackFormState,
    type FeedbackKind,
} from '@/state/presenters/settings.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';

export interface FeedbackSheetProps {
    visible: boolean;
    onSubmit: (draft: FeedbackDraft) => void;
    onClose: () => void;
    testID?: string;
}

export function FeedbackSheet({ visible, onSubmit, onClose, testID = 'feedback-sheet' }: FeedbackSheetProps) {
    const AXM = usePalette();
    const styles = useStyles();
    const [form, setForm] = useState<FeedbackFormState>(EMPTY_FEEDBACK_FORM);
    const vm = selectFeedbackViewModel(form);

    // A closed sheet forgets what was typed.
    useEffect(() => {
        if (!visible) setForm(EMPTY_FEEDBACK_FORM);
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} testID={testID}>
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
                accessibilityLabel={FEEDBACK_COPY.cancel}
                testID={`${testID}-backdrop`}
            />
            <View style={styles.panelWrap} pointerEvents="box-none">
                <View style={styles.panel}>
                    <Text style={styles.title}>{FEEDBACK_COPY.title}</Text>
                    <OptionRow<FeedbackKind | 'none'>
                        label={FEEDBACK_COPY.kindLabel}
                        options={FEEDBACK_KIND_OPTIONS}
                        value={form.kind ?? 'none'}
                        onChange={(kind) => setForm((f) => ({ ...f, kind: kind === 'none' ? null : kind }))}
                        testID={`${testID}-kind`}
                    />
                    <TextInput
                        style={styles.input}
                        value={vm.text}
                        onChangeText={(text) => setForm((f) => ({ ...f, text }))}
                        placeholder={FEEDBACK_COPY.placeholder}
                        placeholderTextColor={AXM.bone}
                        multiline
                        maxLength={FEEDBACK_MAX_CHARS}
                        textAlignVertical="top"
                        accessibilityLabel={FEEDBACK_COPY.title}
                        testID={`${testID}-text`}
                    />
                    <Text style={styles.count} testID={`${testID}-count`}>{vm.countLabel}</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={FEEDBACK_COPY.submit}
                            accessibilityState={{ disabled: !vm.canSubmit }}
                            disabled={!vm.canSubmit}
                            onPress={() => { if (vm.draft) onSubmit(vm.draft); }}
                            style={[styles.button, styles.submitButton, !vm.canSubmit && styles.disabled]}
                            testID={`${testID}-submit`}
                        >
                            <Text style={[styles.buttonLabel, styles.submitLabel]}>{FEEDBACK_COPY.submit}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={FEEDBACK_COPY.cancel}
                            onPress={onClose}
                            style={[styles.button, styles.cancelButton]}
                            testID={`${testID}-cancel`}
                        >
                            <Text style={[styles.buttonLabel, styles.cancelLabel]}>{FEEDBACK_COPY.cancel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles((AXM) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: AXM.bg, opacity: 0.85 },
    panelWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
    panel: {
        backgroundColor: AXM.panelBg,
        borderWidth: 1,
        borderColor: AXM.ash,
        borderLeftWidth: 3,
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 10,
    },
    title: { fontFamily: FONTS.gothic, fontSize: 22, color: AXM.parchment },
    input: {
        minHeight: 120,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.bg,
        color: AXM.parchment,
        fontFamily: FONTS.serif,
        fontSize: 13,
        padding: 10,
    },
    count: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone, textAlign: 'right' },
    actions: { gap: 8, marginTop: 4 },
    button: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
    submitButton: { borderColor: AXM.sulfur, backgroundColor: AXM.selectFill },
    cancelButton: { borderColor: AXM.ash, borderStyle: 'dashed', backgroundColor: 'transparent' },
    disabled: { opacity: 0.4 },
    buttonLabel: { fontFamily: FONTS.gothic, fontSize: 13, letterSpacing: 1.5 },
    submitLabel: { color: AXM.sulfur },
    cancelLabel: { color: AXM.bone },
}));
