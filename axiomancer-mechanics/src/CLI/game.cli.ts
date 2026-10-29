#!/usr/bin/env node

/**
 * Game CLI — demonstrational full-loop driver.
 *
 * Wires every public verb on the game store into a tabbed inquirer prompt
 * so the engine can be exercised by hand. Tabs (see `pickTab`):
 *
 *   • Map             — list adjacent nodes, dispatch MOVE_TO_NODE, then
 *                       PROCESS_NODE to trigger the node's authored event.
 *                       Encounters are staged into combat state; the
 *                       Hazard-Pattern combat driver runs via `npm run combat`.
 *   • Journal         — read-only: active / completed quests + world flags.
 *   • Cards          — read-only: known/unlocked cards.
 *   • Codex           — read-only: unlocked journal entries.
 *   • Inventory       — read-only listing of carried items.
 *   • Character       — stats sheet + stat allocation + card learning.
 *   • DEV / Begin again / Save / Load / Quit.
 *
 * Logic stays in the store / reducer. This file only formats and dispatches.
 *
 * Run with: `npm run game` (which invokes `ts-node src/CLI/game.cli.ts`).
 *
 * Combat routing:
 *   `npm run combat`        = Hazard-Pattern combat (combat.cli.ts)
 *   `npm run combat-sim`    = Monte-Carlo balance witness (not agentic play)
 */

import fs from 'fs';
import { parseArgv, prompt, emit, log, logState, setIoMode, setOutputMode, setStateLogPath, attachCliLogSinks, type CliFlags } from './io';

import { createCharacter } from '../Character';
import { ENEMY_REGISTRY, EnemyLibrary, type EnemySlug } from '../Enemy/enemy.library';
import { deepClone } from '../Utils';
import type { EquipmentSlot } from '../Items';
import { SLOT_CAPACITY } from '../Items';
import {
    devSetLevel, devSetStats, devLearnCards,
    devGrantAllEquipment, devGrantAllConsumables, devEquipItem,
    devGrantCurrency,
    devSpawnEnemy, devMaxOut, getEnemySlugs, getCardIds,
    getEquipmentTemplateIds,
} from './dev-tools';
import type { CodexEntry } from '../Game/types';
import { createGameStore } from '../Game/store';
import { GAME_STATE_VERSION } from '../Game/game.reducer';
import { migrate, dropUnknownCardIds, dropRetiredFlags } from '../Game/game.migrate';
import { buildStateFromFixture } from '../Game/fixtures';
import type { GameState } from '../Game/types';
import { createStartingWorld, STARTABLE_MAPS } from '../World';
import { describeFixtures, FIXTURE_LIST_REF, resolveStateFixture } from './fixture-boot';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { createNodeAdapter } from '../Game/persistence/node.adapter';
import type { PersistenceAdapter } from '../Game/persistence/types';
import type { TypedLevelUpEvent } from '../Game/events.types';
import { getMapDefinition } from '../World/map.registry';
import {
    resolveMapEvent, settleArrival, MAP_REGISTRY, getNodePrimaryEventKind, takeTravel,
    legalMovesFrom, roadRouteTo, roadReachable, syncWorldMoveLists, acceptQuestStep, turnInQuestStep,
} from '../World';
import { resolveDeath } from '../Game/death';
import type { ResolvedEvent, ContinentName, MapName } from '../World';
import { getCardById } from '../Cards/cards.library';
import { getAvailableCards } from '../Cards/card.engine';
import { isConsumable } from '../Items/types';
import { buyItem, sellItem, defaultSellPrice } from '../Items/shop.reducer';
import { getConsumableById } from '../Items/consumable.library';
import { runHazardCombatCliEncounter, type CombatAutoPolicyId } from './combat.cli';
import type { CombatOutcome } from '../Combat/combat.encounter.types';

type Tab = 'map' | 'journal' | 'cards' | 'codex' | 'inventory' | 'character' | 'dev' | 'reset' | 'save' | 'load' | 'quit';

type GameStoreHandle = ReturnType<typeof createGameStore>;

// Codex lookup. Walks EnemyLibrary once at module load to build an
// id → CodexEntry map. Enemy.journalEntry is the only source of codex
// entries, so this in-CLI walk is complete.
const codexLookup: Map<string, CodexEntry> = (() => {
    const map = new Map<string, CodexEntry>();
    for (const enemy of EnemyLibrary) {
        if (enemy.journalEntry) {
            map.set(enemy.journalEntry.id, enemy.journalEntry);
        }
    }
    return map;
})();

/**
 * Build the CLI store. With `initial` (a compiled state fixture) the store
 * boots exactly that state; without it, the historical blank L1 5/5/5
 * character (configure via the DEV menu).
 */
