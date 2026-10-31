/**
 * The lighthouse path at its node (phase EN1k, the Measure of its block in
 * the EN1 brief): `bw-l4`, answered through the map's own event resolver,
 * draws the Lamplighter or the Wrecker at level 7 as an elite, and each
 * fights through both its DANGERs at its 60% and 30% lines.
 *
 * Fixed RNG; no disk / network / TTY.
 */

import { describe, expect, it } from 'vitest';

import { resolveMapEvent } from '../MapEvents/resolve-map-event';
import { BW_ELITE_DRAWS } from '../MapEvents/content';
import { createNewGameState } from '../../Game/game.reducer';
import type { GameState } from '../../Game/types';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import { initializeCombatEncounter, rollEncounterDice, resolveThreatPhase } from '../../Combat/combat.engine';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

/** The lighthouse path's fight, its pool drawn with `roll`. */
function fightAt(roll: number): CombatEncounterState {
    const fresh = createNewGameState({ startMap: 'breakwater' });
    const state: GameState = {
        ...fresh,
        player: { ...fresh.player, health: 5000, maxHealth: 5000 },
        world: { ...fresh.world, currentMap: { ...fresh.world.currentMap, currentNode: 'bw-l4' } },
    };
    const { event } = resolveMapEvent(state, () => roll);
    if (event.kind !== 'encounter') throw new Error(event.kind);
    return rollEncounterDice(initializeCombatEncounter(state.player, event.encounter.enemies[0]!, undefined, 7), rng).state;
}

const telegraph = (s: CombatEncounterState) => s.threatPhases[s.currentPhaseIndex]!.enemyMove!;
const fired = (events: readonly CombatEvent[]) =>
    events.filter((e): e is Extract<CombatEvent, { kind: 'threat-fired' }> => e.kind === 'threat-fired').map(e => e.description);

describe('bw-l4 draws the Lamplighter or the Wrecker (A14)', () => {
    it('names the pair at level 7', () => {
        expect(BW_ELITE_DRAWS['bw-l4']).toEqual([{ slug: 'lamplighter', level: 7 }, { slug: 'wrecker', level: 7 }]);
    });

    it('the low roll draws the Lamplighter and the high roll the Wrecker, each an elite at level 7', () => {
        const low = fightAt(0.01);
        const high = fightAt(0.99);
        expect([low.enemy.id, high.enemy.id]).toEqual([ENEMY_REGISTRY.lamplighter.id, ENEMY_REGISTRY.wrecker.id]);
        for (const s of [low, high]) {
            expect(s.enemy.difficulty).toBe('elite');
            expect(s.enemy.level).toBe(7);
        }
    });
});

describe.each([
    { roll: 0.01, slug: 'lamplighter' as const, dangers: ['Lure Light', 'The Lamp Goes Out'], last: 'Wick-Lash' },
    { roll: 0.99, slug: 'wrecker' as const, dangers: ['Onto the Rocks', 'Strip the Wreck'], last: 'Cudgel' },
])('$slug fires both its DANGERs at its lines', ({ roll, slug, dangers, last }) => {
    it('60% then 30%, each followed by its next loop', () => {
        let s = fightAt(roll);
        const source = ENEMY_REGISTRY[slug];
        expect(s.enemy.id).toBe(source.id);
        // The 30% line is crossed well below it: Lure Light MENDs as it fires.
        for (const [phase, line] of [[1, 0.6], [2, 0.2]] as const) {
            const danger = dangers[phase - 1]!;
            const crossed = resolveThreatPhase({ ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * line) } }, rng);
            expect(crossed.events).toContainEqual({ kind: 'enemy-phase-entered', enemyId: source.id, phase, danger });
            s = crossed.state;
            expect(telegraph(s)).toMatchObject({ phase, danger: true, kind: 'danger', name: danger });
            const res = resolveThreatPhase(s, rng);
            expect(fired(res.events)[0]).toMatch(new RegExp(`^${danger}: `));
            expect(telegraph(res.state)).toMatchObject({ phase, step: 0, danger: false });
            s = res.state;
        }
        expect(telegraph(s).name).toBe(last);
    });
});
