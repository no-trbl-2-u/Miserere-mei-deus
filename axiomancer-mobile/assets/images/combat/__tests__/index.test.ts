/**
 * Combat arena backdrop resolver: region-keyed with a fallback. Every live
 * region that has no plate of its own is named in `AWAITING_PLATE` below, and
 * the assertions here pin that set in both directions.
 */

import { describe, expect, it } from '@jest/globals';

import {
    ARENA_PLATES,
    ARENA_PLATE_IDS,
    arenaAltTextFor,
    arenaBackdropFor,
    type ArenaPlateId,
} from '@/assets/images/combat';
import { ALL_MAP_LAYOUTS } from '@/state/exploration-maps';

/**
 * Every region string the game can actually hand the resolver, read from the
 * map registry rather than hand-listed.
 *
 * Never derive the EXPECTED PLATES below from `REGION_ARENAS` — that would
 * assert only that the table equals itself. The INPUT set is different:
 * `ALL_MAP_LAYOUTS` is not the implementation under test; it is the game's own
 * statement of which maps exist. A hand-written list can silently omit a
 * region; derived, a new map with no arena rule fails on its first commit.
 */
const LIVE_REGIONS: readonly string[] = ALL_MAP_LAYOUTS.map((l) => l.region);

/**
 * The live regions that legitimately still reach the fallback plate. Pinned in
 * BOTH directions below: a region added here that is not falling back fails,
 * and a region falling back that is not here fails. So the day a plate ships,
 * the case goes red and points at this entry.
 */
// Empty since plan 146.2: all four Act 1 regions default to a plate of their
// own. A new live region with no rule is named here until its plate ships.
const AWAITING_PLATE: readonly string[] = [];

/**
 * T's four defaults, by stable plate id. Hand-written on purpose: this is
 * the pick itself, so it must not be derived from the rule table it checks.
 */
const REGION_DEFAULTS: Readonly<Record<string, ArenaPlateId>> = {
    'The Breakwater': 'arena-breakwater-northern-sea',
    'The Charcoal Wood': 'arena-charcoal-wood-sacred-grove',
    'The Beacon Crags': 'arena-beacon-crags-storm-mountains',
    'The Lantern Deep': 'arena-lantern-deep-toteninsel',
};

/** The live regions that are meant to have a plate of their own. */
const PLATED_REGIONS: readonly string[] = LIVE_REGIONS.filter((r) => !AWAITING_PLATE.includes(r));

describe('the plate library', () => {
    it('keeps all twelve plates under stable arena-<region>-<subject> ids', () => {
        expect(ARENA_PLATE_IDS).toHaveLength(12);
        for (const id of ARENA_PLATE_IDS) expect(id).toMatch(/^arena-[a-z]+(-[a-z]+)+$/);
    });

    it('gives every plate its own art and its own description', () => {
        const arts = ARENA_PLATE_IDS.map((id) => ARENA_PLATES[id].art);
        const alts = ARENA_PLATE_IDS.map((id) => ARENA_PLATES[id].alt);
        expect(new Set(arts).size).toBe(ARENA_PLATE_IDS.length);
        expect(new Set(alts).size).toBe(ARENA_PLATE_IDS.length);
        for (const alt of alts) expect(alt.length).toBeGreaterThan(20);
    });

    it('resolves each live region to the default T picked, art and words together', () => {
        for (const [region, id] of Object.entries(REGION_DEFAULTS)) {
            expect(LIVE_REGIONS).toContain(region);
            expect(arenaBackdropFor(region)).toEqual(ARENA_PLATES[id].art);
            expect(arenaAltTextFor(region)).toEqual(ARENA_PLATES[id].alt);
        }
        expect(Object.keys(REGION_DEFAULTS).sort()).toEqual([...LIVE_REGIONS].sort());
    });

    it('leaves the fallback and the Drowned Parish out of the twelve', () => {
        const arts: readonly number[] = ARENA_PLATE_IDS.map((id) => ARENA_PLATES[id].art);
        expect(arts).not.toContain(arenaBackdropFor(undefined));
        expect(arts).not.toContain(arenaBackdropFor('the Drowned Parish'));
    });
});

