/**
 * Pure presenter for the tab bar visibility, labels, and fit.
 *
 * Combat is mutually exclusive with exploration — the player cannot move
 * around the world while in a fight, and there is no out-of-combat
 * "combat" screen to enter, so the bottom tab bar shows exactly one of
 * the exploration / combat pair at any time. Display strings live on
 * `TAB_TITLES` below.
 *
 * Tested in state/e2e/tabs.engine.test.ts.
 */

export type TabKey = 'exploration' | 'combat' | 'character' | 'memoir' | 'inventory' | 'deck' | 'settings';

export interface TabsViewModel {
    /** Tabs the user can currently see in the bottom bar, in display order. */
    visibleTabs: TabKey[];
    /** Tabs registered with the router but hidden from the bar (href: null). */
    hiddenTabs: TabKey[];
}

/**
 * Display titles for the bottom tab bar, keyed by route name.
 * Lives on the presenter so the screen has no inline string
 * literals on the navigation chrome (Hard Rule #8). Pinned by
 * `state/e2e/tabs.engine.test.ts`, so a regression is visible at
 * verify time even if the `_layout.tsx` `title:` props are bypassed.
 *
 * The titles sit in one all-places register. Display order in the
 * bottom bar: exploration/combat → character → memoir → inventory →
 * deck. The inventory section header (`inventory.engine.ts`) uses the
 * same SATCHEL name.
 *
 * DECK is the fifth visible tab and shows the combat deck the player
 * carries. It sits last, beside SATCHEL, so the two "what you carry"
 * surfaces are adjacent. `DECK` is a thing, not a place, so it sits
 * slightly outside the all-places register; the alternative in that
 * register ("THE HAND", "THE CANON") would collide with the combat
 * hand and the Apocrypha canon respectively, both live terms.
 */
export const TAB_TITLES: Record<TabKey, string> = {
    exploration: 'WILDS',
    combat: 'STRIFE',
    character: 'SELF',
    memoir: 'THE LEDGER',
    inventory: 'SATCHEL',
    deck: 'DECK',
    settings: 'SETTINGS',
};

const ALWAYS_VISIBLE: TabKey[] = ['character', 'memoir', 'inventory', 'deck', 'settings'];

export function selectVisibleTabs(inCombat: boolean): TabsViewModel {
    const positional: TabKey = inCombat ? 'combat' : 'exploration';
    const hidden: TabKey = inCombat ? 'exploration' : 'combat';

    return {
        visibleTabs: [positional, ...ALWAYS_VISIBLE],
        hiddenTabs: [hidden],
    };
}

export function isTabHidden(inCombat: boolean, tab: TabKey): boolean {
    return selectVisibleTabs(inCombat).hiddenTabs.includes(tab);
}

// ---------------------------------------------------------------------------
// Tab-bar FIT — the overflow contract the fifth tab has to clear
// ---------------------------------------------------------------------------

/**
 * Per-glyph advance widths, in em, of the app's sans face (`FONTS.sans` =
 * Uncial Antiqua 400, `@expo-google-fonts/uncial-antiqua`).
 *
 * MEASURED, not estimated: read straight out of the shipped `.ttf`'s
 * `hmtx`/`head` tables, covering exactly the characters the tab titles
 * use — space plus A-Z. Uncial Antiqua is a wide uncial face, not a
 * condensed display face like the sans it replaced, so these widths run
 * roughly double the old ones; a reused condensed-face table would have
 * waved through a fit that in fact clips.
 *
 * Numbers rather than a guess because the fifth tab makes this a real
 * constraint: five tabs across a 360pt phone leave 72pt each, and the tab item
 * truncates with an ellipsis rather than pushing the bar wider
 * (`@react-navigation/elements`' `Label` hardcodes `numberOfLines: 1`), so an
 * overflow is silent — a clipped word, not a broken layout.
 */
const SANS_ADVANCE_EM: Readonly<Record<string, number>> = Object.freeze({
    ' ': 0.25,
    A: 0.79492, B: 0.77686, C: 0.73584, D: 0.89111, E: 0.73682, F: 0.66797, G: 0.83789,
    H: 0.88818, I: 0.40479, J: 0.38818, K: 0.80615, L: 0.60596, M: 1.27783, N: 0.81689,
    O: 0.85986, P: 0.83789, Q: 0.83691, R: 0.76807, S: 0.70410, T: 0.71582, U: 0.89502,
    V: 0.79590, W: 1.10986, X: 0.76318, Y: 0.73389, Z: 0.70020,
});

