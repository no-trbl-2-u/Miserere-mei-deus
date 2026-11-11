/**
 * Hermetic E2E — the grey office (the fresh-run starter shapes).
 *
 * `grey-strike` ("Blow") and `grey-ward` ("Ward") are the
 * two colourless cards (`color: 'any'`) every brand-new run
 * seeds ten copies of (5 + 3 + 2 with Word — see `STARTING_CARD_IDS`,
 * `Combat/combat.rewards.ts`). This suite pins:
 *
 *   - both resolve with the right shape (colourless aspect, `theme: 'grey'`,
 *     Ash tier/rank, spell);
 *   - THE COLOUR LAW's exception: every die colour, plus wild, powers either
 *     card (no fizzle) — the missing half `color: 'any'` adds;
 *   - FREE/PAID ledgers read exactly 2 / 5, as printed;
 *   - a fresh `STARTING_CARD_IDS`-shaped deck deals exactly 7 grey-strike +
 *     3 grey-ward (`ensureStarterCards`'s verbatim-copy contract);
 *   - the grey office IS the reward pool.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { mockSequentialRng } from '../../test-utils/rng';
import { buildFixtureState } from '../../test-utils/card-fixture';
import { playCombatCard } from '../../Combat/combat.engine';
import { buildCombatDeck } from '../../Combat/combat.deck';
import { getCardById } from '../cards.library';
import { removeCardFromCombatDeck, MIN_COMBAT_DECK_SIZE } from '../card.removal';
import { STARTING_CARD_IDS, COMBAT_REWARD_POOL, addRewardCard } from '../../Combat/combat.rewards';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type {
    CombatEncounterState, CombatManaDie, CombatDieColor,
} from '../../Combat/combat.encounter.types';

afterEach(() => vi.restoreAllMocks());

const GREY_IDS = ['grey-strike', 'grey-ward'] as const;

describe('Phase 104 — the grey office: card shape', () => {
    it('both grey cards resolve with the colourless aspect', () => {
        for (const id of GREY_IDS) {
            const card = getCardById(id);
            expect(card, id).toBeDefined();
            expect(card!.color, id).toBe('any');
            expect(card!.tier, id).toBe(1);
            expect(card!.rank, id).toBe(1);
            expect(card!.tags, id).toContain('grey');
            expect(card!.tags, id).toContain('starter');
        }
        expect(getCardById('grey-strike')!.targetType).toBe('enemy');
        expect(getCardById('grey-ward')!.targetType).toBe('self');
    });

    it('D51 — Blow is an Attack, Ward a Skill, Word a Spell', () => {
        expect(getCardById('grey-strike')!.cardType).toBe('attack');
        expect(getCardById('grey-ward')!.cardType).toBe('skill');
        expect(getCardById('grey-word')!.cardType).toBe('spell');
    });

    it('the grey office is in the reward pool (D44)', () => {
        for (const id of ['grey-strike', 'grey-ward', 'grey-word']) expect(COMBAT_REWARD_POOL).toContain(id);
    });
});

/** The tray die every PAID play names as its powering die (no implicit default). */
const GREY_DIE = 'fx-grey-die';

/** A CLEAN fixture with `cardId` staged in hand, powered by a single die of `color`. */
function stateWithDie(cardId: string, color: CombatDieColor): CombatEncounterState {
    const s = buildFixtureState({ clean: true });
    const die: CombatManaDie = { id: GREY_DIE, color, state: 'available', temporary: false, face: 'mana' };
    return {
        ...s,
        hand: [{ uid: 'under-test', cardId }],
        dice: [die],
    };
}

describe('Phase 104 — the grey office: THE COLOUR LAW exception', () => {
    const COLORS: readonly CombatDieColor[] = ['body', 'mind', 'heart', 'wild'];

    for (const id of GREY_IDS) {
        for (const color of COLORS) {
            it(`a ${color} die powers ${id} (never a fizzle)`, () => {
                mockSequentialRng(0.5);
                const { events } = playCombatCard(stateWithDie(id, color), { uid: 'under-test' }, true, GREY_DIE);
                expect(events.some(e => e.kind === 'effect-fizzled'), JSON.stringify(events)).toBe(false);
                expect(events.some(e => e.kind === 'card-played')).toBe(true);
            });
        }
    }
});

describe('Phase 104 — the grey office: FREE/PAID ledgers read exactly as printed', () => {
    it('grey-strike: FREE deals 2, PAID deals 5', () => {
        mockSequentialRng(0.5);
        const free = playCombatCard(stateWithDie('grey-strike', 'wild'), { uid: 'under-test' }, false);
        const freeHit = free.events.find(e => e.kind === 'damage-dealt' && e.target === 'enemy');
        expect(freeHit && 'amount' in freeHit ? freeHit.amount : undefined).toBe(2);

        mockSequentialRng(0.5);
        const paid = playCombatCard(stateWithDie('grey-strike', 'wild'), { uid: 'under-test' }, true, GREY_DIE);
        const paidHit = paid.events.find(e => e.kind === 'damage-dealt' && e.target === 'enemy');
        expect(paidHit && 'amount' in paidHit ? paidHit.amount : undefined).toBe(5);
    });

    it('grey-ward: FREE guards 2, PAID guards 5', () => {
        mockSequentialRng(0.5);
        const before = stateWithDie('grey-ward', 'wild');
        const free = playCombatCard(before, { uid: 'under-test' }, false);
        expect((free.state.guard ?? 0) - (before.guard ?? 0)).toBe(2);

        mockSequentialRng(0.5);
        const paid = playCombatCard(before, { uid: 'under-test' }, true, GREY_DIE);
        expect((paid.state.guard ?? 0) - (before.guard ?? 0)).toBe(5);
    });
});

describe('Phase 104 — the grey office: the fresh-run deck', () => {
    it('a fresh STARTING_CARD_IDS-shaped player deals exactly 5 grey-strike + 3 grey-ward + 2 grey-word', () => {
        const player: Character = { ...deepClone(Player), knownCards: [...STARTING_CARD_IDS], combatRewardCards: [] };
        const deck = buildCombatDeck(player);
        expect(deck).toHaveLength(10);
        expect(deck.filter(id => id === 'grey-strike')).toHaveLength(5);
        expect(deck.filter(id => id === 'grey-ward')).toHaveLength(3);
        expect(deck.filter(id => id === 'grey-word')).toHaveLength(2);
    });

    it('the floor (10) refuses a fresh run\'s first CUT; taking one reward makes it legal', () => {
        expect(MIN_COMBAT_DECK_SIZE).toBe(10);
        const fresh: Character = { ...deepClone(Player), knownCards: [...STARTING_CARD_IDS], combatRewardCards: [] };
        expect(buildCombatDeck(fresh)).toHaveLength(MIN_COMBAT_DECK_SIZE);

        const refused = removeCardFromCombatDeck(fresh, 'grey-strike');
        expect(refused.ok).toBe(false);
        if (refused.ok) return;
        expect(refused.refusal.code).toBe('deck-at-floor');

        const withReward = addRewardCard(fresh, 'grey-strike');
        expect(buildCombatDeck(withReward)).toHaveLength(MIN_COMBAT_DECK_SIZE + 1);
        const legal = removeCardFromCombatDeck(withReward, 'grey-strike');
        expect(legal.ok).toBe(true);
    });
});