async function bootstrapStore(adapter: PersistenceAdapter, initial?: GameState, startMap?: MapName): Promise<GameStoreHandle> {
    const events = createEventEmitter();
    events.onAny(emit);
    // Surface newly-eligible cards after a level-up.
    // The store's dispatch enriches the payload with `unlockedCards`; the
    // CLI just renders the message.
    events.on('character:levelup', evt => {
        const unlocked = (evt as TypedLevelUpEvent).payload.unlockedCards ?? [];
        if (unlocked.length > 0) {
            log(`You can now learn ${unlocked.length} new card${unlocked.length === 1 ? '' : 's'}: ${unlocked.join(', ')}`);
        }
    });

    if (initial) {
        // A full GameState as `overrides` replaces every slice of the
        // adapter's load / new-game base. The RNG was seeded by
        // `buildStateFromFixture` when the fixture carries a seed.
        const store = createGameStore(adapter, initial, events);
        log(`\nBooted from state fixture — ${initial.player.name} L${initial.player.level} on ${initial.world.currentMap.name}/${initial.world.currentMap.currentNode}.\n`);
        logState('bootstrap', null, store.getState(), { boot: 'fixture' });
        return store;
    }

    const player = createCharacter({
        name: 'Player',
        level: 1,
        baseStats: { heart: 5, body: 5, mind: 5 },
    });
    log('\nStarting with a blank character (level 1, 5/5/5). Use the DEV menu to configure.\n');

    // `--start-map` (map revamp M3a): a fresh game placed on another map.
    const world = startMap ? { world: createStartingWorld(startMap) } : {};
    const store = createGameStore(adapter, { player, ...world }, events);
    logState('bootstrap', null, store.getState(), { boot: 'blank' });
    return store;
}

async function pickTab(): Promise<Tab> {
    const tabs: Array<{ name: string; value: Tab }> = [
        { name: 'Map             — travel + resolve node events', value: 'map' },
        { name: 'Journal    — quests + flags', value: 'journal' },
        { name: 'Cards     — known/unlocked', value: 'cards' },
        { name: 'Codex      — unlocked journal entries from befriended foes (Phase 73)', value: 'codex' },
        { name: 'Inventory  — items in pack', value: 'inventory' },
        { name: 'Character  — full stats + equipment + effects sheet', value: 'character' },
        { name: 'DEV        — manipulate character, grant items/cards, spawn enemies', value: 'dev' },
        { name: 'Begin again — reset to starting hearth, full or keep-character (Phase 72)', value: 'reset' },
        { name: 'Save       — write the current state to the save file', value: 'save' },
        { name: 'Load       — restore state from the save file', value: 'load' },
        { name: 'Quit',                                 value: 'quit' },
    ];
    const { tab } = await prompt<{ tab: Tab }>([
        { type: 'rawlist', name: 'tab', message: 'Where to?', choices: tabs },
    ]);
    return tab;
}


function asCombatPolicy(value: string | undefined): CombatAutoPolicyId {
    if (value === 'naive' || value === 'safe' || value === 'aggressive' || value === 'status') return value;
    if (value !== undefined) throw new Error(`Unknown --combat-policy '${value}'. Use naive|safe|aggressive|status.`);
    return 'status';
}

/** What resolving one node's authored event actually produced — the
 *  contract `route:end` classification is built from. */
interface NodeResolutionResult {
    event: ResolvedEvent;
    /** Set only when the event was an encounter; null covers "no
     *  encounter" and "combat still running" (shouldn't happen — auto
     *  mode plays to a terminal outcome or the turn cap). */
    combatOutcome: CombatOutcome | null;
}

/** Resolves the event authored at the CURRENT node — assumes any move
 *  already happened. Split out from `moveAndResolveMapNode` so the
 *  route runner can also resolve the start node in place, which `moveToNode` can never target since a node is never
 *  in its own `connectedNodes`. */
async function resolveCurrentNodeEvent(
    store: GameStoreHandle,
    flags: CliFlags,
    nodeLabel: string,
): Promise<NodeResolutionResult> {
    const before = store.getState();
    const result = resolveMapEvent(before);
    store.setState({
        player: result.state.player,
        world:  result.state.world,
        quests: result.state.quests,
        flags:  result.state.flags,
    });
    logState('resolveMapEvent', before, store.getState(), result.event);
    log(describeResolvedEvent(result.event));

    let combatOutcome: CombatOutcome | null = null;
    if (result.event.kind === 'encounter') {
        let enemy = result.event.encounter.enemies[0];
        if (!enemy) throw new Error(`Encounter at '${nodeLabel}' had no enemy.`);
        // Test/debug override: force a specific ENEMY_REGISTRY enemy at the node
        // named by `--combat-enemy-node`. The route-audit e2e uses this to fight
        // a test-registered ceiling enemy at fv-6 — a deterministic combat DEFEAT that
        // exercises the "defeat → blocked" classifier without depending on card
        // balance (a normal boss is winnable once the decks are tuned).
        if (flags.combatEnemy && flags.combatEnemyNode === nodeLabel) {
            const override = (ENEMY_REGISTRY as Record<string, typeof enemy>)[flags.combatEnemy];
            if (!override) throw new Error(`--combat-enemy '${flags.combatEnemy}' is not in ENEMY_REGISTRY.`);
            enemy = deepClone(override);
        }
        const combatResult = await runHazardCombatCliEncounter({
            enemy,
            presetId: 'apprentice',
            seed: flags.combatSeed,
            auto: flags.autoCombat || flags.route !== undefined || flags.routeAudit !== undefined || flags.scriptPath !== undefined || flags.stdin,
            policy: asCombatPolicy(flags.combatPolicy),
            maxTurns: flags.combatMaxTurns ?? 20,
        });
        combatOutcome = combatResult.outcome;
        // The fight ran outside the store. A lost fight is a death: the
        // death rule decides what comes back (a revive, or a run over).
        // Anything else settles its node here, as `END_COMBAT` does in the store.
        if (combatOutcome === 'defeat') {
            const died = resolveDeath(store.getState(), 'fight');
            store.setState(died.state);
            log(died.outcome === 'revived' ? 'Defeated: revived at 1 VITAE, dying.' : 'Defeated while dying: the run is over.');
        } else {
            store.setState({ world: settleArrival(store.getState()).world });
        }
    }

    if (result.event.kind === 'village' && result.event.shop && result.event.shop.wares.length > 0) {
        await shopLoop(store, result.event.shop);
    }

    if (result.event.kind === 'quest') playQuestNode(store, result.event);

    // A travel node asks "move to X?"; a walk through the CLI always says
    // yes to an open way (phase NK1d). A shut way moves no one.
    if (result.event.kind === 'travel' && result.event.open) {
        store.setState({ world: takeTravel(store.getState() as GameState).world });
    }

    return { event: result.event, combatOutcome };
}

