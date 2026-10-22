/**
 * Hazard minigame presenter — maps the v2 engine session
 * (`axiomancer-mechanics` World/Hazard) onto a render-ready view-model. Pure: no store
 * writes, no dice rolls, no rule decisions. The screen renders this VM
 * and dispatches store actions only.
 */

import {
    getHazardCardDef,
    getHazardDef,
    HAZARD_CONSEQUENCES,
    HAZARD_KEYWORDS,
    HAZARD_REWARDS,
} from '@mechanics';
import { dieCanPowerCard, hazardProjectedProgress } from '@mechanics';
import type { AppStoreState } from '@/state/store';
import {
    type HazardCardDef,
    type HazardColor,
    type HazardDieKind,
    type HazardHandEntry,
    type HazardMark,
    type HazardOutcomeTier,
    type HazardPhase,
    type HazardRouteKey,
    type HazardSessionState,
} from '@mechanics';

// ---------------------------------------------------------------------------
// VM shapes
// ---------------------------------------------------------------------------

export interface HazardDieVM {
    id: string;
    kind: HazardDieKind;
    state: 'available' | 'spent';
    isHex: boolean;
    /** Player may pick this die up. */
    usable: boolean;
    temporary: boolean;
    /** Non-colour-only accessibility label, e.g. "Red blade die, available". */
    accessibilityLabel: string;
}

/** A die's latest reroll: `count` replays the tumble when it changes, `order` staggers it among that reroll's dice. */
export interface HazardDieRoll {
    count: number;
    order: number;
}

export interface HazardCardVM {
    uid: string;
    cardId: string;
    name: string;
    kind: HazardColor;
    rarity: 'common' | 'uncommon' | 'rare';
    dead: boolean;
    utility: boolean;
    /** FREE row: stat pair or utility label. */
    free: { force: number; escape: number };
    powered: { force: number; escape: number };
    freeEffectLabel: string | null;
    poweredEffectLabel: string | null;
    flavor: string;
    keywords: { id: string; name: string; desc: string }[];
    /** A usable die (matching colour or the wild gold die) is on the board. */
    dieAvailable: boolean;
    /** Powered by which die (staged cards only). */
    poweredByDieId: string | null;
    /** Applied = locked in (staged cards only): no undo, no die, no bin. */
    applied: boolean;
    /** Discard benefit copy for the trash bin, e.g. "+1 FORCE this round". */
    salvageLabel: string | null;
}

export interface HazardMeterVM {
    key: 'force' | 'escape' | 'passage';
    label: string;
    /** Signed and never clamped: staged costs can push it below zero. */
    value: number;
    /** `value` as printed, with a true minus sign when it is a debt, e.g. "−2". */
    valueLabel: string;
    /** The total is below zero: the meter owes points before it fills. */
    debt: boolean;
    need: number;
    met: boolean;
}

export interface HazardRouteChoiceVM {
    key: HazardRouteKey;
    name: string;
    badge: string;
    /** 'bone' (safer) vs 'sulfur' (better reward). */
    badgeTone: 'bone' | 'sulfur';
    description: string;
    /** One ladder row per meter: label + per-round thresholds. */
    ladder: { key: 'force' | 'escape' | 'passage'; label: string; values: number[] }[];
    rewardLabel: string;
    penaltyLabel: string;
    ctaLabel: string;
    dual: boolean;
}

export interface HazardResolveFlashVM {
    cleared: boolean;
    roundRoman: string;
    verdict: string;
    stats: { key: 'force' | 'escape' | 'passage'; label: string; got: number; need: number; ok: boolean }[];
    /** Momentum carried into the next round, when any (REC#1). */
    carryNote: string | null;
}

export interface HazardBoonVM {
    id: string;
    name: string;
    icon: string;
    desc: string;
}

export interface HazardOutcomeVM {
    tier: HazardOutcomeTier;
    word: string;
    sub: string;
    line: string;
    ctaLabel: string;
    marks: HazardMark[];
}

export interface HazardRewardsVM {
    tier: HazardOutcomeTier;
    rewards: HazardBoonVM[];
    consequences: HazardBoonVM[];
    consequencesLabel: string | null;
    offerCards: HazardCardVM[];
    offerSubLabel: string;
    canSkip: boolean;
    /** e.g. "+2 VITAE — unspent dice" (REC#3); null when zero. */
    reserveNote: string | null;
    /** e.g. "−8 VITAE — route penalty"; null when zero. */
    penaltyNote: string | null;
}

