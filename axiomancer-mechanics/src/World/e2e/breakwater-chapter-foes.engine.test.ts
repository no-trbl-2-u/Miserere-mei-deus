/**
 * Chapter 1's foes at their nodes (phases EN1f, EN1g and EN1h, the Measure of their
 * blocks in the EN1 brief): each fields, quays, pier and town fight node, answered through the map's
 * own event resolver, meets the foe and level its `BW_ENCOUNTER_FOES` row
 * names; in the fight that foe plays its opening loop, and when its VITAE
 * reaches its 30% line its DANGER fires on its next turn, and not before.
 *
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from '../MapEvents/content';
import { getNodeEventPool } from '../../World';
import { scaleEnemyToLevel } from '../encounter';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import {
    initializeCombatEncounter, payTheToll, rollEncounterDice, resolveThreatPhase, startTurn, TOLL_SOURCE,
} from '../../Combat/combat.engine';
import { tollOwed } from '../../Combat/combat.enemy-riders';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

/** The node's fight, answered where the map would answer it. */
function fightAt(nodeId: string, poolRng: () => number = rng): CombatEncounterState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = {
        ...fresh,
        player: { ...fresh.player, health: 5000, maxHealth: 5000 },
        world: { ...fresh.world, currentMap: { ...fresh.world.currentMap, currentNode: nodeId } },
    };
    const { event } = resolveMapEvent(state, poolRng);
    expect(event.kind, nodeId).toBe('encounter');
    if (event.kind !== 'encounter') throw new Error(nodeId);
    const foe = event.encounter.enemies[0]!;
    return rollEncounterDice(initializeCombatEncounter(state.player, foe, undefined, 7), rng).state;
}

const telegraph = (s: CombatEncounterState) => s.threatPhases[s.currentPhaseIndex]!.enemyMove!;
const fired = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'threat-fired' }> => e.kind === 'threat-fired').map(e => e.description);

const NODES = [
    'bw-w2', 'bw-w3', 'bw-m1', 'bw-p2', 'bw-h1', 'bw-h2', 'bw-h3',
    'bw-h7', 'bw-t1', 'bw-t2', 'bw-t3', 'bw-t6', 'bw-l1', 'bw-d1', 'bw-d3',
] as const;

describe('the fields, quays, pier and town: each node\'s foe fires its DANGER at its 30% line', () => {
    it.each(NODES)('%s', (nodeId) => {
        const row = BW_ENCOUNTER_FOES[nodeId]!;
        const source = ENEMY_REGISTRY[row.slug];
        const danger = source.phases![1]!.danger!;
        let s = fightAt(nodeId);
        expect(s.enemy.id).toBe(source.id);
        expect(s.enemy.level).toBe(row.level);

        // Above the line it plays its opening loop, in order.
        const opening = source.phases![0]!.moves.map(m => m.name);
        for (const name of opening) {
            expect(telegraph(s)).toMatchObject({ phase: 0, name, danger: false });
            const res = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: s.enemy.maxHealth } }, rng);
            expect(fired(res.events)[0]).toMatch(new RegExp(`^${name}: `));
            s = res.state;
        }
        expect(telegraph(s).name).toBe(opening[0]);

        // Its VITAE reaches the line: the next move is its DANGER, telegraphed as one.
        const line = Math.floor(s.enemy.maxHealth * 0.3);
        const crossed = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: line } }, rng);
        expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: source.id, phase: 1, danger: danger.name });
        s = crossed.state;
        expect(telegraph(s)).toMatchObject({ phase: 1, danger: true, kind: 'danger' });
        expect(s.threatPhases[s.currentPhaseIndex]!.intentType).toBe('danger');

        // The DANGER fires, then the second phase's loop begins.
        const res = resolveThreatPhase(s, rng);
        expect(fired(res.events)[0]).toMatch(new RegExp(`^${danger.name}: `));
        expect(telegraph(res.state)).toMatchObject({ phase: 1, step: 0, danger: false });
    });
});

/** A fight against `slug` at level 5 as an elite node stages it (the draw's other half is read from the pool). */
function fightAs(slug: 'tithe-collector'): CombatEncounterState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const player = { ...fresh.player, health: 5000, maxHealth: 5000 };
    const foe = { ...scaleEnemyToLevel(ENEMY_REGISTRY[slug], 5), effects: [] };
    return rollEncounterDice(initializeCombatEncounter(player, foe, undefined, 7), rng).state;
}

