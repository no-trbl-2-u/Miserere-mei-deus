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
        if (hasBlacksmith) router.push('/blacksmith' as never);
    }, [hasBlacksmith, router]);

    return null;
}
