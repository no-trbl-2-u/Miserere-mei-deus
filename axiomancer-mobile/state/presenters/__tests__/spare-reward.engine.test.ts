/**
 * The spared end screen's lines: each table result reads as what it paid, and
 * the journal line shows only when an entry opened.
 */

import { describe, expect, it } from '@jest/globals';
import { getCard, relicLibrary, type Equipment, type SpareReward } from '@mechanics';

import { spareRewardLabel, spareJournalLabel } from '@/state/presenters/mercy-check.copy';
import { spareRewardValue, spareSummaryLines } from '@/state/presenters/spare-reward.engine';

const RELIC = relicLibrary[0] as Equipment;

describe('spareRewardValue', () => {
    it('names the shillings', () => {
        expect(spareRewardValue({ kind: 'shillings', amount: 15 })).toBe('+15 shillings');
    });

    it('names an item by its own name', () => {
        expect(spareRewardValue({ kind: 'relic', item: RELIC })).toBe(RELIC.name);
        expect(spareRewardValue({ kind: 'gear', item: RELIC })).toBe(RELIC.name);
    });

    it.each(['upgrade', 'transform'] as const)('names both cards of a %s', (kind) => {
        const reward: SpareReward = { kind, fromCardId: 'grey-strike', toCardId: 'grey-ward' };
        const value = spareRewardValue(reward);
        expect(value).toContain(getCard('grey-strike')!.name);
        expect(value).toContain(getCard('grey-ward')!.name);
    });
});

describe('spareSummaryLines', () => {
    const reward: SpareReward = { kind: 'shillings', amount: 6 };

    it('is the one roll when no entry opened', () => {
        expect(spareSummaryLines(reward)).toEqual([{ key: 'reward', label: spareRewardLabel, value: '+6 shillings' }]);
    });

    it('adds the journal line when one did', () => {
        expect(spareSummaryLines(reward, 'The Green Jelly')[1]).toEqual({
            key: 'journal', label: spareJournalLabel, value: 'The Green Jelly',
        });
    });
});
