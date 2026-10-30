/**
 * CombatEncounterPanel — the card-and-dice combat surface, hosted by the
 * live `/combat-encounter` route (`app/combat-encounter/index.tsx`) for
 * every map and labyrinth fight.
 *
 * The engine `CombatEncounterState` is pure, so the panel holds it in local
 * React state and dispatches engine transitions; the presenter
 * (`buildCombatViewModel`) owns the mapping; the board owns the UI. The
 * drag ghost renders at panel root (top/left 0) and the board's drag uses
 * window coords, so the panel MUST be mounted full-bleed from the window
 * origin (the dev route wraps it in `<ScreenBg>`; the modal renders it as a
 * full-screen layer).
 *
 * Live play (`persistOutcome`) hand-rolls only the write-backs that have no
 * engine equivalent — floating dice, banked Souls, and final HP →
 * player.health — then routes the outcome through the engine's real `endCombat` reducer for everything else
 * (XP, loot, quest kill-objective advancement + completion rewards, and, on
 * a merciful win, the authored `friendshipReward` payload: flags, codex
 * unlocks, faction deltas). `beginHazardEncounter`
 * stages `state.currentEncounter` via `startCombat` so `endCombat` has a real
 * encounter to resolve against. The deckbuilder reward card is rolled into
 * the store on victory whether or not `persistOutcome` is set. Defeat HP /
 * run reset is the host's concern.
 */

import React, { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Polygon, RadialGradient, Stop } from 'react-native-svg';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase,
    startTurn, endTurn, discardCombatCard, playSignatureSkill, payTheToll,
    getFloatingDiceColors,
    selectEncounterMercyChoice, buildCombatSummary,
    getLogger, enemySlugOf, hasDefeatedEnemy,
    type CombatEncounterState, type CombatOutcome, type Character, type Enemy, type CombatEvent,
    type Equipment, type GameState, type PlayLogUiEventKind,
} from '@mechanics';

import { CombatBoard, CombatCardFace, OutcomeText, HAND_CARD_W, HAND_CARD_H, type DragController, type DragPayload, type Rect } from '@/components/combat/encounter/CombatBoard';
import { useDragInterruptRecovery } from '@/components/combat/encounter/useDragInterruptRecovery';
import { startDragSpan, type DragSpanEnd, type DragSpanKind, type DragSpanOutcome } from '@/lib/monitoring';
import { type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import { CombatDie, combatDieFootprint } from '@/components/combat/encounter/CombatDie';
import { CombatSummaryModal } from '@/components/combat/encounter/CombatSummaryModal';
import { CombatRewardsOverlay } from '@/components/combat/encounter/CombatRewardsOverlay';
import { Image } from '@/lib/platform/image';
import { fightRecorder } from '@/lib/fightRecorder';
import { getEncounterEnemyArt } from '@/assets/images/enemies';
import {
    INTENT_ICONS, buildCombatViewModel, rewardCardVMs, STANCE_COLORS, threatPhaseHeader, telegraphName,
    selectCombatLogHistory, signatureInfoLines, COMBAT_LOG_TOGGLE_TEXT, COMBAT_LOG_TOGGLE_A11Y, COMBAT_LOG_CLOSE_A11Y, COMBAT_LOG_BACK_TEXT,
    type CombatCardVM, type CombatEffectChipVM, type CombatSignatureVM,
} from '@/state/presenters/combat-encounter.engine';
import { cardUpgradeRowsVM } from '@/state/presenters/card-upgrade.engine';
import { offerCompletedQuestExtrasAction } from '@/state/quest/store-actions';
import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { useGameState, useGameStore } from '@/state/GameStoreProvider';
import {
    claimCombatRewardAction, claimCombatUpgradeAction, resetCombatRewardAction, rollCombatRewardAction,
    settleEliteRelicAction,
} from '@/state/combat/store-actions';
import { FONTS, HUE } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { boardGlossView, MOMENTUM_GLOSS } from '@/state/combat/keywords';
import type { BoardGlossLive, BoardTermId } from '@/state/combat/keywords';

/** The mark the gloss plaque's burst wears for each board term. */
const GLOSS_GLYPH: Record<BoardTermId, string> = {
    conviction: '◆', boon: '◆', mana: '●', miss: '○', banked: '⏳', ghost: '✦',
    xdie: '✕', xvaries: 'X', piles: '▮', ledger: 'O', global: '⟳',
};

type DropResolver = (payload: DragPayload, x: number, y: number) => void | Promise<void>;

/** The perf span a drag reports under, named by where the drag started. */
function dragSpanKind(payload: DragPayload): DragSpanKind {
    if (payload.type === 'die') return 'die-to-card';
    return payload.from === 'hand' ? 'hand-to-play' : 'play-to-hand';
}

/** Stable empty-offers reference — a fresh `[]` in the selector would make the
 *  store subscription report a change on every render. */
const EMPTY_OFFERS: readonly string[] = Object.freeze([]);

/** Rendered size of the dragged-die ghost chip — the die ghost anchors on HALF
 *  of its rendered FOOTPRINT (cube + shadow, not the bare size) so it tracks
 *  the pointer (see dieGhostStyle). */
const DIE_GHOST_SIZE = 49;
const DIE_GHOST_FOOT = combatDieFootprint(DIE_GHOST_SIZE);

/** How long an END-phase press locks the button + staging while the
 *  threat resolves and its hit lands (IMPACT 100ms + the hit reaction, with
 *  headroom; the ~1.6 s number floats outlive it and block nothing). The lock
 *  exists only to swallow machine-gun double-taps; a legitimately new end-phase
 *  after the state has fully advanced is always ~1s away. */
const RESOLVE_LOCK_MS = 1100;

/** If a live drag goes this long with no pointer movement, its input
 *  stream is assumed dead (a killed/interrupted pointer that never delivered an
 *  end event) and the drag is force-finalized so it can't wedge staging or leave
 *  a permanent ghost. Every `pointermove` resets the clock, so a slow-but-live
 *  drag is never cut short. */
const DRAG_WATCHDOG_MS = 4000;

/** The pre-combat reveal's widest extent, in points. */
export const REVEAL_COLUMN_MAX_WIDTH = 520;

export interface CombatEncounterPanelProps {
    /** The foe to fight (live: the real map encounter enemy; dev: a mock). */
    enemy: Enemy;
    /** Player snapshot used to initialise the encounter (deck derives from knownCards). */
    bootstrapPlayer: Character;
    /** Optional explicit deck (engine derives one from knownCards when omitted). */
    deck?: string[];
    /**
     * `GameState.flags` — when non-empty and loadout-shaped, overrides
     * `bootstrapPlayer.knownCards` as the deck's card base (the curated
     * loadout, see `combat.loadout.ts`). Callers must pass the flags
     * that actually correspond to `bootstrapPlayer` — the dev sandbox route
     * synthesises a demo `bootstrapPlayer` disjoint from the real player's
     * `knownCards`, so it omits this prop rather than pass the real store's
     * flags, which would deal a card the demo player doesn't know.
     */
    flags?: readonly string[];
    /** Deterministic seed. */
    seed?: number;
    /**
     * Live play: hand-roll HP/XP/loot/level-up back onto the persistent
     * player on combat end. Dev sandbox passes false so test runs don't
     * mutate the player's real progression.
     */
    persistOutcome?: boolean;
    /**
     * Retreat, offered on the reveal screen only (before a die is rolled).
     * The reveal IS the commit gate, so the choice belongs beside ENTER COMBAT.
     * Omitted (dev sandbox, boss encounters) = no retreat is offered.
     */
    onWithdraw?: () => void;
    /** Fired once when the player dismisses the terminal summary. */
    onExit: (outcome: CombatOutcome | null) => void;
    /** The live map region (`vm.region` from the exploration screen), keying
     *  the arena backdrop plate. The dev-only sandbox route omits
     *  it and gets the fallback plate, same as any unmapped region. */
    region?: string;
}

type StoreLike = ReturnType<typeof useGameStore>;

/** The merciful win: a befriend through The Open Hand, spared. It
 *  rewards like mercy: XP flows, no corpse loot. */
function isMercifulWin(outcome: CombatOutcome): boolean {
    return outcome === 'mercy';
}

/**
 * Translate the hazard-pattern engine's `CombatOutcome` into the
 * vocabulary `game.reducer.ts`'s `END_COMBAT` case understands. The merciful
 * win (mercy — "won without killing") maps onto the reducer's `'friendship'`
 * outcome, the "spared the foe" branch that `Enemy.friendshipReward` data
 * targets. `'retreat'` is dead (`combat.encounter.types.ts` — no in-combat
 * retreat exists) and maps to `'flee'` only so this function stays total.
 */
function mapHazardOutcomeToEndCombat(
    outcome: CombatOutcome,
): 'victory' | 'defeat' | 'friendship' | 'flee' {
    if (outcome === 'victory') return 'victory';
    if (outcome === 'defeat') return 'defeat';
    if (isMercifulWin(outcome)) return 'friendship';
    return 'flee';
}

/**
 * Write-back for a finished hazard encounter. Handles only what has no
 * engine equivalent — the GHOST-die pool (forged dice persist across
 * combats until spent), the banked Harvest Souls
 * (`player.bankedSouls` accumulates `finalState.souls`, "the jar travels"
 * regardless of how the fight ended), and final HP (persists for every
 * outcome except defeat — the host's run-reset full-heals there) — then
 * dispatches the real `game.reducer.ts` `endCombat` for
 * everything else: XP, loot, quest kill-objective advancement + completion
 * rewards, and — on a merciful win — the authored `friendshipReward`
 * payload (flags, codex unlock, faction deltas). `endCombat` reads its own `Enemy` off the `currentEncounter`
 * `beginHazardEncounter` staged via `startCombat`, so no `finalPlayer` is
 * passed here — the write-back below already lands HP/floatingDice/
 * bankedSouls on `state.player` first, and `endCombat` builds its grant on
 * top of that already-current root player. The deckbuilder card is handled
 * separately (rolled into the store on victory, claimed via
 * `claimCombatRewardAction`). A won elite fight rolls its relic first
 * (`settleEliteRelicAction`, from `relics`, the relic library by default):
 * on a drop the relic is the whole reward and `endCombat` withholds the XP
 * and loot.
 */
export function applyHazardOutcome(
    store: StoreLike,
    outcome: CombatOutcome,
    finalState: CombatEncounterState,
    enemy: Enemy,
    relics?: readonly Equipment[],
): void {
    const finalHp = finalState.player.health;
    // The surviving floating dice, in engine truth (spent dice
    // are gone forever; unspent ones arrive in the next battle's opening tray).
    const floatingDice = getFloatingDiceColors(finalState);
    // Whatever Souls the fight ended with, unspent, banks
    // permanently; a combat that never generated Souls contributes 0.
    const soulsRemaining = finalState.souls ?? 0;
    store.setState((s) => {
        if (!s.player) return {};
        let player: Character = {
            ...s.player,
            floatingDice,
            bankedSouls: (s.player.bankedSouls ?? 0) + soulsRemaining,
        };
        if (outcome !== 'defeat') {
            player = { ...player, health: Math.max(0, Math.min(finalHp, player.maxHealth)) };
        }
        return { player };
    });
    // Resolve the staged encounter through the engine's real
    // endCombat reducer: XP, loot, quest kill-objective advancement +
    // completion rewards, and (on 'friendship') flags/codex/faction
    // deltas, all read off Enemy.xpReward / .loot /
    // .friendshipReward / .journalEntry via state.currentEncounter.
    // A won elite fight rolls its relic FIRST: a drop is the whole reward,
    // so the XP and loot are withheld and the card draft never opens.
    const relicOnly = outcome === 'victory' && settleEliteRelicAction(store, enemy, relics);
    const questsBefore = (store.getState() as unknown as GameState).quests;
    store.getState().endCombat(mapHazardOutcomeToEndCombat(outcome), undefined, { withholdSpoils: relicOnly });
    // A kill that completed a quest (the questline's boss step pays here): its
    // relic goes to the item-reward screen and a card pick to the spoils tiles.
    if (questsBefore) offerCompletedQuestExtrasAction(store, questsBefore);
    // Cascade level-ups through the engine store (applyLevelUps isn't exported,
    // so the LEVEL_UP reducer is the only public path). applyLevelUps already
    // loops internally; the guarded while-loop is belt-and-braces. Runs after
    // endCombat since that's what grants the XP.
    if (outcome === 'victory' || isMercifulWin(outcome)) {
        const levelUp = (store.getState() as { levelUp?: () => void }).levelUp;
        let guard = 0;
        while (
            typeof levelUp === 'function'
            && store.getState().player
            && (store.getState().player as Character).experience >= (store.getState().player as Character).experienceToNextLevel
            && guard < 20
        ) {
            guard += 1;
            levelUp();
        }
    }
}

// Per-keyword type tag for the inspect-modal definition panels. The PRIMARY keyword
// (index 0) maps to the card's face kind; riders read as a generic EFFECT.
function keywordTypeTag(kind: string, index: number): string {
    if (index > 0) return 'EFFECT';
    switch (kind) {
        case 'dot': return 'DOT';
        case 'stun':
        case 'weaken': return 'CONTROL';
        case 'guard': return 'GUARD';
        case 'befriend': return 'MERCY';
        default: return 'EFFECT';
    }
}

// Reference-style coloured type tags (right-aligned on the keyword panels).
const TAG_COLORS: Record<string, string> = {
    DOT: HUE.damageRed, CONTROL: HUE.tickPurple, GUARD: HUE.guardSteel,
    MERCY: HUE.boonGreen, EFFECT: HUE.stoneGrey,
    DICE: HUE.markGold,
};

// Category plaque for the status tooltip — glyph kind → badge label + colour.
function effectCategory(kind: string, color: string): { label: string; color: string } {
    switch (kind) {
        case 'dot': return { label: 'AFFLICTION', color: HUE.damageRed };
        case 'control': return { label: 'CONTROL', color: HUE.tickPurple };
        case 'statdown':
        case 'mark': return { label: 'HEX', color: HUE.hexAmber };
        case 'statup': return { label: 'BLESSING', color: HUE.boonGreen };
        default: return { label: 'EFFECT', color };
    }
}

/** Dimmed-backdrop plaque hero: a radial burst + rayed ring around a large
 *  glowing glyph (the reference status-detail centrepiece). */
function GlyphBurst({ color, glyph }: { color: string; glyph: string }) {
    const styles = useStyles();
    return (
        <View style={styles.burstWrap} pointerEvents="none">
            <Svg width={170} height={170} viewBox="0 0 170 170">
                <Defs>
                    <RadialGradient id="axmTipBurst" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={color} stopOpacity={0.55} />
                        <Stop offset="55%" stopColor={color} stopOpacity={0.16} />
                        <Stop offset="100%" stopColor={color} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={85} cy={85} r={85} fill="url(#axmTipBurst)" />
                {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    return (
                        <Line
                            key={i}
                            x1={85 + Math.cos(a) * 52} y1={85 + Math.sin(a) * 52}
                            x2={85 + Math.cos(a) * (i % 2 === 0 ? 76 : 66)} y2={85 + Math.sin(a) * (i % 2 === 0 ? 76 : 66)}
                            stroke={color}
                            strokeWidth={1.4}
                            opacity={0.3}
                        />
                    );
                })}
                <Circle cx={85} cy={85} r={46} fill={HUE.medallionDeep} stroke={color} strokeWidth={3} />
                <Circle cx={85} cy={85} r={41} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            </Svg>
            <View style={StyleSheet.absoluteFill}>
                <View style={styles.burstGlyphBox}>
                    <Text style={[styles.burstGlyph, { color, textShadowColor: color }]} allowFontScaling={false}>{glyph}</Text>
                </View>
            </View>
        </View>
    );
}

