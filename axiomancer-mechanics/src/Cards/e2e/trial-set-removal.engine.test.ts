/**
 * Hermetic E2E — a trial set comes out cleanly (plan/revamp/cards.md →
 * "The trial set").
 *
 * The Blood Price set's module is replaced by an empty set, which is what
 * every consumer sees once its file and its `TRIAL_SETS` line are deleted.
 * The game must still run: the library is the grey office, the lane
 * registry and the reward pool still fill, a fight runs to an outcome, and a
 * save naming a removed card drops it on load.
 *
 * The second half pins the other removal rule: no code outside the set's
 * own file and its own test names a trial card id.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('../library/blood-price.cards', () => ({
    BLOOD_PRICE_SET: { id: 'blood-price', cards: [], lanes: [] },
}));

import { cardLibrary, getCardById } from '../cards.library';
import { CARD_LANES } from '../card.lanes';
import { COMBAT_REWARD_POOL, STARTING_CARD_IDS, rollCombatCardRewards } from '../../Combat/combat.rewards';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import { Player } from '../../Character/characters.mock';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';

describe('the game without the trial set', () => {
    it('the library is the grey office, and the lanes are the grey lane', () => {
        expect(cardLibrary.map(c => c.id)).toEqual(['grey-strike', 'grey-ward', 'grey-word']);
        expect(CARD_LANES.map(l => l.id)).toEqual(['grey']);
    });

    it('the reward pool still fills', () => {
        expect([...COMBAT_REWARD_POOL].sort()).toEqual(['grey-strike', 'grey-ward', 'grey-word']);
        const offers = rollCombatCardRewards(deepClone(Player), () => 0.3, 3);
        expect(offers).toHaveLength(3);
        for (const id of offers) expect(getCardById(id)).toBeDefined();
    });

    it('a fresh-run fight runs to an outcome with no program ledger', () => {
        const player = { ...deepClone(Player), knownCards: [...STARTING_CARD_IDS] };
        expect(initializeCombatEncounter(player, deepClone(FloatEye), [...STARTING_CARD_IDS], 3).program).toBeUndefined();
        const run = runOneEncounter(player, deepClone(FloatEye), 3);
        expect(['victory', 'mercy', 'defeat']).toContain(run.outcome);
        expect(run.plays).toBeGreaterThan(0);
    });

    it('a save that names a removed trial card drops it on load', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: [...STARTING_CARD_IDS, 'removed-trial-card'], combatRewardCards: ['removed-trial-card', 'grey-ward'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual([...STARTING_CARD_IDS]);
        expect(out.player.combatRewardCards).toEqual(['grey-ward']);
    });
});

/** Files allowed to name a trial card id: the set itself, its own test, and
 *  the mobile art registry (Metro needs a literal id per painting; removing a
 *  set deletes its rows and paintings there, and an unmapped id falls back). */
const ALLOWED = new Set([
    path.join('axiomancer-mechanics', 'src', 'Cards', 'library', 'blood-price.cards.ts'),
    path.join('axiomancer-mechanics', 'src', 'Cards', 'e2e', 'blood-price.engine.test.ts'),
    path.join('axiomancer-mobile', 'assets', 'images', 'cards', 'index.ts'),
]);
const SKIP_DIRS = new Set(['node_modules', '.expo', '.audit-dist', '.smoke-dist', 'dist', 'android', 'ios', 'screenshots']);

function codeFiles(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) codeFiles(path.join(dir, entry.name), out);
        } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

describe('no code outside the set names a trial card id', () => {
    it('only the set file and its own test carry a bp- card id', () => {
        const root = path.resolve(__dirname, '../../../..');
        const files = [
            ...codeFiles(path.join(root, 'axiomancer-mechanics', 'src')),
            ...codeFiles(path.join(root, 'axiomancer-mobile')),
        ];
        const offenders = files
            .filter(f => !ALLOWED.has(path.relative(root, f)))
            .filter(f => /['"`]bp-[a-z0-9-]+['"`]/.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(root, f));
        expect(offenders).toEqual([]);
        // The walk reads every file in two packages; a loaded full verify pushed it past the 5s default.
    }, 30_000);
});
