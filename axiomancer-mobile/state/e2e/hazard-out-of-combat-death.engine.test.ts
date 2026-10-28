/**
 * Hermetic E2E Tests — Hazard out-of-combat death.
 *
 * Pins the lethality contract through the store action layer:
 *  - a Hazard crossing whose net VITAE swing would drop the player to
 *    `health <= 0` (engine `isDefeated` threshold) is FATAL: it runs the
 *    death rule (`playerDied('hazard')`), stamps a durable `hazard-death:`
 *    tombstone flag, clears the session, and returns `died: true` with
 *    zeroed deltas and the rule's `outcome`;
 *  - a FIRST death revives: 1 VITAE, dying, back on the node walked from,
 *    the hazard node unspent and open to cross again (phase DY1c);
 *  - a death while dying ends the run (fresh run, full VITAE, not dying);
 *  - the killing crossing FORFEITS its spoils (no shillings banked);
 *  - the character survives (level kept);
 *  - a survivable failing crossing still floors VITAE at 1, reports
 *    `died: false`, applies its (negative) delta, and stamps NO tombstone.
 *
 * Seeded `cracked-cliff` / risk route: a clean failure nets a −20 VITAE
 * swing (minhp −8 + penaltyVitae −12), which kills at the default 15
 * VITAE and merely maims at 40. No timers, no network.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { GameState } from '@mechanics';
import { HAZARD_CRACK_CARD } from '@mechanics';
import type { HazardHandEntry, HazardSessionState } from '@mechanics';

import { createAppActions, type AppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { HAZARD_DEATH_FLAG_PREFIX, hazardDeathCount } from '@/state/hazard/store-actions';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { __AXM_HAZARD_SEED__?: number }).__AXM_HAZARD_SEED__;
    delete (globalThis as { __AXM_HAZARD_ID__?: string }).__AXM_HAZARD_ID__;
});

function makeStoreAndActions(): { store: AppStore; actions: AppActions } {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    return { store, actions: createAppActions(store) };
}

function hazardSession(store: AppStore): HazardSessionState {
    const s = store.getState().hazard.session;
    if (!s) throw new Error('expected an active hazard session');
    return s;
}

function gameState(store: AppStore): GameState {
    return store.getState() as unknown as GameState;
}

function setHealth(store: AppStore, health: number, maxHealth: number): void {
    const p = gameState(store).player;
    store.setState({ player: { ...p, health, maxHealth } } as never);
}

/** Plays one rigged losing round: stage a single CRACK, resolve, continue. */
function playLosingRound(store: AppStore, actions: AppActions): void {
    const s = hazardSession(store);
    const hand: HazardHandEntry[] = [{ uid: `t${s.round}-0`, cardId: HAZARD_CRACK_CARD.id, dieId: null }];
    store.setState({ hazard: { session: { ...s, hand, play: [] } } });
    for (const h of hazardSession(store).hand.slice()) actions.stageHazardCard(h.uid);
    actions.resolveHazardRound();
    actions.continueHazardAfterResolve();
}

/** Drives a full failing `cracked-cliff` / risk crossing up to the claim. */
function driveFailingCrossing(store: AppStore, actions: AppActions): void {
    actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
    actions.selectHazardRoute('risk');
    actions.finishHazardRolling();
    for (let r = 0; r < 3; r++) playLosingRound(store, actions);
    expect(hazardSession(store).outcome?.tier).toBe('failure');
    actions.acknowledgeHazardOutcome();
}

