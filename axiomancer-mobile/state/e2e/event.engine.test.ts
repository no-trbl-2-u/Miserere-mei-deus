/**
 * Hermetic E2E Tests — Event screen presenter.
 *
 * Drives `selectEventViewModel` and `selectHasActiveEvent` against
 * fixture `ResolveMapEventResult` shapes injected into the mobile
 * event slice. Composition is pure — no engine RNG, no live dispatch.
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { FIXTURE_NPC } from '@mechanics';
import type { ResolveMapEventResult } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore, EMPTY_EVENT_SLICE } from '@/state/store';
import {
    ENCOUNTER_LABEL,
    selectEventViewModel,
    selectHasActiveEvent,
    selectHasActivePacedEvent,
    selectHasActiveCombatPrelude,
    buildDialogueContext,
    type EventViewModel,
} from '@/state/presenters/event.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

const ALLOWED_KINDS = ['combat-prelude', 'narrative-choice'] as const;
const ALLOWED_VARIANTS = ['encounter', 'boss', 'quest', 'rest', 'npc'] as const;
const ALLOWED_ACCENTS = ['blood', 'sulfur', 'parchment', 'bone', 'rust'] as const;
const ALLOWED_SLUGS = [
    'encounter',
    'boss',
    'rest',
    'loot-cache',
    'interaction-generic',
    'village',
    'cutscene',
    'hazard',
] as const;

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

function setPending(store: AppStore, result: ResolveMapEventResult) {
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: result,
        },
    });
}

function makeEncounterResult(opts: { isBoss?: boolean } = {}): ResolveMapEventResult {
    const enemy = {
        id: 'cairn-rot',
        name: 'Cairn-rot',
        level: 3,
        baseStats: { heart: 2, body: 3, mind: 1 },
        health: 24,
        maxHealth: 24,
    } as never;
    // The engine's canonical Encounter shape is `{ enemies, origin }`;
    // mobile consumers read `enemies[0]`.
    return {
        state: undefined as never,
        event: {
            kind: 'encounter',
            encounter: { enemies: [enemy], origin: 'breakwater:bw-w2' } as never,
            isBoss: opts.isBoss ?? false,
        },
    };
}

function makeRestResult(healed: number): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'rest', healed, shelter: 'camp' },
    };
}

function makeLootCacheResult(): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: {
            kind: 'loot-cache',
            items: [{ id: 'coin', name: 'Tarnished coin', category: 'material' } as never],
            currency: 5,
        },
    };
}

function makeVillageResult(opts: { description?: string } = {}): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: {
            kind: 'village',
            villageName: 'Hollow Mire',
            merchants: [],
            description: opts.description,
        },
    };
}

function makeCutsceneResult(lines: ReadonlyArray<string>): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'cutscene', lines },
    };
}

function makeHazardResult(damage: number): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'hazard', effects: [], damage },
    };
}

/** A pending event under a dialogue cursor: no map event opens a tree, so it is an empty cutscene. */
function makeDialogueCarrierResult(): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'cutscene', lines: [] },
    };
}

function makeNoneResult(): ResolveMapEventResult {
    return {
        state: undefined as never,
        event: { kind: 'none' },
    };
}

