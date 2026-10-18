/**
 * Screen-level presenter for `app/event` (full-screen modal).
 *
 * Composes `EventViewModel` from the mobile event slice
 * (`state.event.pending` + `state.event.dialogueCursor`) populated by
 * `eventActions.resolveCurrentMapEvent()` after `resolveMapEvent(state)`.
 * Two VM kinds drive screen behaviour: `'combat-prelude'` (foe intro
 * -> startCombat) and `'narrative-choice'` (prose + choices ->
 * applyDialogue or auto-resolve).
 *
 * Rules: two VM kinds only; each choice carries both a description and
 * machine-readable consequences; art resolves through a mobile-local
 * slug (see `event-assets.ts`); mid-combat events are out of scope;
 * long bodies get a skip affordance.
 *
 * Engine surface (`@mechanics`): pure `resolveMapEvent(state)` returns
 * `{ state, event }` where `event` is the `ResolvedEvent` union (one
 * member per map-event kind, plus 'none').
 */

import type {
    ActiveEffect,
    DialogueChoice,
    DialogueContext,
    DialogueNode,
    DialogueTree,
    Encounter,
    Item,
    NPC,
    ResolveMapEventResult,
    ResolvedEvent,
} from '@mechanics';
import { getDialogueNode, visibleChoices } from '@mechanics';

import { ENCOUNTER_ENEMY_HP_MULTIPLIER, withScaledEnemyHp } from '../actions';
import type { AppStoreState } from '../store';
import {
    defaultBodyForEvent,
    selectEventArtSlug,
    type EventArtSlug,
} from './event-assets';
import { freezeViewModel } from './freeze';
import { toRomanLower } from './roman';

export type EventKind = 'combat-prelude' | 'narrative-choice';
// 'gather' is the gathering acknowledgement card (see `composeGathering`).
// There is no 'rest' variant: rest events start the rest-choice node and
// never reach this VM.
export type EventVariant = 'encounter' | 'boss' | 'quest' | 'npc' | 'gather';
export type ChoiceAccentKey = 'blood' | 'sulfur' | 'parchment' | 'bone' | 'rust';

export type ConsequenceKind =
    | 'damage'
    | 'heal'
    | 'currency'
    | 'item'
    | 'flag'
    | 'quest-start'
    | 'quest-progress'
    | 'card-learn';

export interface EventConsequence {
    kind: ConsequenceKind;
    amount?: number;
    label?: string;
}

export interface EventChoice {
    /** Stable choice id. For combat-prelude: `'fight'` | `'flee'`. For dialogue: the choice's index in the raw `node.choices` list, as a string (see `composeNpcDialogue`). */
    id: string;
    label: string;
    description: string;
    consequences: ReadonlyArray<EventConsequence>;
    iconKey: string;
    accentKey: ChoiceAccentKey;
    enabled: boolean;
    /**
     * Chrome subtitle rendered below the button label (italic, bone-
     * color, smaller font): a `'ix · vi vitae · adv. unknown'`-style
     * cost/consequence preview. `null` when no subtitle should render (default for
     * narrative-choice dialogue branches; combat-prelude populates
     * via the enemy-stats / retreat ritual lines below).
     *
     * Distinct from `description` (which is the deeper "Combat ·
     * turns" / "Luck Save" line the modal sometimes ships above
     * the button) and from `consequences` (the structured kind /
     * amount data the engine reads for actual effects). Subtitle is
     * pure chrome.
     */
    subtitle: string | null;
    /**
     * Plain-language decode of the lore subtitle, rendered beneath
     * the ritual-register subtitle in parchment mono. Translates
     * Roman numerals and jargon into readable game terms so new
     * players can parse the cost without memorizing the notation.
     * `null` when no decode should render.
     */
    decode: string | null;
}

