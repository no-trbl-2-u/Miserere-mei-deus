/**
 * Dev-only STATE INSPECTOR selector.
 *
 * Pure function `selectInspectorSections(state)` that folds the whole
 * `AppStoreState` (engine `GameState` + the mobile slices) into a small,
 * stable list of labelled sections of key/value rows. The `/dev` route
 * renders it verbatim so a tester can see "any aspect of the game" at a
 * glance — progression, economy, deck, world position, late-game
 * labyrinth ledger, story flags, and which transient session is open —
 * without opening every tab.
 *
 * No React, no store writes: input state → output rows. Every row is a
 * string so the component never has to format.
 */

import type { GameState, LabyrinthProgress } from '@mechanics';
import { hazardDeckBag } from '@mechanics';

import type { AppStoreState } from '@/state/store';

/** One `key: value` line in the inspector. */
export interface InspectorRow {
    readonly k: string;
    readonly v: string;
}

/** A titled group of rows. */
export interface InspectorSection {
    readonly title: string;
    readonly rows: readonly InspectorRow[];
}

/** Render a number or fall back to `—` when the field is absent. */
const num = (n: number | undefined | null): string => (typeof n === 'number' ? String(n) : '—');

/** Render a string list compactly: `n · a, b, c` (capped to keep rows short). */
const list = (xs: readonly string[] | undefined, cap = 8): string => {
    if (!xs || xs.length === 0) return '0';
    const head = xs.slice(0, cap).join(', ');
    return xs.length > cap ? `${xs.length} · ${head}, …` : `${xs.length} · ${head}`;
};

/** Summarise the persistent labyrinth ledger (the late game). */
const labyrinthRows = (p: LabyrinthProgress | undefined): readonly InspectorRow[] => {
    if (!p) return [{ k: 'progress', v: 'never entered' }];
    return [
        { k: 'act', v: p.currentAct },
        { k: 'acts done', v: list(p.actsCompleted) },
        { k: 'completed', v: p.completed ? 'yes (Unfounded Door walked)' : 'no' },
        { k: 'pocket', v: list(p.pocket.map((f) => f.word)) },
        { k: 'gates open', v: list(p.openGates) },
        { k: 'debt', v: `${num(p.assertionDebt)} owed · ${num(p.settledDebt)} settled · ${p.hintPurchases.length} hints` },
        { k: 'waystones', v: list(p.waystones) },
        {
            k: 'bosses',
            v: Object.entries(p.bossOutcomes).map(([act, o]) => `${act}:${o}`).join(', ') || 'none',
        },
    ];
};

/**
 * Fold the store into inspector sections. Safe on a partially-hydrated
 * store (every read is optional-chained) so the panel never throws.
 */
export function selectInspectorSections(state: AppStoreState): readonly InspectorSection[] {
    const g = state as unknown as GameState;
    const p = g.player;
    const w = g.world;
    const map = w?.currentMap;
    const flags = g.flags ?? [];
    const equipped = p?.equipment;
    const openSession =
        state.hazard?.session ? 'hazard'
        : state.rest?.session ? 'rest'
        : state.cache?.session ? 'cache'
        : state.blacksmith?.session ? 'blacksmith'
        : state.labyrinthUi?.session ? `labyrinth (${state.labyrinthUi.session.actId})`
        : state.event?.pending ? `event:${state.event.pending.event.kind}`
        : g.currentEncounter ? 'combat'
        : 'none';

    return [
        {
            title: 'RUN',
            rows: [
                { k: 'run id', v: g.runId ?? '—' },
                { k: 'save version', v: num(g.version) },
                { k: 'rng state', v: num(g.rngState) },
                { k: 'open session', v: openSession },
            ],
        },
        {
            title: 'PLAYER',
            rows: [
                { k: 'name', v: p?.name ?? '—' },
                { k: 'level', v: `${num(p?.level)} · ${num(p?.experience)}/${num(p?.experienceToNextLevel)} xp · ${num(p?.availableStatPoints)} pts` },
                { k: 'vitae', v: `${num(p?.health)}/${num(p?.maxHealth)}` },
                { k: 'stats', v: p ? `heart ${p.baseStats.heart} · body ${p.baseStats.body} · mind ${p.baseStats.mind}` : '—' },
                { k: 'shillings', v: num(p?.currency) },
                { k: 'souls', v: num(p?.bankedSouls) },
                { k: 'effects', v: list((p?.effects ?? []).map((e) => `${e.effectId}×${e.remainingDuration}`)) },
            ],
        },
        {
            title: 'DECK & GEAR',
            rows: [
                { k: 'known cards', v: list(p?.knownCards) },
                { k: 'reward cards', v: list(p?.combatRewardCards) },
                { k: 'removals', v: num(p?.cardRemovals) },
                { k: 'hazard deck', v: list(hazardDeckBag(flags)) },
                { k: 'floating dice', v: list(p?.floatingDice) },
                { k: 'die gear', v: p?.dieGear ? Object.keys(p.dieGear).join(', ') : 'none' },
                { k: 'bonus dice', v: num(p?.bonusTurnDice) },
                {
                    k: 'worn relics',
                    v: equipped
                        ? [equipped.weapon?.id, equipped.armor?.id, ...(equipped.relics ?? []).map((a) => a?.id)]
                              .filter(Boolean)
                              .join(', ') || 'none'
                        : '—',
                },
                { k: 'inventory', v: list((p?.inventory ?? []).map((i) => i.id), 6) },
            ],
        },
        {
            title: 'WORLD',
            rows: [
                { k: 'continent', v: w?.currentContinent?.name ?? '—' },
                { k: 'map', v: map?.name ?? '—' },
                { k: 'node', v: map?.currentNode ?? '—' },
                { k: 'nodes', v: map ? `${map.completedNodes.length} done · ${map.availableNodes.length} open · ${map.lockedNodes.length} locked · ${map.consumedNodes.length} consumed` : '—' },
                { k: 'maps done', v: list(w?.currentContinent?.completedMaps) },
                { k: 'maps open', v: list(w?.currentContinent?.availableMaps) },
                { k: 'maps locked', v: list(w?.currentContinent?.lockedMaps) },
            ],
        },
        {
            title: 'STORY',
            rows: [
                { k: 'quests active', v: list((g.quests?.active ?? []).map((q) => q.name)) },
                { k: 'quests done', v: list(g.quests?.completed) },
                { k: 'quests avail', v: list((g.quests?.available ?? []).map((q) => q.name)) },
                { k: 'journal', v: list(g.codex?.unlockedEntries) },
                { k: 'flags', v: list(flags, 12) },
            ],
        },
        {
            title: 'THE APORIA',
            rows: labyrinthRows(g.labyrinth),
        },
    ];
}
