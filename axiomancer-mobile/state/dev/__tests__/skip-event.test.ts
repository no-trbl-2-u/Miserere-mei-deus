/**
 * Hermetic tests — dev SKIP EVENT (`state/dev/skip-event.ts`).
 *
 * Pins:
 *   - gate: dev tools off → the store is untouched, result says why.
 *   - combat prelude → victory through the engine `endCombat` (XP paid,
 *     encounter cleared, slice cleared), never fatal.
 *   - live fight (already engaged) → same settlement.
 *   - hazard → median `complete` crossing claimed, session cleared.
 *   - rest → the free REST offer claimed (heal applied), session cleared.
 *   - loot-cache → the ITEM offer claimed, session cleared.
 *   - blacksmith → left unchanged, session cleared, wallet untouched.
 *   - cutscene / village (paced) → dismissed, slice cleared.
 *   - quest screen open → dismissed as LEAVE does.
 *   - nothing active, nothing owed → `nothing-to-skip`, no seq bump.
 *   - owed arrival (fixture with a rest node) → fired then resolved.
 *   - every skip writes an `action/dev-skip-event` log line.
 *   - `installDevSkipHook` installs / removes `__AXM_SKIP_EVENT__`.
 */

import { HAZARD_CRACK_CARD, configureLogging, getLogger, resetLoggingForTests, type GameState } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { clearDeathReturn, isDeathReturnArmed } from '@/state/death-return';
import { stageEncounter, listEnemies } from '@/state/dev/enemy-picker';
import { installDevSkipHook, SKIP_EVENT_LOG_KIND, skipCurrentEvent } from '@/state/dev/skip-event';
import { createAppStore, EMPTY_EVENT_SLICE } from '@/state/store';
import { createFixtureStore } from '@/test-utils/fixtureStore';

const DEV = { devToolsEnabled: true, seed: 7 } as const;

function freshHandle() {
    const store = createAppStore();
    const actions = createAppActions(store);
    return { store, actions };
}

function gentlestFoe() {
    return listEnemies('breakwater').find((c) => !c.isBoss)!.enemy;
}

function player(store: ReturnType<typeof createAppStore>) {
    return (store.getState() as unknown as GameState).player;
}

beforeEach(() => {
    configureLogging({ enabled: true });
    getLogger().clear();
});

afterEach(() => {
    resetLoggingForTests();
    delete (globalThis as { __AXM_SKIP_EVENT__?: unknown }).__AXM_SKIP_EVENT__;
});

describe('skipCurrentEvent — gate', () => {
    it('is a no-op when dev tools are disabled', () => {
        const { store, actions } = freshHandle();
        stageEncounter(store, gentlestFoe());
        const before = store.getState();
        const result = skipCurrentEvent(store, actions, { devToolsEnabled: false });
        expect(result).toEqual({ kind: 'none', nodeId: before.world.currentMap.currentNode, outcome: 'ignored:dev-tools-disabled' });
        expect(store.getState().event.pending).toBe(before.event.pending);
        expect(store.getState().player).toBe(before.player);
        expect(store.getState()._devSkipSeq).toBeUndefined();
    });
});

describe('skipCurrentEvent — combat', () => {
    it('settles a pending prelude as a victory through the engine endCombat', () => {
        const { store, actions } = freshHandle();
        const foe = gentlestFoe();
        stageEncounter(store, foe);
        const xpBefore = player(store).experience;
        const levelBefore = player(store).level;

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('encounter');
        expect(result.outcome).toBe('victory');
        const xpReward = foe.xpReward ?? 0;
        expect(result.detail).toMatchObject({ entered: 'prelude', enemyId: foe.id, xpGained: xpReward });
        expect(store.getState().currentEncounter ?? null).toBeNull();
        expect(store.getState().event).toEqual(EMPTY_EVENT_SLICE);
        // XP is either banked or spent on a cascaded level-up.
        expect(player(store).level).toBeGreaterThanOrEqual(levelBefore);
        if (player(store).level === levelBefore) expect(player(store).experience).toBe(xpBefore + xpReward);
        expect(player(store).health).toBeGreaterThanOrEqual(1);
        expect(store.getState()._devSkipSeq).toBe(1);
    });

    it('settles a fight already engaged (currentEncounter staged)', () => {
        const { store, actions } = freshHandle();
        stageEncounter(store, gentlestFoe());
        const enemy = actions.beginHazardEncounter();
        expect(enemy).not.toBeNull();
        expect(store.getState().currentEncounter).toBeTruthy();

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('encounter');
        expect(result.outcome).toBe('victory');
        expect(result.detail).toMatchObject({ entered: 'live' });
        expect(store.getState().currentEncounter ?? null).toBeNull();
        expect(player(store).health).toBeGreaterThanOrEqual(1);
    });
});