describe('hazard out-of-combat death', () => {
    /** Walks onto bw-2 (the crossing's node), wounds the player, plays the failing crossing. */
    function dieOnce(store: AppStore, actions: AppActions, health = 15) {
        actions.moveTo('bw-2');
        setHealth(store, health, Math.max(health, 15));
        driveFailingCrossing(store, actions);
        return actions.claimHazardRewards(null);
    }

    it('a first lethal crossing revives dying on the node walked from, node open, spoils forfeit', () => {
        const { store, actions } = makeStoreAndActions();
        const levelBefore = gameState(store).player.level;
        const shillingsBefore = gameState(store).player.currency;
        const runId = gameState(store).runId;

        const result = dieOnce(store, actions);

        expect(result.applied).toBe(true);
        expect(result.died).toBe(true);
        expect(result.outcome).toBe('revived');
        expect(result.vitaeDelta).toBe(0);
        expect(result.maxVitaeDelta).toBe(0);
        expect(result.shillings).toBe(0);
        expect(result.cardAdded).toBeNull();

        const after = gameState(store);
        expect(store.getState().hazard.session).toBeNull();
        expect(hazardDeathCount(after.flags ?? [])).toBe(1);
        expect(after.runId).toBe(runId);
        expect(after.dying).toBe(true);
        expect(after.player.health).toBe(1);
        expect(after.player.level).toBe(levelBefore);
        expect(after.player.currency).toBe(shillingsBefore);
        const map = after.world.currentMap;
        expect(map.currentNode).toBe('bw-1');
        expect(map.completedNodes).not.toContain('bw-2');
        expect(map.availableNodes).toContain('bw-2');
    });

    it('a revive is written to the slot', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        const actions = createAppActions(store);
        const before = adapter.saveCount;

        dieOnce(store, actions);

        expect(adapter.saveCount).toBeGreaterThan(before);
        expect(adapter.load()?.dying).toBe(true);
    });

    it('the hazard node can be walked into again after the revive', () => {
        const { store, actions } = makeStoreAndActions();
        dieOnce(store, actions);

        actions.moveTo('bw-2');
        expect(gameState(store).world.currentMap.currentNode).toBe('bw-2');
        expect(gameState(store).dying).toBe(true);
    });

    it('a lethal crossing while dying ends the run', () => {
        const { store, actions } = makeStoreAndActions();
        const runId = gameState(store).runId;
        dieOnce(store, actions);
        expect(gameState(store).dying).toBe(true);

        // Dying at 1 VITAE: the same failing crossing is fatal again.
        actions.moveTo('bw-2');
        driveFailingCrossing(store, actions);
        const result = actions.claimHazardRewards(null);

        expect(result.died).toBe(true);
        expect(result.outcome).toBe('run-over');
        const after = gameState(store);
        expect(after.runId).not.toBe(runId);
        expect(after.dying).toBeUndefined();
        expect(after.player.health).toBe(after.player.maxHealth);
        expect(after.world.currentMap.currentNode).toBe('bw-1');
        expect(hazardDeathCount(after.flags ?? [])).toBe(1);
        expect(store.getState().hazard.session).toBeNull();
    });

    it('a survivable crossing still floors VITAE and stamps no tombstone', () => {
        const { store, actions } = makeStoreAndActions();
        // 40 VITAE absorbs the -20 swing: maimed, not killed.
        setHealth(store, 40, 40);

        driveFailingCrossing(store, actions);
        const result = actions.claimHazardRewards(null);

        expect(result.applied).toBe(true);
        expect(result.died).toBe(false);
        expect(result.outcome).toBeNull();
        expect(result.vitaeDelta).toBeLessThan(0);

        const after = gameState(store);
        expect(after.dying).toBeUndefined();
        expect(after.player.health).toBeGreaterThan(0);
        expect(after.player.health).toBeLessThan(40);
        expect(hazardDeathCount(after.flags ?? [])).toBe(0);
        expect((after.flags ?? []).some((f) => f.startsWith(HAZARD_DEATH_FLAG_PREFIX))).toBe(false);
    });

    it('an exactly-lethal swing to zero VITAE is fatal (isDefeated boundary)', () => {
        const { store, actions } = makeStoreAndActions();
        setHealth(store, 20, 20);

        driveFailingCrossing(store, actions);
        const result = actions.claimHazardRewards(null);

        expect(result.died).toBe(true);
        expect(hazardDeathCount(gameState(store).flags ?? [])).toBe(1);
    });

    it('a crossing landing on 1 VITAE survives (maim, not death)', () => {
        const { store, actions } = makeStoreAndActions();
        setHealth(store, 21, 21);

        driveFailingCrossing(store, actions);
        const result = actions.claimHazardRewards(null);

        expect(result.died).toBe(false);
        expect(gameState(store).player.health).toBe(1);
        expect(hazardDeathCount(gameState(store).flags ?? [])).toBe(0);
    });
});
