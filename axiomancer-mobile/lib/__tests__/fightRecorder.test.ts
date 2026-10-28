/**
 * The fight recorder (phase BE2c, A6): a real fight, staged through
 * `beginHazardEncounter` and played on the engine the panel drives, is
 * stamped as it goes and posted once at its end as a `FightPost` the
 * Worker's validator accepts. A failed post only warns; a shut gate makes no
 * call. The app's bridges start the recording and end a WITHDRAWN fight.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    endTurn,
    PLAY_LOG_FIGHTS_PATH,
    resolveThreatPhase,
    rollEncounterDice,
    startTurn,
    validateFightPost,
    type CombatEncounterState,
    type FightPost,
    type PlayLogSource,
} from '@mechanics';

import { isDevToolsEnabled } from '@/lib/buildProfile';
import { createFightRecorder, endCombatOutcome, fightRecorder, type FightRecorderDeps } from '@/lib/fightRecorder';
import type { PuzzleApiConfig, PuzzleFetch } from '@/lib/puzzleAttempts';
import { ENCOUNTER_ENEMY_HP_MULTIPLIER } from '@/state/actions';
import { arriveAtRealFight, startRealFight } from '@/test-utils/realFight';

jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: jest.fn(() => true),
    getBuildProfile: jest.fn(() => 'preview'),
    getBuildCommit: jest.fn(() => 'abc1234'),
}));

const devTools = isDevToolsEnabled as unknown as jest.Mock<() => boolean>;

const CONFIG: PuzzleApiConfig = { url: 'https://miserere-api.example.workers.dev', token: 'dev-token' };
const SOURCE: PlayLogSource = { solver: '', sessionId: 'session-1', buildCommit: 'abc1234', appBuild: '1.0.0 preview' };

type Call = { url: string; init: { method: string; headers: Record<string, string>; body: string } };

function mockFetch(ok = true): { fetcher: PuzzleFetch; calls: Call[] } {
    const calls: Call[] = [];
    const fetcher: PuzzleFetch = async (url, init) => {
        calls.push({ url, init });
        return { ok, status: ok ? 201 : 500 };
    };
    return { fetcher, calls };
}

/** A clock that moves 250ms on every read. */
function steppingClock(): () => number {
    let t = 1_000;
    return () => (t += 250);
}

function recorderWith(overrides: Partial<FightRecorderDeps> & { fetcher: PuzzleFetch }) {
    return createFightRecorder({ now: steppingClock(), config: () => CONFIG, source: () => SOURCE, ...overrides });
}

/** One player turn with no card played: close it, resolve the threat phase, roll the next tray. */
function passTurn(s: CombatEncounterState): CombatEncounterState {
    const t = resolveThreatPhase(endTurn(s).state);
    return t.state.phase === 'phase-play' && t.state.dice.length === 0 ? startTurn(t.state).state : t.state;
}

/** Plays the real bw-2 fight through to its end, feeding every state to `observe`. */
function playToTheEnd(observe: (s: CombatEncounterState) => void, combat: CombatEncounterState): CombatEncounterState[] {
    const states: CombatEncounterState[] = [combat];
    let s = rollEncounterDice(combat).state;
    states.push(s);
    for (let i = 0; i < 200 && !s.finalOutcome; i++) {
        s = passTurn(s);
        states.push(s);
    }
    states.forEach(observe);
    return states;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
    jest.restoreAllMocks();
});

describe('endCombatOutcome', () => {
    it('reads a befriending as mercy and a flee as retreat', () => {
        expect(endCombatOutcome('victory')).toBe('victory');
        expect(endCombatOutcome('defeat')).toBe('defeat');
        expect(endCombatOutcome('friendship')).toBe('mercy');
        expect(endCombatOutcome('flee')).toBe('retreat');
    });
});

