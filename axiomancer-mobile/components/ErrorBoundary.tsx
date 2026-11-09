/**
 * App-wide React ErrorBoundary + ErrorScreen.
 *
 * Catches runtime render errors anywhere in the subtree so the
 * app shows a debug screen instead of breaking (white screen on
 * web, native red box on iOS/Android).
 *
 * The fallback lives in the same gothic-chronicle register as the
 * rest of the app:
 *
 *   - Heavy diagonal hatch background (a "damaged page" feel).
 *   - `THE BINDING TORE` gothic title with a blood drop-shadow.
 *   - In-world error code (`E_BOUND_LOOSE`, etc.) as a chapter
 *     marker eyebrow.
 *   - Torn-edge inset panel containing the technical stack +
 *     a ✎ COPY button that flashes sulfur on press.
 *   - Italic scribe-note hint line.
 *   - ✠ TRY AGAIN primary parchment button + `return to the
 *     hearth` ghost bone-italic.
 *   - "the chronicle is incomplete — but not lost." consolation
 *     line at the very bottom.
 *
 * The technical diagnostics (state snapshot + build context)
 * still ship for crash-report purposes — they sit below the
 * design's main chrome as collapsible-feel sections so a debug
 * audience can scroll to them without breaking the in-world
 * register for non-debug users.
 *
 * COPY does a best-effort `navigator.clipboard.writeText` (works
 * on web; silently no-ops on native, where the pressed-state
 * feedback plus the `selectable` technical text stand in — a real
 * native write would require adding `expo-clipboard`). When crash
 * reporting (Sentry / similar) lands, the technical block goes
 * there automatically.
 *
 * AXM Log (docs/logging.md): the boundary logs the crash to the
 * `error` domain, force-flushes the crash tail so the trace
 * survives a restart, and renders the recent log tail as its own
 * diagnostics section.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { getLogger, type AxmLogEntry } from '@mechanics';

import { CrashReportPanel } from '@/components/CrashReportPanel';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';
import { useGameState } from '@/state/GameStoreProvider';
import { flushLogTail } from '@/state/logging';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
    componentStack: string | null;
}

export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { error: null, componentStack: null };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {

        if (__DEV__) {
            console.error('[ErrorBoundary] caught', error, info);
        }
        // AXM Log: record the crash (every build) and force the crash
        // tail to disk so the trace survives a restart.
        try {
            getLogger().error('error', 'react-boundary', {
                message: error.message,
                stack: error.stack,
                componentStack: info.componentStack ?? null,
            });
            void flushLogTail({ kind: 'react-boundary', message: error.message });
        } catch { /* the boundary must never crash itself */ }
        this.setState({ componentStack: info.componentStack ?? null });
    }

    reset = (): void => {
        this.setState({ error: null, componentStack: null });
    };

    render(): ReactNode {
        if (this.state.error !== null) {
            return (
                <ErrorScreen
                    error={this.state.error}
                    componentStack={this.state.componentStack}
                    onReset={this.reset}
                />
            );
        }
        return this.props.children;
    }
}

interface ErrorScreenProps {
    error: Error;
    componentStack: string | null;
    onReset: () => void;
}

/**
 * Map a thrown Error onto a short in-world code rendered as a
 * chapter marker under the gothic title. Mirrors the bundle's
 * `E_BOUND_LOOSE` example. Fallback covers any uncategorized
 * crash so the chrome always has a code to render.
 */
function deriveErrorCode(error: Error): string {
    const name = error.name ?? '';
    const msg = error.message ?? '';
    if (name === 'TypeError' || /undefined|null/.test(msg)) {
        return 'E_PAGE_TORN';
    }
    if (name === 'SyntaxError') {
        return 'E_SIGIL_BROKE';
    }
    if (/network|fetch/i.test(msg)) {
        return 'E_THE_LINE_WENT_QUIET';
    }
    return 'E_BOUND_LOOSE';
}

