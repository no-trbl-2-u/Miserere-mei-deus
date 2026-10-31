/**
 * Presenter — the MAIN MENU (the first screen after the title) and the SAVE
 * SLOTS screen it opens.
 *
 * Pure functions from slot summaries to view-models, plus every line of
 * player-facing copy those screens print (copy lives here, not in the
 * components — package rule). Voice: lowercase ritual for hints and body,
 * ALL CAPS for the verbs, as the rest of the chrome does.
 *
 * Functions (lowest → highest abstraction):
 *   slotNumeral(id)                       1 → 'I', 2 → 'II', 3 → 'III'
 *   slotRowVM(summary, mode, now)          one slot row for the slot screen
 *   selectSaveSlotRows(summaries, mode, now)  all three rows
 *   selectMainMenuViewModel(summaries, now)   the four menu buttons
 */

import {
    describeSavedAt,
    formatMapName,
    isPreCharacterSave,
    mostRecentSlot,
    type SaveSlotId,
    type SaveSlotSummary,
} from '../persistence/saveSlots';

/** What the slot screen was opened for. */
export type SaveSlotsMode = 'new' | 'load';

export const MAIN_MENU_COPY = Object.freeze({
    eyebrow: 'THE CHRONICLE',
    title: 'miserere mei, deus',
    continue: 'CONTINUE',
    continueHint: 'resume where the page was left',
    newGame: 'NEW GAME',
    newGameHint: 'begin at the very start — nothing in hand',
    loadGame: 'LOAD GAME',
    loadGameHint: 'three chronicles to keep',
    loadGameEmptyHint: 'no chronicle written yet',
    settings: 'SETTINGS',
    settingsHint: 'theme · motion · text · sound',
});

export const SAVE_SLOTS_COPY = Object.freeze({
    eyebrow: 'THE CHRONICLES',
    titleNew: 'NEW GAME',
    titleLoad: 'LOAD GAME',
    subtitleNew: 'choose a page to write on',
    subtitleLoad: 'choose a page to resume',
    empty: 'an empty page',
    unreadable: 'the page was torn — it cannot be read',
    // A save with no character (made before characters): readable, never continued.
    preCharacter: 'Made before characters',
    startAction: 'BEGIN',
    overwriteAction: 'OVERWRITE',
    // The LOAD screen's verbs: JOURNEY ON… (resume) and DELETE SAVE (clear).
    loadAction: 'JOURNEY ON…',
    clearAction: 'DELETE SAVE',
    back: 'BACK',
    overwriteTitle: 'overwrite this chronicle?',
    overwriteBody: 'the page will be wiped and a new pilgrimage begun in its place. this cannot be undone.',
    overwriteConfirm: 'WIPE AND BEGIN',
    clearTitle: 'delete this save?',
    clearBody: 'the page will be wiped. this cannot be undone.',
    clearConfirm: 'DELETE',
    cancel: 'KEEP IT',
});

const NUMERALS: Record<SaveSlotId, string> = { 1: 'I', 2: 'II', 3: 'III' };

/** The roman numeral a slot row is headed by. */
export function slotNumeral(id: SaveSlotId): string {
    return NUMERALS[id];
}

/** What tapping a slot row's primary button does. */
export type SlotRowAction = 'start' | 'overwrite' | 'load' | 'none';

export interface SaveSlotRowVM {
    readonly id: SaveSlotId;
    readonly numeral: string;
    readonly status: SaveSlotSummary['status'];
    /** `Level 3 · Northern Forest` for a save; the empty / torn line otherwise. */
    readonly detail: string;
    /** `saved 3 h ago`; empty for empty / torn slots. */
    readonly stamp: string;
    /** The primary button's verb, or `none` when the row has no primary action. */
    readonly action: SlotRowAction;
    readonly actionLabel: string;
    /** Whether the row also offers DELETE SAVE (any non-empty slot). */
    readonly clearable: boolean;
    /** True when this is the slot CONTINUE would pick. */
    readonly mostRecent: boolean;
}

