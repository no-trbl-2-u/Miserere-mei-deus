#!/usr/bin/env node

/**
 * Labyrinth CLI — THE APORIA (W-01), playable headless.
 *
 * `npm run game -- labyrinth [flags]` / `npm run labyrinth`. Drives the
 * whole continent without the UI: per room it prints the display number,
 * the Sophist's narration, the doors and POIs; the player walks doors
 * (first arrival rolls the act's event pool — combat auto-resolves via
 * the Hazard-Pattern driver), inspects POIs (fragments, secret doors),
 * answers gates, buys hints, settles debt at the Study, and faces the
 * act bosses. Honors the standard agent flags (`--script`, `--stdin`,
 * `--json-events`, `--state-log`).
 *
 * Flags beyond the shared set:
 *   --act <act1|act2|act3>   start act (default act1)
 *   --level <n>              player level (default 14 — late-game content)
 *   --preset <id>            combat preset (default kid-l15; see Character presets)
 *
 * Logic lives in `World/Labyrinth` + the world reducer; this file only
 * formats, prompts, and dispatches.
 */

import { parseArgv, prompt, emit, log, logState, setIoMode, setOutputMode, setStateLogPath, type CliFlags } from './io';
import { createCharacter } from '../Character';
import { createGameStore } from '../Game/store';
import { createEventEmitter } from '../Game/events';
import { nullAdapter } from '../Game/persistence/null.adapter';
import { devSetLevel } from './dev-tools';
import { getMapDefinition, createMapState } from '../World/map.registry';
import { resolveMapEvent, settleArrival } from '../World';
import { moveToNode, unblockMapRoute, teleportToNode } from '../World/world.reducer';
import type { ResolvedEvent } from '../World/MapEvents/types';
import type { WorldState } from '../World/types';
import {
    APORIA_ACTS, getAporiaAct,
} from '../World/Labyrinth/maps';
import {
    createLabyrinthProgress, visibleDoors, inspectPoi, submitGateAnswer,
    preConfirmedWords, buyHint, hintPrice, debtPoints, borrowedPremiseStacks,
    settleDebt, activateWaystone, lastWaystone, namingForkOpen,
    recordBossOutcome, getRoom, edgeKey, recordWalk, isSophistTrueName,
    SETTLE_PRICE_PER_POINT,
} from '../World/Labyrinth/labyrinth.engine';
import { resolvePoiTrap } from '../World/Labyrinth/labyrinth.pools';
import type { LabyrinthActDef, LabyrinthActId, LabyrinthProgress } from '../World/Labyrinth/types';
import { runHazardCombatCliEncounter, type CombatAutoPolicyId } from './combat.cli';
import type { CombatOutcome } from '../Combat/combat.encounter.types';

type StoreHandle = ReturnType<typeof createGameStore>;

/** The Sophist's real name — the finale mercy key (C-01). */
const THE_NAME = 'PROTAS';

function labyrinthWorld(act: LabyrinthActDef): WorldState {
    const def = getMapDefinition('labyrinth-continent', act.mapName);
    return {
        world: [],
        currentContinent: {
            name: 'labyrinth-continent',
            description: 'THE APORIA — a building in the shape of a country.',
            availableMaps: [act.mapName],
            lockedMaps: APORIA_ACTS.filter(a => a.id !== act.id).map(a => a.mapName),
            completedMaps: [],
        },
        currentMap: createMapState(def),
    };
}

function getProgress(store: StoreHandle): LabyrinthProgress {
    return store.getState().labyrinth ?? createLabyrinthProgress();
}

function setProgress(store: StoreHandle, progress: LabyrinthProgress): void {
    store.setState({ labyrinth: progress });
}

function asCombatPolicy(value: string | undefined): CombatAutoPolicyId {
    if (value === 'naive' || value === 'safe' || value === 'aggressive' || value === 'status') return value;
    return 'status';
}