describe('the recorder over a real fight', () => {
    it('posts once at the final outcome, with stamped events and the start deck', async () => {
        const { combat, enemy, store } = startRealFight();
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher });
        const player = store.getState().player;
        recorder.start({ enemyId: enemy.id, playerLevel: player.level, enemyHpMultiplier: 2, vitaeStart: player.health });

        const states = playToTheEnd((s) => recorder.observe(s), combat);
        const last = states[states.length - 1];
        expect(last.finalOutcome).not.toBeNull();
        // Fed again after the end (a re-render): nothing more is sent.
        recorder.observe(last);
        await recorder.end('retreat');
        await flush();

        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe(`${CONFIG.url}${PLAY_LOG_FIGHTS_PATH}`);
        expect(calls[0].init.headers.Authorization).toBe('Bearer dev-token');
        const post = JSON.parse(calls[0].init.body) as FightPost;
        expect(validateFightPost(post)).toMatchObject({ ok: true });

        expect(post).toMatchObject({ ...SOURCE, enemyId: enemy.id, playerLevel: player.level, enemyHpMultiplier: 2 });
        expect(post.outcome).toBe(last.finalOutcome);
        expect(post.deck).toEqual(combat.deck);
        expect(post.turns).toBe(last.turn);
        expect(post.vitaeStart).toBe(player.health);
        expect(post.vitaeEnd).toBe(last.player.health);
        expect(post.vitaeLow).toBe(Math.min(player.health, ...states.map((s) => s.player.health)));

        // The opening hand first (the engine deals it with no event), then every engine event, in order,
        // each stamped once; the stamps never go back.
        expect(post.events[0]).toMatchObject({ kind: 'hand-drawn', cards: combat.hand.map((h) => h.cardId), vitae: player.health });
        expect(combat.log.some((e) => e.kind === 'hand-drawn')).toBe(false);
        expect(post.events.slice(1).map((e) => e.kind)).toEqual(last.log.map((e) => e.kind));
        const ms = post.events.map((e) => e.ms);
        expect(ms.every((m, i) => i === 0 || m >= ms[i - 1])).toBe(true);
        expect(ms[ms.length - 1]).toBeGreaterThan(ms[0]);
        expect(post.events.every((e) => typeof e.vitae === 'number')).toBe(true);
    });

    it('ignores a fight it was not started for', async () => {
        const { combat } = startRealFight();
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher });
        recorder.start({ enemyId: 'some-other-foe', playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        playToTheEnd((s) => recorder.observe(s), combat);
        await flush();
        expect(calls).toHaveLength(0);
        expect(recorder.isRecording()).toBe(true);
    });

    it('a failed post only warns, and resolves false', async () => {
        const { combat, enemy } = startRealFight();
        const { fetcher, calls } = mockFetch(false);
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const recorder = recorderWith({ fetcher });
        recorder.start({ enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        recorder.observe(combat);
        await expect(recorder.end('retreat')).resolves.toBe(false);
        expect(calls).toHaveLength(1);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
        expect(recorder.isRecording()).toBe(false);
    });

    it('a fetch that throws only warns', async () => {
        const { combat, enemy } = startRealFight();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const recorder = recorderWith({ fetcher: async () => { throw new Error('offline'); } });
        recorder.start({ enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        recorder.observe(combat);
        await expect(recorder.end('retreat')).resolves.toBe(false);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
    });
});

describe('screen events (phase BE2d)', () => {
    it('join the open stream with the stamp and the VITAE last observed, in order', async () => {
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher });
        recorder.screen('ui-staged', 'grey-strike'); // nothing open: dropped
        recorder.start({ enemyId: 'foe', playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 40 });
        recorder.screen('ui-staged', 'grey-strike');
        recorder.screen('ui-unstaged', 'grey-strike');
        recorder.screen('ui-detail-opened', 'grey-ward');
        await recorder.end('retreat');

        expect(calls).toHaveLength(1);
        const post = JSON.parse(calls[0].init.body) as FightPost;
        expect(validateFightPost(post)).toMatchObject({ ok: true });
        expect(post.events).toEqual([
            { kind: 'ui-staged', cardId: 'grey-strike', ms: 250, vitae: 40 },
            { kind: 'ui-unstaged', cardId: 'grey-strike', ms: 500, vitae: 40 },
            { kind: 'ui-detail-opened', cardId: 'grey-ward', ms: 750, vitae: 40 },
        ]);
    });
});