describe('skipCurrentEvent — minigames', () => {
    it('hazard: claims a median complete crossing and clears the session', () => {
        const { store, actions } = freshHandle();
        expect(actions.beginHazard({ seed: 887, hazardId: 'cracked-cliff' })).toBe(true);
        const hazardId = store.getState().hazard.session!.hazardId;

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('hazard');
        expect(result.outcome).toMatch(/^(complete|perfect):\d+\/\d+$/);
        expect(result.detail).toMatchObject({ hazardId, died: false });
        expect(store.getState().hazard.session).toBeNull();
    });

    it('hazard: a lethal skipped crossing revives, arms the return moment and reports the outcome', () => {
        const { store, actions } = freshHandle();
        actions.moveTo('bw-2');
        store.setState({ player: { ...player(store), health: 15, maxHealth: 15 } } as never);
        clearDeathReturn();
        // A lost cracked-cliff crossing (-20 VITAE), left on its rewards ledger.
        actions.beginHazard({ seed: 9, hazardId: 'cracked-cliff' });
        actions.selectHazardRoute('risk');
        actions.finishHazardRolling();
        for (let r = 0; r < 3; r++) {
            const sess = store.getState().hazard.session!;
            const hand = [{ uid: `t${sess.round}-0`, cardId: HAZARD_CRACK_CARD.id, dieId: null }];
            store.setState({ hazard: { session: { ...sess, hand, play: [] } } });
            actions.stageHazardCard(`t${sess.round}-0`);
            actions.resolveHazardRound();
            actions.continueHazardAfterResolve();
        }
        actions.acknowledgeHazardOutcome();

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.detail).toMatchObject({ died: true, deathOutcome: 'revived' });
        expect(isDeathReturnArmed()).toBe(true);
        expect((store.getState() as unknown as GameState).dying).toBe(true);
        expect(store.getState().world.currentMap.currentNode).toBe('bw-1');
        clearDeathReturn();
    });

    it('rest: takes the free REST offer and heals', () => {
        const { store, actions } = freshHandle();
        const p = player(store);
        store.setState({ player: { ...p, health: Math.max(1, Math.floor(p.maxHealth / 4)) } } as never);
        const hurt = player(store).health;
        expect(actions.beginRest({ shelter: 'camp' })).toBe(true);

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('rest');
        expect(result.outcome).toMatch(/^rest:healed=\d+$/);
        expect(store.getState().rest.session).toBeNull();
        expect(player(store).health).toBeGreaterThan(hurt);
    });

    it('loot-cache: takes the ITEM offer and clears the session', () => {
        const { store, actions } = freshHandle();
        const coinBefore = player(store).currency;
        const itemsBefore = player(store).inventory.length;
        expect(actions.beginLootCacheChoice({ tier: 'modest', currency: 25 })).toBe(true);

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('loot-cache');
        expect(result.outcome).toMatch(/^item:items=\d+,coin=25$/);
        expect(store.getState().cache.session).toBeNull();
        expect(player(store).currency).toBe(coinBefore + 25);
        expect(player(store).inventory.length).toBeGreaterThanOrEqual(itemsBefore);
    });

    it('blacksmith: leaves the anvil unchanged and clears the session', () => {
        const { store, actions } = freshHandle();
        const coinBefore = player(store).currency;
        expect(actions.beginBlacksmith()).toBe(true);
        // The claim writes the session rail back (the live screen does the
        // same); untouched, it is exactly the rail the visit was seeded with.
        const railSeeded = store.getState().blacksmith.session!.rail;

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('blacksmith');
        expect(result.outcome).toBe('left:spent=0');
        expect(result.detail).toMatchObject({ honed: 0, tempered: 0, swapped: 0 });
        expect(store.getState().blacksmith.session).toBeNull();
        expect(player(store).currency).toBe(coinBefore);
        expect(player(store).dieGear).toEqual(railSeeded);
    });
});

