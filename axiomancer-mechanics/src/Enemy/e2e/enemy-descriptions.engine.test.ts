/**
 * Hermetic E2E (NV1h, NV1r): all thirteen Chapter 1 foes carry the descriptions
 * T approved on 2026-11-13 (plan/ballots/narrator-enemies.md, "Approved", rounds
 * 3 and 4), word for word, each stays inside the narrator's prose rules, and the
 * Tide-Gate reads as The Half-Taken.
 */

import { describe, expect, it } from 'vitest';

import {
    BilgeStalker, BrineWidow, CaveChoir, Coralback, Lamplighter, NetMender, QuayCrab, SaintBeneath,
    SaltwickSwarm, TideGate, TitheCollector, Wrecker, Wreckmaster,
} from '../enemy.library';

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
    ['E-07 Net-Mender', NetMender,
        'The harbour works in the dark, and so does he. He mends by feel as the living do along the quay, and he has not noticed that he went down with the last net he mended. The knots are still good.'],
    ['E-08 Brine-Widow', BrineWidow,
        'The pier keeps one rule: the cargo comes in before any man in the water. The night her husband went over the side, she held the rope and kept to the rule. She walks the pier yet, and every swimmer she meets is him.'],
    ['E-09 The Cave Choir', CaveChoir,
        'The sea took them as they rowed home from the chapel on the cliff, the whole congregation in one boat in one squall. Under the cliff they hold the service still. The hymn is heard but ignored by those who know better.'],
    ['E-10 The Tithe-Collector', TitheCollector,
        'Every light on this coast is owed for, and someone must call to collect. He no longer remembers why he must. His will went from him many moons ago, but the collecting did not.'],
    ['E-11 The Lamplighter', Lamplighter,
        'He climbs the lighthouse path each night with a lantern, as though the tower were lit and he were late to it. He swept the lamp room before the lamp was sold, and the winters since have taken all of him but the habit.'],
    ['E-12 The Wrecker', Wrecker,
        'The town has lived on what the rocks bring in for longer than it has had a name. Out on the lighthouse path that living has taken a shape of its own, and it walks the cliff and watches the sea for sails.'],
    ['E-13 The Half-Taken', TideGate,
        'He was left on the tide line as an offering for the one in the keep, and the sea came for him and took only half. It comes back each tide for the rest. He waits on the causeway to be finished.'],
] as const;

describe('approved enemy descriptions (NV1h, NV1r)', () => {
    it.each(APPROVED)('%s carries its approved line', (_label, enemy, line) => {
        expect(enemy.description).toBe(line);
    });

    it.each(APPROVED)('%s has no quote, semicolon, dash or exclamation mark', (_label, enemy) => {
        expect(enemy.description).not.toMatch(/["“”;!—–]|--/);
    });
});

describe('the Tide-Gate renamed (NV1r)', () => {
    it('is named The Half-Taken and keeps its id and portrait', () => {
        expect(TideGate.name).toBe('The Half-Taken');
        expect(TideGate.id).toBe('enemy-tide-gate');
        expect(TideGate.portraitAsset).toBe('tide-gate');
    });
});