function describeEvent(event: ResolvedEvent): string {
    switch (event.kind) {
        case 'encounter':   return `Something is here: ${event.encounter.enemies.map(e => e.name).join(', ')}${event.isBoss ? ' (a warden of the house)' : ''}.`;
        case 'hazard':      return `The building fights you. (-${event.damage} VITAE${event.effects.length > 0 ? `, ${event.effects.length} effect${event.effects.length === 1 ? '' : 's'}` : ''})`;
        case 'loot-cache':  return `A cache: ${event.items.length} item${event.items.length === 1 ? '' : 's'}, ${event.currency} shillings.`;
        case 'rest':        return `You rest. (+${event.healed} VITAE)`;
        case 'cutscene':    return `The Sophist: "${event.lines.join(' ')}"`;
        case 'none':        return 'The room is solved. Nothing stirs.';
        default:            return 'Something happens that the deep house declines to explain.';
    }
}

/** Arrive at the current node: roll its first-arrival event and apply
 *  labyrinth arrival rules (waystones, ejection, boss combat). Returns
 *  the combat outcome when the event was an encounter. */
async function arrive(
    store: StoreHandle,
    act: LabyrinthActDef,
    flags: CliFlags,
    presetId: string,
): Promise<{ event: ResolvedEvent; combatOutcome: CombatOutcome | null }> {
    const nodeId = store.getState().world.currentMap.currentNode;
    const room = getRoom(act, nodeId);

    // Waystones activate before anything else (free, automatic).
    if (room.waystone) {
        const progress = activateWaystone(getProgress(store), nodeId);
        if (progress !== getProgress(store)) {
            setProgress(store, progress);
            log('The stone takes your hand. The house will hold your place here.');
        }
    }

    const before = store.getState();
    const result = resolveMapEvent(before);
    store.setState({
        player: result.state.player,
        world: result.state.world,
        quests: result.state.quests,
        flags: result.state.flags,
    });
    logState('labyrinth:resolveMapEvent', before, store.getState(), { nodeId, event: result.event });
    log(describeEvent(result.event));

    let combatOutcome: CombatOutcome | null = null;
    if (result.event.kind === 'encounter') {
        const enemy = result.event.encounter.enemies[0];
        if (!enemy) throw new Error(`Encounter at '${nodeId}' had no enemy.`);
        if (result.event.isBoss) {
            const stacks = borrowedPremiseStacks(getProgress(store));
            if (stacks > 0) {
                log(`Borrowed Premise x${stacks} — your purchased certainty fights for the house.`);
            }
        }
        const combat = await runHazardCombatCliEncounter({
            enemy,
            presetId,
            seed: flags.combatSeed,
            auto: true,
            policy: asCombatPolicy(flags.combatPolicy),
            maxTurns: flags.combatMaxTurns ?? 30,
        });
        combatOutcome = combat.outcome;
        // The fight ran outside the store: settle the room here, as
        // `END_COMBAT` does in the store.
        store.setState({ world: settleArrival(store.getState()).world });
    }

    // The Oubliette: after its lesson, the house returns you.
    if (room.eject) {
        const back = lastWaystone(act, getProgress(store));
        const before2 = store.getState();
        store.setState({ world: teleportToNode(before2.world, back) });
        logState('labyrinth:eject', before2, store.getState(), { from: nodeId, to: back });
        log(`Up you go. The house returns you to the stone at ${getRoom(act, back).display}. "The chair fit. Remember that it fit."`);
    }

    return { event: result.event, combatOutcome };
}

function printRoom(store: StoreHandle, act: LabyrinthActDef): void {
    const state = store.getState();
    const nodeId = state.world.currentMap.currentNode;
    const room = getRoom(act, nodeId);
    const progress = getProgress(store);

    log(`\n=== ${room.display} — ${room.name} ===`);
    log(room.scene);
    log(`\nThe Sophist: "${room.narration}"`);

    const doors = visibleDoors(act, progress, nodeId);
    log(`\nDoors: ${doors.map(d => `${d.display}${d.gated ? ' (sealed — SAY THE ROAD)' : ''}`).join(', ') || '(none)'}`);
    log(`Points of interest: ${room.pois.map(p => p.label).join(', ') || '(none)'}`);
}

