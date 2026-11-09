/**
 * Next-launch "previous session crashed" prompt.
 *
 * `state/logging.ts` installs global JS-error / unhandled-rejection
 * handlers alongside `ErrorBoundary`'s render-error capture; all three
 * force-flush the crash tail with a marker. This component checks that
 * marker on boot and — only when the PREVIOUS session actually crashed —
 * offers a dismissible banner that opens the same report chrome
 * `ErrorBoundary` renders live (`CrashReportPanel`), not the dev-only
 * `DebugLogViewer`.
 *
 * Mounted unconditionally in every build (this is a player-facing crash
 * report, not a dev tool); a clean previous session renders nothing.
 */

import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { CrashReportPanel } from '@/components/CrashReportPanel';
import { getPrevSessionCrash, getPrevSessionLogTail, type CrashInfo } from '@/state/logging';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Crash-tail read is async AsyncStorage I/O — poll a few ticks after
 *  mount rather than wiring a bespoke subscription for a one-shot check. */
const POLL_MS = 200;
const POLL_ATTEMPTS = 10;

export function PrevSessionCrashPrompt() {
    const styles = useStyles();
    const [crash, setCrash] = useState<CrashInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let attempts = 0;
        const tick = () => {
            if (cancelled) return;
            const found = getPrevSessionCrash();
            if (found) {
                setCrash(found);
                return;
            }
            attempts += 1;
            if (attempts < POLL_ATTEMPTS) setTimeout(tick, POLL_MS);
        };
        tick();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!crash || dismissed) return null;

    const logTail = getPrevSessionLogTail() ?? [];

    return (
        <>
            <View style={styles.banner} testID="prev-crash-banner">
                <Pressable
                    style={styles.bannerBody}
                    accessibilityRole="button"
                    accessibilityLabel="View previous session crash report"
                    testID="prev-crash-view"
                    onPress={() => setExpanded(true)}
                >
                    <Text style={styles.bannerText}>
                        ⚠ previous session crashed — view / copy report
                    </Text>
                </Pressable>
                <Pressable
                    style={styles.bannerDismiss}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                    testID="prev-crash-dismiss"
                    onPress={() => setDismissed(true)}
                >
                    <Text style={styles.bannerDismissLabel}>✕</Text>
                </Pressable>
            </View>
            <Modal
                visible={expanded}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setExpanded(false)}
                testID="prev-crash-modal"
            >
                <ScrollView style={styles.modalRoot} contentContainerStyle={styles.modalContent}>
                    <Text style={styles.modalTitle}>the previous chronicle&apos;s tear</Text>
                    <Text style={styles.modalKind} testID="prev-crash-kind">{crash.kind}</Text>
                    <CrashReportPanel
                        technical={crash.message}
                        logTail={logTail}
                        testIDPrefix="prev-crash"
                    />
                    <Pressable
                        style={styles.closeButton}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        testID="prev-crash-close"
                        onPress={() => {
                            setExpanded(false);
                            setDismissed(true);
                        }}
                    >
                        <Text style={styles.closeButtonLabel}>close</Text>
                    </Pressable>
                </ScrollView>
            </Modal>
        </>
    );
}

const useStyles = makeStyles((AXM) => ({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AXM.sulfurSubtle,
        borderBottomWidth: 1,
        borderBottomColor: AXM.sulfur,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    bannerBody: { flex: 1 },
    bannerText: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 11,
        color: AXM.sulfur,
    },
    bannerDismiss: { paddingHorizontal: 8, paddingVertical: 2 },
    bannerDismissLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 12,
        color: AXM.bone,
    },
    modalRoot: { flex: 1, backgroundColor: AXM.panelBg },
    modalContent: { padding: 20, paddingTop: 40, paddingBottom: 48 },
    modalTitle: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 22,
        color: AXM.parchment,
        marginBottom: 4,
    },
    modalKind: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.rust,
        marginBottom: 12,
    },
    closeButton: {
        marginTop: 20,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        alignItems: 'center',
    },
    closeButtonLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 13,
        color: AXM.bone,
    },
}));
