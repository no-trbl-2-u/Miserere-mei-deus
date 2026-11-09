/**
 * Shared crash-report rendering — the torn-edge technical panel + COPY
 * button + RECENT LOG section from `ErrorBoundary`'s live `ErrorScreen`.
 *
 * Shared so `PrevSessionCrashPrompt` can reuse the exact same report
 * presentation for a *previous* session's crash tail instead of
 * duplicating it or falling back to the dev-only `DebugLogViewer`
 * chrome. `testIDPrefix` defaults to `error-boundary`, the testIDs
 * `ErrorBoundary`'s tests use.
 */

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type AxmLogEntry } from '@mechanics';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

export interface CrashReportPanelProps {
    /** Message (+ stack, + component stack, if any) — caller composes it. */
    technical: string;
    /** Recent structured log entries, oldest-first (already tail-sliced). */
    logTail: AxmLogEntry[];
    testIDPrefix?: string;
}

export function CrashReportPanel({
    technical,
    logTail,
    testIDPrefix = 'error-boundary',
}: CrashReportPanelProps) {
    const styles = useStyles();
    const [copyPressed, setCopyPressed] = useState<boolean>(false);

    const logTailText = logTail.length
        ? logTail
              .map((e) => `${e.seq} ${e.level} ${e.domain}/${e.kind}${e.data !== undefined ? ` ${safeJson(e.data)}` : ''}`)
              .join('\n')
        : '(no recent log entries)';

    const onCopy = () => {
        setCopyPressed(true);
        // Best-effort clipboard write — available on web; silently
        // absent on native (the selectable text stands in there).
        try {
            const clip = (globalThis as GlobalWithClipboard).navigator?.clipboard;
            void clip?.writeText?.(`${technical}\n\n— recent log —\n${logTailText}`);
        } catch { /* pressed-state feedback only */ }
    };

    return (
        <>
            <View style={styles.technicalPanel}>
                <Text style={styles.technicalCaption}>— scribe&apos;s transcription —</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copy"
                    testID={`${testIDPrefix}-copy`}
                    onPress={onCopy}
                    style={[
                        styles.copyButton,
                        copyPressed && styles.copyButtonPressed,
                    ]}
                >
                    <Text
                        style={[
                            styles.copyButtonLabel,
                            copyPressed && styles.copyButtonLabelPressed,
                        ]}
                    >
                        {copyPressed ? '✎ COPIED' : '✎ COPY'}
                    </Text>
                </Pressable>
                <Text
                    style={styles.technicalText}
                    numberOfLines={12}
                    testID={`${testIDPrefix}-technical`}
                    selectable
                >
                    {technical}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>RECENT LOG</Text>
                <View style={styles.sectionBody}>
                    <Text style={styles.codeBlock} selectable testID={`${testIDPrefix}-log-tail`}>
                        {logTailText}
                    </Text>
                </View>
            </View>
        </>
    );
}

/** Web-only clipboard narrow — single-cast, no DOM-lib pull-in. */
type GlobalWithClipboard = {
    readonly navigator?: {
        readonly clipboard?: { readonly writeText?: (text: string) => Promise<void> };
    };
};

function safeJson(data: unknown): string {
    try {
        const s = JSON.stringify(data);
        return s === undefined ? '' : s.length > 160 ? `${s.slice(0, 160)}…` : s;
    } catch {
        return '(unserializable)';
    }
}

const useStyles = makeStyles((AXM) => ({
    technicalPanel: {
        marginTop: 22,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.ash,
        position: 'relative',
        padding: 12,
        paddingTop: 28,
    },
    technicalCaption: {
        position: 'absolute',
        top: 8,
        left: 12,
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 8,
        color: AXM.ash,
    },
    copyButton: {
        position: 'absolute',
        top: 6,
        right: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.backdrop,
    },
    copyButtonPressed: {
        borderColor: AXM.sulfur,
        backgroundColor: AXM.sulfurSubtle,
    },
    copyButtonLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 9,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
        color: AXM.bone,
    },
    copyButtonLabelPressed: { color: AXM.sulfur },
    technicalText: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 10.5,
        lineHeight: 14,
        color: AXM.parchmentDim,
    },
    section: { marginTop: 14 },
    sectionLabel: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 9,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.sulfur,
        marginBottom: 4,
    },
    sectionBody: {
        backgroundColor: AXM.panelBg,
        borderLeftWidth: 2,
        borderLeftColor: AXM.ash,
        padding: 8,
    },
    codeBlock: {
        fontFamily: TYPE_ROLES.count.fontFamily,
        fontSize: 10,
        lineHeight: 14,
        color: AXM.parchment,
    },
}));