async function gatePrompt(store: StoreHandle, act: LabyrinthActDef, roomId: string): Promise<void> {
    const gate = act.gates.find(g => g.roomId === roomId);
    if (!gate) { log('No gate asks its question here.'); return; }
    const progress = getProgress(store);
    if (progress.openGates.includes(edgeKey(gate.roomId, gate.to))) {
        log('The way is already open.');
        return;
    }
    const pre = preConfirmedWords(APORIA_ACTS, progress, gate);
    if (pre.length > 0) {
        log(`The house remembers your assents. ${pre.length} beds are made: ${pre.join(' ')}`);
        log(`Lay the remaining ${gate.answer.length - pre.length} words.`);
    }
    log(`The gate asks: ${gate.riddle}`);
    log(`Pocket: ${progress.pocket.map(f => f.word).join(', ') || '(empty)'}`);

    const { answer } = await prompt<{ answer: string }>([{
        type: 'input', name: 'answer',
        message: `Lay the words in walking order (space-separated${pre.length > 0 ? ', the remembered words first are optional' : ''}):`,
    }]);
    let words = answer.trim().toUpperCase().split(/\s+/).filter(w => w.length > 0);
    // Convenience: accept either the full sequence or just the live tail
    // after the pre-confirmed words.
    if (pre.length > 0 && words.length === gate.answer.length - pre.length) {
        words = [...pre, ...words];
    }
    const result = submitGateAnswer(act, getProgress(store), roomId, words);
    setProgress(store, result.progress);
    log(`The Sophist: "${result.line}"`);
    if (result.ok) {
        const before = store.getState();
        store.setState({
            world: {
                ...before.world,
                currentMap: unblockMapRoute(before.world.currentMap, gate.roomId, gate.to),
            },
        });
        logState('labyrinth:gateOpen', before, store.getState(), { gate: edgeKey(gate.roomId, gate.to) });
    } else {
        log('(The refusal is entered in the Ledger of Assertions.)');
    }
}

/** The act's boss room: acts I-II fight straight away; the finale
 *  (act III) first shows the debt reckoning and offers the naming fork
 *  (ADR-0007: the fork rides the standard Befriend mercy path — the CLI
 *  surfaces it as the pre-fight rite for the headless driver). */
async function bossRoomSequence(
    store: StoreHandle,
    act: LabyrinthActDef,
    flags: CliFlags,
    presetId: string,
): Promise<'won' | 'lost'> {
    if (act.descent === 'exit') {
        const progress = getProgress(store);
        const stacks = borrowedPremiseStacks(progress);
        log(`\nThe Sophist stands between you and a doorway full of weather from somewhere else.`);
        log(`Borrowed Premise x${stacks} (debt ${debtPoints(progress)} — hints and ledgered assertions).`);

        if (namingForkOpen(progress)) {
            const { naming } = await prompt<{ naming: string }>([{
                type: 'input', name: 'naming',
                message: 'There is a third way, if you kept your receipts. Speak a name, or press enter to fight:',
            }]);
            const spoken = (naming ?? '').trim().toUpperCase();
            if (isSophistTrueName(spoken)) {
                setProgress(store, recordBossOutcome(getProgress(store), act.id, 'spared'));
                log(`\nThe Sophist: "...So. The asker, again. Very well — ${THE_NAME} stands aside."`);
                log('He gives you his last true sentence about the far country, and it is kind.');
                return 'won';
            }
            if (spoken.length > 0) {
                log('The Sophist: "No. That is furniture. En garde."');
            }
        } else {
            log('The Sophist: "I do not take my name from that mouth." The naming is closed.');
        }
    }

    const { combatOutcome } = await arrive(store, act, flags, presetId);
    if (combatOutcome === 'defeat') return 'lost';
    // A befriend (the mercy outcome) in the boss fight IS the mercy fork.
    const outcome = combatOutcome === 'mercy' ? 'spared' : 'slain';
    setProgress(store, recordBossOutcome(getProgress(store), act.id, outcome));
    return 'won';
}