describe('the sea cave draws the Tithe-Collector, which fires Audit at 60% and Foreclose at 30% (phase EN1h)', () => {
    it('bw-c1 names it as the second of its two draws, at level 5', () => {
        const slugs = getNodeEventPool('coastal-continent', 'breakwater', 'bw-c1')!.entries.map(e => (e.payload as { enemySlug?: string }).enemySlug);
        expect(slugs).toEqual(['cave-choir', 'tithe-collector']);
        expect(BW_ELITE_DRAWS['bw-c1']![1]).toMatchObject({ slug: 'tithe-collector', level: 5 });
    });

    it('its DANGERs fire at its lines', () => {
        const source = ENEMY_REGISTRY['tithe-collector'];
        let s = fightAs('tithe-collector');
        expect(s.enemy.id).toBe(source.id);
        expect(s.enemy.difficulty).toBe('elite');
        expect(s.enemy.level).toBe(5);
        for (const [phase, pct] of [[1, 0.6], [2, 0.3]] as const) {
            const danger = source.phases![phase]!.danger!;
            const crossed = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * pct) } }, rng);
            expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: source.id, phase, danger: danger.name });
            s = crossed.state;
            expect(telegraph(s)).toMatchObject({ phase, danger: true, kind: 'danger' });
            const res = resolveThreatPhase(s, rng);
            expect(fired(res.events)[0]).toMatch(new RegExp(`^${danger.name}: `));
            s = res.state;
        }
    });
});

describe('the sea cave draws the Cave Choir, which fires both its DANGERs at its lines (phase EN1j)', () => {
    it('bw-c1', () => {
        let s = fightAt('bw-c1');
        const choir = ENEMY_REGISTRY['cave-choir'];
        expect(s.enemy.id).toBe(choir.id);
        expect(s.enemy.difficulty).toBe('elite');
        expect(s.enemy.level).toBe(5);
        for (const [phase, line, danger] of [[1, 0.6, 'Toll for the Drowned'], [2, 0.3, 'Amen']] as const) {
            const crossed = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * line) } }, rng);
            expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: choir.id, phase, danger });
            s = crossed.state;
            expect(telegraph(s)).toMatchObject({ phase, danger: true, kind: 'danger', name: danger });
            const res = resolveThreatPhase(s, rng);
            expect(fired(res.events)[0]).toMatch(new RegExp(`^${danger}: `));
            expect(telegraph(res.state)).toMatchObject({ phase, step: 0, danger: false });
            s = res.state;
        }
        expect(telegraph(s)).toMatchObject({ name: 'Antiphon', kind: 'unknown' });
    });
});

describe('the keep causeway draws the Toll-Keeper or the Tide-Gate, each firing both its DANGERs (phase EN1l)', () => {
    /** The causeway's fight with the map's pool roll drawing `slug`. */
    const drawn = (slug: 'toll-keeper' | 'tide-gate'): CombatEncounterState => {
        for (const roll of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const s = fightAt('bw-w5', () => roll);
            if (s.enemy.id === ENEMY_REGISTRY[slug].id) return s;
        }
        throw new Error(`bw-w5 never drew ${slug}`);
    };

    it.each([
        ['toll-keeper', 'Compound Interest', 'Seize the Causeway'],
        ['tide-gate', 'Spring Tide', 'The Gate Opens'],
    ] as const)('bw-w5 draws %s', (slug, sixty, thirty) => {
        let s = drawn(slug);
        const source = ENEMY_REGISTRY[slug];
        expect(s.enemy).toMatchObject({ id: source.id, difficulty: 'elite', level: 8 });
        if (slug === 'toll-keeper') {
            // A foe turn raises the TOLL to 1; the player pays it once, a SACRIFICE 1.
            s = startTurn(resolveThreatPhase(s, rng).state, rng).state;
            expect(tollOwed(s)).toBe(1);
            const paid = payTheToll(s);
            expect(paid.events).toContainEqual({ kind: 'vitae-sacrificed', cardId: TOLL_SOURCE, amount: 1, counted: 1 });
            expect(paid.state.player.health).toBe(s.player.health - 1);
            expect(tollOwed(paid.state)).toBe(0);
            s = paid.state;
        }
        for (const [phase, line, danger] of [[1, 0.6, sixty], [2, 0.3, thirty]] as const) {
            const crossed = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * line) } }, rng);
            expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: source.id, phase, danger });
            s = crossed.state;
            expect(telegraph(s)).toMatchObject({ phase, danger: true, kind: 'danger', name: danger });
            const res = resolveThreatPhase(s, rng);
            expect(fired(res.events)[0]).toMatch(new RegExp(`^${danger}: `));
            expect(telegraph(res.state)).toMatchObject({ phase, step: 0, danger: false });
            s = res.state;
        }
    });
});
