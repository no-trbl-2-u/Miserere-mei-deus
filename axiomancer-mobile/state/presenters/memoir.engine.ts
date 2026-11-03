/**
 * MEMOIR presenter.
 *
 * Pure mapper from `GameStore` to the journal surface's view-model.
 * Every section — chronicle, quests, remains — reads live engine
 * state. See the JSDoc on
 * `selectMemoirViewModel` for the per-section read map.
 *
 * The screen consumes this VM via the slim-slice + `useMemo` pattern.
 * Calling `useGameState(selectMemoirViewModel)`
 * directly would churn `useSyncExternalStore` because the VM is a
 * frozen-new object every call.
 */

import type {
    DialogueTree,
    GameStore,
    Quest,
    QuestLog,
    QuestObjective,
    TypedGameEvent,
} from '@mechanics';
import {
    isCombatEndedEvent,
    isDialogueAppliedEvent,
    isLevelUpEvent,
    isWorldMovedEvent,
} from '@mechanics';
import { hazardDeathCount } from '../hazard/store-actions';
import { REST_KEEPSAKE_FLAG_PREFIX } from '../rest/store-actions';
import { CACHE_KEEPSAKE_FLAG_PREFIX } from '../cache/store-actions';
import { questTitle } from './engine-id-copy';

/**
 * Honest signature for `selectMemoirViewModel`: takes engine
 * `GameStore` (the canonical game state) and optionally the
 * mobile-private `_recentEvents` ring buffer from
 * `AppStoreState`. The optional `_recentEvents`
 * field keeps the presenter usable from hermetic test fixtures
 * that build a `GameStore` via `createGameStore` (no mobile
 * slices) — they pass undefined and chronicle stays empty.
 */
type MemoirStateInput = GameStore & {
    readonly _recentEvents?: readonly TypedGameEvent[];
};
import { freezeViewModel } from './freeze';

/** Visible chronicle entry cap. The screen scrolls if more exist. */
const CHRONICLE_VISIBLE_CAP = 12;

/**
 * One typed-event-derived chronicle row, built from the mobile
 * `_recentEvents` ring buffer by `buildChronicle`.
 */
export interface ChronicleEntry {
    /** Stable id for keying — composed from event type + ordinal. */
    id: string;
    /** One of the engine event types the chronicle mapper recognizes. */
    kind: 'combat:ended' | 'character:levelup' | 'world:moved' | 'dialogue:applied';
    /** Short ALL-CAPS label rendered as the lead of the row. */
    label: string;
    /** Body line in the gothic body register, rendered beneath the label. */
    body: string;
}

/**
 * Bullet glyphs for the objective rows. Pinned at module scope so the
 * view layer carries no display literals per Hard Rule #8. Same pattern
 * as `EVENT_CHROME` / `ENCOUNTER_LABEL` in the event presenter.
 */
export const QUEST_OBJECTIVE_BULLET = Object.freeze({
    done: '✓',
    pending: '○',
}) as { readonly done: '✓'; readonly pending: '○' };

/**
 * One quest row, built from `state.quests`.
 */
export interface MemoirQuestRow {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'completed' | 'failed';
    objectives: ReadonlyArray<{
        id: string;
        text: string;
        done: boolean;
        /** Display glyph for the row prefix — pinned per `QUEST_OBJECTIVE_BULLET`. */
        bullet: '✓' | '○';
    }>;
}

/**
 * REMAINS section — read-back of durable records: out-of-combat death
 * tombstones (`hazardDeathCount`) and Rest/LootCache keepsake labels
 * (banked as flags). See `extractKeepsakes` / `buildDeathLine` below.
 *
 * Also reads `player.bankedSouls`, the Harvest theme's persistent Soul
 * jar (unspent `souls` write back here at combat end — see
 * `CombatEncounterPanel.applyHazardOutcome`), with a milestone epithet
 * once the bank crosses a recognition tier. See `buildSoulsLine` below.
 */
