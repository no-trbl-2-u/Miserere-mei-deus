/**
 * <ToastHost> — global transient feedback.
 *
 * Subscribes to engine `inventory:changed` events via
 * `useGameEvents`, runs each through `selectInventoryToast`, and
 * pushes the resulting string into the mobile `notifications.toast`
 * slice. Renders the current toast as a small pinned-bottom strip
 * that auto-clears ~3 seconds after each new dispatch.
 *
 * Lives inside `app/_layout.tsx` so any screen can fire a toast
 * without per-screen wiring.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';

import { useGameEvents, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { selectInventoryToast } from '@/state/presenters/inventory-feedback.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

const TOAST_TTL_MS = 3000;

export function ToastHost() {
    const styles = useStyles();
    const store = useGameStore();
    const toast = useGameState((s) => s.notifications?.toast ?? { text: null, id: 0 });
    const lastClearedIdRef = useRef<number>(toast.id);

    useGameEvents((event) => {
        const text = selectInventoryToast(event);
        if (text === null) return;
        const prev = store.getState().notifications;
        store.setState({
            notifications: {
                levelUpAcknowledged: prev?.levelUpAcknowledged ?? true,
                questAcknowledged: prev?.questAcknowledged ?? true,
                toast: {
                    text,
                    id: (prev?.toast?.id ?? 0) + 1,
                },
            },
        });
    });

    useEffect(() => {
        if (toast.text === null) return;
        if (lastClearedIdRef.current === toast.id) return;
        const currentId = toast.id;
        const timer = setTimeout(() => {
            const cur = store.getState().notifications;
            // Only clear if the toast we set is still the current one
            // (a newer toast might have arrived and we don't want to
            // wipe it).
            if (cur?.toast?.id === currentId) {
                store.setState({
                    notifications: {
                        levelUpAcknowledged: cur.levelUpAcknowledged,
                        questAcknowledged: cur.questAcknowledged,
                        toast: { text: null, id: cur.toast.id },
                    },
                });
            }
            lastClearedIdRef.current = currentId;
        }, TOAST_TTL_MS);
        return () => clearTimeout(timer);
    }, [toast.id, toast.text, store]);

    if (toast.text === null) return null;

    return (
        <View 
            pointerEvents="none" 
            style={styles.host} 
            accessibilityLiveRegion="polite"
            accessibilityLabel="Game notification"
            accessibilityRole="alert"
        >
            <View style={styles.toast}>
                <Text 
                    style={styles.text}
                    accessibilityRole="text"
                    accessibilityLabel={`Notification: ${toast.text}`}
                >
                    {toast.text}
                </Text>
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    host: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 80,
        alignItems: 'center',
        /* The host is mounted in `app/_layout.tsx` as a sibling declared BEFORE
           <Stack>, and React Native paints siblings in declaration order. Every
           screen's <ScreenBg> is flex:1 with an opaque background, so without an
           explicit stacking order the navigator paints straight over the strip
           and EVERY toast in the app is silent — the region crossing, the
           relic-slots-full refusal, the flee cost. `elevation` is the same
           statement for Android, which orders by elevation before zIndex. */
        zIndex: 100,
        elevation: 100,
    },
    toast: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: AXM.bg,
        borderWidth: 1,
        borderColor: AXM.ash,
    },
    text: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: 1.5,
        color: AXM.parchment,
    },
}));
