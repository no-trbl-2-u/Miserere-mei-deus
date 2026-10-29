/**
 * Tooltip content presenter.
 *
 * Pure lookup: `(kind, id, state) → { title, body, footnote?, accent? }`.
 * Returns `null` when no content is authored for the requested
 * (kind, id) pair — the calling site renders nothing and the
 * primitive stays defensive.
 *
 * Authored kinds:
 * - `'stat'` — HEART / BODY / MIND.
 * - `'effect'` — engine-sourced; payload-formatted. Body is a terse
 *   stat-effect line derived from `Effect.payload`; the engine
 *   `description` is only a fallback.
 * - `'card'` — engine-sourced via `getCombatCardById(id)`.
 * - `'hazard-keyword'` — engine-sourced via `HAZARD_KEYWORDS[id]`.
 *   The hazard-deck screen's keyword tally chips key
 *   off `HazardKeywordId`; this kind reads the same glossary the
 *   in-hazard card faces already draw from, so the two stay in sync
 *   for free.
 * - `'slot'`, `'burden'`, `'map-node'`, `'chronicle-entry'`,
 *   `'quest-objective'`, `'item-stat'`, `'disabled-action'` — static
 *   tables below.
 *
 * Voice: title in uppercase mono / gothic, body in lowercase
 * chronicle (IM Fell English), footnote in mono for engine numbers.
 * Mirrors `event.engine.ts::preludeChrome` convention.
 */

import { HAZARD_KEYWORDS, lookupEffect } from '@mechanics';

import { getCombatCardById } from '@/state/selectors/combat-cards';
import type { AppStoreState } from '@/state/store';

export type TooltipKind =
    | 'stat'
    | 'affliction'
    | 'blessing'
    | 'effect'
    | 'card'
    | 'hazard-keyword'
    | 'slot'
    | 'burden'
    | 'item-stat'
    | 'chronicle-entry'
    | 'quest-objective'
    | 'map-node'
    | 'disabled-action';

/**
 * Stat-stance accent for tooltip tinting. Maps each base stat / stance
 * to a palette key the primitive resolves to a colour. `'neutral'` is
 * the default — used for content with no clear stat tie.
 */
export type TooltipAccent = 'heart' | 'body' | 'mind' | 'neutral';

export interface TooltipContent {
    title: string;
    body: string;
    footnote?: string;
    /** Optional palette tint; primitive defaults to 'neutral'. */
    accent?: TooltipAccent;
}

const STAT_CONTENT: Record<string, TooltipContent> = {
    HEART: {
        title: 'HEART',
        body: "the will to stay with what's difficult. governs willpower and the keywords that scale by heart.",
        accent: 'heart',
    },
    BODY: {
        title: 'BODY',
        body: 'the weight you carry in the world. governs hp, physical attack, defense, and the keywords that scale by body.',
        footnote: '+1 hp per body point',
        accent: 'body',
    },
    MIND: {
        title: 'MIND',
        body: 'the discipline of attention. governs focus, card cost recovery, and the keywords that scale by mind.',
        footnote: '+1 focus per mind point',
        accent: 'mind',
    },
};

// Disabled action button tooltips. Keys match ActionKey values from
// the combat presenter (only `item` is authored).
const DISABLED_ACTION_CONTENT: Record<string, TooltipContent> = {
    item: {
        title: 'ITEM UNAVAILABLE',
        body: 'Item usage will be available in a future update. Currently no usable items in inventory.',
        accent: 'neutral',
    },
};

// Chronicle + quest-status content, both surfaced on the memoir screen.
//
// Chronicle ids are the 4 engine event types the mapper recognises
// (per `state/presenters/memoir.engine.ts::ChronicleEntry`).
const CHRONICLE_CONTENT: Record<string, TooltipContent> = {
    'combat:ended': {
        title: 'COMBAT · ENDED',
        body: 'a fight resolved one way or another. the body records the outcome — victory, parley, defeat — and the foe who delivered it.',
        footnote: 'engine: combat:ended',
    },
    'character:levelup': {
        title: 'ASCENT',
        body: 'enough experience accumulated to cross a level threshold; you levelled up and gained stat-allocation points.',
        footnote: 'engine: character:levelup',
    },
    'world:moved': {
        title: 'STEP TAKEN',
        body: 'you walked from one node to another on the map. the chronicle keeps the latest passage so the route is not forgotten.',
        footnote: 'engine: world:moved',
    },
    'dialogue:applied': {
        title: 'WORDS EXCHANGED',
        body: 'a dialogue choice landed and its consequence applied — flag set, item given, threshold crossed.',
        footnote: 'engine: dialogue:applied',
    },
};