/**
 * Combat-prelude chrome strings, populated only on `kind: 'combat-prelude'`
 * VMs: the header-strip eyebrow, the diagonal "STRIFE STIRS" sash over
 * the illustration, the non-dismissible SEALED · NO RETREAT chain bars,
 * the FLEE-disabled hint and the doom line. Routing them through the VM
 * keeps the view layer free of inline literals per Hard Rule #8 — the screen
 * reads `vm.preludeChrome` and paints if set, or returns null when the
 * field is null (narrative-choice variants).
 */
export interface PreludeChrome {
    /** Eyebrow text rendered in the header strip above the illustration. */
    eyebrow: string;
    /** Label on the diagonal sash overlaying the illustration top-left. */
    sashLabel: string;
    /**
     * The irreversible-commitment label (`SEALED · NO RETREAT`). Drawn
     * by the encounter overlay's chain bars until phase CR1b retired the
     * overlay; no screen renders it now.
     */
    sealLabel: string;
    /**
     * Hint rendered beneath the FLEE button when the choice is
     * disabled (typically on boss encounters where the engine event
     * VM marks the flee choice `enabled: false`). Single source of
     * truth for the "no retreat" copy across modal variants.
     */
    fleeDisabledHint: string;
    /**
     * The grim hopeless line every threat
     * modal carries (matches the hazard danger intro's register),
     * always ending on the player's only out: "Unless…". Rendered in
     * italic between the body prose and the choice rows.
     */
    doomLine: string;
}

/**
 * General event-screen chrome strings constant across every variant.
 * The screen reads `vm.chrome.*` instead of carrying inline display
 * literals per Hard Rule #8.
 */
export interface EventChrome {
    /** Section eyebrow above the choice list. Active-state only. */
    reckoningEyebrow: string;
    /** Label on the skip affordance over long prose. */
    skipLabel: string;
    /** Empty-state back-row primary label. */
    emptyBackLabel: string;
    /** Empty-state back-row secondary label (under primary). */
    emptyBackSub: string;
}

export const EVENT_CHROME: EventChrome = {
    reckoningEyebrow: '✠ A RECKONING',
    skipLabel: 'SKIP ›',
    emptyBackLabel: 'BACK',
    emptyBackSub: 'RETURN',
};

/**
 * The hint under each cutscene line: one for a line with more to follow, one
 * for the last. Pointer-neutral (critique pass 93): the plate runs under a
 * mouse on web as well as a finger on the phone, so it names no gesture.
 */
export const CUTSCENE_HINT = {
    next: '· continue ·',
    last: '· walk on ·',
} as const;

/**
 * Single source of truth for the non-boss encounter label that the
 * prelude eyebrow (`withPreludeChrome`) and the badge
 * (`composeCombatPrelude`) BOTH derive from, so a copy edit cannot drift
 * one from the other. `state/e2e/event.engine.test.ts` pins both call sites.
 */
export const ENCOUNTER_LABEL = 'ENCOUNTER';

export interface EventViewModel {
    kind: EventKind;
    variant: EventVariant;
    artSlug: EventArtSlug;
    /**
     * Enemy art key — the engine's `portraitAsset` (e.g. `"the-doorwarden"`),
     * falling back to the enemy id. Present only on combat-prelude variants;
     * the art layer resolves it 1:1 against the painting registry, with the
     * archetype illustration (see `enemy-art`) as the silhouette fallback.
     */
    enemyArtKey?: string | null;
    badge: string;
    badgeAccentKey: ChoiceAccentKey;
    title: string;
    subtitle: string;
    body: string;
    choices: ReadonlyArray<EventChoice>;
    lore: string | null;
    /** True iff the screen should show a skip affordance over long prose. */
    canSkip: boolean;
    /** Populated only on combat-prelude variants. `null` for narrative-choice. */
    preludeChrome: PreludeChrome | null;
    /** General chrome strings (eyebrow, skip, empty-state back). Constant across variants. */
    chrome: EventChrome;
    /**
     * Map node type that triggered this event (`'quest'`, `'rest'`,
     * `'treasure'`, etc.). Passed through from the mobile event slice
     * so the modal can apply quest-source visual treatment even when
     * the engine resolves to a generic kind (loot-cache, interaction…).
     * `null` when the event was not triggered from exploration or the
     * source node type was not recorded.
     */
    sourceNodeType: string | null;
}