/**
 * A quest node on a scripted walk is played as a player would: the step it
 * turns in is turned in (paid through the reward door), then the step it
 * offers is accepted, which spends the node and opens its pocket. A node
 * that is locked or waiting changes nothing.
 */
function playQuestNode(store: GameStoreHandle, event: Extract<ResolvedEvent, { kind: 'quest' }>): void {
    let state = store.getState() as GameState;
    if (event.stage === 'turn-in') {
        const turnedIn = turnInQuestStep(state, event.questline, event.node - 1).state;
        if (turnedIn !== state) log(`Turned in step ${event.node - 1} of ${event.questline}.`);
        state = turnedIn;
    }
    if (event.stage === 'turn-in' || event.stage === 'offer') {
        const accepted = acceptQuestStep(state, event.questline, event.node);
        if (accepted !== state) log(`Accepted step ${event.node} of ${event.questline}.`);
        state = accepted;
    }
    store.setState({ player: state.player, world: state.world, quests: state.quests });
}

async function moveAndResolveMapNode(store: GameStoreHandle, target: string, flags: CliFlags): Promise<NodeResolutionResult> {
    const state = store.getState();
    const current = state.world.currentMap.currentNode;
    // The engine's road rule is the authority on where a walk may go: a
    // questline's pockets and its locks read only there. A route names the
    // nodes to resolve; the walk back across walked nodes between two of
    // them is taken for it, one road at a time.
    const roads = roadRouteTo(state.world.currentMap, target);
    if (roads === null) {
        const reachable = roadReachable(state.world.currentMap);
        throw new Error(`Route target '${target}' is not reachable from '${current}'. Reachable: ${reachable.join(', ') || '(none)'}`);
    }

    for (const step of roads) {
        const beforeMove = store.getState();
        store.getState().moveToNode(step);
        log(step === target ? `Moved to ${target}.` : `Walked back across ${step}.`);
        logState('moveToNode', beforeMove, store.getState(), { target: step });
    }

    return resolveCurrentNodeEvent(store, flags, target);
}

/**
 * The honest evidence contract for `--route` / `--route-audit`.
 * Three lanes, never conflated:
 *   - `survivorship`   — a legal, no-backtravel walk; stops dead on defeat.
 *   - `blocked`        — a survivorship walk that hit a combat defeat.
 *   - `coverage-audit` — read-only introspection of every authored node,
 *                        making no claim about a single life surviving.
 */
interface RouteEndSummary {
    classification: 'survivorship' | 'blocked' | 'coverage-audit';
    visitedNodeIds: string[];
    resolvedNodeIds: string[];
    unvisitedNodeIds: string[];
    blockedAtNodeId?: string;
    blockerReason?: string;
    combatOutcomes: Record<string, string>;
    survived: boolean;
    startNode?: { nodeId: string; resolved: boolean; reason?: string };
    eventKinds?: Record<string, string>;
}

function emitRouteEnd(store: GameStoreHandle, summary: RouteEndSummary): void {
    logState('route:end', null, store.getState(), summary);
    emit({ type: 'cli:exit', payload: { reason: 'route-complete', ...summary } });
}

/** `--route` walker. Player-ish/legal moves only —
 *  never claims survivorship past a combat defeat. */
async function runScriptedRoute(store: GameStoreHandle, flags: CliFlags): Promise<void> {
    const startState = store.getState();
    const startNodeId = startState.world.currentMap.currentNode;
    const def = getMapDefinition(startState.world.currentMap.continent, startState.world.currentMap.name);
    const allNodeIds = def.nodes.map(n => n.id);

    const visitedNodeIds: string[] = [startNodeId];
    const resolvedNodeIds: string[] = [];
    const combatOutcomes: Record<string, string> = {};
    let startNode: RouteEndSummary['startNode'];

    if (flags.resolveStart) {
        const { event, combatOutcome } = await resolveCurrentNodeEvent(store, flags, startNodeId);
        if (event.kind !== 'none') resolvedNodeIds.push(startNodeId);
        if (combatOutcome) combatOutcomes[startNodeId] = combatOutcome;
        startNode = { nodeId: startNodeId, resolved: true };
        if (combatOutcome === 'defeat') {
            emitRouteEnd(store, {
                classification: 'blocked',
                visitedNodeIds, resolvedNodeIds,
                unvisitedNodeIds: allNodeIds.filter(id => !visitedNodeIds.includes(id)),
                blockedAtNodeId: startNodeId,
                blockerReason: 'combat defeat at start node',
                combatOutcomes,
                survived: false,
                startNode,
            });
            return;
        }
    } else {
        startNode = {
            nodeId: startNodeId,
            resolved: false,
            reason: 'start node not resolved by the route runner; pass --resolve-start to resolve it',
        };
    }

    let blockedAtNodeId: string | undefined;
    let blockerReason: string | undefined;

    for (const target of flags.route ?? []) {
        const { event, combatOutcome } = await moveAndResolveMapNode(store, target, flags);
        visitedNodeIds.push(target);
        if (event.kind !== 'none') resolvedNodeIds.push(target);
        if (combatOutcome) combatOutcomes[target] = combatOutcome;
        if (combatOutcome === 'defeat') {
            blockedAtNodeId = target;
            blockerReason = 'combat defeat';
            break;
        }
    }

    emitRouteEnd(store, {
        classification: blockedAtNodeId ? 'blocked' : 'survivorship',
        visitedNodeIds,
        resolvedNodeIds,
        unvisitedNodeIds: allNodeIds.filter(id => !visitedNodeIds.includes(id)),
        blockedAtNodeId,
        blockerReason,
        combatOutcomes,
        survived: blockedAtNodeId === undefined,
        startNode,
    });
}

