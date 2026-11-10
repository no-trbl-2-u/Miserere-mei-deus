/**
 * Dev-only CARD & COMBAT LOGGING switch (phase BE2b, acceptance A4): one
 * checkbox that reads and flips `playLogging` in the dev settings
 * (`state/dev/dev-settings.ts`). The value persists under its own key and
 * survives a restart. On by default only while T is the only player.
 *
 * The sub line says whether anything would actually be sent: the switch is
 * one of two gates (`lib/playLog.ts`: the API URL and token baked in, and this
 * switch where dev tools are on), and a build without the API URL and token
 * sends nothing whatever the switch says. Renders null outside dev builds,
 * where there is no switch and a build with the URL and token posts.
 */

import React from 'react';

import { DevCheck, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { puzzleApiConfig } from '@/lib/puzzleAttempts';
import { devSettingsStore, useDevSetting, type DevSettingsStore } from '@/state/dev/dev-settings';

export function DebugPlayLogSwitch({ store = devSettingsStore }: { store?: DevSettingsStore }) {
    const on = useDevSetting('playLogging', store);

    if (!isDevToolsEnabled()) return null;
    const hasApi = puzzleApiConfig() !== null;

    const sub = !hasApi
        ? 'no API in this build · nothing is sent'
        : on
            ? 'on · each fight and deck change posts'
            : 'off · nothing is sent';

    return (
        <DevRow label="DEBUG · PLAY LOG" sub={sub} testID="debug-play-log">
            <DevChips>
                <DevCheck
                    label="Card & combat logging"
                    checked={on}
                    onToggle={() => store.set({ playLogging: !on })}
                    testID="debug-play-log-toggle"
                />
            </DevChips>
        </DevRow>
    );
}