describe('arenaBackdropFor', () => {
    it('resolves the coastal village (the Drowned Parish) to its own plate', () => {
        const fallback = arenaBackdropFor(undefined);
        expect(arenaBackdropFor('the Drowned Parish')).not.toEqual(fallback);
    });

    it('matches case-insensitively and as a substring of a longer region string', () => {
        expect(arenaBackdropFor('THE DROWNED PARISH')).toEqual(arenaBackdropFor('the Drowned Parish'));
        expect(arenaBackdropFor('Somewhere in the Drowned Parish, near the docks'))
            .toEqual(arenaBackdropFor('the Drowned Parish'));
    });

    /**
     * The fallback cases: a region string with no rule at all, the undefined
     * dev-sandbox case, and the live regions `AWAITING_PLATE` names. A live
     * region falling back unnoticed would fight in front of a plate drawn for
     * somewhere else.
     */
    it('falls back for a region with no rule, for undefined, and for exactly the regions AWAITING_PLATE names', () => {
        const fallback = arenaBackdropFor(undefined);
        expect(arenaBackdropFor('unknown region')).toEqual(fallback);
        expect(arenaBackdropFor('The Kingdom of Nowhere')).toEqual(fallback);
        // The load-bearing half, in both directions. Fails with MORE than
        // AWAITING_PLATE when a live region loses or never had a rule — the
        // regression this file exists to catch. Fails with FEWER when a plate
        // ships, which is the signal to delete that entry above and correct the
        // comments that name it.
        const fellBack = LIVE_REGIONS.filter((r) => arenaBackdropFor(r) === fallback);
        expect([...fellBack].sort()).toEqual([...AWAITING_PLATE].sort());
    });

    /**
     * AWAITING_PLATE is an exemption, so it must not be able to rot into one.
     * A region renamed in its layout file would otherwise leave a ghost entry
     * quietly excusing the new name from every assertion in this file.
     */
    it('AWAITING_PLATE names only regions the game can actually be in', () => {
        expect(AWAITING_PLATE.filter((r) => !LIVE_REGIONS.includes(r))).toEqual([]);
    });

    it('gives each plated region its OWN plate, all distinct from each other', () => {
        const plates = PLATED_REGIONS.map((r) => arenaBackdropFor(r));
        // No two regions share a plate, which is the whole point: fights in
        // different places should not look like the same fight.
        expect(new Set(plates).size).toBe(PLATED_REGIONS.length);
        // Pinned as two numbers, not one: a dropped plate and a dropped map are
        // different failures and neither may hide behind the other.
        // Every live region has a plate of its own.
        expect(PLATED_REGIONS).toHaveLength(4);
        // The four Act 1 maps are the whole world.
        expect(LIVE_REGIONS).toHaveLength(4);
    });

    it('never throws on undefined or empty input — undefined is the ordinary dev-sandbox case', () => {
        expect(() => arenaBackdropFor(undefined)).not.toThrow();
        expect(() => arenaBackdropFor('')).not.toThrow();
    });
});

describe('arenaAltTextFor', () => {
    it('describes the dock scene for the coastal village, not the fallback plate', () => {
        const text = arenaAltTextFor('the Drowned Parish');
        expect(text).not.toEqual(arenaAltTextFor(undefined));
        expect(text.toLowerCase()).toContain('boat');
    });

    /**
     * The assertion is made against the PROPERTY rather than the words,
     * so a plate swap does not require editing a string literal here:
     * the fallback must describe something, and it must not be any keyed
     * region's description.
     */
    it('has its own fallback description, shared by no plated region', () => {
        const fallback = arenaAltTextFor(undefined);
        expect(fallback.length).toBeGreaterThan(20);
        expect(arenaAltTextFor('unknown region')).toEqual(fallback);
        for (const region of PLATED_REGIONS) {
            expect(arenaAltTextFor(region)).not.toEqual(fallback);
        }
    });

    /**
     * The drift guard. `arenaBackdropFor` and `arenaAltTextFor` read the same
     * record, so a plate cannot ship carrying another plate's words — but that
     * is only true while they both go through `plateFor`. This asserts the
     * property rather than the wiring: every region with its own plate must
     * also have its own description, and no two may share one.
     */
    it('gives every plated region its own description, never the fallback text', () => {
        const texts = PLATED_REGIONS.map((r) => arenaAltTextFor(r));
        const fallback = arenaAltTextFor(undefined);
        for (const t of texts) {
            expect(t).not.toEqual(fallback);
            expect(t.length).toBeGreaterThan(20);
        }
        expect(new Set(texts).size).toBe(PLATED_REGIONS.length);
    });

    /**
     * Alt text describes the IMAGE, not the place. A screen-reader user already
     * knows which region they are standing in — the label exists to tell them
     * what the sighted player is looking at. A description that just names the
     * region is the failure mode this pins.
     */
    it('describes the plate rather than naming the region back to the user', () => {
        for (const region of PLATED_REGIONS) {
            expect(arenaAltTextFor(region).toLowerCase()).not.toContain(region.toLowerCase());
        }
    });
});
