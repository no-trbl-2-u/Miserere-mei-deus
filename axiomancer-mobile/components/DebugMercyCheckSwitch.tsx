/**
 * Dev-only MERCY CHECK switch: one checkbox that forces the check at every
 * lethal blow on a normal or elite foe, so the prompt can be seen without
 * waiting on the chance. It flips `forceMercyCheck` in the dev settings
 * (`state/dev/dev-settings.ts`), read when a fight opens. A boss still never
 * asks. Renders null outside dev builds.
 */

import React from 'react';

import { DevCheck, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { devSettingsStore, useDevSetting, type DevSettingsStore } from '@/state/dev/dev-settings';

export function DebugMercyCheckSwitch({ store = devSettingsStore }: { store?: DevSettingsStore }) {
    const on = useDevSetting('forceMercyCheck', store);

    if (!isDevToolsEnabled()) return null;

    return (
        <DevRow
            label="DEBUG · MERCY CHECK"
            sub={on ? 'on · every normal or elite foe asks spare or finish' : 'off · the normal chance'}
            testID="debug-mercy-check"
        >
            <DevChips>
                <DevCheck
                    label="Force the mercy check"
                    checked={on}
                    onToggle={() => store.set({ forceMercyCheck: !on })}
                    testID="debug-mercy-check-toggle"
                />
            </DevChips>
        </DevRow>
    );
}
