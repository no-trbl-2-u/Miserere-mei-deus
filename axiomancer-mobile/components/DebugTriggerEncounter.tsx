/**
 * Dev-only "Trigger encounter" panel.
 *
 * One button per encounter kind the game can surface. Tapping a
 * button jumps to the WILDS (exploration) tab and fires that
 * encounter immediately — no walking onto the right node required:
 *
 *   - COMBAT   → combat-prelude, fought on `/combat-encounter` (`<CombatGate>`),
 *               seeded with the LOWEST-level standard foe on the
 *               current map so the fight is the gentlest available.
 *   - BOSS     → combat-prelude with the lowest-level boss foe on
 *               the current map, else in the library (KNEEL / STRIKE
 *               chrome, no flee).
 *   - HAZARD / REST / TREASURE → the real minigame session, launched
 *               through the same `begin*` actions the live map path
 *               uses, so the matching gate (`<HazardGate>` →
 *               `/hazard`, `<RestGate>` → `/rest`, `<CacheGate>` →
 *               `/cache`) routes to the full-screen minigame.
 *
 * Mechanism: rest / treasure never reach the `/event` slice —
 * the live `resolveCurrentMapEventAction` intercepts those kinds and
 * starts a minigame session.
 * This panel mirrors that interception by calling the `begin*`
 * actions directly rather than seeding a
 * `ResolvedEvent` onto the event slice, which would dead-end at the
 * `/event` "NO EVENT" card because `composeNarrative` returns the empty
 * VM for these kinds. Combat / boss construct a
 * combat-prelude `ResolvedEvent` and drop it on the slice (`<CombatGate>`
 * engages it onto `/combat-encounter`); village / cutscene
 * seed their paced events for `<EventGate>` to route. Every
 * button is deterministic regardless of where the player is standing.
 *
 * Navigation happens first so the minigame / paced routes stack on
 * top of the WILDS tab rather than the other way round.
 *
 * Renders null outside dev builds. Mounted in the `/dev` ENCOUNTERS
 * section beside `DebugEnemyPicker` (any foe).
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from '@/lib/platform/router';
import {
    EnemiesByMap,
    EnemyLibrary,
    type Enemy,
} from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { useGameActions, useGameStore } from '@/state/GameStoreProvider';
import { stageEncounter } from '@/state/dev/enemy-picker';
import { EMPTY_EVENT_SLICE } from '@/state/store';
import type { NodeType } from '@/state/presenters/exploration.engine';
import { FONTS } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

type MapKey = keyof typeof EnemiesByMap;
const DEFAULT_MAP: MapKey = 'breakwater';

/** All encounters exposed as trigger buttons. `kind` doubles as the
 * `sourceNodeType` stamped on the event slice. */
const ENCOUNTERS: readonly { kind: NodeType; label: string }[] = [
    { kind: 'encounter', label: 'COMBAT' },
    { kind: 'boss', label: 'BOSS' },
    { kind: 'hazard', label: 'HAZARD' },
    { kind: 'rest', label: 'REST' },
    { kind: 'treasure', label: 'TREASURE' },
];

/** Paced narrative events that route to their own dedicated screens
 * rather than the generic /event shell — village + cutscene.
 * Their `kind` isn't a NodeType, so they ride a separate button row; the
 * seeded event drives <EventGate> to push /village or /cutscene. Sample
 * payloads mirror the engine's ResolvedEvent shape (selectVillageVM reads
 * merchants[].dialogueTree + shop.wares; the cutscene screen reads
 * lines[]). Lets both screens be eyeballed without walking to one. */
const PACED_EXTRAS: readonly { id: string; label: string; event: unknown }[] = [
    {
        id: 'village',
        label: 'VILLAGE',
        event: {
            kind: 'village',
            villageName: 'Saltmarsh Wend',
            merchants: [
                {
                    name: 'Maren the Netwright',
                    dialogueTree: {
                        rootId: 'r',
                        nodes: { r: { id: 'r', text: 'Rope and twine, pilgrim — cheaper than drowning.' } },
                    },
                },
                {
                    name: 'Old Coddle',
                    dialogueTree: {
                        rootId: 'r',
                        nodes: { r: { id: 'r', text: 'Bread two days stale, honest as the tide.' } },
                    },
                },
            ],
            shop: {
                wares: [
                    { itemId: 'minor-healing-potion', price: 12 },
                ],
            },
            anvil: { variants: [] },
        },
    },
    {
        id: 'cutscene',
        label: 'CUTSCENE',
        event: {
            kind: 'cutscene',
            lines: [
                'The tide goes out further than it should, and does not turn.',
                'On the bared flats lies something the sea forgot to take back.',
                'It does not move. It is waiting for you to.',
            ],
        },
    },
];