const EMPTY_VM: EventViewModel = {
    kind: 'narrative-choice',
    variant: 'quest',
    artSlug: 'interaction-generic',
    badge: 'NO EVENT',
    badgeAccentKey: 'bone',
    title: 'NO EVENT IN PROGRESS',
    subtitle: '',
    body: 'the world is still.',
    choices: [],
    lore: null,
    canSkip: false,
    preludeChrome: null,
    chrome: EVENT_CHROME,
    sourceNodeType: null,
};

/**
 * True when an event is currently pending and the modal should be
 * shown. Returns `false` when the slice is empty or the pending event
 * kind is `'none'` (engine signal that the node had no event).
 */
export function selectHasActiveEvent(state: AppStoreState): boolean {
    const slice = state.event;
    if (!slice || slice.pending === null) return false;
    if (slice.pending.event.kind === 'none') return false;
    return true;
}

/**
 * Returns `true` when the engine has an active event AND that event
 * is a **paced** (narrative-choice) one — the kind that renders as a
 * full-screen `/event` route. Combat-adjacent events
 * (`'combat-prelude'`) are engaged by `<CombatGate>` and fought on the
 * `/combat-encounter` route, and must NOT route to the full-screen
 * shell; the `EventGate` reads this selector instead of the broader
 * `selectHasActiveEvent` to keep the two shells from mounting
 * simultaneously.
 */
export function selectHasActivePacedEvent(state: AppStoreState): boolean {
    if (!selectHasActiveEvent(state)) return false;
    const vm = selectEventViewModel(state);
    return vm.kind === 'narrative-choice';
}

/** Route targets for paced events. */
export type PacedEventRoute = '/event' | '/village' | '/dialogue' | '/cutscene';

/**
 * Which full-screen route the active paced event should mount.
 * Interaction and narration mount `/dialogue`, village mounts
 * `/village`, cutscene mounts `/cutscene`; everything else paced (in
 * practice `gathering`, see `composeGathering`) mounts the generic
 * `/event` shell. Returns `null` when no paced event is active (rest /
 * loot-cache / quest / hazard never reach the event slice — their
 * interceptors start minigame sessions instead).
 */
export function selectPacedEventRoute(state: AppStoreState): PacedEventRoute | null {
    if (!selectHasActivePacedEvent(state)) return null;
    const kind = state.event.pending?.event.kind;
    if (kind === 'interaction') return '/dialogue';
    if (kind === 'village') return '/village';
    if (kind === 'cutscene') return '/cutscene';
    if (kind === 'narration') return '/dialogue';
    return '/event';
}

/**
 * Returns `true` when the engine has an active **combat-adjacent**
 * event (kind `'combat-prelude'`) — the kind `<CombatGate>` engages
 * onto the `/combat-encounter` route. True only for the instant before
 * the gate engages it.
 */
export function selectHasActiveCombatPrelude(state: AppStoreState): boolean {
    if (!selectHasActiveEvent(state)) return false;
    const vm = selectEventViewModel(state);
    return vm.kind === 'combat-prelude';
}

/**
 * Backfill `preludeChrome`
 * on a freshly-composed VM so each `composeX` function can stay
 * focused on its own concerns. Combat-prelude variants get the
 * "STRIFE STIRS" sash + ENCOUNTER / BOSS · ENCOUNTER eyebrow; every
 * other kind gets `null`. The strings live here (presenter), not in
 * the screen, per Hard Rule #8.
 */
