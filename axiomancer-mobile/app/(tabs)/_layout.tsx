import { Tabs } from '@/lib/platform/router';
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { AxmIcon, type AxmIconName } from '@/components/icons';
import { TAB_ICON_SIZE, TAB_TITLES } from '@/state/presenters/tabs.engine';
import { useGameState } from '@/state/GameStoreProvider';
import { selectTabBadges } from '@/state/presenters/navigation.engine';
import { KitBackdrop, kitScale } from '@/components/experience/KitBackdrop';
import { lookOf } from '@/components/experience/looks';
import { INK_SOFT, VELLUM_OXBLOOD } from '@/components/exploration/wildsInk';
import ExplorationScreen from './exploration/index';
import CharacterScreen from './character/index';
import MemoirScreen from './memoir/index';
import InventoryScreen from './inventory/index';
import DeckScreen from './deck/index';
import SettingsTabScreen from './settings/index';

function TabBadge({ text, kind }: { text: string; kind: 'event' | 'levelup' }) {
  const AXM = usePalette();
  const styles = useStyles();
  const badgeColor = kind === 'levelup' ? AXM.sulfur : AXM.blood;

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

// Tab icons come from the icon canon — the same registry
// marks the exploration drawer and combat surfaces draw, so the art
// upgrades in one place. Per-tab a11y labels override the registry's
// generic ones. The active tab wears the handoff active-tick: a short
// sulfur bar above the icon (the handoff tab contract).
// W-06: the tab bar is on the vellum dock when T's pick says so.
const VELLUM_DOCK = lookOf('W-06') === 'vellum';

/** The tab bar shows icons alone, so each one is drawn large (30pt). */
export { TAB_ICON_SIZE };

/**
 * How far the vellum dock's end flourishes reach in from each edge, in the
 * art's own pixels (profiled off the 800x74 webp). The bar pads its tabs past
 * the flourish so the first and last icons never sit on the ink.
 */
export const DOCK_FLOURISH_PX = 66;
export const DOCK_END_PADDING = Math.ceil(DOCK_FLOURISH_PX * kitScale('nav-dock-vellum')) + 1;

const TAB_ICONS: Record<string, { name: AxmIconName; label: string }> = {
  eye: { name: 'action-eye', label: 'Exploration tab' },
  sword: { name: 'action-sword', label: 'Combat tab' },
  crown: { name: 'action-crown', label: 'Character tab' },
  bag: { name: 'action-bag', label: 'Inventory tab' },
  scroll: { name: 'action-scroll', label: 'Event tab' },
  quill: { name: 'action-quill', label: 'Memoir tab' },
  // DECK. The icon canon has no stacked-cards
  // glyph and minting one would mean editing the shared registry from a tab
  // change, so DECK borrows `action-arcane` — the canon's spell mark, which
  // is literally what the combat deck is a stack of. Its a11y label is
  // overridden here, as every tab's is.
  cards: { name: 'action-arcane', label: 'Deck tab' },
  gear: { name: 'action-settings', label: 'Settings tab' },
};

function TabIconWithBadge({
  kind,
  color,
  size,
  focused,
  badge,
}: {
  kind: string;
  color: string;
  size: number;
  focused: boolean;
  badge: { text: string; kind: 'event' | 'levelup' } | null;
}) {
  const styles = useStyles();
  const AXM = usePalette();
  const icon = TAB_ICONS[kind];
  if (!icon) return null;
  return (
    <View style={styles.iconContainer}>
      {/* W-06: on the vellum dock the selected tab is marked by its oxblood ink
          alone (T, 2026-11-06), so the tick above the icon is not drawn. */}
      <View style={[styles.activeTick, focused && !VELLUM_DOCK && { backgroundColor: AXM.sulfur }]} />
      <AxmIcon name={icon.name} size={size} color={color} label={icon.label} />
      {badge && <TabBadge text={badge.text} kind={badge.kind} />}
    </View>
  );
}

export default function TabLayout() {
  const AXM = usePalette();
  const styles = useStyles();
  // Tab configuration: a fight runs on its own full-screen route
  // (/combat-encounter) that covers this bar, so there is no combat tab and
  // no tab lock; the six tabs are registered below.
  // Subscribe to the slim slices `selectTabBadges` reads, then memo
  // the badges object. The presenter returns a stable `EMPTY_BADGES`
  // reference in the no-event / no-levelup steady state but a fresh
  // object whenever a badge is active — passed directly to
  // `useGameState`, the active-badge path would over-render this
  // layout on every unrelated store change (engine events fire on
  // most actions). Slim-slice + memo mirrors the character / event
  // screen pattern.
  const player = useGameState((s) => s.player);
  const eventSlice = useGameState((s) => s.event);
  const notifications = useGameState((s) => s.notifications);
  const badges = useMemo(
    () =>
      selectTabBadges({
        player,
        event: eventSlice,
        notifications,
      } as never),
    [player, eventSlice, notifications],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: VELLUM_DOCK ? [styles.tabBar, styles.tabBarVellum] : styles.tabBar,
        // The vellum dock inks the tabs: oxblood for the selected one, iron-gall
        // brown for the rest. Nothing is drawn behind the selection.
        tabBarActiveTintColor: VELLUM_DOCK ? VELLUM_OXBLOOD : AXM.sulfur,
        tabBarInactiveTintColor: VELLUM_DOCK ? INK_SOFT : AXM.bone,
        // T (W-06): icons only. Each screen sets tabBarAccessibilityLabel to its name.
        tabBarShowLabel: false,
        ...(VELLUM_DOCK ? { tabBarBackground: () => <KitBackdrop piece="nav-dock-vellum" /> } : {}),
      }}
    >
      <Tabs.Screen
        name="exploration/index"
        component={ExplorationScreen}
        options={{
          title: TAB_TITLES.exploration,
          tabBarAccessibilityLabel: TAB_TITLES.exploration,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              kind="eye"
              color={color}
              size={TAB_ICON_SIZE}
              focused={focused}
              badge={badges.exploration}
            />
          ),
          // Exploration is the unconditional leftmost tab.
        }}
      />
      <Tabs.Screen
        name="character/index"
        component={CharacterScreen}
        options={{
          title: TAB_TITLES.character,
          tabBarAccessibilityLabel: TAB_TITLES.character,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              kind="crown"
              color={color}
              size={TAB_ICON_SIZE}
              focused={focused}
              badge={badges.character}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memoir/index"
        component={MemoirScreen}
        options={{
          title: TAB_TITLES.memoir,
          tabBarAccessibilityLabel: TAB_TITLES.memoir,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              kind="quill"
              color={color}
              size={TAB_ICON_SIZE}
              focused={focused}
              badge={badges.memoir}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory/index"
        component={InventoryScreen}
        options={{
          title: TAB_TITLES.inventory,
          tabBarAccessibilityLabel: TAB_TITLES.inventory,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              kind="bag"
              color={color}
              size={TAB_ICON_SIZE}
              focused={focused}
              badge={badges.inventory}
            />
          ),
        }}
      />
      {/* DECK is registered LAST so no existing tab changes position — the
          four tabs players already have muscle memory for keep their slots,
          and DECK lands beside SATCHEL, the other "what you carry" surface. */}
      <Tabs.Screen
        name="deck/index"
        component={DeckScreen}
        options={{
          title: TAB_TITLES.deck,
          tabBarAccessibilityLabel: TAB_TITLES.deck,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              kind="cards"
              color={color}
              size={TAB_ICON_SIZE}
              focused={focused}
              badge={badges.deck}
            />
          ),
        }}
      />
      {/* SETTINGS is the sixth tab, rightmost; /settings stays the main menu's route. */}
      <Tabs.Screen
        name="settings/index"
        component={SettingsTabScreen}
        options={{
          title: TAB_TITLES.settings,
          tabBarAccessibilityLabel: TAB_TITLES.settings,
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge kind="gear" color={color} size={TAB_ICON_SIZE} focused={focused} badge={null} />
          ),
        }}
      />
    </Tabs>
  );
}

const useStyles = makeStyles((AXM) => ({
  tabBar: {
    backgroundColor: AXM.panelBg,
    borderTopColor: AXM.ash,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  // The dock art replaces the bar's flat panel and its top rule.
  tabBarVellum: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingHorizontal: DOCK_END_PADDING,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  // The handoff tab contract's active tick — a short bar above the
  // icon; transparent when the tab is at rest so layout never shifts.
  activeTick: {
    width: 14,
    height: 2,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: AXM.parchment,
    fontFamily: FONTS.sans,
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 16,
  },
}));
