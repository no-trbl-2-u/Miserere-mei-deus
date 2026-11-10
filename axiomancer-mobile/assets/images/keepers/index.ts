/**
 * Village keeper portraits (stand-in art).
 *
 * One table keyed by role supplies every village keeper's portrait, so swapping
 * a keeper's image is a one-line change here (plus its file and provenance
 * entry). Each source is a transparent-ground cut-out meant to stand on a
 * screen's plate. Nothing here resolves a path into `Potential Assets/`: the
 * four images were copied out and recorded in `provenance.json`.
 */

export type KeeperRole = 'host' | 'innkeeper' | 'shopkeeper' | 'smith';

export interface KeeperPortraitEntry {
    role: KeeperRole;
    /** Image source for `<Image source={...}>` (a Metro asset id). */
    source: number;
}

export const KEEPER_ROLES: readonly KeeperRole[] = ['host', 'innkeeper', 'shopkeeper', 'smith'];

export const KEEPER_PORTRAITS: Record<KeeperRole, KeeperPortraitEntry> = {
    host: { role: 'host', source: require('./host.webp') },
    innkeeper: { role: 'innkeeper', source: require('./innkeeper.webp') },
    shopkeeper: { role: 'shopkeeper', source: require('./shopkeeper.webp') },
    smith: { role: 'smith', source: require('./smith.webp') },
};

/** The portrait source for a keeper role. */
export function keeperPortrait(role: KeeperRole): number {
    return KEEPER_PORTRAITS[role].source;
}

/**
 * The upgrade screen's figure (UP1i, spec 127 "The string of beads"): a
 * stand-in statue (TOR-0007 Ahimsa) that holds the space until T supplies the
 * art (D88). Not a village keeper, so it sits outside the role table; it lives
 * here because it is the same kind of cut-out, on a plate, with provenance.
 */
export const UPGRADE_FIGURE_STANDIN: number = require('./upgrade-figure.webp');