function withPreludeChrome(vm: Omit<EventViewModel, 'preludeChrome' | 'sourceNodeType'>): Omit<EventViewModel, 'sourceNodeType'> {
    if (vm.kind !== 'combat-prelude') {
        return { ...vm, preludeChrome: null };
    }
    return {
        ...vm,
        preludeChrome: {
            eyebrow: vm.variant === 'boss' ? `BOSS · ${ENCOUNTER_LABEL}` : ENCOUNTER_LABEL,
            sashLabel: 'STRIFE STIRS',
            sealLabel: 'SEALED · NO RETREAT',
            fleeDisabledHint: 'no retreat from this one.',
            doomLine:
                vm.variant === 'boss'
                    ? 'This is the thing the road was leading to. It has ended every pilgrim it has met, and it will end him the same — without hurry, without malice. Unless…'
                    : 'It has done this before. The ditch beside the road is full of those it did it to. He will not be the exception. Unless…',
        },
    };
}

function withSourceNodeType(vm: Omit<EventViewModel, 'sourceNodeType'>, sourceNodeType: string | null): EventViewModel {
    return { ...vm, sourceNodeType };
}

/**
 * Stamp the constant `chrome` block onto compose results. Sibling of
 * `withPreludeChrome`. Both wrappers run on every active VM so the
 * compose functions can stay focused on per-event composition without
 * touching chrome strings.
 */
function withChrome(
    vm: Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'>,
): Omit<EventViewModel, 'preludeChrome' | 'sourceNodeType'> {
    return { ...vm, chrome: EVENT_CHROME };
}

// Referential-stability memo (1-entry), mirroring the sibling memo in
// `exploration.engine.ts::selectExplorationViewModel`. `useGameState`
// subscribes via Zustand `useStore`, whose `getSnapshot` is the bare
// selector call — React's `useSyncExternalStore` then requires a STABLE
// reference for unchanged state, or it loops ("getSnapshot should be
// cached → Maximum update depth exceeded"). The empty-state path returns
// the frozen `EMPTY_VM` singleton, but every active-event path composes a
// fresh frozen VM, so a direct subscriber (e.g. the exploration screen's
// `useGameState(selectEventViewModel)`)
// would re-render forever once an event resolved. We cache the computed VM
// against the immutable slices it reads — `event`, `combat`, `quests`,
// `flags` — which Zustand replaces only when they actually change. These
// are exactly the deps the `/event` screen already memoizes on.
let _evtEventRef: unknown;
let _evtQuestsRef: unknown;
let _evtFlagsRef: unknown;
let _evtVm: EventViewModel | null = null;

/**
 * Returns the event view-model. When no event is active, returns the
 * empty-state VM (the screen shows "no event in progress").
 */
export function selectEventViewModel(state: AppStoreState): EventViewModel {
    if (
        _evtVm !== null &&
        state.event === _evtEventRef &&
        state.quests === _evtQuestsRef &&
        state.flags === _evtFlagsRef
    ) {
        return _evtVm;
    }
    const vm = computeEventViewModel(state);
    _evtEventRef = state.event;
    _evtQuestsRef = state.quests;
    _evtFlagsRef = state.flags;
    _evtVm = vm;
    return vm;
}

function computeEventViewModel(state: AppStoreState): EventViewModel {
    if (!selectHasActiveEvent(state)) {
        return freezeViewModel(EMPTY_VM);
    }
    const slice = state.event;
    const result = slice.pending as ResolveMapEventResult;
    const resolved = result.event;
    const sourceNodeType = slice.sourceNodeType;

    if (resolved.kind === 'encounter') {
        return freezeViewModel(
            withSourceNodeType(
                withPreludeChrome(withChrome(composeCombatPrelude(resolved.encounter, resolved.isBoss))),
                sourceNodeType,
            ),
        );
    }

    // Dialogue cursor takes precedence when walking an NPC tree.
    if (slice.dialogueCursor !== null) {
        return freezeViewModel(
            withSourceNodeType(
                withPreludeChrome(
                    withChrome(composeNpcDialogue(slice.dialogueCursor.tree, slice.dialogueCursor.nodeId, state)),
                ),
                sourceNodeType,
            ),
        );
    }

    return freezeViewModel(
        withSourceNodeType(
            withPreludeChrome(withChrome(composeNarrative(resolved))),
            sourceNodeType,
        ),
    );
}

