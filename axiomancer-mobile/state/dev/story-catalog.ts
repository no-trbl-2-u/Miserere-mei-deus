/**
 * Dev-only STORY catalogue — real NPC dialogue trees and real quests.
 *
 * The engine authors both on `MapDefinition` (`npcs[]` and `quests[]`),
 * per map, with no cross-map registry. This module walks `MAP_REGISTRY`
 * once and flattens them so the `/dev` STORY section can open ANY
 * authored NPC's tree, or start / advance / complete ANY authored quest,
 * with the same content the player meets — no more synthetic fixtures.
 *
 * Functions:
 *   listNpcs()                        every staged NPC with a dialogue tree
 *   listQuests()                      every authored quest, campaign order
 *   openNpcDialogue(store, npc)       seed the event slice → `/dialogue`
 *   startQuestByName / advanceQuest / completeQuestByName
 */

import {
    MAP_REGISTRY,
    completeQuest,
    findActiveQuest,
    progressQuest,
    startQuest,
} from '@mechanics';
import type { ContinentName, DialogueTree, GameState, MapName, NPC, Quest, QuestLog, QuestName } from '@mechanics';

import type { AppStore } from '@/state/store';

/** One openable NPC conversation. */
export interface NpcChoice {
    /** Stable chip key: `<map>/<slug-of-name>`. */
    readonly key: string;
    readonly name: string;
    readonly map: MapName;
    readonly tree: DialogueTree;
}

/** One authored quest with its home map. */
export interface QuestChoice {
    readonly key: QuestName;
    readonly map: MapName;
    readonly quest: Quest;
}

/** `Captain Blackwater` → `captain-blackwater`. */
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Every map definition in registry (campaign) order. */
const allMapDefs = () =>
    (Object.keys(MAP_REGISTRY) as ContinentName[]).flatMap((c) =>
        Object.values(MAP_REGISTRY[c]).filter((d): d is NonNullable<typeof d> => Boolean(d)),
    );

/** Resolve an NPC's tree: `dialogueTree` first, else the root of `dialogue`. */
const treeOf = (npc: NPC): DialogueTree | null => {
    if (npc.dialogueTree) return npc.dialogueTree;
    const map = npc.dialogue as unknown as { rootId?: string; nodes?: DialogueTree['nodes'] } | undefined;
    return map?.rootId && map.nodes ? { rootId: map.rootId, nodes: map.nodes } : null;
};

/** Every staged NPC that has a conversation, campaign order. */
export function listNpcs(): readonly NpcChoice[] {
    return allMapDefs().flatMap((def) =>
        (def.npcs ?? []).flatMap((npc) => {
            const tree = treeOf(npc);
            return tree ? [{ key: `${def.name}/${slug(npc.name)}`, name: npc.name, map: def.name, tree }] : [];
        }),
    );
}

/** Every authored quest, campaign order. */
export function listQuests(): readonly QuestChoice[] {
    return allMapDefs().flatMap((def) => (def.quests ?? []).map((quest) => ({ key: quest.name, map: def.name, quest })));
}

/**
 * Seed the event slice with a cursor at `tree`'s root. No map-event kind
 * carries a dialogue tree, so the pending event is an empty cutscene that
 * only keeps the slice active; the cursor is what `<EventGate>` routes on,
 * pushing `/dialogue`. Choices apply through the live `pickEventChoice` path
 * (quest starts, flags, taught cards). The dev jump and a fixture's
 * `stagedDialogue` (`<FixtureBoot>`) both seat through here.
 */
export function seatDialogue(store: AppStore, tree: DialogueTree): void {
    const state = store.getState();
    store.setState({
        event: {
            pending: { state, event: { kind: 'cutscene', lines: [] } } as never,
            dialogueCursor: { tree, nodeId: tree.rootId },
            history: [],
            sourceNodeType: null,
        },
    });
}

/** Seat `npc`'s tree (`seatDialogue`). */
export function openNpcDialogue(store: AppStore, npc: NpcChoice): void {
    seatDialogue(store, npc.tree);
}

const questLogOf = (store: AppStore): QuestLog => (store.getState() as unknown as GameState).quests;
const writeLog = (store: AppStore, quests: QuestLog): void => store.setState({ quests } as never);

/** Push `quest` onto the active log (idempotent per engine `startQuest`). */
export function startQuestByName(store: AppStore, choice: QuestChoice): void {
    writeLog(store, startQuest(questLogOf(store), choice.quest));
}

/**
 * Bump the first unfinished objective by one. Returns `false` when the
 * quest is not active (nothing to advance).
 */
export function advanceQuest(store: AppStore, choice: QuestChoice): boolean {
    const log = questLogOf(store);
    const active = findActiveQuest(log, choice.key);
    if (!active) return false;
    const objective = active.objectives.find((o) => o.currentCount < o.requiredCount) ?? active.objectives[0];
    if (!objective) return false;
    writeLog(store, progressQuest(log, choice.key, objective.id, 1).log);
    return true;
}

/** Move the quest from active → completed (engine `completeQuest`). */
export function completeQuestByName(store: AppStore, choice: QuestChoice): void {
    writeLog(store, completeQuest(questLogOf(store), choice.key));
}

/** `active` / `done` / `avail` / `—` for a chip's status suffix. */
export function questStatus(state: unknown, name: QuestName): 'active' | 'done' | 'avail' | '—' {
    const log = (state as GameState).quests;
    if (!log) return '—';
    if (log.completed.includes(name)) return 'done';
    if (log.active.some((q) => q.name === name)) return 'active';
    if (log.available.some((q) => q.name === name)) return 'avail';
    return '—';
}