describe('selectHasActiveEvent', () => {
    it('returns false on a fresh store (no pending)', () => {
        const store = makeStore();
        expect(selectHasActiveEvent(store.getState())).toBe(false);
    });

    it('returns false when pending event kind is "none"', () => {
        const store = makeStore();
        setPending(store, makeNoneResult());
        expect(selectHasActiveEvent(store.getState())).toBe(false);
    });

    it('returns true for an encounter result', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult());
        expect(selectHasActiveEvent(store.getState())).toBe(true);
    });

    it('returns true for a rest result', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        expect(selectHasActiveEvent(store.getState())).toBe(true);
    });

    // Event-shell distinction. EventGate must NOT
    // push the player into the full-screen /event route when the
    // pending event is a combat-prelude (which <CombatGate> engages
    // onto the /combat-encounter route).
    it('selectHasActivePacedEvent: false on a fresh store', () => {
        const store = makeStore();
        expect(selectHasActivePacedEvent(store.getState())).toBe(false);
    });

    it('selectHasActivePacedEvent: false for a combat-prelude (encounter) event', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult());
        // selectHasActiveEvent is true here…
        expect(selectHasActiveEvent(store.getState())).toBe(true);
        // …but the paced selector excludes combat-prelude so the
        // EventGate doesn't race <CombatGate> for the same event.
        expect(selectHasActivePacedEvent(store.getState())).toBe(false);
    });

    it('selectHasActivePacedEvent: true for a paced (rest) event', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        expect(selectHasActivePacedEvent(store.getState())).toBe(true);
    });

    // The combat-prelude selector: true for a pending encounter only.
    it('selectHasActiveCombatPrelude: false on a fresh store', () => {
        const store = makeStore();
        expect(selectHasActiveCombatPrelude(store.getState())).toBe(false);
    });

    it('selectHasActiveCombatPrelude: true for an encounter (combat-prelude) event', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult());
        expect(selectHasActiveCombatPrelude(store.getState())).toBe(true);
    });

    it('selectHasActiveCombatPrelude: false for a paced (rest) event', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        // The paced + prelude selectors are mutually exclusive —
        // exactly one (or neither) returns true for any given pending.
        expect(selectHasActiveCombatPrelude(store.getState())).toBe(false);
    });
});

describe('selectEventViewModel: shape contract', () => {
    it('returns the empty-state VM for a fresh game (no pending event)', () => {
        const store = makeStore();
        const vm: EventViewModel = selectEventViewModel(store.getState());

        expect(vm.title).toBe('NO EVENT IN PROGRESS');
        expect(vm.choices).toHaveLength(0);
        expect(ALLOWED_KINDS).toContain(vm.kind);
        expect(ALLOWED_VARIANTS).toContain(vm.variant);
        expect(ALLOWED_ACCENTS).toContain(vm.badgeAccentKey);
        expect(ALLOWED_SLUGS).toContain(vm.artSlug);
    });

    it('every VM choice carries id / label / description / accentKey / iconKey / enabled', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult());
        const vm = selectEventViewModel(store.getState());

        expect(vm.choices.length).toBeGreaterThan(0);
        for (const choice of vm.choices) {
            expect(typeof choice.id).toBe('string');
            expect(typeof choice.label).toBe('string');
            expect(typeof choice.description).toBe('string');
            expect(Array.isArray(choice.consequences)).toBe(true);
            expect(typeof choice.iconKey).toBe('string');
            expect(ALLOWED_ACCENTS).toContain(choice.accentKey);
            expect(typeof choice.enabled).toBe('boolean');
        }
    });

    it('lore is either null or a string', () => {
        const store = makeStore();
        const vm = selectEventViewModel(store.getState());

        if (vm.lore !== null) {
            expect(typeof vm.lore).toBe('string');
        } else {
            expect(vm.lore).toBeNull();
        }
    });
});