/** Widest measured glyph (`M`), used for any character outside the table so an
 *  unmeasured title is over-estimated rather than waved through. */
const SANS_ADVANCE_EM_FALLBACK = 1.27783;

/** Tab label type size. `_layout.tsx` styles the label from this constant, so
 *  the fit contract below measures what the bar actually renders. */
// Uncial Antiqua runs far wider than the condensed face this replaced: THE
// LEDGER needs 6 to clear the 320pt phone at all, let alone with headroom.
export const TAB_BAR_LABEL_FONT_SIZE = 6;

/**
 * Tab label letter-spacing. At the wide Uncial Antiqua metrics, THE LEDGER
 * already leaves almost no headroom on the 320pt phone at spacing 0 (see
 * `TAB_BAR_LABEL_FONT_SIZE`); any positive spacing overflows it.
 */
export const TAB_BAR_LABEL_LETTER_SPACING = 0;

/**
 * Horizontal padding `@react-navigation/bottom-tabs` puts inside each tab item
 * (`styles.tabVerticalUiKit`: `padding: 5`), per side. Not ours to set, so it
 * is subtracted from the label budget rather than styled away.
 */
export const TAB_ITEM_HORIZONTAL_PADDING = 5;

/** The narrow-phone width the bar is contracted to fit (the brief's bar). */
export const NARROW_VIEWPORT_PT = 360;

/** The narrowest phone still in the support range — SE-class, checked too. */
export const NARROWEST_VIEWPORT_PT = 320;

/**
 * Rendered width of one tab label, in points.
 *
 * Letter-spacing is charged for EVERY character including the last, which is
 * how React Native's `letterSpacing` behaves on both platforms and is in any
 * case the conservative reading — an over-estimate here can only make the fit
 * check stricter than reality.
 */
export function measureTabLabel(
    title: string,
    fontSize: number = TAB_BAR_LABEL_FONT_SIZE,
    letterSpacing: number = TAB_BAR_LABEL_LETTER_SPACING,
): number {
    let em = 0;
    for (const ch of title) {
        em += SANS_ADVANCE_EM[ch] ?? SANS_ADVANCE_EM_FALLBACK;
    }
    return em * fontSize + title.length * letterSpacing;
}

/** What a tab bar of `titles` does at `viewportPt` wide. */
export interface TabBarFit {
    /** Viewport width the check was run at. */
    viewportPt: number;
    /** How many tabs share it. */
    tabCount: number;
    /** Width of one tab item (the bar divides evenly — every item is flex: 1). */
    perTabPt: number;
    /** Width left for the label once the navigator's own padding is removed. */
    labelBudgetPt: number;
    /** The title that comes closest to overflowing. */
    widestTitle: string;
    /** That title's rendered width. */
    widestLabelPt: number;
    /** Points of headroom on the widest title; negative means it is clipped. */
    slackPt: number;
    /** True when every label renders whole. */
    fits: boolean;
}

/**
 * Does a bar of these labels render without clipping at this width?
 *
 * Pure arithmetic over measured font metrics — no layout engine, no device.
 * It cannot prove a pixel-perfect result, but it catches the failure this
 * change actually risks (one more tab, the same longest word) and it fails
 * LOUDLY in `state/e2e/tabs.engine.test.ts` if a future title, type size, or
 * sixth tab eats the headroom.
 */
export function measureTabBarFit(
    titles: readonly string[],
    viewportPt: number = NARROW_VIEWPORT_PT,
): TabBarFit {
    const tabCount = Math.max(1, titles.length);
    const perTabPt = viewportPt / tabCount;
    const labelBudgetPt = perTabPt - TAB_ITEM_HORIZONTAL_PADDING * 2;

    let widestTitle = '';
    let widestLabelPt = 0;
    for (const title of titles) {
        const width = measureTabLabel(title);
        if (width > widestLabelPt) {
            widestLabelPt = width;
            widestTitle = title;
        }
    }

    return {
        viewportPt,
        tabCount,
        perTabPt,
        labelBudgetPt,
        widestTitle,
        widestLabelPt,
        slackPt: labelBudgetPt - widestLabelPt,
        fits: widestLabelPt <= labelBudgetPt,
    };
}

/** The titles actually on the bar in a given mode — the fit check's input. */
export function visibleTabTitles(inCombat: boolean): string[] {
    return selectVisibleTabs(inCombat).visibleTabs.map((tab) => TAB_TITLES[tab]);
}