// -- composition helpers -----------------------------------------------------

/**
 * Boss subtitle fallback when `enemy.description` is empty (which the
 * Enemy type says shouldn't happen, but be defensive). Rotates over
 * the player-facing level so repeat encounters at the same tier still
 * read consistently but different tiers each get their own omen.
 */
const BOSS_OMEN_BY_LEVEL: readonly string[] = [
    'first seal · first sigh',
    'second seal · waking',
    'third seal · the hush',
    'fourth seal · third sigh',
    'fifth seal · the long count',
];

function composeCombatPrelude(encounter: Encounter, isBoss: boolean): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    // Engine `Encounter` is `{ enemies: Enemy[], origin?: string }`.
    // The prelude shows the first enemy (combat is single-enemy).
    const enemy = encounter.enemies[0];
    // The live encounter (`beginHazardEncounter` in actions.ts) scales every
    // foe's HP by `ENCOUNTER_ENEMY_HP_MULTIPLIER` before combat starts, so the
    // combat VITAE bar reads double this preview's authored value unless the
    // preview previews the SAME scaled number.
    const previewHealth = withScaledEnemyHp(enemy, ENCOUNTER_ENEMY_HP_MULTIPLIER).health;
    const badge = isBoss ? 'OMEN OF DOOM' : ENCOUNTER_LABEL;
    // Boss encounters label FIGHT/FLEE as STRIKE/KNEEL. Choice IDs stay
    // 'fight' / 'flee' so the screen's handlers (onFight/onFlee) dispatch
    // the same way — KNEEL is FLEE, disabled on bosses (there is no
    // engine "kneel to a boss" mechanic); only the ritual register differs.
    // Chrome subtitles under each action button: a lowercase-roman cost
    // line on FIGHT ('ix · vi vitae · adv. unknown'), a ritual-register
    // kicker on FLEE ('forfeit the path'). Retreat costs nothing. The boss
    // kicker reads sealed because bosses block flee (KNEEL is not a real
    // choice).
    const fightSubtitle = `${toRomanLower(enemy.level)} · ${toRomanLower(previewHealth)} vitae · adv. unknown`;
    const fleeSubtitle = isBoss
        ? 'sealed · no retreat'
        : 'forfeit the path';

    const choices: EventChoice[] = [
        {
            id: 'fight',
            label: isBoss ? 'STRIKE' : 'FIGHT',
            description: isBoss ? 'Combat · BOSS' : 'Combat · turns',
            consequences: [],
            iconKey: 'sword',
            accentKey: 'blood',
            enabled: true,
            subtitle: fightSubtitle,
            decode: `Lv ${enemy.level} foe · ${previewHealth} VITAE · advantage not yet scouted`,
        },
        {
            id: 'flee',
            label: isBoss ? 'KNEEL' : 'FLEE',
            description: isBoss ? 'Submission · sealed' : 'Luck Save',
            consequences: [],
            iconKey: 'flee',
            accentKey: 'bone',
            enabled: !isBoss,
            subtitle: fleeSubtitle,
            decode: isBoss ? null : 'Give up this node',
        },
    ];
    let subtitle: string;
    if (isBoss) {
        const description = enemy.description?.trim() ?? '';
        if (description.length > 0) {
            subtitle = description;
        } else {
            const idx = Math.max(0, (enemy.level - 1) % BOSS_OMEN_BY_LEVEL.length);
            subtitle = BOSS_OMEN_BY_LEVEL[idx] ?? 'fourth seal · third sigh';
        }
    } else {
        subtitle = 'something stirs';
    }
    return {
        kind: 'combat-prelude',
        variant: isBoss ? 'boss' : 'encounter',
        artSlug: isBoss ? 'boss' : 'encounter',
        enemyArtKey: enemy.portraitAsset ?? enemy.id,
        badge,
        badgeAccentKey: 'blood',
        title: enemy.name.toUpperCase(),
        subtitle,
        body: `level ${enemy.level} · ${previewHealth} vitae.`,
        choices,
        lore: null,
        canSkip: false,
    };
}

