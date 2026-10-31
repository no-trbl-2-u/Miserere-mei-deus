/**
 * Chapter 1 tuning table: every Breakwater foe at its node's level against
 * the four kitted lane decks at player levels 8 and 10, under both pacing
 * drivers (`Combat/combat.pacing.sim.ts`), at live foe VITAE.
 *
 * Usage:
 *   npm run chapter1-enemies -w axiomancer-mechanics
 *   npm run chapter1-enemies -w axiomancer-mechanics -- [--runs=100] [--seed=1] [--commit=<sha>] [--write=<path>]
 *
 * The foes come from `BW_ENCOUNTER_FOES` (the normals, bound per node) and
 * `BW_ELITE_DRAWS` (each elite pair node, one row per foe), built the way the
 * live node builds them: the registry foe re-tiered by `sourceAtTier`, then
 * `scaleEnemyToLevel` to the node's level. A kitted lane is its test deck with
 * every card upgraded once and its three relics worn (grey has none), the
 * player an even stat spread. A measurement, not a gate.
 */

import fs from 'node:fs';
import path from 'node:path';

import { createCharacter } from '../Character';
import type { Character } from '../Character/types';
import { getCardLane } from '../Cards/card.lanes';
import { nextUpgradeId } from '../Cards/card-upgrades';
import { stageStats } from '../Game/act1-progression';
import { ENEMY_REGISTRY, type EnemySlug } from '../Enemy/enemy.library';
import type { Enemy } from '../Enemy/types';
import { relicLibrary } from '../Items/relic.library';
import type { Equipment } from '../Items/types';
import { scaleEnemyToLevel } from '../World/encounter';
import { sourceAtTier } from '../World/encounter-tier';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES, type ActOneFoe } from '../World/MapEvents/content';
import {
    simulatePacing, LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER, type PacingPolicy, type PacingSummary,
} from '../Combat/combat.pacing.sim';

/** The four lanes, grey first. */
export const TUNING_LANES = ['grey', 'blood-price', 'elementalist', 'defender'] as const;
/** The player levels measured. */
export const TUNING_LEVELS = [8, 10] as const;
export const TUNING_POLICIES: readonly PacingPolicy[] = ['human-like', 'witness'];

/** One foe row: a registry foe at one tier and level, with every node that stages it. */
export interface TuningFoe {
    slug: EnemySlug;
    level: number;
    elite: boolean;
    /** The nodes that stage it, in map order, an elite pair node marked with the pair. */
    nodes: string[];
    enemy: Enemy;
}

function stage(foe: ActOneFoe): Enemy {
    return scaleEnemyToLevel(sourceAtTier(ENEMY_REGISTRY[foe.slug], foe.difficulty), foe.level);
}

/**
 * Every Breakwater foe, one row each, read from the node tables so none can be
 * missed. Normals first, then each elite pair node's foes one by one.
 */
export function tuningFoes(): TuningFoe[] {
    const rows = new Map<string, TuningFoe>();
    const add = (nodeId: string, foe: ActOneFoe, elite: boolean): void => {
        const key = `${foe.slug}@${foe.level}@${elite ? 'elite' : 'normal'}`;
        const row = rows.get(key);
        if (row) { row.nodes.push(nodeId); return; }
        rows.set(key, { slug: foe.slug, level: foe.level, elite, nodes: [nodeId], enemy: stage(foe) });
    };
    for (const [nodeId, foe] of Object.entries(BW_ENCOUNTER_FOES)) add(nodeId, foe, false);
    for (const [nodeId, draw] of Object.entries(BW_ELITE_DRAWS)) for (const foe of draw) add(nodeId, foe, true);
    return [...rows.values()];
}

/** A lane's kit: its test deck upgraded once, and the relics it opens (grey: none). */
export function kittedLane(laneId: string): { cards: string[]; relics: Equipment[] } {
    const lane = getCardLane(laneId);
    if (!lane) throw new Error(`chapter1-enemies: no card lane '${laneId}'`);
    return {
        cards: lane.testDeck.map(id => nextUpgradeId(id) ?? id),
        relics: relicLibrary.filter(r => r.laneId === laneId).slice(0, 3),
    };
}

