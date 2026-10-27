/**
 * Node blurb ↔ event copy guard (phase AW1b, A8–A9).
 *
 * A map node's `label` and `description` live in the mobile layout; the event
 * the node opens lives in the engine's pool. Nothing tied the two, so a node
 * could promise a chapel and open a purse in the netting. This guard pairs
 * every Act 1 node whose event carries copy of its own (a payload
 * `description`, a cutscene's `lines`) with its blurb, and asks only that the
 * two share one content word: it catches a wholesale mismatch, it does not
 * judge tone.
 *
 * Today's mismatches are map copy, which is T's (content per surface), so
 * they are pinned rather than fixed: each pin names its `[content]` row in
 * `plan/AUDIT.md`, which this guard reads to prove the row exists. An
 * unpinned mismatch fails, and so does a pin that now matches.
 *
 * Hazard nodes are held apart: their board is drawn at random, so no blurb
 * can match it until each node is given one puzzle.
 */

import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import * as path from 'path';
import { getNodeEventPool, getNodePrimaryEventKind } from '@mechanics';
import { getMapLayout } from '../index';
import type { NodeLayout } from '../types';

const MAPS = [
    { mapId: 'breakwater', continent: 'coastal-continent' },
    { mapId: 'charcoal-wood', continent: 'coastal-continent' },
    { mapId: 'beacon-crags', continent: 'northern-continent' },
    { mapId: 'lantern-deep', continent: 'northern-continent' },
] as const;

const AUDIT_ROW = {
    breakwater: 'map copy: Breakwater node blurbs that do not match their events (AW1b, 2026-10-26)',
    charcoalWood: 'map copy: Charcoal Wood node blurb that does not match its event (AW1b, 2026-10-26)',
    beaconCrags: 'map copy: Beacon Crags node blurb that does not match its event (AW1b, 2026-10-26)',
} as const;

/** Node id → the `plan/AUDIT.md` `[content]` row (heading text) that files it for T. */
const PINNED_MISMATCHES: Readonly<Record<string, string>> = {
    'bw-5':  AUDIT_ROW.breakwater,
    'bw-15': AUDIT_ROW.breakwater,
    'bw-16': AUDIT_ROW.breakwater,
    'cw-18': AUDIT_ROW.charcoalWood,
    'bc-12': AUDIT_ROW.beaconCrags,
};

/** The hazard nodes, unpairable while their board is drawn at random. */
const UNPAIRABLE_HAZARD_NODES: readonly string[] = [
    'bc-3', 'bc-9', 'bw-3', 'cw-3', 'ld-4', 'ld-9',
];

const STOP_WORDS: ReadonlySet<string> = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'not', 'no', 'nor',
    'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'into', 'over', 'under',
    'up', 'down', 'out', 'off', 'as', 'than', 'so', 'yet', 'still',
    'is', 'are', 'was', 'be', 'has', 'have', 'it', 'its', 'this', 'that', 'there', 'here',
    'you', 'your', 'he', 'his', 'her', 'they', 'them', 'their', 'who', 'what',
    'one', 'someone', 'something', 'somebody', 'nobody', 'every', 'all',
]);

/**
 * Content words of a text: case folded, split on anything but letters
 * (apostrophes dropped), stop words dropped, then a trailing plural `s` removed.
 */
function contentWords(text: string): Set<string> {
    const words = new Set<string>();
    for (const raw of text.toLowerCase().replace(/['’]/g, '').split(/[^a-z]+/)) {
        if (!raw || STOP_WORDS.has(raw)) continue;
        const word = raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw;
        if (!STOP_WORDS.has(word)) words.add(word);
    }
    return words;
}

/** The content words a node's blurb shares with its event copy, sorted. */
function sharedWords(node: Pick<NodeLayout, 'label' | 'description'>, eventCopy: string): string[] {
    const blurb = contentWords(`${node.label} ${node.description}`);
    return [...contentWords(eventCopy)].filter(w => blurb.has(w)).sort();
}

interface NodePair { nodeId: string; kind: string | undefined; blurb: NodeLayout; eventCopy: string }

/** Every Act 1 node with its event kind and the copy its event carries ('' for none). */
function act1NodePairs(): NodePair[] {
    const pairs: NodePair[] = [];
    for (const { mapId, continent } of MAPS) {
        for (const node of getMapLayout(mapId)?.nodes ?? []) {
            const payload = getNodeEventPool(continent, mapId, node.id)?.entries[0]?.payload as
                { description?: string; lines?: readonly string[] } | undefined;
            const eventCopy = [payload?.description ?? '', ...(payload?.lines ?? [])].join(' ').trim();
            pairs.push({
                nodeId: node.id,
                kind: getNodePrimaryEventKind(continent, mapId, node.id),
                blurb: node,
                eventCopy,
            });
        }
    }
    return pairs;
}

const PAIRS = act1NodePairs();
const PAIRED = PAIRS.filter(p => p.kind !== 'hazard' && p.eventCopy !== '');

describe('node blurb ↔ event copy: the shared-word check', () => {
    it('passes a blurb that shares a content word with its event', () => {
        expect(sharedWords(
            { label: 'The Hunting Lodge', description: 'Shut for the season.' },
            'The hunting lodge is shut for the season.',
        )).toEqual(['hunting', 'lodge', 'season', 'shut']);
    });

    it('fails a seeded mismatch: a chapel blurb over a purse in the netting', () => {
        expect(sharedWords(
            { label: 'The Quiet Chapel', description: 'An empty nave over the sea.' },
            'A purse of coins snagged in the netting, long gone.',
        )).toEqual([]);
    });

    it('folds case, drops apostrophes and a trailing plural s, and skips stop words', () => {
        expect([...contentWords("The Smugglers’ Coves under it")]).toEqual(['smuggler', 'cove']);
    });
});

describe('node blurb ↔ event copy: the four Act 1 maps', () => {
    it('pairs a node set that is not empty (the layouts and pools are loaded)', () => {
        expect(PAIRS.length).toBeGreaterThan(60);
        expect(PAIRED.length).toBeGreaterThan(30);
    });

    it('every paired node shares a content word with its event, or is pinned for T', () => {
        const unpinned = PAIRED
            .filter(p => sharedWords(p.blurb, p.eventCopy).length === 0 && !(p.nodeId in PINNED_MISMATCHES))
            .map(p => `${p.nodeId} "${p.blurb.label}: ${p.blurb.description}" vs "${p.eventCopy}"`);
        expect(unpinned).toEqual([]);
    });

    it('no pin is stale: every pinned node is still paired and still mismatched', () => {
        const stale = Object.keys(PINNED_MISMATCHES).filter(id => {
            const pair = PAIRED.find(p => p.nodeId === id);
            return !pair || sharedWords(pair.blurb, pair.eventCopy).length > 0;
        });
        expect(stale).toEqual([]);
    });

    it('every pin names a [content] row present in plan/AUDIT.md', () => {
        const audit = readFileSync(path.resolve(__dirname, '../../../../plan/AUDIT.md'), 'utf8');
        const missing = [...new Set(Object.values(PINNED_MISMATCHES))]
            .filter(row => !audit.includes(`### [content] ${row}`));
        expect(missing).toEqual([]);
    });

    it('holds the hazard nodes apart, and the set changes only with this list', () => {
        const hazards = PAIRS.filter(p => p.kind === 'hazard').map(p => p.nodeId).sort();
        expect(hazards).toEqual([...UNPAIRABLE_HAZARD_NODES].sort());
    });
});