/**
 * Builds the engine's `DialogueContext` from mobile store state. The single
 * source of truth for every `visibleChoices` call site — a second hand-built
 * context drifts and leaves gates evaluating false for every player.
 */
export function buildDialogueContext(state: AppStoreState): DialogueContext {
    const activeNames: string[] = state.quests.active.map((q: { name: string }) => q.name);
    return {
        activeQuests: new Set<string>(activeNames),
        completedQuests: new Set<string>(state.quests.completed as string[]),
        flags: new Set<string>(state.flags as string[]),
    };
}

/**
 * Nameplate for a dialogue card.
 *
 * Input: the active event slice's resolved event (may be absent).
 * Output: the uppercase name of whoever is speaking, or the canonical
 * 'A FIGURE' chrome when the event names nobody — a `narration` monologue
 * has no speaker by design, and that is the only case the fallback is
 * honest for.
 *
 * The engine's `DialogueNode` carries no `.speaker`, but the
 * `interaction` event that OPENED the tree carries `npcName` — the same
 * name `composeInteraction` puts on the no-tree card.
 */
function dialogueSpeakerTitle(resolved: ResolvedEvent | undefined): string {
    if (resolved?.kind === 'interaction') {
        const name = resolved.npcName.trim();
        if (name.length > 0) return name.toUpperCase();
    }
    return 'A FIGURE';
}

function composeNpcDialogue(
    tree: DialogueTree,
    nodeId: string,
    state: AppStoreState,
): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    const node: DialogueNode = getDialogueNode(tree, nodeId);
    const rawChoices = node.choices ?? [];
    const ctx = buildDialogueContext(state);
    const visible = visibleChoices(node, ctx);
    // Engine `DialogueChoice` has no id or label; its user-facing field
    // is `.text`. The VM `id` is the choice's index in `node.choices`
    // (the RAW list `pickEventChoiceAction` indexes into), not its index
    // in `visible` — a gate hiding any earlier choice shifts the filtered
    // array's indices out of step with the raw one, which would fire the
    // wrong branch on click.
    const choices: EventChoice[] = visible.map((choice) => ({
        id: String(rawChoices.indexOf(choice)),
        label: choice.text.toUpperCase(),
        description: choice.text,
        consequences: extractDialogueConsequences(choice),
        iconKey: 'scroll',
        accentKey: 'parchment',
        enabled: true,
        subtitle: null,
        decode: null,
    }));
    const text = (node.text ?? '') as string;
    return {
        kind: 'narrative-choice',
        variant: 'npc',
        artSlug: 'interaction-generic',
        badge: 'A VOICE',
        badgeAccentKey: 'parchment',
        // `DialogueNode` has no speaker; the name comes from the opening
        // `interaction` event. 'A FIGURE' is only for a speakerless
        // narration.
        title: dialogueSpeakerTitle(state.event.pending?.event),
        subtitle: '',
        body: text,
        choices,
        lore: null,
        canSkip: choices.length <= 1 && text.length > 240,
    };
}

function bodyFromPayload(event: ResolvedEvent): string {
    // Every kind but 'cutscene' (delivers its prose via
    // `lines` already) and 'none' carries the authored MapEvent
    // `description` threaded from the engine. Prefer it; fall back to
    // the kind-keyed placeholder only when the node left it unauthored.
    if (event.kind === 'cutscene') {
        return event.lines.join('\n\n');
    }
    if (event.kind === 'none') {
        return defaultBodyForEvent(event);
    }
    const description = event.description?.trim();
    return description ? description : defaultBodyForEvent(event);
}

