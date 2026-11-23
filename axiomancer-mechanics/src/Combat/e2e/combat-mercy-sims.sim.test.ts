/**
 * The sims and the mercy check: with the check forced on every lethal blow on
 * a normal or elite foe, each sim fight still completes and every check that
 * opens is answered, as the policy answers it.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mercy = vi.hoisted(() => ({ opened: 0, answers: [] as string[] }));

vi.mock('../combat.mercy-check', async (importOriginal) => {
    const real = await importOriginal<typeof import('../combat.mercy-check')>();
    return {
        ...real,
        offerMercyAtBlow: (...args: Parameters<typeof real.offerMercyAtBlow>) => {
            const asked = real.offerMercyAtBlow({ ...args[0], mercyCheckChance: 1 }, args[1]);
            if (asked) mercy.opened++;
            return asked;
        },
        chooseMercyCheck: (...args: Parameters<typeof real.chooseMercyCheck>) => {
            if (real.mercyCheckOpen(args[0])) mercy.answers.push(args[1]);
            return real.chooseMercyCheck(...args);
        },
    };
});

import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { STARTING_CARD_IDS } from '../combat.rewards';
import { runPacingEncounter } from '../combat.pacing.sim';
import { runOneEncounter } from '../combat.encounter.sim';
import { simulateUpgradeableEconomy } from '../combat.upgradeable-economy.sim';

const deck = [...STARTING_CARD_IDS];

function normalFoe() {
    const foe = deepClone(FloatEye);
    foe.difficulty = 'normal';
    return foe;
}

beforeEach(() => {
    mercy.opened = 0;
    mercy.answers = [];
});

describe('the sims answer a paused mercy check', () => {
    it.each(['witness', 'human-like'] as const)('the pacing sim (%s) wins the fight and answers every check', (policy) => {
        const run = runPacingEncounter(deepClone(Player), normalFoe(), deck, 11, policy);
        expect(run.outcome).not.toBe('defeat');
        expect(mercy.opened).toBeGreaterThan(0);
        expect(mercy.answers).toHaveLength(mercy.opened);
        expect(mercy.answers.every(a => a === 'finish')).toBe(true);
    });

    it.each(['greedy', 'mercy-seeker'] as const)('the encounter sim (%s) ends the fight and answers every check', (policy) => {
        const player = deepClone(Player);
        player.knownCards = deck.slice();
        const foe = normalFoe();
        foe.health = 4; foe.maxHealth = 4;
        const run = runOneEncounter(player, foe, 7, policy, { deck });
        expect(run.outcome).toBe('victory');
        expect(mercy.opened).toBeGreaterThan(0);
        expect(mercy.answers).toHaveLength(mercy.opened);
    });

    it('the economy sim finishes its fights with the check forced', () => {
        const result = simulateUpgradeableEconomy({ stages: ['early'], seeds: [1, 2] });
        expect(result.pooled.encounters).toBe(2);
        expect(mercy.opened).toBeGreaterThan(0);
        expect(mercy.answers).toHaveLength(mercy.opened);
    });
});