// Quest-status ids — interpreted as the 3 status buckets the
// memoir screen groups quests under, not per-objective text
// (objectives are already self-describing).
const QUEST_OBJECTIVE_CONTENT: Record<string, TooltipContent> = {
    active: {
        title: 'ACTIVE QUEST',
        body: 'a thread you are currently pulling on. complete each objective to advance; consequences may carry forward into the world.',
        footnote: 'progress lives in player.quests',
    },
    completed: {
        title: 'COMPLETED QUEST',
        body: 'every objective met. the quest stays on the page as a record of what was done; rewards have already applied.',
        footnote: 'no further objectives',
    },
    failed: {
        title: 'FORGOTTEN QUEST',
        body: 'a thread you let slip — the window for it closed, or you chose against it. it lingers here as memoir, not as work.',
        footnote: 'cannot be resumed',
    },
};

// Map-node content. Keys match the NodeType variants emitted by the
// exploration presenter (`encounter | treasure | boss | quest | rest |
// waypoint | hazard | village | door | current`). Each entry: uppercased title + short
// description of what happens when the node is engaged.
const MAP_NODE_CONTENT: Record<string, TooltipContent> = {
    encounter: {
        title: 'ENCOUNTER',
        body: 'a hostile presence stands between you and the next step. step in and the seal closes; fight, parley, or fall.',
        footnote: 'commits combat',
    },
    boss: {
        title: 'BOSS',
        body: 'a named foe — bigger threat, bigger reward. the seal still closes; you cannot flee a boss seal.',
        footnote: 'no retreat',
    },
    treasure: {
        title: 'TREASURE',
        body: 'something left behind for the careful. pick through it; items go to inventory.',
        footnote: 'no combat',
    },
    quest: {
        title: 'QUEST',
        body: 'someone here has work for you. take it, turn it in at the next marker, and take the pay. leave and come back; nothing is spent until you accept.',
        footnote: 'opens the quest screen',
    },
    story: {
        title: 'STORY',
        body: 'a thread of story to be picked up: a scene plays, then the road goes on.',
        footnote: 'plays a scene',
    },
    rest: {
        title: 'REST',
        body: 'a place to mend. recover hp + clear short-duration effects without leaving the map.',
        footnote: 'no combat',
    },
    waypoint: {
        title: 'WAYPOINT',
        body: 'a stretch of road with nothing on it. walk through, and the roads beyond it open.',
        footnote: 'no combat · nothing here',
    },
    hazard: {
        title: 'HAZARD',
        body: 'the ground itself turns against you. a short minigame — read the route, brave it, and you pass; falter and it costs vitae.',
        footnote: 'no combat · costs vitae',
    },
    village: {
        title: 'VILLAGE',
        body: 'a haven of roofs and a forge. a smith for your dice (hone a face, temper a payload, swap gear, upgrade a card) for shillings; nothing here bites — yet.',
        footnote: 'no combat',
    },
    door: {
        title: 'PATH ONWARD',
        body: 'the way out of this region. cross it and the road carries you on to the next map.',
        footnote: 'no combat · leaves this map',
    },
    current: {
        title: 'HERE',
        body: 'where you stand. choose an adjacent node to step toward it.',
        footnote: 'your current position',
    },
};

// Burden bar content. Single id ('burden') keys the inventory burden tooltip.
const BURDEN_CONTENT: Record<string, TooltipContent> = {
    burden: {
        title: 'BURDEN',
        body: 'the weight of what you carry, in stones. high burden slows you and saps endurance; over the cap, what you carry begins to wear on you.',
        footnote: 'shed gear to lighten',
    },
};

// Equipment slot content. Keys match the engine `EquipmentSlot` kinds
// (`weapon | armor | relic`). SELF equipment cells pass the slotKey verbatim as the tooltip
// id.
const SLOT_CONTENT: Record<string, TooltipContent> = {
    weapon: {
        title: 'WEAPON',
        body: 'sword, ledger, censer, voice. the thing you bring to the exchange — primary contributor to physical attack and the action verb.',
    },
    armor: {
        title: 'ARMOR',
        body: 'harness, surcoat, ritual mantle — everything worn on the torso. raw defense; the heaviest single item the burden bar feels.',
    },
    relic: {
        title: 'RELIC',
        body: 'helms, gauntlets, boots, rings, charms — three interchangeable worn things. small numbers; sometimes the only place a particular blessing or sigil appears.',
    },
};

