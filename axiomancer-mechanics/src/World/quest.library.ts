/**
 * QuestName names a quest-LOG quest — the objective-tracking quests consumed
 * by `quest.engine.ts`, dialogue gating (`DialogueChoice.requires.quest`) and
 * reach objectives.
 *
 * The authored questlines live here too. This file side-effects on import:
 * it registers every authored questline (`registerQuestline`), and
 * `src/World/index.ts` imports it for that effect beside the map-event pools,
 * so a quest node of an authored line reads its steps. An unregistered line
 * reads node 1 as `offer` and every later node as `locked`.
 */

import type { Questline } from './questline';
import { registerQuestline } from './questline';
import { BREAKWATER_CHAPTER_QUESTLINE } from './breakwater-chapter.questline';

export type QuestName = string;

/** Every authored questline, in registration order: the Breakwater's Chapter 1 chain. */
export const AUTHORED_QUESTLINES: readonly Questline[] = [BREAKWATER_CHAPTER_QUESTLINE];

for (const questline of AUTHORED_QUESTLINES) registerQuestline(questline);
