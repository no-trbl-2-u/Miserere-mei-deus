/**
 * The sim's tuning flags: each one changes the run as named, and a flag left
 * off changes nothing. Nothing here asserts a game number.
 */

import {
    WANDERER_POLICY,
    CAUTIOUS_POLICY,
    DEFENDER_POLICY,
    getEquippedItems,
    getMapDefinition,
    getNodeEventPool,
    getRelicById,
    handCards,
    initializeCombatEncounter,
    relicLibrary,
    rollEncounterDice,
    type CombatCard,
    type CombatEncounterState,
    type RunPolicy,
} from '@mechanics';
import { wornStatBonus } from '@mechanics/Character/equipment.reducer';
import { Player } from '@mechanics/Character/characters.mock';
import { Sandbag_01 } from '@mechanics/Enemy/enemy.library';
import { cardVerbs } from '@mechanics/Game/run-sim/run-policy.fight';
import { getCardLane } from '@mechanics/Cards/card.lanes';
import { deepClone } from '@mechanics/Utils';

import type { AppStore } from '@/state/store';

import { playRun, type PlayRunOptions } from './run-driver';
import { checkTuning, expandPolicies, tunedPolicy, type RunTuning } from './run-options';
import { RunStuckError } from './run-stuck';
import { wrapRelicLibrary } from './run-wraps';

// The same wrap the `sim:run` entry loads (sim-run.setup.ts).
jest.mock('@mechanics/Items/relic.library', () => {
    const wraps = jest.requireActual('./run-wraps') as typeof import('./run-wraps');
    return wraps.wrapRelicLibrary(jest.requireActual('@mechanics/Items/relic.library'));
});

const BROOCH = 'relic-elementalist-brooch';

/** Run the driver for `steps` steps and stop (a stuck end is expected), returning what `probe` read. */
function peek<T>(tuning: RunTuning | undefined, probe: (store: AppStore, n: number) => T, steps = 2, policy: RunPolicy = WANDERER_POLICY): T[] {
    const seen: T[] = [];
    const options: PlayRunOptions = {
        policy,
        seed: 3,
        maxSteps: steps,
        tuning,
        onStep: (store, n) => { seen.push(probe(store, n)); },
    };
    expect(() => playRun(options)).toThrow(RunStuckError);
    return seen;
}

const wornRelicIds = (store: AppStore): string[] =>
    getEquippedItems(store.getState().player.equipment).filter((p) => p.slot === 'relic').map((p) => p.id);

describe('--policy', () => {
    it('takes an id, a comma list or lanes, and refuses an unknown or empty entry', () => {
        expect(expandPolicies('defender').map((p) => p.id)).toEqual(['defender']);
        expect(expandPolicies('defender, merciful,defender').map((p) => p.id)).toEqual(['defender', 'merciful']);
        expect(expandPolicies('lanes').map((p) => p.id)).toEqual(['wanderer', 'blood-price', 'defender', 'merciful', 'elementalist']);
        expect(() => expandPolicies('defender,nope')).toThrow(/unknown policy 'nope'/);
        expect(() => expandPolicies('defender,')).toThrow(/empty entry/);
    });
});

describe('checkTuning', () => {
    it('refuses an unknown relic or fight policy, a bad number and a stat flag with no relic', () => {
        expect(() => checkTuning({ startRelics: ['relic-nope'] })).toThrow(/not a relic/);
        expect(() => checkTuning({ startRelics: [BROOCH, BROOCH] })).toThrow(/twice/);
        expect(() => checkTuning({ fight: 'nope' })).toThrow(/unknown policy/);
        expect(() => checkTuning({ shillings: 0 })).toThrow(/positive number/);
        expect(() => checkTuning({ bossLevel: 2.5 })).toThrow(/positive integer/);
        expect(() => checkTuning({ noRelicStats: true })).toThrow(/needs a --start-relic/);
        expect(() => checkTuning({ startRelics: [BROOCH], noRelicStats: true, fight: 'defender', shillings: 2, bossLevel: 9 })).not.toThrow();
    });
});