function findMapContinent(mapName: string): ContinentName | undefined {
    for (const continent of Object.keys(MAP_REGISTRY) as ContinentName[]) {
        if (MAP_REGISTRY[continent]?.[mapName as MapName]) return continent;
    }
    return undefined;
}

/** `--route-audit <mapName>` — non-mutating full-map coverage witness.
 *  Reads every authored node's
 *  primary event kind via `getNodePrimaryEventKind` — no RNG roll, no
 *  movement, no combat — so it can honestly claim 100% node coverage
 *  without pretending a single legal route visited them all in one life. */
async function runRouteAudit(store: GameStoreHandle, mapName: string): Promise<void> {
    const continent = findMapContinent(mapName);
    if (!continent) {
        const known = (Object.keys(MAP_REGISTRY) as ContinentName[])
            .flatMap(c => Object.keys(MAP_REGISTRY[c] ?? {}));
        throw new Error(`--route-audit: unknown map '${mapName}'. Registered maps: ${known.join(', ') || '(none)'}`);
    }
    const def = getMapDefinition(continent, mapName as MapName);
    const allNodeIds = def.nodes.map(n => n.id);
    const eventKinds: Record<string, string> = {};
    for (const id of allNodeIds) {
        eventKinds[id] = getNodePrimaryEventKind(continent, mapName as MapName, id) ?? 'none';
    }

    log(`\n— Route audit: ${def.name} — ${allNodeIds.length} authored nodes —`);
    for (const id of allNodeIds) log(`  ${id}: ${eventKinds[id]}`);

    emitRouteEnd(store, {
        classification: 'coverage-audit',
        visitedNodeIds: allNodeIds,
        resolvedNodeIds: allNodeIds,
        unvisitedNodeIds: [],
        combatOutcomes: {},
        survived: true,
        eventKinds,
    });
}

async function mapTab(store: GameStoreHandle, flags: CliFlags): Promise<void> {
    const state   = store.getState();
    const current = state.world.currentMap.currentNode;
    const def     = getMapDefinition(state.world.currentMap.continent, state.world.currentMap.name);
    const node    = def.nodes.find(n => n.id === current);

    log(`\n— Map: ${def.name} —`);
    log(`You are at ${current}.`);

    // The road rule's moves, new and spent nodes alike.
    const reachable = node ? legalMovesFrom(state.world.currentMap) : [];
    if (reachable.length === 0) {
        log('No adjacent nodes are open right now.');
        return;
    }

    const map = state.world.currentMap;
    const autoTarget = reachable.find(id => !map.completedNodes.includes(id) && !map.consumedNodes.includes(id)) ?? reachable[0];
    const { target } = await prompt<{ target: string }>([
        {
            type: 'rawlist',
            name: 'target',
            message: 'Move to which node?',
            choices: [
                { name: `Auto-advance: next node (${autoTarget})`, value: autoTarget },
                ...reachable.map(id => ({ name: id, value: id })),
                { name: 'Stay put', value: '' },
            ],
        },
    ]);
    if (!target) return;

    await moveAndResolveMapNode(store, target, flags);
}

function describeResolvedEvent(event: ResolvedEvent): string {
    switch (event.kind) {
        case 'encounter':   return `Encounter! ${event.isBoss ? '(boss) ' : ''}${event.encounter.enemies.map(e => e.name).join(', ')}`;
        case 'rest':        return `You rest. (+${event.healed} HP)`;
        case 'village': {
            const wareCount = event.shop?.wares.length ?? 0;
            const shopSuffix = wareCount > 0 ? ` — ${wareCount} ware${wareCount === 1 ? '' : 's'} for sale` : '';
            const anvilSuffix = event.anvil ? ' — the Anvil is here' : '';
            return `Village: ${event.villageName} (${event.merchants.length} merchant${event.merchants.length === 1 ? '' : 's'})${shopSuffix}${anvilSuffix}.`;
        }
        case 'cutscene':    return event.lines.join(' ');
        case 'hazard':      return `Hazard! (-${event.damage} HP${event.effects.length > 0 ? `, ${event.effects.length} effect${event.effects.length === 1 ? '' : 's'}` : ''})`;
        case 'loot-cache':  return `Loot cache: ${event.items.length} item${event.items.length === 1 ? '' : 's'}, ${event.currency} currency.`;
        case 'travel': {
            const where = 'map' in event.destination
                ? `${event.destination.continent} / ${event.destination.map}`
                : `node ${event.destination.node}`;
            return event.open
                ? `${event.prompt} (move to ${where}? yes)`
                : `${event.prompt} (the way to ${where} is shut until ${event.opensAfter} is settled)`;
        }
        case 'labyrinth':   return `${event.description ?? 'A door into the Aporia.'} (the Aporia, ${event.act}: run \`npm run labyrinth\` to walk it)`;
        case 'quest':       return `${event.description ?? 'A quest giver waits.'} (questline ${event.questline}, node ${event.node}: ${event.stage})`;
        case 'none':        return 'Nothing of note happens.';
    }
}

