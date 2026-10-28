import { useEffect, useRef } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveQuest } from '@/state/presenters/quest.engine';

/**
 * Pushes the user into the full-screen `/quest` route whenever a quest node
 * is opened (a `quest` map event resolved) or a quest's card pick is waiting.
 * Mirrors `<RestGate>` - a side-effect-only component mounted once in the
 * root layout - with a latch: the route is pushed once per open and re-armed
 * when the slice empties, so a router object that changes identity cannot
 * stack a second copy of the screen.
 */
export function QuestGate() {
    const hasQuest = useGameState(selectHasActiveQuest);
    const router = useRouter();
    const pushed = useRef(false);

    useEffect(() => {
        if (!hasQuest) {
            pushed.current = false;
            return;
        }
        if (pushed.current) return;
        pushed.current = true;
        router.push('/quest' as never);
    }, [hasQuest, router]);

    return null;
}
