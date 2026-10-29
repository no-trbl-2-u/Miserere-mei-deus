/**
 * Mobile-local slug -> illustration mapping for the event modal.
 *
 * Mobile owns the slug-to-asset map. The engine
 * returns a `ResolvedEvent` with a discriminant (10 kinds + 'none');
 * the screen renders an SVG illustration component keyed on a stable
 * slug. If the engine later adds an `art: string` field on
 * `ResolvedEvent`, this mapper is the single switch-point to swap
 * from discriminant-derived to engine-supplied slugs.
 *
 * Default body text falls back here when a `ResolvedEvent` payload's
 * `description` is absent (each `MapEventPayload` in the engine
 * carries an optional `description: string`).
 */

import type { ResolvedEvent } from '@mechanics';

// Only the kinds the modal renders with their own art keep a slug. Rest,
// loot-cache and hazard never reach the event modal (their interceptors
// start minigame sessions); `'interaction-generic'` is the fallback figure.
// A new `EventArtSlug` member needs an entry in the
// exhaustive `Record` in `components/event/PlaceholderIllustration.tsx`, its
// test, and a drawing.
export const EVENT_ART_SLUGS = [
    'encounter',
    'boss',
    'interaction-generic',
    'village',
    'cutscene',
] as const;

export type EventArtSlug = (typeof EVENT_ART_SLUGS)[number];

/**
 * Pure mapper from a `ResolvedEvent` discriminant to the mobile slug
 * the screen renders an illustration for. `'none'` should never reach
 * this mapper — callers guard via `selectHasActiveEvent`; the fallback
 * returns `'interaction-generic'`.
 */
export function selectEventArtSlug(event: ResolvedEvent): EventArtSlug {
    switch (event.kind) {
        case 'encounter':
            return event.isBoss ? 'boss' : 'encounter';
        case 'village':
            return 'village';
        case 'cutscene':
            return 'cutscene';
        // Every kind below never reaches the modal (their interceptors start
        // minigame sessions or resolve elsewhere) and keeps the generic
        // fallback defensively.
        case 'rest':
        case 'loot-cache':
        case 'hazard':
        // 'blacksmith': its interceptor starts "The Anvil" die-gear session.
        case 'blacksmith':
        // 'travel' resolves engine-side (the world has already crossed).
        case 'travel':
        // The Labyrinth door enters the Aporia straight from its interceptor.
        case 'labyrinth':
        // A quest node routes to its own screen (QL1c); no modal art yet.
        case 'quest':
        case 'none':
            return 'interaction-generic';
    }
}

/**
 * Kind-keyed default body text. Used when a `ResolvedEvent`'s payload
 * `description` is absent or empty. Kept short — the screen pairs it
 * with the kind-specific title/badge from the presenter.
 */
const DEFAULT_BODY_BY_KIND: Record<ResolvedEvent['kind'], string> = {
    encounter: 'Something stirs.',
    rest: 'A quiet place.',
    village: 'Roofs and smoke.',
    cutscene: '',
    hazard: 'The air turns.',
    'loot-cache': 'Forgotten goods.',
    // 'blacksmith' launches "The Anvil" die-gear session via its interceptor;
    // never renders in the modal, but the exhaustive record needs the entry.
    blacksmith: 'An anvil, and a waiting hammer.',
    // Travel doors resolve engine-side. Exhaustive record needs the entry.
    travel: 'The road goes on. So do you.',
    // The Labyrinth door never renders in the modal (its
    // interceptor enters the Aporia); the exhaustive record needs the entry.
    labyrinth: 'A door that was not open before.',
    // A quest node routes to its own screen (QL1c); the record needs the entry.
    quest: 'Someone is waiting on an answer.',
    none: '',
};

export function defaultBodyForEvent(event: ResolvedEvent): string {
    return DEFAULT_BODY_BY_KIND[event.kind] ?? '';
}
