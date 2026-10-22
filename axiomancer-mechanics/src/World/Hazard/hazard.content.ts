/**
 * Hazard Minigame v2 — authored content.
 *
 * The deck is the design-handoff prototype's ten cards
 * (`hazard-proto-engine.jsx`); the glossary lists only the words they
 * print. Route thresholds are tuned for the no-re-cast dice doctrine
 * (4 dice rolled once per hazard); the evidence lives in
 * `src/World/Hazard/e2e/hazard.balance.sim.test.ts`.
 */

import { HAZARD_TUNING } from './hazard.tuning';
import type {
    HazardCardDef,
    HazardConsequenceId,
    HazardDef,
    HazardKeywordId,
    HazardRewardId,
} from './hazard.types';

/** Card stat bands — the magnitudes the library draws from (see tuning). */
const C = HAZARD_TUNING.cards;
const U = C.utility;

// ---------------------------------------------------------------------------
// Keyword glossary (tap-to-read detail)
// ---------------------------------------------------------------------------

export const HAZARD_KEYWORDS: Record<HazardKeywordId, { name: string; desc: string }> = {
    surge: { name: 'SURGE', desc: 'Drop a matching-colour die on this card for its stronger, lower effect.' },
    force: { name: 'FORCE', desc: 'Brawn against the rock — fills the FORCE meter.' },
    escape: { name: 'ESCAPE', desc: 'Speed across the gap — fills the ESCAPE meter.' },
    convert: { name: 'CONVERT', desc: 'Turn hostile ✕-dice into wild GOLD dice. Minor turns one; major turns them all.' },
    draw: { name: 'DRAW', desc: 'Pull more cards into your hand — more ways to cross.' },
    recast: { name: 'RE-CAST', desc: 'Re-roll all your unspent dice into fresh faces.' },
    gilded: { name: 'GILDED', desc: 'Yellow cards are rare. They give a major effect for free; apply a yellow die to add their numbers.' },
    salvage: { name: 'SALVAGE', desc: 'Drag this card to the bin to scrap it for a lesser benefit instead of playing it.' },
    crack: { name: 'CRACK', desc: 'Dead weight. This card does nothing and cannot be powered. It only clogs your hand.' },
};

// ---------------------------------------------------------------------------
// The draw deck. kind = colour. f/e = FREE values; fp/ep = SURGE values.
// weight = relative frequency in the starter draw bag.
// ---------------------------------------------------------------------------

