/**
 * GameAction tagged union — every top-level state transition.
 *
 * Dispatched through `gameReducer(state, action): GameState`. The store
 * provides typed sugar around `dispatch` and emits `GameEvent`s after each
 * reducer run.
 *
 * Payloads are minimal but real. Where the underlying reducer needs richer
 * context (e.g. dialogue requires the active tree), the payload carries it
 * through — the CLI / UI is responsible for staging that context before
 * dispatch.
 */

import { Enemy } from '../Enemy/types';
import { Encounter } from '../World/types';
import type { QuestlineId } from '../World/questline';
import { Character } from '../Character/types';
import { Equipment, EquipmentSlot, Item } from '../Items/types';
import { DialogueTree, DialogueChoice } from '../NPCs/types';

export type GameAction =
    | { type: 'START_COMBAT';   payload: { target: Enemy | Encounter } }
    | {
          type: 'END_COMBAT';
          payload?: {
              /**
               * Outcome reported by the Hazard-Pattern combat driver. Defaults
               * to `'flee'` when omitted. `'victory'` / `'friendship'` grant
               * loot, XP, quest progress, and per-foe friendship rewards;
               * `'defeat'` / `'flee'` grant nothing.
               */
              outcome?: 'victory' | 'defeat' | 'friendship' | 'flee';
              /**
               * Final player snapshot from the combat driver (post-fight HP /
               * effects). Promoted to the root player on `'victory'` /
               * `'friendship'`; on `'defeat'` / `'flee'` the root inventory is
               * preserved so combat-side inventory mutations don't leak. When
               * omitted, the root player is left untouched.
               */
              finalPlayer?: Character;
              grantedLoot?: Item[];
              grantedXp?: number;
          };
      }
    | { type: 'MOVE_TO_NODE';   payload: { nodeId: string } }
    /** Accepts a questline step at its own quest node (`acceptQuestStep`). */
    | { type: 'ACCEPT_QUEST_STEP'; payload: { questline: QuestlineId; step: number } }
    /**
     * Turns in a ready questline step at the next quest node
     * (`turnInQuestStep`). Card offers a `card-pick` rolls are on that
     * function's `paid`; a host that shows them calls it directly.
     */
    | { type: 'TURN_IN_QUEST_STEP'; payload: { questline: QuestlineId; step: number } }
    | { type: 'PROCESS_NODE';   payload?: undefined }
    | { type: 'APPLY_DIALOGUE'; payload: { tree: DialogueTree; choice: DialogueChoice } }
    | { type: 'USE_ITEM';       payload: { itemId: string } }
    | { type: 'EQUIP_ITEM';     payload: { item: Equipment; opts?: { replaceIndex?: number } } }
    | { type: 'UNEQUIP_ITEM';   payload: { slot: EquipmentSlot; index?: number } }
    /**
     * Adds XP outside combat (a hazard puzzle's outcome). Like combat XP it
     * only fills the bar; `LEVEL_UP` then promotes the player.
     */
    | { type: 'GRANT_XP';       payload: { amount: number } }
    | { type: 'LEVEL_UP';       payload?: undefined }
    | { type: 'ALLOCATE_STAT_POINT'; payload: { stat: 'heart' | 'body' | 'mind' } }
    | { type: 'LEARN_CARD';    payload: { cardId: string } }
    /** Swaps one owned copy of `cardId` for `withCardId` (an upgrade). */
    | { type: 'REPLACE_CARD';  payload: { cardId: string; withCardId: string } }
    | { type: 'SAVE_GAME';      payload?: undefined }
    | { type: 'LOAD_GAME';      payload?: undefined }
    | { type: 'RESET_RUN';      payload: { keepCharacter: boolean } }
    /** The player's VITAE reached 0 (a fight or an engine hazard): `resolveDeath`. */
    | { type: 'PLAYER_DIED';    payload: { cause: 'fight' | 'hazard' } }
    | { type: 'UNLOCK_CODEX_ENTRY'; payload: { entryId: string } };
