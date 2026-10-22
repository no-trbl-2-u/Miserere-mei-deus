/**
 * Act III — The Proof (`aporia-proof`): authored room content.
 *
 * Source of truth: `plan/labyrinth/acts/act3.md` (repo root); graph and
 * fragment placement cross-checked against `act3.solution.md`.
 */

// lexicon-ok: premise — the gate riddle "WHAT ARGUMENT HAS NO FIRST PREMISE?"
// in The Foundation is ordinary philosophical English about arguments, not a
// card keyword. It collides with the registry only because the house shouts
// its gate riddles in caps, which is what that row is scoped to.

import type { LabyrinthActDef } from '../types';

export const ACT3: LabyrinthActDef = {
    id: 'act3',
    mapName: 'aporia-proof',
    title: 'Act III — The Proof',
    entry: 'ap3-1',
    questRoom: 'ap3-8',
    bossRoom: 'ap3-9',
    bossSlug: 'death-beholder',
    descent: 'exit',
    riddle: 'What argument has no first premise?',
    gates: [
        {
            roomId: 'ap3-7',
            to: 'ap3-8',
            riddle: 'What argument has no first premise?',
            answer: [
                'THE',
                'ONE',
                'YOU',
                'WALK',
                'IT',
                'RESTS',
                'ON',
                'NOTHING',
                'IT',
                'IS',
                'WALKED',
                'NOT',
                'WON',
            ],
            preConfirmedByGates: ['ap1-6', 'ap2-7'],
            refusalLines: [
                'Furniture.',
                'Right words, wrong walking.',
                'The house has watched every step. It knows a forged one.',
            ],
            successLine:
                'The thirteen words lie true. Somewhere below, something very old exhales.',
        },
    ],
    rooms: [
        {
            nodeId: 'ap3-1',
            display: '49',
            name: 'The First Waystone',
            realm: 'path',
            scene: 'a rough chamber where masonry gives way to living rock. In the center, a milestone of grey granite, waist-high, its top worn into a hollow by centuries of resting hands. The number 49 is carved into the bedrock lintel of each door. Cold air rises from everywhere at once.',
            narration:
                'Below the shelving, below the memory. The house keeps its foundations where it keeps its doubts. You are in both. Rest your hand on the stone. The house will remember you stood here, and return you here if you settle. Two warnings, given freely, which should worry you. First: down here, trust only what bears weight. The rest is furniture. Second: the house numbers its bones once. If two rooms argue over a name, the one arguing is lying.',
            pois: [
                {
                    id: 'milestone',
                    label: 'Milestone',
                    remark: 'A true Waystone. It asks for nothing and holds you anyway. Note the workmanship: none.',
                },
                {
                    id: 'bedrock-lintels',
                    label: 'Bedrock lintels',
                    remark: 'Numbers carved where no one could hang them. That is what honesty costs.',
                },
                {
                    id: 'rising-cold',
                    label: 'Rising cold',
                    remark: 'The house breathes up from the Foundation. It has been holding that breath a long time.',
                },
            ],
            doors: [{ to: 'ap3-2' }, { to: 'ap3-10' }],
            waystone: true,
        },
        {
            nodeId: 'ap3-2',
            display: '51',
            name: 'The Stair of Unsaying',
            realm: 'path',
            scene: 'a stair descending in half-turns. Every other tread is carved with a word struck through. One tread, mid-flight, stands unstruck. The walls are scraped, as if something wide was dragged up long ago.',
            narration:
                'The philosophers who came down took things back with every step. Retraction is the only cargo that gets lighter as you carry it. One word on this stair was never taken back. Stand on it.',
            pois: [
                {
                    id: 'unstruck-tread',
                    label: 'Unstruck tread',
                    remark: 'IT. Small, load-bearing, and past retraction. Like the best of us.',
                    fragment: { word: 'IT', kind: 'honest' },
                },
                {
                    id: 'struck-through-treads',
                    label: 'Struck-through treads',
                    remark: 'CERTAINLY. OBVIOUSLY. NATURALLY. All retracted, and the stair stands better for it.',
                },
                {
                    id: 'scraped-walls',
                    label: 'Scraped walls',
                    remark: 'Something wide went up. Nothing wide comes down. Draw your conclusions narrowly.',
                },
            ],
            doors: [{ to: 'ap3-1' }, { to: 'ap3-3' }, { to: 'ap3-10' }],
        },
        {
            nodeId: 'ap3-3',
            display: '53',
            name: 'The Hall of Withdrawn Statues',
            realm: 'path',
            scene: 'a long hall of empty niches. The statues were withdrawn, not stolen. Each nameplate has been folded shut like a closed book. One keystone in the vault overhead is carved with a word. It is visibly holding the ceiling.',
            narration:
                'The Archive above keeps what was said. This hall keeps what was unsaid. Every doctrine the house outgrew stood here once, in stone. Each was helped down gently. The vault stands regardless. Look up. What the ceiling rests on was never withdrawn.',
            pois: [
                {
                    id: 'keystone',
                    label: 'Keystone',
                    remark: 'IS. The one verb the house never managed to retire.',
                    fragment: { word: 'IS', kind: 'honest' },
                },
                {
                    id: 'folded-nameplates',
                    label: 'Folded nameplates',
                    remark: 'Retired arguments. The house does not mock them. I do, but quietly.',
                },
                {
                    id: 'empty-niches',
                    label: 'Empty niches',
                    remark: 'Absence, arranged respectfully. The house has manners about its dead.',
                },
            ],
            doors: [{ to: 'ap3-2' }, { to: 'ap3-4' }, { to: 'ap3-11' }],
        },
        {
            nodeId: 'ap3-4',
            display: '55',
            name: 'The Second Waystone',
            realm: 'path',
            scene: 'a granite milestone twin to the first, in a round chamber of undressed rock. Its flank bears a single carved word, worn soft. Bedrock lintels read 55. A ring of old bootprints in the dust, all facing the stone.',
            narration:
                'The second stone. Rest your hand. The house will hold your place. The travellers who made these prints stood a long time. Deciding, I imagine, whether going back was defeat. The stone has an opinion. Read it.',
            pois: [
                {
                    id: 'milestone-flank',
                    label: 'Milestone flank',
                    remark: 'WALKED. Past tense, weight-bearing, and the only epitaph this house respects.',
                    fragment: { word: 'WALKED', kind: 'honest' },
                },
                {
                    id: 'bootprints',
                    label: 'Bootprints',
                    remark: 'All arrivals. No two pairs pointing the same way out. Good sign, if you can bear it.',
                },
                {
                    id: 'bedrock-55',
                    label: 'Bedrock 55',
                    remark: 'Carved in the bone. Should a room upstairs dispute the name, you know the rule.',
                },
            ],
            doors: [{ to: 'ap3-3' }, { to: 'ap3-5' }, { to: 'ap3-12' }],
            waystone: true,
        },
        {
            nodeId: 'ap3-5',
            display: '57',
            name: 'The Gallery of Premises',
            realm: 'path',
            scene: 'a vaulted gallery hung with framed axioms in gilt lettering. GIVEN THAT. IT FOLLOWS. AS ALL AGREE. Their frames are bolted to the walls. Three doors wear bedrock numbers (55, 59). One arch at the gallery\'s end is bare. No number, no plaque, no frame. Dressed stone only, older than the gallery around it.',
            narration:
                'The gallery of premises. Everything here hangs on the wall, and the wall hangs on nothing anyone framed. They counted three doors out of this room. I have counted four since before there were frames. The fourth had nothing to say for itself, which in this house is the highest recommendation.',
            pois: [
                {
                    id: 'framed-axioms',
                    label: 'Framed axioms',
                    remark: 'Bolted down. Premises usually are. It saves them from the indignity of being carried.',
                },
                {
                    id: 'the-bare-arch',
                    label: 'The bare arch',
                    remark: 'No number. Every door in the house tells you where it goes — except the one that goes where the house began.',
                    revealsSecretDoorTo: 'ap3-7',
                },
                {
                    id: 'bedrock-55-59-doors',
                    label: 'Bedrock 55 / 59 doors',
                    remark: 'Named exits, for the label-minded. Both true. Neither first.',
                },
            ],
            doors: [{ to: 'ap3-4' }, { to: 'ap3-6' }, { to: 'ap3-7', secret: true }],
        },
        {
            nodeId: 'ap3-6',
            display: '59',
            name: 'The Third Waystone',
            realm: 'path',
            scene: 'the deepest milestone, in a chamber so quiet the lamps burn without flutter. The stone\'s top hollow holds a palmful of clear water that never evaporates. One word is carved on its flank. Bedrock lintels read 59.',
            narration:
                'The last stone. Past here the house stops offering to remember you. The water in the hollow is its one extravagance. It keeps it for the hands of people who almost turned back. Read the flank. The stone is blunt, this deep.',
            pois: [
                {
                    id: 'milestone-flank',
                    label: 'Milestone flank',
                    remark: 'NOT. The load-bearing word. Every argument worth keeping has one somewhere.',
                    fragment: { word: 'NOT', kind: 'honest' },
                },
                {
                    id: 'water-hollow',
                    label: 'Water hollow',
                    remark: 'Drink or do not. The stone will not judge. The stone has seen everything and judged twice, total.',
                },
                {
                    id: 'quiet-lamps',
                    label: 'Quiet lamps',
                    remark: 'Still air. The Foundation is close. The house holds its breath here, remember.',
                },
            ],
            doors: [{ to: 'ap3-5' }, { to: 'ap3-13' }],
            waystone: true,
        },
        {
            nodeId: 'ap3-7',
            display: '61',
            name: 'The Foundation',
            realm: 'path',
            scene: 'the oldest room. Stones carved and fitted before the maze had a shape. Passages of natural rock. On every face, primitive signs. Wind and water, hills and planets, carved by hands that predate numbers. At the floor\'s centre, a threshold stone with a word worn almost to a shine. Facing it, a blank door of undressed rock and THIRTEEN carved sockets in a long arc. Above the door, no inscription at all.',
            narration:
                'The Foundation. They carved wind and water down here before anyone thought to carve WHY. You have read the house\'s question on every gate: it asks it plainly now, once, in its oldest voice. WHAT ARGUMENT HAS NO FIRST PREMISE? Thirteen beds. Lay what you carried, in walking order. And mind your pocket — my colleague has been generous with you, I am sure.',
            pois: [
                {
                    id: 'threshold-stone',
                    label: 'Threshold stone',
                    remark: 'WON, worn nearly away. The masons carved it, then thought better of leaving it legible. Stand on it. It bears weight. It is the last thing here that does.',
                    fragment: { word: 'WON', kind: 'honest' },
                },
                {
                    id: 'primitive-signs',
                    label: 'Primitive signs',
                    remark: 'Wind, water, hills, planets. The house\'s first vocabulary. No verbs. Verbs came later and caused all this.',
                },
                {
                    id: 'the-thirteen-sockets',
                    label: 'The thirteen sockets',
                    remark: 'The house\'s memory of your walking. It will know forged steps. It has watched every one.',
                },
                {
                    id: 'the-blank-door',
                    label: 'The blank door',
                    remark: 'No number, no name, no lock. It has been unlocked since before locks. That was never the obstacle.',
                },
            ],
            doors: [{ to: 'ap3-5', secret: true }, { to: 'ap3-8', gate: true }],
        },
        {
            nodeId: 'ap3-8',
            display: '65',
            name: 'The Sophist\'s Study',
            realm: 'path',
            scene: 'a small, warm, terribly ordinary room. A desk, a good chair, a bad chair. Three ledgers laid out with the care of relics: the First, Second, and Third. Their signatures are visible. "P.", "Pro-", "-tas." A fourth ledger lies open and blank. A ledger stand.',
            narration:
                'My study. Yes, mine. I signed your paperwork in thirds. You carried my name through the house without feeling the weight. That is how names prefer to travel. The house requires one more ledger before the door. The blank one. It is yours. I only witness.',
            pois: [
                {
                    id: 'three-signed-ledgers',
                    label: 'Three signed ledgers',
                    remark: 'P. Pro. Tas. Assemble it if you like. I was called it when asking was still my trade.',
                },
                {
                    id: 'the-blank-fourth-ledger',
                    label: 'The blank fourth ledger',
                    remark: 'Yours. Blank is the most expensive state a page can be in.',
                },
                {
                    id: 'the-good-chair',
                    label: 'The good chair',
                    remark: 'Mine.',
                },
                {
                    id: 'the-bad-chair',
                    label: 'The bad chair',
                    remark: 'Everyone else\'s. The house\'s one honest joke.',
                },
            ],
            doors: [{ to: 'ap3-7' }, { to: 'ap3-9' }],
        },
        {
            nodeId: 'ap3-9',
            display: '63',
            name: 'The Threshold of the Unfounded',
            realm: 'path',
            scene: 'a passage of natural rock opening onto a stone jamb with no door in it. The Unfounded Door. An empty doorway full of weather from somewhere else. Warm air, salt, a light that is not lamplight. Between the player and the doorway stands the Sophist, visible at last. The scene shows only his shadow, thrown long and horned by the light of the far country.',
            narration:
                'Here is the shame I mentioned. I came down these same stairs with a mind like a locked archive. The house asked me its question. I would not lay a single word down. I had carried my premises too far to admit they were furniture. So I stayed. Warden, narrator, cautionary footnote. You, though. You turned back eleven times. I counted. I always count. Prove the walking one last time. Through me, or past me. There is a third way, if you kept your receipts.',
            pois: [],
            doors: [],
        },
        {
            nodeId: 'ap3-10',
            display: '50',
            name: 'The Anteroom of Almost',
            realm: 'loop',
            scene: 'a comfortable room that resembles the Narthex closely enough to unsettle. A bench, unworn. A brazier, lit. A gilt side table whose drawer-front is carved with a word.',
            narration:
                'The house rebuilt its own front porch down here, from memory, flatteringly. People sit. It is always almost time to decide. The bench is unworn. Do the arithmetic on that.',
            pois: [
                {
                    id: 'gilt-side-table',
                    label: 'Gilt side table',
                    remark: 'GIVEN. Carved into a drawer-front, which is to say: into furniture. Open the drawer. Empty. Things GIVEN usually are.',
                    fragment: { word: 'GIVEN', kind: 'counterfeit' },
                },
                {
                    id: 'lit-brazier',
                    label: 'Lit brazier',
                    remark: 'Fire at last, and it warms a waiting room. The house spends comfort where it costs the most.',
                    trap: 'encounter',
                },
                {
                    id: 'unworn-bench',
                    label: 'Unworn bench',
                    remark: 'Nobody rests here. They only sit.',
                },
            ],
            doors: [{ to: 'ap3-1' }, { to: 'ap3-2' }, { to: 'ap3-11' }],
        },
        {
            nodeId: 'ap3-11',
            display: '52',
            name: 'The Corridor of Therefore',
            realm: 'loop',
            scene: 'a corridor whose floor tiles are inscribed alternately SO and THUS, polished by pacing. A wheeled lectern (its casters worn to flats) bears a carved word on its slope.',
            narration:
                'The corridor where conclusions pace. Back, forth, therefore, back. The lectern has wheels, note. Arguments that travel on furniture arrive exactly where the furniture is pushed.',
            pois: [
                {
                    id: 'wheeled-lectern',
                    label: 'Wheeled lectern',
                    remark: 'BUILT. Carved handsomely into a thing with casters. Weight-bearing? Push it and see.',
                    fragment: { word: 'BUILT', kind: 'counterfeit' },
                },
                {
                    id: 'so-thus-tiles',
                    label: 'SO/THUS tiles',
                    remark: 'Two words taking turns agreeing with each other. The house calls this corridor its metronome.',
                },
            ],
            doors: [{ to: 'ap3-10' }, { to: 'ap3-3' }, { to: 'ap3-12' }],
        },
        {
            nodeId: 'ap3-12',
            display: '54',
            name: 'The Chamber of the Settled',
            realm: 'loop',
            scene: 'a firelit chamber of deep armchairs. Each has a small brass plate naming its last occupant, first names only. A massive carved chest sits where a hearth should be, its lid bearing a word. Four ways out. One under a bedrock 55. One under an IRON-LOOKING 58 whose mortar is suspiciously fresh. Beyond it, glimpsed, a milestone-shaped silhouette.',
            narration:
                'The settled. They chose a chair and the chair agreed with them, and that was that. Two doors ahead claim stones. One of them I built no part of. You recall the rule about rooms that argue.',
            pois: [
                {
                    id: 'carved-chest',
                    label: 'Carved chest',
                    remark: 'EARNED. On a lid. Lids lift. Earnings should not.',
                    fragment: { word: 'EARNED', kind: 'counterfeit' },
                },
                {
                    id: 'brass-plates',
                    label: 'Brass plates',
                    remark: 'First names only. The settled travel light, eventually.',
                    trap: 'encounter',
                },
                {
                    id: 'the-fresh-mortared-58',
                    label: 'The fresh-mortared 58',
                    remark: 'New masonry imitating old bone. The house numbers its bones once — and 55 is already spoken for, three rooms east. Someone here is arguing.',
                },
            ],
            doors: [{ to: 'ap3-11' }, { to: 'ap3-4' }, { to: 'ap3-13' }, { to: 'ap3-14' }],
        },
        {
            nodeId: 'ap3-13',
            display: '56',
            name: 'The Doubtless Hall',
            realm: 'loop',
            scene: 'a proud hall lined with completed proofs under glass, QED after QED, all signed. A freestanding ornate plinth carries a carved word. At the far end a service door stands ajar on blackness, a draft pulling inward. Its hinges are on the OUTSIDE.',
            narration:
                'The hall of finished arguments. Glass over all of them, you notice — finished things need protecting from the air in this house. The far door pulls. Doors that pull are hungry. Hinges on the outside, mind. Nothing in that room ever needed to open it from within.',
            pois: [
                {
                    id: 'display-plinth',
                    label: 'Display plinth',
                    remark: 'FOUND. Freestanding. You could carry it off, word and all, which tells you what the word is worth.',
                    fragment: { word: 'FOUND', kind: 'counterfeit' },
                },
                {
                    id: 'glass-cased-proofs',
                    label: 'Glass-cased proofs',
                    remark: 'Signed and settled. The house keeps them the way the Archive keeps the news: at the moment they stopped.',
                    trap: 'encounter',
                },
                {
                    id: 'the-pulling-door-58',
                    label: 'The pulling door (58)',
                    remark: 'The short way to the resting stone, says the draft. Drafts lie with total sincerity.',
                },
            ],
            doors: [{ to: 'ap3-12' }, { to: 'ap3-6' }, { to: 'ap3-14' }],
        },
        {
            nodeId: 'ap3-14',
            display: '58',
            name: 'The False Waystone',
            realm: 'trap',
            scene: 'at first glance, a Waystone chamber. A milestone, lamps, a number 58 in aged iron. But the milestone is an ALTAR. Worked, polished, stepped, with cushions before it and a donation bowl. The room\'s inner door (64) stands wide and welcoming. The way back to 54 remains open behind.',
            narration:
                'Ah. The house\'s understudy. Study it: a stone with STEPS, cushions for the knees, a bowl for your gratitude. The true stones ask for a hand and give you back your place. This one asks for worship and gives you the door it wants you through. It is furniture pretending to be bone. You may still leave the way you came. I have watched very few do it.',
            pois: [
                {
                    id: 'the-altar-stone',
                    label: 'The altar-stone',
                    remark: 'Polished. Stepped. Upholstered. Weight-bearing it is not — it is BORNE, by cushions and credulity.',
                },
                {
                    id: 'donation-bowl',
                    label: 'Donation bowl',
                    remark: 'Empty. Even the forger\'s patrons had second thoughts, at the end.',
                    trap: 'encounter',
                },
                {
                    id: 'the-welcoming-inner-door-64',
                    label: 'The welcoming inner door (64)',
                    remark: 'Wide open, like all the best mouths.',
                },
            ],
            doors: [{ to: 'ap3-12' }, { to: 'ap3-15' }],
        },
        {
            nodeId: 'ap3-15',
            display: '64',
            name: 'The Still Room',
            realm: 'trap',
            scene: 'a small round room, felt-lined and lamplit. One perfect chair faces a lectern. On it rests a book titled THE COMPLETE ARGUMENT. The door behind has shut without a sound and has no handle on this side. In the floor, a smooth-lipped oculus breathes cold air (60).',
            narration:
                'The still room. Everything a settled mind requires. One chair, one book, no exits worth the name. The book is blank past page one. Page one is very reassuring. When you tire of it, the floor is the only door left that will have you. The house is patient.',
            pois: [
                {
                    id: 'the-complete-argument',
                    label: 'THE COMPLETE ARGUMENT',
                    remark: 'Page one: \'It is settled.\' The remaining pages trust you to stop reading. Everyone does.',
                },
                {
                    id: 'the-perfect-chair',
                    label: 'The perfect chair',
                    remark: 'It fits. That is a property of traps, not of truths.',
                    trap: 'hazard',
                },
                {
                    id: 'the-oculus-60',
                    label: 'The oculus (60)',
                    remark: 'Down, then. The house returns what it cannot digest.',
                },
            ],
            doors: [{ to: 'ap3-16' }],
        },
        {
            nodeId: 'ap3-16',
            display: '60',
            name: 'The Oubliette of the Settled Mind',
            realm: 'trap',
            scene: 'a smooth stone gullet, utterly dark but for a coin of light far above. No doors at all. The fall is broken by a great drift of things. Cushions, chair-legs, gilt frames, altar cloth. A century of confiscated furniture.',
            narration:
                'The oubliette. French for the polite version of what the house does here. It does not keep prisoners. It keeps FURNITURE, and it has never once mistaken a walker for a chair. Up you go. The house is returning you to your last stone. It does this exactly as gently as you deserve, which I am told varies.',
            pois: [],
            doors: [],
            eject: true,
        },
    ],
};
