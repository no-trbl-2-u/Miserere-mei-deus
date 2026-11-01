/**
 * Dev-only ITEM PICKER.
 *
 * Every relic, every weapon and armor and every consumable in the engine registries is a chip,
 * so a tester never has to remember an id. A tap calls
 * `actions.addItemById` and prints the result on the sub line.
 *
 * Renders null outside dev builds.
 */

import React, { useState } from 'react';
import { consumableLibrary, equipmentLibrary, relicLibrary } from '@mechanics';

import { DevChip, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions } from '@/state/GameStoreProvider';

/** `relic-disarming-plea` → `disarming plea`; `weapon-opening-blade` → `opening blade`; `minor-healing-potion` → `minor healing potion`. */
const chipLabel = (id: string): string => id.replace(/^(relic|weapon|armor)-/, '').replace(/-/g, ' ');

const RELIC_IDS = relicLibrary.map((r) => r.id);
const GEAR_IDS = equipmentLibrary.map((p) => p.id);
const CONSUMABLE_IDS = consumableLibrary.map((c) => c.id);

export function DebugItemPicker() {
    const actions = useGameActions();
    const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

    if (!isDevToolsEnabled()) return null;

    const onPick = (id: string) => {
        const result = actions.addItemById(id);
        setFeedback(
            result.added
                ? { ok: true, text: `added · ${result.name} (${result.kind})` }
                : { ok: false, text: result.reason ?? 'add failed' },
        );
    };

    return (
        <DevRow
            label="DEBUG · ADD ITEM"
            sub={feedback?.text ?? `${RELIC_IDS.length} relics · ${GEAR_IDS.length} weapons and armor · ${CONSUMABLE_IDS.length} consumables`}
            subTone={feedback ? (feedback.ok ? 'ok' : 'err') : null}
            stacked
            testID="debug-item-picker"
        >
            <DevChips testID="debug-item-relics">
                {RELIC_IDS.map((id) => (
                    <DevChip key={id} label={chipLabel(id)} accent onPress={() => onPick(id)} a11y={`Add relic ${id} to the inventory`} testID={`debug-item-${id}`} />
                ))}
            </DevChips>
            <DevChips testID="debug-item-gear">
                {GEAR_IDS.map((id) => (
                    <DevChip key={id} label={chipLabel(id)} accent onPress={() => onPick(id)} a11y={`Add gear ${id} to the inventory`} testID={`debug-item-${id}`} />
                ))}
            </DevChips>
            <DevChips testID="debug-item-consumables">
                {CONSUMABLE_IDS.map((id) => (
                    <DevChip key={id} label={chipLabel(id)} onPress={() => onPick(id)} a11y={`Add consumable ${id} to the inventory`} testID={`debug-item-${id}`} />
                ))}
            </DevChips>
        </DevRow>
    );
}
