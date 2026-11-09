/**
 * The personas do what their names say (phase SM2c, A8): each plays ten whole
 * Breakwater runs through the app's store actions with its seams watched, and
 * the test checks the persona, never the game. It asserts no clear rate, no
 * level and no VITAE.
 *
 * - explorer: never walks to the exit trip while another road leads to work.
 * - rusher: every road it takes is the nearest to the story (else the exit),
 *   and it resolves fewer nodes than the explorer on each seed.
 * - reckless: never withdraws, never rests above half VITAE when it could
 *   upgrade.
 * - cautious: never walks to an elite while other unfinished work is in reach.
 */

import {
    CAUTIOUS_POLICY,
    CHARACTER_ROSTER,
    EXPLORER_POLICY,
    RECKLESS_POLICY,
    RUSHER_POLICY,
    type RunFightContext,
    type RunPolicy,
    type RunRestContext,
    type RunRoadContext,
    type RunRoadOption,
} from '@mechanics';

import { playRun, type RunResult } from './run-driver';

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);

interface Watch {
    roads: { ctx: RunRoadContext; chosen: RunRoadOption }[];
    rests: { ctx: RunRestContext; offer: string }[];
    withdrawals: number;
}

/** A persona that records the roads, rests and withdrawals it answered. */
function watched(base: RunPolicy): { policy: RunPolicy; watch: Watch } {
    const watch: Watch = { roads: [], rests: [], withdrawals: 0 };
    const policy: RunPolicy = {
        ...base,
        chooseRoad: (ctx) => {
            const id = base.chooseRoad(ctx);
            const chosen = ctx.options.find((o) => o.nodeId === id);
            if (chosen) watch.roads.push({ ctx, chosen });
            return id;
        },
        chooseRest: (ctx) => {
            const decision = base.chooseRest(ctx);
            watch.rests.push({ ctx, offer: decision.offer });
            return decision;
        },
        flee: (ctx: RunFightContext) => {
            const fled = base.flee(ctx);
            if (fled) watch.withdrawals++;
            return fled;
        },
    };
    return { policy, watch };
}

function play(base: RunPolicy): { runs: RunResult[]; watches: Watch[] } {
    const runs: RunResult[] = [];
    const watches: Watch[] = [];
    for (const seed of SEEDS) {
        const { policy, watch } = watched(base);
        runs.push(playRun({ policy, seed }));
        watches.push(watch);
    }
    return { runs, watches };
}

const TIMEOUT = 5 * 60 * 1000;

describe('the personas', () => {
    let explorer: ReturnType<typeof play>;
    let rusher: ReturnType<typeof play>;
    let reckless: ReturnType<typeof play>;
    let cautious: ReturnType<typeof play>;

    beforeAll(() => {
        explorer = play(EXPLORER_POLICY);
        rusher = play(RUSHER_POLICY);
        reckless = play(RECKLESS_POLICY);
        cautious = play(CAUTIOUS_POLICY);
    }, 4 * TIMEOUT);

    it('play every seed to a run end as the first roster character', () => {
        for (const { runs } of [explorer, rusher, reckless, cautious]) {
            expect(runs).toHaveLength(SEEDS.length);
            for (const run of runs) {
                expect(['run-over', 'chapter-clear']).toContain(run.outcome);
                expect(run.characterId).toBe(CHARACTER_ROSTER[0]!.id);
            }
        }
    });

    it('explorer takes the exit trip only when no other road leads to work', () => {
        for (const { roads } of explorer.watches) {
            for (const { ctx, chosen } of roads) {
                if (chosen.distanceToExit !== 0) continue;
                const work = ctx.options.some((o) => o.distanceToUnfinished !== null
                    && (o.distanceToExit === null || o.distanceToUnfinished !== o.distanceToExit));
                expect(work).toBe(false);
            }
        }
    });

    it('rusher takes only the road nearest the story, else nearest the exit', () => {
        for (const { roads } of rusher.watches) {
            for (const { ctx, chosen } of roads) {
                const stories = ctx.options.map((o) => o.distanceToStory).filter((d): d is number => d !== null);
                if (stories.length > 0) {
                    expect(chosen.distanceToStory).toBe(Math.min(...stories));
                    continue;
                }
                const exits = ctx.options.map((o) => o.distanceToExit).filter((d): d is number => d !== null);
                if (exits.length > 0) expect(chosen.distanceToExit).toBe(Math.min(...exits));
            }
        }
    });

    it('rusher resolves fewer nodes than the explorer on each seed', () => {
        SEEDS.forEach((_seed, i) => {
            expect(rusher.runs[i]!.nodesResolved).toBeLessThan(explorer.runs[i]!.nodesResolved);
        });
    });

    it('reckless never withdraws and never rests above half when it could upgrade', () => {
        for (const { withdrawals, rests } of reckless.watches) {
            expect(withdrawals).toBe(0);
            for (const { ctx, offer } of rests) {
                const canUpgrade = ctx.offers.some((o) => o.id === 'upgrade' && o.enabled) && ctx.upgradableCardIds.length > 0;
                if (offer === 'rest' && canUpgrade) expect(ctx.health).toBeLessThan(ctx.maxHealth / 2);
            }
        }
    });

    it('cautious never walks to an elite while other unfinished work is in reach', () => {
        for (const { roads } of cautious.watches) {
            for (const { ctx, chosen } of roads) {
                if (!chosen.elite) continue;
                const other = ctx.options.some((o) => o !== chosen && !o.elite && o.unfinished);
                expect(other).toBe(false);
            }
        }
    });
});