export const HAZARD_DECK: HazardCardDef[] = [
    // RED — pure FORCE numbers (single meter), considerably higher than purple.
    { id: 'haul', name: 'DEAD-MAN HAUL', kind: 'red', rarity: 'common', weight: 1, f: C.redBlue.common.free, e: 0, fp: C.redBlue.common.powered, ep: 0, salvage: { type: 'mana' }, flavor: 'Drag yourself up by rope and will.', keywords: ['force', 'surge'] },
    { id: 'grip', name: 'IRON GRIP', kind: 'red', rarity: 'uncommon', weight: 1, f: C.redBlue.uncommon.free, e: 0, fp: C.redBlue.uncommon.powered, ep: 0, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Hands like a closing vise.', keywords: ['force', 'surge'] },

    // BLUE — pure ESCAPE numbers (single meter).
    { id: 'scram', name: 'SCRAMBLE', kind: 'blue', rarity: 'common', weight: 1, f: 0, e: C.redBlue.common.free, fp: 0, ep: C.redBlue.common.powered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Half-fall, half-fly across the gap.', keywords: ['escape', 'surge'] },
    { id: 'runner', name: 'CLIFFRUNNER', kind: 'blue', rarity: 'common', weight: 1, f: 0, e: C.redBlue.common.free, fp: 0, ep: C.redBlue.common.powered, salvage: { type: 'mana' }, flavor: 'Momentum is the only thing holding you up.', keywords: ['escape', 'surge'] },
    { id: 'leap', name: 'FAITH LEAP', kind: 'blue', rarity: 'uncommon', weight: 1, f: 0, e: C.redBlue.uncommon.free, fp: 0, ep: C.redBlue.uncommon.powered, salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Close your eyes. Trust the far side.', keywords: ['escape', 'surge'] },

    // PURPLE — low DUAL number (both meters) + a MINOR utility that the die
    // upgrades to MAJOR. The die powers the utility, not the number, so the
    // powered numbers match the free ones by design.
    { id: 'footing', name: 'SURE FOOTING', kind: 'purple', rarity: 'common', weight: 3, f: C.purple.free, e: C.purple.free, fp: C.purple.powered, ep: C.purple.powered, effect: 'draw', drawBase: U.drawMinorBase, drawPowered: U.drawMinorPowered, salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Read the ledge, then send your eyes ahead.', keywords: ['draw', 'surge'] },
    { id: 'windread', name: 'READ THE WIND', kind: 'purple', rarity: 'common', weight: 2, f: C.purple.free, e: C.purple.free, fp: C.purple.powered, ep: C.purple.powered, effect: 'convert', salvage: { type: 'progress', key: 'escape', amount: 1 }, flavor: 'Let the valley turn the hostile gust to your back.', keywords: ['convert', 'surge'] },
    { id: 'pole', name: 'BALANCE POLE', kind: 'purple', rarity: 'uncommon', weight: 2, f: C.purple.strong, e: C.purple.strong, fp: C.purple.strong, ep: C.purple.strong, effect: 'recast', salvage: { type: 'progress', key: 'force', amount: 1 }, flavor: 'Weight in both hands; shake the dice loose and begin again.', keywords: ['recast', 'surge'] },

    // GOLD ("YELLOW") — utility-FIRST: a MAJOR effect for free, and a high
    // DUAL number that only appears once a (wild) gold die is applied. Rare.
    { id: 'oath', name: 'UNBROKEN OATH', kind: 'gold', rarity: 'rare', weight: 1, f: C.gold.free, e: C.gold.free, fp: C.gold.powered, ep: C.gold.powered, effect: 'draw', majorEffect: true, drawBase: U.drawMajor, drawPowered: U.drawMajor, salvage: { type: 'mana' }, flavor: 'You will not fall. You refuse — and the path answers.', keywords: ['gilded', 'draw', 'surge'] },
    { id: 'blessing', name: "PILGRIM'S BLESSING", kind: 'gold', rarity: 'rare', weight: 1, f: C.gold.free, e: C.gold.free, fp: C.gold.strongPowered, ep: C.gold.strongPowered, effect: 'recast', majorEffect: true, salvage: { type: 'mana' }, flavor: 'Something older than the cliff steadies your hand.', keywords: ['gilded', 'recast', 'surge'] },

    // COST CARDS (puzzle-only) — each trades meter points for a utility.
    // A TOLL costs on its free line only, so a die cancels it; a DEBT costs
    // on both lines; an OVERDRIVE pays more when powered and adds a cost on
    // its other meter, which buys a second utility (`poweredEffect`). The
    // live hazard never draws, offers or grants them (`hazardLiveDeck`).
    { id: 'tithe', name: "WAYFARER'S TITHE", kind: 'purple', rarity: 'common', weight: 0, puzzleOnly: true, f: -1, e: -1, fp: 0, ep: 0, effect: 'draw', drawBase: 2, drawPowered: 2, flavor: 'Pay the road a little, and it shows you more of itself.', keywords: ['draw', 'surge'] },
    { id: 'stones', name: 'TURN THE STONES', kind: 'red', rarity: 'common', weight: 0, puzzleOnly: true, f: -2, e: 0, fp: 0, ep: 0, effect: 'reroll', rerollBase: 1, rerollPowered: 2, flavor: 'Pry the loose rocks over. Something steadier lies beneath.', keywords: ['force', 'surge'] },
    { id: 'pawn', name: 'PAWNED BREATH', kind: 'purple', rarity: 'uncommon', weight: 0, puzzleOnly: true, f: -2, e: -2, fp: -2, ep: -2, effect: 'draw', drawBase: 2, drawPowered: 3, poweredEffect: 'gainDie', gainDieBase: 0, gainDiePowered: 1, gainDieKind: 'gold', flavor: 'Spend the air you have not drawn yet. The cliff keeps the ledger.', keywords: ['draw', 'surge'] },
    { id: 'breakneck', name: 'BREAKNECK HAUL', kind: 'red', rarity: 'uncommon', weight: 0, puzzleOnly: true, f: 3, e: 0, fp: 6, ep: -3, effect: 'gainDie', gainDieBase: 0, gainDiePowered: 1, gainDieKind: 'blue', poweredEffect: 'draw', drawBase: 0, drawPowered: 1, flavor: 'Up the rope faster than your legs can follow.', keywords: ['force', 'escape', 'surge', 'draw'] },
    { id: 'headlong', name: 'HEADLONG DIVE', kind: 'blue', rarity: 'uncommon', weight: 0, puzzleOnly: true, f: 0, e: 3, fp: -3, ep: 7, effect: 'gainDie', gainDieBase: 0, gainDiePowered: 1, gainDieKind: 'red', poweredEffect: 'reroll', rerollBase: 0, rerollPowered: 1, flavor: 'Throw yourself at the far side and leave your grip behind.', keywords: ['escape', 'force', 'surge'] },
];

/**
 * Consequence CRACK card — shuffled into the persistent deck by the
 * `deadcard` consequence. Dead: no values, never powerable.
 */
export const HAZARD_CRACK_CARD: HazardCardDef = {
    id: 'crack', name: 'CRACK', kind: 'purple', rarity: 'common', f: 0, e: 0, fp: 0, ep: 0,
    dead: true, flavor: 'The flaw travels with you now.', keywords: ['crack'],
};

/** The cards the live three-round hazard may draw, offer or grant: the deck without its puzzle-only cards. */
export function hazardLiveDeck(): HazardCardDef[] {
    return HAZARD_DECK.filter((c) => !c.puzzleOnly);
}

export function getHazardCardDef(cardId: string): HazardCardDef {
    const def =
        HAZARD_DECK.find((c) => c.id === cardId) ??
        (cardId === HAZARD_CRACK_CARD.id ? HAZARD_CRACK_CARD : undefined);
    if (!def) throw new Error(`Unknown hazard card id: ${cardId}`);
    return def;
}

// ---------------------------------------------------------------------------
// Boon / consequence catalogues
// ---------------------------------------------------------------------------

export const HAZARD_REWARDS: Record<HazardRewardId, { name: string; icon: string; desc: string }> = {
    shillings: { name: 'Shillings', icon: 'chest', desc: `+${HAZARD_TUNING.rewards.shillings} shillings.` },
    riskShillings: { name: 'Shillings', icon: 'chest', desc: `+${HAZARD_TUNING.rewards.riskShillings} shillings.` },
    vitae: { name: 'Restored Vitae', icon: 'heart', desc: `Recover ${HAZARD_TUNING.rewards.vitae} VITAE as the danger passes.` },
};

export const HAZARD_CONSEQUENCES: Record<HazardConsequenceId, { name: string; icon: string; desc: string }> = {
    deadcard: { name: 'Dead Weight', icon: 'deadcard', desc: 'A useless CRACK card is shuffled into your deck.' },
    maxhp: { name: 'Scarred', icon: 'maxhp', desc: `−${HAZARD_TUNING.rewards.maxhpScar} Maximum Vitae until you next rest.` },
    minhp: { name: 'Bleeding', icon: 'minhp', desc: `Lose ${HAZARD_TUNING.rewards.minhpLoss} Vitae immediately.` },
};

/** Vitae restored by the `vitae` reward. */
export const HAZARD_VITAE_REWARD = HAZARD_TUNING.rewards.vitae;
/** Shillings granted by the `shillings` reward. */
export const HAZARD_SHILLINGS_REWARD = HAZARD_TUNING.rewards.shillings;
/** Shillings granted by the `riskShillings` reward. */
export const HAZARD_RISK_SHILLINGS_REWARD = HAZARD_TUNING.rewards.riskShillings;
/** Vitae lost to the `minhp` consequence. */
export const HAZARD_MINHP_LOSS = HAZARD_TUNING.rewards.minhpLoss;
/** Maximum-vitae reduction from the `maxhp` consequence. */
export const HAZARD_MAXHP_SCAR = HAZARD_TUNING.rewards.maxhpScar;

// ---------------------------------------------------------------------------
// Progress types & die faces
// ---------------------------------------------------------------------------

/** Die faces: the four colours plus hostile ✕. Authored in the tuning
 *  module (gold is the wild face); re-exported here for existing imports. */
export { HAZARD_DIE_FACES } from './hazard.tuning';

// ---------------------------------------------------------------------------
// Authored hazards.
//
// Thresholds tuned for the no-re-cast doctrine via Monte-Carlo
// simulation (balance.sim.test.ts): one cast of 4 dice must last all
// 3 rounds, so totals sit well below the prototype's per-round values
// (Safe 12/13/14, Risk 7/7→9/10) which assumed a fresh cast each round.
//
// DIFFICULTY PASS (2026-06-12): playtest reported the crossings had grown
// too easy, so every threshold was raised a step (safe +1/+2/+2 per round,
// risk +0/+1/+1 per meter). The greedy bot's safe perfect rate fell from
// ~60-70% to ~30-40% and risk perfect from ~20% to ~10%, while safe stayed
// near-always at least a partial clear. Bands re-blessed in balance.sim.test.ts.
// ---------------------------------------------------------------------------

export const HAZARD_LIBRARY: HazardDef[] = [
    {
        id: 'cracked-cliff',
        title: 'CRACKED CLIFF PATH',
        scenario: 'The ledge fails underfoot. A shrine cache glints across the split.',
        intro: 'The ledge sheds itself into the dark a stone at a time. Below, the valley is paved with pilgrims who trusted this path. You will join them — the cliff has already decided. Unless…',
        boardHeadline: 'THE SPLIT WIDENS',
        safeBoardNote: 'reach the passage mark to cross',
        riskBoardNote: 'clear both meters to cross',
        safeRouteName: 'LEDGE CRAWL',
        riskRouteName: 'THE LEAP',
        safeRouteDesc: 'One combined meter — any progress counts. Forgiving, but the prize is plain.',
        riskRouteDesc: 'Two meters, both required each round — split your hand between FORCE and ESCAPE.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [20, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[9, 9], [11, 11], [12, 12]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
    {
        id: 'flooded-undercroft',
        title: 'FLOODED UNDERCROFT',
        scenario: 'Black water climbs the crypt stairs. Something below is still breathing.',
        intro: 'Black water swallows the stairs faster than you can climb them. The cold has your legs. The dark has the rest. No one drowns slowly here. The crypt keeps what it fills. Unless…',
        boardHeadline: 'THE WATER RISES',
        safeBoardNote: 'wade the long gallery before it fills',
        riskBoardNote: 'dive the drowned shortcut — both meters',
        safeRouteName: 'THE LONG GALLERY',
        riskRouteName: 'THE DROWNED DOOR',
        safeRouteDesc: 'One combined meter — slow, cold, survivable. The water takes its toll either way.',
        riskRouteDesc: 'Force the door and out-swim the surge. Both meters, every round.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [19, 23, 26], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[8, 10], [10, 12], [11, 13]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
    {
        id: 'ashfall-crossing',
        title: 'ASHFALL CROSSING',
        scenario: 'The burning field exhales. Each gust strips the path a little barer.',
        intro: 'The ash falls warm as breath and does not stop. It fills your bootprints behind you, then your lungs. The field has buried armies without slowing. It will not even notice you. Unless…',
        boardHeadline: 'THE ASH FALLS',
        safeBoardNote: 'hold the cinder ridge to the far side',
        riskBoardNote: 'run the ashfall flat — both meters',
        safeRouteName: 'CINDER RIDGE',
        riskRouteName: 'THE ASH RUN',
        safeRouteDesc: 'One combined meter — keep to the high stones and grind it out.',
        riskRouteDesc: 'A dead sprint under falling ash. Both meters, and the last round is the worst.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [22, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[10, 8], [11, 11], [13, 11]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
    {
        id: 'famine-march',
        title: 'THE FAMINE MARCH',
        scenario: 'The road outlasted the rations days ago. The next well is a rumor.',
        intro: 'Three days since the last crust. Your body has begun eating itself — politely, quietly, the way starvation always does. The road ahead is long and the road behind is longer. You die walking. Unless…',
        boardHeadline: 'THE HUNGER DEEPENS',
        safeBoardNote: 'forage the long way and keep moving',
        riskBoardNote: 'force-march the dry flats — both meters',
        safeRouteName: 'THE FORAGE TRAIL',
        riskRouteName: 'THE DRY FLATS',
        safeRouteDesc: 'One combined meter — grub roots, drink dew, keep your feet moving. Slow starvation against slow progress.',
        riskRouteDesc: 'March straight through on an empty belly. Both meters, every round, or the road keeps you.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [20, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[9, 9], [11, 11], [12, 12]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
    {
        id: 'bandit-hunt',
        title: 'HUNTED BY BANDITS',
        scenario: 'Whistles on both ridges. The road behind is already closed.',
        intro: 'They have your scent, your pace, and your road. Bandits do not chase — they herd, and the gully ahead is the pen. Whatever they leave of you will not need burying. Unless…',
        boardHeadline: 'THE NOOSE TIGHTENS',
        safeBoardNote: 'go to ground and slip the cordon',
        riskBoardNote: 'break through the ambush — both meters',
        safeRouteName: 'GO TO GROUND',
        riskRouteName: 'BREAK THE LINE',
        safeRouteDesc: 'One combined meter — ditch, double back, wade the stream. Lose them slowly or not at all.',
        riskRouteDesc: 'Run straight at the thinnest point of the cordon. Both meters, every round — hesitate and they close.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [19, 23, 26], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[8, 10], [10, 12], [11, 13]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
    {
        id: 'fever-rot',
        title: 'THE CREEPING ROT',
        scenario: 'The marsh air carries the fever. It has already found the cut on your arm.',
        intro: 'The fever came in with the marsh water. It is already past your elbow, drawing black lines toward the heart. Bigger bodies than yours have died of half this. You have a day, perhaps less. Unless…',
        boardHeadline: 'THE FEVER CLIMBS',
        safeBoardNote: 'sweat it out at the hermit fires',
        riskBoardNote: 'cut for the dry hills — both meters',
        safeRouteName: 'THE HERMIT FIRES',
        riskRouteName: 'THE DRY HILLS',
        safeRouteDesc: 'One combined meter — boil the wound, burn the chill, endure. The slow cure costs all the same.',
        riskRouteDesc: 'Outrun the rot to clean air and high ground. Both meters, every round, on failing legs.',
        rounds: 3,
        safe: { key: 'safe', dual: false, thresholds: [22, 23, 25], rewardLabel: 'Normal reward', penaltyVitae: 2 },
        risk: { key: 'risk', dual: true, thresholds: [[10, 8], [11, 11], [13, 11]], rewardLabel: 'More shillings', penaltyVitae: 4 },
    },
];

export function getHazardDef(hazardId: string): HazardDef {
    const def = HAZARD_LIBRARY.find((h) => h.id === hazardId);
    if (!def) throw new Error(`Unknown hazard id: ${hazardId}`);
    return def;
}