function composeNarrative(resolved: ResolvedEvent): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    const artSlug = selectEventArtSlug(resolved);
    const body = bodyFromPayload(resolved);
    switch (resolved.kind) {
        case 'interaction':
            return composeInteraction(resolved.npcName, body, artSlug);
        case 'village':
            return composeVillage(resolved.villageName, resolved.merchants, body, artSlug);
        case 'cutscene':
            return composeCutscene(body, artSlug);
        case 'gathering':
            return composeGathering(resolved.items, body, artSlug);
        // Dead-end kinds: rest / loot-cache /
        // hazard never reach the event slice —
        // `resolveCurrentMapEventAction` intercepts them and starts
        // their minigame/choice sessions instead (the rest-choice
        // node, "The Reliquary", the hazard board).
        // 'encounter' renders through the combat-prelude
        // path before composeNarrative is reached; 'none' is guarded
        // by selectHasActiveEvent. All fall to the empty VM
        // defensively.
        case 'rest':
        case 'loot-cache':
        case 'hazard':
        case 'encounter':
        case 'narration':
        // 'blacksmith': its interceptor starts "The Anvil" die-gear
        // session. It never reaches composeNarrative; falls to the empty
        // VM defensively like the other minigame kinds.
        case 'blacksmith':
        // 'travel' is engine-resolved (the world has already crossed when
        // the event surfaces) and composes no card. Falls to the empty VM
        // defensively.
        case 'travel':
        // The Labyrinth door enters the Aporia from its
        // interceptor; like travel it never composes a card.
        case 'labyrinth':
        case 'none':
            return EMPTY_VM;
    }
}

function composeInteraction(npcName: string, body: string, artSlug: EventArtSlug): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    return {
        kind: 'narrative-choice',
        variant: 'npc',
        artSlug,
        // Eyebrow 'INTERACTION' is literal chrome; the title is the NPC
        // name from the engine.
        badge: 'INTERACTION',
        badgeAccentKey: 'parchment',
        title: npcName.toUpperCase(),
        subtitle: '',
        body,
        choices: [
            {
                id: 'acknowledge',
                label: 'SO BE IT',
                description: 'Continue',
                consequences: [],
                iconKey: 'scroll',
                accentKey: 'parchment',
                enabled: true,
                subtitle: null,
                decode: null,
            },
        ],
        lore: null,
        canSkip: body.length > 240,
    };
}

function composeVillage(
    villageName: string,
    merchants: ReadonlyArray<NPC>,
    body: string,
    artSlug: EventArtSlug,
): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    // No shop UI on this card: render the village name + a single LEAVE
    // choice, with the stall count (`merchants.length`) as the subtitle.
    const stallCount = merchants.length;
    const subtitle =
        stallCount === 0 ? '' : stallCount === 1 ? '1 stall' : `${stallCount} stalls`;
    return {
        kind: 'narrative-choice',
        variant: 'quest',
        artSlug,
        // Eyebrow 'A SETTLEMENT' is literal chrome.
        badge: 'A SETTLEMENT',
        badgeAccentKey: 'parchment',
        title: villageName.toUpperCase(),
        subtitle,
        body,
        choices: [
            {
                id: 'leave',
                label: 'LEAVE',
                description: 'Walk on',
                consequences: [],
                iconKey: 'flee',
                accentKey: 'bone',
                enabled: true,
                subtitle: null,
                decode: null,
            },
        ],
        lore: null,
        canSkip: body.length > 240,
    };
}