/** The player at `level`, an even stat spread, wearing the kit's relics. */
export function kittedPlayer(level: number, kit: { cards: string[]; relics: Equipment[] }): Character {
    return createCharacter({
        id: 'tuning', name: 'Tuning', level, baseStats: stageStats(level, 'even'),
        knownCards: [...new Set(kit.cards)], equipment: kit.relics.map(r => ({ ...r })),
    });
}

export interface TuningCell {
    policy: PacingPolicy;
    lane: string;
    level: number;
    foe: TuningFoe;
    playerMaxVitae: number;
    summary: PacingSummary;
}

/** Runs the whole table. */
export function tuningCells(runs: number, seed: number): TuningCell[] {
    const out: TuningCell[] = [];
    const foes = tuningFoes();
    for (const policy of TUNING_POLICIES) {
        for (const lane of TUNING_LANES) {
            const kit = kittedLane(lane);
            for (const level of TUNING_LEVELS) {
                const player = kittedPlayer(level, kit);
                for (const foe of foes) {
                    const summary = simulatePacing({
                        player, enemy: foe.enemy, deck: kit.cards, policy, runs, startSeed: seed, mercy: false,
                    });
                    out.push({ policy, lane, level, foe, playerMaxVitae: player.maxHealth, summary });
                }
            }
        }
    }
    return out;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number): string => (Number.isNaN(x) ? 'n/a' : x.toFixed(1));

function foeLabel(f: TuningFoe): string {
    return `${f.slug}${f.elite ? ' (elite)' : ''}`;
}

function cellText(c: TuningCell): string {
    const s = c.summary;
    const lost = c.playerMaxVitae - s.meanVitaeLeft;
    return `${num(s.meanTurnsWon)} t / ${num(lost)} (${pct(lost / c.playerMaxVitae)})${s.winRate < 1 ? ` win ${(s.winRate * 100).toFixed(1)}%` : ''}`;
}

function table(cells: TuningCell[], policy: PacingPolicy): string[] {
    const cols = TUNING_LANES.flatMap(lane => TUNING_LEVELS.map(level => ({ lane, level })));
    const lines = [
        `| foe | level | nodes | VITAE | ${cols.map(c => `${c.lane} L${c.level}`).join(' | ')} |`,
        `|---|---|---|---|${cols.map(() => '---').join('|')}|`,
    ];
    for (const foe of tuningFoes()) {
        const row = cols.map(col => {
            const c = cells.find(x => x.policy === policy && x.lane === col.lane && x.level === col.level
                && x.foe.slug === foe.slug && x.foe.level === foe.level && x.foe.elite === foe.elite);
            return c ? cellText(c) : '-';
        });
        const vitae = Math.round(foe.enemy.maxHealth * LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER);
        lines.push(`| ${foeLabel(foe)} | L${foe.level} | ${foe.nodes.join(', ')} | ${vitae} | ${row.join(' | ')} |`);
    }
    return lines;
}

function phaseTable(cells: TuningCell[], policy: PacingPolicy): string[] {
    const cols = TUNING_LANES.flatMap(lane => TUNING_LEVELS.map(level => ({ lane, level })));
    const lines = [
        `| foe | level | ${cols.map(c => `${c.lane} L${c.level}`).join(' | ')} |`,
        `|---|---|${cols.map(() => '---').join('|')}|`,
    ];
    for (const foe of tuningFoes()) {
        if (!foe.enemy.phases) continue;
        const row = cols.map(col => {
            const c = cells.find(x => x.policy === policy && x.lane === col.lane && x.level === col.level
                && x.foe.slug === foe.slug && x.foe.level === foe.level && x.foe.elite === foe.elite);
            return c ? c.summary.phaseShares.map(pct).join(' / ') : '-';
        });
        lines.push(`| ${foeLabel(foe)} | L${foe.level} | ${row.join(' | ')} |`);
    }
    return lines;
}

