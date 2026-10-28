/**
 * Dialogue runtime — applies a chosen `DialogueChoice` to the `GameState`.
 *
 * The dialogue tree itself lives under `src/NPCs/`; this module orchestrates
 * the side effects on `GameState` (start quest, advance objective, complete
 * quest, teach card, set flag, grant currency).
 */

import { GameState } from '../Game/types';
import { DialogueChoice, DialogueTree, DialogueNode } from '../NPCs/types';
import {
    discoverQuest, startQuest, progressQuest, completeQuest, findActiveQuest,
} from './quest.engine';
import { settleQuestLog } from './questline';
import { getMapDefinition } from './map.registry';
import { QuestName } from './quest.library';

/** Result of applying a dialogue choice to the GameState. */
export interface ApplyDialogueChoiceResult {
    gameState: GameState;
    nextNode: DialogueNode | null;
    /** Side-effect summary for the UI log. */
    effects: {
        startedQuest?: QuestName;
        completedQuest?: QuestName;
        progressedObjective?: { name: QuestName; objectiveId: string; amount: number };
        learnedCard?: string;
        setFlag?: string;
        grantedCurrency?: number;
    };
}

/**
 * Applies `choice.effect` to `gameState` and returns the resulting state
 * along with the next dialogue node (if any). When `choice.nextNodeId` is
 * unset, the conversation ends and `nextNode` is `null`.
 *
 * The function looks up quest definitions from the current map's
 * `MapDefinition` so an NPC can hand out any quest authored on its map
 * without each definition having to re-declare the same Quest objects.
 */
export function applyDialogueChoice(
    gameState: GameState,
    tree: DialogueTree,
    choice: DialogueChoice,
): ApplyDialogueChoiceResult {
    let player = gameState.player;
    let quests = gameState.quests;
    let flags = gameState.flags;
    const effects: ApplyDialogueChoiceResult['effects'] = {};

    const e = choice.effect;
    if (e) {
        if (e.startQuest) {
            const def = getMapDefinition(
                gameState.world.currentMap.continent,
                gameState.world.currentMap.name,
            );
            // The current map's quests first, then one already offered in the
            // log (`available`): R7e left no map carrying quests, and the
            // fixture quest is seeded into the log.
            const quest = def.quests?.find(q => q.name === e.startQuest)
                ?? quests.available.find(q => q.name === e.startQuest);
            if (quest) {
                if (!quests.active.some(q => q.name === quest.name) && !quests.completed.includes(quest.name)) {
                    quests = discoverQuest(quests, quest);
                    quests = startQuest(quests, quest);
                    effects.startedQuest = quest.name;
                }
            }
        }
        if (e.progressQuest) {
            const amount = e.progressQuest.amount ?? 1;
            const res = progressQuest(quests, e.progressQuest.name, e.progressQuest.objectiveId, amount);
            if (findActiveQuest(quests, e.progressQuest.name)) {
                quests = res.log;
                effects.progressedObjective = { ...e.progressQuest, amount };
                if (res.completedName) {
                    effects.completedQuest = res.completedName;
                }
            }
        }
        if (e.completeQuest) {
            if (!quests.completed.includes(e.completeQuest)) {
                quests = completeQuest(quests, e.completeQuest);
                effects.completedQuest = e.completeQuest;
            }
        }
        if (e.teachCard) {
            if (!player.knownCards.includes(e.teachCard)) {
                player = { ...player, knownCards: [...player.knownCards, e.teachCard] };
                effects.learnedCard = e.teachCard;
            }
        }
        if (e.setFlag) {
            if (!flags.includes(e.setFlag)) {
                flags = [...flags, e.setFlag];
                effects.setFlag = e.setFlag;
            }
        }
        if (e.grantCurrency) {
            player = { ...player, currency: player.currency + e.grantCurrency };
            effects.grantedCurrency = e.grantCurrency;
        }
    }

    const nextNode = choice.nextNodeId ? (tree.nodes[choice.nextNodeId] ?? null) : null;

    // A `progressQuest` or `completeQuest` that finished a quest pays its
    // reward, and one that made a questline step ready opens its roads,
    // through the one settle seam.
    return {
        gameState: settleQuestLog({ ...gameState, player, flags }, quests).state,
        nextNode,
        effects,
    };
}