async function shopLoop(store: GameStoreHandle, shop: { wares: ReadonlyArray<{ itemId: string; price: number }> }): Promise<void> {
    while (true) {
        const player = store.getState().player;
        log(`\n— Shop — currency: ${player.currency}`);
        const { action } = await prompt<{ action: 'buy' | 'sell' | 'leave' }>([{
            type: 'rawlist', name: 'action', message: 'Shop:',
            choices: [
                { name: 'buy   — browse wares', value: 'buy' },
                { name: 'sell  — list inventory', value: 'sell' },
                { name: 'leave — close the shop', value: 'leave' },
            ],
        }]);
        if (action === 'leave') return;

        if (action === 'buy') {
            const choices = shop.wares.map(w => {
                const item = getConsumableById(w.itemId);
                const price = w.price;
                const label = item ? `${item.name} — ${price}` : `${w.itemId} — ${price} (unknown)`;
                return { name: label, value: w.itemId };
            });
            choices.push({ name: 'back', value: '' });
            const { wareId } = await prompt<{ wareId: string }>([{
                type: 'rawlist', name: 'wareId', message: 'Buy what?', choices,
            }]);
            if (!wareId) continue;
            const ware = shop.wares.find(w => w.itemId === wareId)!;
            const item = getConsumableById(ware.itemId);
            if (!item) { log(`Unknown item: ${ware.itemId}`); continue; }
            const price = ware.price;
            const before = store.getState();
            const next = buyItem(before.player, item, price);
            if (next === before.player) {
                log(`You can't afford ${item.name} (need ${price}, have ${before.player.currency}).`);
            } else {
                store.setState({ player: next });
                log(`Bought ${item.name} for ${price}.`);
                logState('buyItem', before, store.getState(), { itemId: ware.itemId, price });
            }
            continue;
        }

        // sell
        const inv = store.getState().player.inventory;
        if (inv.length === 0) { log('Nothing to sell.'); continue; }
        const choices = inv.map((i, idx) => {
            // Engine-tier policy: defaultSellPrice
            // halves and floors a ware's buy price. Always strictly less than the
            // buy price for any positive integer, so buy → sell round-trips are
            // net-negative for the player. For items not on the current shop's
            // ware list, fall back to 1 (the pre-existing minimum) — that path
            // is unaffected by the exploit since it doesn't loop with a buy.
            const matching = shop.wares.find(w => w.itemId === i.id);
            const sellPrice = matching ? defaultSellPrice(matching) : 1;
            return { name: `${i.name} — sell for ${sellPrice}`, value: `${idx}:${sellPrice}` };
        });
        choices.push({ name: 'back', value: '' });
        const { sellChoice } = await prompt<{ sellChoice: string }>([{
            type: 'rawlist', name: 'sellChoice', message: 'Sell what?', choices,
        }]);
        if (!sellChoice) continue;
        const [idxStr, priceStr] = sellChoice.split(':');
        const idx = Number(idxStr);
        const price = Number(priceStr);
        const target = store.getState().player.inventory[idx];
        if (!target) { log('Item slot vanished.'); continue; }
        const before = store.getState();
        const next = sellItem(before.player, target.id, price);
        if (next === before.player) {
            log(`Couldn't sell ${target.name}.`);
        } else {
            store.setState({ player: next });
            log(`Sold ${target.name} for ${price}. Currency: ${next.currency}.`);
            logState('sellItem', before, store.getState(), { itemId: target.id, price });
        }
    }
}

function journalTab(store: GameStoreHandle): void {
    const { quests, flags } = store.getState();
    log('\n— Journal —');
    log(`Active quests   : ${quests.active.map(q => q.name).join(', ') || '(none)'}`);
    log(`Completed quests: ${quests.completed.join(', ') || '(none)'}`);
    log(`World flags     : ${flags.join(', ') || '(none)'}`);
}

function cardsTab(store: GameStoreHandle): void {
    const { player } = store.getState();
    log('\n— Cards —');
    log('Known cards:');
    for (const id of player.knownCards) {
        const s = getCardById(id);
        log(`  • ${s?.name ?? id}`);
    }
}

function codexTab(store: GameStoreHandle): void {
    const { codex } = store.getState();
    log('\n— Codex —');
    if (codex.unlockedEntries.length === 0) {
        log('Your codex is empty — befriend a foe with a journal entry to start filling it.');
        return;
    }
    for (const entryId of codex.unlockedEntries) {
        const entry = codexLookup.get(entryId);
        if (!entry) {
            log(`  • ${entryId}  (unknown entry — source may have been removed from the library)`);
            continue;
        }
        log(`  • ${entry.title}`);
        log(`    ${entry.body}`);
        log('');
    }
}

async function resetTab(store: GameStoreHandle): Promise<void> {
    const { mode } = await prompt<{ mode: 'full' | 'keep' | 'cancel' }>([
        {
            type: 'rawlist',
            name: 'mode',
            message: 'Begin again — how?',
            choices: [
                { name: 'Full reset — new character + new world', value: 'full' },
                { name: 'Keep character — fresh world, same character ledger', value: 'keep' },
                { name: 'Cancel — back to the main menu', value: 'cancel' },
            ],
        },
    ]);
    if (mode === 'cancel') return;
    const keepCharacter = mode === 'keep';
    const before = store.getState();
    const after = store.getState().resetRun({ keepCharacter });
    log(`\nBegan again. (keepCharacter: ${keepCharacter})`);
    log(`Run id     : ${after.runId}`);
    log(`Hearth node: ${after.world.currentMap.currentNode}`);
    logState('resetRun', before, after, { keepCharacter });
}