/** The report's markdown. */
export function renderReport(cells: TuningCell[], o: { runs: number; seed: number; commit: string; date: string }): string {
    const lanes = TUNING_LANES.map(l => {
        const k = kittedLane(l);
        return `- ${l}: ${k.cards.length} cards, upgraded once; relics ${k.relics.length ? k.relics.map(r => r.name).join(', ') : 'none'}`;
    });
    const mult = LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER;
    const maxVitae = TUNING_LANES.map(l => `${l} ${TUNING_LEVELS.map(lv => `L${lv} ${cells.find(c => c.lane === l && c.level === lv)?.playerMaxVitae}`).join(', ')}`);
    return [
        '# Chapter 1 enemies: the tuning table',
        '',
        '<!-- Generated by axiomancer-mechanics/src/CLI/chapter1-enemies.cli.ts; do not edit. -->',
        '',
        `> measured at ${o.commit}, ${o.date}, ${o.runs} runs per cell, seed ${o.seed}`,
        '',
        'Every Breakwater foe at its node\'s level (`BW_ENCOUNTER_FOES` and `BW_ELITE_DRAWS`, so a foe added to either',
        'appears on the next run), against the four lane decks kitted at player levels 8 and 10. A measurement, not a',
        'gate (D57), and not a licence to tune (D88). Cite it with its commit.',
        '',
        '## How to read it',
        '',
        'A cell reads `turns to kill / VITAE lost (share of the player\'s max VITAE)`. Turns are the player turns of the',
        'fights the deck won; VITAE lost is the player\'s max minus the mean VITAE left, a lost fight counting as all of',
        'it. A cell appends `win N%` when the deck did not win every fight. Foe VITAE is the live encounter VITAE',
        `(x${mult}) after the tier and level scaling, shown in the VITAE column.`,
        '',
        '- The player is an even stat spread at the level, wearing the lane\'s relics.',
        ...lanes,
        `- Player max VITAE: ${maxVitae.join('; ')}.`,
        '- Each elite pair node (`bw-c1`, `bw-l4`, `bw-w5`) gets one row per foe, since the node draws one of the two 50/50.',
        '- A foe staged at two nodes shares one row, its nodes listed.',
        '',
        '## Limits',
        '',
        `- ${o.runs} seeded fights per cell, seeds ${o.seed} to ${o.seed + o.runs - 1}; rider rolls are seeded by the fight seed, so a rerun reproduces the table.`,
        '- The sim never pays the Toll-Keeper\'s toll: "Pay the toll" is a player board action, not a card, so the Toll-Keeper rows are the cost of refusing it.',
        '- Mercy is off, so every win is a kill. No lane here opens The Open Hand.',
        '- Sim drivers are not players: `human-like` is the headline (one best line, no chaining), `witness` plays the whole hand and reads as a ceiling.',
        '',
        '## Human-like driver',
        '',
        ...table(cells, 'human-like'),
        '',
        '### Share of fights reaching each HP phase (human-like)',
        '',
        'Each cell reads the share that entered phase 1 / phase 2 / ... (a normal has two phases, an elite three).',
        '',
        ...phaseTable(cells, 'human-like'),
        '',
        '## Witness driver',
        '',
        ...table(cells, 'witness'),
        '',
        '### Share of fights reaching each HP phase (witness)',
        '',
        ...phaseTable(cells, 'witness'),
        '',
    ].join('\n');
}

function arg(name: string, fallback: string): string {
    const hit = process.argv.find(a => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
}

function main(): void {
    const runs = Number(arg('runs', '100'));
    const seed = Number(arg('seed', '1'));
    const commit = arg('commit', 'working tree');
    const cells = tuningCells(runs, seed);
    const md = renderReport(cells, { runs, seed, commit, date: new Date().toISOString().slice(0, 10) });
    const out = arg('write', '');
    if (out) fs.writeFileSync(path.resolve(out), md);
    else process.stdout.write(md);
}

if (require.main === module) main();
