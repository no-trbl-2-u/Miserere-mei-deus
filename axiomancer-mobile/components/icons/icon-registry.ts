/**
 * The Miserere Mei, Deus icon canon.
 *
 * Single source of truth for the game's icon/glyph vocabulary. The
 * geometry comes from the game-icons.net library, CC BY 3.0 / CC0 per
 * artist (`LICENSE-game-icons.txt`, beside the geometry), curated
 * through `scripts/extract-game-icons.mjs` into the generated
 * `game-icon-paths.ts` — the app never reads the library at runtime.
 * Every mark renders as a silhouette in the caller's color over the AXM
 * token contract; no baked hex ever. A placement may add accents
 * (`IconAccent`): the same silhouette redrawn in a named hue, clipped to
 * shapes in the icon's own units, so part of the mark takes a colour
 * while the geometry stays one piece.
 *
 * Adding an icon: add a manifest row in the extraction script, run it,
 * give the mark a label here, and add a row to the `AxmIcon` test —
 * never inline a new one-off `<Svg>` icon in a component. An inventory
 * item wears a registry icon through its row in `item-glyphs.ts`. Screens that
 * need the same mark must consume the registry so the art can be
 * upgraded in one place (see `SVG_ASSET_SPEC.md`).
 */

import { GAME_ICON_PATHS, type GameIconName } from './game-icon-paths';

/** One drawable primitive of an icon, in source order. */
export interface IconPrimitive {
    readonly d: string;
    /** Fill with the icon color (optionally washed via `fillOpacity`). */
    readonly fill?: boolean;
    readonly fillOpacity?: number;
    readonly stroke?: 'color' | 'accent';
    readonly strokeWidth?: number;
    readonly strokeLinecap?: 'round';
    readonly opacity?: number;
}

/**
 * A named accent hue. `blood` follows the theme (`AXM.blood`); the others
 * are the fixed combat hues the weather already speaks in (`HUE`):
 * `storm` is STORM's gold, `ember` the amber, `frost` BLIZZARD's blue.
 */
export type AccentHue = 'blood' | 'storm' | 'ember' | 'frost';

/** A clip shape, in the icon's own viewBox units (0-512 for game-icons). */
export type AccentShape =
    | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
    | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
    | { readonly kind: 'ellipse'; readonly cx: number; readonly cy: number; readonly rx: number; readonly ry: number }
    | { readonly kind: 'polygon'; readonly points: readonly (readonly [number, number])[] };

/**
 * Enlarge an accent's part of the mark: the layer is drawn scaled by
 * `factor` about (`ax`, `ay`), its clip grows with it, and the plain
 * silhouette is hidden under the grown clip so the original part does
 * not show through.
 */
export interface AccentGrow {
    readonly factor: number;
    readonly ax: number;
    readonly ay: number;
}

/**
 * One accent layer: the icon's geometry filled with `hue`, visible only
 * inside the union of `clip`. Later layers paint over earlier ones.
 */
export interface IconAccent {
    readonly hue: AccentHue;
    readonly clip: readonly AccentShape[];
    readonly grow?: AccentGrow;
}

export interface AxmIconSpec {
    readonly viewBox: string;
    /** Accessibility label (callers may override per placement). */
    readonly label: string;
    /** Attribution: `<artist>/<icon>` on game-icons.net. */
    readonly source: string;
    readonly primitives: readonly IconPrimitive[];
}

/** Per-mark accessibility labels (the adapters' historical strings). */
const ICON_LABELS: Record<GameIconName, string> = {
    'action-sword': 'Sword attack',
    'action-shield': 'Shield defense',
    'action-arcane': 'Arcane magic',
    'action-bag': 'Bag or inventory',
    'action-flee': 'Flee from combat',
    'action-eye': 'Eye or observation',
    'action-crown': 'Crown or royal status',
    'action-boss': 'Crowned skull of a great foe',
    'action-chest': 'Chest or treasure container',
    'action-scroll': 'Scroll or document',
    'action-quill': 'Quill and chronicle',
    'effect-poison': 'Poison effect',
    'effect-bleed': 'Bleed effect',
    'effect-stun': 'Stun effect',
    'effect-regen': 'Regeneration effect',
    'effect-burn': 'Burn effect',
    'effect-buff': 'Buff effect',
    'effect-debuff': 'Debuff effect',
    'effect-shield': 'Shield effect',
    'action-rest': 'Campfire or rest',
    'action-herbs': 'Herbs or gathering',
    'action-hazard': 'Falling rocks or hazard',
    'action-anvil': 'Anvil or blacksmith',
    'action-coin': 'Coin or currency',
    'action-tombstone': 'Tombstone or remains',
    'action-village': 'Village',
    'action-elite': 'Horned helm or elite foe',
    'action-door': 'Exit door or travel',
    'action-start': 'Windmill or starting point',
    'relic-tiara': 'Jewelled tiara',
    'relic-diamond-ring': 'Ring set with a gem',
    'relic-chalice-drops': 'Chalice with falling drops',
    'relic-bolt-eye': 'Eye with a lightning bolt',
    'relic-gem-pendant': 'Gem pendant on a chain',
    'relic-frostfire': 'Fire and frost',
    'potion-heart-flask': 'Flask with a heart',
    'potion-vial': 'Slim vial',
    'potion-perfume-bottle': 'Stoppered crystal bottle',
    'relic-engagement-ring': 'Hand holding a ring',
    'relic-thorn-helix': 'Thorned vine',
    'relic-mirror-mirror': 'Framed mirror',
    'relic-turtle-shell': 'Turtle shell',
    'category-consumable': 'Bubbling flask',
    'category-relic': 'Gem on a chain',
    'category-quest': 'Key',
    'mark-unknown': 'Question mark',
    'action-settings': 'Cog or settings',
};

function buildSpecs(): Record<GameIconName, AxmIconSpec> {
    const out = {} as Record<GameIconName, AxmIconSpec>;
    for (const name of Object.keys(GAME_ICON_PATHS) as GameIconName[]) {
        const geo = GAME_ICON_PATHS[name];
        out[name] = {
            viewBox: geo.viewBox,
            label: ICON_LABELS[name],
            source: geo.source,
            primitives: geo.ds.map((d) => ({ d, fill: true })),
        };
    }
    return out;
}

export const AXM_ICON_SPECS: Record<GameIconName, AxmIconSpec> = buildSpecs();

export type AxmIconName = GameIconName;

export const AXM_ICON_NAMES = Object.keys(AXM_ICON_SPECS) as readonly AxmIconName[];

export function isAxmIconName(value: string): value is AxmIconName {
    return value in AXM_ICON_SPECS;
}