function inventoryTab(store: GameStoreHandle): void {
    const { inventory } = store.getState().player;
    log('\n— Inventory —');
    if (inventory.length === 0) {
        log('(empty)');
        return;
    }
    for (const item of inventory) {
        const qty = isConsumable(item) ? `  ×${item.quantity}` : '';
        log(`  • ${item.name}${qty}  — ${item.description}`);
    }
}

async function characterTab(store: GameStoreHandle): Promise<void> {
    const state = store.getState();
    const p = state.player;

    log('\n— Character Sheet —');
    log(`Name:     ${p.name}`);
    log(`Level:    ${p.level}  (XP ${p.experience}/${p.experienceToNextLevel})`);
    log(`Health:   ${p.health}/${p.maxHealth}`);
    log(`Currency: ${p.currency}`);
    if (p.availableStatPoints > 0) {
        log(`Points:   ${p.availableStatPoints} available to allocate`);
    }

    log('\nBase stats:');
    log(`  heart ${p.baseStats.heart}   body ${p.baseStats.body}   mind ${p.baseStats.mind}`);

    log('\nEquipment:');
    const loadout = p.equipment;
    const logSlot = (label: string, eq: typeof loadout.weapon): void => {
        if (!eq) {
            log(`  ${label.padEnd(12)} (empty)`);
        } else {
            const sig = eq.grantsSignature ? ` [grants ${eq.grantsSignature}]` : '';
            log(`  ${label.padEnd(12)} ${eq.name}${sig}`);
        }
    };
    logSlot('weapon', loadout.weapon);
    logSlot('armor', loadout.armor);
    for (let i = 0; i < SLOT_CAPACITY.relic; i++) {
        logSlot(`Relic ${i + 1}`, loadout.relics[i] ?? null);
    }

    log('\nActive effects:');
    if (p.effects.length === 0) {
        log('  (none)');
    } else {
        for (const e of p.effects) {
            log(`  • ${e.effectId}  intensity ${e.intensity}  remaining ${e.remainingDuration}`);
        }
    }

    log('\nCards:');
    log(`  Known/Unlocked: ${p.knownCards.length > 0 ? p.knownCards.join(', ') : '(none)'}`);

    log('\nInventory summary:');
    const grouped = new Map<string, number>();
    for (const item of p.inventory) {
        const qty = isConsumable(item) ? item.quantity : 1;
        grouped.set(item.category, (grouped.get(item.category) ?? 0) + qty);
    }
    if (grouped.size === 0) {
        log('  (empty)');
    } else {
        for (const [cat, count] of grouped) {
            log(`  ${cat}: ${count}`);
        }
    }

    // Deferred allocation. Prompt only when there are
    // points to spend; loop until the player either spends them all or
    // picks "leave them unspent". Each allocation is a dispatch so the
    // autosave + state-log records reflect the change.
    while (store.getState().player.availableStatPoints > 0) {
        const pool = store.getState().player.availableStatPoints;
        const { stat } = await prompt<{ stat: 'heart' | 'body' | 'mind' | 'skip' }>([{
            type: 'rawlist', name: 'stat',
            message: `Allocate stat point (${pool} remaining)?`,
            choices: [
                { name: 'heart  — emotion / willpower / charisma', value: 'heart' },
                { name: 'body   — physical / constitution',         value: 'body'  },
                { name: 'mind   — intelligence / reflexes',         value: 'mind'  },
                { name: 'leave them unspent',                       value: 'skip'  },
            ],
        }]);
        if (stat === 'skip') break;
        const before = store.getState();
        store.getState().allocateStatPoint(stat);
        logState('allocateStatPoint', before, store.getState(), { stat });
        log(`Allocated 1 point to ${stat}.`);
    }

    // Runtime card learning. Prompt loop
    // mirrors the Allocate flow: visible only when there's something eligible
    // to learn, scriptable via a "skip" exit. Each learn dispatches so the
    // autosave + state log records the change.
    let learnable = getAvailableCards(store.getState().player);
    while (learnable.length > 0) {
        const choices = learnable.map(s => {
            const blurb = s.description.length > 60
                ? `${s.description.slice(0, 57)}…`
                : s.description;
            return {
                name: `${s.name}  (tier ${s.tier})  — ${blurb}`,
                value: s.id,
            };
        });
        choices.push({ name: 'leave them unlearned', value: 'skip' });
        const { cardId } = await prompt<{ cardId: string }>([{
            type: 'rawlist', name: 'cardId',
            message: `Learn a card? (${learnable.length} available)`,
            choices,
        }]);
        if (cardId === 'skip') break;
        const before = store.getState();
        store.getState().learnCard(cardId);
        logState('learnCard', before, store.getState(), { cardId });
        log(`Learned ${cardId}.`);
        learnable = getAvailableCards(store.getState().player);
    }
}

function saveTab(store: GameStoreHandle, snapshotAdapter: PersistenceAdapter | null): void {
    // The Save tab writes the current state to the snapshot slot
    // (a separate adapter from any autosave path). This keeps explicit
    // save / load decoupled from the dispatch-time autosave, so a Load
    // can roll the player back to a labelled checkpoint even after
    // subsequent dispatches have written newer autosave state.
    if (!snapshotAdapter) {
        log('\nNo save slot — pass --save-file <path> to enable Save / Load.');
        logState('save', store.getState(), store.getState(), { result: 'no-slot' });
        return;
    }
    const before = store.getState();
    const { currentEncounter: _drop, ...persistable } = before;
    snapshotAdapter.save(persistable);
    logState('save', before, store.getState());
    emit({ type: 'game:saved', payload: { state: store.getState() } });
    log('\nGame saved.');
}

