/**
 * Character select presenter: the view model of the `/character-select`
 * screen, built from the character roster.
 *
 * The carousel is two rows of four squares. Roster characters fill the
 * squares first; the rest are locked. The selected character's view model
 * carries what the screen shows: portrait key, starting relic, the three
 * stats and the one-line playstyle. It carries no lane, lane colour or card:
 * the screen never names a lane (CH1 A4).
 *
 * Pure: the roster and the relic library are arguments, so tests pass
 * fixtures.
 */

import {
    CHARACTER_ROSTER,
    relicLibrary,
    type CharacterDefinition,
    type Equipment,
} from '@mechanics';

/** Squares per carousel row. */
export const CAROUSEL_COLUMNS = 4;
/** Carousel rows; a roster past eight characters adds rows. */
export const CAROUSEL_MIN_ROWS = 2;

/** The screen's fixed words. */
export const CHARACTER_SELECT_COPY = Object.freeze({
    eyebrow: 'NEW GAME',
    title: 'WHO WALKS',
    confirm: 'CONFIRM',
    back: 'Back',
    locked: 'Locked',
    lockedHeadline: 'No one answers yet',
    lockedLine: 'Every square is locked.',
    relicLabel: 'RELIC',
    relicNone: 'No relic',
});

/** The roster the screen reads; a seam tests replace. */
export function selectRoster(): readonly CharacterDefinition[] {
    return CHARACTER_ROSTER;
}

export interface CharacterSquareVM {
    readonly kind: 'character' | 'locked';
    /** Stable key: the character id, or `locked-<n>`. */
    readonly key: string;
    /** Character squares only. */
    readonly characterId?: string;
    readonly name?: string;
    readonly portraitKey?: string;
    readonly selected: boolean;
    /** Screen-reader label: the name, or "Locked". */
    readonly label: string;
}

export interface CharacterStatVM {
    readonly key: 'heart' | 'body' | 'mind';
    readonly label: 'HEART' | 'BODY' | 'MIND';
    readonly value: number;
}

export interface SelectedCharacterVM {
    readonly id: string;
    readonly name: string;
    readonly portraitKey: string;
    readonly relicId: string;
    readonly relicName: string;
    readonly stats: readonly CharacterStatVM[];
    readonly playstyle: string;
}

export interface CharacterSelectVM {
    /** The carousel, row by row. */
    readonly rows: readonly (readonly CharacterSquareVM[])[];
    /** The shown character; `null` when the roster is empty (all locked). */
    readonly selected: SelectedCharacterVM | null;
}

/** The roster character shown when nothing is picked yet or the pick is gone. */
export function resolveSelectedId(
    roster: readonly CharacterDefinition[],
    pickedId: string | null | undefined,
): string | null {
    if (pickedId != null && roster.some(c => c.id === pickedId)) return pickedId;
    return roster[0]?.id ?? null;
}

function selectedVM(def: CharacterDefinition, relics: readonly Equipment[]): SelectedCharacterVM {
    const relic = relics.find(r => r.id === def.startingRelicId);
    const { heart, body, mind } = def.baseStats;
    return {
        id: def.id,
        name: def.name,
        portraitKey: def.portraitKey,
        relicId: def.startingRelicId,
        relicName: relic?.name ?? CHARACTER_SELECT_COPY.relicNone,
        stats: [
            { key: 'heart', label: 'HEART', value: heart },
            { key: 'body', label: 'BODY', value: body },
            { key: 'mind', label: 'MIND', value: mind },
        ],
        playstyle: def.playstyle,
    };
}

/**
 * Builds the screen's view model.
 *
 * @param roster     - The characters; empty gives the all-locked screen.
 * @param pickedId   - The tapped character; unknown or absent shows the first.
 * @param forceLocked - The `/dev` all-locked state: ignore the roster.
 * @param relics     - The relic lookup; defaults to the live library.
 */
export function buildCharacterSelectVM(
    roster: readonly CharacterDefinition[],
    pickedId?: string | null,
    forceLocked = false,
    relics: readonly Equipment[] = relicLibrary,
): CharacterSelectVM {
    const shown = forceLocked ? [] : roster;
    const selectedId = resolveSelectedId(shown, pickedId);
    const rowCount = Math.max(CAROUSEL_MIN_ROWS, Math.ceil(shown.length / CAROUSEL_COLUMNS));
    const total = rowCount * CAROUSEL_COLUMNS;
    const squares: CharacterSquareVM[] = [];
    for (let i = 0; i < total; i++) {
        const def = shown[i];
        squares.push(def
            ? {
                kind: 'character',
                key: def.id,
                characterId: def.id,
                name: def.name,
                portraitKey: def.portraitKey,
                selected: def.id === selectedId,
                label: def.name,
            }
            : { kind: 'locked', key: `locked-${i}`, selected: false, label: CHARACTER_SELECT_COPY.locked });
    }
    const rows: CharacterSquareVM[][] = [];
    for (let r = 0; r < rowCount; r++) rows.push(squares.slice(r * CAROUSEL_COLUMNS, (r + 1) * CAROUSEL_COLUMNS));
    const def = selectedId === null ? undefined : shown.find(c => c.id === selectedId);
    return { rows, selected: def ? selectedVM(def, relics) : null };
}