export function CombatEncounterPanel({
    enemy,
    bootstrapPlayer,
    deck,
    flags,
    seed,
    persistOutcome = false,
    onWithdraw,
    onExit,
    region,
}: CombatEncounterPanelProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const { width: screenW } = useWindowDimensions();
    // Hero card width in the inspect modal (reference: the card IS the screen) —
    // sized so keyword panels + the full card fit a ~844pt viewport together.
    const detailCardW = Math.min(264, screenW - 116);
    const player = useGameState((s) => s.player);
    const dying = useGameState((s) => s.dying === true);
    const store = useGameStore();
    // The live reward draft (store-owned so it survives a panel remount).
    const rewardOffers = useGameState((s) => s.combatReward?.offers ?? EMPTY_OFFERS);
    const rewardsClaimed = useGameState((s) => s.combatReward?.claimed ?? false);
    const rewardUpgrade = useGameState((s) => s.combatReward?.upgrade ?? null);

    const [state, setState] = useState<CombatEncounterState | null>(null);
    // Multi-card staging (hazard model): several cards can be staged at once; each
    // is APPLYd individually (powered by the die dragged onto it, or FREE).
    const [stagedUids, setStagedUids] = useState<string[]>([]);
    const [detailCard, setDetailCard] = useState<CombatCardVM | null>(null);
    // Guard: the tap that OPENS the inspect modal can reach the backdrop and close it
    // instantly ("blink"). Ignore backdrop dismiss for a moment after open (the ✕ always works).
    const detailOpenedAt = useRef(0);
    const [tipEffect, setTipEffect] = useState<CombatEffectChipVM | null>(null);
    /**
     * Which threat phases are expanded in the pre-combat reveal (an accordion).
     * Holds the 1-based `phase.index` of every OPEN row. Seeded with `1` so the
     * imminent phase — the only one that can hurt you this turn — is still read
     * at a glance, while the rest of the sequence collapses to its headers.
     */
    const [openThreatPhases, setOpenThreatPhases] = useState<ReadonlySet<number>>(
        () => new Set([1]),
    );
    /** Toggle one threat phase row open/closed by its 1-based phase index. */
    const toggleThreatPhase = useCallback((phaseIndex: number) => {
        setOpenThreatPhases((prev) => {
            const next = new Set(prev);
            if (next.has(phaseIndex)) next.delete(phaseIndex);
            else next.add(phaseIndex);
            return next;
        });
    }, []);
    // Signature-rune info popup (long-press / unaffordable tap) + pilgrim modal.
    const [sigInfo, setSigInfo] = useState<CombatSignatureVM | null>(null);
    const sigLines = sigInfo ? signatureInfoLines(sigInfo) : null;
    const [pilgrimOpen, setPilgrimOpen] = useState(false);
    // Deckbuilder reward — rolled once on victory, claimed before the summary.
    // The offer lives in the STORE, not here, so navigating away mid-draft
    // keeps the earned reward.
    const wroteBackRef = useRef(false);
    const exitedRef = useRef(false);
    // Resolution-feedback bridge: the latest resolved engine events + a rising seq.
    // The events are stashed in a ref (set inside the state updater) and surfaced
    // to the board via a bumped seq, so the pane animates exactly once per resolve.
    const fxRef = useRef<CombatEvent[]>([]);
    const [fxSeq, setFxSeq] = useState(0);
    // END-phase in-flight guard. `resolvingRef` is the synchronous gate
    // (checked before any dispatch, so machine-gun taps in the same frame are
    // dropped); `resolving` is the render-visible mirror that dims/disables the
    // button and suppresses staging/apply until the resolution + its fx timeline
    // settle.
    const resolvingRef = useRef(false);
    const [resolving, setResolving] = useState(false);
    const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const endResolving = useCallback(() => {
        resolvingRef.current = false;
        setResolving(false);
    }, []);
    useEffect(() => () => { if (resolveTimer.current) clearTimeout(resolveTimer.current); }, []);


    // Bootstrap the encounter ONCE — combat must not restart when the store
    // player mutates (e.g. our own write-back) or props re-identify.
    // Real encounters run unseeded (`seed` only arrives from sims/tests); stamp
    // a random one so seed-keyed presentation (the enemy-art pick) reshuffles
    // per encounter. Nothing engine-side reads `state.seed` after init.
    const initial = useMemo(
        () => {
            // `flags` (the curated-loadout codec, `combat-loadout-card:`
            // entries) is an explicit prop, not read from the store here:
            // `createNewGameState` seeds every fresh save's flags with a
            // loadout for `STARTING_CARD_IDS`, which is NOT a subset of the
            // dev sandbox's synthetic demo deck. Reading the store would deal
            // a loadout card the demo player doesn't know and crash combat.
            // Each caller supplies flags that correspond to the
            // `bootstrapPlayer` it passed.
            const s = initializeCombatEncounter(bootstrapPlayer, enemy, deck, seed, flags);
            const stamped = s.seed === undefined ? { ...s, seed: Math.floor(Math.random() * 0xffffffff) } : s;
            // AXM Log: thin mount marker only — the engine's `withLog` tap
            // already mirrors every CombatEvent this encounter produces.
            try {
                getLogger().info('combat', 'encounter-mounted', {
                    enemy: enemy.name, seed: stamped.seed,
                });
            } catch { /* logging never breaks play */ }
            return stamped;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const live = state ?? initial;
    // The foe's DANGER names show only once the save records it beaten.
    const enemySlug = enemySlugOf(live.enemy);
    const beaten = useGameState((s) => (enemySlug ? hasDefeatedEnemy(s, enemySlug) : false));
    const vm = useMemo(() => buildCombatViewModel(live, beaten), [live, beaten]);

    // ── momentum chain — `vm.momentumV2` is read
    // straight off engine state; the panel owns only the how-it-works popup. ──
    const [momentumInfoOpen, setMomentumInfoOpen] = useState(false);
    // The board glossary: one word or mark the player touched, shown in the
    // same plaque the effect chips use.
    const [gloss, setGloss] = useState<{ ids: readonly BoardTermId[]; live?: BoardGlossLive } | null>(null);

    // The persistent combat log. It opens inside the pilgrim modal (LOG in
    // its XP row) and returns to the stats view with BACK; closing the modal
    // resets it. The history is cheap (capped at 200 lines) and only walked
    // off `live`, so recomputing every render is fine.
    const [pilgrimLog, setPilgrimLog] = useState(false);
    const logHistory = useMemo(() => selectCombatLogHistory(live, beaten), [live, beaten]);
    const logScrollRef = useRef<ScrollView | null>(null);
    const closePilgrim = useCallback(() => { setPilgrimOpen(false); setPilgrimLog(false); }, []);

    // ── screen-level drag controller (cards + dice) ──
    // dragX/dragY are written straight from the board's gesture worklets every
    // frame (see DragController.x/y) — the JS thread only sees begin and end.
    // TWO views of the live drag, committed at different priorities
    // (drag-perf hypothesis 1, pickup latency):
    //   · `ghostDrag` — urgent. Only the panel and its ghost read it, so the
    //     pickup commit that reveals the ghost is cheap (the memoized board
    //     sits it out: its `drag` prop has not changed yet);
    //   · `dragActive` — a transition. The board reads it (dims, sockets,
    //     SCRAP bin, play-region outline); that heavier re-render follows
    //     right behind instead of standing between the finger and the ghost.
    // Both are set together and cleared together; React applies them in
    // order, so a release that lands before the transition commits still
    // ends at null.
    const [ghostDrag, setGhostDrag] = useState<DragPayload | null>(null);
    const [dragActive, setDragActive] = useState<DragPayload | null>(null);
    const dragRef = useRef<DragPayload | null>(null);
    const dragSpanEndRef = useRef<DragSpanEnd | null>(null);
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);
    const dragShown = useSharedValue(0);
    // Drop-INELIGIBLE staged-card rects for the die drag in flight (measured
    // once by the board at drag begin) — drives the ghost's ✕ cue per frame
    // on the UI thread, no JS round-trips.
    const badRects = useSharedValue<Rect[]>([]);
    const begin = useCallback((payload: DragPayload, x: number, y: number) => {
        // NOTE: dragShown is NOT set here. The ghost keeps the PREVIOUS drag's
        // payload until React commits `dragActive`, so showing it synchronously
        // flashed the last-dragged card's face for a frame when a DIE drag began
        // (the "die looks like a card" bug). The effect below reveals it on the
        // commit that carries the right payload.
        dragRef.current = payload; dragX.value = x; dragY.value = y;
        // One Sentry span per drag (preview builds only; a no-op elsewhere).
        // A span still open here lost its end, so it closes as interrupted.
        dragSpanEndRef.current?.('interrupted');
        dragSpanEndRef.current = startDragSpan(dragSpanKind(payload));
        setGhostDrag(payload);
        startTransition(() => { setDragActive(payload); });
    }, [dragX, dragY]);
    // Reveal in a LAYOUT effect: it runs as the commit that carries the right
    // payload lands, before paint, so the ghost shows on that frame rather
    // than one passive-effect hop later.
    useLayoutEffect(() => {
        if (ghostDrag) dragShown.value = 1;
    }, [ghostDrag, dragShown]);
    const drag: DragController = useMemo(() => ({ begin, end: () => undefined, active: dragActive, x: dragX, y: dragY, badRects }), [begin, dragActive, dragX, dragY, badRects]);
    // Every exit funnels here, so the drag's span closes exactly once:
    // `(-1,-1)` from the gesture is a cancel, any other point a drop, and the
    // interrupt recovery below says so itself.
    const finish = useCallback((x: number, y: number, outcome: DragSpanOutcome) => {
        const payload = dragRef.current; dragRef.current = null; dragShown.value = 0; setGhostDrag(null); setDragActive(null);
        const endSpan = dragSpanEndRef.current; dragSpanEndRef.current = null;
        endSpan?.(outcome);
        if (!payload) return;
        const resolver = (drag as DragController & { resolveDrop?: DropResolver }).resolveDrop;
        if (resolver) void resolver(payload, x, y);
    }, [drag, dragShown]);
    const end = useCallback((x: number, y: number) => finish(x, y, x < 0 && y < 0 ? 'cancelled' : 'dropped'), [finish]);
    drag.end = end;
    // Force-finalize a live drag whose pointer stream was interrupted
    // (pointercancel / blur / tab hidden / dead stream) so it can't leave a
    // permanent ghost or wedge staging. The finalizer is the SAME snap-home path
    // the cancel branch uses (`end(-1,-1)`).
    const finalizeDrag = useCallback(() => finish(-1, -1, 'interrupted'), [finish]);
    // Leaving combat mid-drag closes its span too.
    useEffect(() => () => { dragSpanEndRef.current?.('interrupted'); dragSpanEndRef.current = null; }, []);
    useDragInterruptRecovery(!!ghostDrag, finalizeDrag, DRAG_WATCHDOG_MS);
    // Centre the hand-card face under the finger (half of HAND_CARD_W/H)
    // and lift it above the fingertip so the card stays readable mid-drag.
    const cardGhostStyle = useAnimatedStyle(() => ({ opacity: dragShown.value, transform: [{ translateX: dragX.value - HAND_CARD_W / 2 }, { translateY: dragY.value - HAND_CARD_H / 2 - 24 }, { scale: 1.1 }] }));
    // The DIE ghost is a small chip, not a card: it must anchor at ITS OWN
    // half-size so the die stays centred under the pointer for the whole drag.
    // CONSTRAINT: never reuse the card's half-W/H anchor for the die — the die
    // would render up-and-left of the finger.
    const dieGhostStyle = useAnimatedStyle(() => ({ opacity: dragShown.value, transform: [{ translateX: dragX.value - DIE_GHOST_FOOT.width / 2 }, { translateY: dragY.value - DIE_GHOST_FOOT.height / 2 }, { scale: 1.1 }] }));
    // Ineligible-target cue: while the pointer is
    // over ANY illegal drop target (an off-color or already-armed staged card,
    // rects measured by the board at drag begin), the ghost carries an ✕ —
    // "this die can't land here", said before the drop.
    const dieGhostXStyle = useAnimatedStyle(() => {
        const x = dragX.value;
        const y = dragY.value;
        const over = badRects.value.some((r) =>
            x >= r.x - 16 && x <= r.x + r.width + 16 && y >= r.y - 16 && y <= r.y + r.height + 16);
        return { opacity: dragShown.value > 0 && over ? 1 : 0 };
    });

    // ── engine wiring ──
    const apply = useCallback((fn: (s: CombatEncounterState) => CombatEncounterState) => {
        setState((prev) => { const s = prev ?? initial; return fn(s); });
    }, [initial]);

    // The play log's screen events (phase BE2d): read through refs so the
    // handlers below keep their identity and the board's memo holds.
    const screenRef = useRef({ live, stagedUids, persistOutcome });
    screenRef.current = { live, stagedUids, persistOutcome };
    const recordScreen = useCallback((kind: Exclude<PlayLogUiEventKind, 'ui-signature-refused'>, uid: string) => {
        const { live: s, persistOutcome: persisted } = screenRef.current;
        if (!persisted) return;
        const cardId = s.hand.find((h) => h.uid === uid)?.cardId;
        if (cardId) fightRecorder.screen(kind, cardId);
    }, []);

    const unstageUid = useCallback((uid: string) => setStagedUids((prev) => prev.filter((u) => u !== uid)), []);
    const onEnter = useCallback(() => apply((s) => rollEncounterDice(s).state), [apply]);
    const onStage = useCallback((uid: string) => {
        if (resolvingRef.current) return; // no staging mid-resolution
        if (!screenRef.current.stagedUids.includes(uid)) recordScreen('ui-staged', uid);
        setStagedUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
    }, [recordScreen]);
    // Only the player's own unstage is a screen event: a card leaving staging
    // because it was played or discarded, or at the turn's end, is not.
    const onUnstage = useCallback((uid: string) => {
        if (screenRef.current.stagedUids.includes(uid)) recordScreen('ui-unstaged', uid);
        unstageUid(uid);
    }, [recordScreen, unstageUid]);
    // APPLY one staged card (hazard model — the die is OPTIONAL). `power` true →
    // the dragged die powers the card (bottom action); `power` false → the FREE
    // base action (top action, no die). One commit; the card leaves staging.
    const onApply = useCallback((uid: string, dieId: string | null, power: boolean, x?: number) => {
        if (resolvingRef.current) return; // a drag must not land mid-resolution
        apply((s) => {
            // Every dropped die (fresh tray face, Reserve, or GHOST) is its
            // OWN power source and is forwarded as the explicit `dieId`: the
            // engine's `playBottomAction` REQUIRES one (no dieId fizzles
            // "choose a die to power this card"). `playCombatCard` also
            // advances the momentum wheel and grants its die internally.
            // `x`: the amount chosen for a "SACRIFICE any amount" line.
            const t = playCombatCard(s, { uid }, power, dieId ?? undefined, undefined, x);
            fxRef.current = t.events;
            return t.state;
        });
        setFxSeq((n) => n + 1);
        unstageUid(uid);
    }, [apply, unstageUid]);
    const onDiscard = useCallback((uid: string) => { apply((s) => discardCombatCard(s, uid).state); unstageUid(uid); }, [apply, unstageUid]);
    // A tap on a rune that cannot fire opens its info and is a refused tap in the
    // play log (LR1g); a long-press opens the same info and is not.
    const onSignatureInfo = useCallback((s: CombatSignatureVM, tapped?: boolean) => {
        setSigInfo(s);
        if (tapped && screenRef.current.persistOutcome) fightRecorder.signatureRefused(s.id, s.reason ?? 'refused');
    }, []);
    const onSignature = useCallback((id: string) => apply((s) => playSignatureSkill(s, id).state), [apply]);
    // The Toll-Keeper's toll (phase EN1l): a refusal fizzles into the log in the engine's words.
    const onPayToll = useCallback(() => {
        apply((s) => {
            const t = payTheToll(s);
            fxRef.current = t.events;
            return t.state;
        });
        setFxSeq((n) => n + 1);
    }, [apply]);
    const onEndPhase = useCallback(() => {
        // The synchronous gate: a second tap in the same frame (touch
        // double-tap) finds the lock already held and is dropped, so exactly one
        // threat phase resolves per intent.
        if (resolvingRef.current) return;
        resolvingRef.current = true;
        setResolving(true);
        apply((s) => {
            // Close the turn BEFORE the phase resolves: ONE unspent
            // mana/special tray die BANKS to the Reserve when a slot is free
            // (`endTurn`, combat.engine.ts). Skipping to `resolveThreatPhase`
            // would lose it, since that boundary WIPES the tray.
            // END-TURN BREADCRUMBS. A native process death at end of turn
            // leaves nothing but what was already logged. These four lines
            // ride into Sentry as breadcrumbs (lib/monitoring.ts) and into the
            // on-device crash tail, so the LAST one recorded names the step
            // that died. Cheap: four entries per turn, not a hot loop.
            const log = getLogger();
            log.info('combat', 'end-phase:begin', {
                turn: s.turn, round: s.round, phaseIndex: s.currentPhaseIndex,
                dice: s.dice.length, reserve: (s.reserve ?? []).length, hand: s.hand.length,
            });
            const ended = endTurn(s);
            log.info('combat', 'end-phase:turn-closed', { banked: (ended.state.reserve ?? []).length });
            const t = resolveThreatPhase(ended.state);
            log.info('combat', 'end-phase:threat-resolved', {
                phase: t.state.phase, outcome: t.state.finalOutcome ?? null, events: t.events.length,
            });
            fxRef.current = [...ended.events, ...t.events];
            let ns = t.state;
            if (ns.phase === 'phase-play' && ns.dice.length === 0) ns = startTurn(ns).state;
            log.info('combat', 'end-phase:tray-rolled', { turn: ns.turn, dice: ns.dice.length });
            return ns;
        });
        setFxSeq((n) => n + 1);
        setStagedUids([]);
        // Release the lock once the resolution + its fx timeline have played out.
        if (resolveTimer.current) clearTimeout(resolveTimer.current);
        resolveTimer.current = setTimeout(endResolving, RESOLVE_LOCK_MS);
    }, [apply, endResolving]);
    const onMercy = useCallback((choice: 'spare' | 'exploit') => apply((s) => selectEncounterMercyChoice(s, choice).state), [apply]);
    // Stable resolution-feedback payload — recomputed only when a new resolve bumps
    // the seq (captures the events stashed in fxRef just before).
    const fx = useMemo<CombatFx>(() => ({ seq: fxSeq, events: fxRef.current }), [fxSeq]);

    const handleExit = useCallback(() => {
        if (exitedRef.current) return;
        exitedRef.current = true;
        // Clear the draft slate for the NEXT encounter. Deliberately here and
        // not on mount: the store slice has to outlive a panel remount, or it
        // would drop the offer exactly when it is meant to preserve it.
        resetCombatRewardAction(store);
        try {
            getLogger().info('combat', 'encounter-exited', {
                outcome: live.finalOutcome ?? null,
            });
        } catch { /* logging never breaks play */ }
        onExit(live.finalOutcome ?? null);
    }, [onExit, live.finalOutcome, store]);

    // Economy write-back — fires once, the instant combat reaches a terminal
    // outcome (so spoils land even if the player lingers on the summary).
    useEffect(() => {
        if (!live.finalOutcome || wroteBackRef.current) return;
        wroteBackRef.current = true;
        if (persistOutcome) applyHazardOutcome(store, live.finalOutcome, live, enemy);
    }, [live.finalOutcome, live, persistOutcome, store, enemy]);

    // The play log (phase BE2c): every live state goes to the fight recorder,
    // which stamps the log entries it has not seen and posts once on the final
    // outcome. Only a persisted fight was staged by the bridge that starts it.
    useEffect(() => {
        if (persistOutcome) fightRecorder.observe(live);
    }, [live, persistOutcome]);

    // Roll the deckbuilder reward once, on victory. The roll is engine truth;
    // the action is idempotent, so a remount re-reads the SAME offer rather
    // than rerolling it.
    useEffect(() => {
        if (live.finalOutcome === 'victory') rollCombatRewardAction(store, enemy);
    }, [live.finalOutcome, store, enemy]);

    // Claim (or skip) — the action appends the card AND persists, so the pick
    // does not wait on some unrelated save() to happen along.
    const onRewardPick = useCallback((cardId: string | null) => {
        claimCombatRewardAction(store, cardId);
    }, [store]);
    const onRewardUpgrade = useCallback((cardId: string) => {
        claimCombatUpgradeAction(store, cardId);
    }, [store]);
    // The elite reward's upgrade as the shared picker's one row (null hides it).
    const rewardUpgradeRows = useMemo(
        () => (rewardUpgrade && player
            ? cardUpgradeRowsVM([rewardUpgrade.fromCardId], [...player.knownCards, ...(player.combatRewardCards ?? [])])
            : null),
        [rewardUpgrade, player],
    );

    // Identity-stable board props: inline arrows / fresh objects here defeat
    // CombatBoard's React.memo and re-render the whole 1200-line board on every
    // unrelated panel state change (tooltips, fx bumps) — felt as drag jank.
    const onInspect = useCallback((c: CombatCardVM) => {
        detailOpenedAt.current = Date.now();
        if (screenRef.current.persistOutcome) fightRecorder.screen('ui-detail-opened', c.cardId);
        setDetailCard(c);
    }, []);
    /**
     * Dismiss the card detail overlay. Shared by the backdrop, the card body,
     * and the scrolled content so a tap ANYWHERE exits. The 350ms guard swallows the tail of the press that OPENED
     * the overlay, which would otherwise close it on the same gesture.
     */
    const closeCardDetail = useCallback(() => {
        if (Date.now() - detailOpenedAt.current > 350) setDetailCard(null);
    }, []);
    const onPlayerInspect = useCallback(() => setPilgrimOpen(true), []);
    const onMomentumInfo = useCallback(() => setMomentumInfoOpen(true), []);
    const onGloss = useCallback((ids: readonly BoardTermId[], liveNumbers?: BoardGlossLive) => {
        if (resolvingRef.current) return; // nothing opens mid-resolution
        setGloss({ ids, live: liveNumbers });
    }, []);

    // Ghost stays MOUNTED once the first drag begins (opacity-gated by dragShown):
    // remounting the face + image on every drag begin cost a mount + decode while
    // the finger was already moving — the start-of-drag stutter.
    const lastDragRef = useRef<DragPayload | null>(null);
    if (ghostDrag) lastDragRef.current = ghostDrag;
    const ghostPayload = ghostDrag ?? lastDragRef.current;

    if (!vm) {
        return <View style={styles.root} testID="combat-encounter-empty" />;
    }

    const summary = live.finalOutcome ? buildCombatSummary(live) : null;
    const mercy = live.phase === 'mercy-choice' && !live.finalOutcome;
    const showReveal = live.phase === 'reveal';
    // The log toggle/sheet never shows over the
    // reveal (nothing has happened yet) or once the fight is over (the
    // summary owns that screen).
    const logAvailable = !showReveal && !live.finalOutcome;

    return (
        <View style={styles.root}>
            {!showReveal && (
                <CombatBoard
                    vm={vm}
                    drag={drag}
                    stagedUids={stagedUids}
                    onApply={onApply}
                    onStage={onStage}
                    onUnstage={onUnstage}
                    onDiscard={onDiscard}
                    onSignature={onSignature}
                    onEndPhase={onEndPhase}
                    resolving={resolving}
                    onInspect={onInspect}
                    onChip={setTipEffect}
                    onGloss={onGloss}
                    onSignatureInfo={onSignatureInfo}
                    onPlayerInspect={onPlayerInspect}
                    onMomentumInfo={onMomentumInfo}
                    fx={fx}
                    region={region}
                    onPayToll={onPayToll}
                />
            )}

            {/* CombatRevealOverlay — read the foe before you commit */}
            {showReveal && (
                <View style={styles.reveal} testID="combat-reveal">
                    <ScrollView contentContainerStyle={styles.revealScroll} testID="combat-reveal-column">
                        <Text style={styles.revealEyebrow}>⚔ A FOE BARS THE WAY</Text>
                        <View style={[styles.revealPortrait, { borderColor: AXM.blood }]}>
                            <Image
                                source={getEncounterEnemyArt(vm.enemy.artKey, vm.enemy.artNonce)}
                                style={{ width: 120, height: 140 }}
                                contentFit="contain"
                                transition={0}
                                accessibilityLabel={vm.enemy.name}
                            />
                        </View>
                        <Text style={styles.revealName}>{vm.enemy.name}</Text>
                        <Text style={styles.revealHp}>♥ {vm.enemy.hp} / {vm.enemy.maxHp}</Text>
                        {/* This screen is the commit gate for a fight: beside the
                          * foe's VITAE and threat sequence, show the player's own
                          * VITAE, the figure that decides whether to fight or turn back. */}
                        <Text style={styles.revealYours} testID="combat-reveal-player-vitae">
                            YOURS ♥ {vm.player.hp} / {vm.player.maxHp}
                        </Text>
                        <Text style={styles.revealSection}>THREAT SEQUENCE</Text>
                        {/* No line clamp on the threat text: a multi-clause phase
                            ("Deals 12. Applies BLEED 2.") must read in full on the
                            one screen whose whole job is to telegraph it. */}
                        {live.threatPhases.map((p, i) => {
                            const meta = INTENT_ICONS[p.intentType ?? 'pass'];
                            // Accordion row: the header (icon + PHASE n · INTENT · damage +
                            // chevron) is always present and is the whole touch
                            // target; the threat text only mounts when open.
                            const open = openThreatPhases.has(p.index);
                            const header = threatPhaseHeader(p, beaten);
                            const moveName = p.enemyMove ? telegraphName(p, beaten) : null;
                            return (
                                <View key={i} style={styles.revealPhase}>
                                    <Pressable
                                        onPress={() => toggleThreatPhase(p.index)}
                                        accessibilityRole="button"
                                        accessibilityState={{ expanded: open }}
                                        accessibilityLabel={header.a11y}
                                        accessibilityHint={open ? 'tap to collapse this phase' : 'tap to read this phase'}
                                        testID={`combat-reveal-phase-${p.index}`}
                                        style={styles.revealPhaseHead}
                                    >
                                        <Text style={[styles.revealPhaseIcon, { color: meta.color }]}>{meta.icon}</Text>
                                        <Text style={[styles.revealPhaseLabel, styles.revealPhaseHeadLabel]}>
                                            {header.text}
                                        </Text>
                                        <Text style={styles.revealPhaseChevron}>{open ? '▾' : '▸'}</Text>
                                    </Pressable>
                                    <View style={[styles.revealPhaseBody, open ? null : styles.revealPhaseBodyHidden]}>
                                        {open ? (p.branch ? (
                                            /* A branch phase telegraphs its condition + BOTH
                                               outcomes before commit; the taken fork is marked after. */
                                            <View>
                                                <Text style={styles.revealBranchCond}>⑂ {p.branch.conditionText}</Text>
                                                <Text style={[styles.revealPhaseText, p.branch.taken === 'then' ? styles.revealBranchTaken : null]}>
                                                    {p.branch.taken === 'then' ? '▶ ' : ''}then: {p.branch.then.threatAction.description}
                                                </Text>
                                                <Text style={[styles.revealPhaseText, p.branch.taken === 'else' ? styles.revealBranchTaken : null]}>
                                                    {p.branch.taken === 'else' ? '▶ ' : ''}otherwise: {p.branch.else.threatAction.description}
                                                </Text>
                                            </View>
                                        ) : p.enemyMove ? (
                                            // An unseen DANGER has no name to show, as IntentIcon's
                                            // badge also shows nothing for it.
                                            moveName ? <Text style={styles.revealPhaseText}>{moveName}</Text> : null
                                        ) : (
                                            <Text style={styles.revealPhaseText}>{p.threatAction.description}</Text>
                                        )) : null}
                                    </View>
                                </View>
                            );
                        })}
                        <Pressable onPress={onEnter} testID="combat-enter" accessibilityRole="button" accessibilityLabel="Enter combat and roll your first dice" style={[styles.revealBtn, { borderColor: AXM.sulfur }]}>
                            <Text style={[styles.revealBtnText, { color: AXM.sulfur }]}>ENTER COMBAT ›</Text>
                        </Pressable>
                        {/* The retreat: the reveal is the commit gate, so the choice
                            sits beside the commit. Absent when retreat is sealed. */}
                        {onWithdraw && (
                            <Pressable
                                onPress={onWithdraw}
                                testID="combat-withdraw"
                                accessibilityRole="button"
                                accessibilityLabel="Withdraw from this encounter"
                                style={styles.withdrawBtn}
                            >
                                <Text style={[styles.withdrawBtnText, { color: AXM.bone }]}>WITHDRAW</Text>
                                <Text style={styles.withdrawSub}>forfeit the path</Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* mercy choice */}
            {mercy && (
                <View style={styles.backdrop} testID="combat-mercy">
                    <View style={[styles.modal, { borderColor: HUE.tickPurple }]}>
                        <Text style={styles.modalTitle}>{live.enemy.name} is overwhelmed.</Text>
                        <Text style={styles.modalSub}>The will to fight has drained away.</Text>
                        <View style={styles.modalBtns}>
                            <Pressable onPress={() => onMercy('spare')} testID="combat-mercy-spare" accessibilityRole="button" accessibilityLabel="Spare" style={[styles.modalBtn, { borderColor: HUE.boonGreen }]}><Text style={[styles.modalBtnText, { color: HUE.boonGreen }]}>SPARE</Text></Pressable>
                            <Pressable onPress={() => onMercy('exploit')} testID="combat-mercy-exploit" accessibilityRole="button" accessibilityLabel="Exploit" style={[styles.modalBtn, { borderColor: AXM.blood }]}><Text style={[styles.modalBtnText, { color: AXM.blood }]}>EXPLOIT</Text></Pressable>
                        </View>
                    </View>
                </View>
            )}

            {/* card detail — Sanguine-Step shape: keyword DEFINITIONS on top, ONE
                large rendered card centrepiece over a stance-coloured halo, then the
                FREE-vs-POWER fork. Un-boxed: everything floats on the dimmed backdrop.
                The developer-facing mathLine / subtitle / readNote are NEVER shown. */}
            {detailCard && (
                <Pressable style={styles.backdrop} testID="combat-card-detail" onPress={closeCardDetail}>
                    {/* A card detail screen exits on a tap ANYWHERE — the card body
                        does not claim the touch via `onStartShouldSetResponder`,
                        and the scrolled content is wrapped in its own Pressable so
                        a tap landing on the prose closes too. The ✕ stays as an explicit affordance. Scroll
                        gestures are unaffected: a drag never fires `onPress`. */}
                    <Pressable style={styles.detailModalWrap} onPress={closeCardDetail}>
                        <ScrollView
                            style={styles.detailScroll}
                            contentContainerStyle={styles.detailStack}
                        >
                            <Pressable onPress={closeCardDetail}>
                            {/* (1) keyword DEFINITIONS at the top — ONE compact ledger,
                                not a box per keyword, so the card stays visible.
                                Hairline-separated rows, terse type. */}
                            {detailCard.detail.keywords.length > 0 && (
                                <View style={styles.detailKeywords}>
                                    {detailCard.detail.keywords.map((k, i) => {
                                        const tag = keywordTypeTag(detailCard.face.kind, i);
                                        return (
                                            <View key={k.name} style={[styles.detailKeywordRow, i > 0 ? styles.detailKeywordRowSep : null]}>
                                                <View style={styles.detailKeywordHead}>
                                                    <Text style={[styles.detailKeywordName, k.minor ? { color: AXM.ash } : null]}>{k.name}</Text>
                                                    <Text style={[styles.detailKeywordTag, { color: TAG_COLORS[tag] ?? AXM.bone }]}>{tag}</Text>
                                                </View>
                                                <Text style={styles.detailKeywordDef}>{k.def}{k.minor ? ' (minor right now)' : ''}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {/* (2) the LARGE rendered card over a stance-coloured radial halo.
                                The face is the glance read only (name · free glyph · KEYWORD ·
                                value); the sentence, the type strip and the die triplet are
                                shown BELOW, where the definitions already live. */}
                            <View style={styles.detailCardWrap}>
                                <Svg width={detailCardW + 120} height={detailCardW + 120} viewBox="0 0 100 100" style={styles.detailHalo} pointerEvents="none">
                                    <Defs>
                                        <RadialGradient id="axmCardHalo" cx="50%" cy="50%" r="50%">
                                            <Stop offset="0%" stopColor={detailCard.stanceColor} stopOpacity={0.34} />
                                            <Stop offset="60%" stopColor={detailCard.stanceColor} stopOpacity={0.1} />
                                            <Stop offset="100%" stopColor={detailCard.stanceColor} stopOpacity={0} />
                                        </RadialGradient>
                                    </Defs>
                                    <Circle cx={50} cy={50} r={50} fill="url(#axmCardHalo)" />
                                </Svg>
                                <CombatCardFace card={detailCard} width={detailCardW} height={Math.round(detailCardW * 1.43)} large />
                            </View>
                            {/* the card's own metadata strip — not printed on the face,
                                so it reads here instead. */}
                            <View style={styles.detailMetaRow}>
                                <Text style={styles.detailMetaStrip} testID="combat-card-detail-meta">{detailCard.detail.metaChip}</Text>
                                {/* Rarity as a PIP ROW beside the named band already in
                                    the meta strip. The count is what survives greyscale
                                    and colour blindness; the hue is decoration on top of
                                    it, never the signal by itself. Both come from the
                                    `card-rarity.engine` module — no local banding. */}
                                <View
                                    style={styles.detailRarityPips}
                                    testID="combat-card-detail-rarity"
                                    accessibilityRole="text"
                                    accessibilityLabel={`${detailCard.detail.rarityLabel} card`}
                                >
                                    {Array.from({ length: detailCard.detail.rarityPips }).map((_, i) => (
                                        <View key={i} style={[styles.detailRarityPip, { backgroundColor: detailCard.detail.rarityColor }]} />
                                    ))}
                                </View>
                            </View>

                            {/* (3) the NO-DIE / +DIE fork. The face is bare, so this is the
                                only place a player can read what the card actually does. Keywords bold out of the sentence and are defined
                                in the ledger at the top. */}
                            <View style={styles.detailPlays}>
                                <View style={styles.detailPlayRow}>
                                    <Text style={styles.detailPlayTag}>{`◇ ${detailCard.detail.freeTag}`}</Text>
                                    <Text style={styles.detailPlayText}>{detailCard.detail.freePill}</Text>
                                </View>
                                <View style={[styles.detailPlayRow, styles.detailPlayRowSep]}>
                                    <Text style={[styles.detailPlayTag, { color: detailCard.face.categoryColor }]}>{`◆ ${detailCard.detail.paidTag}`}</Text>
                                    <View style={styles.detailPlayBody}>
                                        <OutcomeText
                                            text={detailCard.detail.diePaidLine ?? detailCard.detail.outcomeLine}
                                            names={detailCard.detail.keywords.map(k => k.name)}
                                            base={styles.detailPlayText}
                                            bold={[styles.detailPlayText, styles.detailPlayBold, { color: detailCard.face.categoryColor }]}
                                        />
                                    </View>
                                </View>
                            </View>
                            {/* STACKS stays: whether a status stacks is exactly why a
                                player replays a card mid-fight.
                                The ▲/—/▼ legend rides the triplet itself and the
                                Color Law hint rides the ◆ tag of the row it qualifies.
                                The VM still carries both for the DECK screen, which is
                                read out of combat and can afford full sentences. */}
                            {detailCard.detail.stacksText ? <Text style={styles.detailStacks}>{detailCard.detail.stacksText}</Text> : null}

                            {/* System-term definitions (Conviction, Resonance,
                                Reserve/Pips, Floating, WILD/X): ONLY the entries THIS
                                card's printed lines reference, derived per-card by the
                                presenter (systemTermsForCard), each term at most once. */}
                            {detailCard.detail.systemTerms.length > 0 && (
                                <View style={styles.systemsGlossary}>
                                    {detailCard.detail.systemTerms.map(s => (
                                        <Text key={s.term} style={styles.systemsGlossaryLine}>
                                            <Text style={styles.systemsGlossaryTerm}>{s.term}</Text>
                                            {' — ' + s.def}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            {/* No flavor text here: mid-fight the player is deciding which
                                die to spend. `card.flavor` still rides the VM; the DECK
                                screen shows it, read between fights. */}
                            </Pressable>
                        </ScrollView>

                    </Pressable>

                    {/* close ✕ — pinned to the BACKDROP's bottom-right (reference shape), so
                        it never falls below the fold and never overlaps the keyword tags. */}
                    <Pressable
                        onPress={() => setDetailCard(null)}
                        testID="combat-card-detail-close"
                        accessibilityRole="button"
                        accessibilityLabel="Close card detail"
                        hitSlop={10}
                        style={[styles.detailClose, { borderColor: detailCard.face.categoryColor }]}
                    >
                        <Text style={[styles.detailCloseText, { color: detailCard.face.categoryColor }]}>✕</Text>
                    </Pressable>
                </Pressable>
            )}

            {/* effect tooltip — reference status-detail plaque: radial glyph burst hero,
                coloured name, serif gloss, mechanics meta, hex category badge pinned to
                the bottom border. */}
            {tipEffect && (() => {
                const cat = effectCategory(tipEffect.glyph.kind, tipEffect.glyph.color);
                return (
                    <Pressable style={styles.backdrop} testID="combat-effect-tip" onPress={() => setTipEffect(null)}>
                        <View style={[styles.tipPlaque, { borderColor: `${tipEffect.glyph.color}66` }]}>
                            {/* corner brackets */}
                            <View style={[styles.tipCorner, styles.tipCornerTl, { borderColor: tipEffect.glyph.color }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerTr, { borderColor: tipEffect.glyph.color }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerBl, { borderColor: tipEffect.glyph.color }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerBr, { borderColor: tipEffect.glyph.color }]} pointerEvents="none" />
                            <GlyphBurst color={tipEffect.glyph.color} glyph={tipEffect.glyph.glyph} />
                            <Text style={[styles.tipName, { color: tipEffect.glyph.color, textShadowColor: tipEffect.glyph.color }]}>
                                {tipEffect.glyph.label.toUpperCase()}
                            </Text>
                            {tipEffect.gloss && <Text style={styles.tipGloss}>{tipEffect.gloss}</Text>}
                            <Text style={styles.tipMeta}>
                                {`intensity ${tipEffect.intensity} · ${tipEffect.duration} turns left`}
                            </Text>
                            <View style={styles.tipBadgeWrap} pointerEvents="none">
                                <Svg width={128} height={30} viewBox="0 0 128 30">
                                    <Polygon
                                        points="14,1 114,1 127,15 114,29 14,29 1,15"
                                        fill={AXM.panelBg}
                                        stroke={cat.color}
                                        strokeWidth={1.5}
                                    />
                                </Svg>
                                <View style={StyleSheet.absoluteFill}>
                                    <View style={styles.tipBadgeInner}>
                                        <Text style={[styles.tipBadgeText, { color: cat.color }]} allowFontScaling={false}>{cat.label}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Pressable>
                );
            })()}

            {/* signature-rune info — long-press (or unaffordable tap) on a rune */}
            {sigInfo && (
                <Pressable style={styles.backdrop} testID="combat-signature-info" onPress={() => setSigInfo(null)}>
                    <View style={[styles.tipPlaque, { borderColor: `${AXM.sulfur}66` }]}>
                        <View style={[styles.tipCorner, styles.tipCornerTl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerTr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerBl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerBr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <GlyphBurst color={AXM.sulfur} glyph={sigInfo.icon} />
                        <Text style={[styles.tipName, { color: AXM.sulfur, textShadowColor: AXM.sulfur }]}>{sigInfo.name.toUpperCase()}</Text>
                        {/* A refused rune leads with why: the reason is the news,
                          * the gloss is what it would have done. */}
                        {sigLines?.lead != null && (
                            <Text style={[styles.tipReason, { color: AXM.blood }]} testID="combat-signature-info-reason">{sigLines.lead}</Text>
                        )}
                        <Text style={styles.tipGloss}>{sigInfo.description}</Text>
                        <Text style={styles.tipMeta}>{sigLines?.meta}</Text>
                        <View style={styles.tipBadgeWrap} pointerEvents="none">
                            <Svg width={128} height={30} viewBox="0 0 128 30">
                                <Polygon points="14,1 114,1 127,15 114,29 14,29 1,15" fill={AXM.panelBg} stroke={AXM.sulfur} strokeWidth={1.5} />
                            </Svg>
                            <View style={StyleSheet.absoluteFill}>
                                <View style={styles.tipBadgeInner}>
                                    <Text style={[styles.tipBadgeText, { color: AXM.sulfur }]} allowFontScaling={false}>SIGNATURE</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Pressable>
            )}

            {/* momentum — how the wheel works */}
            {momentumInfoOpen && (
                <Pressable style={styles.backdrop} testID="combat-momentum-info" onPress={() => setMomentumInfoOpen(false)}>
                    <View style={[styles.tipPlaque, { borderColor: `${AXM.sulfur}66` }]}>
                        <View style={[styles.tipCorner, styles.tipCornerTl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerTr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerBl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <View style={[styles.tipCorner, styles.tipCornerBr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                        <GlyphBurst color={AXM.sulfur} glyph="✦" />
                        <Text style={[styles.tipName, { color: AXM.sulfur, textShadowColor: AXM.sulfur }]}>{MOMENTUM_GLOSS.title}</Text>
                        <Text style={styles.tipGloss} testID="combat-momentum-info-def">{MOMENTUM_GLOSS.def}</Text>
                        <Text style={styles.tipGloss} testID="combat-momentum-info-surge">{MOMENTUM_GLOSS.surge}</Text>
                        <Text style={styles.tipMeta}>{MOMENTUM_GLOSS.meta}</Text>
                        <View style={styles.tipBadgeWrap} pointerEvents="none">
                            <Svg width={128} height={30} viewBox="0 0 128 30">
                                <Polygon points="14,1 114,1 127,15 114,29 14,29 1,15" fill={AXM.panelBg} stroke={AXM.sulfur} strokeWidth={1.5} />
                            </Svg>
                            <View style={StyleSheet.absoluteFill}>
                                <View style={styles.tipBadgeInner}>
                                    <Text style={[styles.tipBadgeText, { color: AXM.sulfur }]} allowFontScaling={false}>COMBO</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Pressable>
            )}

            {/* board glossary — a word or mark the player touched (Conviction,
                a die, the piles, the phase ledger, IN PLAY), from one source in
                keywords.ts. Closes on a backdrop tap. */}
            {gloss && (() => {
                const view = boardGlossView(gloss.ids, gloss.live);
                return (
                    <Pressable style={styles.backdrop} testID="combat-gloss" onPress={() => setGloss(null)}>
                        <View style={[styles.tipPlaque, { borderColor: `${AXM.sulfur}66` }]}>
                            <View style={[styles.tipCorner, styles.tipCornerTl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerTr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerBl, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                            <View style={[styles.tipCorner, styles.tipCornerBr, { borderColor: AXM.sulfur }]} pointerEvents="none" />
                            <GlyphBurst color={AXM.sulfur} glyph={GLOSS_GLYPH[gloss.ids[0]]} />
                            <Text style={[styles.tipName, { color: AXM.sulfur, textShadowColor: AXM.sulfur }]} testID="combat-gloss-title">{view.title}</Text>
                            {view.sections.map((s, i) => (
                                <View key={i}>
                                    {s.title ? <Text style={[styles.tipName, { color: AXM.sulfur, textShadowColor: AXM.sulfur }]}>{s.title}</Text> : null}
                                    <Text style={styles.tipGloss} testID={`combat-gloss-def-${i}`}>{s.more ? `${s.def} ${s.more}` : s.def}</Text>
                                </View>
                            ))}
                            {view.live ? <Text style={styles.tipMeta} testID="combat-gloss-live">{view.live}</Text> : null}
                            <View style={styles.tipBadgeWrap} pointerEvents="none">
                                <Svg width={128} height={30} viewBox="0 0 128 30">
                                    <Polygon points="14,1 114,1 127,15 114,29 14,29 1,15" fill={AXM.panelBg} stroke={AXM.sulfur} strokeWidth={1.5} />
                                </Svg>
                                <View style={StyleSheet.absoluteFill}>
                                    <View style={styles.tipBadgeInner}>
                                        <Text style={[styles.tipBadgeText, { color: AXM.sulfur }]} allowFontScaling={false}>GLOSSARY</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Pressable>
                );
            })()}

            {/* pilgrim modal — tap the player avatar: base stats, XP, status
                effects, and the combat log behind LOG */}
            {pilgrimOpen && (() => {
                const p = live.player;
                const stats = p.baseStats ?? { heart: 0, body: 0, mind: 0 };
                return (
                    <Pressable style={styles.backdrop} testID="combat-pilgrim-modal" onPress={closePilgrim}>
                        <View style={styles.pilgrimWrap} onStartShouldSetResponder={() => true}>
                            {pilgrimLog && logAvailable ? (
                                // The persistent combat log: the whole fight, newest at the bottom.
                                <View style={styles.pilgrimLogView} testID="combat-log">
                                    <Pressable
                                        onPress={() => setPilgrimLog(false)}
                                        testID="combat-pilgrim-log-back"
                                        accessibilityRole="button"
                                        accessibilityLabel={COMBAT_LOG_CLOSE_A11Y}
                                        hitSlop={8}
                                        style={styles.logButton}
                                    >
                                        <Text style={styles.logButtonText}>{COMBAT_LOG_BACK_TEXT}</Text>
                                    </Pressable>
                                    <ScrollView
                                        ref={logScrollRef}
                                        style={styles.logScroll}
                                        contentContainerStyle={styles.logScrollContent}
                                        onContentSizeChange={() => logScrollRef.current?.scrollToEnd({ animated: false })}
                                    >
                                        {logHistory.map((entry) => (
                                            <Text key={entry.id} style={[styles.logLine, { color: entry.color }]}>{entry.text}</Text>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                            <ScrollView contentContainerStyle={styles.pilgrimStack} showsVerticalScrollIndicator={false}>
                                <View style={styles.pilgrimHead}>
                                    <View
                                        style={styles.pilgrimPortrait}
                                        testID="combat-pilgrim-portrait"
                                        accessible={dying}
                                        accessibilityLabel={dying ? 'Dying' : undefined}
                                    ><PlayerPortraitImage width={56} height={68} fit="cover" skullWhenDying /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.pilgrimName}>{vm.player.name}</Text>
                                        <Text style={styles.pilgrimVitae}>LVL {p.level ?? 1}   ♥ {vm.player.hp} / {vm.player.maxHp} VITAE{vm.player.guard > 0 ? `   🛡 ${vm.player.guard}` : ''}</Text>
                                    </View>
                                    <Text style={[styles.pilgrimConviction, { color: AXM.sulfur }]}>◆ {vm.conviction}</Text>
                                </View>
                                <View style={styles.pilgrimStatRow}>
                                    {([['HEART', stats.heart, STANCE_COLORS.heart], ['BODY', stats.body, STANCE_COLORS.body], ['MIND', stats.mind, STANCE_COLORS.mind]] as const).map(([label, val, color]) => (
                                        <View key={label} style={[styles.pilgrimStat, { borderColor: `${color}88` }]}>
                                            <Text style={[styles.pilgrimStatVal, { color }]}>{val}</Text>
                                            <Text style={styles.pilgrimStatLabel}>{label}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.pilgrimMetaRow}>
                                    <Text style={styles.pilgrimMetaChip} allowFontScaling={false}>XP {p.experience ?? 0} / {p.experienceToNextLevel ?? 0}</Text>
                                    {logAvailable ? (
                                        <Pressable
                                            onPress={() => setPilgrimLog(true)}
                                            testID="combat-pilgrim-log"
                                            accessibilityRole="button"
                                            accessibilityLabel={COMBAT_LOG_TOGGLE_A11Y}
                                            hitSlop={8}
                                            style={[styles.logButton, styles.logButtonEnd]}
                                        >
                                            <Text style={styles.logButtonText}>{COMBAT_LOG_TOGGLE_TEXT}</Text>
                                        </Pressable>
                                    ) : null}
                                </View>

                                <Text style={styles.pilgrimSection}>STATUS EFFECTS</Text>
                                {vm.player.effects.length === 0 && <Text style={styles.pilgrimEmpty}>clear — nothing afflicts or blesses you</Text>}
                                {vm.player.effects.map((e) => (
                                    <View key={e.effectId} style={styles.pilgrimRow}>
                                        <Text style={[styles.pilgrimRowIcon, { color: e.glyph.color }]}>{e.glyph.glyph}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.pilgrimRowName, { color: e.glyph.color }]}>{e.glyph.label}  ·  ×{e.intensity} · {e.duration} turns</Text>
                                            {e.gloss ? <Text style={styles.pilgrimRowDef}>{e.gloss}</Text> : null}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                            )}
                        </View>
                        <Pressable
                            onPress={closePilgrim}
                            testID="combat-pilgrim-close"
                            accessibilityRole="button"
                            accessibilityLabel="Close pilgrim details"
                            hitSlop={10}
                            style={[styles.detailClose, { borderColor: AXM.sulfur }]}
                        >
                            <Text style={[styles.detailCloseText, { color: AXM.sulfur }]}>✕</Text>
                        </Pressable>
                    </Pressable>
                );
            })()}

            {/* deckbuilder reward — claimed before the summary on a win */}
            {live.finalOutcome === 'victory' && !rewardsClaimed && rewardOffers.length > 0 && (
                <CombatRewardsOverlay
                    offers={rewardCardVMs(rewardOffers, live.player.baseStats)}
                    onPick={onRewardPick}
                    upgradeRows={rewardUpgradeRows}
                    onUpgrade={onRewardUpgrade}
                />
            )}

            {summary && (rewardsClaimed || live.finalOutcome !== 'victory') && (
                <CombatSummaryModal summary={summary} onClose={handleExit} />
            )}

            {/* drag ghost — persistently mounted after the first drag; dragShown
                gates visibility so a finished drag leaves it hidden, not unmounted */}
            {ghostPayload && (
                // The ghost is a purely-visual clone that follows the finger.
                // It carries its OWN testID and is hidden from accessibility,
                // so it never surfaces as a duplicate die (a second
                // `combat-die-*` node) or a phantom entry to screen readers.
                <Animated.View
                    pointerEvents="none"
                    testID="combat-drag-ghost"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.ghost, ghostPayload.type === 'card' ? cardGhostStyle : dieGhostStyle]}
                >
                    {ghostPayload.type === 'card' ? (
                        // The dragged card keeps its real face.
                        <CombatCardFace card={ghostPayload.card} width={HAND_CARD_W} height={HAND_CARD_H} />
                    ) : (
                        <>
                            <CombatDie die={ghostPayload.die} size={DIE_GHOST_SIZE} testID="combat-drag-ghost-die" />
                            {/* ✕ ineligible cue — lights while hovering an illegal target */}
                            <Animated.View style={[styles.ghostXBadge, dieGhostXStyle]} testID="combat-drag-ghost-x">
                                <Text style={styles.ghostXGlyph} allowFontScaling={false}>✕</Text>
                            </Animated.View>
                        </>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: { flex: 1, width: '100%', height: '100%' },
    // The combat log's two buttons (LOG in the pilgrim modal's XP row, BACK
    // in its log view) and the log view itself.
    logButton: {
        borderWidth: 1.5, borderColor: AXM.sulfur, backgroundColor: 'rgba(10,8,6,0.82)',
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, alignSelf: 'flex-start',
    },
    logButtonEnd: { marginLeft: 'auto' },
    logButtonText: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.6, color: AXM.sulfur },
    pilgrimLogView: { padding: 16, gap: 10, height: 520, maxHeight: '100%' },
    logScroll: { flex: 1, borderWidth: 1, borderColor: AXM.ash, backgroundColor: AXM.panelBg },
    logScrollContent: { padding: 12, gap: 4 },
    logLine: { fontFamily: FONTS.serif, fontSize: 12, lineHeight: 17 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,3,6,0.93)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
    modal: { width: '100%', maxWidth: 380, borderWidth: 2, backgroundColor: AXM.panelBg, padding: 18, alignItems: 'center' },
    modalTitle: { fontFamily: FONTS.gothic, fontSize: 18, color: AXM.parchment, textAlign: 'center' },
    modalSub: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.bone, textAlign: 'center', marginTop: 4, marginBottom: 14 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 6 },
    modalBtn: { borderWidth: 2, paddingHorizontal: 22, paddingVertical: 9 },
    modalBtnText: { fontFamily: FONTS.gothic, fontSize: 16, letterSpacing: 1 },
    detailMeta: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bone, letterSpacing: 0.6, marginTop: 4, marginBottom: 10 },
    // Relative wrapper so the close ✕ can pin OUTSIDE the ScrollView.
    detailModalWrap: { width: '100%', maxWidth: 380, maxHeight: '92%' },
    detailScroll: { width: '100%' },
    // Sanguine-Step inspect stack (keyword defs → large card → fork) — UN-BOXED:
    // panels/card/pills float directly on the dimmed backdrop.
    detailStack: { width: '100%', maxWidth: 380, padding: 8, paddingBottom: 64, alignItems: 'center' },
    detailCardWrap: { marginTop: 2, marginBottom: 6, alignItems: 'center', justifyContent: 'center', shadowColor: HUE.black, shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    detailHalo: { position: 'absolute' },
    detailBold: { fontFamily: FONTS.gothic, color: AXM.parchment },
    detailKeywordHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, gap: 8 },
    detailKeywordTag: { fontFamily: FONTS.sans, fontSize: 8.5, letterSpacing: 1.2, flexShrink: 0 },
    // Close ✕ — bottom-right of the BACKDROP (never overlaps the keyword tags,
    // never falls below the fold).
    detailClose: { position: 'absolute', bottom: 26, right: 18, zIndex: 10, width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: AXM.panelBg },
    detailCloseText: { fontFamily: FONTS.sans, fontSize: 20, lineHeight: 22 },
    detailSubtitle: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 13, color: AXM.parchment, textAlign: 'center', marginTop: 3 },
    detailOutcomeBox: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 3, padding: 10, marginBottom: 8 },
    detailOutcomeHead: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1.5, color: AXM.bone, opacity: 0.7, marginBottom: 5 },
    detailStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 7 },
    detailStat: { fontFamily: FONTS.mono, fontSize: 12 },
    detailStatLabel: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 0.8, color: AXM.bone },
    detailStatValue: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.parchment },
    detailStacks: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 11, color: AXM.bone, marginTop: 6 },
    // Everything the bare face does not print reads here.
    detailMetaStrip: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1.6, color: AXM.bone, opacity: 0.7, marginBottom: 8 },
    // The rarity pip row sits on the meta strip's own line, so the band
    // costs no extra row in a panel that must fit one 360pt screen.
    detailMetaRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    detailRarityPips: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
    detailRarityPip: { width: 5, height: 5, borderRadius: 2.5 },
    detailPlays: { alignSelf: 'stretch', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.65)', overflow: 'hidden' },
    detailPlayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 10, paddingVertical: 7 },
    detailPlayRowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
    detailPlayTag: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1, color: AXM.bone, width: 58, flexShrink: 0 },
    detailPlayBody: { flex: 1 },
    detailPlayText: { fontFamily: FONTS.serif, fontSize: 12.5, color: AXM.parchment, lineHeight: 17, flex: 1 },
    detailPlayBold: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
    detailFreeBox: { alignSelf: 'stretch', marginBottom: 8 },
    detailFreeLine: { fontFamily: FONTS.serif, fontSize: 12.5, color: AXM.bone, lineHeight: 17, marginBottom: 5 },
    detailPowerLine: { fontFamily: FONTS.serif, fontSize: 12.5, lineHeight: 17, marginBottom: 5 },
    // Systems glossary (Conviction/Resonance/Reserve+Pips/Floating/WILD-X).
    systemsGlossary: { alignSelf: 'stretch', marginTop: 6, marginBottom: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    systemsGlossaryLine: { fontFamily: FONTS.sans, fontSize: 9.5, color: AXM.bone, opacity: 0.65, lineHeight: 15, marginBottom: 3 },
    systemsGlossaryTerm: { fontFamily: FONTS.sans, fontSize: 9.5, letterSpacing: 1, color: AXM.ash, opacity: 1 },
    detailReadNote: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 11, color: AXM.bone, lineHeight: 15 },
    detailLine: { fontFamily: FONTS.serif, fontSize: 13, color: AXM.parchment, lineHeight: 18 },
    // ONE compact ledger, not a box per keyword.
    detailKeywords: { alignSelf: 'stretch', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.65)', overflow: 'hidden' },
    detailKeywordsHead: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 1.5, color: AXM.bone, opacity: 0.7, marginBottom: 7 },
    detailKeywordRow: { alignSelf: 'stretch', paddingHorizontal: 10, paddingVertical: 6 },
    detailKeywordRowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
    detailKeywordName: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 1.2, color: AXM.sulfur, flexShrink: 1 },
    detailKeywordDef: { fontFamily: FONTS.serif, fontSize: 11.5, color: AXM.parchment, lineHeight: 16 },
    detailMath: { alignSelf: 'stretch', fontFamily: FONTS.mono, fontSize: 10.5, color: AXM.bone, opacity: 0.85, lineHeight: 15, marginBottom: 8 },
    detailTipGloss: { fontFamily: FONTS.serif, fontSize: 12, color: AXM.parchment, textAlign: 'center', marginTop: 6, lineHeight: 16 },
    detailHint: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 11, color: AXM.bone, marginTop: 4, textAlign: 'center' },

    // ── status tooltip plaque (reference status-detail shape) ──
    tipPlaque: {
        width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 8, backgroundColor: AXM.panelBg,
        paddingTop: 18, paddingBottom: 30, paddingHorizontal: 22, alignItems: 'center',
    },
    tipCorner: { position: 'absolute', width: 18, height: 18 },
    tipCornerTl: { top: -1, left: -1, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 8 },
    tipCornerTr: { top: -1, right: -1, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 8 },
    tipCornerBl: { bottom: -1, left: -1, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 8 },
    tipCornerBr: { bottom: -1, right: -1, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 8 },
    burstWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
    burstGlyphBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    burstGlyph: { fontSize: 42, lineHeight: 50, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
    tipName: {
        fontFamily: FONTS.sans, fontSize: 26, letterSpacing: 3, marginTop: 6,
        textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 },
    },
    tipGloss: { fontFamily: FONTS.serif, fontSize: 14, lineHeight: 20, color: AXM.parchmentDim, textAlign: 'center', marginTop: 8 },
    tipMeta: { fontFamily: FONTS.sans, fontSize: 11, color: AXM.bone, letterSpacing: 0.6, marginTop: 10 },
    tipReason: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0.4, textAlign: 'center', marginTop: 8 },
    tipBadgeWrap: { position: 'absolute', bottom: -15, alignSelf: 'center', width: 128, height: 30 },
    tipBadgeInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tipBadgeText: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2 },

    // ── pilgrim modal (tap the player medallion) ──
    pilgrimWrap: { width: '100%', maxWidth: 380, maxHeight: '88%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 8, backgroundColor: AXM.panelBg },
    pilgrimStack: { padding: 16, paddingBottom: 24 },
    pilgrimHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    pilgrimPortrait: { width: 60, height: 72, borderRadius: 6, borderWidth: 1.5, borderColor: AXM.sulfur, backgroundColor: AXM.deepBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    pilgrimName: { fontFamily: FONTS.gothic, fontSize: 20, color: AXM.parchment },
    pilgrimVitae: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.bone, marginTop: 3, letterSpacing: 0.4 },
    pilgrimConviction: { fontFamily: FONTS.sans, fontSize: 18 },
    pilgrimStatRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    pilgrimStat: { flex: 1, borderWidth: 1, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', paddingVertical: 7 },
    pilgrimStatVal: { fontFamily: FONTS.sans, fontSize: 20, lineHeight: 23 },
    pilgrimStatLabel: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1.6, color: AXM.bone, marginTop: 1 },
    // full stat table
    pilgrimMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    pilgrimMetaChip: { fontFamily: FONTS.sans, fontSize: 11, color: AXM.bone, letterSpacing: 0.4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
    pilgrimSection: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 2, color: AXM.sulfur, marginTop: 14, marginBottom: 6 },
    pilgrimEmpty: { fontFamily: FONTS.serifItalic, fontStyle: 'italic', fontSize: 12, color: AXM.ash },
    pilgrimRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.4)', padding: 9, marginBottom: 6 },
    pilgrimRowIcon: { fontSize: 17, lineHeight: 20 },
    pilgrimRowSlot: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1.2, color: AXM.bone, marginTop: 2, minWidth: 52 },
    pilgrimRowName: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 0.8, color: AXM.parchment },
    pilgrimRowDef: { fontFamily: FONTS.serif, fontSize: 12, lineHeight: 16, color: AXM.bone, marginTop: 2 },

    reveal: { flex: 1, backgroundColor: HUE.inkBg },
    // A phone fills the column edge to edge; a wide window keeps the
    // threat rows under the foe at a reading width instead of running each
    // row (label at one edge, chevron at the other) across the screen.
    revealScroll: { alignItems: 'center', padding: 22, paddingBottom: 40, width: '100%', maxWidth: REVEAL_COLUMN_MAX_WIDTH, alignSelf: 'center' },
    revealEyebrow: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2, color: AXM.blood, marginBottom: 14, marginTop: 8 },
    revealPortrait: { borderWidth: 2, borderRadius: 6, padding: 6, backgroundColor: AXM.deepBg },
    revealName: { fontFamily: FONTS.gothic, fontSize: 24, color: AXM.parchment, marginTop: 12, textAlign: 'center' },
    revealHp: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.blood, marginTop: 2 },
    // The player's side of the same trade, quieter than the foe's.
    revealYours: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.bone, letterSpacing: 1, marginTop: 2 },
    revealSection: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 1.2, color: AXM.sulfur, marginTop: 20, marginBottom: 8, alignSelf: 'stretch' },
    revealPhase: { alignSelf: 'stretch', borderWidth: 1, borderColor: AXM.ash, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 9, paddingVertical: 4, marginBottom: 7 },
    // Accordion header: the whole strip is the toggle, sized to a thumb.
    revealPhaseHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    revealPhaseHeadLabel: { flex: 1 },
    revealPhaseChevron: { fontFamily: FONTS.sans, fontSize: 12, color: AXM.bone },
    // Body sits under the header, indented to clear the intent glyph.
    revealPhaseBody: { paddingLeft: 30, paddingBottom: 7 },
    revealPhaseBodyHidden: { paddingBottom: 0 },
    revealPhaseIcon: { fontSize: 20, lineHeight: 22 },
    revealPhaseLabel: { fontFamily: FONTS.sans, fontSize: 11, letterSpacing: 0.6, color: AXM.parchment },
    revealPhaseText: { fontFamily: FONTS.serif, fontSize: 12, color: AXM.bone, marginTop: 2, lineHeight: 15 },
    // Branch fork rows in the threat sequence
    revealBranchCond: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 0.6, color: AXM.sulfur, marginTop: 2 },
    revealBranchTaken: { color: AXM.parchment },
    revealBtn: { borderWidth: 2, paddingHorizontal: 30, paddingVertical: 12, marginTop: 22, backgroundColor: 'rgba(212,192,38,0.12)' },
    revealBtnText: { fontFamily: FONTS.gothic, fontSize: 18, letterSpacing: 1 },
    // Retreat reads QUIETER than the commit — it is the lesser road, not the
    // symmetric other half of a fight-or-flight binary.
    withdrawBtn: { borderWidth: 1, borderColor: AXM.ash, paddingHorizontal: 20, paddingVertical: 8, marginTop: 12, alignItems: 'center' },
    withdrawBtnText: { fontFamily: FONTS.sans, fontSize: 12, letterSpacing: 2 },
    // The only line that says what withdrawing costs: readable bone (AA on
    // every theme's bg), kept under WITHDRAW by size alone. Never `ash`.
    withdrawSub: { fontFamily: FONTS.sans, fontSize: 10, letterSpacing: 0.8, color: AXM.bone, marginTop: 3 },

    ghost: { position: 'absolute', top: 0, left: 0, zIndex: 999 },
    // ✕ badge riding the die ghost while it hovers an illegal target.
    ghostXBadge: {
        position: 'absolute', top: -10, right: -10, width: 24, height: 24, borderRadius: 12,
        borderWidth: 1.5, borderColor: AXM.blood, backgroundColor: 'rgba(10,4,4,0.92)',
        alignItems: 'center', justifyContent: 'center',
    },
    ghostXGlyph: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 15, color: AXM.blood },
}));