function composeCutscene(body: string, artSlug: EventArtSlug): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    return {
        kind: 'narrative-choice',
        variant: 'quest',
        artSlug,
        badge: 'A VISION',
        badgeAccentKey: 'sulfur',
        title: '',
        subtitle: '',
        body,
        choices: [
            {
                id: 'acknowledge',
                label: 'WITNESS',
                description: 'Continue',
                consequences: [],
                iconKey: 'eye',
                accentKey: 'sulfur',
                enabled: true,
                subtitle: null,
                decode: null,
            },
        ],
        lore: null,
        // Cutscenes are often long; skip is always available.
        canSkip: true,
    };
}

/**
 * `Name` or `Name x3` — the stack size only surfaces when there is a stack.
 * `quantity` lives on `Material` (and on stacked consumables); the other
 * `Item` members do not carry it, so the read is narrowed rather than cast.
 */
function gatheredLabel(item: Item): string {
    const quantity = 'quantity' in item && typeof item.quantity === 'number' ? item.quantity : 1;
    return quantity > 1 ? `${item.name} x${quantity}` : item.name;
}

/**
 * The gathering acknowledgement card.
 *
 * The grant happens in the engine: `resolveGathering` appends the payload
 * items to `player.inventory` and `resolve-map-event` advances any
 * `collect` quest objectives. This card has no session, RNG or route of
 * its own — it is the same paced `narrative-choice` card that
 * `interaction` / `village` / `cutscene` use. Its only job is to name what
 * the player just picked up and wait for them. A toast would not do:
 * `<ToastHost>` is declared BEFORE `<Stack>` in `app/_layout.tsx` with no
 * `zIndex`, and every screen's `<ScreenBg>` is opaque, so the navigator
 * paints over it.
 *
 * The button is a continue, not a decision: the items are already in the
 * inventory by the time this VM exists, so the label acknowledges a thing
 * done rather than offering a choice the player does not have.
 */
function composeGathering(
    items: ReadonlyArray<Item>,
    body: string,
    artSlug: EventArtSlug,
): Omit<EventViewModel, 'preludeChrome' | 'chrome' | 'sourceNodeType'> {
    const labels = items.map(gatheredLabel);
    const foundSomething = labels.length > 0;
    return {
        kind: 'narrative-choice',
        variant: 'gather',
        artSlug,
        badge: 'A GATHERING',
        badgeAccentKey: 'rust',
        // The names ARE the payload of this card: they tell the player what
        // they gathered.
        title: foundSomething ? labels.join(' · ').toUpperCase() : 'NOTHING WORTH TAKING',
        // Where it went, so the player knows which tab to look in.
        subtitle: foundSomething ? 'into the satchel' : '',
        body,
        choices: [
            {
                id: 'acknowledge',
                label: foundSomething
                    ? (labels.length === 1 ? 'POCKET IT' : 'POCKET THEM')
                    : 'MOVE ON',
                description: 'Continue',
                // One chip per item. The screen shows three and counts the
                // rest, so a fat pool still reads.
                consequences: labels.map((label) => ({ kind: 'item' as const, label })),
                iconKey: 'herbs',
                accentKey: 'rust',
                enabled: true,
                subtitle: null,
                decode: null,
            },
        ],
        lore: null,
        canSkip: body.length > 240,
    };
}

function extractDialogueConsequences(choice: DialogueChoice): ReadonlyArray<EventConsequence> {
    const out: EventConsequence[] = [];
    const e = choice.effect;
    if (!e) return out;
    if (e.grantCurrency) out.push({ kind: 'currency', amount: e.grantCurrency });
    if (e.startQuest) out.push({ kind: 'quest-start', label: e.startQuest });
    if (e.completeQuest) out.push({ kind: 'quest-progress', label: e.completeQuest });
    if (e.progressQuest) {
        out.push({
            kind: 'quest-progress',
            label: e.progressQuest.name,
            amount: e.progressQuest.amount ?? 1,
        });
    }
    if (e.teachCard) out.push({ kind: 'card-learn', label: e.teachCard });
    if (e.setFlag) out.push({ kind: 'flag', label: e.setFlag });
    return out;
}
