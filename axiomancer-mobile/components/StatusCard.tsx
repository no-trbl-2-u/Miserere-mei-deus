import React from 'react';
import { View, Text } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { StatBar } from './StatBar';
import { SectionLabel } from './SectionLabel';
import { useGameState } from '@/state/GameStoreProvider';

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

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.levelBox}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <SectionLabel size={9} style={styles.levelSubtitle}>
            LVL {level} · PILGRIM
          </SectionLabel>
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
    fontFamily: FONTS.sans,
    fontSize: 22,
    color: AXM.sulfur,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FONTS.gothic,
    fontSize: 15,
    lineHeight: 18,
    color: AXM.parchment,
    letterSpacing: 1,
  },
  barsCol: {
    marginTop: 6,
    gap: 6,
  },
  levelSubtitle: {
    color: AXM.bone,
    marginTop: 2,
  },
}));
