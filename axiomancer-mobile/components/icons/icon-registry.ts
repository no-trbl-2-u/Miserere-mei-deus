/**
 * The Miserere Mei, Deus icon canon.
 *
 * Single source of truth for the game's icon/glyph vocabulary. The
 * geometry comes from the game-icons.net library, CC BY 3.0 / CC0 per
 * artist (`LICENSE-game-icons.txt`, beside the geometry), curated
 * through `scripts/extract-game-icons.mjs` into the generated
 * `game-icon-paths.ts` — the app never reads the library at runtime.
 * Every mark renders as a monochrome silhouette in the caller's color
 * over the AXM token contract; no baked hex ever.
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