export interface MemoirRemainsViewModel {
    /** Raw tally from `hazardDeathCount(state.flags)`. */
    deathCount: number;
    /** Narrative line — singular/plural/zero handled here so the
     *  screen carries no literal (Hard Rule #8). */
    deathLine: string;
    /** Distinct keepsake labels (Rest `night-keepsake:` + LootCache
     *  `cache-keepsake:`), reverse-chronological — most recently
     *  banked first, matching the chronicle section's ordering. */
    keepsakes: readonly string[];
    /** Raw tally from `player.bankedSouls`. */
    bankedSouls: number;
    /** Narrative line — singular/plural/zero handled here, same
     *  convention as `deathLine`; gains a milestone epithet past a
     *  recognition tier. */
    soulsLine: string;
}

export interface MemoirViewModel {
    /** Header eyebrow + sub-line. */
    headerEyebrow: string;
    headerSubline: string;
    /** Section eyebrows — pinned on the VM so the screen carries no literals. */
    chronicleEyebrow: string;
    questsEyebrow: string;
    questsActiveEyebrow: string;
    questsCompletedEyebrow: string;
    questsForgottenEyebrow: string;
    /** REMAINS section eyebrows. */
    remainsEyebrow: string;
    remainsKeepsakesEyebrow: string;
    /** Chronicle section, built from `_recentEvents`. */
    chronicle: ReadonlyArray<ChronicleEntry>;
    /** Quest sections, built from `state.quests`. */
    quests: {
        active: ReadonlyArray<MemoirQuestRow>;
        completed: ReadonlyArray<MemoirQuestRow>;
        forgotten: ReadonlyArray<MemoirQuestRow>;
    };
    /** REMAINS section — death tally, keepsakes and Soul jar. */
    remains: MemoirRemainsViewModel;
    /** Empty-state copy lines. */
    emptyChronicle: string;
    emptyQuests: string;
    /** Shown when `remains.keepsakes` is empty. */
    emptyKeepsakes: string;
}

/**
 * Chronicle mapper. Reads `state._recentEvents` (ring buffer, capacity
 * 20), which the store keeps newest-first (`state/store.ts` prepends
 * each event). Walks it oldest-first so the continent tracking below
 * runs forward in time, then emits the newest
 * `CHRONICLE_VISIBLE_CAP` entries, newest first.
 *
 * - `combat:ended` → "FELLED" for 'victory', "SPARED" for a 'victory' spared at
 *   the mercy check, "ROUTED BY" for 'defeat', "FLED" for 'flee'.
 *   Enemy name is lost from the event payload after END_COMBAT (the
 *   reducer clears `state.combat`), so the body line carries the
 *   outcome flavour + xp grant rather than naming the foe.
 * - `character:levelup` → "ROSE TO <level>" with the new level read
 *   off `event.payload.state.player.level`.
 * - `world:moved` → "CROSSED INTO <continent>" only when the moved-to
 *   continent differs from the most-recently-seen continent (cross-
 *   event tracking inside the pure mapper — the input array is the
 *   source of truth, no external state needed).
 * - `dialogue:applied` → "SPOKE WITH <npc>" when the tree carries an
 *   identifiable NPC name; defensively skipped when not extractable.
 * - Every other event type (inventory:changed etc.) → skipped as too
 *   noisy for a chronicle.
 */
