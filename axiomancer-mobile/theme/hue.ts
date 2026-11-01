/**
 * Fixed colours — the hues that are the same in every theme.
 *
 * `app/`, `components/` and `state/presenters/` never write a hex literal;
 * they read a token from `AXM` (theme-driven) or from here (fixed), both
 * exported from `theme/axm.ts`. `theme/__tests__/no-hex-literals.test.ts`
 * holds that line. A hue that should follow the theme
 * moves into `ThemeSpec` (`theme/palette.ts`) as a deliberate visual change.
 *
 * This file has no imports, so modules loaded outside the app can use it
 * (the mechanics catalog export reads `components/combat/statusGlyphs.ts`).
 */
export const HUE = {
    // Neutrals
    black: '#000000',
    white: '#ffffff',
    badgeInk: '#0a0a0a',
    fallbackGrey: '#888',
    stoneGrey: '#8a8273',
    inertGrey: '#6b6257',
    deadGrey: '#3a3a3a',
    guardSteel: '#9aa0a6',

    // Screen and overlay grounds
    inkBg: '#0c0a08',
    overlayBg: '#0b0907',
    routeBg: '#0b0a08',
    rollBg: '#0a0908',
    medallionBg: '#0c0a06',
    medallionDeep: '#070509',

    // Combat feedback (floaters, intents, status glyphs, outcomes)
    damageRed: '#e2543b',
    tickPurple: '#a86bdc',
    boonGreen: '#5bbf6a',
    goldAccent: '#d9b44a',
    statDownAmber: '#e08a3c',
    hexAmber: '#e08a3b',
    markGold: '#d9c66a',
    payoffGold: '#c2a14e',
    blockBlue: '#6b8eb0',
    defeatRed: '#e01f33',
    retreatBone: '#9c937f',
    woundVignette: '#7a1410',
    guardBlue: '#6fb3e0',
    guardBlueEdge: '#6fb3e055',

    // Keyword glyphs, by what the keyword is (`state/presenters/keyword-glyph.engine.ts`)
    glyphDamage: '#f06a5e',
    glyphDefence: '#6aa8f0',
    glyphBlood: '#d13b4a',
    glyphHex: '#b39af5',
    glyphGold: '#e0bb5c',
    glyphFire: '#f39a3f',
    glyphIce: '#a9dcf5',
    glyphBone: '#b8ae98',
    glyphEmber: '#f0997b',

    // Dice identities (the owner-specified dice palette) and the die cube
    dieHeart: '#9a5fd0',
    dieBody: '#d6543f',
    dieMind: '#4f7fd6',
    dieX: '#5a5a5a',
    dieCrackedRing: '#6b3030',
    dieGreyLite: '#2b2a31',
    dieGreyDark: '#131217',
    dieGreyEdge: '#0c0b10',
    dieGreyStroke: '#6f6a5e',
    dieUnderside: '#0b0812',
    dieCrackLine: '#b85c5c',

    // Rarity
    rareViolet: '#9a6ad6',
    rarityBlue: '#3b7fd4',

    // Hazard minigame (board, dice, cards, route select)
    hzAcid: '#86a821',
    hzAcidDim: '#566612',
    hzStone: '#15120f',
    hzStoneHi: '#221d18',
    hzRed: '#c0152a',
    hzRedDark: '#6e0c18',
    hzRedLite: '#e2455a',
    hzRedBg: '#1a0808',
    hzBlue: '#5b86c4',
    hzBlueDark: '#34527a',
    hzBlueLite: '#8fb0dd',
    hzBlueBg: '#0b1018',
    hzPurple: '#8a57bd',
    hzPurpleDark: '#522f78',
    hzPurpleLite: '#b083e0',
    hzPurpleDeep: '#160a26',
    hzGoldDim: '#6e5a28',
    hzGoldLite: '#ddc372',
    hzGoldBg: '#16130a',
    hzHex: '#0c0c0e',
    hzHexDark: '#040405',
    hzHexLite: '#cdbede',
    hzHexDieLite: '#15141a',
    hzHexDieDark: '#060608',
    hzPassage: '#9e7d2a',
    hzForceInk: '#8e1020',
    hzEscapeInk: '#2c4f7a',
    hzCleanseFill: '#1c1a14',
    hzBloodFill: '#160606',
    hzCardPaper: '#d8cdb4',
    hzCardInk: '#241f17',
    hzCardInk2: '#5d5344',
    hzCardEdge: '#8d8268',
    hzRouteSafeBg: '#17150f',
    hzRouteRiskBg: '#12110b',
    hzRouteSafeFailEdge: '#7a3a3a',
    hzRouteSafeFailText: '#a85a5a',

    // Danger-card scene art
    artStone: '#1d1813',
    artSmoke: '#2a231b',
    artWater: '#0f1416',
    artWaterLine: '#27353a',
    artMoss: '#10150f',
} as const;
