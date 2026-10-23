/**
 * Hermetic test helper — start a real fight the way the app does.
 *
 * Combat tests begin from game state, not a hand-built foe: a fixture save
 * stands on an Act 1 encounter node, the node's arrival event resolves to
 * its combat prelude, and `beginHazardEncounter` (what `<CombatGate>` calls)
 * stages the HP-scaled foe on the store. The live combat state is then
 * initialised from the store's player, flags and that foe, the same call
 * `<CombatEncounterPanel>` makes on mount.
 *
 * The default fixture is the Breakwater's bw-2 (a float-eye at the map's
 * fight level); `REAL_BOSS_FIGHT_FIXTURE` is its door boss. Pass another fixture ref to fight a different node's foe;
 * pass `deck` and `seed` where a test needs a known hand, as the panel's own
 * `deck` and `seed` props do, and `player` where it needs exact save fields
 * (a known-card set, a health pool) on the fixture's player.
 *
 * Functions:
 *   realFightFixture(player)    the default fixture with player overrides
 *   arriveAtRealFight(ref)      { store, actions, nodeEnemy, … } in the prelude
 *   startRealFight(ref, opts)   { store, actions, enemy, nodeEnemy, combat, … }
 */

import {
    initializeCombatEncounter,
    type CombatEncounterState,
    type Character,
    type Enemy,
    type StateFixture,
} from '@mechanics';

import {
    arriveFromFixture,
    createFixtureStore,
    type FixtureRef,
    type FixtureStoreHandle,
} from '@/test-utils/fixtureStore';

/** An Apprentice standing on the Breakwater's first fight (bw-2), arriving. */
export const REAL_FIGHT_FIXTURE: StateFixture = Object.freeze<StateFixture>({
    id: 'real-fight-apprentice-bw-2',
    description: 'Apprentice on the Breakwater\'s bw-2 encounter; `arrive` opens its combat prelude. Mobile combat tests.',
    seed: 'fixture-real-fight-apprentice-bw-2',
    preset: 'apprentice',
    world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-2' },
    arrive: true,
});

/** An Apprentice at the Breakwater's door fight (bw-17, the Death Beholder): a boss, no WITHDRAW. */
export const REAL_BOSS_FIGHT_FIXTURE: StateFixture = Object.freeze<StateFixture>({
    ...REAL_FIGHT_FIXTURE,
    id: 'real-fight-apprentice-bw-17',
    description: 'Apprentice on the Breakwater\'s bw-17 door fight (a boss); `arrive` opens its combat prelude. Mobile combat tests.',
    seed: 'fixture-real-fight-apprentice-bw-17',
    world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-17' },
});

/** The default fixture with `player` overrides (level, stats, known cards, …). */
export function realFightFixture(player: NonNullable<StateFixture['player']>): StateFixture {
    return { ...REAL_FIGHT_FIXTURE, player };
}

export interface RealFightOptions {
    /** The combat deck, as the panel's `deck` prop; defaults to the save's own deck. */
    readonly deck?: string[];
    /** The engine seed for the live combat state. Defaults to 7. */
    readonly seed?: number;
    /** Floating dice the save holds before the fight (not a fixture field). */
    readonly floatingDice?: Character['floatingDice'];
    /**
     * Save fields set on the player before the fight: exact known cards,
     * stats or a health pool the fixture's player overrides cannot express
     * (they add known cards, and derive max health from the level).
     */
    readonly player?: Partial<Character>;
}

export interface RealFight extends RealFightArrival {
    /** The foe the store staged (`currentEncounter`), HP-scaled for live play. */
    readonly enemy: Enemy;
    /** The live combat state, initialised as `<CombatEncounterPanel>` does. */
    readonly combat: CombatEncounterState;
}

/** A fixture store standing in the encounter's combat prelude, before the fight is entered. */
export interface RealFightArrival extends FixtureStoreHandle {
    /** The foe exactly as the encounter node's event authored it. */
    readonly nodeEnemy: Enemy;
}

/**
 * Arrive at the fixture's encounter node: its event resolves to the combat
 * prelude (`event.pending`), the state `<CombatGate>` engages from.
 */
export function arriveAtRealFight(ref: FixtureRef = REAL_FIGHT_FIXTURE, options: RealFightOptions = {}): RealFightArrival {
    const handle = createFixtureStore(ref);
    if (options.floatingDice || options.player) {
        const player = handle.store.getState().player;
        const floating = options.floatingDice ? { floatingDice: options.floatingDice } : {};
        handle.store.setState({ player: { ...player, ...options.player, ...floating } });
    }
    arriveFromFixture(handle);
    const pending = handle.store.getState().event?.pending ?? null;
    if (!pending || pending.event.kind !== 'encounter') {
        throw new Error(`startRealFight: fixture '${handle.fixture.id}' did not arrive at an encounter.`);
    }
    const nodeEnemy = pending.event.encounter.enemies[0];
    if (!nodeEnemy) throw new Error(`startRealFight: fixture '${handle.fixture.id}' staged no foe.`);
    return { ...handle, nodeEnemy };
}

/** Arrive at the fixture's encounter node and enter its fight through the store. */
export function startRealFight(ref: FixtureRef = REAL_FIGHT_FIXTURE, options: RealFightOptions = {}): RealFight {
    const arrival = arriveAtRealFight(ref, options);
    const enemy = arrival.actions.beginHazardEncounter();
    if (!enemy) throw new Error(`startRealFight: fixture '${arrival.fixture.id}' staged no foe.`);
    const state = arrival.store.getState();
    const flags = (state as unknown as { flags?: string[] }).flags;
    const combat = initializeCombatEncounter(state.player, enemy, options.deck, options.seed ?? 7, flags);
    return { ...arrival, enemy, combat };
}
