/**
 * The no-card-id guard (phase SM1f, A11): a run policy reads lanes,
 * keywords, verbs and intents from the data, never a card id, so a card added
 * to a lane is picked up with no edit. A card id in a policy file is a defect.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { cardLibrary } from '../../Cards/cards.library';
import { ENEMY_CURSE_CARDS } from '../../Cards/library/enemy-curses.cards';

const HERE = __dirname;

/** The policy source files: every non-test file of the run sim. */
const POLICY_FILES = readdirSync(HERE).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

describe('the run policies name no card', () => {
    it('finds the policy files', () => {
        expect(POLICY_FILES).toEqual(expect.arrayContaining([
            'run-policy.archetypes.ts', 'run-policy.fight.ts', 'run-policy.lanes.ts', 'run-policy.wanderer.ts',
        ]));
    });

    it.each(POLICY_FILES)('%s holds no card id', (file) => {
        const source = readFileSync(path.join(HERE, file), 'utf8');
        const ids = [...cardLibrary, ...ENEMY_CURSE_CARDS].map(c => c.id);
        const named = ids.filter(id => new RegExp(`['"\`]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\+*['"\`]`).test(source));
        expect(named).toEqual([]);
    });
});
