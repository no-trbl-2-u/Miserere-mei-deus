/**
 * Hermetic E2E (NV1h): six Chapter 1 foes carry the descriptions T
 * approved on 2026-11-13 (plan/ballots/narrator-enemies.md, "Approved"), word
 * for word, and each stays inside the narrator's prose rules.
 */

import { describe, expect, it } from 'vitest';

import { Coralback, BilgeStalker, QuayCrab, SaintBeneath, SaltwickSwarm, Wreckmaster } from '../enemy.library';

const APPROVED = [
    ['E-01 The Saint Beneath', SaintBeneath,
        'He bought the harbour\'s lamp and sat down beside it to keep it safe. Thirty years have done to him what the sea does to anything left in it. The town still prays to him. They no longer remember his name, and neither does he.'],
    ['E-02 Saltwick Swarm', SaltwickSwarm,
        'The cold glow in the cove weed, risen off the water. Fishermen once set their pots by it on nights the harbour showed no lamp. The cove took the pots and the men in a winter of storms.'],
    ['E-03 The Wreckmaster', Wreckmaster,
        'The sea gives back what it takes, and not as it took it. He came ashore on the keep causeway with his orders still in him. He stands among the offerings on the tide line as though they were left for him.'],
    ['E-04 Quay-Crab', QuayCrab,
        'It works the mud under the gallows and the mud under the quays, and it is not particular. What came down from the last rope came down to it. Nothing on this coast lets go of a thing once it has hold.'],
    ['E-05 Bilge-Stalker', BilgeStalker,
        'It came up out of the hulls the town drags ashore. This has been a year of poor wrecks, and the town is thin and polite about it. This thing is neither. It hunts the roads to the chained bridge.'],
    ['E-06 Coralback', Coralback,
        'It climbs the harbour steps toward the upper town, where every window faces the keep. Its crown is the colour of fire, but warms nothing. The hard winters take the old ones at those windows, still looking at the keep.'],
] as const;

describe('approved enemy descriptions (NV1h)', () => {
    it.each(APPROVED)('%s carries its approved line', (_label, enemy, line) => {
        expect(enemy.description).toBe(line);
    });

    it.each(APPROVED)('%s has no quote, semicolon, dash or exclamation mark', (_label, enemy) => {
        expect(enemy.description).not.toMatch(/["“”;!—–]|--/);
    });
});
