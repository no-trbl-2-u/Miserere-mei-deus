import { useEffect } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasPendingItemReward } from '@/state/presenters/item-reward.engine';

/**
 * Pushes the player into the full-screen `/item-reward` route whenever an item
 * is waiting on their CONFIRM / EQUIP. Mirrors `<CacheGate>` / `<HazardGate>` —
 * a side-effect-only component mounted once in the root layout. A run starts
 * with no relic and is handed none at the first node, so the gate only routes
 * what something else queued.
 */
export function ItemRewardGate() {
    const hasPending = useGameState(selectHasPendingItemReward);
    const router = useRouter();

    useEffect(() => {
        if (!hasPending) return;
        // Deferred like <HazardGate>, so a scene screen backing out cannot pop it.
        const timeoutId = setTimeout(() => router.push('/item-reward' as never), 0);
        return () => clearTimeout(timeoutId);
    }, [hasPending, router]);

    return null;
}
