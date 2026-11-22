/**
 * Sandbox card registry — the deck-forge experimentation surface.
 *
 * A module-level mutable registry that lets balance loops (the card-tuning loop
 * card, the playtest CLI) trial NEW experimental cards and numeric OVERRIDES
 * of library cards without touching `cards.library.ts`. The library's
 * `getCardById` consults this registry FIRST, so a registered sandbox card is
 * live everywhere cards are looked up — deck building, `toCombatCard`
 * projection, and card execution — with zero engine changes.
 *
 * Doctrine at authoring time (repealed 2026-09-02 — see `cards.library.ts`):
 * status play as the efficient path to dropping enemy HP. The sandbox exists
 * so new cards can be A/B-tested against the sim before a literal is promoted
 * into the library.
 *
 * Cycle safety: this module imports ONLY types from './types'. The library
 * binds its own base lookup here at module init via `bindSandboxLibraryGuard`
 * (collision checks + override merging both need it), so there is no import
 * cycle between the sandbox and `cards.library.ts`.
 */

import type { Card } from './types';

/** Patch shape for a library-card override — everything but the id. */
export type SandboxCardPatch = Partial<Omit<Card, 'id'>>;

type LibraryBaseLookup = (id: string) => Card | undefined;

/** Bound by `cards.library.ts` at module init; inert until then. */
let libraryBase: LibraryBaseLookup = () => undefined;

/**
 * Registers the library's base-card lookup. Called once by `cards.library.ts`
 * at module init (the sandbox cannot import the library — that would be a
 * cycle). Deviation from the sketched contract: the bound fn returns the base
 * `Card` (not a boolean) because override merging needs the base literal, and
 * a single binding is cleaner than a guard + a lookup pair.
 */
export function bindSandboxLibraryGuard(lookup: LibraryBaseLookup): void {
    libraryBase = lookup;
}

const sandboxCards = new Map<string, Card>();
const sandboxOverrides = new Map<string, SandboxCardPatch>();

/**
 * Registers brand-new experimental cards. Ids must be NEW — a collision with
 * the card library or an already-registered sandbox card throws. Validation is
 * atomic: on any collision, nothing from `cards` is registered.
 */
export function registerSandboxCards(cards: readonly Card[]): void {
    const incoming = new Set<string>();
    for (const card of cards) {
        if (libraryBase(card.id) !== undefined) {
            throw new Error(
                `Sandbox card id '${card.id}' collides with the card library — `
                + `use registerSandboxOverride to patch a library card.`,
            );
        }
        if (sandboxCards.has(card.id) || incoming.has(card.id)) {
            throw new Error(`Sandbox card id '${card.id}' is already registered.`);
        }
        incoming.add(card.id);
    }
    for (const card of cards) sandboxCards.set(card.id, { ...card });
}

/**
 * Registers a shallow patch over an EXISTING library card (numeric nudges for
 * A/B runs: basePower, effect intensity, tier...). Throws when `cardId` is not
 * in the library. Repeated overrides of the same card accumulate
 * (shallow-merged in registration order).
 */
export function registerSandboxOverride(cardId: string, patch: SandboxCardPatch): void {
    if (libraryBase(cardId) === undefined) {
        throw new Error(
            `Cannot override '${cardId}': no such card in the library — `
            + `use registerSandboxCards for new ids.`,
        );
    }
    const existing = sandboxOverrides.get(cardId);
    sandboxOverrides.set(cardId, existing ? { ...existing, ...patch } : { ...patch });
}

/** Wipes all sandbox content — both new cards and overrides. */
export function clearSandboxCards(): void {
    sandboxCards.clear();
    sandboxOverrides.clear();
}

/**
 * Resolves a sandbox view of `id`: a registered new card, or the library card
 * with its override shallow-merged. `undefined` when the sandbox has nothing
 * to say about `id` (the common case — kept O(1) so the hot `getCardById`
 * path stays cheap when the sandbox is empty).
 */
export function getSandboxCard(id: string): Card | undefined {
    if (sandboxCards.size === 0 && sandboxOverrides.size === 0) return undefined;
    const fresh = sandboxCards.get(id);
    if (fresh) return fresh;
    const patch = sandboxOverrides.get(id);
    if (!patch) return undefined;
    const base = libraryBase(id);
    if (!base) return undefined;
    return { ...base, ...patch, id: base.id };
}

/** All live sandbox content: new cards plus overridden library cards (merged forms). */
export function listSandboxCards(): Card[] {
    const out = [...sandboxCards.values()];
    for (const id of sandboxOverrides.keys()) {
        const merged = getSandboxCard(id);
        if (merged) out.push(merged);
    }
    return out;
}

/** True when any sandbox card or override is registered. */
export function hasSandboxContent(): boolean {
    return sandboxCards.size > 0 || sandboxOverrides.size > 0;
}
