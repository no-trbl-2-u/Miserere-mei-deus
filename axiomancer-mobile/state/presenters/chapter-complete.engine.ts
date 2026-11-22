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
 */

import { BREAKWATER_CHAPTER_QUESTLINE, buildCombatDeck, defeatedEnemies, questStepState } from '@mechanics';
import type { GameState } from '@mechanics';
import { countResolvedNodes } from '@/state/run-log';
import { wornInSlot } from './loadout';
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
    rows.push(row('deck', buildCombatDeck(player, state.flags).length));
    rows.push(row('relics', wornInSlot(player.equipment, 'relic').length));
    return rows;
}
