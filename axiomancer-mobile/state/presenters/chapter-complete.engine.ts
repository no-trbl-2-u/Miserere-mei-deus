/**
 * The chapter summary (phase CE1a, acceptance A1): the run's stats as the
 * state stands on the far bank. Pure: no store, no rolls, no rule decisions.
 *
 * Every stat is read from the state. A stat the state cannot give is left out
 * of the list, never estimated. The state keeps no count of deaths and none of
 * foes spared (the defeat ledger holds slugs, spared or finished alike), so
 * neither has a row.
 *
 * "Fights won" is the defeat ledger's length: each foe beaten once, by slug.
 * It is absent for a save with no ledger.
 *
 * "Relics acquired" counts the chapter's relics the player owns (carried or
 * worn, each once) out of every relic the chapter grants (`chapter1Content`'s
 * items: caches, elite drops, quest rewards). A relic from outside the chapter
 * does not count (T, 2026-11-22).
 */

import { BREAKWATER_CHAPTER_QUESTLINE, buildCombatDeck, chapter1Content, defeatedEnemies, questStepState, relicLibrary } from '@mechanics';
import type { GameState } from '@mechanics';
import { countResolvedNodes } from '@/state/run-log';
import { CHAPTER_COMPLETE_STAT_LABELS, chapterStatOf, type ChapterStatId } from './chapter-complete.copy';

/** The slice of the game state the summary reads. */
export type ChapterCompleteState = Pick<GameState, 'player' | 'world' | 'codex' | 'quests' | 'flags'>;

export interface ChapterStatRow {
    id: ChapterStatId;
    label: string;
    /** The figure as shown: `4`, or `120 / 170` for a count out of a total. */
    value: string;
    /** The count itself. */
    count: number;
    /** The total it is out of, for the rows that have one. */
    of?: number;
}

function row(id: ChapterStatId, count: number, of?: number): ChapterStatRow {
    return {
        id,
        label: CHAPTER_COMPLETE_STAT_LABELS[id],
        value: of === undefined ? String(count) : chapterStatOf(count, of),
        count,
        ...(of === undefined ? {} : { of }),
    };
}

let chapterRelics: ReadonlySet<string> | null = null;

/** Every relic id Chapter 1 grants, read once from the chapter content. */
export function chapterRelicIds(): ReadonlySet<string> {
    if (chapterRelics === null) {
        const relicIds = new Set(relicLibrary.map((r) => r.id));
        chapterRelics = new Set(chapter1Content().items.map((i) => i.id).filter((id) => relicIds.has(id)));
    }
    return chapterRelics;
}

/** The chapter's relics the player owns, carried or worn, each counted once. */
function acquiredChapterRelics(player: NonNullable<ChapterCompleteState['player']>, chapter: ReadonlySet<string>): number {
    const owned = new Set<string>();
    for (const item of player.inventory ?? []) if (chapter.has(item.id)) owned.add(item.id);
    for (const r of player.equipment.relics) if (r && chapter.has(r.id)) owned.add(r.id);
    return owned.size;
}

/** The chapter's stats in screen order; empty for a state with no player. */
export function selectChapterCompleteSummary(state: Partial<ChapterCompleteState>): ChapterStatRow[] {
    const player = state.player;
    if (!player) return [];
    const rows: ChapterStatRow[] = [];
    rows.push(row('level', player.level));
    rows.push(row('vitae', player.health, player.maxHealth));
    if (state.world) rows.push(row('nodes', countResolvedNodes(state.world)));
    if (state.codex?.defeatedEnemies !== undefined) rows.push(row('fights', defeatedEnemies({ codex: state.codex }).length));
    if (state.quests) {
        const steps = BREAKWATER_CHAPTER_QUESTLINE.steps;
        const done = steps.filter((s) => questStepState(state.quests!, s) === 'completed').length;
        rows.push(row('quests', done, steps.length));
    }
    rows.push(row('shillings', player.currency));
    rows.push(row('deck', buildCombatDeck(player).length));
    const chapter = chapterRelicIds();
    rows.push(row('relics', acquiredChapterRelics(player, chapter), chapter.size));
    return rows;
}
