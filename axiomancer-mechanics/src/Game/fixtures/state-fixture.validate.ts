/**
 * Fixture validation — turns `unknown` (a parsed JSON file, a URL payload,
 * a global set by a browser harness) into a typed `StateFixture`, or throws
 * one `StateFixtureError` listing every problem at once.
 *
 * Hand-rolled on purpose: the engine carries no runtime-schema library
 * (see `game.migrate.ts`), and the fixture surface is small enough that a
 * list of pure `check` functions reads better than a schema DSL.
 *
 * Functions (lowest → highest abstraction):
 *   isRecord(x)                   plain-object guard
 *   problemsFor(raw)              every violation as `path: message` strings
 *   validateStateFixture(raw)     the typed fixture, or throws
 */

import { getPresetById } from '../../Character/presets';
import { getMapDefinition, MapNotFoundError } from '../../World/map.registry';
import type { ContinentName, MapName } from '../../World/map.library';
import type { StateFixture } from './state-fixture.types';

/** Thrown by `validateStateFixture`; `problems` is the full list. */
export class StateFixtureError extends Error {
    constructor(public readonly problems: readonly string[]) {
        super(`Invalid state fixture:\n  - ${problems.join('\n  - ')}`);
        this.name = 'StateFixtureError';
    }
}

/** Content ids are kebab-case. */
const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

const STAT_AXES = ['heart', 'body', 'mind'] as const;

const isRecord = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null && !Array.isArray(x);

const isStringArray = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every(s => typeof s === 'string');

const isFiniteNumber = (x: unknown): x is number =>
    typeof x === 'number' && Number.isFinite(x);

/** Optional-field check: absent is fine, present must satisfy `ok`. */
const optional = (
    value: unknown,
    ok: (v: unknown) => boolean,
    path: string,
    expected: string,
): string[] => (value === undefined || ok(value) ? [] : [`${path}: expected ${expected}`]);

/** Problems in the `player` block. */
function playerProblems(player: unknown): string[] {
    if (player === undefined) return [];
    if (!isRecord(player)) return ['player: expected an object'];
    const stats = player.baseStats;
    return [
        ...optional(player.name, v => typeof v === 'string', 'player.name', 'a string'),
        ...optional(player.level, v => Number.isInteger(v) && (v as number) >= 1, 'player.level', 'an integer ≥ 1'),
        ...optional(player.health, v => isFiniteNumber(v) && v >= 1, 'player.health', 'a number ≥ 1'),
        ...optional(player.currency, v => isFiniteNumber(v) && v >= 0, 'player.currency', 'a number ≥ 0'),
        ...optional(player.knownCards, isStringArray, 'player.knownCards', 'an array of card ids'),
        ...(stats === undefined
            ? []
            : !isRecord(stats)
                ? ['player.baseStats: expected an object']
                : STAT_AXES.flatMap(axis =>
                    optional(stats[axis], v => Number.isInteger(v) && (v as number) >= 1, `player.baseStats.${axis}`, 'an integer ≥ 1'),
                )),
    ];
}

/** Problems in the `world` block, including registry existence checks. */
function worldProblems(world: unknown): string[] {
    if (world === undefined) return [];
    if (!isRecord(world)) return ['world: expected an object'];
    const { continent, map, node, completedMaps, questNodesSettled } = world;
    if (typeof continent !== 'string' || typeof map !== 'string') {
        return ['world: `continent` and `map` are required strings'];
    }
    let def;
    try {
        def = getMapDefinition(continent as ContinentName, map as MapName);
    } catch (err) {
        return err instanceof MapNotFoundError
            ? [`world: unknown map '${continent}/${map}'`]
            : [`world: ${String(err)}`];
    }
    const nodeProblems = node === undefined
        ? []
        : typeof node !== 'string'
            ? ['world.node: expected a string']
            : def.nodes.some(n => n.id === node)
                ? []
                : [`world.node: '${node}' is not on map '${map}'`];
    const completedProblems = completedMaps === undefined
        ? []
        : !isStringArray(completedMaps)
            ? ['world.completedMaps: expected an array of map names']
            : completedMaps.flatMap(m => {
                try { getMapDefinition(continent as ContinentName, m as MapName); return []; }
                catch { return [`world.completedMaps: unknown map '${continent}/${m}'`]; }
            });
    const settledProblems = questNodesSettled === undefined || typeof questNodesSettled === 'boolean'
        ? []
        : ['world.questNodesSettled: expected a boolean'];
    return [...nodeProblems, ...completedProblems, ...settledProblems];
}

/** Every violation in `raw`, as `path: message` strings. Empty = valid. */
export function problemsFor(raw: unknown): string[] {
    if (!isRecord(raw)) return ['fixture: expected an object'];
    return [
        ...(typeof raw.id === 'string' && KEBAB_CASE.test(raw.id) ? [] : ['id: required, kebab-case']),
        ...optional(raw.description, v => typeof v === 'string', 'description', 'a string'),
        ...optional(raw.seed, v => typeof v === 'string' || isFiniteNumber(v), 'seed', 'a string or number'),
        ...optional(raw.preset, v => typeof v === 'string' && getPresetById(v) !== undefined, 'preset', 'a known CharacterPreset id'),
        ...playerProblems(raw.player),
        ...worldProblems(raw.world),
        ...optional(raw.flags, isStringArray, 'flags', 'an array of strings'),
        ...optional(raw.arrive, v => typeof v === 'boolean', 'arrive', 'a boolean'),
        ...optional(raw.stagedEvent, v => isRecord(v) && typeof v.kind === 'string', 'stagedEvent', 'a map event payload'),
    ];
}

/** The typed fixture, or throws `StateFixtureError` with every problem. */
export function validateStateFixture(raw: unknown): StateFixture {
    const problems = problemsFor(raw);
    if (problems.length > 0) throw new StateFixtureError(problems);
    return raw as StateFixture;
}

/** Parse a JSON document and validate it in one step. */
export function parseStateFixture(json: string): StateFixture {
    let raw: unknown;
    try {
        raw = JSON.parse(json);
    } catch (err) {
        throw new StateFixtureError([`fixture: not valid JSON (${err instanceof Error ? err.message : String(err)})`]);
    }
    return validateStateFixture(raw);
}