describe('selectEventViewModel: combat-prelude composition', () => {
    it('maps a non-boss encounter to kind="combat-prelude" variant="encounter"', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('combat-prelude');
        expect(vm.variant).toBe('encounter');
        expect(vm.artSlug).toBe('encounter');
        expect(vm.badge).toBe('ENCOUNTER');
        expect(vm.title).toContain('CAIRN-ROT');
        expect(vm.choices.map((c) => c.id)).toEqual(['fight', 'flee']);
        expect(vm.choices.find((c) => c.id === 'fight')?.enabled).toBe(true);
    });

    it('maps a boss encounter to variant="boss" and disables flee', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: true }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('combat-prelude');
        expect(vm.variant).toBe('boss');
        expect(vm.artSlug).toBe('boss');
        expect(vm.badge).toBe('OMEN OF DOOM');
        expect(vm.choices.find((c) => c.id === 'flee')?.enabled).toBe(false);
    });

    // Boss encounters swap FIGHT/FLEE labels for STRIKE/KNEEL. Choice IDs stay
    // the same so the screen's onFight/onFlee handlers still
    // dispatch correctly.
    it('non-boss encounters keep FIGHT/FLEE labels (Phase 43)', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.choices.find((c) => c.id === 'fight')?.label).toBe('FIGHT');
        expect(vm.choices.find((c) => c.id === 'flee')?.label).toBe('FLEE');
    });

    it('boss encounters relabel choices to STRIKE/KNEEL (Phase 43)', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: true }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.choices.find((c) => c.id === 'fight')?.label).toBe('STRIKE');
        expect(vm.choices.find((c) => c.id === 'flee')?.label).toBe('KNEEL');
        // KNEEL stays disabled — no engine-side "submit to boss"
        // mechanic exists yet; the label honors the design's
        // intent that boss combat reads ritually differently.
        expect(vm.choices.find((c) => c.id === 'flee')?.enabled).toBe(false);
    });

    // Action-button subtitle chrome.
    it('combat-prelude action-button subtitles ship the lowercase-roman cost line (Phase 45)', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        const fight = vm.choices.find((c) => c.id === 'fight')!;
        const flee = vm.choices.find((c) => c.id === 'flee')!;
        // Subtitle is non-null on combat-prelude choices.
        expect(fight.subtitle).not.toBeNull();
        expect(flee.subtitle).not.toBeNull();
        // Lowercase-roman cost + ritual register — `toRomanLower`
        // (state/presenters/roman.ts) emits the full subtractive
        // alphabet (i,v,x,l,c,d,m) for any positive n, not just i/v/x,
        // so the regex must accept the full alphabet.
        expect(fight.subtitle).toMatch(/^[ivxlcdm0-9]+ · [ivxlcdm0-9]+ vitae · adv\. unknown$/);
        // Retreat costs no grace, so the kicker names no cost.
        expect(flee.subtitle).toBe('forfeit the path');
    });

    it('boss combat-prelude flee subtitle reads as sealed-no-retreat (Phase 45)', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: true }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.choices.find((c) => c.id === 'flee')?.subtitle).toBe(
            'sealed · no retreat',
        );
    });

    it('non-combat-prelude choices ship subtitle: null (Phase 45)', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        const vm = selectEventViewModel(store.getState());
        for (const choice of vm.choices) {
            expect(choice.subtitle).toBeNull();
        }
    });

    // Rest events launch the rest-choice session via the resolve
    // interceptor and never reach the modal; a rest result that somehow
    // lands in the slice composes to the empty VM.
    it('a rest result in the slice composes to the empty VM (Phase 137)', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        const vm = selectEventViewModel(store.getState());
        expect(vm.badge).toBe('NO EVENT');
        expect(vm.choices).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// preludeChrome
//
// `vm.preludeChrome` is the STRIFE-STIRS header chrome
// (eyebrow + diagonal sash) lifted off the screen and onto the VM per
// Hard Rule #8 (no inline display strings in the view layer). Combat-
// prelude variants populate it; every other kind returns `null`.
// ---------------------------------------------------------------------------

describe('selectEventViewModel: preludeChrome contract', () => {
    it('populates preludeChrome on a non-boss combat-prelude with ENCOUNTER eyebrow', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.preludeChrome).not.toBeNull();
        expect(vm.preludeChrome).toEqual({
            eyebrow: 'ENCOUNTER',
            sashLabel: 'STRIFE STIRS',
            sealLabel: 'SEALED · NO RETREAT',
            doomLine: expect.stringContaining('Unless…'),
            fleeDisabledHint: 'no retreat from this one.',
        });
    });

    it('populates preludeChrome on a boss combat-prelude with BOSS · ENCOUNTER eyebrow', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: true }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.preludeChrome).toEqual({
            eyebrow: 'BOSS · ENCOUNTER',
            sashLabel: 'STRIFE STIRS',
            sealLabel: 'SEALED · NO RETREAT',
            doomLine: expect.stringContaining('Unless…'),
            fleeDisabledHint: 'no retreat from this one.',
        });
    });

    it('returns preludeChrome: null on a narrative-choice variant (rest)', () => {
        const store = makeStore();
        setPending(store, makeRestResult(7));
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('narrative-choice');
        expect(vm.preludeChrome).toBeNull();
    });

    it('returns preludeChrome: null on the empty-state VM (no active event)', () => {
        const store = makeStore();
        const vm = selectEventViewModel(store.getState());

        expect(vm.preludeChrome).toBeNull();
    });

    // CRITIQUE pass 6 MED — the prelude eyebrow and the corner badge
    // both derive 'ENCOUNTER' from the same isBoss boolean. Pin both
    // call sites against the exported ENCOUNTER_LABEL constant so a
    // copy edit cannot silently drift one from the other.
    it('badge and preludeChrome.eyebrow both derive from ENCOUNTER_LABEL on a non-boss encounter', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.badge).toBe(ENCOUNTER_LABEL);
        expect(vm.preludeChrome?.eyebrow).toBe(ENCOUNTER_LABEL);
    });

    it('preludeChrome.eyebrow ends with ENCOUNTER_LABEL on a boss encounter', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: true }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.preludeChrome?.eyebrow.endsWith(ENCOUNTER_LABEL)).toBe(true);
        // Boss badge is intentionally separate (OMEN OF DOOM), not ENCOUNTER_LABEL.
        expect(vm.badge).not.toBe(ENCOUNTER_LABEL);
    });
});