function buildChronicle(rawEvents: unknown): ReadonlyArray<ChronicleEntry> {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
        return Object.freeze([]) as readonly ChronicleEntry[];
    }
    // The buffer is newest-first; walk a reversed copy (oldest-first).
    const events = [...(rawEvents as ReadonlyArray<TypedGameEvent>)].reverse();
    const entries: ChronicleEntry[] = [];
    let lastSeenContinent: string | null = null;
    let ordinal = 0;
    for (const e of events) {
        ordinal += 1;
        if (isCombatEndedEvent(e)) {
            // Engine `EnginePayload.report?: CombatEndReport` with
            // `{outcome: 'victory'|'defeat'|'flee', spared?: boolean,
            // xpGained: number, loot: Item[]}`.
            const report = e.payload.report;
            const outcome = report?.outcome;
            if (!outcome) continue;
            const xp: number = typeof report?.xpGained === 'number' ? report.xpGained : 0;
            const spared = outcome === 'victory' && report?.spared === true;
            const label = spared
                ? 'SPARED'
                : outcome === 'victory'
                  ? 'FELLED'
                  : outcome === 'defeat'
                    ? 'ROUTED BY'
                    : 'FLED';
            const body = spared
                ? 'mercy, and it was owed.'
                : outcome === 'victory'
                  ? xp > 0
                      ? `a foe falls. +${xp} xp.`
                      : 'a foe falls.'
                  : outcome === 'defeat'
                    ? 'the path turns dark.'
                    : 'the path bends away.';
            entries.push(
                Object.freeze({
                    id: `combat-${ordinal}`,
                    kind: 'combat:ended' as const,
                    label,
                    body,
                }),
            );
            continue;
        }
        if (isLevelUpEvent(e)) {
            // Engine `EnginePayload.state: GameState`;
            // `Character.level: number` — typed directly.
            const level = e.payload.state?.player?.level;
            if (typeof level !== 'number') continue;
            entries.push(
                Object.freeze({
                    id: `levelup-${ordinal}`,
                    kind: 'character:levelup' as const,
                    label: `ROSE TO ${level}`,
                    body: 'a measure deepens.',
                }),
            );
            continue;
        }
        if (isWorldMovedEvent(e)) {
            // Engine `WorldState.currentContinent: Continent` (an
            // object with `.name`), NOT a string. Optional chaining
            // on each step; a missing name skips the event.
            const world = e.payload.state?.world;
            const continent: string | undefined =
                typeof world?.currentContinent?.name === 'string'
                    ? world.currentContinent.name
                    : undefined;
            if (!continent) continue;
            if (lastSeenContinent !== null && continent === lastSeenContinent) continue;
            lastSeenContinent = continent;
            entries.push(
                Object.freeze({
                    id: `world-${ordinal}`,
                    kind: 'world:moved' as const,
                    label: `CROSSED INTO ${continent.toUpperCase()}`,
                    body: 'new ground underfoot.',
                }),
            );
            continue;
        }
        if (isDialogueAppliedEvent(e)) {
            // Engine `EnginePayload.action: GameAction` is a
            // discriminated union; narrow to APPLY_DIALOGUE to
            // access the tree payload. DialogueTree itself has no
            // `npcName` field — that's a mobile-side convention
            // (some fixtures inject one). Cast only at the deepest
            // boundary so the rest of the chain stays typed.
            if (e.payload.action.type !== 'APPLY_DIALOGUE') continue;
            const tree = e.payload.action.payload.tree as DialogueTree & {
                npcName?: string;
                name?: string;
            };
            const npcName: string | undefined =
                typeof tree.npcName === 'string' && tree.npcName.length > 0
                    ? tree.npcName
                    : typeof tree.name === 'string' && tree.name.length > 0
                      ? tree.name
                      : undefined;
            if (!npcName) continue;
            entries.push(
                Object.freeze({
                    id: `dialogue-${ordinal}`,
                    kind: 'dialogue:applied' as const,
                    label: `SPOKE WITH ${npcName.toUpperCase()}`,
                    body: 'words exchanged.',
                }),
            );
            continue;
        }
        // every other event type → skip (inventory:changed, combat:round, …)
    }
    // Reverse-chronological + cap at the visible cutoff.
    const reversed = entries.reverse();
    const capped = reversed.slice(0, CHRONICLE_VISIBLE_CAP);
    return Object.freeze(capped) as readonly ChronicleEntry[];
}

const DEFAULT_REMAINS: MemoirRemainsViewModel = Object.freeze({
    deathCount: 0,
    deathLine: 'you have not yet fallen.',
    keepsakes: Object.freeze([]) as readonly string[],
    bankedSouls: 0,
    soulsLine: 'the jar is empty.',
}) as MemoirRemainsViewModel;

