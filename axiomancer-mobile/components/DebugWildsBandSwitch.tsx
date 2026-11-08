/**
 * Dev-only WILDS BLACK BAND switch: one checkbox that
 * reads and flips `wildsBlackBand` in the dev settings
 * (`state/dev/dev-settings.ts`), so T can compare the top of the Wilds with
 * and without a solid black band behind the status card. The band is what
 * ships (T, 2026-11-06); this is how to see the Wilds without it.
 *
 * Renders null outside dev builds.
 */

import React from 'react';

import { DevCheck, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { devSettingsStore, useDevSetting, type DevSettingsStore } from '@/state/dev/dev-settings';

export function DebugWildsBandSwitch({ store = devSettingsStore }: { store?: DevSettingsStore }) {
    const on = useDevSetting('wildsBlackBand', store);

    if (!isDevToolsEnabled()) return null;

    return (
        <DevRow
            label="DEBUG · WILDS BAND"
            sub={on ? 'on · a black band behind the top half of the status card' : 'off · the map runs up under the status card'}
            testID="debug-wilds-band"
        >
            <DevChips>
                <DevCheck
                    label="Black band behind the status card's top half"
                    checked={on}
                    onToggle={() => store.set({ wildsBlackBand: !on })}
                    testID="debug-wilds-band-toggle"
                />
            </DevChips>
        </DevRow>
    );
}
