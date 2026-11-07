/**
 * Pure presenter for the tab bar visibility and titles.
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

/** Tab icon size in points. The bar shows icons alone; each tab's name rides as
 *  its accessibility label. */
export const TAB_ICON_SIZE = 30;