const FALLBACK_VM: MemoirViewModel = Object.freeze({
    headerEyebrow: '✠ THE BOOK OF DEEDS',
    headerSubline: 'gathering pages…',
    chronicleEyebrow: '✠ A CHRONICLE',
    questsEyebrow: '✠ ERRANDS',
    questsActiveEyebrow: '✠ AT HAND',
    questsCompletedEyebrow: '✠ COMPLETED',
    questsForgottenEyebrow: '✠ FORGOTTEN',
    remainsEyebrow: '✠ REMAINS',
    remainsKeepsakesEyebrow: '✠ KEEPSAKES',
    chronicle: Object.freeze([]) as ReadonlyArray<ChronicleEntry>,
    quests: Object.freeze({
        active: Object.freeze([]) as ReadonlyArray<MemoirQuestRow>,
        completed: Object.freeze([]) as ReadonlyArray<MemoirQuestRow>,
        forgotten: Object.freeze([]) as ReadonlyArray<MemoirQuestRow>,
    }) as MemoirViewModel['quests'],
    remains: DEFAULT_REMAINS,
    emptyChronicle: 'the page is bare.',
    emptyQuests: 'no errands written here.',
    emptyKeepsakes: 'nothing kept.',
}) as MemoirViewModel;

/**
 * Mobile-extended `QuestObjective` shape: engine `description` is the
 * canonical field; test fixtures sometimes inject `text` or `label`
 * for free-form objective copy.
 */
type MemoirObjectiveInput = Partial<QuestObjective> & {
    readonly text?: unknown;
    readonly label?: unknown;
};

/**
 * Synthesize a one-line text for a quest objective. Reads `text`, then
 * `label`, then `description`, whichever is a non-empty string; falls
 * back to a synthetic `<type>: <target>` line so the screen always has
 * SOMETHING to render. No progress fraction is appended.
 */
function synthesizeObjectiveText(objective: MemoirObjectiveInput): string {
    const provided: string | undefined =
        (typeof objective.text === 'string' && objective.text) ||
        (typeof objective.label === 'string' && objective.label) ||
        (typeof objective.description === 'string' && objective.description) ||
        undefined;
    if (provided) return provided;
    const verb: string =
        typeof objective.type === 'string' && objective.type.length > 0
            ? objective.type
            : 'task';
    const target: string =
        typeof objective.target === 'string' && objective.target.length > 0
            ? `: ${objective.target}`
            : '';
    return `${verb}${target}`;
}

/**
 * Engine `Quest` / `QuestObjective` types (`@mechanics`) shape the
 * input; objectives extend via `MemoirObjectiveInput` for the
 * mobile-side `text` / `label` fallback fields that test fixtures
 * inject. An objective is done when `currentCount >= requiredCount`.
 */
function buildActiveRows(activeQuests: readonly Quest[] | undefined): ReadonlyArray<MemoirQuestRow> {
    if (!Array.isArray(activeQuests)) return Object.freeze([]) as readonly MemoirQuestRow[];
    return Object.freeze(
        activeQuests.map((q) => {
            const name: string = typeof q?.name === 'string' ? q.name : '';
            const description: string =
                typeof q?.description === 'string' ? q.description : '';
            const rawObjectives: readonly MemoirObjectiveInput[] = Array.isArray(q?.objectives)
                ? (q.objectives as readonly MemoirObjectiveInput[])
                : [];
            const objectives = Object.freeze(
                rawObjectives.map((o) => {
                    const currentCount =
                        typeof o.currentCount === 'number' ? o.currentCount : 0;
                    const requiredCount =
                        typeof o.requiredCount === 'number' && o.requiredCount > 0
                            ? o.requiredCount
                            : 1;
                    const done = currentCount >= requiredCount;
                    return Object.freeze({
                        id: typeof o.id === 'string' ? o.id : `obj-${name}`,
                        text: synthesizeObjectiveText(o),
                        done,
                        bullet: done ? QUEST_OBJECTIVE_BULLET.done : QUEST_OBJECTIVE_BULLET.pending,
                    });
                }),
            ) as readonly {
                id: string;
                text: string;
                done: boolean;
                bullet: '✓' | '○';
            }[];
            // `name` is the engine's quest SLUG (`starting-quest`);
            // the journal headlines this field, so resolve it to an authored
            // title. `id` keeps the slug — it is the list key, not copy.
            return Object.freeze({
                id: name || 'unnamed',
                name: questTitle(name) || 'unnamed',
                description,
                status: 'active' as const,
                objectives,
            });
        }),
    ) as readonly MemoirQuestRow[];
}

