/**
 * Presenter — the TITLE SEQUENCE: the native splash, the title screen and the
 * main menu read as one shot under one wordmark.
 *
 *   splash  the native splash draws the wordmark (`assets/images/splash-icon.png`)
 *           centred, SPLASH_WORDMARK_WIDTH wide, on the game's ground.
 *   title   the title screen opens on that exact frame, holds, then lifts the
 *           wordmark into the plate's dark upper band while the engraving fades in, then
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
    plateLabel: 'Dante alone in a dark wood, a lion on the rock before him, an engraving by Gustave Doré',
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
    /** The wordmark's lift into the plate, and the plate's fade-in beside it. */
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
    /** The wordmark's resting centre and width, in the plate's dark upper band. */
    wordmark: { centerX: number; centerY: number; width: number };
    /** The splash frame's centre (the window's centre). */
    splashCenter: { x: number; y: number };
}

/** The plate's width over height (`assets/images/title/index.ts`). */
const PLATE_ASPECT = 1308 / 1600;

/**
 * How far down a tall phone the plate's box reaches, as a share of the window
 * height. The foot scrim fades its last 45% into the ground, so the art meets
 * the psalm line and, under the menu, sits behind the menu's rows instead of
 * ending above them in a bare black band.
 */
const PHONE_PLATE_REACH = 0.8;

/**
 * The narrowest the plate's box may be (width over height) when it is
 * stretched down a tall phone. The plate fills the box by `cover`, so a
 * narrower box crops more of its sides: at 0.55 at most about 16% of the
 * plate's width goes from each side, and Dante and the lion (about 37% and
 * 72% across) stay in the frame.
 */
const MIN_PLATE_BOX_ASPECT = 0.55;

/**
 * The wordmark's resting centre, as a share of the plate box's height: the
 * dark band of the wood under the pale slit of sky in Doré's Inferno Plate 3
 * (the slit spans about 7% to 20% of the plate's height, the band below it to
 * about 35%). The plate fills its box by height in every layout, so this
 * share lands on the same band of the engraving on a phone and a desktop.
 */
export const WORDMARK_REST_Y = 0.28;

/**
 * Where the plate and the wordmark sit. Pure.
 *
 * The plate is pinned to the top. On a wide window its height is capped at
 * 72% of the window and it is centred, so it never grows past what the eye
 * takes in. On a phone it spans the width and reaches `PHONE_PLATE_REACH` of
 * the height (never narrower than `MIN_PLATE_BOX_ASPECT`, never shorter than
 * the plate's own aspect), so a tall phone has art behind the psalm line and
 * the menu rather than a black band. The wordmark rests in the dark band under
 * the plate's slit of sky (`WORDMARK_REST_Y`), clear of the safe-area inset,
 * at 86% of the plate's width (at most 460pt). The menu shares the plate's
 * band, so on a wide window its rows never overhang the art.
 */
export function titleLayout({ width, height, topInset }: Viewport): TitleLayout {
    const plateWidth = Math.min(width, height * 0.72 * PLATE_ASPECT);
    const natural = plateWidth / PLATE_ASPECT;
    const plateHeight = plateWidth < width
        ? natural
        : Math.max(natural, Math.min(height * PHONE_PLATE_REACH, plateWidth / MIN_PLATE_BOX_ASPECT));
    const left = (width - plateWidth) / 2;
    const wordmarkWidth = Math.min(plateWidth * 0.86, 460);
    const centerY = Math.max(topInset + 36, plateHeight * WORDMARK_REST_Y);
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