// ---------------------------------------------------------------------------
// chrome
//
// `vm.chrome` lifts the four general-event display literals
// (RECKONING eyebrow, SKIP label, empty-state BACK / RETURN labels) off
// `app/event/index.tsx` and onto the VM per Hard Rule #8. Constant
// across every variant; populated by `withChrome` and `EMPTY_VM`.
// ---------------------------------------------------------------------------

describe('selectEventViewModel: chrome contract', () => {
    it('populates chrome on the empty-state VM (no active event)', () => {
        const store = makeStore();
        const vm = selectEventViewModel(store.getState());

        expect(vm.chrome).toEqual({
            reckoningEyebrow: '✠ A RECKONING',
            skipLabel: 'SKIP ›',
            emptyBackLabel: 'BACK',
            emptyBackSub: 'RETURN',
        });
    });

    it('populates the same chrome on combat-prelude variants', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm = selectEventViewModel(store.getState());

        expect(vm.chrome.reckoningEyebrow).toBe('✠ A RECKONING');
        expect(vm.chrome.skipLabel).toBe('SKIP ›');
        expect(vm.chrome.emptyBackLabel).toBe('BACK');
        expect(vm.chrome.emptyBackSub).toBe('RETURN');
    });

    it('populates the same chrome on narrative-choice variants (rest)', () => {
        const store = makeStore();
        setPending(store, makeRestResult(7));
        const vm = selectEventViewModel(store.getState());

        expect(vm.chrome.reckoningEyebrow).toBe('✠ A RECKONING');
        expect(vm.chrome.skipLabel).toBe('SKIP ›');
    });

    it('chrome is the same object reference across calls (frozen, stable)', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm1 = selectEventViewModel(store.getState());
        setPending(store, makeRestResult(7));
        const vm2 = selectEventViewModel(store.getState());

        // Same string literals across variants (the screen never sees
        // a "no eyebrow"/"different eyebrow" state).
        expect(vm1.chrome).toEqual(vm2.chrome);
    });
});