function loadTab(store: GameStoreHandle, snapshotAdapter: PersistenceAdapter | null): void {
    if (!snapshotAdapter) {
        log('\nNo save slot — pass --save-file <path> to enable Save / Load.');
        logState('load', store.getState(), store.getState(), { result: 'no-slot' });
        return;
    }
    const saved = snapshotAdapter.load();
    if (!saved) {
        log('\nNo save file to load — Save first.');
        logState('load', store.getState(), store.getState(), { result: 'no-save' });
        return;
    }
    const before = store.getState();
    // Restore EVERY persisted slice and bring an older save up to date through `migrate` first;
    // `currentEncounter` is transient and never saved.
    const loaded = dropRetiredFlags(dropUnknownCardIds(saved.version < GAME_STATE_VERSION ? migrate(saved, saved.version) : saved));
    // A save written under the frontier rule carries the frontier in its
    // move lists: rewrite them by the road rule from where the player stands.
    const syncedWorld = loaded.world ? syncWorldMoveLists(loaded.world) : loaded.world;
    const current = syncedWorld === loaded.world ? loaded : { ...loaded, world: syncedWorld };
    const { currentEncounter: _transient, ...restored } = current;
    store.setState(restored);
    logState('load', before, store.getState());
    emit({ type: 'game:loaded', payload: { state: store.getState() } });
    log('\nGame loaded.');
}

type DevAction = 'set-level' | 'set-stats' | 'learn-cards'
    | 'grant-equipment' | 'grant-consumables' | 'equip-item' | 'grant-currency'
    | 'spawn-enemy' | 'max-out' | 'back';

async function devTab(store: GameStoreHandle): Promise<void> {
    const { action } = await prompt<{ action: DevAction }>([{
        type: 'rawlist', name: 'action',
        message: 'DEV Menu:',
        choices: [
            { name: 'Set level',               value: 'set-level' },
            { name: 'Set base stats',           value: 'set-stats' },
            { name: 'Learn cards (pick/all)',   value: 'learn-cards' },
            { name: 'Grant all equipment',       value: 'grant-equipment' },
            { name: 'Grant all consumables',     value: 'grant-consumables' },
            { name: 'Equip specific item',       value: 'equip-item' },
            { name: 'Grant currency',           value: 'grant-currency' },
            { name: 'Spawn enemy',              value: 'spawn-enemy' },
            { name: 'MAX OUT (level 20, all cards/items)', value: 'max-out' },
            { name: '← Back',                  value: 'back' },
        ],
    }]);

    switch (action) {
        case 'set-level': {
            const { level } = await prompt<{ level: number }>([
                { type: 'number', name: 'level', message: 'Target level:', default: 10 },
            ]);
            const r = devSetLevel(store, level);
            log(`\n${r.detail}\n`);
            break;
        }
        case 'set-stats': {
            const { heart, body, mind } = await prompt<{ heart: number; body: number; mind: number }>([
                { type: 'number', name: 'heart', message: 'Heart:', default: store.getState().player.baseStats.heart },
                { type: 'number', name: 'body',  message: 'Body:',  default: store.getState().player.baseStats.body },
                { type: 'number', name: 'mind',  message: 'Mind:',  default: store.getState().player.baseStats.mind },
            ]);
            const r = devSetStats(store, { heart, body, mind });
            log(`\n${r.detail}\n`);
            break;
        }
        case 'learn-cards': {
            const { mode } = await prompt<{ mode: 'all' | 'pick' }>([{
                type: 'rawlist', name: 'mode', message: 'Learn:',
                choices: [
                    { name: 'All cards', value: 'all' },
                    { name: 'Pick specific', value: 'pick' },
                ],
            }]);
            if (mode === 'all') {
                const r = devLearnCards(store, 'all');
                log(`\n${r.detail}\n`);
            } else {
                const known = new Set(store.getState().player.knownCards);
                const available = getCardIds().filter(id => !known.has(id));
                if (available.length === 0) { log('\nAll cards already known.\n'); break; }
                const { cards } = await prompt<{ cards: string[] }>([{
                    type: 'checkbox', name: 'cards', message: 'Pick cards to learn:',
                    choices: available.map(id => ({ name: id, value: id })),
                }]);
                const r = devLearnCards(store, cards);
                log(`\n${r.detail}\n`);
            }
            break;
        }
        case 'grant-equipment': {
            const r = devGrantAllEquipment(store, 'common');
            log(`\n${r.detail}\n`);
            break;
        }
        case 'grant-consumables': {
            const r = devGrantAllConsumables(store, 5);
            log(`\n${r.detail}\n`);
            break;
        }
        case 'equip-item': {
            const templates = getEquipmentTemplateIds();
            const { templateId } = await prompt<{ templateId: string }>([{
                type: 'rawlist', name: 'templateId', message: 'Which template?',
                choices: templates.map(id => ({ name: id, value: id })),
            }]);
            const slots: EquipmentSlot[] = ['weapon', 'armor', 'relic'];
            const { slot } = await prompt<{ slot: EquipmentSlot }>([{
                type: 'rawlist', name: 'slot', message: 'Slot:',
                choices: slots.map(s => ({ name: s, value: s })),
            }]);
            const r = devEquipItem(store, templateId, slot);
            log(`\n${r.detail}\n`);
            break;
        }
        case 'grant-currency': {
            const { amount } = await prompt<{ amount: number }>([
                { type: 'number', name: 'amount', message: 'Amount to add:', default: 100 },
            ]);
            const r = devGrantCurrency(store, amount);
            log(`\n${r.detail}\n`);
            break;
        }
        case 'spawn-enemy': {
            const slugs = getEnemySlugs();
            const { slug } = await prompt<{ slug: EnemySlug }>([{
                type: 'rawlist', name: 'slug', message: 'Spawn which enemy?',
                choices: slugs.map(s => ({ name: `${s} — ${ENEMY_REGISTRY[s].name}`, value: s })),
            }]);
            const before = store.getState();
            const r = devSpawnEnemy(store, slug);
            logState('debugSpawn', before, store.getState(), { slug, enemyName: ENEMY_REGISTRY[slug].name });
            log(`\n${r.detail}. Combat staged — run the Hazard-Pattern combat CLI: npm run combat\n`);
            break;
        }
        case 'max-out': {
            const r = devMaxOut(store);
            log(`\n${r.detail}\n`);
            break;
        }
        case 'back':
            break;
    }
}

