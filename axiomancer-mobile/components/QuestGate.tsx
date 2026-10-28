import { useEffect } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveQuest } from '@/state/presenters/quest.engine';

/**
 * Pushes the user into the full-screen `/quest` route whenever a quest node
 * is opened (a `quest` map event resolved) or a quest's card pick is waiting.
 * Mirrors `<RestGate>` - a side-effect-only component mounted once in the
 * root layout.
 */
export function QuestGate() {
    const hasQuest = useGameState(selectHasActiveQuest);
    const router = useRouter();

    useEffect(() => {
        if (hasQuest) router.push('/quest' as never);
    }, [hasQuest, router]);

    return null;
}
