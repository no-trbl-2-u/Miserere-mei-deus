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
    FIXTURE_NPC, FIXTURE_SHOP, FIXTURE_QUEST, FIXTURE_QUESTLINE,
    FIXTURE_DIALOGUE_EVENT, FIXTURE_VILLAGE_EVENT, FIXTURE_CUTSCENE_EVENT, FIXTURE_QUEST_EVENT,
    FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS, FIXTURE_ELITE_RELICS, FIXTURE_QUEST_RELIC,
} from './fixture-content';
