import { useEffect } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveCache } from '@/state/presenters/cache.engine';

/**
 * Pushes the user into the full-screen `/cache` route whenever a
 * Reliquary session starts (loot-cache map event resolved, or the dev
 * entry fired). Mirrors `<HazardGate>` — a side-effect-only component
 * mounted once in the root layout.
 */
export function CacheGate() {
    const hasCache = useGameState(selectHasActiveCache);
    const router = useRouter();

    useEffect(() => {
        if (hasCache) router.push('/cache' as never);
    }, [hasCache, router]);

    return null;
}