describe('skipCurrentEvent — paced events and idle', () => {
    it('dismisses a pending cutscene', () => {
        const { store, actions } = freshHandle();
        store.setState({
            event: {
                ...EMPTY_EVENT_SLICE,
                pending: { state: store.getState(), event: { kind: 'cutscene', lines: ['a', 'b'] } } as never,
                sourceNodeType: 'quest',
            },
        });

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('cutscene');
        expect(result.outcome).toBe('dismissed');
        expect(result.detail).toMatchObject({ lines: 2 });
        expect(store.getState().event).toEqual(EMPTY_EVENT_SLICE);
    });

    it('dismisses a pending village', () => {
        const { store, actions } = freshHandle();
        store.setState({
            event: {
                ...EMPTY_EVENT_SLICE,
                pending: { state: store.getState(), event: { kind: 'village', villageName: 'Saltmarsh Wend', merchants: [] } } as never,
                sourceNodeType: 'quest',
            },
        });
        const result = skipCurrentEvent(store, actions, DEV);
        expect(result).toMatchObject({ kind: 'village', outcome: 'dismissed', detail: { villageName: 'Saltmarsh Wend' } });
        expect(store.getState().event.pending).toBeNull();
    });

    it('dismisses an open quest screen as LEAVE does: nothing accepted, the node unspent', () => {
        const { store, actions } = freshHandle();
        const before = (store.getState() as unknown as GameState).quests;
        store.setState({
            quest: { open: { questline: 'fixture-line', node: 1 }, paid: null, cardOffers: [] },
        });

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result).toMatchObject({ kind: 'quest', outcome: 'dismissed', detail: { questline: 'fixture-line', node: 1 } });
        expect(store.getState().quest.open).toBeNull();
        expect((store.getState() as unknown as GameState).quests).toBe(before);
    });

    it('reports nothing-to-skip when idle with no arrival owed, without bumping the seq', () => {
        const { store, actions } = freshHandle();
        // A fresh store stands on the start node, which owes its arrival;
        // switch the owed-arrival path off to pin the idle branch.
        const result = skipCurrentEvent(store, actions, { ...DEV, resolveOwedArrival: false });
        expect(result.kind).toBe('none');
        expect(result.outcome).toBe('nothing-to-skip');
        expect(store.getState()._devSkipSeq).toBeUndefined();
    });

    it('fires an owed arrival on a fixture rest node, then resolves it', () => {
        // `apprentice-bw-rest` places a hurt Apprentice on bw-9 (rest) with
        // `arrive: true`, which the app fires from <FixtureBoot>; here nothing
        // has fired it yet, so the node under the player is the start-style
        // owed arrival only if the map records one — pin via pendingArrival.
        const handle = createFixtureStore('apprentice-bw-rest');
        const { store, actions } = handle;
        const map = store.getState().world.currentMap;
        store.setState({ world: { ...store.getState().world, currentMap: { ...map, pendingArrival: map.currentNode } } } as never);
        const hurt = player(store).health;

        const result = skipCurrentEvent(store, actions, DEV);

        expect(result.kind).toBe('rest');
        expect(result.detail).toMatchObject({ firedArrival: true });
        expect(store.getState().rest.session).toBeNull();
        expect(player(store).health).toBeGreaterThan(hurt);
        expect(store.getState().world.currentMap.consumedNodes).toContain(map.currentNode);
    });
});

describe('skipCurrentEvent — log + global hook', () => {
    it('writes an action/dev-skip-event line for every call', () => {
        const { store, actions } = freshHandle();
        stageEncounter(store, gentlestFoe());
        skipCurrentEvent(store, actions, DEV);
        const lines = getLogger().entries({ domains: ['action'], kind: SKIP_EVENT_LOG_KIND });
        expect(lines).toHaveLength(1);
        expect(lines[0].data).toMatchObject({ kind: 'encounter', outcome: 'victory' });
        skipCurrentEvent(store, actions, { ...DEV, resolveOwedArrival: false });
        expect(getLogger().entries({ domains: ['action'], kind: SKIP_EVENT_LOG_KIND })).toHaveLength(2);
    });

    it('installDevSkipHook installs and removes globalThis.__AXM_SKIP_EVENT__', () => {
        const { store, actions } = freshHandle();
        const g = globalThis as { __AXM_SKIP_EVENT__?: () => unknown; __AXM_FORCE_DEV_TOOLS__?: boolean };
        g.__AXM_FORCE_DEV_TOOLS__ = true;
        try {
            const uninstall = installDevSkipHook(store, actions);
            expect(typeof g.__AXM_SKIP_EVENT__).toBe('function');
            stageEncounter(store, gentlestFoe());
            expect(g.__AXM_SKIP_EVENT__!()).toMatchObject({ kind: 'encounter', outcome: 'victory' });
            uninstall();
            expect(g.__AXM_SKIP_EVENT__).toBeUndefined();
        } finally {
            delete g.__AXM_FORCE_DEV_TOOLS__;
        }
    });
});
