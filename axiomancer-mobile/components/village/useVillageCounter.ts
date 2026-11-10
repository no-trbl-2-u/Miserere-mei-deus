/**
 * The village counter screens' shared wiring (spec 168): the settlement VM,
 * the way back to the hub, and the unwind when the village is gone.
 *
 * Leaving a counter returns to the hub: the hub sits below it on the stack,
 * because the village stays the pending event while a counter is open. A
 * counter opened with nothing below it (a fresh page load on web) replaces
 * itself with the hub instead. When no village is pending any more, the
 * counter steps back so the hub can unwind too.
 *
 * Inputs: none (reads the store and the router). Output: `vm` and `back`.
 */

import { useEffect, useMemo } from 'react';

import { useRouter } from '@/lib/platform/router';
import { useGameState } from '@/state/GameStoreProvider';
import { selectVillageVM, type VillageVM } from '@/state/presenters/village.engine';

/** The hub's route; every counter screen returns here. */
export const VILLAGE_HUB_ROUTE = '/village';
/** The paid rest's own screen. */
export const VILLAGE_REST_ROUTE = '/village/rest';
/** The Shop's own screen: the card shop and the weapons-and-armor counter. */
export const VILLAGE_SHOP_ROUTE = '/village/shop';

export function useVillageCounter(): { vm: VillageVM; back: () => void } {
    const event = useGameState((s) => s.event);
    const player = useGameState((s) => s.player);
    const flags = useGameState((s) => s.flags);
    const vm = useMemo(() => selectVillageVM({ event, player, flags }), [event, player, flags]);
    const router = useRouter();

    useEffect(() => {
        if (!vm.active && router.canGoBack()) router.back();
    }, [vm.active, router]);

    const back = () => {
        if (router.canGoBack()) router.back();
        else router.replace(VILLAGE_HUB_ROUTE);
    };
    return { vm, back };
}
