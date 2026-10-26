/**
 * Dev-only REWARD TRIGGERS.
 *
 * Every reward channel the game pays through, on demand:
 *   RELIQUARY  — the loot-cache choice at either tier (`modest` / `rich`)
 *                with seed coin, through `beginLootCacheChoice` so
 *                `<CacheGate>` routes to `/cache`. MODEST keeps the
 *                historic `debug-cache-button` id.
 *   HAZARD BY ID — any authored hazard (`HAZARD_LIBRARY`) via
 *                `beginHazard({ hazardId })`; the payoff screen shows its
 *                vitae / shilling / card / scar payload.
 *   ANVIL      — the blacksmith with a fixed budget so die-gear upgrades
 *                are affordable regardless of the wallet.
 *   JOURNAL    — unlock every foe's codex entry (`unlockAllJournal`).
 *   RELIC REWARD — offer the Bleeding Signet through the item-reward
 *                screen (`offerItemRewardAction`), so `<ItemRewardGate>`
 *                routes to `/item-reward`. No run hands out a relic yet,
 *                so this is the screen's only way in until relic sources
 *                land.
 *
 * Renders null outside dev builds.
 */

import React, { useState } from 'react';
import { BLACKSMITH_WITNESS_VARIANTS, getRelicById } from '@mechanics';

import { DevButton, DevButtons, DevChip, DevChips, DevRow } from '@/components/dev/DevControls';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions, useGameStore } from '@/state/GameStoreProvider';
import { CACHE_TIERS, listHazards, listJournalEntries, unlockAllJournal } from '@/state/dev/rewards';
import { offerItemRewardAction } from '@/state/item-reward/store-actions';

const HAZARDS = listHazards();
const JOURNAL_COUNT = listJournalEntries().length;
const ANVIL_BUDGET = 500;
const CACHE_SEED_COIN = 25;
const REWARD_RELIC_ID = 'relic-bleeding-signet';

export function DebugRewardTriggers() {
    const store = useGameStore();
    const actions = useGameActions();
    const [feedback, setFeedback] = useState<string | null>(null);

    if (!isDevToolsEnabled()) return null;

    const onCache = (tier: (typeof CACHE_TIERS)[number]['tier']) => {
        const ok = actions.beginLootCacheChoice({ tier, currency: CACHE_SEED_COIN });
        setFeedback(ok ? `reliquary · ${tier}` : 'a session is already open');
    };

    const onHazard = (id: string) => {
        const ok = actions.beginHazard({ hazardId: id });
        setFeedback(ok ? `hazard · ${id}` : 'a session is already open');
    };

    const onAnvil = () => {
        const ok = actions.beginBlacksmith({ variants: BLACKSMITH_WITNESS_VARIANTS, budget: ANVIL_BUDGET });
        setFeedback(ok ? `anvil · budget ${ANVIL_BUDGET}` : 'a session is already open');
    };

    const onRelicReward = () => {
        const relic = getRelicById(REWARD_RELIC_ID);
        if (!relic) { setFeedback(`no relic ${REWARD_RELIC_ID}`); return; }
        offerItemRewardAction(store, relic, { source: 'From the dev menu' });
        setFeedback(`relic reward · ${relic.name}`);
    };

    const onJournal = () => setFeedback(`journal · ${unlockAllJournal(store)} new of ${JOURNAL_COUNT}`);

    return (
        <>
            <DevRow label="DEBUG · REWARDS" sub={feedback ?? 'reliquary tiers · anvil · journal'} testID="debug-rewards">
                <DevButtons>
                    {CACHE_TIERS.map((t) => (
                        <DevButton
                            key={t.tier}
                            label={`RELIQUARY ${t.label}`}
                            onPress={() => onCache(t.tier)}
                            a11y={`Open a ${t.tier} loot cache`}
                            testID={t.tier === 'modest' ? 'debug-cache-button' : `debug-cache-${t.tier}-button`}
                        />
                    ))}
                    <DevButton label="ANVIL ×500" onPress={onAnvil} a11y={`Open the blacksmith with a ${ANVIL_BUDGET} shilling budget`} testID="debug-anvil-budget-button" />
                    <DevButton label="UNLOCK JOURNAL" onPress={onJournal} a11y="Unlock every journal entry" testID="debug-journal-unlock-button" />
                    <DevButton label="RELIC REWARD" onPress={onRelicReward} a11y="Offer a relic on the item-reward screen" testID="debug-relic-reward-button" />
                </DevButtons>
            </DevRow>
            <DevRow label="DEBUG · HAZARD BY ID" sub="start a specific authored hazard" stacked>
                <DevChips testID="debug-hazard-ids">
                    {HAZARDS.map((h) => (
                        <DevChip key={h.id} label={h.title} onPress={() => onHazard(h.id)} a11y={`Start the ${h.title} hazard`} testID={`debug-hazard-id-${h.id}`} />
                    ))}
                </DevChips>
            </DevRow>
        </>
    );
}
