/**
 * Village encounter presenter — composes the dedicated settlement
 * screen's VM from the pending `village` event. Pure: no
 * store writes. Wares resolve against the engine item libraries; the
 * BUY action lives in the action layer (`buyVillageWare`).
 *
 * The SELL side: `sellables` mirrors the player's
 * inventory (quest items excluded — they are never sellable, same
 * guard as `dropItem`) with a price derived by engine
 * `defaultSellPrice` when the item matches a ware this village's shop
 * lists, else the CLI's fallback of `1`
 * (`src/CLI/game.cli.ts` `shopLoop`) — this presenter is the second
 * consumer of that policy, so mobile and the CLI price sells alike.
 */

import {
    ANVIL_VERB_PRICING,
    consumableLibrary,
    defaultSellPrice,
    getRelicById,
    getSignatureSkill,
    isConsumable,
    isEquipment,
    type BlacksmithVariantOffer,
    type Item,
    type ShopWare,
} from '@mechanics';
import type { AppStoreState } from '@/state/store';

export interface VillageMerchantVM {
    name: string;
    /** First dialogue line, used as the merchant's stall-call. */
    line: string;
    /** Merchant has a walkable dialogue tree. */
    hasDialogue: boolean;
}

export interface VillageWareVM {
    itemId: string;
    name: string;
    description: string;
    /**
     * What buying this ware BUYS, in one terse mechanical
     * line (`restores 20 VITAE`). Empty for an item with no payload this
     * presenter can state; the row then prints its flavour line alone.
     */
    effect: string;
    /** The ware's price — the amount charged. */
    price: number;
    affordable: boolean;
}

export interface VillageSellableVM {
    /** Index into `player.inventory` — the identity `sellVillageItem` acts on. */
    index: number;
    itemId: string;
    name: string;
    description: string;
    sellPrice: number;
}

export interface VillageVM {
    active: boolean;
    villageName: string;
    body: string;
    merchants: readonly VillageMerchantVM[];
    /** A shop object is present on the event — gates the BUY/SELL tabs. */
    hasShop: boolean;
    wares: readonly VillageWareVM[];
    sellables: readonly VillageSellableVM[];
    currency: number;
    /** The Anvil counter, when this village has a smith; null otherwise. */
    anvil: VillageAnvilVM | null;
}

/** The village's Anvil counter: what the button names and what opening it seeds. */
export interface VillageAnvilVM {
    /** Variant gear on offer at the anvil (swap targets), handed to the session. */
    variants: readonly BlacksmithVariantOffer[];
    /** The smith's cheapest work in shillings (`ANVIL_VERB_PRICING.hone`). */
    cheapestWork: number;
}

const EMPTY_VM: VillageVM = Object.freeze({
    active: false,
    villageName: '',
    body: '',
    merchants: Object.freeze([]),
    hasShop: false,
    wares: Object.freeze([]),
    sellables: Object.freeze([]),
    currency: 0,
    anvil: null,
});

/**
 * Resolves a shop ware's `itemId` against the engine item libraries.
 * Unknown ids return null and the ware is hidden (defensive — content
 * authoring owns id correctness).
 */
export function resolveWareItem(ware: ShopWare): Item | null {
    const consumable = consumableLibrary.find(c => c.id === ware.itemId);
    if (consumable) return consumable;
    // A shop selling equipment sells a signet relic by fixed id (no rarity
    // roll). Unknown ids resolve to null and drop from the stall.
    const relic = getRelicById(ware.itemId);
    if (relic) return { ...relic };
    return null;
}

// ---------------------------------------------------------------------------
// Ware effect lines
// ---------------------------------------------------------------------------

/**
 * Render a number with an explicit sign.
 *
 * @param n - a modifier value.
 * @returns `+3` / `-3`. An unsigned stat line reads as a total, not a change.
 */
