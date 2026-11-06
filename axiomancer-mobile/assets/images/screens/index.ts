/**
 * Screen backdrop plates (the Woodcut Codex).
 *
 * The key → plate resolver for `components/ScreenBg`. It lives beside the art,
 * exactly as `maps/index.ts` maps a region, so `ScreenBg` stays a layout
 * component that knows nothing about which engraving is which.
 *
 * Metro needs static `require()` literals — no dynamic paths, no computed keys.
 *
 * Every plate here is REUSED from `assets/images/maps/`. They were acquired as
 * map backdrops (public domain, licence read from the source at
 * acquisition); where one suits a screen it is reused and that directory's
 * `provenance.json` records the second consumer. Nothing is re-acquired to give
 * a screen a private copy of the same engraving.
 */

/** A screen that can carry a backdrop. Adding one means adding a plate. */
export type ScreenArtKey =
    | 'event'
    | 'labyrinth'
    | 'combat'
    | 'village'
    | 'rest'
    | 'cache'
    | 'blacksmith'
    | 'dialogue'
    | 'cutscene';

const PLATES: Record<ScreenArtKey, number> = {
    // Map events happen on the road between places: the crossing plate.
    event: require('../maps/charon-crossing.webp'),
    // The Aporia is a hole in the ground with something at the bottom of it.
    labyrinth: require('../maps/the-pit.webp'),
    // The dev-only combat sandbox route's backdrop. Deliberately the arena
    // FALLBACK plate rather than a region one: this screen has no region, so
    // it should show what an unmapped region shows — see `../combat/index.ts`.
    combat: require('../combat/arena-desolation.webp'),
    // A settlement is a street: Doré's Wentworth Street crowd.
    village: require('../maps/wentworth-street.webp'),
    // Rest happens off the road, under the trees.
    rest: require('../maps/forest-dark.webp'),
    // The cache and the Anvil stand on their map's own plate
    // (`regionPlate`, from `mapBackdropFor`); Ludgate Hill is only what they
    // show off any mapped region. Plates are reused, never re-acquired (see
    // the header note).
    cache: require('../maps/ludgate-hill.webp'),
    blacksmith: require('../maps/ludgate-hill.webp'),
    // Dialogue and cutscenes are meetings on the road, like map events.
    dialogue: require('../maps/charon-crossing.webp'),
    cutscene: require('../maps/charon-crossing.webp'),
};

/**
 * The plate for a screen key, or null.
 *
 * Null is the ordinary case, not an error: a screen with no key keeps the
 * procedural look.
 */
export function screenBackdropFor(key: ScreenArtKey | undefined | null): number | null {
    if (!key) return null;
    return PLATES[key] ?? null;
}

/** Every wired key — the drift test asserts each resolves. */
export const SCREEN_ART_KEYS = Object.keys(PLATES) as ScreenArtKey[];

export { CAMPFIRE_05_FRAME_MS, CAMPFIRE_05_FRAMES } from './animated-fixtures/campfire-05';
