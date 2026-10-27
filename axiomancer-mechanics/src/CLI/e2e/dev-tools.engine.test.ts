import { afterEach, describe, it, expect, vi } from 'vitest';
import { mockAlternatingRng } from '../../test-utils/rng';
import { createCharacter } from '../../Character';
import { createGameStore } from '../../Game/store';
import { createEventEmitter } from '../../Game/events';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { cardLibrary } from '../../Cards/cards.library';
import { consumableLibrary } from '../../Items/consumable.library';
import { getSignaturesForLoadout, relicLibrary } from '../../Items/relic.library';
import { equipItem } from '../../Character/equipment.reducer';
import { FIXTURE_TRINKETS } from '../../Game/fixtures';
import {
    devSetLevel, devSetStats, devLearnCards,
    devGrantAllEquipment, devGrantAllConsumables, devGrantCurrency,
    devSpawnEnemy, devMaxOut,
} from '../dev-tools';

afterEach(() => { vi.restoreAllMocks(); });

function freshStore() {
    mockAlternatingRng();
    const player = createCharacter({
        name: 'Test', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
    });
    return createGameStore(nullAdapter, { player }, createEventEmitter());
}

describe('devSetLevel', () => {
    it('sets level up from 1 to 10', () => {
        const store = freshStore();
        const r = devSetLevel(store, 10);
        expect(r.ok).toBe(true);
        expect(store.getState().player.level).toBe(10);
    });

    it('sets level down from 10 to 3', () => {
        const store = freshStore();
        devSetLevel(store, 10);
        devSetLevel(store, 3);
        expect(store.getState().player.level).toBe(3);
    });

    it('clamps to minimum 1', () => {
        const store = freshStore();
        devSetLevel(store, -5);
        expect(store.getState().player.level).toBe(1);
    });
});

describe('devSetStats', () => {
    it('sets individual stats', () => {
        const store = freshStore();
        devSetStats(store, { heart: 20 });
        expect(store.getState().player.baseStats.heart).toBe(20);
        expect(store.getState().player.baseStats.body).toBe(5);
    });

    it('sets all stats at once', () => {
        const store = freshStore();
        devSetStats(store, { heart: 15, body: 12, mind: 18 });
        const { baseStats } = store.getState().player;
        expect(baseStats).toEqual({ heart: 15, body: 12, mind: 18 });
    });
});

describe('devLearnCards', () => {
    it('learns all cards', () => {
        const store = freshStore();
        const r = devLearnCards(store, 'all');
        expect(r.ok).toBe(true);
        const known = store.getState().player.knownCards;
        for (const card of cardLibrary) {
            expect(known).toContain(card.id);
        }
    });

    it('learns specific cards', () => {
        const store = freshStore();
        devLearnCards(store, ['mob-appeal', 'sorites-cascade']);
        const known = store.getState().player.knownCards;
        expect(known).toContain('mob-appeal');
        expect(known).toContain('sorites-cascade');
    });

    it('does not duplicate already-known cards', () => {
        const store = freshStore();
        devLearnCards(store, ['mob-appeal']);
        devLearnCards(store, ['mob-appeal']);
        const count = store.getState().player.knownCards.filter(id => id === 'mob-appeal').length;
        expect(count).toBe(1);
    });
});

describe('devGrantAllConsumables', () => {
    it('grants every consumable type', () => {
        const store = freshStore();
        const r = devGrantAllConsumables(store, 3);
        expect(r.ok).toBe(true);
        const inv = store.getState().player.inventory;
        for (const c of consumableLibrary) {
            expect(inv.some(i => i.id === c.id)).toBe(true);
        }
    });
});

describe('devGrantAllEquipment', () => {
    it('grants equipment at player level', () => {
        const store = freshStore();
        devSetLevel(store, 10);
        const r = devGrantAllEquipment(store);
        expect(r.ok).toBe(true);
        expect(store.getState().player.inventory.length).toBeGreaterThan(0);
    });

    it('wears each relic while a position is free (the fourth is carried), so its signature reaches the fight', () => {
        const store = freshStore();
        devGrantAllEquipment(store);
        const { player } = store.getState();
        expect(player.equipment.relics.map(a => a.id))
            .toEqual(['relic-disarming-plea', 'relic-crimson-circlet', 'relic-ruby-signet']);
        expect(getSignaturesForLoadout(player.equipment))
            .toEqual(['sig-disarming-plea', 'sig-crimson-circlet', 'sig-ruby-signet']);
    });

    it('carries a relic when the row is full, and moves nothing worn', () => {
        const store = freshStore();
        const full = FIXTURE_TRINKETS.reduce((c, t) => equipItem(c, t), store.getState().player);
        store.setState({ player: full });
        devGrantAllEquipment(store);
        const { player } = store.getState();
        expect(player.equipment.relics.map(a => a.id)).toEqual(FIXTURE_TRINKETS.map(t => t.id));
        expect(player.inventory.map(i => i.id)).toEqual(relicLibrary.map(r => r.id));
    });
});

describe('devGrantCurrency', () => {
    it('adds currency', () => {
        const store = freshStore();
        devGrantCurrency(store, 500);
        expect(store.getState().player.currency).toBe(500);
    });

    it('stacks with existing currency', () => {
        const store = freshStore();
        devGrantCurrency(store, 100);
        devGrantCurrency(store, 200);
        expect(store.getState().player.currency).toBe(300);
    });
});

describe('devSpawnEnemy', () => {
    it('spawns an enemy into combat', () => {
        const store = freshStore();
        const r = devSpawnEnemy(store, 'green-jelly');
        expect(r.ok).toBe(true);
        expect(store.getState().currentEncounter).toBeDefined();
    });
});

describe('devMaxOut', () => {
    it('maxes level, stats, cards, items, and currency', () => {
        const store = freshStore();
        const r = devMaxOut(store);
        expect(r.ok).toBe(true);
        const { player, } = store.getState();
        expect(player.level).toBe(20);
        expect(player.baseStats.heart).toBe(20);
        expect(player.knownCards.length).toBe(cardLibrary.length);
        expect(player.inventory.length).toBeGreaterThan(0);
        expect(player.currency).toBeGreaterThanOrEqual(999);
    });
});