export interface HazardViewModel {
    active: boolean;
    phase: HazardPhase;
    title: string;
    scenario: string;
    boardHeadline: string;
    boardNote: string;
    roundLabel: string;
    roundRoman: string;
    totalRounds: number;
    marks: HazardMark[];
    routeKey: HazardRouteKey | null;
    routeLabel: string;
    routeChoices: HazardRouteChoiceVM[];
    dice: HazardDieVM[];
    diceReady: number;
    hexCount: number;
    bothRequired: boolean;
    meters: HazardMeterVM[];
    /** Safe-route helper line: per-type split of the combined meter. */
    meterDetail: string | null;
    momentumNote: string | null;
    hand: HazardCardVM[];
    play: HazardCardVM[];
    deckCount: number;
    discardCount: number;
    /** Current route's full per-round threshold ladder (REC#2). */
    thresholdLadder: { key: 'force' | 'escape' | 'passage'; label: string; values: number[] }[];
    resolveEnabled: boolean;
    resolveLabel: string;
    resolveSubLabel: string;
    resolveFlash: HazardResolveFlashVM | null;
    outcome: HazardOutcomeVM | null;
    rewards: HazardRewardsVM | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const DIE_WORD: Record<HazardDieKind, string> = {
    red: 'Red blade',
    blue: 'Blue eye',
    purple: 'Purple crescent',
    gold: 'Yellow wild sun',
    hex: 'Blocked hex',
};

function effectLabel(def: HazardCardDef, powered: boolean): string | null {
    // Gold cards are major-tier even on the free row (the die buys numbers).
    const major = powered || def.majorEffect === true;
    if (def.effect === 'draw') return `DRAW ${major ? def.drawPowered ?? def.drawBase ?? 1 : def.drawBase ?? 1}`;
    if (def.effect === 'convert') return major ? 'CONVERT ✕→◆ ALL' : 'CONVERT 1 ✕→◆';
    if (def.effect === 'recast') return major ? 'RE-CAST +DIE' : 'RE-CAST';
    return null;
}

const DIE_LABEL: Record<HazardColor, string> = {
    red: 'RED',
    blue: 'BLUE',
    purple: 'PURPLE',
    gold: 'YELLOW',
};

function salvageLabelOf(def: HazardCardDef): string | null {
    if (!def.salvage) return null;
    if (def.salvage.type === 'mana') return `conjure a ${DIE_LABEL[def.kind]} die`;
    return `+${def.salvage.amount} ${def.salvage.key.toUpperCase()} this round`;
}

function keywordsOf(def: HazardCardDef): { id: string; name: string; desc: string }[] {
    const ids = def.salvage ? [...def.keywords, 'salvage' as const] : def.keywords;
    return ids.map((k) => ({ id: k, ...HAZARD_KEYWORDS[k] }));
}

/** A board die as the hazard screens render it (shared with the puzzle board). */
export function hazardDieVM(d: HazardSessionState['dice'][number]): HazardDieVM {
    return {
        id: d.id,
        kind: d.kind,
        state: d.state,
        isHex: d.kind === 'hex',
        usable: d.kind !== 'hex' && d.state === 'available',
        temporary: d.temporary === true,
        accessibilityLabel: `${DIE_WORD[d.kind]} die, ${
            d.kind === 'hex' ? 'blocked' : d.state
        }${d.temporary ? ', conjured' : ''}`,
    };
}

/** A hand or staged card on a live board (shared with the puzzle board). */
export function hazardEntryCardVM(entry: HazardHandEntry, session: HazardSessionState): HazardCardVM {
    return cardVM(entry, session);
}

function cardVM(entry: HazardHandEntry, session: HazardSessionState): HazardCardVM {
    const def = getHazardCardDef(entry.cardId);
    const dieAvailable =
        !def.dead &&
        session.dice.some((d) => d.state === 'available' && dieCanPowerCard(d.kind, def));
    return {
        uid: entry.uid,
        cardId: entry.cardId,
        name: def.name,
        kind: def.kind,
        rarity: def.rarity,
        dead: def.dead === true,
        utility: def.effect !== undefined,
        free: { force: def.f, escape: def.e },
        powered: { force: def.fp ?? def.f, escape: def.ep ?? def.e },
        freeEffectLabel: effectLabel(def, false),
        poweredEffectLabel: effectLabel(def, true),
        flavor: def.flavor,
        keywords: keywordsOf(def),
        dieAvailable,
        poweredByDieId: entry.dieId,
        applied: entry.applied === true,
        salvageLabel: salvageLabelOf(def),
    };
}

/**
 * Build a static (un-staged) card VM straight from a card id — the
 * same shape the rewards offer uses. Reused so the
 * persistent deck screen and remove-card grid render identical
 * `HazardCard` stock to the in-encounter hand. Unknown ids fall
 * through to the engine's own throw, matching offer behaviour.
 */
export function cardVMFromId(cardId: string): HazardCardVM {
    return offerCardVM(getHazardCardDef(cardId));
}

function offerCardVM(def: HazardCardDef): HazardCardVM {
    return {
        uid: `offer-${def.id}`,
        cardId: def.id,
        name: def.name,
        kind: def.kind,
        rarity: def.rarity,
        dead: def.dead === true,
        utility: def.effect !== undefined,
        free: { force: def.f, escape: def.e },
        powered: { force: def.fp ?? def.f, escape: def.ep ?? def.e },
        freeEffectLabel: effectLabel(def, false),
        poweredEffectLabel: effectLabel(def, true),
        flavor: def.flavor,
        keywords: keywordsOf(def),
        dieAvailable: false,
        poweredByDieId: null,
        applied: false,
        salvageLabel: salvageLabelOf(def),
    };
}

/**
 * The live meters for one round (shared with the puzzle board).
 *
 * Inputs: `route`; `proj`, the projected FORCE and ESCAPE; `need`, the
 * round's threshold (a combined number on safe, `[force, escape]` on risk).
 * Outputs: the meters, and the safe route's per-type split line (null on risk).
 */
export function hazardRouteMeters(
    route: HazardRouteKey,
    proj: { force: number; escape: number },
    need: number | readonly [number, number],
): { meters: HazardMeterVM[]; meterDetail: string | null } {
    const meter = (key: HazardMeterVM['key'], label: string, value: number, needed: number): HazardMeterVM => ({
        key,
        label,
        value,
        valueLabel: hazardSignedNumber(value),
        debt: value < 0,
        need: needed,
        met: value >= needed,
    });
    if (route === 'risk') {
        const [needF, needE] = typeof need === 'number' ? [need, need] : need;
        return {
            meters: [meter('force', 'FORCE', proj.force, needF), meter('escape', 'ESCAPE', proj.escape, needE)],
            meterDetail: null,
        };
    }
    const needed = typeof need === 'number' ? need : need[0] + need[1];
    return {
        meters: [meter('passage', 'PASSAGE — FORCE + ESCAPE', proj.force + proj.escape, needed)],
        meterDetail: `FORCE ${hazardSignedNumber(proj.force)} · ESCAPE ${hazardSignedNumber(proj.escape)} — either type counts`,
    };
}

/**
 * The per-round threshold ladder rows for a route (shared with the puzzle
 * board, whose one round makes a one-value ladder).
 *
 * Inputs: `route`; `thresholds`, one entry per round (a number on safe,
 * `[force, escape]` on risk).
 * Outputs: one ladder row per meter.
 */
export function hazardThresholdLadder(
    route: HazardRouteKey,
    thresholds: readonly (number | readonly [number, number])[],
): HazardViewModel['thresholdLadder'] {
    const pair = (t: number | readonly [number, number]): readonly [number, number] => (typeof t === 'number' ? [t, t] : t);
    if (route === 'risk') {
        return [
            { key: 'force', label: 'FOR', values: thresholds.map((t) => pair(t)[0]) },
            { key: 'escape', label: 'ESC', values: thresholds.map((t) => pair(t)[1]) },
        ];
    }
    return [{ key: 'passage', label: 'PASS', values: thresholds.map((t) => (typeof t === 'number' ? t : t[0] + t[1])) }];
}

function routeChoices(session: HazardSessionState): HazardRouteChoiceVM[] {
    const def = getHazardDef(session.hazardId);
    return [
        {
            key: 'safe',
            name: def.safeRouteName,
            badge: 'SAFER',
            badgeTone: 'bone',
            description: def.safeRouteDesc,
            ladder: [{ key: 'passage', label: 'PASS', values: def.safe.thresholds }],
            rewardLabel: def.safe.rewardLabel,
            penaltyLabel: `−${def.safe.penaltyVitae}♥ per lost round`,
            ctaLabel: 'TAKE SAFE ROUTE ›',
            dual: false,
        },
        {
            key: 'risk',
            name: def.riskRouteName,
            badge: 'BETTER REWARD',
            badgeTone: 'sulfur',
            description: def.riskRouteDesc,
            ladder: [
                { key: 'force', label: 'FOR', values: def.risk.thresholds.map((t) => t[0]) },
                { key: 'escape', label: 'ESC', values: def.risk.thresholds.map((t) => t[1]) },
            ],
            rewardLabel: def.risk.rewardLabel,
            penaltyLabel: `−${def.risk.penaltyVitae}♥ per lost round`,
            ctaLabel: 'TAKE RISK ROUTE ›',
            dual: true,
        },
    ];
}

// ---------------------------------------------------------------------------
// FORCE / ESCAPE glyph key
// ---------------------------------------------------------------------------

/** The legend for the number pair printed on every hazard card. */
export interface HazardStatKeyVM {
    /** One line on how to read the pair. */
    readonly caption: string;
    /** Print order — FORCE first, ESCAPE second, as the card lays them out. */
    readonly rows: readonly { readonly key: 'force' | 'escape'; readonly label: string }[];
}

/**
 * Static copy for the card number-pair key. The
 * pair's meaning never varies with session state, so it is a constant,
 * not a selector — components read it instead of hardcoding the words.
 */
export const HAZARD_STAT_KEY: HazardStatKeyVM = Object.freeze({
    caption: 'Every card bears both marks — FORCE first, ESCAPE second.',
    rows: Object.freeze([
        Object.freeze({ key: 'force' as const, label: 'FORCE' }),
        Object.freeze({ key: 'escape' as const, label: 'ESCAPE' }),
    ]),
});

/**
 * Header over the route screen's opening-hand preview. Pointer-neutral
 * ("choose", not "tap") because the board runs under a mouse on web too
 * (critique pass 92).
 */
export const HAZARD_HAND_LABEL = 'YOUR HAND — CHOOSE A CARD TO READ IT, OR A ROUTE BELOW';

/**
 * Spoken label for a card's FORCE/ESCAPE number pair, so the two
 * unkeyed micro-glyphs are announced by name.
 *
 * Inputs: `force`, `escape` — the pair's two numbers, in print order.
 * Outputs: one string, e.g. "FORCE 3, ESCAPE 1".
 */
export function hazardStatPairLabel(force: number, escape: number): string {
    return `${HAZARD_STAT_KEY.rows[0].label} ${hazardSignedNumber(force)}, ${HAZARD_STAT_KEY.rows[1].label} ${hazardSignedNumber(escape)}`;
}

/**
 * A card or meter number as printed: a cost or a debt takes a true minus
 * sign (U+2212), which reads wider than a hyphen on a small card.
 *
 * Inputs: `n`, a signed value (costs are never clamped).
 * Outputs: e.g. "3", "0", "−2".
 */
export function hazardSignedNumber(n: number): string {
    return n < 0 ? `−${Math.abs(n)}` : `${n}`;
}

/**
 * Spoken value of a staged card: the line it counts now (the powered line
 * once a die sits on it, else the free line), costs included, so a Toll
 * staged without a die is heard as the debt it adds.
 *
 * Inputs: `card`, a staged card's VM.
 * Outputs: e.g. "Counts −2 force, −2 escape.", or "" when both are zero.
 */
export function hazardStagedValueLabel(card: HazardCardVM): string {
    const line = card.poweredByDieId !== null ? card.powered : card.free;
    if (line.force === 0 && line.escape === 0) return '';
    return `Counts ${hazardSignedNumber(line.force)} force, ${hazardSignedNumber(line.escape)} escape.`;
}

/**
 * Spoken progress for a meter. A debt is said as one, so a screen reader
 * hears why a meter with no lit segment still needs more than its goal.
 *
 * Inputs: `meter`.
 * Outputs: e.g. "FORCE progress: debt of 2, goal 4 - not yet met".
 */
export function hazardMeterSpokenLabel(meter: HazardMeterVM): string {
    const status = meter.met ? '- requirement met' : '- not yet met';
    return meter.debt
        ? `${meter.label} progress: debt of ${Math.abs(meter.value)}, goal ${meter.need} ${status}`
        : `${meter.label} progress: ${meter.value} of ${meter.need} ${status}`;
}

const OUTCOME_COPY: Record<HazardOutcomeTier, { word: string; sub: string; line: string; cta: string }> = {
    perfect: {
        word: 'PERFECT',
        sub: 'EVERY ROUND HELD — FLAWLESS PASSAGE',
        line: 'Not one stone gave way beneath you.',
        cta: '✠ CLAIM YOUR DUE ›',
    },
    complete: {
        word: 'COMPLETE',
        sub: 'YOU CROSSED — BLOODIED BUT ALIVE',
        line: 'The far side holds. Some of you stayed behind.',
        cta: '✠ CLAIM YOUR DUE ›',
    },
    failure: {
        word: 'FAILURE',
        sub: 'THE PATH TOOK EVERYTHING',
        line: 'You fall, and the cliff keeps what it caught.',
        cta: '✠ FACE THE COST ›',
    },
};

const EMPTY_VM: HazardViewModel = Object.freeze({
    active: false,
    phase: 'route-select',
    title: '',
    scenario: '',
    boardHeadline: '',
    boardNote: '',
    roundLabel: '',
    roundRoman: 'I',
    totalRounds: 0,
    marks: [],
    routeKey: null,
    routeLabel: '',
    routeChoices: [],
    dice: [],
    diceReady: 0,
    hexCount: 0,
    bothRequired: false,
    meters: [],
    meterDetail: null,
    momentumNote: null,
    hand: [],
    play: [],
    deckCount: 0,
    discardCount: 0,
    thresholdLadder: [],
    resolveEnabled: false,
    resolveLabel: 'PLAY',
    resolveSubLabel: 'STAGE A CARD',
    resolveFlash: null,
    outcome: null,
    rewards: null,
}) as HazardViewModel;

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

export function selectHazardViewModel(state: Pick<AppStoreState, 'hazard'>): HazardViewModel {
    const session = state.hazard?.session ?? null;
    if (!session) return EMPTY_VM;
    const def = getHazardDef(session.hazardId);
    const proj = hazardProjectedProgress(session);
    const isRisk = session.route === 'risk';

    const dice: HazardDieVM[] = session.dice.map(hazardDieVM);

    let meters: HazardMeterVM[] = [];
    let meterDetail: string | null = null;
    let thresholdLadder: HazardViewModel['thresholdLadder'] = [];
    if (session.route === 'risk') {
        ({ meters, meterDetail } = hazardRouteMeters('risk', proj, def.risk.thresholds[session.round - 1]));
        thresholdLadder = hazardThresholdLadder('risk', def.risk.thresholds);
    } else if (session.route === 'safe') {
        ({ meters, meterDetail } = hazardRouteMeters('safe', proj, def.safe.thresholds[session.round - 1]));
        thresholdLadder = hazardThresholdLadder('safe', def.safe.thresholds);
    }

    const momentum = session.progressBase;
    const momentumNote =
        momentum.force > 0 || momentum.escape > 0
            ? `MOMENTUM +${momentum.force + momentum.escape} carried in`
            : null;

    const flash = session.resolveInfo;
    const resolveFlash: HazardResolveFlashVM | null = flash
        ? {
              cleared: flash.cleared,
              roundRoman: ROMAN[flash.round - 1] ?? String(flash.round),
              verdict: flash.cleared ? 'PASSED' : 'FALLEN',
              stats: flash.dual
                  ? [
                        { key: 'force', label: 'FORCE', got: flash.force, need: flash.needF ?? 0, ok: flash.force >= (flash.needF ?? 0) },
                        { key: 'escape', label: 'ESCAPE', got: flash.escape, need: flash.needE ?? 0, ok: flash.escape >= (flash.needE ?? 0) },
                    ]
                  : [
                        { key: 'passage', label: 'PASSAGE', got: flash.combined ?? 0, need: flash.need ?? 0, ok: (flash.combined ?? 0) >= (flash.need ?? 0) },
                    ],
              carryNote:
                  flash.carryForce + flash.carryEscape > 0
                      ? `MOMENTUM — ${flash.carryForce + flash.carryEscape} surplus carries to round ${
                            ROMAN[flash.round] ?? flash.round + 1
                        }`
                      : null,
          }
        : null;

    const outcome = session.outcome;
    const outcomeVM: HazardOutcomeVM | null =
        outcome && (session.phase === 'outcome' || session.phase === 'rewards' || session.phase === 'done')
            ? {
                  tier: outcome.tier,
                  word: OUTCOME_COPY[outcome.tier].word,
                  sub: OUTCOME_COPY[outcome.tier].sub,
                  line: OUTCOME_COPY[outcome.tier].line,
                  ctaLabel: OUTCOME_COPY[outcome.tier].cta,
                  marks: session.marks,
              }
            : null;

    const rewardsVM: HazardRewardsVM | null = outcome
        ? {
              tier: outcome.tier,
              rewards: outcome.rewards.map((r) => ({ id: r, ...HAZARD_REWARDS[r] })),
              consequences: outcome.consequences.map((c) => ({ id: c, ...HAZARD_CONSEQUENCES[c] })),
              consequencesLabel:
                  outcome.consequences.length > 0
                      ? `☠ CONSEQUENCES — ${outcome.losses} ROUND${outcome.losses > 1 ? 'S' : ''} LOST`
                      : null,
              offerCards: outcome.offerCards.map(offerCardVM),
              offerSubLabel:
                  outcome.tier === 'perfect'
                      ? 'GUARANTEED RARE · CHOOSE ONE OR SKIP'
                      : outcome.wins <= 1
                        ? 'CHOOSE ONE · NO RARE THIS TIME'
                        : 'CHOOSE ONE OF THREE',
              canSkip: outcome.canSkip,
              reserveNote:
                  outcome.reserveBonus > 0
                      ? `+${outcome.reserveBonus} VITAE — unspent dice held in reserve`
                      : null,
              penaltyNote:
                  outcome.penaltyVitae > 0 ? `−${outcome.penaltyVitae} VITAE — route penalty` : null,
          }
        : null;

    // PLAY arms as soon as anything is staged — pressing it auto-applies
    // every staged card (the engine fires their utilities) and resolves.
    const staged = session.play.length;
    const canResolve = session.phase === 'playing' && staged > 0;
    const resolveSubLabel = staged === 0 ? 'STAGE A CARD' : 'RESOLVE';

    return {
        active: true,
        phase: session.phase,
        title: def.title,
        scenario: def.scenario,
        boardHeadline: def.boardHeadline,
        boardNote: isRisk ? def.riskBoardNote : def.safeBoardNote,
        roundLabel: `ROUND ${ROMAN[session.round - 1]} / ${ROMAN[session.totalRounds - 1]}`,
        roundRoman: ROMAN[session.round - 1] ?? String(session.round),
        totalRounds: session.totalRounds,
        marks: session.marks,
        routeKey: session.route,
        routeLabel: session.route === null ? '' : isRisk ? 'RISK ROUTE' : 'SAFE ROUTE',
        routeChoices: session.phase === 'route-select' ? routeChoices(session) : [],
        dice,
        diceReady: dice.filter((d) => d.usable).length,
        hexCount: dice.filter((d) => d.isHex).length,
        bothRequired: isRisk,
        meters,
        meterDetail,
        momentumNote,
        hand: session.hand.map((h) => cardVM(h, session)),
        play: session.play.map((p) => cardVM(p, session)),
        deckCount: session.drawPile.length,
        discardCount: session.discardPile.length,
        thresholdLadder,
        resolveEnabled: canResolve,
        resolveLabel: 'PLAY',
        resolveSubLabel,
        resolveFlash,
        outcome: outcomeVM,
        rewards: session.phase === 'rewards' || session.phase === 'done' ? rewardsVM : null,
    };
}

/** True while a hazard session is active — drives `<HazardGate>`. */
export function selectHasActiveHazard(state: Pick<AppStoreState, 'hazard'>): boolean {
    return state.hazard?.session != null;
}
