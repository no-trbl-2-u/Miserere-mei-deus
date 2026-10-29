import { Image } from '../Utils/types';
import type { QuestName } from '../World/quest.library';

/**
 * NPCs module type definitions.
 *
 * - `DialogueMap` is the flat string-keyed map that older NPC data uses.
 * - `DialogueTree` is the branching tree — every node has text and
 *   optional `choices` that traverse to other nodes, gated by requirements
 *   and able to fire side effects (start quest, advance objective, teach a
 *   card, set a flag).
 */

/**
 * Flat dialogue map, read for older NPC data. Use `DialogueTree` for new
 * NPCs — the branching shape enables quest / flag gating.
 *
 * @example
 * {
 *   "greeting": "Hello, traveler!",
 *   "farewell": ["Safe travels!", "Come back soon."]
 * }
 */
export interface DialogueMap {
    [key: string]: string | string[];
}

/**
 * A single choice the player can pick at a dialogue node.
 *
 * @property text         - What the player says / chooses (UI label).
 * @property nextNodeId   - Node to advance to. Omit to end the conversation.
 * @property requires     - Optional gate; the choice is hidden when unmet.
 *                          `quest` is satisfied when the named quest is `'active'` or `'completed'`.
 *                          `flag` is satisfied when the named flag is set in `gameState.flags`.
 * @property effect       - Optional side effect when chosen. Each field is
 *                          independent so a choice can both start a quest and
 *                          teach a card.
 */
export interface DialogueChoice {
    text: string;
    nextNodeId?: string;
    requires?: {
        quest?: QuestName;
        flag?: string;
        questCompleted?: QuestName;
    };
    effect?: {
        startQuest?: QuestName;
        /** Starts a questline step from anywhere, as accepting it would (counts from 0, the step before it done). */
        giveQuestStep?: { questline: string; step: number };
        progressQuest?: { name: QuestName; objectiveId: string; amount?: number };
        completeQuest?: QuestName;
        teachCard?: string;
        setFlag?: string;
        grantCurrency?: number;
    };
}

/** A node in a branching dialogue tree. */
export interface DialogueNode {
    id: string;
    text: string;
    /** Omit for leaf nodes (terminator). */
    choices?: DialogueChoice[];
}

/**
 * Branching dialogue tree — set of nodes keyed by id with a designated root.
 * The engine traverses the tree by following the `nextNodeId` of the chosen
 * `DialogueChoice`. A leaf node (no `choices`) ends the conversation.
 */
export interface DialogueTree {
    rootId: string;
    nodes: Record<string, DialogueNode>;
    /** Optional stable tree identifier. */
    id?: string;
}

/**
 * NPC is a non-player character that can be interacted with.
 *
 * Either `dialogue` (flat map) or `dialogueTree` (branching tree) may be
 * present. New authoring should use `dialogueTree`; the flat map is retained
 * for the existing NPC data.
 *
 * @property name          - The name of the NPC (also the lookup key in node events).
 * @property dialogue      - Flat dialogue map (optional).
 * @property dialogueTree  - Branching tree (preferred for new content).
 * @property description   - A description of the NPC (optional).
 * @property image         - Optional visual.
 * @property isShopkeeper  - Marks this NPC as exposing a shop view.
 */
export interface NPC {
    name: string;
    dialogue?: DialogueMap;
    dialogueTree?: DialogueTree;
    description?: string;
    image?: Image;
    isShopkeeper?: boolean;
}
