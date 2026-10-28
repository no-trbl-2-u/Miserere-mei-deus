/**
 * Run-loop semantics.
 *
 * The `resetRun` action on `createGameStore` lets a consumer rewind a
 * playthrough back to its starting hearth without quitting the session.
 * `keepCharacter: true` preserves the persistent character ledger (player +
 * rngState); run-scoped state (world / combat / quests / flags) resets and the
 * character's HP refills. `keepCharacter: false` performs a full new-game
 * reset. Every reset assigns a fresh `runId`.
 *
 * This module ships the small support surface:
 * - `generateRunId(rng)` — 16-char hex id from the supplied RNG (the
 *   character-id generation pattern; deterministic when seeded).
 * - `STARTING_REGION` — canonical starting region name; today only
 *   the new-game start is a viable run-start point (the Breakwater). The
 *   hearth concept reuses
 *   `MapDefinition.startingNode` — the engine routes the reset world through
 *   the existing `createStartingWorld()` helper, which lands on it.
 */

import type { MapName } from '../World/map.library';
import { STARTING_MAP } from '../World/starting-world';

/**
 * Canonical starting region for `resetRun`. The reset sends the
 * player back to `getMapDefinition('coastal-continent',
 * STARTING_REGION).startingNode.id`, the Breakwater's `bw-1`. One source:
 * `STARTING_MAP` in the World barrel, which `createStartingWorld()` uses.
 */
export const STARTING_REGION: MapName = STARTING_MAP;

/**
 * Produce a 16-char hex id string from the supplied RNG.
 *
 * Mirrors the `generateCharacterId` pattern (random-digit
 * accumulation) but emits 16 hex chars (64 bits of entropy) — collision-free
 * in the limit for the runs-history surface this id keys off. The supplied
 * `rng` is invoked 16 times; pass `() => getRng().random()` to consume the
 * global seeded RNG, or supply a fixed function for deterministic tests.
 *
 * The hex shape (`/^[0-9a-f]{16}$/`) is intentional: regex-checkable,
 * URL-safe, no `crypto` dependency (the engine ships into React Native and
 * the core barrel avoids Node-only imports).
 */
export function generateRunId(rng: () => number): string {
    return Array.from({ length: 16 }, () =>
        Math.floor(rng() * 16).toString(16),
    ).join('');
}
