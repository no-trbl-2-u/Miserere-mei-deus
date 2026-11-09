/**
 * The sim's wrap of the relic library (tuning flag `--no-relic-stats`).
 *
 * `sim-run.setup.ts` (and a test that wants the same wrap) mocks the module
 * `Items/relic.library` with {@link wrapRelicLibrary}: `relicStatLines` reads
 * the ids in {@link noStatRelics} and answers no lines for a worn piece with
 * one of them. The library's entries are never edited, and with the set empty
 * the wrap answers exactly what the module does.
 */

import type { Equipment } from '@mechanics';
import type { StatModifier } from '@mechanics/Effects/types';

/** The relic ids whose stat lines read as none while a run plays. */
const noStat = new Set<string>();

/** Make the given relics add no stat lines (replaces the set). */
export function setNoStatRelics(ids: readonly string[]): void {
    noStat.clear();
    for (const id of ids) noStat.add(id);
}

/** The relic ids that currently read as having no stat lines. */
export function noStatRelics(): readonly string[] {
    return [...noStat];
}

interface RelicLibraryModule {
    relicStatLines(piece: Equipment): readonly StatModifier[];
}

/**
 * The relic library module with `relicStatLines` answering no lines for the
 * ids in {@link noStatRelics}. Pass the real module (`jest.requireActual`).
 */
export function wrapRelicLibrary<M extends RelicLibraryModule>(actual: M): M {
    return {
        ...actual,
        relicStatLines: (piece: Equipment): readonly StatModifier[] =>
            (noStat.has(piece.id) ? [] : actual.relicStatLines(piece)),
    };
}
