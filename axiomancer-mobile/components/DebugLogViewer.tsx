/**
 * Dev-route log viewer for the AXM Log stream (docs/logging.md).
 *
 * Renders the structured logger's ring buffer newest-first with
 * level/domain filter chips, a previous-session toggle (the crash tail
 * persisted under `@axiomancer/logtail:v1`), and a CLEAR control. Dev
 * tooling only — self-gated like every other Debug* component.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
    AXM_LOG_DOMAINS,
    getLogger,
    type AxmLogDomain,
    type AxmLogEntry,
    type AxmLogLevel,
} from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { getPrevSessionLogTail } from '@/state/logging';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

const LEVEL_CHIPS: readonly (AxmLogLevel | 'all')[] = ['all', 'info', 'warn', 'error'];
const TAIL_COUNT = 100;

export function DebugLogViewer() {
    const styles = useStyles();
    const [minLevel, setMinLevel] = useState<AxmLogLevel | 'all'>('all');
    const [domain, setDomain] = useState<AxmLogDomain | 'all'>('all');
    const [prevSession, setPrevSession] = useState(false);
    // Snapshot-on-demand: bump to re-read the buffer (the viewer does not
    // live-subscribe — a dev pulls to refresh by toggling any chip).
    const [refreshTick, setRefreshTick] = useState(0);

    const entries = useMemo<AxmLogEntry[]>(() => {
        void refreshTick;
        const source = prevSession
            ? getPrevSessionLogTail() ?? []
            : getLogger().tail(TAIL_COUNT, {
                  minLevel: minLevel === 'all' ? undefined : minLevel,
                  domains: domain === 'all' ? undefined : [domain],
              });
        if (!prevSession) return [...source].reverse();
        return [...source]
            .filter((e) => (minLevel === 'all' ? true : rankAtLeast(e.level, minLevel)))
            .filter((e) => (domain === 'all' ? true : e.domain === domain))
            .reverse();
    }, [minLevel, domain, prevSession, refreshTick]);

    const onClear = useCallback(() => {
        getLogger().clear();
        setRefreshTick((t) => t + 1);
    }, []);

    if (!isDevToolsEnabled()) return null;

    return (
        <View style={styles.root} testID="debug-log-viewer">
            <View style={styles.chipRow}>
                {LEVEL_CHIPS.map((lvl) => (
                    <Chip
                        key={lvl}
                        label={lvl.toUpperCase()}
                        active={minLevel === lvl}
                        onPress={() => {
                            setMinLevel(lvl);
                            setRefreshTick((t) => t + 1);
                        }}
                        testID={`debug-log-level-${lvl}`}
                    />
                ))}
            </View>
            <View style={styles.chipRow}>
                <Chip
                    label="ALL"
                    active={domain === 'all'}
                    onPress={() => {
                        setDomain('all');
                        setRefreshTick((t) => t + 1);
                    }}
                    testID="debug-log-domain-all"
                />
                {AXM_LOG_DOMAINS.map((d) => (
                    <Chip
                        key={d}
                        label={d}
                        active={domain === d}
                        onPress={() => {
                            setDomain(d);
                            setRefreshTick((t) => t + 1);
                        }}
                        testID={`debug-log-domain-${d}`}
                    />
                ))}
            </View>
            <View style={styles.chipRow}>
                <Chip
                    label={prevSession ? 'PREVIOUS SESSION' : 'THIS SESSION'}
                    active={prevSession}
                    onPress={() => {
                        setPrevSession((p) => !p);
                        setRefreshTick((t) => t + 1);
                    }}
                    testID="debug-log-prev-session"
                />
                <Chip label="CLEAR" active={false} onPress={onClear} testID="debug-log-clear" />
            </View>
            <ScrollView style={styles.list} testID="debug-log-entries">
                {entries.length === 0 ? (
                    <Text style={styles.emptyLine}>(no entries)</Text>
                ) : (
                    entries.map((e) => (
                        <Text
                            key={e.seq}
                            style={[styles.entryLine, levelStyle(styles, e.level)]}
                            testID="debug-log-entry"
                            selectable
                        >
                            {formatEntry(e)}
                        </Text>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function rankAtLeast(level: AxmLogLevel, min: AxmLogLevel): boolean {
    const order: AxmLogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    return order.indexOf(level) >= order.indexOf(min);
}

function formatEntry(e: AxmLogEntry): string {
    const time = new Date(e.t).toISOString().slice(11, 23);
    let data = '';
    if (e.data !== undefined) {
        try {
            const s = JSON.stringify(e.data);
            data = s === undefined ? '' : ` ${s.length > 140 ? `${s.slice(0, 140)}…` : s}`;
        } catch {
            data = ' (unserializable)';
        }
    }
    return `${time} ${e.level.padEnd(5)} ${e.domain}/${e.kind}${data}`;
}

function levelStyle(
    styles: ReturnType<typeof useStyles>,
    level: AxmLogLevel,
): object | undefined {
    if (level === 'error') return styles.entryError;
    if (level === 'warn') return styles.entryWarn;
    return undefined;
}

function Chip({
    label,
    active,
    onPress,
    testID,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    testID: string;
}) {
    const styles = useStyles();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={[styles.chip, active && styles.chipActive]}
            testID={testID}
        >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
        </Pressable>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        gap: 6,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.backdrop,
    },
    chipActive: {
        borderColor: AXM.sulfur,
        backgroundColor: AXM.sulfurSubtle,
    },
    chipLabel: {
        fontFamily: TYPE_ROLES.chip.fontFamily,
        fontSize: 9,
        color: AXM.bone,
    },
    chipLabelActive: { color: AXM.sulfur },
    list: {
        maxHeight: 320,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
        padding: 6,
    },
    emptyLine: {
        fontFamily: TYPE_ROLES.rules.fontFamily,
        fontSize: 10,
        color: AXM.bone,
    },
    entryLine: {
        fontFamily: TYPE_ROLES.entry.fontFamily,
        fontSize: 9.5,
        lineHeight: 13,
        color: AXM.parchmentDim,
    },
    entryWarn: { color: AXM.sulfur },
    entryError: { color: AXM.blood },
}));