function buildCompletedRows(
    completedNames: unknown,
): ReadonlyArray<MemoirQuestRow> {
    if (!Array.isArray(completedNames)) return Object.freeze([]) as readonly MemoirQuestRow[];
    return Object.freeze(
        completedNames.map((name) => {
            const safeName = typeof name === 'string' ? name : 'unnamed';
            // Same slug-to-title resolution as the active rows.
            return Object.freeze({
                id: safeName,
                name: questTitle(safeName) || 'unnamed',
                description: '',
                status: 'completed' as const,
                objectives: Object.freeze([]) as readonly {
                    id: string;
                    text: string;
                    done: boolean;
                    bullet: '✓' | '○';
                }[],
            });
        }),
    ) as readonly MemoirQuestRow[];
}

/**
 * Narrative death-tally line. Singular/plural handled here
 * so the screen carries no numeric-copy literal (Hard Rule #8).
 */
function buildDeathLine(count: number): string {
    if (count === 0) return DEFAULT_REMAINS.deathLine;
    if (count === 1) return 'you have fallen once.';
    return `you have fallen ${count} times.`;
}

/**
 * Milestone thresholds for the carried Soul bank: a cosmetic/narrative
 * recognition tier, not a spend or a shop good. Crossing a tier appends
 * a fixed epithet to `soulsLine`, derived from the `bankedSouls` tally
 * and never stored. Ordered highest-first so `find` picks the highest
 * tier reached.
 */
const SOULS_MILESTONE_TIERS: ReadonlyArray<{ min: number; epithet: string }> = Object.freeze([
    { min: 50, epithet: 'the harvest is legend.' },
    { min: 25, epithet: 'the reaping is remembered.' },
    { min: 10, epithet: 'the harvest deepens.' },
]);

/**
 * Narrative Soul-jar line. Singular/plural/zero handled here so the
 * screen carries no numeric-copy literal (Hard Rule #8), same convention
 * as `buildDeathLine`; the epithet of the highest tier the bank has
 * reached in `SOULS_MILESTONE_TIERS` is appended as a second clause.
 */
function buildSoulsLine(count: number): string {
    if (count === 0) return DEFAULT_REMAINS.soulsLine;
    const base = count === 1 ? 'the jar holds a single soul.' : `the jar holds ${count} souls.`;
    const tier = SOULS_MILESTONE_TIERS.find((t) => count >= t.min);
    return tier === undefined ? base : `${base} ${tier.epithet}`;
}

/**
 * Merge Rest (`night-keepsake:`) and LootCache (`cache-keepsake:`)
 * flags into one reverse-chronological, de-duplicated label list
 * `state.flags` is append-order (oldest first); reversing
 * before de-dup keeps the most-recent occurrence of a repeated label,
 * matching the chronicle section's "most recent first" convention.
 * The writers already guard against literal duplicate flags
 * (`state/rest/store-actions.ts` / `state/cache/store-actions.ts`),
 * but this de-dupes defensively rather than trusting that invariant —
 * consistent with this presenter's existing defensive-parsing style.
 */
function extractKeepsakes(flags: unknown): ReadonlyArray<string> {
    if (!Array.isArray(flags)) return Object.freeze([]) as readonly string[];
    const labels: string[] = [];
    for (const flag of flags as readonly unknown[]) {
        if (typeof flag !== 'string') continue;
        if (flag.startsWith(REST_KEEPSAKE_FLAG_PREFIX)) {
            labels.push(flag.slice(REST_KEEPSAKE_FLAG_PREFIX.length));
        } else if (flag.startsWith(CACHE_KEEPSAKE_FLAG_PREFIX)) {
            labels.push(flag.slice(CACHE_KEEPSAKE_FLAG_PREFIX.length));
        }
    }
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const label of labels.reverse()) {
        if (seen.has(label)) continue;
        seen.add(label);
        deduped.push(label);
    }
    return Object.freeze(deduped) as readonly string[];
}

