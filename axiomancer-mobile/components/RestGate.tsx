import { useEffect } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveRest } from '@/state/presenters/rest.engine';

/**
 * Pushes the user into the full-screen `/rest` route whenever a Night
 * Watch session starts (rest map event resolved, or the dev entry
 * fired). Mirrors `<HazardGate>` — a side-effect-only component
 * mounted once in the root layout.
 */
export function RestGate() {
    const hasRest = useGameState(selectHasActiveRest);
    const router = useRouter();

    useEffect(() => {
        if (hasRest) router.push('/rest' as never);
    }, [hasRest, router]);

    return null;
}
