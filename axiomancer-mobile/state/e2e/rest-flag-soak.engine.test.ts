// guard-test: no writer adds these flags any more, so the bound already holds on the base; this pins that a future rest or cache cannot start piling them up.
/**
 * Hermetic E2E soak — a long save's flags stay bounded across many nights.
 *
 * AUDIT "Unbounded keepsake/death flag growth on long saves": the record
 * flags a rest or a cache could leave behind must not pile up. The contract
 * this pins, through the store action layer:
 *  - no rest and no loot cache writes a `night-keepsake:` or
 *    `cache-keepsake:` flag (`/memoir` only reads what old saves carry);
 *  - a `hazard-scar:` flag lives only until the next rest, which clears it;
 *  - so after hundreds of scar-then-rest nights and opened caches, the
 *    record flags are no more than they were before the first night.
 * `hazard-card:` flags are not records but the hazard deck itself (one per
 * acquired card, `hazard.deck-flags.ts`): each failed cliff deals a CRACK
 * into it, so they grow with the cards the player holds and are counted,
 * not bounded, here.
 *
 * Seeded; no timers, no network.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { GameState } from '@mechanics';
import { HAZARD_CARD_FLAG_PREFIX, HAZARD_CRACK_CARD } from '@mechanics';
import type { HazardHandEntry, HazardSessionState } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { HAZARD_SCAR_FLAG_PREFIX } from '@/state/hazard/store-actions';
import { REST_KEEPSAKE_FLAG_PREFIX } from '@/state/rest/store-actions';
import { CACHE_KEEPSAKE_FLAG_PREFIX } from '@/state/cache/store-actions';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const NIGHTS = 200;
const SCARRED_EVERY = 10;

function gs(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

/** The flags that are records, not the hazard deck's cards. */
function recordFlags(store: AppStore): string[] {
    return (gs(store).flags ?? []).filter(f => !f.startsWith(HAZARD_CARD_FLAG_PREFIX));
}

function hazardSession(store: AppStore): HazardSessionState {
    const s = store.getState().hazard.session;
    if (!s) throw new Error('expected an active hazard session');
    return s;
}

/** A failing cliff that scars max-VITAE (current VITAE raised so it is not lethal). */
function scarThePlayer(store: AppStore, actions: AppActions): void {
    const p = gs(store).player;
    store.setState({ player: { ...p, health: p.maxHealth + 40 } } as never);
    actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
    actions.selectHazardRoute('risk');
    actions.finishHazardRolling();
    for (let r = 0; r < 3; r++) {
        const hand: HazardHandEntry[] = [{ uid: `t${hazardSession(store).round}-0`, cardId: HAZARD_CRACK_CARD.id, dieId: null }];
        store.setState({ hazard: { session: { ...hazardSession(store), hand, play: [] } } });
        for (const h of hazardSession(store).hand.slice()) actions.stageHazardCard(h.uid);
        actions.resolveHazardRound();
        actions.continueHazardAfterResolve();
    }
    actions.acknowledgeHazardOutcome();
    expect(actions.claimHazardRewards(null).applied).toBe(true);
}

describe('a long save soaked in rests and caches', () => {
    it(`keeps the flag list bounded over ${NIGHTS} nights`, () => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        const actions = createAppActions(store);
        const baseline = recordFlags(store).length;
        let scars = 0;
        let peak = baseline;

        for (let night = 0; night < NIGHTS; night++) {
            if (night % SCARRED_EVERY === 0) {
                scarThePlayer(store, actions);
                scars += 1;
                expect((gs(store).flags ?? []).filter(f => f.startsWith(HAZARD_SCAR_FLAG_PREFIX))).toHaveLength(1);
            }
            expect(actions.beginLootCacheChoice({ tier: 'modest', currency: 1, seed: night + 1 })).toBe(true);
            actions.chooseLootCacheChoiceOffer('item');
            expect(actions.claimLootCacheChoiceOutcome().applied).toBe(true);

            expect(actions.beginRest({ seed: night + 1, shelter: night % 2 ? 'inn' : 'camp' })).toBe(true);
            actions.chooseRestChoiceOffer('rest');
            expect(actions.claimRestOutcome().applied).toBe(true);

            const flags = recordFlags(store);
            peak = Math.max(peak, flags.length);
            expect(flags.some(f => f.startsWith(HAZARD_SCAR_FLAG_PREFIX))).toBe(false);
        }

        const flags = recordFlags(store);
        expect(flags.filter(f => f.startsWith(REST_KEEPSAKE_FLAG_PREFIX) || f.startsWith(CACHE_KEEPSAKE_FLAG_PREFIX))).toEqual([]);
        expect(flags.length).toBeLessThanOrEqual(baseline);
        // The deck holds one CRACK per failed cliff: cards, not leaked records.
        expect((gs(store).flags ?? []).filter(f => f.startsWith(HAZARD_CARD_FLAG_PREFIX))).toHaveLength(scars);
        // Between rests a night adds at most the one scar a rest then mends.
        expect(peak).toBeLessThanOrEqual(baseline + 1);
    });
});
