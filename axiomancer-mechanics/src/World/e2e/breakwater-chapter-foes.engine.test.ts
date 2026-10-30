/**
 * Chapter 1's foes at their nodes (phase EN1f, the Measure of its block in
 * the EN1 brief): each fields-and-quays fight node, answered through the map's
 * own event resolver, meets the foe and level its `BW_ENCOUNTER_FOES` row
 * names; in the fight that foe plays its opening loop, and when its VITAE
 * reaches its 30% line its DANGER fires on its next turn, and not before.
 *
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { BW_ENCOUNTER_FOES } from '../MapEvents/content';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { initializeCombatEncounter, rollEncounterDice, resolveThreatPhase } from '../../Combat/combat.engine';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

/** The node's fight, answered where the map would answer it. */
function fightAt(nodeId: string): CombatEncounterState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = {
        ...fresh,
        player: { ...fresh.player, health: 5000, maxHealth: 5000 },
        world: { ...fresh.world, currentMap: { ...fresh.world.currentMap, currentNode: nodeId } },
    };
    const { event } = resolveMapEvent(state, rng);
    expect(event.kind, nodeId).toBe('encounter');
    if (event.kind !== 'encounter') throw new Error(nodeId);
    const foe = event.encounter.enemies[0]!;
    return rollEncounterDice(initializeCombatEncounter(state.player, foe, undefined, 7), rng).state;
}

const telegraph = (s: CombatEncounterState) => s.threatPhases[s.currentPhaseIndex]!.enemyMove!;
const fired = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'threat-fired' }> => e.kind === 'threat-fired').map(e => e.description);

const NODES = ['bw-w2', 'bw-w3', 'bw-m1', 'bw-p2', 'bw-h1', 'bw-h2', 'bw-h3'] as const;

describe('the fields and the quays: each node\'s foe fires its DANGER at its 30% line', () => {
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
