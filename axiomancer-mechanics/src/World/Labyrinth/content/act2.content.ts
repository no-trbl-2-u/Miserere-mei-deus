/**
 * Act II — The Archive (`aporia-archive`).
 *
 * Authored content transcribed from `plan/labyrinth/acts/act2.md`
 * (solution and validation data: `plan/labyrinth/acts/act2.solution.md`).
 */

import type { LabyrinthActDef } from '../types';

const ACT2_RIDDLE = 'What does the true argument stand on?';

export const ACT2: LabyrinthActDef = {
    id: 'act2',
    mapName: 'aporia-archive',
    title: 'Act II — The Archive',
    entry: 'ap2-1',
    questRoom: 'ap2-8',
    bossRoom: 'ap2-9',
    bossSlug: 'death-beholder',
    descent: 'act3',
    riddle: ACT2_RIDDLE,
    gates: [
        {
            roomId: 'ap2-7',
            to: 'ap2-8',
            riddle: ACT2_RIDDLE,
            answer: ['IT', 'RESTS', 'ON', 'NOTHING'],
            refusalLines: [
                'The catalogue has no such holding.',
                'Right words, wrong shelving.',
                'Still keeping your guesses. The pile grows characterful.',
            ],
            successLine: 'The slate door pivots. The Archive files your answer under TRUE.',
        },
    ],
    rooms: [
        {
            nodeId: 'ap2-1',
            display: '33',
            name: 'The Deposit Desk',
            realm: 'path',
            scene: 'A counter of black oak under a rotunda. Behind it, pigeon holes to the ceiling. Each has a brass ring where a tag once hung. Every ring is empty. Three ways out: iron 35 over a broad arch, iron 34 under a clerestory, iron 36 past the desk. A bell on the counter, its clapper removed.',
            narration: 'The Archive. Every argument surrendered at the door is shelved here, catalogued, and quietly corrected. Mind the shelving. It closes behind readers the way minds do. You will be asked, below, what the true argument stands on. The holdings are extensive. The answer is not on display. Also — my colleague the forger works these halls now. He carves nicely. Ask the catalogue what it owns.',
            pois: [
                {
                    id: 'empty-pigeon-holes',
                    label: 'Empty pigeon holes',
                    remark: 'Receipts for every surrendered certainty. Redeemable never.',
                },
                {
                    id: 'clapperless-bell',
                    label: 'Clapperless bell',
                    remark: 'For assistance. The house removed the part that assists.',
                },
                {
                    id: 'iron-numbers',
                    label: 'Iron numbers',
                    remark: 'Set by the masons when the walls were young. Nothing hung. Remember the difference.',
                },
            ],
            doors: [
                { to: 'ap2-2' },
                { to: 'ap2-10' },
                { to: 'ap2-11' },
            ],
        },
        {
            nodeId: 'ap2-2',
            display: '35',
            name: 'Stacks West',
            realm: 'path',
            scene: 'Stacks in long ranks, spines out, all blank. A brass turnstile fills the far arch under iron 39 — oiled, silent, plainly one-directional. A reading stand holds a single open folio. Exits: back to 33, sideways to 34, and the turnstile.',
            narration: 'Blank spines. The Archive does not advertise. The turnstile ahead turns one way, like most of the decisions that matter. Through it lies the Catalogue, which is the building\'s memory and the only honest gossip in the house.',
            pois: [
                {
                    id: 'open-folio',
                    label: 'Open folio',
                    remark: 'Shelf-mark XI.iv. The word is carved into the stand beneath it. Someone meant it to outlast the paper.',
                    fragment: { word: 'IT', kind: 'honest' },
                },
                {
                    id: 'turnstile',
                    label: 'Turnstile',
                    remark: 'It will not object to your going. It objects to regret.',
                },
                {
                    id: 'blank-spines',
                    label: 'Blank spines',
                    remark: 'The titles are inside. Commitment is required.',
                },
            ],
            doors: [
                { to: 'ap2-1' },
                { to: 'ap2-10' },
                { to: 'ap2-3' },
            ],
        },
        {
            nodeId: 'ap2-3',
            display: '39',
            name: 'The Catalogue',
            realm: 'path',
            scene: 'A vaulted hall filled by one piece of furniture. A card catalogue the size of a granary, drawers labelled I through XVII. A standing ledger chained to a lectern. Iron 41 beyond. An open stair arch under iron 40.',
            narration: 'The Catalogue. Seventeen stacks, listed and loved. The Archive remembers its own — ask it before you believe anything carved in this wing. I will wait. Reading has always been the fastest way to slow a person down.',
            pois: [
                {
                    id: 'chained-ledger',
                    label: 'Chained ledger',
                    remark: 'Stack XI: dicta and definite articles. Stack XIV: cartography, honest and otherwise. Stack XVII: atlases of nowhere. Returned, it says. Returned whence, it does not say.',
                },
                {
                    id: 'lectern-base',
                    label: 'Lectern base',
                    remark: 'RESTS, carved into the lectern base, shelf-mark XIV.ii. In the ledger: honest work.',
                    fragment: { word: 'RESTS', kind: 'honest' },
                },
                {
                    id: 'drawer-xvii',
                    label: 'Drawer XVII',
                    remark: 'Empty. Catalogued, beloved, and not on the floor. A room can be misfiled as easily as a book.',
                },
                {
                    id: 'stair-arch',
                    label: 'Stair arch',
                    remark: 'The Stair of Returns. Everything in this building comes back eventually except time.',
                },
            ],
            doors: [
                { to: 'ap2-4' },
                { to: 'ap2-12' },
            ],
        },
        {
            nodeId: 'ap2-4',
            display: '41',
            name: 'The Misfiled Wing',
            realm: 'path',
            scene: 'A wing of rolling stacks on floor rails, numbered in iron I through XVI. Sixteen stacks. The rails run PAST stack XVI and under the end wall. A return slot gapes there at knee height (44). A side door under iron 37.',
            narration: 'Sixteen stacks. The catalogue is rarely wrong and never modest. Do the arithmetic yourself. Mind the slot in the end wall. The Archive takes returns seriously and questions later.',
            pois: [
                {
                    id: 'floor-rails',
                    label: 'Floor rails',
                    remark: 'Rails do not run to walls for nothing. Things roll. Walls, occasionally, are rolled to.',
                },
                {
                    id: 'stack-xvi',
                    label: 'Stack XVI',
                    remark: 'The last stack, allegedly. It sits on its rails like a guilty man sits on a secret.',
                    revealsSecretDoorTo: 'ap2-6',
                },
                {
                    id: 'return-slot',
                    label: 'Return slot',
                    remark: 'One-way, like confession. I would not.',
                },
            ],
            doors: [
                { to: 'ap2-3' },
                { to: 'ap2-5' },
                { to: 'ap2-16' },
                { to: 'ap2-6', secret: true },
            ],
        },
        {
            nodeId: 'ap2-5',
            display: '37',
            name: 'The Map Room',
            realm: 'path',
            scene: 'Chart tables. A globe worn bald at the equator by fingers. A wall of maps whose coastlines do not agree. One map is framed in iron rather than wood.',
            narration: 'Cartography, honest and otherwise. Stack fourteen\'s overflow. Maps are arguments drawn badly on purpose — every one of them stands somewhere it cannot show.',
            pois: [
                {
                    id: 'iron-framed-map',
                    label: 'Iron-framed map',
                    remark: 'Shelf-mark IX.i. A map of the Aporia itself, drawn by someone who clearly never left this room. The word is carved into the frame.',
                    fragment: { word: 'ON', kind: 'honest' },
                },
                {
                    id: 'bald-globe',
                    label: 'Bald globe',
                    remark: 'Rubbed to the plaster by people checking whether the world was still there. Results inconclusive.',
                },
            ],
            doors: [
                { to: 'ap2-4' },
            ],
        },
        {
            nodeId: 'ap2-6',
            display: '43',
            name: 'The Restorer\'s Bench',
            realm: 'path',
            scene: 'Stack XVII\'s hidden bay, repurposed: a long bench of tools for mending books — knives, paste, gold leaf, a press. On the press, a repaired folio titled ATLASES OF NOWHERE, its shelf-mark XVII.i stamped fresh. Beyond, an honest iron 45.',
            narration: 'The restorer worked where no one could ask him questions. Sensible man. He mended what the Archive would not admit was broken. Every spine in this room was once a lie with a loose cover.',
            pois: [
                {
                    id: 'repaired-folio',
                    label: 'Repaired folio',
                    remark: 'Atlases of Nowhere, XVII.i. Under the title, carved into the press itself, the restorer left his opinion of what such an atlas depicts.',
                    fragment: { word: 'NOTHING', kind: 'honest' },
                },
                {
                    id: 'gold-leaf',
                    label: 'Gold leaf',
                    remark: 'Gilding is honest about being decoration. Rare virtue.',
                },
            ],
            doors: [
                { to: 'ap2-4', secret: true },
                { to: 'ap2-7' },
            ],
        },
        {
            nodeId: 'ap2-7',
            display: '45',
            name: 'The Gate of Assent',
            realm: 'path',
            scene: 'A door of stacked slate, no handle. A lectern with FOUR carved sockets. Above: "SAY THE GROUND."',
            narration: 'The house asks again. What does the true argument stand on? You have been in its library. You have seen what it keeps and what it will not shelve. Lay the words in walking order. Forgeries will be checked against the catalogue. Everything is, eventually.',
            pois: [],
            doors: [
                { to: 'ap2-6' },
                { to: 'ap2-8', gate: true },
            ],
        },
        {
            nodeId: 'ap2-8',
            display: '46',
            name: 'The Index\'s Antechamber',
            realm: 'path',
            scene: 'A copying room. One desk, one chair, one lamp. Ten thousand slips of paper pinned to every surface, each bearing one crossed-out word. A ledger stand (the act quest board). The far door (47) has no number. Its iron was pried off.',
            narration: 'Beyond that door the Index is compiling. It has been compiling since before I came, and it is nearly up to the letter A. The house requires its paperwork first. It always does.',
            pois: [
                {
                    id: 'crossed-out-slips',
                    label: 'Crossed-out slips',
                    remark: 'Entries the Index rejected. Note the quantity. It has standards, just not mercy.',
                },
                {
                    id: 'pried-off-number',
                    label: 'Pried-off number',
                    remark: 'The Index filed the number under N. This is what thoroughness does to a building.',
                },
            ],
            doors: [
                { to: 'ap2-7' },
                { to: 'ap2-9' },
            ],
        },
        {
            nodeId: 'ap2-9',
            display: '47',
            name: 'The Spine',
            realm: 'path',
            scene: 'The Archive\'s structural core. A shaft of galleries around a column of clasped ledgers, rising out of sight. Coiled around the column, reading, a golem of misfiled truths. The Index. Card drawers for ribs, a spine of actual spines.',
            narration: 'The Index. Every fact that was filed where it did not belong, given legs and a grudge. It knows where everything is, which is not the same as knowing anything. Do not let it cite you.',
            pois: [],
            doors: [],
        },
        {
            nodeId: 'ap2-10',
            display: '34',
            name: 'The Periodicals Rotunda',
            realm: 'loop',
            scene: 'A round reading room, racks of broadsheets on poles, all dated the same day. A carved plinth by the window with a stone sample bolted to it.',
            narration: 'The news, preserved at the moment it stopped being true. The rotunda connects to everything, which is how it avoids arriving anywhere. Readers loved it here. Note the tense.',
            pois: [
                {
                    id: 'stone-sample',
                    label: 'Stone sample',
                    remark: 'Carved, and carving STONE into stone shows a certain wit. Shelf-mark III.ix, it claims. Claims want checking.',
                    fragment: { word: 'STONE', kind: 'counterfeit' },
                },
                {
                    id: 'same-dated-broadsheets',
                    label: 'Same-dated broadsheets',
                    remark: 'Circulation. The word does all its own work here.',
                    trap: 'encounter',
                },
            ],
            doors: [
                { to: 'ap2-1' },
                { to: 'ap2-2' },
                { to: 'ap2-11' },
                { to: 'ap2-12' },
            ],
        },
        {
            nodeId: 'ap2-11',
            display: '36',
            name: 'The Scriptorium',
            realm: 'loop',
            scene: 'Rows of copy desks, ink dried in the wells to little black mirrors. One desk\'s writing slope is carved with a heavy word and a neat mark. The copyists\' stools all face it like a pulpit.',
            narration: 'Where the Archive made its copies, and its copies made mistakes, and the mistakes were archived. Genealogy in this house is complicated. The desk they all face carved its opinion loudly. Loud is not shelved.',
            pois: [
                {
                    id: 'carved-slope',
                    label: 'Carved slope',
                    remark: 'STANDS, mark V.v. A verb, pretending to be load-bearing. The catalogue has never heard of it.',
                    fragment: { word: 'STANDS', kind: 'counterfeit' },
                },
                {
                    id: 'dried-ink-wells',
                    label: 'Dried ink wells',
                    remark: 'Every argument here ran dry mid-sentence. There is a lesson in that I decline to copy out.',
                },
            ],
            doors: [
                { to: 'ap2-1' },
                { to: 'ap2-10' },
                { to: 'ap2-13' },
            ],
        },
        {
            nodeId: 'ap2-12',
            display: '40',
            name: 'The Stair of Returns',
            realm: 'loop',
            scene: 'A switchback stair from the rotunda up to the Catalogue. Its iron 40 is bolted to the newel. Over the arch somebody has HUNG a painted plaque reading 45, on new rope. On the landing, a lectern carved with a word and a mark.',
            narration: 'The Stair of Returns, where everything comes back. Someone has hung it a flattering new number. Iron was set by the masons. Rope arrives later, like opinions. Climb by the iron.',
            pois: [
                {
                    id: 'hung-plaque',
                    label: 'Hung plaque',
                    remark: 'New rope, old trick. The gate is not a thing you stumble into on a stair.',
                },
                {
                    id: 'carved-lectern',
                    label: 'Carved lectern',
                    remark: 'FAITH, mark XIII.iii. Movingly carved. The catalogue is unmoved.',
                    fragment: { word: 'FAITH', kind: 'counterfeit' },
                },
                {
                    id: 'iron-40',
                    label: 'Iron 40',
                    remark: 'Bolted before your grandmother argued her first point. Trust the bolted.',
                },
            ],
            doors: [
                { to: 'ap2-10' },
                { to: 'ap2-3' },
                { to: 'ap2-13' },
            ],
        },
        {
            nodeId: 'ap2-13',
            display: '42',
            name: 'The Bindery',
            realm: 'loop',
            scene: 'Sewing frames, glue pots gone amber, a guillotine for trimming text blocks. A gilded word shines on the spine of a display binding, mark stamped beneath.',
            narration: 'Where loose pages were made to agree. The tools are persuasive. The display copy is the forger\'s masterwork — gold on the spine and nothing sewn behind it.',
            pois: [
                {
                    id: 'display-binding',
                    label: 'Display binding',
                    remark: 'UPON, mark VIII.viii, tooled in gold deep enough to pass for carving. A preposition with delusions of grandeur. Open it. Blank. Bindings are promises. Contents are arguments.',
                    fragment: { word: 'UPON', kind: 'counterfeit' },
                },
                {
                    id: 'guillotine',
                    label: 'Guillotine',
                    remark: 'For trimming overhang. The Archive dislikes margins wider than their meaning.',
                    trap: 'hazard',
                },
            ],
            doors: [
                { to: 'ap2-11' },
                { to: 'ap2-12' },
                { to: 'ap2-14' },
            ],
        },
        {
            nodeId: 'ap2-14',
            display: '48',
            name: 'The Unshelved Corridor',
            realm: 'loop',
            scene: 'A service corridor stacked with unprocessed crates. At the end, a freight hatch (38) propped open by a crate corner — its counterweight rope plainly cut. A crate lid leans against the wall, a word chalked-then-chiseled into it.',
            narration: 'Backlog. The Archive\'s conscience, in crates. The hatch at the end goes down to the weighing room. It has not come back up since the rope was cut. I mention the rope because no one looks up. No one ever looks up.',
            pois: [
                {
                    id: 'freight-hatch',
                    label: 'Freight hatch',
                    remark: 'Counterweightless. A one-way argument if I ever heard one.',
                },
                {
                    id: 'chiseled-crate-lid',
                    label: 'Chiseled crate lid',
                    remark: 'PROOF, it says. No mark at all — the forger was rushed, or honest for once, which for him is the same feeling.',
                    fragment: { word: 'PROOF', kind: 'counterfeit' },
                },
            ],
            doors: [
                { to: 'ap2-13' },
                { to: 'ap2-15' },
            ],
        },
        {
            nodeId: 'ap2-15',
            display: '38',
            name: 'The Weight of Volumes',
            realm: 'trap',
            scene: 'The weighing room below: a floor-scale big enough for a cart, heaped with water-swollen books being weighed against iron ingots. The freight hatch is a smooth ceiling square, ropeless.',
            narration: 'They weighed the holdings here, when the Archive briefly believed truth had mass. The finding was inconclusive and the hatch rope was cut in the ensuing dispute. Scholarship. The way out is the way returns go — through the slot, eventually.',
            pois: [
                {
                    id: 'floor-scale',
                    label: 'Floor-scale',
                    remark: 'Four hundredweight of certainty on the left, iron on the right. Iron is winning.',
                },
                {
                    id: 'ceiling-hatch',
                    label: 'Ceiling hatch',
                    remark: 'File your objection with the crates.',
                    trap: 'encounter',
                },
            ],
            doors: [
                { to: 'ap2-16' },
            ],
        },
        {
            nodeId: 'ap2-16',
            display: '44',
            name: 'The Return Slot',
            realm: 'trap',
            scene: 'The receiving room of the return chute from the Misfiled Wing. A canvas-lined hopper. A sorting table. A service stair climbing long and dark toward the rotunda (34), its door hinged outward only.',
            narration: 'Returns are received, inspected, and released with a warning. The stair is long and minds its own business. Up you go — the rotunda has missed you, the way round things miss everything.',
            pois: [
                {
                    id: 'canvas-hopper',
                    label: 'Canvas hopper',
                    remark: 'Everything the Wing rejected arrives here soft. Consider the courtesy.',
                    trap: 'encounter',
                },
                {
                    id: 'sorting-table',
                    label: 'Sorting table',
                    remark: 'Sorted: damaged, doubtful, dangerous. The third pile is the largest. It always is.',
                },
                {
                    id: 'service-stair',
                    label: 'Service stair',
                    remark: 'Outward hinges. The Archive forgives, in one direction.',
                },
            ],
            doors: [
                { to: 'ap2-15' },
                { to: 'ap2-10' },
            ],
        },
    ],
};
