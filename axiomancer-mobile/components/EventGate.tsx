import { useEffect, useRef } from 'react';
import { useRouter } from '@/lib/platform/router';

import { useGameState } from '@/state/GameStoreProvider';
import { selectPacedEventRoute, type PacedEventRoute } from '@/state/presenters/event.engine';

/**
 * Pushes the user into the matching full-screen route whenever the
 * engine reports an active **paced** event (narrative-choice kind):
 * `/dialogue` for a seated dialogue, `/village` for settlements,
 * `/cutscene` for omens (`selectPacedEventRoute`).
 * Combat-adjacent events (combat-prelude) belong to `<CombatGate>`,
 * which engages them onto `/combat-encounter`.
 * Rendered as a side-effect-only component so the gate runs anywhere
 * inside the navigation tree.
 *
 * The push is latched to the route it already opened.
 * `useRouter()` (lib/platform/router.ts) builds a FRESH object literal
 * on every call, so `router` changes identity on every render and the
 * `[route, router]` effect re-runs each time the root layout re-renders
 * with an event still pending. Without the latch the screen would stack
 * twice, and dismissing it once would leave the player on a second,
 * eventless copy. The latch clears when the event resolves (route back
 * to `null`), so the next event still routes.
 */
export function EventGate() {
  const route = useGameState(selectPacedEventRoute);
  const router = useRouter();
  const pushedRoute = useRef<PacedEventRoute | null>(null);

  useEffect(() => {
    if (route === null) {
      pushedRoute.current = null;
      return;
    }
    if (pushedRoute.current === route) return;
    pushedRoute.current = route;
    router.push(route as never);
  }, [route, router]);

  return null;
}