describe('--fight, --no-anvil and --no-guard', () => {
    it('--fight plays the other policy\'s fights and names the pair', () => {
        const tuned = tunedPolicy(CAUTIOUS_POLICY, { fight: 'defender' });
        expect(tuned.id).toBe('cautious+defender');
        expect(tuned.chooseRoad).toBe(CAUTIOUS_POLICY.chooseRoad);
        expect(tuned.fightPolicy({} as never).name).toBe(DEFENDER_POLICY.fightPolicy({} as never).name);
        expect(tuned.fightPolicy({} as never).name).not.toBe(CAUTIOUS_POLICY.fightPolicy({} as never).name);
        expect(tunedPolicy(CAUTIOUS_POLICY, undefined)).toBe(CAUTIOUS_POLICY);
        expect(tunedPolicy(CAUTIOUS_POLICY, {})).toBe(CAUTIOUS_POLICY);
    });

    it('--no-anvil answers every anvil visit with a zero budget, and a run without it spends', () => {
        const ctx = {
            health: 10, maxHealth: 10, currency: 100, bedPrice: 5, upgradableCardIds: [], deck: [],
            prices: { hone: 5, temper: 5, upgrade: 5 }, baseStats: { heart: 1, body: 1, mind: 1 }, rng: () => 0.5,
        } as never;
        expect(CAUTIOUS_POLICY.visitAnvil(ctx).budget).toBeGreaterThan(0);
        const off = tunedPolicy(CAUTIOUS_POLICY, { noAnvil: true });
        expect(off.visitAnvil(ctx)).toEqual({ budget: 0, upgradeCardId: null, colors: [] });
        expect(off.id).toBe('cautious');
    });

    describe('--no-guard', () => {
        const GREY = getCardLane('grey')!.cardIds[0]!;
        const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
        const lane = getCardLane('defender')!.cardIds;

        function board(hand: string[]): CombatEncounterState {
            const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
            let s = initializeCombatEncounter(deepClone(Player), enemy, [...hand, ...Array(10).fill(GREY)], 7);
            s = rollEncounterDice(s).state;
            return { ...s, hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })), dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0, signatures: [] };
        }
        function hits(s: CombatEncounterState, yes: boolean): CombatEncounterState {
            const i = Math.min(s.currentPhaseIndex, s.threatPhases.length - 1);
            const phase = s.threatPhases[i]!;
            const next = { ...phase, intentType: yes ? 'attack' : 'buff', enemyMove: undefined, threatAction: { ...phase.threatAction, effects: yes ? [{ damage: 5 }] : [] } };
            return { ...s, threatPhases: s.threatPhases.map((p, j) => (j === i ? next : p)) } as CombatEncounterState;
        }

        it('takes the guard band back off, leaving the rest of the ranking alone', () => {
            const probe = board(lane.slice(0, 1));
            const guard = lane.find((id) => cardVerbs(probe, id).has('guard'))!;
            const s = board([guard, GREY]);
            const view = (st: CombatEncounterState, id: string): CombatCard => handCards(st).find((c) => c.card.id === id)!.card;
            const hit = hits(s, true);
            const quiet = hits(s, false);
            const guarded = DEFENDER_POLICY.fightPolicy({} as never);
            const plain = tunedPolicy(DEFENDER_POLICY, { noGuard: true }).fightPolicy({} as never);
            const rank = (p: typeof guarded, st: CombatEncounterState, id: string) => p.rankCard(st, view(st, id), () => 0);
            expect(rank(guarded, hit, guard) - rank(guarded, quiet, guard)).toBeGreaterThan(1e10);
            expect(Math.abs(rank(plain, hit, guard) - rank(plain, quiet, guard))).toBeLessThan(1);
            expect(rank(plain, quiet, guard)).toBe(rank(guarded, quiet, guard));
            expect(rank(plain, hit, GREY)).toBe(rank(guarded, hit, GREY));
        });
    });
});