async function enterAct(store: StoreHandle, actId: LabyrinthActId): Promise<LabyrinthActDef> {
    const act = getAporiaAct(actId);
    const before = store.getState();
    store.setState({
        world: labyrinthWorld(act),
        labyrinth: { ...getProgress(store), currentAct: actId },
    });
    logState('labyrinth:enterAct', before, store.getState(), { act: actId });
    log(`\n#### THE APORIA — ${act.title} ####`);
    log(`The house asks, and will ask again below: ${act.riddle}`);
    return act;
}

export async function runLabyrinthCli(rawArgs = process.argv.slice(2)): Promise<void> {
    // Extract the labyrinth-only flags (--act, --level) before handing the
    // remainder to the shared parser.
    const shared: string[] = [];
    let actArg: string | undefined;
    let levelArg: string | undefined;
    let presetArg: string | undefined;
    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg === '--act') { actArg = rawArgs[++i]; continue; }
        if (arg.startsWith('--act=')) { actArg = arg.slice('--act='.length); continue; }
        if (arg === '--level') { levelArg = rawArgs[++i]; continue; }
        if (arg.startsWith('--level=')) { levelArg = arg.slice('--level='.length); continue; }
        if (arg === '--preset') { presetArg = rawArgs[++i]; continue; }
        if (arg.startsWith('--preset=')) { presetArg = arg.slice('--preset='.length); continue; }
        shared.push(arg);
    }
    const flags = parseArgv(shared);
    const startAct: LabyrinthActId =
        actArg === 'act2' || actArg === 'act3' ? actArg : 'act1';

    if (flags.jsonEvents) setOutputMode('json');
    if (flags.scriptPath) {
        const fs = await import('fs');
        const answers = JSON.parse(fs.readFileSync(flags.scriptPath, 'utf-8'));
        if (!Array.isArray(answers)) throw new Error('--script JSON must be a top-level array.');
        setIoMode({ kind: 'script', answers });
    } else if (flags.stdin) {
        setIoMode({ kind: 'stdin' });
    }
    if (flags.stateLogPath) setStateLogPath(flags.stateLogPath);

    const events = createEventEmitter();
    events.onAny(emit);
    const player = createCharacter({
        name: 'Walker',
        level: 1,
        baseStats: { heart: 6, body: 6, mind: 6 },
    });
    const store = createGameStore(nullAdapter, { player }, events);
    const level = Number.isFinite(Number(levelArg)) && Number(levelArg) > 0 ? Number(levelArg) : 14;
    // Late-game continent: the level-ladder combat preset (not the fresh
    // apprentice) is the intended loadout; override with --preset.
    const presetId = presetArg ?? 'kid-l15';
    devSetLevel(store, level);
    log(`\nTHE APORIA. Walker at level ${level}. This is not really a place; it is an argument you walk.`);

    let act = await enterAct(store, startAct);
    await arrive(store, act, flags, presetId);

    while (true) {
        printRoom(store, act);
        const state = store.getState();
        const nodeId = state.world.currentMap.currentNode;
        const room = getRoom(act, nodeId);
        const progress = getProgress(store);
        const doors = visibleDoors(act, progress, nodeId);

        // The boss room plays out immediately — there is nothing else in it.
        if (nodeId === act.bossRoom) {
            const outcome = await bossRoomSequence(store, act, flags, presetId);
            if (outcome === 'lost') {
                log('\nYou are defeated. The house keeps what it digests. (Normal game-over flow.)');
                emit({ type: 'cli:exit', payload: { reason: 'defeat', act: act.id } });
                return;
            }
            if (act.descent === 'exit') {
                setProgress(store, { ...getProgress(store), completed: true });
                log('\nThe Unfounded Door was never locked. You walk through, onto the last continent.');
                log('The Sophist, behind you: "Mind the first step. There is no first step."');
                emit({ type: 'cli:exit', payload: { reason: 'labyrinth-complete', debt: debtPoints(getProgress(store)) } });
                return;
            }
            log('\nA descent opens where the altar stood. Down, then.');
            act = await enterAct(store, act.descent);
            await arrive(store, act, flags, presetId);
            continue;
        }

        type Action =
            | { kind: 'go'; to: string }
            | { kind: 'look'; poiId: string }
            | { kind: 'answer' }
            | { kind: 'pocket' }
            | { kind: 'hint' }
            | { kind: 'settle' }
            | { kind: 'status' }
            | { kind: 'quit' };

        const choices: Array<{ name: string; value: Action }> = [
            ...doors.map(d => ({
                name: `go ${d.display}${d.gated ? ' (sealed)' : ''}`,
                value: { kind: 'go', to: d.to } as Action,
            })),
            ...room.pois.map(p => ({
                name: `look: ${p.label}`,
                value: { kind: 'look', poiId: p.id } as Action,
            })),
            ...(act.gates.some(g => g.roomId === nodeId)
                ? [{ name: 'answer the gate', value: { kind: 'answer' } as Action }]
                : []),
            ...(nodeId === act.questRoom && act.id === 'act3'
                ? [{ name: 'settle debt (the Fourth Ledger)', value: { kind: 'settle' } as Action }]
                : []),
            { name: 'pocket (fragments held)', value: { kind: 'pocket' } },
            { name: 'ask the Sophist (hints)', value: { kind: 'hint' } },
            { name: 'status', value: { kind: 'status' } },
            { name: 'quit', value: { kind: 'quit' } },
        ];

        const { action } = await prompt<{ action: Action }>([{
            type: 'rawlist', name: 'action', message: 'What do you do?', choices,
        }]);

        switch (action.kind) {
            case 'go': {
                const door = doors.find(d => d.to === action.to);
                if (!door) { log('No such door.'); break; }
                if (door.gated) {
                    log('The door has no doubt. SAY THE ROAD — answer the gate first.');
                    break;
                }
                const before = store.getState();
                store.setState({
                    world: moveToNode(before.world, action.to),
                    labyrinth: recordWalk(getProgress(store), nodeId, action.to),
                });
                logState('labyrinth:move', before, store.getState(), { to: action.to });
                // The boss room's arrival is owned by bossRoomSequence at the
                // top of the loop (the finale's naming rite must come first).
                if (action.to === act.bossRoom) break;
                const { combatOutcome } = await arrive(store, act, flags, presetId);
                if (combatOutcome === 'defeat') {
                    log('\nYou are defeated. (Normal game-over flow.)');
                    emit({ type: 'cli:exit', payload: { reason: 'defeat', act: act.id } });
                    return;
                }
                break;
            }
            case 'look': {
                const result = inspectPoi(act, getProgress(store), nodeId, action.poiId);
                setProgress(store, result.progress);
                log(`The Sophist: "${result.remark}"`);
                if (result.fragment) {
                    log(`You take the word: ${result.fragment.word}.`);
                }
                if (result.revealedDoorTo) {
                    const before = store.getState();
                    store.setState({
                        world: {
                            ...before.world,
                            currentMap: unblockMapRoute(before.world.currentMap, nodeId, result.revealedDoorTo),
                        },
                    });
                    logState('labyrinth:secretRevealed', before, store.getState(), { from: nodeId, to: result.revealedDoorTo });
                    log(`A door that was not there is there. It leads to ${getRoom(act, result.revealedDoorTo).display}.`);
                }
                // Baited clues (one-shot, first inspection only): resolve
                // through the standard MapEvents dispatch; combat runs the
                // same encounter driver as arrivals.
                if (result.trap) {
                    const before = store.getState();
                    const sprung = resolvePoiTrap(before, act, result.trap);
                    store.setState({
                        player: sprung.state.player,
                        world: sprung.state.world,
                        quests: sprung.state.quests,
                        flags: sprung.state.flags,
                    });
                    logState('labyrinth:poiTrap', before, store.getState(), { nodeId, poiId: action.poiId, event: sprung.event });
                    log(describeEvent(sprung.event));
                    if (sprung.event.kind === 'encounter') {
                        const enemy = sprung.event.encounter.enemies[0];
                        if (!enemy) throw new Error(`POI trap at '${nodeId}' had no enemy.`);
                        const combat = await runHazardCombatCliEncounter({
                            enemy,
                            presetId,
                            seed: flags.combatSeed,
                            auto: true,
                            policy: asCombatPolicy(flags.combatPolicy),
                            maxTurns: flags.combatMaxTurns ?? 30,
                        });
                        if (combat.outcome === 'defeat') {
                            log('\nYou are defeated. (Normal game-over flow.)');
                            emit({ type: 'cli:exit', payload: { reason: 'defeat', act: act.id } });
                            return;
                        }
                    }
                }
                break;
            }
            case 'answer':
                await gatePrompt(store, act, nodeId);
                break;
            case 'pocket': {
                const p = getProgress(store);
                if (p.pocket.length === 0) { log('Your pocket is empty of words.'); break; }
                for (const f of p.pocket) {
                    log(`  ${f.word}  (found in ${getRoom(act, f.sourceNodeId)?.display ?? f.sourceNodeId})`);
                }
                break;
            }
            case 'hint': {
                const p = getProgress(store);
                const currency = store.getState().player.currency;
                const { tier } = await prompt<{ tier: '1' | '2' | '3' | '0' }>([{
                    type: 'rawlist', name: 'tier', message: `The Sophist charges. (You hold ${currency} shillings.)`,
                    choices: [
                        { name: `A Nudge — ${hintPrice(p, 1)} shillings`, value: '1' },
                        { name: `A Reading — ${hintPrice(p, 2)} shillings`, value: '2' },
                        { name: `A Conclusion — ${hintPrice(p, 3)} shillings`, value: '3' },
                        { name: 'never mind', value: '0' },
                    ],
                }]);
                if (tier === '0') break;
                const t = Number(tier) as 1 | 2 | 3;
                const price = hintPrice(p, t);
                if (currency < price) {
                    log(`The Sophist: "Credit is a premise I no longer extend." (${price} shillings needed.)`);
                    break;
                }
                const before = store.getState();
                const result = buyHint(act, p, nodeId, t);
                setProgress(store, result.progress);
                store.setState({ player: { ...before.player, currency: currency - price } });
                logState('labyrinth:hint', before, store.getState(), { tier: t, price });
                log(`The Sophist: "${result.line}"`);
                break;
            }
            case 'settle': {
                const p = getProgress(store);
                const outstanding = debtPoints(p);
                if (outstanding === 0) { log('The Sophist: "Nothing owed. How unlike a visitor."'); break; }
                const pricePerPoint = SETTLE_PRICE_PER_POINT;
                const currency = store.getState().player.currency;
                const affordable = Math.min(outstanding, Math.floor(currency / pricePerPoint));
                if (affordable === 0) { log(`Settling costs ${pricePerPoint} shillings a point. You cannot afford one.`); break; }
                const { points } = await prompt<{ points: number }>([{
                    type: 'number', name: 'points',
                    message: `Settle how many debt points? (${outstanding} owed, ${pricePerPoint} shillings each, ${affordable} affordable)`,
                    default: affordable,
                }]);
                const settle = Math.max(0, Math.min(points, affordable));
                if (settle === 0) break;
                const before = store.getState();
                setProgress(store, settleDebt(p, settle));
                store.setState({ player: { ...before.player, currency: currency - settle * pricePerPoint } });
                logState('labyrinth:settle', before, store.getState(), { points: settle });
                log(`The Sophist: "Paid in part, the house accepts. It knows how arguments end." (debt ${debtPoints(getProgress(store))})`);
                break;
            }
            case 'status': {
                const p = getProgress(store);
                const s = store.getState();
                log(`Act: ${act.title}. Room: ${room.display} (${room.name}).`);
                log(`VITAE ${s.player.health}/${s.player.maxHealth}. Shillings ${s.player.currency}.`);
                log(`Debt ${debtPoints(p)} (Borrowed Premise x${borrowedPremiseStacks(p)}). Waystone: ${p.waystones.length > 0 ? getRoom(act, lastWaystone(act, p)).display : '(none this act)'}.`);
                break;
            }
            case 'quit':
                log('You stop walking. The house does not mind. It has time.');
                emit({ type: 'cli:exit', payload: { reason: 'quit' } });
                return;
        }
    }
}

if (require.main === module) {
    runLabyrinthCli().catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exitCode = 1;
    });
}