// ---------------------------------------------------------------------------
// Effect payload formatter.
//
// The combat tooltip shows just "Name + the effect on the stats", not
// the engine description. The helpers below format an Effect.payload
// into the shortest line that still names what changed and by how much.
// ---------------------------------------------------------------------------

interface EffectPayloadLike {
    damageOverTime?: { damagePerRound: number; damageType: string };
    actionRestriction?: { skipTurn?: boolean };
}

function sign(n: number): string {
    if (n > 0) return `+${n}`;
    if (n < 0) return `${n}`;
    return '0';
}

/**
 * Derive the accent from a stance key. The bare stances
 * `'heart' | 'body' | 'mind'` map to themselves; anything else returns
 * `'neutral'`.
 */
export function accentForStat(stat: string): TooltipAccent {
    if (stat === 'heart' || stat === 'body' || stat === 'mind') return stat;
    return 'neutral';
}

/**
 * Format `Effect.payload` as a short stat-effect line. Picks the
 * single most-informative summand (DOT first, then action restriction).
 * Returns the engine `description` fallback when the payload carries
 * neither.
 */
export function formatEffectStatEffect(
    payload: EffectPayloadLike | undefined,
    fallback: string,
): string {
    if (!payload) return fallback;
    if (payload.damageOverTime !== undefined) {
        return `${sign(-payload.damageOverTime.damagePerRound)} hp / round`;
    }
    if (payload.actionRestriction?.skipTurn) {
        return 'skip turn';
    }
    return fallback;
}

/**
 * Item-stat tooltip synthesizer. The only stat keys are the bare stances
 * (`heart`, `body`, `mind`), which reuse the `kind:'stat'` copy.
 *
 * Returns `null` for unknown keys so the chip stays silent.
 */
function synthesizeItemStatContent(id: string): TooltipContent | null {
    if (id === 'heart' || id === 'body' || id === 'mind') {
        return STAT_CONTENT[id.toUpperCase()] ?? null;
    }
    return null;
}

/** Derive the accent for an effect from its DoT stance, if any. */
function accentForEffect(payload: EffectPayloadLike | undefined): TooltipAccent {
    if (!payload) return 'neutral';
    if (payload.damageOverTime?.damageType) return accentForStat(payload.damageOverTime.damageType);
    return 'neutral';
}

export function selectTooltipContentFor(
    kind: TooltipKind,
    id: string,
    // Reserved for kinds that need live state (effect-attribution,
    // codex entries). Current authored kinds read engine static data
    // only, so state is unused; the stable signature spares every call
    // site a retrofit.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _state: AppStoreState,
): TooltipContent | null {
    if (kind === 'stat') {
        return STAT_CONTENT[id] ?? null;
    }
    if (kind === 'slot') {
        return SLOT_CONTENT[id] ?? null;
    }
    if (kind === 'burden') {
        return BURDEN_CONTENT[id] ?? null;
    }
    if (kind === 'map-node') {
        return MAP_NODE_CONTENT[id] ?? null;
    }
    if (kind === 'chronicle-entry') {
        return CHRONICLE_CONTENT[id] ?? null;
    }
    if (kind === 'quest-objective') {
        return QUEST_OBJECTIVE_CONTENT[id] ?? null;
    }
    if (kind === 'item-stat') {
        return synthesizeItemStatContent(id);
    }
    if (kind === 'effect') {
        if (!id) return null;
        const def = lookupEffect(id);
        if (!def) return null;
        // Render just the stat-effect line; the engine `description`
        // is the fallback when payload introspection finds nothing
        // usable.
        const body = formatEffectStatEffect(
            def.payload as EffectPayloadLike | undefined,
            def.description,
        );
        return {
            title: def.name.toUpperCase(),
            body,
            accent: accentForEffect(def.payload as EffectPayloadLike | undefined),
        };
    }
    if (kind === 'card') {
        if (!id) return null;
        const card = getCombatCardById(id);
        if (!card) return null;
        return {
            title: card.name,
            body: card.description,
            footnote: `colour ${card.stance.toUpperCase()}`,
            accent: accentForStat(card.stance),
        };
    }
    if (kind === 'hazard-keyword') {
        if (!id) return null;
        const kw = HAZARD_KEYWORDS[id as keyof typeof HAZARD_KEYWORDS];
        if (!kw) return null;
        return {
            title: kw.name,
            body: kw.desc,
            accent: 'neutral',
        };
    }
    if (kind === 'disabled-action') {
        return DISABLED_ACTION_CONTENT[id] ?? null;
    }
    // All other kinds: no content authored yet — return null so
    // the caller can render nothing without crashing.
    return null;
}