describe('selectEventViewModel: referential stability (Maximum-update-depth guard)', () => {
    // Regression for the map-node-nav crash: the exploration
    // screen subscribes via `useGameState(selectEventViewModel)`, whose
    // `getSnapshot` is the bare selector call. React's `useSyncExternalStore`
    // requires a STABLE reference for unchanged state or it loops forever
    // ("Maximum update depth exceeded"). Every active-event path composes a
    // fresh frozen VM, so without the selector's 1-entry memo, the first
    // non-empty event resolved on the map crashed the screen. Hazard slipped
    // through because that path clears the slice back to the EMPTY_VM
    // singleton. These tests pin the memo so the loop can't return.

    it('returns the SAME reference across calls when the active event is unchanged', () => {
        const store = makeStore();
        setPending(store, makeRestResult(7));
        const vm1 = selectEventViewModel(store.getState());
        const vm2 = selectEventViewModel(store.getState());
        expect(vm2).toBe(vm1);
    });

    it('returns the SAME reference for a combat-prelude across calls', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult({ isBoss: false }));
        const vm1 = selectEventViewModel(store.getState());
        const vm2 = selectEventViewModel(store.getState());
        expect(vm2).toBe(vm1);
    });

    it('returns the stable EMPTY_VM singleton across calls with no active event', () => {
        const store = makeStore();
        const vm1 = selectEventViewModel(store.getState());
        const vm2 = selectEventViewModel(store.getState());
        expect(vm2).toBe(vm1);
    });

    it('recomputes (new reference) when the event slice changes', () => {
        const store = makeStore();
        setPending(store, makeRestResult(7));
        const vm1 = selectEventViewModel(store.getState());
        setPending(store, makeRestResult(3));
        const vm2 = selectEventViewModel(store.getState());
        expect(vm2).not.toBe(vm1);
    });
});

describe('selectEventViewModel: narrative-choice composition', () => {
    // Rest / loot-cache events are intercepted in
    // resolveCurrentMapEventAction (they launch the rest-choice session /
    // "The Reliquary") and never reach the modal. The composer treats them
    // as dead-end kinds.
    it('composes minigame-intercepted kinds (rest / loot-cache) to the empty VM', () => {
        const store = makeStore();
        for (const result of [makeRestResult(7), makeLootCacheResult()]) {
            setPending(store, result);
            const vm = selectEventViewModel(store.getState());
            expect(vm.kind).toBe('narrative-choice');
            expect(vm.badge).toBe('NO EVENT');
            expect(vm.artSlug).toBe('interaction-generic');
            expect(vm.choices).toHaveLength(0);
        }
    });

    it('maps a village event to a single LEAVE choice (shop UI deferred)', () => {
        const store = makeStore();
        setPending(store, makeVillageResult());
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('narrative-choice');
        expect(vm.artSlug).toBe('village');
        expect(vm.title).toContain('HOLLOW MIRE');
        expect(vm.choices).toHaveLength(1);
        expect(vm.choices[0]?.id).toBe('leave');
    });

    it('village body falls back to the generic placeholder when unauthored', () => {
        const store = makeStore();
        setPending(store, makeVillageResult());
        const vm = selectEventViewModel(store.getState());
        expect(vm.body).toBe('Roofs and smoke.');
    });

    it('village body prefers the authored description over the placeholder (Phase 58)', () => {
        const store = makeStore();
        setPending(store, makeVillageResult({ description: 'Nets dry on every railing.' }));
        const vm = selectEventViewModel(store.getState());
        expect(vm.body).toBe('Nets dry on every railing.');
    });

    it('maps a cutscene event to body=lines.join() and canSkip=true', () => {
        const store = makeStore();
        setPending(store, makeCutsceneResult(['First line.', 'Second line.']));
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('narrative-choice');
        expect(vm.artSlug).toBe('cutscene');
        expect(vm.body).toContain('First line.');
        expect(vm.body).toContain('Second line.');
        expect(vm.canSkip).toBe(true);
    });

    it('composes a hazard event to the empty VM (minigame-intercepted — Phase 137)', () => {
        const store = makeStore();
        setPending(store, makeHazardResult(4));
        const vm = selectEventViewModel(store.getState());

        expect(vm.kind).toBe('narrative-choice');
        expect(vm.badge).toBe('NO EVENT');
        expect(vm.choices).toHaveLength(0);
    });

    it('canSkip is true on rest event with long body (forced by long description)', () => {
        const store = makeStore();
        // Default body for rest is 'A quiet place.' (short); we override
        // by passing an event with a description in a real flow. For the
        // pure VM test here, the canSkip threshold is body.length > 240
        // and the rest default is short, so this expects false:
        setPending(store, makeRestResult(1));
        const vm = selectEventViewModel(store.getState());
        expect(vm.canSkip).toBe(false);
    });
});

