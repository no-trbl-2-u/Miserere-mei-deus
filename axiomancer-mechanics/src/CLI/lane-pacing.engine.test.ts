/**
 * The lane pacing CLI builds each foe the way live play does.
 *
 * The contract this file pins: for every Act 1 foe at every player level the
 * CLI measures, `foeFor` returns the same level and VITAE that
 * `resolveEncounter` produces for an authored encounter at that foe's map
 * pin, so the pacing table describes the fight the app actually serves.
 */

import { describe, it, expect } from 'vitest';

import { foeFor } from './lane-pacing.cli';
import { FloatEye, BrineHag, DeathBeholder, type EnemySlug } from '../Enemy/enemy.library';
import { createNewGameState } from '../Game/game.reducer';
import { resolveEncounter } from '../World/MapEvents/handlers';

const SLUG: Record<string, EnemySlug> = {
    [FloatEye.id]: 'float-eye',
    [BrineHag.id]: 'brine-hag',
    [DeathBeholder.id]: 'death-beholder',
};

describe('lane-pacing foes match live encounters', () => {
    for (const base of [FloatEye, BrineHag, DeathBeholder]) {
        for (const level of [1, 3, 5]) {
            it(`${base.name} at player level ${level}`, () => {
                const foe = foeFor(base, level);
                const result = resolveEncounter(createNewGameState(), {
                    kind: 'encounter', enemySlug: SLUG[base.id], level: foe.level,
                    isBoss: base.id === DeathBeholder.id,
                });
                const live = result.event.kind === 'encounter' ? result.event.encounter.enemies[0] : undefined;
                expect(live).toBeDefined();
                expect([foe.level, foe.maxHealth]).toEqual([live!.level, live!.maxHealth]);
            });
        }
    }
});
