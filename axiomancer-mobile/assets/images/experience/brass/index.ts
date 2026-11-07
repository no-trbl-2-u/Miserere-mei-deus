/**
 * The Brass Gothic pieces of the experience kit that T's picks name, as the
 * app draws them: the delivered PNGs one level up, trimmed of their 2px
 * gutter, capped at 800px wide and converted to WebP (provenance.json beside
 * this file). `w` and `h` are the WebP's pixel size, which `KitBackdrop`
 * slices against. Only the pieces a brass place in `components/experience/looks.ts`
 * draws live here; a piece no place uses stays a PNG one level up, unbundled.
 */

export const BRASS = {
    'action-button-disabled': { source: require('./action-button-disabled.webp'), w: 367, h: 147 },
    'action-button-idle': { source: require('./action-button-idle.webp'), w: 367, h: 147 },
    'action-button-selected': { source: require('./action-button-selected.webp'), w: 366, h: 147 },
    'character-portrait-frame': { source: require('./character-portrait-frame.webp'), w: 372, h: 471 },
    'combat-badge': { source: require('./combat-badge.webp'), w: 202, h: 92 },
    'combat-intent-brass': { source: require('./combat-intent-brass.webp'), w: 195, h: 200 },
    'combat-intent-oxblood': { source: require('./combat-intent-oxblood.webp'), w: 193, h: 199 },
    'combat-pip': { source: require('./combat-pip.webp'), w: 55, h: 55 },
    'combat-player-fill': { source: require('./combat-player-fill.webp'), w: 800, h: 30 },
    'combat-player-track': { source: require('./combat-player-track.webp'), w: 546, h: 42 },
    'combat-vitae-fill': { source: require('./combat-vitae-fill.webp'), w: 800, h: 18 },
    'combat-vitae-track': { source: require('./combat-vitae-track.webp'), w: 800, h: 28 },
    'divider-ornate-brass': { source: require('./divider-ornate-brass.webp'), w: 707, h: 59 },
    'divider-plain-brass': { source: require('./divider-plain-brass.webp'), w: 699, h: 21 },
    'divider-short-brass': { source: require('./divider-short-brass.webp'), w: 415, h: 38 },
    'equipment-slot-dark': { source: require('./equipment-slot-dark.webp'), w: 481, h: 184 },
    'equipment-slot-selected': { source: require('./equipment-slot-selected.webp'), w: 483, h: 184 },
    'icon-button-square': { source: require('./icon-button-square.webp'), w: 106, h: 105 },
    'level-badge-dark': { source: require('./level-badge-dark.webp'), w: 153, h: 137 },
    'modal-panel-dark': { source: require('./modal-panel-dark.webp'), w: 719, h: 480 },
    'nav-count-plate-dark': { source: require('./nav-count-plate-dark.webp'), w: 141, h: 75 },
    'nav-count-shield-dark': { source: require('./nav-count-shield-dark.webp'), w: 91, h: 110 },
    'nav-dock-dark': { source: require('./nav-dock-dark.webp'), w: 800, h: 94 },
    'radio-ring': { source: require('./radio-ring.webp'), w: 82, h: 83 },
    'section-header-dark-quatrefoil': { source: require('./section-header-dark-quatrefoil.webp'), w: 720, h: 67 },
    'section-header-dark-star': { source: require('./section-header-dark-star.webp'), w: 724, h: 68 },
    'segment-button-idle': { source: require('./segment-button-idle.webp'), w: 238, h: 106 },
    'segment-button-pressed': { source: require('./segment-button-pressed.webp'), w: 238, h: 106 },
    'segment-button-selected': { source: require('./segment-button-selected.webp'), w: 235, h: 106 },
    'slider-knob-diamond': { source: require('./slider-knob-diamond.webp'), w: 72, h: 74 },
    'slider-knob-round': { source: require('./slider-knob-round.webp'), w: 72, h: 71 },
    'slider-track-diamond': { source: require('./slider-track-diamond.webp'), w: 733, h: 54 },
    'slider-track-quatrefoil': { source: require('./slider-track-quatrefoil.webp'), w: 734, h: 51 },
    'stat-tile': { source: require('./stat-tile.webp'), w: 172, h: 295 },
    'toggle-shell-active': { source: require('./toggle-shell-active.webp'), w: 232, h: 104 },
    'toggle-shell-inactive': { source: require('./toggle-shell-inactive.webp'), w: 228, h: 102 },
} as const;

export type BrassPiece = keyof typeof BRASS;
