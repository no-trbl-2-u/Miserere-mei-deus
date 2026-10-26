import { Character } from './types';
import { createCharacter } from './index';
import { cloneRelic, getRelicById } from '../Items/relic.library';

// The fixture player wears the Suppliant's Ring explicitly (a real run starts
// with no relic) so combat / sim fixtures have a signature to spend
// Conviction on. It carries the ring too, worn-first, as a granted relic is.
const ring = cloneRelic(getRelicById('relic-disarming-plea')!);

export const Player: Character = createCharacter({
    name: 'Player',
    level: 1,
    // A real fresh run's stats (5/5/5, VITAE 170): neutral under stat
    // scaling, so fixture plays land their printed numbers.
    baseStats: { heart: 5, body: 5, mind: 5 },
    inventory: [ring],
    equipment: [ring],
});
