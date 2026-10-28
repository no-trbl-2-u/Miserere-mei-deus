import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from '@/lib/platform/router';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { AscendStrip } from '@/components/levelup/AscendStrip';
import { LevelReadyStrip } from '@/components/levelup/LevelReadyStrip';
import { LevelUpModal } from '@/components/levelup/LevelUpModal';
import { DevToolsLink } from '@/components/dev/DevToolsLink';
import { SettingsLink } from '@/components/menu/SettingsLink';
import { ScreenBg } from '@/components/ScreenBg';
import { SectionLabel } from '@/components/SectionLabel';
import { StanceGlyph } from '@/components/StanceGlyph';
import { EffectGlyph } from '@/components/EffectGlyph';
import { XpChain } from '@/components/XpChain';
import { PlayerPortraitImage } from '@/components/art/PlayerPortraitImage';
import { nextPlayerPortrait, portraitIdFromFlags, PORTRAIT_FLAG_PREFIX } from '@/assets/images/portraits';
import { useGameActions, useGameState, useGameStore } from '@/state/GameStoreProvider';
import { selectCharacterViewModel } from '@/state/presenters/character.engine';

/**
 * The SELF sheet (`/character`).
 *
 * Purpose: render the character view model — identity, POOLS, DERIVED, SAVES &
 * TESTS and effects — as the tab's scrolling sheet.
 * Inputs: none by argument; reads the `player` store slice and turns it into
 * a view model via `selectCharacterViewModel`.
 * Output: the sheet element tree.
 */
