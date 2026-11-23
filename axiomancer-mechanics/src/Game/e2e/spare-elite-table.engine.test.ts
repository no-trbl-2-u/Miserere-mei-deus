/**
 * The store hands the spared foe's difficulty to the spare roll, so a spared
 * elite rolls the elite table and a spared normal foe the normal one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as spareReward from '../../Combat/combat.spare-reward';
import { GreenJelly } from '../../Enemy/enemy.library';
import { setSeed } from '../../Utils/rng';
import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';

vi.mock('../../Combat/combat.spare-reward', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../Combat/combat.spare-reward')>();
    return { ...actual, rollSpareReward: vi.fn(actual.rollSpareReward) };
});

beforeEach(() => {
    setSeed(7);
    vi.mocked(spareReward.rollSpareReward).mockClear();
});

describe('the store rolls the spare table for the foe\'s difficulty', () => {
    it.each(['elite', 'normal'] as const)('a spared %s foe', (difficulty) => {
        const store = createGameStore(nullAdapter);
        store.getState().startCombat({ ...GreenJelly, difficulty });
        store.getState().endCombat('victory', undefined, { spared: true });
        expect(spareReward.rollSpareReward).toHaveBeenCalledTimes(1);
        expect(vi.mocked(spareReward.rollSpareReward).mock.calls[0]![3]).toBe(difficulty);
    });
});