function ErrorScreen({ error, componentStack, onReset }: ErrorScreenProps) {
    const styles = useStyles();
    const errorCode = deriveErrorCode(error);
    const technical = `${error.message || '(no message)'}${error.stack ? `\n${error.stack}` : ''}${componentStack !== null ? `\n\n— component stack —${componentStack}` : ''}`;

    // Recent structured log tail (info+) — the "what led up to this"
    // record. Guarded: the logger never throws, but stay paranoid at
    // the crash surface.
    let logTail: AxmLogEntry[] = [];
    try {
        logTail = getLogger().tail(30, { minLevel: 'info' });
    } catch { /* render without the tail */ }

    // Read engine state for the debug snapshot. Guard against the
    // store throwing too (the provider may itself be where the
    // crash originated); fall back to a "store unavailable" line.
    let stateSnapshot: string;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        stateSnapshot = useStateSnapshot();
    } catch (e) {
        stateSnapshot = `(store snapshot unavailable: ${(e as Error)?.message ?? String(e)})`;
    }

    return (
        <View style={styles.root} testID="error-boundary-screen">
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <View style={styles.hatchBg} pointerEvents="none" />

                {/* Chapter marker — rust eyebrow */}
                <Text style={styles.errorCode} testID="error-boundary-code">
                    {errorCode}
                </Text>

                {/* Illuminated gothic title with blood drop-shadow */}
                <Text style={styles.title}>
                    <Text style={styles.titleShadowBlood}>THE BINDING TORE</Text>
                </Text>
                <Text style={styles.titleOverlay}>THE BINDING TORE</Text>

                {/* Scribe note — italic margin gloss */}
                <Text style={styles.scribeHint}>
                    “a brittle binding came apart in the press; the scribe is rebinding.”
                </Text>

                {/* Torn-edge technical panel + COPY + RECENT LOG —
                    shared with the next-launch prompt (CrashReportPanel). */}
                <CrashReportPanel technical={technical} logTail={logTail} />

                {/* Diagnostics — kept for crash-report eyeballing */}
                <Section label="STATE SNAPSHOT">
                    <Text style={styles.codeBlock}>{stateSnapshot}</Text>
                </Section>

                <Section label="BUILD CONTEXT">
                    <Text style={styles.codeBlock}>{buildContext()}</Text>
                </Section>

                {/* Primary + ghost actions */}
                <View style={styles.actions}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.tryAgain,
                            pressed && styles.tryAgainPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                        testID="error-boundary-try-again"
                        onPress={onReset}
                    >
                        <Text style={styles.tryAgainLabel}>✠ TRY AGAIN</Text>
                    </Pressable>
                    <Pressable
                        style={styles.returnHearth}
                        accessibilityRole="button"
                        accessibilityLabel="Return to the hearth"
                        testID="error-boundary-return-hearth"
                        onPress={onReset}
                    >
                        <Text style={styles.returnHearthLabel}>
                            return to the hearth
                        </Text>
                    </Pressable>
                </View>

                <Text style={styles.consolation}>
                    the chronicle is incomplete — but not lost.
                </Text>
            </ScrollView>
        </View>
    );
}

/**
 * Hook that builds a compact JSON snapshot of the engine slices
 * worth eyeballing during a crash. Kept small on purpose — full
 * `state.player.inventory` arrays would drown the screen.
 */
function useStateSnapshot(): string {
    const player = useGameState((s) => s.player);
    const world = useGameState((s) => s.world);
    const recentEvents = useGameState((s) => s._recentEvents);

    const snapshot = {
        player: player
            ? {
                  name: player.name,
                  level: player.level,
                  health: player.health,
                  maxHealth: player.maxHealth,
                  experience: player.experience,
                  inventoryCount: Array.isArray(player.inventory) ? player.inventory.length : 0,
              }
            : null,
        world: world?.currentMap
            ? {
                  continent: world.currentContinent?.name,
                  map: world.currentMap.name,
                  currentNode: world.currentMap.currentNode ?? null,
                  // `Array.isArray` is defense-in-depth at the
                  // error-display surface — engine declares
                  // `completedNodes: NodeId[]` as required, but if a
                  // future store-state corruption ever surfaces here,
                  // we'd rather render `0` than throw inside the
                  // ErrorBoundary itself.
                  completedCount: Array.isArray(world.currentMap.completedNodes)
                      ? world.currentMap.completedNodes.length
                      : 0,
              }
            : null,
        recentEvents: Array.isArray(recentEvents)
            ? recentEvents.slice(0, 5).map((e) => e?.type ?? '?')
            : null,
    };
    return JSON.stringify(snapshot, null, 2);
}