export default function CharacterScreen() {
  const AXM = usePalette();
  const styles = useStyles();
  // Subscribe to stable slices to avoid getSnapshot identity churn:
  // `selectCharacterViewModel` returns a frozen new object every call,
  // which would loop `useSyncExternalStore` if used directly as a
  // selector. Pull the underlying slice and memoize the VM downstream
  // (the same pattern as the event screen).
  const player = useGameState((s) => s.player);
  const vm = useMemo(() => selectCharacterViewModel({ player } as never), [player]);
  const store = useGameStore();
  const actions = useGameActions();
  const router = useRouter();

  // Acknowledge any pending level-up the moment the
  // character screen renders. The tab badge clears via
  // `selectTabBadges` (which gates on `levelUpAcknowledged`). Preserve
  // any other notification fields (toast, etc.) on the slice.
  useEffect(() => {
    const prev = store.getState().notifications;
    store.setState({
      notifications: { ...prev, levelUpAcknowledged: true },
    });
  }, [store]);

  // LevelUpModal mount toggle. Strip tap opens, modal
  // commit / keep-deliberating dismisses. Snapshot the level + base
  // stat values at the moment the modal opens so it has the "before"
  // figures even if the engine mutates underneath us mid-allocation.
  const [levelUpOpen, setLevelUpOpen] = useState<boolean>(false);
  const onOpenLevelUp = useCallback(() => setLevelUpOpen(true), []);
  const onCloseLevelUp = useCallback(() => setLevelUpOpen(false), []);

  // Tap the bust to cycle the portrait gallery. Stored as a `portrait:<id>`
  // flag (generic string flags ride the normal save).
  const onCyclePortrait = useCallback(() => {
    store.setState((s) => {
      const flags = s.flags ?? [];
      const next = nextPlayerPortrait(portraitIdFromFlags(flags));
      return { flags: [...flags.filter((f) => !f.startsWith(PORTRAIT_FLAG_PREFIX)), `${PORTRAIT_FLAG_PREFIX}${next.id}`] };
    });
  }, [store]);

  const onLevelUp = useCallback(() => {
    actions.levelUp();
    setLevelUpOpen(true);
  }, [actions]);
  const onCommitAllocation = useCallback(
    (spent: { heart: number; body: number; mind: number }) => {
      // Dispatch the engine action N times — once per allocated
      // point. The engine clamps internally; we trust the modal's
      // local state to be valid (sum === totalPoints).
      for (let i = 0; i < spent.heart; i += 1) actions.allocateStatPoint('heart');
      for (let i = 0; i < spent.body; i += 1) actions.allocateStatPoint('body');
      for (let i = 0; i < spent.mind; i += 1) actions.allocateStatPoint('mind');
      setLevelUpOpen(false);
    },
    [actions],
  );

  return (
    <ScreenBg>
      {/* Sheet header — portrait + identity, in the D&D character-sheet
          idiom: bust top-left, name + XP centre, level box
          top-right. */}
      <View
        style={styles.sheetHeader}
        accessible
        accessibilityLabel={`${vm.a11y.characterName}. ${vm.a11y.level}. ${vm.a11y.experience}.`}
      >
        <View style={styles.sheetHeaderTopRow}>
          <Pressable
            style={styles.portraitFrame}
            onPress={onCyclePortrait}
            accessibilityRole="button"
            accessibilityLabel="Change portrait"
            accessibilityHint="cycles through the portrait gallery"
            testID="self-portrait-cycle"
          >
            <PlayerPortraitImage width={176} height={212} />
          </Pressable>
          <View style={styles.identityCol}>
            <SectionLabel size={9} color={AXM.bone}>{vm.subtitle}</SectionLabel>
            <Text style={styles.characterName} numberOfLines={1}>{vm.displayName}</Text>
            <View style={styles.xpRow}>
              {/* Value first, then the caption naming what it counts TOWARD.
                * Stacked, each fits one line of this ~130px column (side by
                * side they wrap and interleave), and the caption cannot be
                * read as the current level (which the medallion to the right
                * already shows). */}
              <Text style={styles.xpValue} numberOfLines={1}>{vm.xp} / {vm.xpMax}</Text>
              <Text style={styles.xpLabel} numberOfLines={1}>{vm.xpLabel}</Text>
            </View>
            <XpChain value={vm.xp} max={vm.xpMax} />
          </View>
          <View style={styles.levelBox}>
            <Text style={styles.levelText}>{vm.level}</Text>
            <Text style={styles.levelCaption}>LVL</Text>
          </View>
        </View>
        <View style={styles.baseRow} accessible accessibilityLabel={vm.a11y.baseStats}>
          {vm.base.map((r) => (
            <TooltipTarget
              key={r.stanceKey}
              kind="stat"
              id={r.stanceKey.toUpperCase()}
              accessibilityLabel={`Explain ${r.label} stat`}
              accessibilityHint="tap to read description"
              testID={`self-base-${r.stanceKey}`}
            >
              <View style={styles.baseCard}>
                <StanceGlyph kind={r.stanceKey} size={28} color={AXM.parchment} />
                <Text style={styles.baseStatLabel}>{r.label}</Text>
                <Text style={styles.baseStatValue}>{r.value}</Text>
              </View>
            </TooltipTarget>
          ))}
        </View>
      </View>

      {/* Level-up strips sit full-width beneath the header. */}
      {vm.pendingPoints > 0 && (
        <AscendStrip
          pendingPoints={vm.pendingPoints}
          level={vm.level}
          onOpen={onOpenLevelUp}
        />
      )}
      {vm.pendingPoints === 0 && vm.levelUpReady && (
        <LevelReadyStrip
          level={vm.level}
          toLevel={vm.readyLevel}
          onLevelUp={onLevelUp}
        />
      )}

      {/* LevelUpModal overlays the SELF tab when the
          ASCEND strip is tapped. Non-tap-out-dismissible by
          design. Closes via COMMIT (allocates + closes)
          or "keep deliberating" / discard-confirm step. */}
      {levelUpOpen && (
        <LevelUpModal
          characterName={vm.displayName}
          fromLevel={vm.levelUpFrom}
          toLevel={vm.level}
          totalPoints={vm.pendingPoints}
          summary={vm.levelUpSummary}
          current={(() => {
            const heart = vm.base.find((r) => r.stanceKey === 'heart')?.value ?? 0;
            const body = vm.base.find((r) => r.stanceKey === 'body')?.value ?? 0;
            const mind = vm.base.find((r) => r.stanceKey === 'mind')?.value ?? 0;
            return { heart, body, mind };
          })()}
          onCommit={onCommitAllocation}
          onCancel={onCloseLevelUp}
        />
      )}

      {/* Hazard deck — persistent library / remove-card surface.
          Always available outside an encounter. */}
      <Pressable
        style={styles.deckLink}
        onPress={() => router.push('/hazard-deck')}
        accessibilityRole="button"
        accessibilityLabel="Open your Hazard deck"
        accessibilityHint="study the cards you carry and thin the deck"
        testID="self-hazard-deck-link"
      >
        <View style={styles.deckLinkText}>
          <Text style={styles.deckLinkLabel}>✠ HAZARD DECK</Text>
          <Text style={styles.deckLinkSub}>study the cards you carry</Text>
        </View>
        <Text style={styles.deckLinkChevron}>›</Text>
      </Pressable>

      {/* Pools — VITAE (Problem 6 design) */}
      <View style={styles.section}>
        <SectionLabel size={13}>✠ POOLS</SectionLabel>
        <View style={styles.poolsCard}>
          {[
            { label: 'VITAE', value: player?.health ?? 0, max: player?.maxHealth ?? 1, color: AXM.blood, gloss: 'flesh holds' },
          ].map((pool) => (
            <View key={pool.label} style={styles.poolRow}>
              <View style={styles.poolHeader} testID={`self-pool-header-${pool.label.toLowerCase()}`}>
                <View style={styles.poolLabelRow}>
                  <Text style={[styles.poolLabel, { color: pool.color }]}>{pool.label}</Text>
                  <Text style={styles.poolGloss}>· {pool.gloss}</Text>
                </View>
                <Text style={styles.poolValue}>{pool.value}<Text style={styles.boneText}> / {pool.max}</Text></Text>
              </View>
              <View style={styles.poolTrack}>
                <View style={[styles.poolFill, { width: `${(pool.value / pool.max) * 100}%`, backgroundColor: pool.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Afflictions & Blessings */}
      <View style={styles.section} accessible accessibilityLabel={vm.a11y.effects}>
        <SectionLabel size={13}>✠ AFFLICTIONS &amp; BLESSINGS</SectionLabel>
        <View style={styles.effectsList}>
          {vm.effects.length === 0 ? (
            <Text style={styles.emptyLabel}>{vm.emptyEffectsMessage}</Text>
          ) : (
            vm.effects.map((e) => (
              // Wrap the affliction/blessing row in a TooltipTarget so a
              // tap fires the kind:'effect' content (reads engine
              // `Effect.payload` for the stat-effect line + accent). id is the engine
              // effectId threaded through CharacterEffectRow.
              <TooltipTarget
                key={e.name}
                kind="effect"
                id={e.effectId}
                accessibilityLabel={`Effect ${e.name}`}
                accessibilityHint="tap to read description"
                testID={`self-effect-${e.effectId || e.name}`}
              >
                <View
                  style={[
                    styles.effectRow,
                    {
                      backgroundColor: e.tint === 'buff' ? AXM.buff : AXM.debuff,
                      borderColor: e.tint === 'buff' ? AXM.sulfur : AXM.blood,
                    },
                  ]}
                >
                  <EffectGlyph kind={e.kind} size={20} color={e.tint === 'buff' ? AXM.sulfur : AXM.blood} />
                  <View style={styles.flexOne}>
                    <View style={styles.effectTopRow}>
                      <Text style={styles.effectName}>{e.name}</Text>
                      <Text style={styles.effectMeta}>
                        {e.duration === null ? '∞' : `${e.duration}r`} · ×{e.intensity}
                      </Text>
                    </View>
                    <Text style={styles.effectDesc}>{e.description}</Text>
                  </View>
                </View>
              </TooltipTarget>
            ))
          )}
        </View>
      </View>

      {/* Equipment lives in the SATCHEL tab; the SELF sheet keeps to
          identity + stats so it fits one screen. */}

      {/* Cards */}
      {vm.cards.length > 0 && (
        <View style={styles.section}>
          <SectionLabel size={13}>✠ FALLACIES &amp; PARADOXES</SectionLabel>
          <View style={styles.cardsGrid}>
            {vm.cards.map((s) => (
              // Wrap each card in a TooltipTarget pointing at the
              // kind:'card' content (engine description + cost/stance
              // footnote). vm.cards is always [] in the presenter, so
              // this section never renders today.
              <TooltipTarget
                key={s.id || s.name}
                kind="card"
                id={s.id}
                accessibilityLabel={`Explain ${s.name} card`}
                accessibilityHint="tap to read description"
                testID={`self-card-${s.id || s.name}`}
              >
                <View
                  style={[
                    styles.cardTile,
                    { borderColor: AXM.parchment, borderStyle: 'dashed' },
                  ]}
                >
                  <StanceGlyph kind={s.stanceKey} size={16} color={AXM.bone} />
                  <View style={styles.flexOne}>
                    <Text style={styles.cardName}>{s.name}</Text>
                  </View>
                </View>
              </TooltipTarget>
            ))}
          </View>
        </View>
      )}
      {/* The COLOUR THEME picker lives in /settings. */}
      <SettingsLink />
      <DevToolsLink />
    </ScreenBg>
  );
}

const useStyles = makeStyles((AXM) => ({
  // Section spacing and hero-element sizes are tight so the whole SELF
  // tab fits a 390×844 screen without scrolling.
  // D&D character-sheet header: portrait bust + identity + level box.
  sheetHeader: { flexDirection: 'column', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 0 },
  sheetHeaderTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  portraitFrame: { width: 180, height: 216, borderWidth: 1, borderColor: AXM.ash, backgroundColor: AXM.deepBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  identityCol: { flex: 1, paddingTop: 2 },
  characterName: { fontFamily: FONTS.gothic, fontSize: 22, lineHeight: 24, color: AXM.parchment, marginTop: 1 },
  levelBox: { width: 60, height: 66, borderWidth: 2, borderColor: AXM.parchment, backgroundColor: AXM.deepBg, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontFamily: FONTS.sans, fontSize: 34, lineHeight: 36, color: AXM.sulfur },
  levelCaption: { fontFamily: FONTS.sans, fontSize: 8, letterSpacing: 2, color: AXM.bone },
  xpRow: { flexDirection: 'column', marginBottom: 2 },
  xpLabel: { fontFamily: FONTS.mono, fontSize: 10, color: AXM.bone, letterSpacing: 1 },
  xpValue: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.sulfur },
  section: { paddingTop: 4, paddingHorizontal: 12, paddingBottom: 0 },
  deckLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12, marginTop: 6, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: AXM.ash, backgroundColor: AXM.panelBg },
  deckLinkText: { flex: 1 },
  deckLinkLabel: { fontFamily: FONTS.gothic, fontSize: 15, letterSpacing: 1, color: AXM.parchment },
  deckLinkSub: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.5, color: AXM.bone, marginTop: 2 },
  deckLinkChevron: { fontFamily: FONTS.gothic, fontSize: 22, color: AXM.bone },
  baseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -52, justifyContent: 'flex-end' },
  baseCard: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, backgroundColor: AXM.panelBg, borderWidth: 1, borderColor: AXM.ash, alignItems: 'center' },
  baseStatLabel: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 2, color: AXM.bone, marginTop: 3 },
  baseStatValue: { fontFamily: FONTS.sans, fontSize: 32, color: AXM.sulfur, lineHeight: 34, marginTop: 2 },
  effectsList: { marginTop: 4, gap: 4 },
  emptyLabel: { fontFamily: FONTS.mono, fontSize: 12, color: AXM.bone, letterSpacing: 1, textTransform: 'uppercase' },
  effectRow: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, padding: 5, paddingHorizontal: 7 },
  effectTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  effectName: { fontFamily: FONTS.gothic, fontSize: 13, color: AXM.parchment, letterSpacing: 1 },
  effectMeta: { fontFamily: FONTS.mono, fontSize: 9, color: AXM.bone },
  effectDesc: { fontFamily: FONTS.serif, fontSize: 10, color: AXM.bone, lineHeight: 13, marginTop: 1 },
  equipRow: { flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' },
  slotsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  slotCell: { width: '48%', borderWidth: 1, borderColor: AXM.ash, paddingVertical: 2, paddingHorizontal: 5, minHeight: 28, backgroundColor: AXM.panelBg },
  slotEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  slotName: { fontFamily: FONTS.sans, fontSize: 8, letterSpacing: 1.5, color: AXM.bone },
  slotItem: { fontFamily: FONTS.serif, fontSize: 11, color: AXM.parchment, lineHeight: 14 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  boneText: { color: AXM.bone },
  flexOne: { flex: 1 },
  marginTop8: { marginTop: 5 },
  cardTile: { width: '48%', borderWidth: 2, padding: 4, paddingHorizontal: 6, backgroundColor: AXM.bg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontFamily: FONTS.gothic, fontSize: 12, color: AXM.parchment, lineHeight: 14 },
  poolsCard: { marginTop: 3, backgroundColor: AXM.panelBg, borderWidth: 1, borderColor: AXM.ash, paddingVertical: 5, paddingHorizontal: 12, gap: 4 },
  poolRow: {},
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  // `flexShrink` so the label row yields to the value instead of overflowing
  // the card.
  poolLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  poolLabel: { fontFamily: FONTS.sans, fontSize: 13, letterSpacing: 1.6 },
  poolNewBadge: { fontFamily: FONTS.mono, fontSize: 8, color: AXM.bg, backgroundColor: AXM.sulfur, paddingHorizontal: 4, paddingVertical: 1, letterSpacing: 1, overflow: 'hidden' },
  poolGloss: { fontFamily: FONTS.serifItalic, fontSize: 12, color: AXM.bone },
  poolValue: { fontFamily: FONTS.mono, fontSize: 13, color: AXM.parchment },
  poolTrack: { position: 'relative' as const, height: 10, backgroundColor: AXM.deepBg, borderWidth: 1, borderColor: AXM.ash },
  poolFill: { position: 'absolute' as const, top: 1, bottom: 1, left: 1 },
}));