/** One slot row. Pure over `now`. */
export function slotRowVM(
    summary: SaveSlotSummary,
    mode: SaveSlotsMode,
    now: number,
    mostRecent: SaveSlotId | null,
): SaveSlotRowVM {
    if (isPreCharacterSave(summary)) {
        return {
            id: summary.id,
            numeral: slotNumeral(summary.id),
            status: summary.status,
            mostRecent: false,
            detail: SAVE_SLOTS_COPY.preCharacter,
            stamp: `saved ${describeSavedAt(summary.savedAt, now)}`,
            action: 'none',
            actionLabel: '',
            clearable: true,
        };
    }
    const base = {
        id: summary.id,
        numeral: slotNumeral(summary.id),
        status: summary.status,
        mostRecent: mostRecent === summary.id,
    };
    if (summary.status === 'unreadable') {
        return {
            ...base,
            detail: SAVE_SLOTS_COPY.unreadable,
            stamp: '',
            action: 'none',
            actionLabel: '',
            clearable: true,
        };
    }
    if (summary.status === 'empty') {
        return {
            ...base,
            detail: SAVE_SLOTS_COPY.empty,
            stamp: '',
            action: mode === 'new' ? 'start' : 'none',
            actionLabel: mode === 'new' ? SAVE_SLOTS_COPY.startAction : '',
            clearable: false,
        };
    }
    return {
        ...base,
        detail: `Level ${summary.level ?? 1} · ${formatMapName(summary.mapName)}`,
        stamp: `saved ${describeSavedAt(summary.savedAt, now)}`,
        action: mode === 'new' ? 'overwrite' : 'load',
        actionLabel: mode === 'new' ? SAVE_SLOTS_COPY.overwriteAction : SAVE_SLOTS_COPY.loadAction,
        clearable: true,
    };
}

/** All three rows, in slot order. */
export function selectSaveSlotRows(
    summaries: readonly SaveSlotSummary[],
    mode: SaveSlotsMode,
    now: number,
): readonly SaveSlotRowVM[] {
    const recent = mostRecentSlot(summaries);
    return summaries.map((s) => slotRowVM(s, mode, now, recent));
}

export interface MainMenuViewModel {
    /** CONTINUE is shown only when a slot is saved. */
    readonly continue: { readonly enabled: boolean; readonly slot: SaveSlotId | null; readonly hint: string };
    readonly newGame: { readonly hint: string };
    readonly loadGame: { readonly enabled: boolean; readonly hint: string };
    readonly settings: { readonly hint: string };
}

/**
 * The four menu buttons from the slot summaries. Pure over `now` (the
 * CONTINUE hint names how long ago that slot was written).
 */
export function selectMainMenuViewModel(
    summaries: readonly SaveSlotSummary[],
    now: number,
): MainMenuViewModel {
    const recent = mostRecentSlot(summaries);
    const recentSummary = recent === null ? null : summaries.find((s) => s.id === recent) ?? null;
    const anySaved = summaries.some((s) => s.status === 'saved' && !isPreCharacterSave(s));
    return {
        continue: {
            enabled: recent !== null,
            slot: recent,
            hint: recentSummary === null
                ? MAIN_MENU_COPY.continueHint
                : `chronicle ${slotNumeral(recentSummary.id)} · Level ${recentSummary.level ?? 1} · ${formatMapName(recentSummary.mapName)} · ${describeSavedAt(recentSummary.savedAt, now)}`,
        },
        newGame: { hint: MAIN_MENU_COPY.newGameHint },
        loadGame: {
            enabled: anySaved,
            hint: anySaved ? MAIN_MENU_COPY.loadGameHint : MAIN_MENU_COPY.loadGameEmptyHint,
        },
        settings: { hint: MAIN_MENU_COPY.settingsHint },
    };
}