describe('--shillings', () => {
    it('multiplies each rise in the purse and leaves a spend alone', () => {
        const [plain] = peek(undefined, (store) => {
            const before = store.getState().player.currency;
            store.setState({ player: { ...store.getState().player, currency: before + 10 } });
            return store.getState().player.currency - before;
        }, 1);
        const [tripled] = peek({ shillings: 3 }, (store) => {
            const before = store.getState().player.currency;
            store.setState({ player: { ...store.getState().player, currency: before + 10 } });
            const gained = store.getState().player.currency - before;
            store.setState({ player: { ...store.getState().player, currency: store.getState().player.currency - 4 } });
            return [gained, store.getState().player.currency - before - gained] as const;
        }, 1);
        expect(plain).toBe(10);
        expect(tripled).toEqual([30, -4]);
    });
});

describe('--start-relic and --no-relic-stats', () => {
    const library = JSON.stringify(relicLibrary);

    it('wears the relic with the opening relics kept on', () => {
        const [plain] = peek(undefined, wornRelicIds, 1);
        const [tuned] = peek({ startRelics: [BROOCH] }, wornRelicIds, 1);
        expect(plain).not.toContain(BROOCH);
        expect(tuned).toContain(BROOCH);
        for (const id of plain!) expect(tuned).toContain(id);
    });

    it('the relic adds its stat line, and none with --no-relic-stats; the library entry is untouched', () => {
        const bonus = (store: AppStore) => wornStatBonus(store.getState().player.equipment);
        const [plain] = peek(undefined, bonus, 1);
        const [worn] = peek({ startRelics: [BROOCH] }, bonus, 1);
        const [bare] = peek({ startRelics: [BROOCH], noRelicStats: true }, bonus, 1);
        expect(worn!.mind - plain!.mind).toBe(5);
        expect(bare).toEqual(plain);
        // Still worn, still granting its signature, and the library says what it always said.
        const [wornIds] = peek({ startRelics: [BROOCH], noRelicStats: true }, wornRelicIds, 1);
        expect(wornIds).toContain(BROOCH);
        expect(getRelicById(BROOCH)!.statModifiers).toEqual([{ stat: 'mind', value: 5 }]);
        expect(JSON.stringify(relicLibrary)).toBe(library);
        // The set is cleared when the run ends: the next plain run reads the lines again.
        const [after] = peek({ startRelics: [BROOCH] }, bonus, 1);
        expect(after).toEqual(worn);
    });

    it('wrapRelicLibrary answers what the module does while the set is empty', () => {
        const actual = { relicStatLines: (piece: { statModifiers?: readonly unknown[] }) => piece.statModifiers ?? [] };
        const wrapped = wrapRelicLibrary(actual as never) as typeof actual;
        expect(wrapped.relicStatLines({ statModifiers: [1] })).toEqual([1]);
    });
});

describe('--boss-level', () => {
    const bossLevel = (store: AppStore): number[] => {
        const map = store.getState().world.currentMap;
        const levels: number[] = [];
        for (const id of bossNodeIds(store)) {
            for (const e of getNodeEventPool(map.continent, map.name, id)!.entries) {
                if (e.payload.kind === 'encounter' && e.payload.isBoss === true) levels.push(e.payload.level ?? -1);
            }
        }
        return levels;
    };
    function bossNodeIds(store: AppStore): string[] {
        const map = store.getState().world.currentMap;
        return getMapDefinition(map.continent, map.name).nodes
            .map((n) => n.id)
            .filter((id) => getNodeEventPool(map.continent, map.name, id)?.entries.some((e) => e.payload.kind === 'encounter' && e.payload.isBoss === true));
    }

    it('plays the boss node\'s foe at that level for the run and puts the pool back after', () => {
        const [plain] = peek(undefined, bossLevel, 1);
        const [raised] = peek({ bossLevel: 14 }, bossLevel, 1);
        expect(plain!.length).toBeGreaterThan(0);
        expect(plain!.every((l) => l !== 14)).toBe(true);
        expect(raised).toEqual(plain!.map(() => 14));
        const [after] = peek(undefined, bossLevel, 1);
        expect(after).toEqual(plain);
    });
});
