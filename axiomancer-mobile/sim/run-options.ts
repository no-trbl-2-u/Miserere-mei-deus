/**
 * The sim's tuning flags: one batch run with a changed rule, no code edit.
 *
 * Everything here applies inside the sim only. A policy is wrapped (`--fight`,
 * `--no-anvil`, `--no-guard`), the fresh store gets a shillings multiplier and
 * start relics, the boss node's pool is re-registered at another level for the
 * run, and the relic library wrap (`run-wraps.ts`) reads a worn relic's stat
 * lines as none. Every change is undone when the run ends. With no flag set the
 * run is exactly the one a plain `sim:run` plays.
 */

import {
    RUN_POLICY_IDS,
    getEquippedItems,
    getMapDefinition,
    getNodeEventPool,
    getRelicById,
    getRunPolicy,
    grantWearingIfFree,
    type RunPolicy,
} from '@mechanics';
import { registerMapEventPool } from '@mechanics/World/MapEvents/resolve-map-event';
import type { MapEventPool } from '@mechanics/World/MapEvents/types';
import { guardWhenHit } from '@mechanics/Game/run-sim/run-policy.fight';

import type { AppStore } from '@/state/store';

import { noStatRelics, setNoStatRelics } from './run-wraps';

/** The tuning flags of one batch; every field is off when absent. */
export interface RunTuning {
    /** Multiplies the shillings a run gains. */
    readonly shillings?: number;
    /** The boss node's foe is played at this level. */
    readonly bossLevel?: number;
    /** Relic ids worn at the run's start, the opening relic kept on. */
    readonly startRelics?: readonly string[];
    /** The start relics add no stat lines. */
    readonly noRelicStats?: boolean;
    /** The policy whose fights are played (the choices stay with `--policy`). */
    readonly fight?: string;
    /** The anvil is never visited. */
    readonly noAnvil?: boolean;
    /** The guard-when-hit rule is off. */
    readonly noGuard?: boolean;
}

/** The four lane bots and the Wanderer, what `--policy lanes` plays. */
export const LANE_POLICY_IDS: readonly string[] = Object.freeze(['wanderer', 'blood-price', 'defender', 'merciful', 'elementalist']);

/** True when any flag in `tuning` is set. */
export function isTuned(tuning: RunTuning | undefined): tuning is RunTuning {
    return tuning !== undefined && (
        tuning.shillings !== undefined || tuning.bossLevel !== undefined
        || (tuning.startRelics?.length ?? 0) > 0 || tuning.noRelicStats === true
        || tuning.fight !== undefined || tuning.noAnvil === true || tuning.noGuard === true
    );
}

function need(id: string): RunPolicy {
    const policy = getRunPolicy(id);
    if (!policy) throw new Error(`unknown policy '${id}' (known: ${RUN_POLICY_IDS.join(', ')})`);
    return policy;
}

/**
 * The policies a `--policy` value names: one id, a comma list, or `lanes`.
 *
 * @throws Error for an empty entry or an unknown id.
 */
export function expandPolicies(spec: string): RunPolicy[] {
    const ids: string[] = [];
    for (const part of spec.split(',').map((p) => p.trim())) {
        if (part === '') throw new Error(`--policy '${spec}' has an empty entry`);
        for (const id of part === 'lanes' ? LANE_POLICY_IDS : [part]) if (!ids.includes(id)) ids.push(id);
    }
    return ids.map(need);
}

/**
 * Refuse a tuning no run could honour: a bad number, an unknown relic or fight
 * policy, a repeated relic, or `noRelicStats` with no relic to apply it to.
 *
 * @throws Error naming the flag.
 */
export function checkTuning(tuning: RunTuning): void {
    if (tuning.shillings !== undefined && !(Number.isFinite(tuning.shillings) && tuning.shillings > 0)) {
        throw new Error(`--shillings must be a positive number, not '${tuning.shillings}'`);
    }
    if (tuning.bossLevel !== undefined && !(Number.isInteger(tuning.bossLevel) && tuning.bossLevel >= 1)) {
        throw new Error(`--boss-level must be a positive integer, not '${tuning.bossLevel}'`);
    }
    const relics = tuning.startRelics ?? [];
    for (const id of relics) {
        if (!getRelicById(id)) throw new Error(`--start-relic '${id}' is not a relic`);
    }
    if (new Set(relics).size !== relics.length) throw new Error('--start-relic names a relic twice');
    if (tuning.noRelicStats === true && relics.length === 0) throw new Error('--no-relic-stats needs a --start-relic');
    if (tuning.fight !== undefined) need(tuning.fight);
}