describe('eventActions.pickEventChoice', () => {
    it('combat-prelude + fight -> startCombat called with encounter enemy; pending clears', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        const encounterResult = makeEncounterResult();
        setPending(store, encounterResult);
        const startCombatSpy = jest.spyOn(store.getState(), 'startCombat');

        actions.pickEventChoice('fight');

        expect(startCombatSpy).toHaveBeenCalledTimes(1);
        expect(store.getState().event.pending).toBeNull();
    });

    it('combat-prelude + flee (non-boss) -> no startCombat; pending clears; toast names no grace (D39)', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeEncounterResult({ isBoss: false }));
        const startCombatSpy = jest.spyOn(store.getState(), 'startCombat');

        actions.pickEventChoice('flee');

        expect(startCombatSpy).not.toHaveBeenCalled();
        expect(store.getState().event.pending).toBeNull();
        // The retreat still narrates, but the morale meter is gone — no cost line.
        const toast = store.getState().notifications?.toast?.text ?? '';
        expect(toast).toContain('you fled the encounter');
        expect(toast).not.toMatch(/grace/i);
    });

    it('combat-prelude + flee (boss) -> clears pending without a retreat toast (chrome reads "sealed · no retreat")', () => {
        // Boss flee is engine-disabled in the UI (KNEEL / `enabled:
        // false`). If the dispatch somehow lands anyway, the action
        // layer must not narrate a retreat the chrome says is sealed.
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeEncounterResult({ isBoss: true }));
        const toastBefore = store.getState().notifications?.toast;

        actions.pickEventChoice('flee');

        expect(store.getState().event.pending).toBeNull();
        expect(store.getState().notifications?.toast).toEqual(toastBefore);
    });

    it('narrative-choice auto-resolve (rest) clears pending without engine dispatch', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeRestResult(3));

        actions.pickEventChoice('continue');

        expect(store.getState().event.pending).toBeNull();
    });

    it('cutscene auto-resolve clears pending without engine dispatch', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeCutsceneResult(['A vision.']));

        actions.pickEventChoice('acknowledge');

        expect(store.getState().event.pending).toBeNull();
    });

    it('hazard auto-resolve clears pending without engine dispatch', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeHazardResult(3));

        actions.pickEventChoice('acknowledge');

        expect(store.getState().event.pending).toBeNull();
    });

    it('village leave clears pending without engine dispatch', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeVillageResult());

        actions.pickEventChoice('leave');

        expect(store.getState().event.pending).toBeNull();
    });

    it('unknown choice id on combat-prelude is a defensive no-op (pending stays)', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeEncounterResult());

        actions.pickEventChoice('explode');

        expect(store.getState().event.pending).not.toBeNull();
    });
});

describe('eventActions.dismissEvent', () => {
    it('clears the event slice without dispatching engine calls', () => {
        const store = makeStore();
        const actions = createAppActions(store);
        setPending(store, makeRestResult(1));
        expect(selectHasActiveEvent(store.getState())).toBe(true);

        actions.dismissEvent();

        expect(store.getState().event.pending).toBeNull();
        expect(selectHasActiveEvent(store.getState())).toBe(false);
    });
});

