import { createCharacter } from '../Character';
import { getEquippedItems } from '../Character/equipment.reducer';
import type { BaseStats } from '../Character/types';
import type { EquipmentSlot } from '../Items/types';
import { relicLibrary, getRelicById } from '../Items/relic.library';
import { grantWearingIfFree } from '../Items/item-grant';
import { consumableLibrary } from '../Items/consumable.library';
import { cardLibrary } from '../Cards/cards.library';
import { ENEMY_REGISTRY, EnemySlug } from '../Enemy/enemy.library';
import type { createGameStore } from '../Game/store';

type Store = ReturnType<typeof createGameStore>;

interface DevResult { ok: boolean; detail: string }

export function devSetLevel(store: Store, targetLevel: number): DevResult {
    const clamped = Math.max(1, Math.floor(targetLevel));
    const state = store.getState();
    const p = state.player;

    const rebuilt = createCharacter({
        id: p.id,
        name: p.name,
        level: clamped,
        baseStats: { ...p.baseStats },
        inventory: [...p.inventory],
        currency: p.currency,
        equipment: getEquippedItems(p.equipment),
        knownCards: [...p.knownCards],
        effects: [...p.effects],
    });

    store.setState({ player: rebuilt });
    return { ok: true, detail: `Level set to ${clamped}` };
}

export function devSetStats(store: Store, stats: Partial<BaseStats>): DevResult {
    const state = store.getState();
    const p = state.player;
    const next: BaseStats = {
        heart: stats.heart ?? p.baseStats.heart,
        body: stats.body ?? p.baseStats.body,
        mind: stats.mind ?? p.baseStats.mind,
    };

    const rebuilt = createCharacter({
        id: p.id,
        name: p.name,
        level: p.level,
        baseStats: next,
        inventory: [...p.inventory],
        currency: p.currency,
        equipment: getEquippedItems(p.equipment),
        knownCards: [...p.knownCards],
        effects: [...p.effects],
    });

    store.setState({ player: rebuilt });
    return { ok: true, detail: `Stats set to H:${next.heart} B:${next.body} M:${next.mind}` };
}

export function devLearnCards(store: Store, cardIds: string[] | 'all'): DevResult {
    const ids = cardIds === 'all'
        ? cardLibrary.map(s => s.id)
        : cardIds;

    const state = store.getState();
    const known = new Set(state.player.knownCards);
    for (const id of ids) known.add(id);

    store.setState({
        player: { ...state.player, knownCards: [...known] },
    });
    return { ok: true, detail: `${ids.length} card(s) learned (total known: ${known.size})` };
}

/**
 * Grant/unlock named cards or all cards by writing knownCards.
 * (ADR-0002 — cards are known, not equipped.)
 */
export function devUnlockCards(store: Store, cardIds: string[] | 'all'): DevResult {
    const ids = cardIds === 'all'
        ? cardLibrary.map(s => s.id)
        : cardIds;
    const state = store.getState();
    const known = new Set(state.player.knownCards);
    for (const id of ids) known.add(id);
    store.setState({
        player: { ...state.player, knownCards: [...known] },
    });
    return { ok: true, detail: `${ids.length} card(s) unlocked (total known: ${known.size})` };
}

export function devGrantAllEquipment(store: Store, _rarity: string = 'common'): DevResult {
    // The only equipment is the signet relics. Grant each, worn while a
    // position is free (`_rarity` is ignored).
    let player = store.getState().player;
    let count = 0;
    for (const relic of relicLibrary) {
        player = grantWearingIfFree(player, relic).character;
        count++;
    }
    store.setState({ player });
    return { ok: true, detail: `Granted ${count} signet relics` };
}

export function devGrantAllConsumables(store: Store, quantity = 5): DevResult {
    const state = store.getState();
    let count = 0;
    for (const c of consumableLibrary) {
        state.addItem({ ...c, quantity });
        count++;
    }
    return { ok: true, detail: `Granted ${count} consumable types (×${quantity} each)` };
}

export function devEquipItem(store: Store, templateId: string, slot: EquipmentSlot, _rarity: string = 'common'): DevResult {
    // Equipment ids resolve to signet relics (the only equipment).
    const relic = getRelicById(templateId);
    if (!relic) return { ok: false, detail: `Unknown relic id: ${templateId}` };
    store.getState().equipItem({ ...relic });
    return { ok: true, detail: `Equipped ${templateId} in ${slot}` };
}

export function devGrantCurrency(store: Store, amount: number): DevResult {
    const state = store.getState();
    store.setState({
        player: { ...state.player, currency: state.player.currency + amount },
    });
    return { ok: true, detail: `Currency: ${state.player.currency} → ${store.getState().player.currency}` };
}

export function devSpawnEnemy(store: Store, slug: EnemySlug): DevResult {
    const enemy = ENEMY_REGISTRY[slug];
    if (!enemy) return { ok: false, detail: `Unknown enemy slug: ${slug}` };
    store.getState().startCombat({ enemies: [enemy] });
    return { ok: true, detail: `Spawned ${enemy.name}` };
}

export function devMaxOut(store: Store): DevResult {
    devSetLevel(store, 20);
    devSetStats(store, { heart: 20, body: 20, mind: 20 });
    devUnlockCards(store, 'all');
    devGrantAllEquipment(store, 'rare');
    devGrantAllConsumables(store, 10);
    devGrantCurrency(store, 999);
    return { ok: true, detail: 'Maxed out: level 20, 20/20/20 stats, all cards, all items, 999 currency' };
}

export function getEnemySlugs(): EnemySlug[] {
    return Object.keys(ENEMY_REGISTRY) as EnemySlug[];
}

export function getCardIds(): string[] {
    return cardLibrary.map(s => s.id);
}

export function getEquipmentTemplateIds(): string[] {
    // The "equipment templates" are the signet relics.
    return relicLibrary.map(r => r.id);
}