/**
 * The policy a run plays under `tuning`: the fight policy swapped in
 * (`merciful+defender`), the anvil refused, the guard rule taken back out.
 */
export function tunedPolicy(policy: RunPolicy, tuning: RunTuning | undefined): RunPolicy {
    if (!isTuned(tuning)) return policy;
    let tuned: RunPolicy = policy;
    if (tuning.fight !== undefined) {
        const fighter = need(tuning.fight);
        tuned = { ...tuned, id: `${policy.id}+${fighter.id}`, fightPolicy: (ctx) => fighter.fightPolicy(ctx) };
    }
    if (tuning.noAnvil === true) {
        tuned = { ...tuned, visitAnvil: () => ({ budget: 0, upgradeCardId: null, colors: [] }) };
    }
    if (tuning.noGuard === true) {
        const fightPolicy = tuned.fightPolicy;
        tuned = {
            ...tuned,
            fightPolicy: (ctx) => {
                const inner = fightPolicy(ctx);
                // The guard rule only ever adds a band to a card's score; take it back off.
                return { ...inner, rankCard: (s, card, rng) => inner.rankCard(s, card, rng) - guardWhenHit(s, card, 0) };
            },
        };
    }
    return tuned;
}

/** Multiply every rise in the purse by `factor` (rounded), for as long as the store lives. */
function multiplyShillings(store: AppStore, factor: number): () => void {
    let applying = false;
    return store.subscribe((state, prev) => {
        if (applying) return;
        const gained = (state.player?.currency ?? 0) - (prev.player?.currency ?? 0);
        if (gained <= 0 || !state.player) return;
        const extra = Math.round(gained * factor) - gained;
        if (extra === 0) return;
        applying = true;
        try {
            store.setState({ player: { ...state.player, currency: Math.max(0, state.player.currency + extra) } });
        } finally {
            applying = false;
        }
    });
}

/** Wear each start relic where a position is free (the opening relic stays on). */
function wearRelics(store: AppStore, ids: readonly string[]): void {
    for (const id of ids) {
        const relic = getRelicById(id)!;
        const player = grantWearingIfFree(store.getState().player, { ...relic, statModifiers: (relic.statModifiers ?? []).map((m) => ({ ...m })) }).character;
        if (!getEquippedItems(player.equipment).some((piece) => piece.id === id)) {
            throw new Error(`--start-relic '${id}': no relic position is free`);
        }
        store.setState({ player });
    }
}

/** Re-register the start map's boss pool at `level`; returns the undo. */
function setBossLevel(store: AppStore, level: number): () => void {
    const map = store.getState().world.currentMap;
    const original: MapEventPool[] = [];
    for (const node of getMapDefinition(map.continent, map.name).nodes) {
        const pool = getNodeEventPool(map.continent, map.name, node.id);
        if (!pool?.entries.some((e) => e.payload.kind === 'encounter' && e.payload.isBoss === true)) continue;
        original.push(pool);
        registerMapEventPool({
            ...pool,
            entries: pool.entries.map((e) => (e.payload.kind === 'encounter' && e.payload.isBoss === true
                ? { ...e, payload: { ...e.payload, level } }
                : e)),
        });
    }
    if (original.length === 0) throw new Error(`--boss-level: ${map.name} has no boss node`);
    return () => original.forEach(registerMapEventPool);
}

/**
 * Apply the store-side flags to a fresh run's store.
 *
 * @returns The undo: call it when the run ends, thrown or not.
 */
export function startTuning(store: AppStore, tuning: RunTuning | undefined): () => void {
    if (!isTuned(tuning)) return () => undefined;
    const undo: Array<() => void> = [];
    const before = noStatRelics();
    try {
        // The stat lines are read as none before the relics go on, so no VITAE bonus is folded in.
        setNoStatRelics(tuning.noRelicStats === true ? tuning.startRelics ?? [] : []);
        undo.push(() => setNoStatRelics(before));
        if (tuning.startRelics?.length) wearRelics(store, tuning.startRelics);
        if (tuning.shillings !== undefined) undo.push(multiplyShillings(store, tuning.shillings));
        if (tuning.bossLevel !== undefined) undo.push(setBossLevel(store, tuning.bossLevel));
    } catch (error) {
        undo.reverse().forEach((fn) => fn());
        throw error;
    }
    return () => undo.reverse().forEach((fn) => fn());
}
