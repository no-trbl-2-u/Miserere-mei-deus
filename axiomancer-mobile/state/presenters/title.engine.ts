/**
 * Presenter — the TITLE SEQUENCE: the native splash, the title screen and the
 * main menu read as one shot under one wordmark.
 *
 *   splash  the native splash draws the wordmark (`assets/images/splash-icon.png`)
 *           centred, SPLASH_WORDMARK_WIDTH wide, on the game's ground.
 *   title   the title screen opens on that exact frame, holds, then lifts the
 *           wordmark into the plate's sky while the engraving fades in, then
 *           shows the psalm line and EMBARK.
 *   menu    EMBARK dims the plate and brings up the menu beneath the same
 *           wordmark; nothing else moves.
 *
 * Copy lives here, not in the component (package rule). The psalm line is
 * Psalm 51:1 in the King James text (public domain): its Latin incipit is the
 * game's name.
 *
 * Functions (lowest → highest abstraction):
 *   titleLayout(viewport)        where the plate and the wordmark sit
 *   titleWordmarkFrames(layout)  the wordmark's splash and rest frames
 */

/** Every line of player-facing copy on the title screen. */
export const TITLE_COPY = Object.freeze({
    wordmark: 'Miserere Mei, Deus',
    psalm: 'Have mercy upon me, O God, according to thy lovingkindness.',
    psalmSource: 'psalm 51',
    footer: 'Your path begins on the coast, at a windmill above the breakwater.',
    embark: 'EMBARK…',
    embarkHint: 'begin the pilgrimage',
    embarkLabel: 'Embark on your journey',
    plateLabel: 'Dante and Virgil meet an old man on an empty shore before dawn, an engraving by Gustave Doré',
});

/**
 * The splash wordmark's width in points. MUST equal app.json's
 * expo-splash-screen `imageWidth` (a test pins the two), or the title
 * screen's first frame no longer lands on the splash's last.
 */
export const SPLASH_WORDMARK_WIDTH = 180;

/**
 * Pirata One's ink width for the wordmark, in ems: the rendered width at font
 * size 1. Measured by `scripts/build-title-assets.mjs`'s renderer (687px at
 * 100). The component measures the real text on layout and corrects; this is
 * only the first frame's estimate.
 */
export const WORDMARK_EM_WIDTH = 6.87;

/** The sequence's beats, in ms. */
export const TITLE_TIMING = Object.freeze({
    /** The splash's own frame, held so the hand-off is invisible. */
    holdMs: 450,
    /** The wordmark's lift into the sky, and the plate's fade-in beside it. */
    liftMs: 1500,
    /** The psalm line and EMBARK, after the lift. */
    ctaMs: 700,
    /** EMBARK → menu. */
    menuMs: 650,
});

/** How far the plate dims under the menu (its opacity there). */
export const MENU_PLATE_OPACITY = 0.3;

export interface Viewport {
    width: number;
    height: number;
    /** The safe-area top inset (status bar / notch). */
    topInset: number;
}

export interface TitleLayout {
    /** The plate's box: full width on a phone, capped and centred on a wide window. */
    plate: { left: number; top: number; width: number; height: number };
    /** The menu's horizontal band: the plate's own, so its rows sit within the art. */
    menu: { left: number; width: number };
    /** The wordmark's resting centre and width, in the plate's sky. */
    wordmark: { centerX: number; centerY: number; width: number };
    /** The splash frame's centre (the window's centre). */
    splashCenter: { x: number; y: number };
}

/** The plate's width over height (`assets/images/title/index.ts`). */
const PLATE_ASPECT = 1290 / 1600;

/**
 * Where the plate and the wordmark sit. Pure.
 *
 * The plate is pinned to the top. On a phone it spans the width and ends a
 * little past half the screen, leaving the lower part for the psalm and
 * EMBARK; on a wide window its height is capped at 72% of the window and it is
 * centred, so it never grows past what the eye takes in. The wordmark rests in
 * the plate's sky, 13% down its height, clear of the safe-area inset, at 86%
 * of its width (at most 460pt). The menu shares the plate's band, so on a
 * wide window its rows never overhang the art.
 */
export function titleLayout({ width, height, topInset }: Viewport): TitleLayout {
    const plateWidth = Math.min(width, height * 0.72 * PLATE_ASPECT);
    const plateHeight = plateWidth / PLATE_ASPECT;
    const left = (width - plateWidth) / 2;
    const wordmarkWidth = Math.min(plateWidth * 0.86, 460);
    const centerY = Math.max(topInset + 36, plateHeight * 0.13);
    return {
        plate: { left, top: 0, width: plateWidth, height: plateHeight },
        menu: { left, width: plateWidth },
        wordmark: { centerX: width / 2, centerY, width: wordmarkWidth },
        splashCenter: { x: width / 2, y: height / 2 },
    };
}

export interface WordmarkFrames {
    /** The splash frame relative to the rest frame: offset and scale. */
    splash: { translateY: number; scale: number };
    rest: { translateY: 0; scale: 1 };
}

/**
 * The wordmark's two frames, as transforms of the resting element. Pure.
 *
 * @param layout        - from `titleLayout`.
 * @param measuredWidth - the rendered text's real width at its resting font
 *   size, once measured; the rest width until then.
 */
export function titleWordmarkFrames(layout: TitleLayout, measuredWidth = layout.wordmark.width): WordmarkFrames {
    const restWidth = measuredWidth > 0 ? measuredWidth : layout.wordmark.width;
    return {
        splash: {
            translateY: layout.splashCenter.y - layout.wordmark.centerY,
            scale: SPLASH_WORDMARK_WIDTH / restWidth,
        },
        rest: { translateY: 0, scale: 1 },
    };
}
