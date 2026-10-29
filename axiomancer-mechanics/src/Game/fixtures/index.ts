/**
 * State fixtures barrel — declarative test states compiled through the
 * engine (`docs/state-fixtures.md` at the monorepo root is the guide).
 */
export type { StateFixture } from './state-fixture.types';
export { buildStateFromFixture } from './state-fixture.builder';
export {
    StateFixtureError, problemsFor, validateStateFixture, parseStateFixture,
} from './state-fixture.validate';
export {
    STATE_FIXTURES, getStateFixtureById, listStateFixtureIds,
} from './state-fixture.registry';
export {
    FIXTURE_NPC, FIXTURE_QUEST, FIXTURE_QUESTLINE,
    FIXTURE_VILLAGE_EVENT, FIXTURE_CUTSCENE_EVENT, FIXTURE_QUEST_EVENT,
    FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS, FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC,
} from './fixture-content';
export { settleQuestNodes, settleQuestNodesIn, questNodeIdsOn } from './quest-nodes';
export {
    registerQuestChainFixture, QUEST_CHAIN_DEF, QUEST_CHAIN_MAP, QUEST_CHAIN_GATES, QUEST_CHAIN_POOLS,
    MAIN_QUESTLINE, SIDE_QUESTLINE, MAIN_LINE, SIDE_LINE, MAIN_STEP_1, MAIN_STEP_2, SIDE_STEP_1, gateReason,
} from './quest-chain.fixture';
export {
    registerLongChainFixture, LONG_CHAIN_DEF, LONG_CHAIN_MAP, LONG_CHAIN_GATES, LONG_CHAIN_POOLS,
    LONG_MAIN_QUESTLINE, LONG_SIDE_QUESTLINE, LONG_MAIN_LINE, LONG_SIDE_LINE, LONG_START_DIALOGUE, CASTLE_KEY,
    LONG_STEP_1, LONG_STEP_2, LONG_STEP_3, LONG_STEP_4, LONG_SIDE_STEP, longGateReason,
} from './quest-chain-long.fixture';
export {
    registerTravelPassageFixture, PASSAGE_MAP, PASSAGE_CONTINENT, PASSAGE_POOLS,
} from './travel-passage.fixture';