/**
 * Cross-runtime narrow on `globalThis` — `navigator.userAgent` exists
 * on web (browser, Expo web), is absent on native. The narrow extension
 * keeps the boundary cast explicit (single `as`, no `any`) without
 * pulling DOM-lib typings into a file that ships on both platforms.
 */
type GlobalWithNavigator = { readonly navigator?: { readonly userAgent?: unknown } };

function buildContext(): string {
    // Module-time captured at first render; effectively constant
    // for the session.
    const dev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : 'unknown';
    const ua = (globalThis as GlobalWithNavigator).navigator?.userAgent;
    return JSON.stringify(
        {
            dev,
            timestamp: new Date().toISOString(),
            platform: typeof ua === 'string' ? ua : 'native',
        },
        null,
        2,
    );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
    const styles = useStyles();
    return (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{label}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

declare const __DEV__: boolean | undefined;

const useStyles = makeStyles((AXM) => ({
    root: {
        flex: 1,
        backgroundColor: AXM.panelBg,
    },
    scroll: { flex: 1 },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
        paddingBottom: 48,
    },
    /**
     * Heavy diagonal hatch overlay — approximation using a
     * borderStyle: 'dashed' top edge. react-native doesn't ship
     * proper diagonal-stripe primitives; this gives the surface
     * a visibly-distressed feel without bringing in an SVG dep.
     */
    hatchBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.06,
        borderTopWidth: 100,
        borderTopColor: AXM.parchment,
        borderStyle: 'dashed',
    },
    errorCode: {
        fontFamily: TYPE_ROLES.eyebrow.fontFamily,
        fontSize: 10,
        letterSpacing: TYPE_ROLES.eyebrow.letterSpacing,
        color: AXM.rust,
        textAlign: 'center',
        marginBottom: 4,
    },
    // The gothic title renders twice — blood-shadow underneath +
    // parchment overlay on top. Stacked Text nodes inside a single
    // line keep the offsets predictable.
    title: {
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 38,
        lineHeight: 42,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.parchment,
        textAlign: 'center',
        marginTop: 8,
    },
    titleShadowBlood: {
        color: AXM.blood,
        opacity: 0.35,
    },
    titleOverlay: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        fontFamily: TYPE_ROLES.title.fontFamily,
        fontSize: 38,
        lineHeight: 42,
        letterSpacing: TYPE_ROLES.title.letterSpacing,
        color: AXM.parchment,
        textAlign: 'center',
    },
    scribeHint: {
        fontFamily: TYPE_ROLES.narration.fontFamily,
        fontSize: 13,
        lineHeight: 18,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 22,
        paddingHorizontal: 14,
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
    actions: {
        marginTop: 22,
        gap: 6,
    },
    tryAgain: {
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: AXM.parchment,
        backgroundColor: AXM.silhouette,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tryAgainPressed: { opacity: 0.85 },
    tryAgainLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 16,
        color: AXM.parchment,
        letterSpacing: TYPE_ROLES.button.letterSpacing,
    },
    returnHearth: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    returnHearthLabel: {
        fontFamily: TYPE_ROLES.button.fontFamily,
        fontSize: 13,
        color: AXM.bone,
    },
    consolation: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 9,
        color: AXM.bone,
        textAlign: 'center',
        marginTop: 14,
    },
}));
