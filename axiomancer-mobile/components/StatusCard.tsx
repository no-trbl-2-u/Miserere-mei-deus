import React from 'react';
import { View, Text } from 'react-native';
import type { DimensionValue } from 'react-native';
import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { StatBar } from './StatBar';
import { useGameState } from '@/state/GameStoreProvider';
import { KitBackdrop } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { VELLUM_INK, VELLUM_OXBLOOD, VITAE_RED } from '@/components/exploration/wildsInk';

interface StatusCardProps {
  /**
   * Optional override props for tests / fixtures. In production
   * the card reads from engine state directly via `useGameState`;
   * the props win only when explicitly passed.
   */
  name?: string;
  level?: number;
  hp?: number;
  hpMax?: number;
  /**
   * The place the pilgrim stands in — the map's name, printed beside the
   * character's and larger than it, since where you are changes and who you
   * are does not (T, 2026-11-02). Omitted off the map.
   */
  mapName?: string;
}

export function StatusCard(props: StatusCardProps = {}) {
  const AXM = usePalette();
  const styles = useStyles();
  // Read from engine `state.player` so the card reflects real
  // game state. Test fixtures may still inject props directly —
  // the prop wins when defined, otherwise we fall through to the
  // store. The status card surfaces only the HP that exists
  // out-of-combat (mana is combat-only).
  const playerName = useGameState((s) => s.player?.name ?? 'WORM-EATEN PILGRIM');
  const playerLevel = useGameState((s) => s.player?.level ?? 1);
  const playerHp = useGameState((s) => s.player?.health ?? 0);
  const playerHpMax = useGameState((s) => s.player?.maxHealth ?? 0);

  const name = props.name ?? playerName;
  const level = props.level ?? playerLevel;
  const hp = props.hp ?? playerHp;
  const hpMax = props.hpMax ?? playerHpMax;

  // W-01: T's pick is vellum and ink. `normal` or `brass` keeps
  // today's card below, byte for byte.
  if (lookOf('W-01') === 'vellum') {
    return <VellumStatusCard name={name} level={level} hp={hp} hpMax={hpMax} mapName={props.mapName} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.levelBox}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {props.mapName !== undefined && props.mapName.length > 0 && (
            <Text
              style={styles.mapName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              testID="status-card-map-name"
            >
              {props.mapName}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.barsCol}>
        {/* A quarter or less of my VITAE turns the readout and the
          * track's edge blood, so a nearly-empty bar reads as danger rather
          * than as a bar that failed to fill. */}
        <StatBar value={hp} max={hpMax} color={AXM.blood} label="VITAE" height={8} alarmAt={0.25} />
      </View>
    </View>
  );
}

/**
 * The status card on a vellum panel, inked (W-01).
 *
 * Everything sits inside the panel's ruled oval (T: "tighten everything up so
 * it all fits inside the oval"): the padding keeps the writing clear of the
 * panel's corner flourishes and its inner rule, at 360 and 390 widths. The
 * level is an oxblood numeral on the small vellum chip; the name and the map
 * are ink; the VITAE bar is drawn here in ink and red rather than through
 * `StatBar`, whose parchment-on-dark text would vanish on paper. The bar keeps
 * `StatBar`'s accessibility contract and its alarm at a quarter or less.
 */
function VellumStatusCard({ name, level, hp, hpMax, mapName }: {
  name: string;
  level: number;
  hp: number;
  hpMax: number;
  mapName?: string;
}) {
  const styles = useVellumStyles();
  const pct = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const alarmed = pct <= 0.25;
  const percentage = Math.round(pct * 100);
  return (
    <View style={styles.card} testID="status-card-vellum">
      <KitBackdrop piece="menu-panel-vellum" />
      <View style={styles.row}>
        <View style={styles.levelBox}>
          <KitBackdrop piece="vellum-chip" />
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {mapName !== undefined && mapName.length > 0 && (
            <Text
              style={styles.mapName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              testID="status-card-map-name"
            >
              {mapName}
            </Text>
          )}
        </View>
      </View>
      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityLabel={`VITAE: ${hp} out of ${hpMax}, ${percentage} percent`}
        accessibilityValue={{ now: hp, min: 0, max: hpMax }}
      >
        <View style={styles.barLabels}>
          <Text style={styles.barLabel} accessibilityRole="text" importantForAccessibility="no">VITAE</Text>
          <Text
            style={[styles.barValue, alarmed && styles.barValueAlarm]}
            accessibilityRole="text"
            importantForAccessibility="no"
            testID={alarmed ? 'statbar-value-alarmed' : 'statbar-value'}
          >
            {hp}/{hpMax}
          </Text>
        </View>
        <View style={[styles.track, alarmed && styles.trackAlarm]} importantForAccessibility="no">
          <View
            style={[styles.fill, { width: `${(pct * 100).toFixed(1)}%` as DimensionValue }]}
            importantForAccessibility="no"
          />
        </View>
      </View>
    </View>
  );
}

const useVellumStyles = makeStyles(() => ({
  // The padding is the "fits inside the oval" budget: the panel's corner
  // flourishes reach about 36pt in and 23pt down at its scale, so the writing
  // starts past them and ends short of the opposite rule.
  card: {
    marginHorizontal: 8,
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 26,
    paddingHorizontal: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBox: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontFamily: TYPE_ROLES.bigNumber.fontFamily,
    fontSize: 20,
    lineHeight: 24,
    color: VELLUM_OXBLOOD,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: TYPE_ROLES.title.fontFamily,
    fontSize: 12,
    lineHeight: 15,
    color: VELLUM_INK,
    letterSpacing: TYPE_ROLES.title.letterSpacing,
  },
  mapName: {
    fontFamily: TYPE_ROLES.mapName.fontFamily,
    fontSize: 22,
    lineHeight: 25,
    color: VELLUM_INK,
  },
  bar: { marginTop: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  barLabel: { fontFamily: TYPE_ROLES.eyebrow.fontFamily, fontSize: 10, letterSpacing: TYPE_ROLES.eyebrow.letterSpacing, color: VELLUM_OXBLOOD },
  barValue: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 10, color: VELLUM_INK },
  barValueAlarm: { color: VELLUM_OXBLOOD, fontWeight: '700' },
  track: {
    width: '100%',
    height: 7,
    borderWidth: 1,
    borderColor: VELLUM_INK,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  trackAlarm: { borderColor: VELLUM_OXBLOOD },
  fill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: VITAE_RED },
}));

const useStyles = makeStyles((AXM) => ({
  card: {
    margin: 8,
    marginBottom: 0,
    padding: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: AXM.panelBg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBox: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: AXM.parchment,
    backgroundColor: AXM.deepBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontFamily: TYPE_ROLES.bigNumber.fontFamily,
    fontSize: 22,
    color: AXM.sulfur,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: TYPE_ROLES.title.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: AXM.parchment,
    letterSpacing: TYPE_ROLES.title.letterSpacing,
  },
  barsCol: {
    marginTop: 6,
    gap: 6,
  },
  mapName: {
    fontFamily: TYPE_ROLES.mapName.fontFamily,
    fontSize: 24,
    lineHeight: 27,
    color: AXM.parchment,
    marginTop: 1,
  },
}));