export async function runGameCli(rawArgs = process.argv.slice(2)): Promise<void> {
    // Subcommand: `npm run game -- combat [flags]` hands off to the
    // Hazard-style combat agentic driver.
    if (rawArgs[0] === 'combat') {
        const { runCombatCli } = await import('./combat.cli');
        await runCombatCli(rawArgs.slice(1));
        return;
    }

    // Subcommand: `npm run game -- hazard [flags]` hands off to the standalone
    // hazard mini-game driver, which owns its own flag set.
    if (rawArgs[0] === 'hazard') {
        const { runHazardCli } = await import('./hazard.cli');
        await runHazardCli(rawArgs.slice(1));
        return;
    }

    // Subcommand: `npm run game -- labyrinth [flags]` hands off to THE
    // APORIA driver (W-01) — the full labyrinth continent, headless.
    if (rawArgs[0] === 'labyrinth') {
        const { runLabyrinthCli } = await import('./labyrinth.cli');
        await runLabyrinthCli(rawArgs.slice(1));
        return;
    }

    const flags = parseArgv(rawArgs);
    if (flags.jsonEvents) setOutputMode('json');
    attachCliLogSinks(flags);
    if (flags.scriptPath) {
        const raw = fs.readFileSync(flags.scriptPath, 'utf-8');
        const answers = JSON.parse(raw);
        if (!Array.isArray(answers)) {
            throw new Error('--script JSON must be a top-level array of answer objects.');
        }
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }
    if (flags.stateLogPath) {
        setStateLogPath(flags.stateLogPath);
    }

    log('Miserere Mei, Deus — game loop demo.\n');

    // The Save / Load tabs use a dedicated snapshot adapter pointed at
    // the user-supplied --save-file path. The store itself uses
    // nullAdapter so dispatch-time autosaves don't overwrite an explicit
    // snapshot between Save and Load tabs (this is what makes Load a
    // meaningful rollback rather than a re-read of the latest dispatch).
    const snapshotAdapter: PersistenceAdapter | null = flags.saveFile
        ? createNodeAdapter(flags.saveFile)
        : null;

    // --fixture: boot from a declarative state fixture (registry id or JSON
    // path). `list` prints the registry and exits. A fixture's `arrive`
    // intent maps onto `--resolve-start` so a `--route` run fires the
    // current node's event before walking, same as the mobile boot hook.
    let initial: GameState | undefined;
    if (flags.fixture === FIXTURE_LIST_REF) {
        log(`State fixtures:\n${describeFixtures()}`);
        emit({ type: 'cli:exit', payload: { reason: 'fixture-list' } });
        return;
    }
    if (flags.fixture !== undefined) {
        const fixture = resolveStateFixture(flags.fixture);
        if (fixture.arrive) flags.resolveStart = true;
        initial = buildStateFromFixture(fixture);
    }

    let startMap: MapName | undefined;
    if (flags.startMap !== undefined) {
        if (!STARTABLE_MAPS.includes(flags.startMap as MapName)) {
            throw new Error(`--start-map: unknown map '${flags.startMap}'. Startable maps: ${STARTABLE_MAPS.join(', ')}`);
        }
        startMap = flags.startMap as MapName;
    }

    const store = await bootstrapStore(nullAdapter, initial, startMap);

    if (flags.route && flags.route.length > 0) {
        await runScriptedRoute(store, flags);
        return;
    }

    if (flags.routeAudit) {
        await runRouteAudit(store, flags.routeAudit);
        return;
    }

    try {
        while (true) {
            const tab = await pickTab();
            switch (tab) {
                case 'map':       await mapTab(store, flags);                  break;
                case 'journal':   journalTab(store);                         break;
                case 'cards':    cardsTab(store);                          break;
                case 'codex':     codexTab(store);                           break;
                case 'inventory': inventoryTab(store);                       break;
                case 'character': await characterTab(store);                 break;
                case 'dev':       await devTab(store);                       break;
                case 'reset':     await resetTab(store);                     break;
                case 'save':      saveTab(store, snapshotAdapter);           break;
                case 'load':      loadTab(store, snapshotAdapter);           break;
                case 'quit':
                    log('Goodbye.');
                    emit({ type: 'cli:exit', payload: { reason: 'quit' } });
                    return;
            }
        }
    } catch (err) {
        emit({ type: 'cli:exit', payload: { reason: 'error', message: String(err) } });
        throw err;
    }
}

if (require.main === module) {
    runGameCli().catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exitCode = 1;
    });
}