function signed(n: number): string {
    return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Engine stat key -> the words a player reads.
 *
 * @param stat - a `lowerCamel` engine stat key (`physicalAttack`, `maxHp`).
 * @returns the key split into spaced lower-case words (`physical attack`).
 *   `maxHp` resolves to `max VITAE`: VITAE is the canon word for the health
 *   pool, and a stall may not print `HP` at it.
 */
function statWords(stat: string): string {
    if (stat === 'maxHp') return 'max VITAE';
    return stat.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

/**
 * One relic stat modifier as a phrase.
 *
 * @param mod - a flat stat modifier off a relic (only `maxHp`; effects carry
 *   no stat lines).
 * @returns `+5 max VITAE`.
 */
function modWords(mod: { stat: string; value: number }): string {
    return `${signed(mod.value)} ${statWords(mod.stat)}`;
}

/**
 * What a ware DOES, in one line.
 *
 * Everything here is read off the same libraries the engine applies on use;
 * no rule, number or threshold is invented.
 *
 * @param item - the library item a ware resolves to (`resolveWareItem`).
 * @returns a terse mechanical read — `restores 20 VITAE`,
 *   `+5 defense, 3 rounds`, `+2 body - grants The Open Hand` — or `''` for an
 *   item with no statable payload (a material, or a consumable whose payload
 *   shape this presenter does not read).
 */
export function wareEffectLine(item: Item): string {
    if (isConsumable(item)) {
        const parts: string[] = [];
        const heal = item.healAmount ?? 0;
        if (heal > 0) {
            // The shop line states both heal bands: the flat number and the
            // larger amount when the buyer is below half VITAE.
            const desperate = item.healAmountBelowHalf ?? 0;
            parts.push(
                desperate > 0
                    ? `restores ${heal} VITAE, ${desperate} below half`
                    : `restores ${heal} VITAE`,
            );
        }
        return parts.join(' · ');
    }
    if (isEquipment(item)) {
        const parts: string[] = (item.statModifiers ?? []).map(modWords);
        const signature = item.grantsSignature
            ? getSignatureSkill(item.grantsSignature)?.name
            : undefined;
        if (signature) parts.push(`grants ${signature}`);
        return parts.join(' · ');
    }
    return '';
}

/**
 * Compose the settlement screen's view-model from the pending event.
 *
 * @param state - the event slice (for the pending `village` payload), the
 *   player (purse + inventory).
 * @returns the render-ready `VillageVM`, or the inactive `EMPTY_VM` when no
 *   village event is pending. Each ware now carries an `effect` line beside
 *   its price; every other field is unchanged.
 */
export function selectVillageVM(
    state: Pick<AppStoreState, 'event' | 'player'>,
): VillageVM {
    const pending = state.event?.pending;
    if (!pending || pending.event.kind !== 'village') return EMPTY_VM;
    const event = pending.event;
    const currency = state.player?.currency ?? 0;

    const merchants: VillageMerchantVM[] = event.merchants.map(npc => {
        const tree = npc.dialogueTree;
        const rootText = tree ? tree.nodes[tree.rootId]?.text ?? '' : '';
        return {
            name: npc.name,
            line: rootText,
            hasDialogue: tree !== undefined && rootText.length > 0,
        };
    });

    const shopWares = event.shop?.wares ?? [];

    const wares: VillageWareVM[] = shopWares
        .map(ware => {
            const item = resolveWareItem(ware);
            if (!item) return null;
            return {
                itemId: ware.itemId,
                name: item.name,
                description: item.description ?? '',
                effect: wareEffectLine(item),
                price: ware.price,
                affordable: currency >= ware.price,
            };
        })
        .filter((w): w is VillageWareVM => w !== null);

    const inventory = state.player?.inventory ?? [];
    const sellables: VillageSellableVM[] = inventory
        .map((item, index) => {
            if (item.category === 'quest-item') return null;
            const matching = shopWares.find(w => w.itemId === item.id);
            const sellPrice = matching ? defaultSellPrice(matching) : 1;
            return {
                index,
                itemId: item.id,
                name: item.name,
                description: item.description ?? '',
                sellPrice,
            };
        })
        .filter((s): s is VillageSellableVM => s !== null);

    return {
        active: true,
        villageName: event.villageName,
        body: event.description && event.description.length > 0
            ? event.description
            : 'Roofs and smoke and the particular noise of people who all know ' +
              'each other. Shillings are welcome. Strangers are tolerated, provided ' +
              'they become customers promptly.',
        merchants,
        hasShop: event.shop !== undefined,
        wares,
        sellables,
        currency,
        anvil: event.anvil
            ? { variants: event.anvil.variants ?? [], cheapestWork: ANVIL_VERB_PRICING.hone }
            : null,
    };
}