describe('what was worn (phase LR1g, A19)', () => {
    it('posts the relics from start and the signatures from the first observed state, and a refused tap', async () => {
        const { combat, enemy } = startRealFight();
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher });
        recorder.signatureRefused('sig-bleeding-signet', 'Need 4 Conviction'); // nothing open: dropped
        recorder.start({
            enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10, relics: ['relic-bleeding-signet'],
        });
        recorder.observe({ ...combat, signatures: ['sig-bleeding-signet'] });
        recorder.signatureRefused('sig-bleeding-signet', 'Need 4 Conviction');
        await recorder.end('retreat');

        const post = JSON.parse(calls[0].init.body) as FightPost;
        expect(validateFightPost(post)).toMatchObject({ ok: true });
        expect(post.relics).toEqual(['relic-bleeding-signet']);
        expect(post.signatures).toEqual(['sig-bleeding-signet']);
        expect(post.events.filter((e) => e.kind === 'ui-signature-refused')).toEqual([
            { kind: 'ui-signature-refused', signatureId: 'sig-bleeding-signet', reason: 'Need 4 Conviction', ms: expect.any(Number), vitae: combat.player.health },
        ]);
    });

    it('wearing nothing posts empty lists', async () => {
        const { combat, enemy } = startRealFight();
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher });
        recorder.start({ enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        recorder.observe({ ...combat, signatures: [] });
        await recorder.end('retreat');
        expect(JSON.parse(calls[0].init.body)).toMatchObject({ relics: [], signatures: [] });
    });

    it('the app bridge fills the worn relics at the fight start', async () => {
        process.env.EXPO_PUBLIC_PUZZLE_API_URL = CONFIG.url;
        process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = CONFIG.token;
        devTools.mockReturnValue(true);
        const fetchSpy = jest.fn<PuzzleFetch>(async () => ({ ok: true, status: 201 }));
        (globalThis as { fetch: unknown }).fetch = fetchSpy;
        try {
            const arrival = arriveAtRealFight();
            const worn = arrival.store.getState().player.equipment;
            const ids = [worn.weapon, worn.armor, ...worn.relics].flatMap((p) => (p ? [p.id] : []));
            arrival.actions.beginHazardEncounter();
            arrival.actions.endCombat('flee');
            await flush();
            expect(JSON.parse(fetchSpy.mock.calls[0][1].body).relics).toEqual(ids);
        } finally {
            delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
            delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
            void fightRecorder.end('retreat');
        }
    });
});

describe('the gate', () => {
    it('shut at the start: nothing is recorded and no call is made', async () => {
        const { combat, enemy } = startRealFight();
        const { fetcher, calls } = mockFetch();
        const recorder = recorderWith({ fetcher, config: () => null });
        recorder.start({ enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        expect(recorder.isRecording()).toBe(false);
        playToTheEnd((s) => recorder.observe(s), combat);
        await expect(recorder.end('defeat')).resolves.toBe(false);
        expect(calls).toHaveLength(0);
    });

    it('shut by the end (the switch flipped mid-fight): no call is made', async () => {
        const { combat, enemy } = startRealFight();
        const { fetcher, calls } = mockFetch();
        let open = true;
        const recorder = recorderWith({ fetcher, config: () => (open ? CONFIG : null) });
        recorder.start({ enemyId: enemy.id, playerLevel: 1, enemyHpMultiplier: 2, vitaeStart: 10 });
        recorder.observe(combat);
        open = false;
        await expect(recorder.end('retreat')).resolves.toBe(false);
        expect(calls).toHaveLength(0);
    });
});

describe('the app bridges', () => {
    let fetchSpy: jest.Mock<PuzzleFetch>;

    beforeEach(() => {
        devTools.mockReturnValue(true);
        process.env.EXPO_PUBLIC_PUZZLE_API_URL = CONFIG.url;
        process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN = CONFIG.token;
        fetchSpy = jest.fn<PuzzleFetch>(async () => ({ ok: true, status: 201 }));
        (globalThis as { fetch: unknown }).fetch = fetchSpy;
    });

    afterEach(() => {
        delete process.env.EXPO_PUBLIC_PUZZLE_API_URL;
        delete process.env.EXPO_PUBLIC_PUZZLE_API_TOKEN;
        void fightRecorder.end('retreat');
    });

    it('beginHazardEncounter opens the recording; a WITHDRAW through endCombat posts it as a retreat', async () => {
        const arrival = arriveAtRealFight();
        const player = arrival.store.getState().player;
        const enemy = arrival.actions.beginHazardEncounter();
        expect(enemy).not.toBeNull();
        expect(fightRecorder.isRecording()).toBe(true);

        arrival.actions.endCombat('flee');
        await flush();

        expect(fightRecorder.isRecording()).toBe(false);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe(`${CONFIG.url}${PLAY_LOG_FIGHTS_PATH}`);
        const post = JSON.parse(init.body) as FightPost;
        expect(validateFightPost(post)).toMatchObject({ ok: true });
        expect(post).toMatchObject({
            enemyId: enemy!.id,
            playerLevel: player.level,
            enemyHpMultiplier: ENCOUNTER_ENEMY_HP_MULTIPLIER,
            outcome: 'retreat',
            vitaeStart: player.health,
            buildCommit: 'abc1234',
        });
    });

    it('with dev tools off, staging and ending a fight makes no call', async () => {
        devTools.mockReturnValue(false);
        const arrival = arriveAtRealFight();
        arrival.actions.beginHazardEncounter();
        expect(fightRecorder.isRecording()).toBe(false);
        arrival.actions.endCombat('flee');
        await flush();
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