/**
 * Composes the REMAINS section VM from raw `state.flags` and
 * `player.bankedSouls`.
 */
function buildRemains(
    flags: unknown,
    rawBankedSouls: unknown,
): MemoirRemainsViewModel {
    const safeFlags: readonly string[] = Array.isArray(flags)
        ? (flags.filter((f): f is string => typeof f === 'string') as readonly string[])
        : [];
    const deathCount = hazardDeathCount(safeFlags);
    const bankedSouls = typeof rawBankedSouls === 'number' && Number.isFinite(rawBankedSouls)
        ? Math.max(0, rawBankedSouls)
        : 0;
    return Object.freeze({
        deathCount,
        deathLine: buildDeathLine(deathCount),
        keepsakes: extractKeepsakes(flags),
        bankedSouls,
        soulsLine: buildSoulsLine(bankedSouls),
    }) as MemoirRemainsViewModel;
}

/**
 * Pure mapper from game state → `MemoirViewModel`. Builds the full
 * journal surface — header, chronicle, quests, remains —
 * off the engine state in one pass.
 *
 * Each section reads from a distinct slice:
 *
 * - **Header sub-line** — substitutes the player's display name into
 *   `"<name>, pilgrim."` when `state.player.name` is populated; falls
 *   back to the FALLBACK header otherwise.
 * - **Quests** — reads `state.quests` (engine `QuestLog`). Active
 *   rows mirror the engine's `Quest` objects with their objectives;
 *   completed rows mirror the engine's `completed: QuestName[]` (the
 *   engine drops the full Quest on completion, so the row carries
 *   just the name). `forgotten` stays empty — the engine has no
 *   failed-quest concept today; the field is reserved for future
 *   expansion without forcing a schema change.
 * - **Chronicle** — reads `state._recentEvents` (ring buffer,
 *   capacity 20) and folds typed events into `ChronicleEntry` rows via
 *   `buildChronicle` (see its doc for ordering). Combat
 *   outcomes → FELLED / ROUTED BY / FLED; levelups → ROSE
 *   TO N; world:moved (continent transition only) → CROSSED INTO X;
 *   dialogue:applied with extractable npcName → SPOKE WITH X. Other
 *   event kinds are skipped. Capped at
 *   `CHRONICLE_VISIBLE_CAP` (12) rows; the screen scrolls if more
 *   exist.
 * - **Remains** — reads `state.flags` (engine
 *   `GameState.flags`). Death tally via
 *   `hazardDeathCount`; keepsakes merge Rest's `night-keepsake:` and
 *   LootCache's `cache-keepsake:` flags into one reverse-chronological,
 *   de-duplicated list via `extractKeepsakes`. `bankedSouls` reads
 *   `state.player.bankedSouls` (Harvest's persistent Soul jar, written
 *   back by `CombatEncounterPanel.applyHazardOutcome` at combat end).
 *
 * The view-model shape is pinned by `state/e2e/memoir.engine.test.ts`;
 * extensions to any section must keep the contract stable.
 */
export function selectMemoirViewModel(state: MemoirStateInput): MemoirViewModel {
    // `state` is `MemoirStateInput` (GameStore + optional
    // `_recentEvents`). The `_recentEvents` ring buffer is
    // mobile-private, hence the optional field. Tests that pass an
    // engine `GameStore` (no mobile slices) still work — the
    // optional field is undefined and chronicle stays empty.
    const player = state.player;
    const subline =
        player && typeof player.name === 'string' && player.name.length > 0
            ? `${player.name}, pilgrim.`
            : FALLBACK_VM.headerSubline;
    const log: QuestLog | undefined = state.quests;
    const active = buildActiveRows(log?.active);
    const completed = buildCompletedRows(log?.completed);
    const chronicle = buildChronicle(state._recentEvents);
    const remains = buildRemains(state.flags, player?.bankedSouls);
    return freezeViewModel({
        ...FALLBACK_VM,
        headerSubline: subline,
        chronicle,
        quests: {
            active,
            completed,
            forgotten: Object.freeze([]) as readonly MemoirQuestRow[],
        },
        remains,
    });
}
