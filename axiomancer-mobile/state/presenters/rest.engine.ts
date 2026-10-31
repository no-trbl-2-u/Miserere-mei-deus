/**
 * Rest-choice presenter — maps the engine session (`axiomancer-mechanics`
 * World/RestChoice) onto a render-ready view-model. Pure: no store writes, no rolls, no rule
 * decisions.
 *
 * Owner-UI doctrine: an unaffordable OR capped offer is disabled AND names
 * its reason out loud (never a silent no-op) — `RestChoiceOffer.disabledReason`
 * IS that reason; this module only shapes it for render.
 */

import { ENEMY_REGISTRY, getCardById, previewRestChoiceHeal, settledEliteNodes } from '@mechanics';
import type {
    RestChoiceOfferId,
    RestChoiceSession,
    WorldState,
} from '@mechanics';
import type { AppStoreState } from '@/state/store';
import { getMapLayout } from '@/state/exploration-maps';
import { REST_CHOICE_OFFER_DESC, REST_CHOICE_OFFER_LABEL, restEliteReturnLine, restOfferDesc } from './rest.copy';
import { cardUpgradeRowsVM, type CardUpgradeRowVM } from './card-upgrade.engine';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface RestChoiceOfferVM {
    id: RestChoiceOfferId;
    label: string;
    desc: string;
    price: number;
    enabled: boolean;
    disabledReason: string | null;
}

export interface RestChoiceOutcomeVM {
    chosen: RestChoiceOfferId;
    label: string;
    healed: number;
    /** The upgraded card, before and after, or null when no upgrade was taken. */
    upgraded: { fromName: string; toName: string } | null;
    /**
     * One line per elite the claim will bring back (phase ER1), current
     * region first; empty when none will return. Retired elites never show.
     */
    eliteReturns: readonly string[];
}

export interface RestChoiceVM {
    active: boolean;
    phase: RestChoiceSession['phase'] | 'none';
    /** VITAE as it stands NOW: the snapshot, plus any settled heal. */
    health: number;
    maxHealth: number;
    currency: number;
    offers: readonly RestChoiceOfferVM[];
    /** The shared upgrade screen's rows, in the `upgrade-pick` phase only. */
    upgrade: readonly CardUpgradeRowVM[] | null;
    outcome: RestChoiceOutcomeVM | null;
    /** The authored MapEvent one-liner; `null` falls back to the placeholder intro. */
    description: string | null;
    /** The node's dream line, shown while the night passes (ET1c); `null` shows none. */
    dream: string | null;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const EMPTY_VM: RestChoiceVM = Object.freeze({
    active: false,
    phase: 'none',
    health: 0,
    maxHealth: 0,
    currency: 0,
    offers: Object.freeze([]),
    upgrade: null,
    outcome: null,
    description: null,
    dream: null,
});

export function selectHasActiveRest(state: Pick<AppStoreState, 'rest'>): boolean {
    return state.rest?.session != null;
}

function cardName(cardId: string): string {
    return getCardById(cardId)?.name ?? cardId;
}

/**
 * Displayed VITAE for the rest screen's purse readout.
 *
 * The engine session is a frozen snapshot: `health` keeps the value the
 * pilgrim walked in with, and the heal sits in the settled ledger until the
 * host applies it at claim time. Rendering the raw snapshot beside a
 * `+43 VITAE` outcome chip therefore showed the wounded number the choice
 * had already repaired.
 *
 * @param health - the snapshot's pre-choice VITAE.
 * @param maxHealth - the pilgrim's maximum VITAE; the ceiling on the readout.
 * @param outcome - the settled ledger, or `null` while the choice is open.
 * @returns the VITAE to render: the snapshot value while nothing is settled,
 *   otherwise the snapshot plus the ledger's own `healed`, never past max.
 *
 * Reads the engine's `healed` number — it never re-derives the heal.
 */
export function restDisplayHealth(
    health: number,
    maxHealth: number,
    outcome: RestChoiceSession['outcome'],
): number {
    if (outcome === null || outcome.healed <= 0) return health;
    return Math.min(maxHealth, health + outcome.healed);
}

/**
 * The rest screen's return lines: one per elite a claim would bring back
 * (`settledEliteNodes`, which leaves retired elites out), current region
 * first, each naming the foe and the place as the map screen names the node.
 * Derived from the world; no state of its own.
 */
export function eliteReturnLines(world: WorldState | null | undefined): string[] {
    if (!world?.currentMap) return [];
    return settledEliteNodes(world).map((elite) => {
        const foe = ENEMY_REGISTRY[elite.enemySlug]?.name ?? elite.enemySlug;
        const label = getMapLayout(elite.map)?.nodes.find((n) => n.id === elite.node)?.label;
        const place = label ? label.replace(/\s*\n\s*/g, ' ') : elite.node;
        return restEliteReturnLine(foe, place);
    });
}

export function selectRestVM(
    state: Pick<AppStoreState, 'rest'> & { world?: WorldState | null },
): RestChoiceVM {
    const s = state.rest?.session;
    if (!s) return EMPTY_VM;

    const offers: RestChoiceOfferVM[] = s.offers.map((o) => ({
        id: o.id,
        label: REST_CHOICE_OFFER_LABEL[o.id],
        // REST names the VITAE it restores, read from the engine's own
        // preview (cap included), never re-derived from the fraction.
        desc: o.id === 'rest'
            ? restOfferDesc(previewRestChoiceHeal(s), s.shelter)
            : REST_CHOICE_OFFER_DESC[o.id],
        price: o.cost,
        enabled: !o.disabledReason,
        disabledReason: o.disabledReason ?? null,
    }));

    const upgrade = s.phase !== 'upgrade-pick' ? null : cardUpgradeRowsVM(s.upgradableCardIds, s.deckCardIds);

    const outcome: RestChoiceOutcomeVM | null = s.outcome === null ? null : {
        chosen: s.outcome.chosen,
        label: REST_CHOICE_OFFER_LABEL[s.outcome.chosen],
        healed: s.outcome.healed,
        upgraded: s.outcome.upgradedCardId === null || s.outcome.upgradedToCardId === null ? null : {
            fromName: cardName(s.outcome.upgradedCardId),
            toName: cardName(s.outcome.upgradedToCardId),
        },
        eliteReturns: eliteReturnLines(state.world),
    };

    return {
        active: true,
        phase: s.phase,
        // The readout follows the settled ledger, not the
        // pre-choice snapshot.
        health: restDisplayHealth(s.health, s.maxHealth, s.outcome),
        maxHealth: s.maxHealth,
        currency: s.currency,
        offers,
        upgrade,
        outcome,
        description: s.description,
        dream: s.dream ?? null,
    };
}