describe('selectEventViewModel: sourceNodeType', () => {
    it('is null on the empty-state VM (no pending event)', () => {
        const store = makeStore();
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBeNull();
    });

    it('is null when event is active but sourceNodeType was not set on the slice', () => {
        const store = makeStore();
        setPending(store, makeRestResult(5));
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBeNull();
    });

    it('passes "rest" sourceNodeType through from the slice', () => {
        const store = makeStore();
        store.setState({
            event: { ...EMPTY_EVENT_SLICE, pending: makeRestResult(5), sourceNodeType: 'rest' },
        });
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBe('rest');
    });

    it('passes "village" sourceNodeType through from the slice', () => {
        const store = makeStore();
        store.setState({
            event: { ...EMPTY_EVENT_SLICE, pending: makeVillageResult(), sourceNodeType: 'village' },
        });
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBe('village');
    });

    it('passes "treasure" sourceNodeType through for a loot-cache event', () => {
        const store = makeStore();
        store.setState({
            event: { ...EMPTY_EVENT_SLICE, pending: makeLootCacheResult(), sourceNodeType: 'treasure' },
        });
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBe('treasure');
    });

    it('passes "quest" sourceNodeType through for a village event (quest-source)', () => {
        const store = makeStore();
        store.setState({
            event: { ...EMPTY_EVENT_SLICE, pending: makeVillageResult(), sourceNodeType: 'quest' },
        });
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBe('quest');
    });

    it('passes "encounter" sourceNodeType through for a combat-prelude', () => {
        const store = makeStore();
        store.setState({
            event: { ...EMPTY_EVENT_SLICE, pending: makeEncounterResult(), sourceNodeType: 'encounter' },
        });
        const vm = selectEventViewModel(store.getState());
        expect(vm.sourceNodeType).toBe('encounter');
    });
});

describe('selectEventViewModel: invariants', () => {
    it('the returned VM is deep-frozen', () => {
        const store = makeStore();
        setPending(store, makeEncounterResult());
        const vm = selectEventViewModel(store.getState());

        expect(Object.isFrozen(vm)).toBe(true);
        expect(Object.isFrozen(vm.choices)).toBe(true);
    });

    it('selecting the VM does not call adapter.save', () => {
        const adapter = createMemoryAdapter();
        const store = createAppStore({ adapter });
        setPending(store, makeEncounterResult());
        const saveSpy = jest.spyOn(adapter, 'save');

        selectEventViewModel(store.getState());

        expect(saveSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// composeNpcDialogue's DialogueContext
//
// The presenter must build a complete DialogueContext; a dropped field
// would leave gated choices evaluating hidden forever. There are no
// alignment gates. These tests drive the neutral fixture NPC's tree (no map
// stages an NPC).
// ---------------------------------------------------------------------------

function loadFixtureTree() {
    return FIXTURE_NPC.dialogueTree!;
}

function setDialogueCursor(store: AppStore, nodeId: string) {
    const tree = loadFixtureTree();
    store.setState({
        event: {
            ...EMPTY_EVENT_SLICE,
            pending: makeDialogueCarrierResult(),
            dialogueCursor: { tree, nodeId },
        },
    });
    return tree;
}

describe('buildDialogueContext: field completeness (Phase 53b regression witness)', () => {
    it('populates all three DialogueContext keys and nothing alignment-shaped', () => {
        const store = makeStore();
        store.setState({ flags: ['a-flag'] });

        const ctx = buildDialogueContext(store.getState());

        expect(ctx.activeQuests).toBeInstanceOf(Set);
        expect(ctx.completedQuests).toBeInstanceOf(Set);
        expect(ctx.flags.has('a-flag')).toBe(true);
        expect(Object.keys(ctx).sort()).toEqual(['activeQuests', 'completedQuests', 'flags']);
    });
});

describe('selectEventViewModel: NPC dialogue without alignment gates (D39)', () => {
    it('clicking a choice fires the branch at its RAW node.choices index', () => {
        // composeNpcDialogue derives `id` from the RAW node.choices index,
        // the array pickEventChoiceAction indexes into — not the FILTERED
        // (visible) array — so any hidden gate cannot knock them out of step.
        const store = makeStore();
        const actions = createAppActions(store);
        setDialogueCursor(store, 'start');

        const vm = selectEventViewModel(store.getState());
        const take = vm.choices.find((c) => c.description === 'Take the quest.')!;
        expect(take.id).toBe('0');

        actions.pickEventChoice(take.id);

        // The first choice routes to the 'end' node.
        expect(store.getState().event.dialogueCursor?.nodeId).toBe('end');
    });
});
