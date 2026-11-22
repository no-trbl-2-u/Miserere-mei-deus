import { useEffect, useRef } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActiveTravel } from '@/state/presenters/travel.engine';

/**
 * Pushes the user into the full-screen `/travel` route whenever a travel node
 * offers its trip (phase NK1d). Mirrors `<QuestGate>`: a side-effect-only
 * component mounted once in the root layout, with a latch so the route is
 * pushed once per offer and re-armed when the slice empties.
 */
export function TravelGate() {
    const hasTravel = useGameState(selectHasActiveTravel);
    const router = useRouter();
    const chapterComplete = useGameState((s) => s.travel?.chapterComplete === true);
    const pushed = useRef(false);
    const chapterPushed = useRef(false);

    // The crossing out of the Breakwater stands at the chapter complete screen (CE1b): it takes
    // the travel screen's place, so CONTINUE has one screen to leave.
    useEffect(() => {
        if (!chapterComplete) {
            chapterPushed.current = false;
            return;
        }
        if (chapterPushed.current) return;
        chapterPushed.current = true;
        router.replace('/chapter-complete' as never);
    }, [chapterComplete, router]);

    useEffect(() => {
        if (!hasTravel) {
            pushed.current = false;
            return;
        }
        if (pushed.current) return;
        pushed.current = true;
        router.push('/travel' as never);
    }, [hasTravel, router]);

    return null;
}
