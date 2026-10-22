/**
 * Act I — The Colonnade (`aporia-colonnade`): authored room content.
 *
 * Source of truth: `plan/labyrinth/acts/act1.md` (repo root); the
 * intended path and graph invariants are cross-checked against
 * `plan/labyrinth/acts/act1.solution.md`.
 */

import type { LabyrinthActDef } from '../types';

const ACT1_RIDDLE = 'Name the only road that cannot mislead you.';

export const ACT1: LabyrinthActDef = {
    id: 'act1',
    mapName: 'aporia-colonnade',
    title: 'Act I — The Colonnade',
    entry: 'ap1-1',
    questRoom: 'ap1-8',
    bossRoom: 'ap1-15',
    bossSlug: 'death-beholder',
    descent: 'act2',
    riddle: ACT1_RIDDLE,
    gates: [
        {
            roomId: 'ap1-6',
            to: 'ap1-8',
            riddle: ACT1_RIDDLE,
            answer: ['THE', 'ONE', 'YOU', 'WALK'],
            refusalLines: [
                'Painted words. You brought me paint.',
                'Right words, wrong feet. Order is an argument too.',
                'Guess freely. I keep the guesses. They keep, better than you would think.',
            ],
            successLine: 'The door swings without sound. The house assents.',
        },
    ],
    rooms: [
        {
            nodeId: 'ap1-1',
            display: '1',
            name: 'The Narthex',
            realm: 'path',
            scene: 'a cold porch of pale stone. Three doors ahead, each lintel carved with one word. The left door (4) reads GATE. The middle (7) reads DOOR. The right (9) reads ARCH. A brazier, unlit. A stone bench worn smooth in one seat only.',
            narration: 'So. Another argument walks in on two legs. Hear the terms of the house. Anything here may be a clue. Not every clue is honest. Neither am I. You will want the road out. There is exactly one that cannot mislead you — name it at the gate below, and the gate will assent. The others lead where gates and arches lead: around. I have watched them go around for a very long time.',
            pois: [
                {
                    id: 'bench',
                    label: 'Bench',
                    remark: 'Worn by one sitter. The rest never stayed long enough.',
                },
                {
                    id: 'brazier',
                    label: 'Brazier',
                    remark: 'Cold. Fire is honest and was not wanted here.',
                },
                {
                    id: 'door-4-gate',
                    label: 'Door 4 (GATE)',
                    remark: 'A gate promises a wall. Walls promise an inside. Promises, promises.',
                },
                {
                    id: 'door-7-door',
                    label: 'Door 7 (DOOR)',
                    remark: 'It says nothing else. How unlike everyone.',
                },
                {
                    id: 'door-9-arch',
                    label: 'Door 9 (ARCH)',
                    remark: 'An arch is a doorway that gave up on doors.',
                },
            ],
            doors: [
                { to: 'ap1-2' },
                { to: 'ap1-9' },
                { to: 'ap1-10' },
            ],
        },
        {
            nodeId: 'ap1-2',
            display: '7',
            name: 'The Colonnade Proper',
            realm: 'path',
            scene: 'a roofless avenue of columns marching into painted dark. Every column bears a small carved plaque. One column, mid-row, wears a leather strap at shoulder height. Doors: back to 1, ahead to 11, a low side door to 6.',
            narration: 'The builders raised these columns to hold up nothing. It is the most honest work in the house. Count what cannot be divided, and you will not be misled. The rest is masonry.',
            pois: [
                {
                    id: 'strapped-column',
                    label: 'Strapped column',
                    remark: 'Someone bound it so it could not wander. It is a column. Where would it go.',
                    fragment: { word: 'THE', kind: 'honest' },
                },
                {
                    id: 'plaques',
                    label: 'Plaques',
                    remark: 'Small words hold up large stones. Carved, every one. The maze carves. It does not paint. Should you meet paint, remember whose habit that is.',
                },
                {
                    id: 'low-side-door-6',
                    label: 'Low side door (6)',
                    remark: 'The long way is popular. Popularity is not an argument.',
                },
            ],
            doors: [
                { to: 'ap1-1' },
                { to: 'ap1-3' },
                { to: 'ap1-11' },
            ],
        },
        {
            nodeId: 'ap1-3',
            display: '11',
            name: 'The Hall of Plinths',
            realm: 'path',
            scene: 'a hall of empty pedestals, statues gone. One plinth at the center is intact. It bears nothing but a carved word. The rest are cracked, their inscriptions defaced.',
            narration: 'They carried the statues off to the last continent, or so the story runs. Stories run. Stone stays. Of the many that stood here, only one kept its footing — the unbroken one. Its fellows split three ways, four ways, six.',
            pois: [
                {
                    id: 'intact-plinth',
                    label: 'Intact plinth',
                    remark: 'One. Indivisible. It needed no statue to mean something.',
                    fragment: { word: 'ONE', kind: 'honest' },
                },
                {
                    id: 'defaced-plinths',
                    label: 'Defaced plinths',
                    remark: 'Split things say split things. Ignore them.',
                },
                {
                    id: 'door-to-13',
                    label: 'Door to 13',
                    remark: 'Down. The house thinks with its bones.',
                },
                {
                    id: 'door-to-4',
                    label: 'Door to 4',
                    remark: 'That way smells of rainwater and repetition.',
                },
            ],
            doors: [
                { to: 'ap1-2' },
                { to: 'ap1-4' },
            ],
        },
        {
            nodeId: 'ap1-4',
            display: '13',
            name: 'The Undercroft',
            realm: 'path',
            scene: 'a low vaulted cellar. FOUR visible doors: back up to 11, and onward to 8, 9, and 6. Along the blank south wall, a row of oil lamps. Five lamps, all burning. The wall beneath the fifth shows no door at all, only a shallow relief of a stair. A floor drain. Barrels gone soft.',
            narration: 'Thirteen, they said, is an unlucky count, and hurried. They counted four ways out of this cellar. I have kept house here longer than they were alive. I count five.',
            pois: [
                {
                    id: 'lamp-row',
                    label: 'Lamp row',
                    remark: 'Lamps are lit where someone will walk. The house does not waste oil.',
                },
                {
                    id: 'relief-of-a-stair',
                    label: 'Relief of a stair',
                    remark: 'Decorative, surely. The mason carved a stair going up on a wall with nothing behind it. Masons are such dreamers.',
                    revealsSecretDoorTo: 'ap1-5',
                },
                {
                    id: 'drain',
                    label: 'Drain',
                    remark: 'Even the rain leaves this room eventually. Follow something that leaves.',
                },
                {
                    id: 'doors-8-9-6',
                    label: 'Doors 8 / 9 / 6',
                    remark: 'Eight is twice four. Nine is thrice three. Six is friendly with both. What good company they keep. Note the hinges — set to swing one way, like most convictions.',
                },
            ],
            doors: [
                { to: 'ap1-3' },
                { to: 'ap1-12' },
                { to: 'ap1-10' },
                { to: 'ap1-11' },
                { to: 'ap1-5', secret: true },
            ],
        },
        {
            nodeId: 'ap1-5',
            display: '17',
            name: 'The Lamplit Stair',
            realm: 'path',
            scene: 'a narrow stair rising behind the Undercroft wall, lamps at every seventh step. A landing with a lead-glass mirror, clouded. A small door to 23 tucked under the stair. The stair tops out at 19.',
            narration: 'You found the wall\'s other opinion. Good. Few meet the stair. Fewer meet the one climbing it. Look, there — in the glass. The only companion who takes every step you take, and forgives none.',
            pois: [
                {
                    id: 'clouded-mirror',
                    label: 'Clouded mirror',
                    remark: 'It shows the climber. It has never once shown anyone else.',
                    fragment: { word: 'YOU', kind: 'honest' },
                },
                {
                    id: 'under-stair-door-23',
                    label: 'Under-stair door (23)',
                    remark: 'A cell for the man who shod the walkers. Tradesmen keep the truest ledgers.',
                },
                {
                    id: 'lamps',
                    label: 'Lamps',
                    remark: 'Every seventh step. The house is showing off now.',
                },
            ],
            doors: [
                { to: 'ap1-4', secret: true },
                { to: 'ap1-6' },
                { to: 'ap1-7' },
            ],
        },
        {
            nodeId: 'ap1-6',
            display: '19',
            name: 'The Gate of Assent',
            realm: 'path',
            scene: 'a single great door of black wood, no handle, no keyhole. A lectern before it with four empty carved sockets in a row. Above the door: "SAY THE ROAD."',
            narration: 'Here the house asks its question back. Name the only road that cannot mislead you. Lay the words in their walking order. It will know a forgery — it always knows. So do I, but I charge.',
            pois: [
                {
                    id: 'sockets',
                    label: 'Sockets',
                    remark: 'Four beds for four words. The house sleeps poorly until they lie right.',
                },
                {
                    id: 'the-black-door',
                    label: 'The black door',
                    remark: 'It has no lock because it has no doubt.',
                },
            ],
            doors: [
                { to: 'ap1-5' },
                { to: 'ap1-8', gate: true },
            ],
        },
        {
            nodeId: 'ap1-7',
            display: '23',
            name: 'The Shoemaker\'s Cell',
            realm: 'path',
            scene: 'a monk-narrow cell. A cobbler\'s bench, an iron last, and one pair of boots soled through to the welt. A tally wall: strokes in fours, crossed by fifths.',
            narration: 'He mended boots for everyone the maze ate. He kept count on the wall and kept his opinions in the leather. When his own soles wore through, he did the sensible thing. He kept going.',
            pois: [
                {
                    id: 'worn-boots',
                    label: 'Worn boots',
                    remark: 'Worn is a word for proven.',
                    fragment: { word: 'WALK', kind: 'honest' },
                },
                {
                    id: 'tally-wall',
                    label: 'Tally wall',
                    remark: 'He counted walkers, not winners. There is no column for winners.',
                },
                {
                    id: 'bench',
                    label: 'Bench',
                    remark: 'Tools of a man who fixed the means and let the ends fix themselves.',
                },
            ],
            doors: [
                { to: 'ap1-5' },
            ],
        },
        {
            nodeId: 'ap1-8',
            display: '29',
            name: 'The Doorwarden\'s Antechamber',
            realm: 'path',
            scene: 'a vestry hung with hinges — hundreds, oiled and labeled in an alphabet nobody reads. A ledger stand (the act quest board). The far door (31) stands ajar exactly the width of a hand.',
            narration: 'Past that door waits the Doorwarden, who loved openings so much he became one. He will not let you pass, of course. First, the house requires its paperwork. Everything here is somebody\'s ledger.',
            pois: [
                {
                    id: 'hinge-wall',
                    label: 'Hinge wall',
                    remark: 'Every door that ever shut in this house is remembered here. The ones that opened need no memorial.',
                },
                {
                    id: 'ledger-stand',
                    label: 'Ledger stand',
                    remark: 'Sign nothing you have not read. Read nothing you cannot survive.',
                },
            ],
            doors: [
                { to: 'ap1-6' },
                { to: 'ap1-15' },
            ],
        },
        {
            nodeId: 'ap1-15',
            display: '31',
            name: 'The Hinge Shrine',
            realm: 'path',
            scene: 'a round chapel whose walls are doors. Dozens, frames mortared shut. At the center a figure of jointed bronze kneels in prayer: the Doorwarden. After the fight one floor hatch stands open where the altar stood. The descent to Act II.',
            narration: 'He asked the house to make him useful, and the house, which has a sense of humor, obliged. He is every door you did not choose. He holds it against you.',
            pois: [],
            doors: [],
        },
        {
            nodeId: 'ap1-9',
            display: '4',
            name: 'The Peristyle',
            realm: 'loop',
            scene: 'a rain-worn courtyard circling a dry fountain. A ring of keys nailed above an alcove, every key snapped at the shoulder. An alcove plaque, paint glistening.',
            narration: 'The courtyard is beloved. It brings everyone back to it, which they mistake for affection. Note the keys. The house collects them from optimists.',
            pois: [
                {
                    id: 'broken-keys',
                    label: 'Broken keys',
                    remark: 'A key is a promise about a lock. The house makes no such promises.',
                },
                {
                    id: 'alcove-plaque',
                    label: 'Alcove plaque',
                    remark: 'Fresh paint. In a house of carvers.',
                    fragment: { word: 'KEY', kind: 'counterfeit' },
                },
                {
                    id: 'fountain',
                    label: 'Fountain',
                    remark: 'Dry. Circulation is not nourishment.',
                    trap: 'encounter',
                },
            ],
            doors: [
                { to: 'ap1-1' },
                { to: 'ap1-10' },
                { to: 'ap1-12' },
            ],
        },
        {
            nodeId: 'ap1-10',
            display: '9',
            name: 'The Mirror Walk',
            realm: 'loop',
            scene: 'a corridor doubled by facing mirrors. Signs hang reversed in the glass. One reads correctly only in reflection: a painted word on a card tucked into a frame.',
            narration: 'Walk it as long as you like. It is generous with itself. The signs read backwards. Some people find that profound. It is glass, doing what glass does.',
            pois: [
                {
                    id: 'reversed-signs',
                    label: 'Reversed signs',
                    remark: 'The house carves what it means. What is merely reflected, it lets lie.',
                },
                {
                    id: 'tucked-card',
                    label: 'Tucked card',
                    remark: 'Paint again. The painter follows you, I think.',
                    fragment: { word: 'NAME', kind: 'counterfeit' },
                },
            ],
            doors: [
                { to: 'ap1-9' },
                { to: 'ap1-11' },
                { to: 'ap1-1' },
            ],
        },
        {
            nodeId: 'ap1-11',
            display: '6',
            name: 'The Long Gallery',
            realm: 'loop',
            scene: 'portrait frames the length of a tithe barn, all empty but one. A gilt frame holds a painted crown on a cushion. No head beneath it.',
            narration: 'The gallery of everyone who mastered the house. Notice the abundance. The one finished portrait is of the prize itself — they never did find anyone to wear it.',
            pois: [
                {
                    id: 'gilt-frame',
                    label: 'Gilt frame',
                    remark: 'Painted, cushion and all. The house has never crowned anything.',
                    fragment: { word: 'CROWN', kind: 'counterfeit' },
                },
                {
                    id: 'empty-frames',
                    label: 'Empty frames',
                    remark: 'Reserved. Optimism, again.',
                },
            ],
            doors: [
                { to: 'ap1-10' },
                { to: 'ap1-2' },
                { to: 'ap1-12' },
            ],
        },
        {
            nodeId: 'ap1-12',
            display: '8',
            name: 'The Cistern Walk',
            realm: 'loop',
            scene: 'a walkway over black water. Three openings. Two honest arches (4, 6). One low brick chute (22), breathing cold air upward, its lip worn glass-smooth.',
            narration: 'Mind the fourth opening. It is the house\'s throat, and the house swallows without chewing. I mention this because no one listens, and I enjoy being right.',
            pois: [
                {
                    id: 'chute-lip-22',
                    label: 'Chute lip (22)',
                    remark: 'Smooth as a lie told twice. Things go down it. Count what comes back up.',
                },
                {
                    id: 'black-water',
                    label: 'Black water',
                    remark: 'Deep enough. For what, it declines to say.',
                    trap: 'hazard',
                },
            ],
            doors: [
                { to: 'ap1-9' },
                { to: 'ap1-11' },
                { to: 'ap1-13' },
            ],
        },
        {
            nodeId: 'ap1-13',
            display: '22',
            name: 'The Oubliette Vestibule',
            realm: 'trap',
            scene: 'the chute\'s landing room. Scuffed floor, tallow stubs, one archway onward (24). The chute overhead is a smooth ceiling mouth no ladder reaches.',
            narration: 'Welcome to the underside of your decision. The way you came does not exist from this side — the house is strict about tenses. There is a room ahead with a bed in it. I will wait.',
            pois: [
                {
                    id: 'ceiling-mouth',
                    label: 'Ceiling mouth',
                    remark: 'You may address complaints to it. It has heard them all.',
                    trap: 'encounter',
                },
                {
                    id: 'tallow-stubs',
                    label: 'Tallow stubs',
                    remark: 'Others sat here adjusting to the new arrangement.',
                },
            ],
            doors: [
                { to: 'ap1-14' },
            ],
        },
        {
            nodeId: 'ap1-14',
            display: '24',
            name: 'The Chamber of Rest',
            realm: 'trap',
            scene: 'a made bed, impossibly clean. A night-table with a painted card leaning on a carafe. A long stair (the Long Stair) climbing into dark toward 4.',
            narration: 'The house provides. A bed, a word, a stair. The bed is real, I grant it — rest is the one counterfeit everyone forgives. The stair is long and the stair is honest, which is more than I can say for the furniture\'s literature.',
            pois: [
                {
                    id: 'painted-card',
                    label: 'Painted card',
                    remark: 'REST, it says. Paint. On the softest lie in the building.',
                    fragment: { word: 'REST', kind: 'counterfeit' },
                },
                {
                    id: 'the-long-stair-4',
                    label: 'The Long Stair (4)',
                    remark: 'Every step of it earned. Up you go — poorer, wiser, and in that order.',
                },
                {
                    id: 'bed',
                    label: 'Bed',
                    remark: 'Sleep if you must. The house charges nothing. The house already has what it wanted.',
                },
            ],
            doors: [
                { to: 'ap1-13' },
                { to: 'ap1-9' },
            ],
        },
    ],
};
