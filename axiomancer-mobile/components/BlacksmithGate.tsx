import { useEffect } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveBlacksmith } from '@/state/presenters/blacksmith.engine';

/**
 * Pushes the user into the full-screen `/blacksmith` route whenever an
 * anvil session starts (blacksmith map event resolved, or the dev entry
 * fired). Mirrors `<CacheGate>` — a side-effect-only component mounted
 * once in the root layout.
 */
export function BlacksmithGate() {
    const hasBlacksmith = useGameState(selectHasActiveBlacksmith);
    const router = useRouter();

    useEffect(() => {
        if (!hasBlacksmith) return;
        // Deferred like <HazardGate>, so a scene screen backing out cannot pop it.
        const timeoutId = setTimeout(() => router.push('/blacksmith' as never), 0);
        return () => clearTimeout(timeoutId);
    }, [hasBlacksmith, router]);

    return null;
}
