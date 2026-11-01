/**
 * Hermetic E2E Tests — Tab visibility presenter
 *
 * Combat is mutually exclusive with exploration. The bottom tab bar
 * shows MAP when out of combat and COMBAT when in combat — never both.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';

import {
    isTabHidden,
    measureTabBarFit,
    measureTabLabel,
    NARROW_VIEWPORT_PT,
    NARROWEST_VIEWPORT_PT,
    selectVisibleTabs,
    TAB_TITLES,
    visibleTabTitles,
    type TabKey,
} from '@/state/presenters/tabs.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Happy path — out-of-combat shows MAP, in-combat shows COMBAT
// ---------------------------------------------------------------------------

describe('selectVisibleTabs: happy path', () => {
    it('shows the exploration tab when not in combat', () => {
        const vm = selectVisibleTabs(false);

        expect(vm.visibleTabs).toContain('exploration');
        expect(vm.hiddenTabs).toContain('combat');
    });

    it('shows the combat tab when in combat', () => {
        const vm = selectVisibleTabs(true);

        expect(vm.visibleTabs).toContain('combat');
        expect(vm.hiddenTabs).toContain('exploration');
    });
});

// ---------------------------------------------------------------------------
// Mutual exclusion invariant
// ---------------------------------------------------------------------------

describe('selectVisibleTabs: mutual exclusion', () => {
    it('never shows MAP and COMBAT at the same time, in either mode', () => {
        for (const inCombat of [false, true]) {
            const vm = selectVisibleTabs(inCombat);
            const exploreVisible = vm.visibleTabs.includes('exploration');
            const combatVisible = vm.visibleTabs.includes('combat');

            expect(exploreVisible && combatVisible).toBe(false);
            expect(exploreVisible || combatVisible).toBe(true);
        }
    });

    it('places exactly one of MAP/COMBAT in hiddenTabs in either mode', () => {
        for (const inCombat of [false, true]) {
            const vm = selectVisibleTabs(inCombat);
            const hidden = vm.hiddenTabs.filter(
                (t) => t === 'exploration' || t === 'combat',
            );

            expect(hidden).toHaveLength(1);
        }
    });
});

// ---------------------------------------------------------------------------
// Always-visible tabs invariant
// ---------------------------------------------------------------------------

describe('selectVisibleTabs: always-visible tabs', () => {
    it.each([false, true])(
        'always shows SELF, MEMOIR, SATCHEL, DECK and SETTINGS (inCombat=%p)',
        (inCombat) => {
            const vm = selectVisibleTabs(inCombat);

            expect(vm.visibleTabs).toEqual(
                expect.arrayContaining(['character', 'memoir', 'inventory', 'deck', 'settings']),
            );
            expect(vm.hiddenTabs).not.toEqual(
                expect.arrayContaining(['character', 'memoir', 'inventory', 'deck', 'settings']),
            );
        },
    );

    it('returns 6 visible tabs (1 positional + 5 always-visible) post-SETTINGS', () => {
        // SETTINGS is the sixth VISIBLE tab.
        for (const inCombat of [false, true]) {
            const vm = selectVisibleTabs(inCombat);
            expect(vm.visibleTabs).toHaveLength(6);
        }
    });

    it('appends SETTINGS last so no existing tab changes position', () => {
        // The point of appending rather than slotting DECK beside SELF: four
        // tabs' worth of muscle memory survives the addition. If a later
        // change reorders the bar, this is the test that should argue with it.
        expect(selectVisibleTabs(false).visibleTabs).toEqual([
            'exploration', 'character', 'memoir', 'inventory', 'deck', 'settings',
        ]);
        expect(selectVisibleTabs(true).visibleTabs).toEqual([
            'combat', 'character', 'memoir', 'inventory', 'deck', 'settings',
        ]);
    });

    it('lists the positional tab first so it remains the leftmost in the bar', () => {
        expect(selectVisibleTabs(false).visibleTabs[0]).toBe('exploration');
        expect(selectVisibleTabs(true).visibleTabs[0]).toBe('combat');
    });
});

// ---------------------------------------------------------------------------
// isTabHidden helper — inverse view of the same selector
// ---------------------------------------------------------------------------

describe('isTabHidden: agreement with selectVisibleTabs', () => {
    const allTabs: TabKey[] = ['exploration', 'combat', 'character', 'memoir', 'inventory', 'deck', 'settings'];

    it.each([false, true])(
        'agrees with selectVisibleTabs for every tab when inCombat=%p',
        (inCombat) => {
            const vm = selectVisibleTabs(inCombat);

            for (const tab of allTabs) {
                const hidden = isTabHidden(inCombat, tab);
                expect(hidden).toBe(vm.hiddenTabs.includes(tab));
                expect(hidden).toBe(!vm.visibleTabs.includes(tab));
            }
        },
    );
});

// ---------------------------------------------------------------------------
// Purity / referential transparency
// ---------------------------------------------------------------------------

describe('selectVisibleTabs: purity', () => {
    it('returns deep-equal results for repeated calls with the same input', () => {
        const a = selectVisibleTabs(false);
        const b = selectVisibleTabs(false);

        expect(a).toEqual(b);
    });

    it('returns a fresh array each call so callers cannot mutate shared state', () => {
        const vm = selectVisibleTabs(false);
        vm.visibleTabs.push('combat');

        // A subsequent call still returns the canonical value.
        expect(selectVisibleTabs(false).visibleTabs).not.toContain('combat');
    });
});

// ---------------------------------------------------------------------------
// TAB_TITLES contract
// ---------------------------------------------------------------------------

describe('TAB_TITLES: tab-label contract', () => {
    it('exposes a non-empty string title for every TabKey', () => {
        const keys: TabKey[] = ['exploration', 'combat', 'character', 'memoir', 'inventory', 'deck', 'settings'];
        for (const key of keys) {
            expect(typeof TAB_TITLES[key]).toBe('string');
            expect(TAB_TITLES[key].length).toBeGreaterThan(0);
        }
    });

    it('contains no `{...}` or `${...}` template-string leaks', () => {
        // A template leak renders a tab label as `{ TAB NAME }"--index"`
        // literally. Pin that no title carries an unresolved template-shape.
        const leakRe = /\{[\s\w.-]+\}|\$\{[^}]+\}/;
        for (const [key, title] of Object.entries(TAB_TITLES)) {
            expect({ key, title, leaks: leakRe.test(title) }).toEqual({
                key,
                title,
                leaks: false,
            });
        }
    });

    it('matches the post-handoff-port register (places + MEMOIR + SATCHEL rename)', () => {
        // A coherent all-places register in the period serif voice. The
        // template-leak invariant above holds whatever the titles are.
        expect(TAB_TITLES.exploration).toBe('WILDS');
        expect(TAB_TITLES.combat).toBe('STRIFE');
        expect(TAB_TITLES.character).toBe('SELF');
        expect(TAB_TITLES.memoir).toBe('THE LEDGER');
        expect(TAB_TITLES.inventory).toBe('SATCHEL');
        // The fifth tab is named DECK, in those words.
        expect(TAB_TITLES.deck).toBe('DECK');
        // The sixth, rightmost tab is the gear.
        expect(TAB_TITLES.settings).toBe('SETTINGS');
    });
});

// ---------------------------------------------------------------------------
// Tab-bar FIT — the overflow contract SETTINGS has to clear
// ---------------------------------------------------------------------------

describe('measureTabBarFit: no tab-bar overflow at 360pt', () => {
    it('fits every visible label at 360pt in both modes', () => {
        for (const inCombat of [false, true]) {
            const fit = measureTabBarFit(visibleTabTitles(inCombat), NARROW_VIEWPORT_PT);

            expect(fit.tabCount).toBe(6);
            // Reported as an object so a failure prints WHICH label overflowed
            // and by how much, rather than just `false`.
            expect({
                mode: inCombat ? 'combat' : 'exploration',
                widest: fit.widestTitle,
                labelPt: Math.round(fit.widestLabelPt * 10) / 10,
                budgetPt: fit.labelBudgetPt,
                fits: fit.fits,
            }).toEqual({
                mode: inCombat ? 'combat' : 'exploration',
                widest: fit.widestTitle,
                labelPt: Math.round(fit.widestLabelPt * 10) / 10,
                budgetPt: fit.labelBudgetPt,
                fits: true,
            });
        }
    });

    it('still fits on the narrowest supported phone (320pt)', () => {
        // 360pt is the brief's bar; 320pt is an SE-class device that really
        // ships. A contract that only clears the wider one is a contract that
        // clips on the narrower one, silently (the navigator's label is
        // numberOfLines: 1, so overflow ellipsises instead of breaking layout).
        const fit = measureTabBarFit(visibleTabTitles(false), NARROWEST_VIEWPORT_PT);
        expect(fit.fits).toBe(true);
    });

    it('keeps real headroom, so the next title change is not a cliff edge', () => {
        const fit = measureTabBarFit(visibleTabTitles(false), NARROW_VIEWPORT_PT);
        expect(fit.widestTitle).toBe(TAB_TITLES.memoir);
        expect(fit.slackPt).toBeGreaterThan(5);
    });

    it('detects an overflow rather than always answering yes', () => {
        // The check has to be capable of failing, or it proves nothing. A
        // sixth tab with a long title is the shape of the next regression.
        const overloaded = [...visibleTabTitles(false), 'THE UNDERCROFT'];
        expect(measureTabBarFit(overloaded, NARROW_VIEWPORT_PT).fits).toBe(false);
    });
});

describe('measureTabLabel: the measurement itself', () => {
    it('is monotonic — a longer word is never measured narrower', () => {
        expect(measureTabLabel('SATCHEL')).toBeGreaterThan(measureTabLabel('SELF'));
        expect(measureTabLabel('THE LEDGER')).toBeGreaterThan(measureTabLabel('DECK'));
    });

    it('measures the empty label as zero and never returns NaN', () => {
        expect(measureTabLabel('')).toBe(0);
        for (const title of Object.values(TAB_TITLES)) {
            expect(Number.isFinite(measureTabLabel(title))).toBe(true);
        }
    });

    it('charges an unmeasured glyph at the widest known advance', () => {
        // An out-of-table character (a digit, punctuation, a glyph) must
        // over-estimate, never sail through unmeasured.
        expect(measureTabLabel('?')).toBeGreaterThanOrEqual(measureTabLabel('W'));
    });
});