export function DebugTriggerEncounter() {
    const styles = useStyles();
    const store = useGameStore();
    const actions = useGameActions();
    const router = useRouter();

    if (!isDevToolsEnabled()) return null;

    const currentMapKey = (): MapKey => {
        const world = store.getState().world as
            | { currentMap?: { name?: string } }
            | undefined;
        const name = world?.currentMap?.name;
        return name && name in EnemiesByMap ? (name as MapKey) : DEFAULT_MAP;
    };

    /** Lowest-level foe on the map matching `predicate`, ties broken by
     * lowest health. Returns null if nothing matches. */
    const lowestFoe = (predicate: (e: Enemy) => boolean): Enemy | null => {
        const roster = EnemiesByMap[currentMapKey()].filter(predicate);
        if (roster.length === 0) return null;
        return [...roster].sort(
            (a, b) => a.level - b.level || a.health - b.health,
        )[0];
    };

    const setPending = (event: unknown, sourceNodeType: NodeType) => {
        store.setState({
            event: {
                ...EMPTY_EVENT_SLICE,
                pending: { state: store.getState(), event } as never,
                sourceNodeType,
            },
        });
    };

    const fire = (kind: NodeType) => {
        switch (kind) {
            case 'encounter': {
                // Lowest-level standard foe — bosses + uniques excluded.
                const enemy = lowestFoe(
                    (e) => e.difficulty !== 'boss' && e.difficulty !== 'unique',
                );
                if (!enemy) return;
                stageEncounter(store, enemy, 'dev:trigger-encounter', false);
                return;
            }
            case 'boss': {
                // Lowest-level boss foe on the map; bosses are pinned
                // per-node rather than drawn from map pools, so fall back to
                // the library's lowest-level boss, then the gentlest foe.
                const libraryBoss = [...EnemyLibrary]
                    .filter((e) => e.difficulty === 'boss')
                    .sort((a, b) => a.level - b.level || a.health - b.health)[0];
                const enemy =
                    lowestFoe((e) => e.difficulty === 'boss') ?? libraryBoss ?? lowestFoe(() => true);
                if (!enemy) return;
                stageEncounter(store, enemy, 'dev:trigger-boss', true);
                return;
            }
            case 'hazard':
                // The real minigame. <HazardGate> observes the slice and
                // pushes /hazard.
                actions.beginHazard();
                return;
            case 'rest':
                // The rest-choice node — <RestGate> routes to /rest. Mirror
                // the live interceptor's default shelter (a node that
                // does not say is wilderness).
                actions.beginRest({ shelter: 'camp' });
                return;
            case 'treasure':
                // "The Reliquary" — <CacheGate> routes to /cache. The
                // choice screen rolls its own card/item candidates; seed
                // a modest tier + coin so the claim ledger has content.
                actions.beginLootCacheChoice({ tier: 'modest', currency: 25 });
                return;
            default:
                return;
        }
    };

    const onPress = (kind: NodeType) => {
        // Jump to WILDS first so paced-event (/event) and hazard
        // (/hazard) routes stack on top of the world tab.
        router.push('/(tabs)/exploration');
        fire(kind);
    };

    const onPressPaced = (event: unknown) => {
        // Village/cutscene push a dedicated full-screen route via
        // <EventGate>, which is mounted at the root layout and so fires
        // from any tab. Unlike onPress (whose combat-prelude renders over
        // the WILDS map), these need NO tab jump — and crucially, NOT
        // jumping means the event's dismiss tap returns here, to the dev
        // menu, instead of dead-ending on the exploration map.
        // `sourceNodeType` is metadata these screens don't read, so any
        // valid NodeType is harmless — 'quest' stands in.
        setPending(event, 'quest');
    };

    return (
        <View style={styles.root}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>DEBUG · TRIGGER ENCOUNTER</Text>
                <Text style={styles.sub}>jump to WILDS + fire it</Text>
            </View>
            <View style={styles.buttonGroup}>
                {ENCOUNTERS.map((entry) => (
                    <Pressable
                        key={entry.kind}
                        style={styles.button}
                        onPress={() => onPress(entry.kind)}
                        accessibilityRole="button"
                        accessibilityLabel={`Trigger ${entry.label.toLowerCase()} encounter on the world tab`}
                        testID={`debug-trigger-encounter-${entry.kind}`}
                    >
                        <Text style={styles.buttonLabel}>{entry.label}</Text>
                    </Pressable>
                ))}
                {PACED_EXTRAS.map((entry) => (
                    <Pressable
                        key={entry.id}
                        style={styles.button}
                        onPress={() => onPressPaced(entry.event)}
                        accessibilityRole="button"
                        accessibilityLabel={`Trigger ${entry.label.toLowerCase()} on the world tab`}
                        testID={`debug-trigger-encounter-${entry.id}`}
                    >
                        <Text style={styles.buttonLabel}>{entry.label}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    root: {
        marginTop: 8,
        marginHorizontal: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: AXM.ash,
        borderStyle: 'dashed',
        backgroundColor: AXM.panelBg,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 6,
    },
    label: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 1.5,
        color: AXM.bone,
    },
    sub: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        color: AXM.parchment,
    },
    buttonGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    button: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: AXM.rust,
        backgroundColor: AXM.bg,
    },
    buttonLabel: {
        fontFamily: FONTS.gothic,
        fontSize: 11,
        color: AXM.rust,
        letterSpacing: 1,
    },
}));
